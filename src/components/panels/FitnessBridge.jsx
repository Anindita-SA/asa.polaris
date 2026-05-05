import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Activity, Scale, Utensils } from 'lucide-react'
import { format, subDays } from 'date-fns'

const FitnessBridge = () => {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [meals, setMeals] = useState([])
  const [weights, setWeights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const since = format(subDays(new Date(), 14), 'yyyy-MM-dd')
      const [w, m, wt] = await Promise.all([
        supabase.from('workout_logs').select('*').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(50),
        supabase.from('meal_logs').select('*').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(30),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14),
      ])

      // Group workout rows by date - each unique date = one session
      const mapDate = (arr) => (arr || []).map(r => ({ ...r, log_date: r.log_date || r.created_at?.slice(0, 10) }))
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