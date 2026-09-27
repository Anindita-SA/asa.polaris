import { generateLlmResponse } from '../../lib/llm';
import { useEffect, useState } from 'react'
import { offlineSelect } from '../../lib/offlineApi'
import { useAuth } from '../../hooks/useAuth'
import { Activity, Scale, Utensils, Zap, Users, Gamepad2, Compass, Send, ChevronDown } from 'lucide-react'
import { format, subDays } from 'date-fns'
import RelationshipsView from './RelationshipsView'
import PlayView from '../orbit/PlayView'
import HardwareScoutPanel from './HardwareScoutPanel'
import ReachOutView from './ReachOutView'

const FITNESS_SUB_TABS = [
  { id: 'fitness', label: 'Fitness', icon: Activity },
  { id: 'relationships', label: 'Social', icon: Users },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'scout', label: 'Scout', icon: Compass },
  { id: 'reach_out', label: 'Reach Out', icon: Send },
]

const FitnessBridge = () => {
  const { user, addXP } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [meals, setMeals] = useState([])
  const [weights, setWeights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [verdict, setVerdict] = useState(() => {
    try { return JSON.parse(localStorage.getItem('polaris_fitness_verdict')) } catch { return null }
  })

  useEffect(() => { if (user?.id) fetchAll() }, [user?.id])

  const fetchAll = async () => {
    if (!user?.id) return
    try {
      const since = format(subDays(new Date(), 14), 'yyyy-MM-dd')
      const [w, m, wt] = await Promise.all([
        offlineSelect('workout_logs', { user_id: user.id }),
        offlineSelect('meal_logs', { user_id: user.id }),
        offlineSelect('weight_logs', { user_id: user.id }),
      ])

      const wFiltered = (w.data || [])
        .filter(r => !r.log_date || r.log_date >= since)
        .sort((a, b) => new Date(b.logged_at || b.log_date || 0) - new Date(a.logged_at || a.log_date || 0))
        .slice(0, 50)
      const mFiltered = (m.data || [])
        .filter(r => !r.log_date || r.log_date >= since)
        .sort((a, b) => new Date(b.logged_at || b.log_date || 0) - new Date(a.logged_at || a.log_date || 0))
        .slice(0, 30)
      const wtFiltered = (wt.data || [])
        .sort((a, b) => new Date(b.logged_at || b.log_date || 0) - new Date(a.logged_at || a.log_date || 0))
        .slice(0, 14)

      // Group workout rows by date - each unique date = one session
      const mapDate = (arr) => (arr || []).map(r => ({ ...r, log_date: r.log_date || r.logged_at?.slice(0, 10) }))
      const wData = mapDate(wFiltered)
      const mData = mapDate(mFiltered)
      const wtData = mapDate(wtFiltered)

      const sessionDates = [...new Set(wData.map(r => r.log_date))]
      setWorkouts(sessionDates.map(date => {
        const rows = wData.filter(r => r.log_date === date)
        return {
          log_date: date,
          day_type: rows[0]?.workout_type || rows[0]?.day_type || 'Workout',
          exercise_count: rows.length,
        }
      }))

      setMeals(mData)
      setWeights(wtData)
    } catch (e) {
      setError('Could not connect to fitness data. Make sure workout_logs, meal_logs, and weight_logs tables exist with log_date columns.')
    } finally {
      setLoading(false)
    }
  }

  const generateVerdict = async () => {
    if (!workouts.length) return
    setAiLoading(true)

    const summary = `Workouts: ${workouts.length}. Meals: ${meals.length}. Weight Change: ${weightDelta || 0}kg. Recent exercises: ${workouts.slice(0, 5).map(w => w.day_type).join(', ')}.`
    
    const systemPrompt = `You are a highly analytical, clinical, and strategic AI fitness coach. Analyze the user's past 14 days of fitness data. Provide purely clinical/strategic feedback without hallucinating rewards.
    Respond ONLY with a valid JSON object in this format:
    {
      "verdict": "A 2-3 sentence strategic review of their performance and recommendations. Be direct and objective."
    }`

    try {
      const data = await generateLlmResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: summary },
      ], true)
      const raw = data?.choices?.[0]?.message?.content || '{}'
      let parsed = {}
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) parsed = JSON.parse(m[0])
      }
      if (parsed.verdict) {
        const result = { ...parsed, date: new Date().toISOString() }
        setVerdict(result)
        localStorage.setItem('polaris_fitness_verdict', JSON.stringify(result))
      } else {
        throw new Error('No verdict in response')
      }
    } catch (e) {
      console.error('Fitness verdict fallback:', e)
      const count = workouts.length
      const deltaText = weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta}kg weight shift` : 'stable trend'
      const fallbackVerdict = `Completed ${count} workout session(s) across the logged period with ${deltaText}. Maintain consistent training volume, prioritize progressive overload on primary compound movements, and track protein intake systematically across training days.`
      const result = { verdict: fallbackVerdict, date: new Date().toISOString() }
      setVerdict(result)
      localStorage.setItem('polaris_fitness_verdict', JSON.stringify(result))
    } finally {
      setAiLoading(false)
    }
  }

  const latestWeight = weights[0]
  const prevWeight = weights[1]
  const weightDelta = latestWeight && prevWeight
    ? (parseFloat(latestWeight.weight_kg) - parseFloat(prevWeight.weight_kg)).toFixed(1)
    : null

  const [activeSubTab, setActiveSubTab] = useState('fitness')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const currentSubTab = FITNESS_SUB_TABS.find(t => t.id === activeSubTab) || FITNESS_SUB_TABS[0]
  const CurrentSubIcon = currentSubTab.icon

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-nova/60 font-mono text-sm animate-pulse">Syncing data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="glass border border-danger/20 rounded-t-2xl rounded-b-none md:rounded-xl p-6 w-full max-w-full md:max-w-md text-center">
          <p className="text-sm text-danger font-body mb-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation Pills (Desktop) */}
        <div className="hidden md:flex bg-void/70 p-1 rounded-lg border border-pulsar/30 max-w-lg mx-auto overflow-x-auto scrollbar-hide shrink-0 gap-1">
          {FITNESS_SUB_TABS.map(tab => {
            const isActive = activeSubTab === tab.id
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 min-w-[70px] shrink-0 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                  isActive ? 'bg-stardust/80 text-starlight font-bold' : 'text-nova/60 hover:text-nova/80'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Navigation Dropdown (Mobile) */}
        <div className="flex md:hidden relative justify-between items-center bg-void/70 p-2 rounded-lg border border-pulsar/30">
          <div className="flex items-center gap-2">
            <CurrentSubIcon className="w-4 h-4 text-amber-400" />
            <span className="font-display text-sm text-starlight font-bold">{currentSubTab.label}</span>
          </div>

          <button
            onClick={() => setIsMenuOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono uppercase tracking-wider glass border border-pulsar/40 text-starlight hover:bg-pulsar/10 transition-all cursor-pointer active:scale-95"
            aria-label="Toggle Orbit sub-tab menu"
          >
            <span className="text-[11px] text-nova/70 font-mono">Switch</span>
            <ChevronDown className={`w-3.5 h-3.5 text-nova/60 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-2 top-full mt-2 z-50 w-48 glass border border-pulsar/40 rounded-xl p-1.5 shadow-2xl bg-[#030712]/95 backdrop-blur-xl space-y-1">
                {FITNESS_SUB_TABS.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeSubTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveSubTab(tab.id)
                        setIsMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider text-left transition-all cursor-pointer ${
                        isActive
                          ? 'text-amber-400 font-bold bg-pulsar/20 border border-pulsar/40'
                          : 'text-nova/70 hover:text-starlight hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-nova/60'}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {activeSubTab === 'relationships' ? (
          <RelationshipsView />
        ) : activeSubTab === 'play' ? (
          <PlayView />
        ) : activeSubTab === 'scout' ? (
          <HardwareScoutPanel />
        ) : activeSubTab === 'reach_out' ? (
          <ReachOutView />
        ) : (
          <>
            <p className="text-xs font-mono text-nova/60 mt-2">Aloka-Fit Bridge - last 14 days</p>

        {/* AI Verdict */}
        <div className="glass border border-pulsar/30 rounded-xl p-5 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-starlight text-lg flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-gold" /> AI Coach Verdict
            </h3>
            <button onClick={generateVerdict} disabled={aiLoading} className="text-xs px-3 py-1 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/50 rounded-lg transition-colors disabled:opacity-50 font-display">
              {aiLoading ? 'ANALYZING...' : 'GENERATE'}
            </button>
          </div>
          {verdict ? (
            <div className="bg-void/40 rounded-lg p-4 border border-blue-900/10">
              <p className="text-sm text-starlight/90 font-body leading-relaxed">{verdict.verdict}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-nova/60">Last generated: {format(new Date(verdict.date), 'MMM d')}</span>
                <span className="text-emerald">+{verdict.xp_reward} XP Awarded ✦</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-nova/60 italic font-body">Generate a verdict to let the AI analyze your 14-day performance and award XP.</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass border border-pulsar/30 rounded-xl p-4 text-center">
            <Activity className="w-4 h-4 text-pulsar mx-auto mb-2" />
            <p className="font-display text-lg text-starlight">{workouts.length}</p>
            <p className="text-xs text-nova/60 font-body mt-1">Workout sessions</p>
          </div>
          <div className="glass border border-pulsar/30 rounded-xl p-4 text-center">
            <Utensils className="w-4 h-4 text-emerald mx-auto mb-2" />
            <p className="font-display text-lg text-starlight">{meals.length}</p>
            <p className="text-xs text-nova/60 font-body mt-1">Meals logged</p>
          </div>
          <div className="glass border border-pulsar/30 rounded-xl p-4 text-center">
            <Scale className="w-4 h-4 text-aurora mx-auto mb-2" />
            <p className="font-display text-lg text-starlight">
              {latestWeight ? `${latestWeight.weight_kg}` : '-'}
            </p>
            {weightDelta && (
              <p className={`text-xs font-mono mt-1 ${parseFloat(weightDelta) < 0 ? 'text-emerald' : 'text-gold'}`}>
                {parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} kg
              </p>
            )}
            <p className="text-xs text-nova/60 font-body mt-0.5">Latest weight</p>
          </div>
        </div>

        {/* Recent workouts */}
        <div className="glass border border-pulsar/30 rounded-xl p-5">
          <h3 className="font-display text-starlight text-lg flex items-center gap-2 mb-4">
            <Activity className="w-3.5 h-3.5 text-pulsar" /> Recent Workouts
          </h3>
          <div className="space-y-2">
            {workouts.slice(0, 7).map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-blue-900/10 last:border-0">
                <div>
                  <p className="text-sm text-starlight/80 font-body">{w.day_type}</p>
                  <p className="text-xs text-nova/60">{w.exercise_count} exercises</p>
                </div>
                <span className="text-xs font-mono text-nova/60">
                  {w.log_date ? format(new Date(w.log_date), 'd MMM') : 'N/A'}
                </span>
              </div>
            ))}
            {!workouts.length && <p className="text-xs text-nova/60 italic font-body">No workouts in the last 14 days.</p>}
          </div>
        </div>

        {/* Recent meals */}
        <div className="glass border border-pulsar/30 rounded-xl p-5">
          <h3 className="font-display text-starlight text-lg flex items-center gap-2 mb-4">
            <Utensils className="w-3.5 h-3.5 text-emerald" /> Recent Meals
          </h3>
          <div className="space-y-2">
            {meals.slice(0, 8).map((m, i) => (
              <div key={m.id || i} className="flex items-start justify-between py-2 border-b border-blue-900/10 last:border-0">
                <div>
                  <p className="text-sm text-starlight/80 font-body">{m.food_name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {m.kcal && <span className="text-xs font-mono text-nova/60">{m.kcal} kcal</span>}
                    {m.meal_tag && <span className="text-xs text-aurora/60 font-mono">{m.meal_tag}</span>}
                  </div>
                </div>
                <span className="text-xs font-mono text-nova/60 flex-shrink-0 ml-3">
                  {m.log_date ? format(new Date(m.log_date), 'd MMM') : 'N/A'}
                </span>
              </div>
            ))}
            {!meals.length && <p className="text-xs text-nova/60 italic font-body">No meals logged in the last 14 days.</p>}
          </div>
        </div>

        {/* Weight log */}
        <div className="glass border border-pulsar/30 rounded-xl p-5">
          <h3 className="font-display text-starlight text-lg flex items-center gap-2 mb-4">
            <Scale className="w-3.5 h-3.5 text-aurora" /> Weight Log
          </h3>
          <div className="space-y-1">
            {weights.slice(0, 10).map((w, i) => (
              <div key={w.id || i} className="flex items-center justify-between py-1.5 border-b border-blue-900/10 last:border-0">
                <span className="text-xs font-mono text-nova/60">{w.log_date ? format(new Date(w.log_date), 'd MMM yyyy') : 'N/A'}</span>
                <span className="text-sm font-mono text-starlight">{w.weight_kg} kg</span>
              </div>
            ))}
            {!weights.length && <p className="text-xs text-nova/60 italic font-body">No weight entries yet.</p>}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

export default FitnessBridge