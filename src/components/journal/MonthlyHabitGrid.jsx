import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore } from 'date-fns'
import { Edit2, Check, X, Trash2 } from 'lucide-react'

import { XP } from '../../data/xpRewards'
import { useCelebration } from '../../hooks/useCelebration'

const MonthlyHabitGrid = ({ habits, userId, selectedDate, addXP, trackXP, onDelete, onRefetch }) => {
  const { celebrate } = useCelebration()
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

  const toggleDay = async (habit, dateStr, e) => {
    const existing = monthLogs.find(l => l.habit_id === habit.id && l.date === dateStr)
    const wasLogged = !!existing
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setMonthLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ 
        user_id: userId, habit_id: habit.id, date: dateStr 
      }).select().single()
      if (data) {
        setMonthLogs(prev => [...prev, data])
        celebrate(e ? { x: e.clientX, y: e.clientY } : undefined)
      }
    }
    trackXP(wasLogged, !wasLogged, habit.xp_reward || XP.HABIT_CHECK)
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
    <div className="overflow-x-auto scrollbar-hide pb-2">
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="text-left text-xs font-mono uppercase tracking-wider text-nova/60 pb-4 pr-4 min-w-[240px]">
              Target Habits
            </th>
            {days.map(day => {
              const dayStr = format(day, 'd')
              const today = isToday(day)
              return (
                <th key={dayStr} className={`text-center text-xs font-mono pb-4 px-0 min-w-[20px] ${
                  today ? 'text-gold' : 'text-nova/60/40'
                }`}>
                  {dayStr}
                </th>
              )
            })}
            <th className="text-center text-xs font-mono uppercase tracking-wider text-nova/60 pb-4 pl-3 min-w-[40px]">Win %</th>
          </tr>
        </thead>
        <tbody className="space-y-1">
          {habits.map(habit => {
            const rate = getCompletionRate(habit.id)
            return (
              <tr key={habit.id} className="group habit-row">
                <td className="pr-4 py-2 border-b border-blue-900/10">
                  <div className="flex items-center gap-2">
                    {editingHabit === habit.id ? (
                      <div className="flex items-center gap-1 flex-1 bg-pulsar/10 px-2 py-1 rounded border border-pulsar/40">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveHabitTitle(habit.id)}
                          className="flex-1 bg-transparent text-sm text-starlight outline-none font-body"
                          autoFocus />
                        <button onClick={() => saveHabitTitle(habit.id)} className="text-emerald hover:text-emerald/80"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingHabit(null)} className="text-nova/60 hover:text-starlight"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-body text-starlight/90 truncate max-w-[220px]" title={habit.title}>
                          {habit.title}
                        </span>
                        <button onClick={() => { setEditingHabit(habit.id); setEditTitle(habit.title) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-nova/60 hover:text-starlight p-1">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => onDelete(habit.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-nova/60 hover:text-danger p-1">
                          <Trash2 className="w-3 h-3" />
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
                    <td key={dateStr} className="text-center py-2 px-0 border-b border-blue-900/10">
                      <button
                        onClick={(e) => !future && toggleDay(habit, dateStr, e)}
                        disabled={future}
                        className={`habit-cell ${
                          logged 
                            ? 'bg-emerald  border border-emerald/50' 
                            : today
                            ? 'bg-gold/20 border border-gold hover:bg-gold/40 hover:'
                            : future
                            ? 'bg-transparent border border-blue-900/10 opacity-30 cursor-not-allowed'
                            : 'bg-stardust/10 border border-pulsar/30 hover:bg-stardust/30'
                        }`}
                        title={`${habit.title} - ${format(day, 'MMM d')}`}
                      />
                    </td>
                  )
                })}
                <td className="text-center py-2 pl-3 border-b border-blue-900/10">
                  <div className={`text-xs font-mono px-2 py-0.5 rounded-full inline-block ${
                    rate >= 80 ? 'bg-emerald/10 text-emerald border border-emerald/20' : 
                    rate >= 50 ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
                    'bg-pulsar/10 text-nova/60 border border-nova/20'
                  }`}>
                    {rate}%
                  </div>
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
