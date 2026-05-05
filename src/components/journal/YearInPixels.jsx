import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { format, startOfYear, eachDayOfInterval, endOfYear } from 'date-fns'

const MOODS = [
  { id: 'amazing',     label: 'Amazing',     cls: 'bg-blue-500' },
  { id: 'average',     label: 'Average',     cls: 'bg-slate-400' },
  { id: 'ehh',         label: 'Ehh',         cls: 'bg-teal-600' },
  { id: 'stressed',    label: 'Stressed',    cls: 'bg-amber-500' },
  { id: 'angry',       label: 'Angry/Sad',   cls: 'bg-purple-600' },
  { id: 'sick',        label: 'Sick/Bad',    cls: 'bg-red-500' },
  { id: 'unspeakable', label: 'Unspeakable', cls: 'bg-slate-900 border border-slate-600' },
]
const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.id, m]))

const YearInPixels = ({ userId, onDateSelect, selectedDate }) => {
  const [moodLogs, setMoodLogs] = useState([])
  const [popover, setPopover] = useState(null) // { dateStr, screenX, screenY }
  const year = new Date().getFullYear()

  const days = useMemo(() => eachDayOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1)),
  }), [year])

  const fetchMoods = async () => {
    const { data } = await supabase
      .from('mood_logs').select('log_date, mood').eq('user_id', userId)
      .gte('log_date', `${year}-01-01`).lte('log_date', `${year}-12-31`)
    setMoodLogs(data || [])
  }

  useEffect(() => { fetchMoods() }, [userId, year])

  const moodByDate = useMemo(() => {
    const m = {}
    moodLogs.forEach(l => { m[l.log_date] = l.mood })
    return m
  }, [moodLogs])

  const months = useMemo(() => {
    const m = Array.from({ length: 12 }, () => [])
    days.forEach(day => m[day.getMonth()].push(day))
    return m
  }, [days])

  const handlePixelClick = (e, day) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({
      dateStr: format(day, 'yyyy-MM-dd'),
      screenX: rect.left,
      screenY: rect.bottom + 6,
    })
    onDateSelect && onDateSelect(day)
  }

  const saveMood = async (moodId) => {
    if (!popover) return
    const { dateStr } = popover
    const { data: existing } = await supabase
      .from('mood_logs').select('id').eq('user_id', userId).eq('log_date', dateStr).maybeSingle()
    if (existing) {
      await supabase.from('mood_logs').update({ mood: moodId }).eq('id', existing.id)
    } else {
      await supabase.from('mood_logs').insert({ user_id: userId, log_date: dateStr, mood: moodId })
    }
    setPopover(null)
    fetchMoods()
  }

  const clearMood = async () => {
    if (!popover) return
    await supabase.from('mood_logs').delete().eq('user_id', userId).eq('log_date', popover.dateStr)
    setPopover(null)
    fetchMoods()
  }

  const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  return (
    <div className="glass border-2 border-pulsar/30 bg-void/40 shadow-[0_0_20px_rgba(59,130,246,0.08)] rounded-xl p-5">
      <h3 className="font-display tracking-wider text-starlight text-sm mb-4 uppercase">Year in Pixels {year}</h3>

      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {months.map((monthDays, mi) => (
          <div key={mi} className="flex flex-col gap-1.5 flex-shrink-0">
            <span className="text-[9px] font-mono text-dim uppercase text-center leading-none mb-0.5">
              {format(monthDays[0], 'MMM')[0]}
            </span>
            {monthDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const moodId = moodByDate[dateStr]
              const mood = moodId ? MOOD_MAP[moodId] : null
              const isSelected = dateStr === selectedStr
              return (
                <button
                  key={dateStr}
                  onClick={(e) => handlePixelClick(e, day)}
                  title={`${dateStr}${mood ? ': ' + mood.label : ' — click to log'}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-all duration-150 ${
                    mood ? mood.cls : 'bg-white/5 hover:bg-white/20'
                  } ${isSelected ? 'ring-2 ring-nova ring-offset-1 ring-offset-void scale-125 z-10' : 'hover:scale-110'}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-4 border-t border-blue-900/20">
        {MOODS.map(m => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${m.cls}`} />
            <span className="text-[9px] font-mono text-dim uppercase">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Portal popover so it's never clipped by any parent overflow */}
      {popover && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setPopover(null)} />
          <div
            className="fixed z-[201] rounded-xl p-3 shadow-2xl"
            style={{
              left: Math.min(popover.screenX, window.innerWidth - 220),
              top: Math.min(popover.screenY, window.innerHeight - 120),
              background: 'rgba(10,12,26,0.97)',
              border: '1px solid rgba(59,130,246,0.3)',
              backdropFilter: 'blur(20px)',
              minWidth: 200,
            }}
          >
            <p className="text-[10px] font-mono text-dim mb-2 tracking-widest uppercase">{popover.dateStr}</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={(e) => { e.stopPropagation(); saveMood(m.id) }}
                  title={m.label}
                  className={`w-8 h-8 rounded-lg transition-all hover:scale-110 active:scale-95 ${m.cls} shadow-md`}
                />
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); clearMood() }}
                title="Clear"
                className="w-8 h-8 rounded-lg bg-white/5 border border-blue-900/30 text-dim hover:text-danger hover:border-danger/30 text-sm flex items-center justify-center transition-all"
              >×</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default YearInPixels
