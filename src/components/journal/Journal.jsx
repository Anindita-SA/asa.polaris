import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Camera, Plus, Check, X, Flame } from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'

const Journal = () => {
  const { user, addXP } = useAuth()
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [highlight, setHighlight] = useState(null)
  const [highlightText, setHighlightText] = useState('')
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [heatmapLogs, setHeatmapLogs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    fetchHighlight()
    fetchHabits()
    fetchHabitLogs()
    fetchHeatmap()
  }, [])

  const fetchHighlight = async () => {
    const { data } = await supabase.from('highlights').select('*').eq('user_id', user.id).eq('date', today).single()
    if (data) { setHighlight(data); setHighlightText(data.text || '') }
  }

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id)
    setHabits(data || [])
  }

  const fetchHabitLogs = async () => {
    const { data } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today)
    setHabitLogs(data || [])
  }

  const fetchHeatmap = async () => {
    const since = format(subDays(new Date(), 90), 'yyyy-MM-dd')
    const { data } = await supabase.from('habit_logs').select('date').eq('user_id', user.id).gte('date', since)
    setHeatmapLogs(data || [])
  }

  const saveHighlight = async () => {
    setSaving(true)
    if (highlight) {
      await supabase.from('highlights').update({ text: highlightText }).eq('id', highlight.id)
    } else {
      const { data } = await supabase.from('highlights').insert({ user_id: user.id, date: today, text: highlightText }).select().single()
      setHighlight(data)
      await addXP(20)
    }
    setSaving(false)
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const path = `${user.id}/${today}-${Date.now()}`
    const { error } = await supabase.storage.from('journal-photos').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('journal-photos').getPublicUrl(path)
      if (highlight) {
        await supabase.from('highlights').update({ photo_url: publicUrl }).eq('id', highlight.id)
        setHighlight(h => ({ ...h, photo_url: publicUrl }))
      } else {
        const { data } = await supabase.from('highlights').insert({ user_id: user.id, date: today, photo_url: publicUrl }).select().single()
        setHighlight(data)
      }
    }
    setUploading(false)
  }

  const toggleHabit = async (habit) => {
    const logged = habitLogs.find(l => l.habit_id === habit.id)
    if (logged) {
      await supabase.from('habit_logs').delete().eq('id', logged.id)
      setHabitLogs(prev => prev.filter(l => l.id !== logged.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: today }).select().single()
      setHabitLogs(prev => [...prev, data])
      await addXP(habit.xp_reward || 10)
    }
    fetchHeatmap()
  }

  const addHabit = async () => {
    if (!newHabitTitle) return
    await supabase.from('habits').insert({ user_id: user.id, title: newHabitTitle, xp_reward: 10 })
    setNewHabitTitle('')
    setAddingHabit(false)
    fetchHabits()
  }

  const deleteHabit = async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    fetchHabits()
  }

  // Heatmap: last 91 days in 13 weeks
  const heatmapDays = eachDayOfInterval({ start: subDays(new Date(), 90), end: new Date() })
  const loggedDates = new Set(heatmapLogs.map(l => l.date))

  // Streak calc
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (loggedDates.has(d)) streak++
    else break
  }

  const weeks = []
  let week = []
  heatmapDays.forEach((day, i) => {
    week.push(day)
    if (week.length === 7 || i === heatmapDays.length - 1) { weeks.push(week); week = [] }
  })

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Daily Highlight */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display tracking-wider text-starlight text-sm">Today's Highlight</h3>
            <span className="text-xs font-mono text-dim">{format(new Date(), 'EEE, d MMM yyyy')}</span>
          </div>

          <textarea
            placeholder="What was the one thing that made today worth it?"
            rows={3}
            value={highlightText}
            onChange={e => setHighlightText(e.target.value)}
            className="w-full bg-transparent text-sm text-starlight/90 font-body italic outline-none resize-none placeholder:text-dim/40 leading-relaxed"
          />

          {/* Photo */}
          {highlight?.photo_url ? (
            <div className="mt-3 relative group">
              <img src={highlight.photo_url} alt="highlight" className="w-full h-48 object-cover rounded-lg" />
              <div className="absolute inset-0 bg-void/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <button onClick={() => fileRef.current?.click()} className="text-xs text-starlight font-body">Change photo</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="mt-3 w-full border border-dashed border-blue-900/30 rounded-lg py-4 flex items-center justify-center gap-2 text-dim hover:text-nova hover:border-nova/30 transition-all text-xs font-body">
              <Camera className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Add a photo'}
            </button>
          )}
          <input type="file" accept="image/*" ref={fileRef} onChange={uploadPhoto} className="hidden" />

          <div className="flex justify-end mt-3">
            <button onClick={saveHighlight} disabled={saving}
              className="text-xs px-4 py-1.5 bg-pulsar/20 border border-pulsar/30 text-pulsar font-display tracking-wider rounded-lg hover:bg-pulsar/30 transition-colors disabled:opacity-40">
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>

        {/* Habits */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-gold" />
              Habits
              <span className="text-xs font-mono text-gold ml-1">{streak > 0 ? `${streak}d streak` : ''}</span>
            </h3>
            <button onClick={() => setAddingHabit(!addingHabit)} className="text-dim hover:text-nova transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {addingHabit && (
            <div className="flex gap-2 mb-4">
              <input placeholder="New habit..." autoFocus
                className="flex-1 bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-1.5 outline-none focus:border-pulsar/40 font-body"
                value={newHabitTitle} onChange={e => setNewHabitTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()} />
              <button onClick={addHabit} className="text-emerald hover:text-emerald/70 transition-colors"><Check className="w-4 h-4" /></button>
            </div>
          )}

          <div className="space-y-2">
            {habits.map(habit => {
              const done = habitLogs.some(l => l.habit_id === habit.id)
              return (
                <div key={habit.id} className="flex items-center gap-3 group">
                  <button onClick={() => toggleHabit(habit)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? 'border-emerald bg-emerald/20 text-emerald' : 'border-blue-900/40 text-transparent hover:border-pulsar/40'
                    }`}>
                    <Check className="w-3 h-3" />
                  </button>
                  <span className={`text-sm font-body flex-1 ${done ? 'text-dim line-through' : 'text-starlight/80'}`}>{habit.title}</span>
                  {done && <span className="text-xs font-mono text-gold/60">+{habit.xp_reward || 10}xp</span>}
                  <button onClick={() => deleteHabit(habit.id)} className="text-dim hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
            {!habits.length && <p className="text-xs text-dim italic font-body">Add your first habit above.</p>}
          </div>
        </div>

        {/* Heatmap */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <h3 className="font-display tracking-wider text-starlight text-sm mb-4">Activity — last 90 days</h3>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const active = loggedDates.has(dateStr)
                  const isToday = dateStr === today
                  return (
                    <div key={di} title={dateStr}
                      className={`habit-cell border ${
                        isToday ? 'border-pulsar/60' :
                        active ? 'border-emerald/20' : 'border-blue-900/10'
                      } ${active ? 'bg-emerald/40' : 'bg-stardust/30'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="habit-cell bg-stardust/30 border border-blue-900/10" />
            <span className="text-xs text-dim font-mono">no activity</span>
            <div className="habit-cell bg-emerald/40 border border-emerald/20 ml-2" />
            <span className="text-xs text-dim font-mono">active</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Journal
