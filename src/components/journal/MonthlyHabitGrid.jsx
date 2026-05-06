import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore } from 'date-fns'
import { Edit2, Check, X, Trash2 } from 'lucide-react'

const MonthlyHabitGrid = ({ habits, userId, selectedDate, addXP, onDelete, onRefetch }) => {
  const [monthLogs, setMonthLogs] = useState([])
  const [editingHabit, setEditingHabit] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart.getTime()])

  useEffect(() => {
    fetchMonthLogs()
  }, [userId, monthStart.getTime()])

  const fetchMonthLogs = async () => {
    const startStr = format(monthStart, 'yyyy-MM-dd')
    const endStr = format(monthEnd, 'yyyy-MM-dd')
    const { data } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr)
    setMonthLogs(data || [])
  }

  const isLogged = (habitId, dateStr) => {
    return monthLogs.some(l => l.habit_id === habitId && l.date === dateStr)
  }

  const toggleDay = async (habit, dateStr) => {
    const existing = monthLogs.find(l => l.habit_id === habit.id && l.date === dateStr)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setMonthLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ 
        user_id: userId, habit_id: habit.id, date: dateStr 
      }).select().single()
      if (data) {
        setMonthLogs(prev => [...prev, data])
        await addXP(habit.xp_reward || 10)
      }
    }
  }

  const saveHabitTitle = async (habitId) => {
    if (!editTitle.trim()) return
    await supabase.from('habits').update({ title: editTitle.trim() }).eq('id', habitId)
    setEditingHabit(null)
    onRefetch()
  }

  const getCompletionRate = (habitId) => {
    const logsForHabit = monthLogs.filter(l => l.habit_id === habitId)
    const todayIdx = days.findIndex(d => isToday(d))
    const daysElapsed = todayIdx >= 0 ? todayIdx + 1 : days.length
    return daysElapsed > 0 ? Math.round((logsForHabit.length / daysElapsed) * 100) : 0
  }

  if (!habits.length) return null

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="text-left text-[9px] font-mono text-dim uppercase tracking-wider pb-2 pr-3 min-w-[140px] sticky left-0 bg-void/80 z-10">
              Habit
            </th>
            {days.map(day => {
              const dayStr = format(day, 'd')
              const today = isToday(day)
              return (
                <th key={dayStr} className={`text-center text-[8px] font-mono pb-2 px-0 min-w-[18px] ${
                  today ? 'text-gold' : 'text-dim/50'
                }`}>
                  {dayStr}
                </th>
              )
            })}
            <th className="text-center text-[9px] font-mono text-dim uppercase tracking-wider pb-2 pl-2 min-w-[36px]">%</th>
          </tr>
        </thead>
        <tbody>
          {habits.map(habit => {
            const rate = getCompletionRate(habit.id)
            return (
              <tr key={habit.id} className="group">
                <td className="pr-3 py-1 sticky left-0 bg-void/80 z-10">
                  <div className="flex items-center gap-1">
                    {editingHabit === habit.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveHabitTitle(habit.id)}
                          className="flex-1 bg-transparent border-b border-pulsar text-[10px] text-starlight outline-none font-body"
                          autoFocus />
                        <button onClick={() => saveHabitTitle(habit.id)} className="text-emerald"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingHabit(null)} className="text-dim"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-body text-starlight/80 truncate max-w-[120px]" title={habit.title}>
                          {habit.title}
                        </span>
                        <button onClick={() => { setEditingHabit(habit.id); setEditTitle(habit.title) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-starlight p-0.5">
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => onDelete(habit.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-danger p-0.5">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const logged = isLogged(habit.id, dateStr)
                  const today = isToday(day)
                  const future = !isBefore(day, new Date()) && !today
                  return (
                    <td key={dateStr} className="text-center py-1 px-0">
                      <button
                        onClick={() => !future && toggleDay(habit, dateStr)}
                        disabled={future}
                        className={`w-[14px] h-[14px] rounded-sm transition-all ${
                          logged 
                            ? 'bg-emerald shadow-[0_0_4px_rgba(16,185,129,0.4)]' 
                            : today
                            ? 'bg-gold/20 border border-gold/40 hover:bg-gold/30'
                            : future
                            ? 'bg-stardust/5'
                            : 'bg-stardust/15 hover:bg-stardust/30'
                        }`}
                        title={`${habit.title} — ${format(day, 'MMM d')}`}
                      />
                    </td>
                  )
                })}
                <td className="text-center py-1 pl-2">
                  <span className={`text-[9px] font-mono ${
                    rate >= 80 ? 'text-emerald' : rate >= 50 ? 'text-amber-400' : 'text-dim'
                  }`}>
                    {rate}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default MonthlyHabitGrid
