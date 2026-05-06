import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Camera, Plus, Check, X, Flame, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfDay, isToday, addDays } from 'date-fns'
import YearInPixels from './YearInPixels'
import DailyRitual from './DailyRitual'
import MonthlyHabitGrid from './MonthlyHabitGrid'

const MOODS = [
  { id: 'amazing', label: 'Amazing', color: 'bg-blue-500' },
  { id: 'average', label: 'Average', color: 'bg-slate-400' },
  { id: 'ehh', label: 'Ehh', color: 'bg-teal-600' },
  { id: 'stressed', label: 'Stressed', color: 'bg-amber-500' },
  { id: 'angry', label: 'Angry/Sad', color: 'bg-purple-600' },
  { id: 'sick', label: 'Sick/Bad', color: 'bg-red-500' },
  { id: 'unspeakable', label: 'Unspeakable', color: 'bg-slate-900' }
]

const Journal = () => {
  const { user, addXP } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  
  const [highlight, setHighlight] = useState(null)
  const [oneLiner, setOneLiner] = useState('')
  const [highlightText, setHighlightText] = useState('')
  const [mood, setMood] = useState(null)
  
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    fetchHighlight()
    fetchHabits()
    fetchHabitLogs()
    fetchMood()
  }, [dateStr])

  const fetchHighlight = async () => {
    setHighlight(null)
    setOneLiner('')
    setHighlightText('')
    
    const { data } = await supabase.from('highlights').select('*').eq('user_id', user.id).eq('date', dateStr).order('id', { ascending: false }).limit(1)
    if (data && data.length > 0) { 
      setHighlight(data[0])
      const fullText = data[0].text || ''
      const parts = fullText.split('|||')
      if (parts.length > 1) {
        setOneLiner(parts[0])
        setHighlightText(parts[1])
      } else {
        setHighlightText(fullText)
      }
    }
  }

  const fetchMood = async () => {
    const { data } = await supabase.from('mood_logs').select('mood').eq('user_id', user.id).eq('log_date', dateStr).maybeSingle()
    setMood(data?.mood || null)
  }

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id)
    setHabits(data || [])
  }

  const fetchHabitLogs = async () => {
    const { data } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', dateStr)
    setHabitLogs(data || [])
  }

  const saveHighlight = async () => {
    setSaving(true)
    const combinedText = `${oneLiner}|||${highlightText}`
    if (highlight) {
      await supabase.from('highlights').update({ text: combinedText }).eq('id', highlight.id)
    } else {
      const { data } = await supabase.from('highlights').insert({ user_id: user.id, date: dateStr, text: combinedText }).select().limit(1)
      if (data && data.length > 0) setHighlight(data[0])
      await addXP(20)
    }
    setSaving(false)
  }

  const saveMood = async (m) => {
    setMood(m)
    const { data: existing } = await supabase.from('mood_logs').select('id').eq('user_id', user.id).eq('log_date', dateStr).maybeSingle()
    if (existing) {
      await supabase.from('mood_logs').update({ mood: m }).eq('id', existing.id)
    } else {
      await supabase.from('mood_logs').insert({ user_id: user.id, log_date: dateStr, mood: m })
      await addXP(5)
    }
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${dateStr}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('journal-photos').upload(path, file)
    
    if (error) {
      alert(`Upload failed: ${error.message}`); setUploading(false); return
    }

    const { data: signData, error: signError } = await supabase.storage.from('journal-photos').createSignedUrl(path, 60 * 60 * 24 * 365 * 10)
    if (signError) {
      alert(`Could not sign URL: ${signError.message}`); setUploading(false); return
    }

    const publicUrl = signData.signedUrl
    const combinedText = `${oneLiner}|||${highlightText}`
    if (highlight) {
      await supabase.from('highlights').update({ photo_url: publicUrl, text: combinedText }).eq('id', highlight.id)
      setHighlight(h => ({ ...h, photo_url: publicUrl, text: combinedText }))
    } else {
      const { data } = await supabase.from('highlights').insert({ user_id: user.id, date: dateStr, text: combinedText, photo_url: publicUrl }).select().limit(1)
      if (data && data.length > 0) setHighlight(data[0])
    }
    setUploading(false)
  }

  const toggleHabit = async (habit) => {
    const logged = habitLogs.find(l => l.habit_id === habit.id)
    if (logged) {
      await supabase.from('habit_logs').delete().eq('id', logged.id)
      setHabitLogs(prev => prev.filter(l => l.id !== logged.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: dateStr }).select().single()
      setHabitLogs(prev => [...prev, data])
      await addXP(habit.xp_reward || 10)
    }
  }

  const addHabit = async () => {
    if (!newHabitTitle) return
    await supabase.from('habits').insert({ user_id: user.id, title: newHabitTitle, xp_reward: 10 })
    setNewHabitTitle(''); setAddingHabit(false); fetchHabits()
  }

  const deleteHabit = async (id) => {
    await supabase.from('habits').delete().eq('id', id); fetchHabits()
  }

  return (
    <div className="h-full overflow-y-auto p-6 scrollbar-hide">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Date Navigator */}
        <div className="flex items-center justify-between glass border border-blue-900/20 rounded-xl px-4 py-2">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-white/5 rounded-lg text-dim hover:text-nova transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-pulsar" />
            <span className="font-display tracking-widest text-starlight text-sm uppercase">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, d MMM yyyy')}
            </span>
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-white/5 rounded-lg text-dim hover:text-nova transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Ritual Stack */}
        <DailyRitual dateStr={dateStr} />

        {/* Daily Highlight & Mood */}
        <div className="glass border border-blue-900/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display tracking-wider text-starlight text-xs uppercase opacity-60">Daily Snapshot</h3>
            <div className="flex gap-1.5">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => saveMood(m.id)}
                  title={m.label}
                  className={`w-5 h-5 rounded-sm transition-all duration-300 ${
                    mood === m.id ? `${m.color} ring-2 ring-nova ring-offset-2 ring-offset-void scale-110` : 'bg-stardust/10 hover:bg-stardust/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <input
            placeholder="One liner for today..."
            value={oneLiner}
            onChange={e => setOneLiner(e.target.value)}
            className="w-full bg-transparent text-xl text-gold font-display outline-none mb-3 placeholder:text-gold/20"
          />

          <textarea
            placeholder="Write more about your day here..."
            rows={3}
            value={highlightText}
            onChange={e => setHighlightText(e.target.value)}
            className="w-full bg-transparent text-sm text-starlight/90 font-body outline-none resize-none placeholder:text-dim/40 leading-relaxed mb-4"
          />

          {/* Photo */}
          {highlight?.photo_url ? (
            <div className="relative group rounded-xl overflow-hidden border border-blue-900/20">
              <img src={highlight.photo_url} alt="highlight" className="w-full h-64 object-cover" />
              <div className="absolute inset-0 bg-void/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => fileRef.current?.click()} className="text-xs text-starlight font-body bg-void/80 px-4 py-2 rounded-full border border-blue-900/40">Change photo</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-blue-900/30 rounded-xl py-8 flex flex-col items-center justify-center gap-3 text-dim hover:text-nova hover:border-nova/30 transition-all text-xs font-body group">
              <Camera className="w-6 h-6 opacity-40 group-hover:opacity-100" />
              {uploading ? 'Capturing...' : 'Capture a memory'}
            </button>
          )}
          <input type="file" accept="image/*" ref={fileRef} onChange={uploadPhoto} className="hidden" />

          <div className="flex justify-end mt-6 pt-4 border-t border-blue-900/10">
            <button onClick={saveHighlight} disabled={saving}
              className="text-[10px] px-6 py-2 bg-pulsar/10 border border-pulsar/30 text-pulsar font-display tracking-widest rounded-lg hover:bg-pulsar/20 transition-all disabled:opacity-40 uppercase">
              {saving ? 'Transmitting...' : 'Sync Entry'}
            </button>
          </div>
        </div>

        {/* Side by side: Year in Pixels and Habit Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Year in Pixels (Left) */}
          <YearInPixels userId={user.id} onDateSelect={setSelectedDate} selectedDate={selectedDate} />

          {/* Habit Spread (Right) — Monthly Grid */}
          <div className="glass border border-blue-900/40 rounded-xl p-5 shadow-lg bg-void/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display tracking-wider text-starlight text-xs uppercase opacity-80 flex items-center gap-2">
                <Flame className="w-3 h-3 text-gold" />
                Monthly Habit Stack — {format(selectedDate, 'MMMM yyyy')}
              </h3>
              <button onClick={() => setAddingHabit(!addingHabit)} className="text-dim hover:text-nova transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {addingHabit && (
              <div className="flex gap-2 mb-4">
                <input placeholder="New habit..." autoFocus
                  className="flex-1 bg-stardust/10 text-sm text-starlight border border-blue-900/30 rounded-lg px-4 py-2 outline-none focus:border-pulsar/40 font-body"
                  value={newHabitTitle} onChange={e => setNewHabitTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addHabit()} />
                <button onClick={addHabit} className="px-4 bg-emerald/20 text-emerald border border-emerald/30 rounded-lg text-xs font-display">ADD</button>
              </div>
            )}

            {/* Month grid */}
            <MonthlyHabitGrid 
              habits={habits} 
              userId={user.id} 
              selectedDate={selectedDate} 
              addXP={addXP}
              onDelete={deleteHabit}
              onRefetch={fetchHabits}
            />
            {!habits.length && <p className="text-xs text-dim italic font-body text-center py-4">No habits defined yet.</p>}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Journal
