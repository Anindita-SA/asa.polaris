import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Activity, Scale, Utensils, Zap } from 'lucide-react'
import { format, subDays } from 'date-fns'

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

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const since = format(subDays(new Date(), 14), 'yyyy-MM-dd')
      const [w, m, wt] = await Promise.all([
        supabase.from('workout_logs').select('*').gte('log_date', since).order('logged_at', { ascending: false }).limit(50),
        supabase.from('meal_logs').select('*').gte('log_date', since).order('logged_at', { ascending: false }).limit(30),
        supabase.from('weight_logs').select('*').order('logged_at', { ascending: false }).limit(14),
      ])

      // Group workout rows by date - each unique date = one session
      const mapDate = (arr) => (arr || []).map(r => ({ ...r, log_date: r.log_date || r.logged_at?.slice(0, 10) }))
      const wData = mapDate(w.data)
      const mData = mapDate(m.data)
      const wtData = mapDate(wt.data)

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
    const key = import.meta.env.VITE_GROQ_API_KEY
    if (!key || !workouts.length) return
    setAiLoading(true)

    const summary = `Workouts: ${workouts.length}. Meals: ${meals.length}. Weight Change: ${weightDelta || 0}kg. Recent exercises: ${workouts.slice(0, 5).map(w => w.day_type).join(', ')}.`
    
    const systemPrompt = `You are a tough-love but encouraging AI fitness coach. Analyze the user's past 14 days of fitness data.
    Respond ONLY with a valid JSON object in this format:
    {
      "verdict": "A 2-3 sentence engaging review of their performance. Use emojis.",
      "xp_reward": A number between 0 and 50 based on consistency and effort.
    }`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: summary },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      })
      const data = await response.json()
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}')
      if (parsed.verdict) {
        const result = { ...parsed, date: new Date().toISOString() }
        setVerdict(result)
        localStorage.setItem('polaris_fitness_verdict', JSON.stringify(result))
        if (parsed.xp_reward && addXP) addXP(parsed.xp_reward)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const latestWeight = weights[0]
  const prevWeight = weights[1]
  const weightDelta = latestWeight && prevWeight
    ? (parseFloat(latestWeight.weight_kg) - parseFloat(prevWeight.weight_kg)).toFixed(1)
    : null

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">SYNCING FITNESS DATA...</p>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="glass border border-danger/20 rounded-xl p-6 max-w-md text-center">
        <p className="text-sm text-danger font-body mb-2">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <p className="text-xs font-mono text-dim uppercase tracking-widest">Aloka-Fit Bridge - last 14 days</p>

        {/* AI Verdict */}
        <div className="glass border border-blue-900/20 rounded-xl p-5 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-gold" /> AI Coach Verdict
            </h3>
            <button onClick={generateVerdict} disabled={aiLoading} className="text-xs px-3 py-1 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-lg transition-colors disabled:opacity-50 font-display tracking-wider">
              {aiLoading ? 'ANALYZING...' : 'GENERATE'}
            </button>
          </div>
          {verdict ? (
            <div className="bg-void/40 rounded-lg p-4 border border-blue-900/10">
              <p className="text-sm text-starlight/90 font-body leading-relaxed">{verdict.verdict}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-dim">Last generated: {format(new Date(verdict.date), 'MMM d')}</span>
                <span className="text-emerald">+{verdict.xp_reward} XP Awarded ✦</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-dim italic font-body">Generate a verdict to let the AI analyze your 14-day performance and award XP.</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass border border-blue-900/20 rounded-xl p-4 text-center">
            <Activity className="w-4 h-4 text-pulsar mx-auto mb-2" />
            <p className="font-display text-2xl text-starlight">{workouts.length}</p>
            <p className="text-xs text-dim font-body mt-1">Workout sessions</p>
          </div>
          <div className="glass border border-blue-900/20 rounded-xl p-4 text-center">
            <Utensils className="w-4 h-4 text-emerald mx-auto mb-2" />
            <p className="font-display text-2xl text-starlight">{meals.length}</p>
            <p className="text-xs text-dim font-body mt-1">Meals logged</p>
          </div>
          <div className="glass border border-blue-900/20 rounded-xl p-4 text-center">
            <Scale className="w-4 h-4 text-aurora mx-auto mb-2" />
            <p className="font-display text-2xl text-starlight">
              {latestWeight ? `${latestWeight.weight_kg}` : '-'}
            </p>
            {weightDelta && (
              <p className={`text-xs font-mono mt-1 ${parseFloat(weightDelta) < 0 ? 'text-emerald' : 'text-gold'}`}>
                {parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} kg
              </p>
            )}
            <p className="text-xs text-dim font-body mt-0.5">Latest weight</p>
          </div>
        </div>

        {/* Recent workouts */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-4">
            <Activity className="w-3.5 h-3.5 text-pulsar" /> Recent Workouts
          </h3>
          <div className="space-y-2">
            {workouts.slice(0, 7).map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-blue-900/10 last:border-0">
                <div>
                  <p className="text-sm text-starlight/80 font-body">{w.day_type}</p>
                  <p className="text-xs text-dim">{w.exercise_count} exercises</p>
                </div>
                <span className="text-xs font-mono text-dim">
                  {format(new Date(w.log_date), 'd MMM')}
                </span>
              </div>
            ))}
            {!workouts.length && <p className="text-xs text-dim italic font-body">No workouts in the last 14 days.</p>}
          </div>
        </div>

        {/* Recent meals */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-4">
            <Utensils className="w-3.5 h-3.5 text-emerald" /> Recent Meals
          </h3>
          <div className="space-y-2">
            {meals.slice(0, 8).map((m, i) => (
              <div key={m.id || i} className="flex items-start justify-between py-2 border-b border-blue-900/10 last:border-0">
                <div>
                  <p className="text-sm text-starlight/80 font-body">{m.food_name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {m.kcal && <span className="text-xs font-mono text-dim">{m.kcal} kcal</span>}
                    {m.meal_tag && <span className="text-xs text-aurora/60 font-mono">{m.meal_tag}</span>}
                  </div>
                </div>
                <span className="text-xs font-mono text-dim flex-shrink-0 ml-3">
                  {format(new Date(m.log_date), 'd MMM')}
                </span>
              </div>
            ))}
            {!meals.length && <p className="text-xs text-dim italic font-body">No meals logged in the last 14 days.</p>}
          </div>
        </div>

        {/* Weight log */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-4">
            <Scale className="w-3.5 h-3.5 text-aurora" /> Weight Log
          </h3>
          <div className="space-y-1">
            {weights.slice(0, 10).map((w, i) => (
              <div key={w.id || i} className="flex items-center justify-between py-1.5 border-b border-blue-900/10 last:border-0">
                <span className="text-xs font-mono text-dim">{format(new Date(w.log_date), 'd MMM yyyy')}</span>
                <span className="text-sm font-mono text-starlight">{w.weight_kg} kg</span>
              </div>
            ))}
            {!weights.length && <p className="text-xs text-dim italic font-body">No weight entries yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FitnessBridge