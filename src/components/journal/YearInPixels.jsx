import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { format, startOfYear, eachDayOfInterval, endOfYear, isSameDay } from 'date-fns'

const MOOD_COLORS = {
  amazing: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
  average: 'bg-slate-400',
  ehh: 'bg-teal-600',
  stressed: 'bg-amber-500',
  angry: 'bg-purple-600',
  sick: 'bg-red-500',
  unspeakable: 'bg-slate-900 border border-blue-900/30'
}

const YearInPixels = ({ userId, onDateSelect, selectedDate }) => {
  const [moodLogs, setMoodLogs] = useState([])
  const year = new Date().getFullYear()
  
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    })
  }, [year])

  useEffect(() => {
    const fetchMoods = async () => {
      const { data } = await supabase
        .from('mood_logs')
        .select('log_date, mood')
        .eq('user_id', userId)
        .gte('log_date', `${year}-01-01`)
        .lte('log_date', `${year}-12-31`)
      setMoodLogs(data || [])
    }
    fetchMoods()
  }, [userId, year])

  // Group by month for the grid
  const months = useMemo(() => {
    const m = Array.from({ length: 12 }, () => [])
    days.forEach(day => {
      m[day.getMonth()].push(day)
    })
    return m
  }, [days])

  return (
    <div className="glass border-2 border-pulsar/30 bg-void/40 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded-xl p-5 overflow-hidden">
      <h3 className="font-display tracking-wider text-starlight text-sm mb-4 uppercase">Year in Pixels {year}</h3>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {months.map((monthDays, mi) => (
          <div key={mi} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-dim uppercase mb-1 h-3 flex items-center justify-center">
              {format(monthDays[0], 'MMM')[0]}
            </span>
            <div className="flex flex-col gap-1.5">
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const log = moodLogs.find(l => l.log_date === dateStr)
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === dateStr
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => onDateSelect(day)}
                    title={`${dateStr}: ${log?.mood || 'No log'}`}
                    className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
                      log?.mood ? MOOD_COLORS[log.mood.toLowerCase()] || 'bg-stardust/20' : 'bg-stardust/10 hover:bg-stardust/30'
                    } ${isSelected ? 'ring-2 ring-nova ring-offset-2 ring-offset-void scale-110 z-10' : ''}`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-4 border-t border-blue-900/10">
        {Object.entries(MOOD_COLORS).map(([mood, color]) => (
          <div key={mood} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-[10px] font-mono text-dim uppercase">{mood.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default YearInPixels
