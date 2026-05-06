import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCcw } from 'lucide-react'

const GOOGLE_COLORS = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
}

const CalendarView = () => {
  const { providerToken, signInWithGoogle } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEvents = async (date) => {
    if (!providerToken) return
    
    setLoading(true)
    setError(null)
    
    // We want Monday as start of week (weekStartsOn: 1)
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`, {
        headers: {
          Authorization: `Bearer ${providerToken}`
        }
      })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Google Calendar access expired or denied. Please reconnect.')
        }
        throw new Error('Failed to fetch events.')
      }
      
      const data = await res.json()
      setEvents(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(currentWeek)
  }, [currentWeek, providerToken])

  if (!providerToken || error?.includes('reconnect')) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <CalendarIcon className="w-16 h-16 text-dim mb-4" />
        <h2 className="font-display text-2xl text-starlight tracking-wider mb-2">Connect Google Calendar</h2>
        <p className="font-body text-dim mb-6 max-w-sm">
          To view your schedule and reminders inside Polaris, we need read access to your Google Calendar.
        </p>
        <button 
          onClick={signInWithGoogle}
          className="px-6 py-3 glass border border-blue-900/30 rounded-xl text-starlight font-body hover:bg-stardust/40 transition-colors flex items-center gap-2">
          Sign in with Google
        </button>
      </div>
    )
  }

  // Group events by day
  const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-blue-900/20 bg-void/50 backdrop-blur-sm z-10 shrink-0">
        <h2 className="font-display text-2xl text-starlight tracking-wider">
          {format(start, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchEvents(currentWeek)} disabled={loading}
            className="p-2 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-6 w-px bg-blue-900/30 mx-2" />
          <button onClick={() => setCurrentWeek(d => subWeeks(d, 1))}
            className="p-2 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1 rounded-lg hover:bg-stardust/30 text-xs font-display tracking-widest text-dim hover:text-starlight transition-colors uppercase border border-blue-900/20">
            Today
          </button>
          <button onClick={() => setCurrentWeek(d => addWeeks(d, 1))}
            className="p-2 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {error && !error.includes('reconnect') && (
        <div className="p-4 bg-red-900/20 text-red-400 font-body text-sm text-center border-b border-red-900/50">
          {error}
        </div>
      )}

      {/* Week Grid */}
      <div className="flex-1 overflow-y-auto p-8 pb-16 scrollbar-hide">
        <div className="flex gap-6 min-w-[900px] min-h-[550px]">
          {days.map(day => {
            const isToday = isSameDay(day, new Date())
            const dayEvents = events.filter(e => {
              const eStart = e.start?.dateTime || e.start?.date
              return eStart && isSameDay(new Date(eStart), day)
            })

            return (
              <div key={day.toISOString()} className="flex-1 flex flex-col min-w-[150px]">
                {/* Day Header */}
                <div className={`pb-4 border-b-2 mb-4 sticky top-0 bg-void/90 pt-2 z-10 ${isToday ? 'border-starlight' : 'border-blue-900/20'}`}>
                  <p className={`text-xs font-display tracking-widest uppercase mb-1 ${isToday ? 'text-starlight font-bold' : 'text-slate-400/60'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-3xl font-display ${isToday ? 'text-starlight' : 'text-slate-300/80'}`}>
                    {format(day, 'd')}
                  </p>
                </div>

                {/* Day Events */}
                <div className="flex-1 space-y-3">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-16 bg-stardust/20 rounded-xl" />
                      <div className="h-16 bg-stardust/20 rounded-xl" />
                    </div>
                  ) : dayEvents.length === 0 ? (
                    <div className="text-center pt-8 text-dim/30 font-body text-sm">
                      No events
                    </div>
                  ) : (
                    dayEvents.map(event => {
                      const isAllDay = !event.start.dateTime
                      const startTime = isAllDay ? 'All day' : format(new Date(event.start.dateTime), 'h:mm a')
                      const color = GOOGLE_COLORS[event.colorId] || '#3b82f6'

                      return (
                        <div key={event.id} 
                          className="glass rounded-xl p-3 border border-blue-900/15 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                          style={{ 
                            borderLeftColor: color, 
                            borderLeftWidth: 4,
                            backgroundColor: `${color}0d` // ~5% opacity for a subtle background tint
                          }}>
                          <p className="text-xs font-mono mb-1 text-slate-400/70">{startTime}</p>
                          <p className="text-sm font-body text-starlight leading-tight line-clamp-2">
                            {event.summary || '(No title)'}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CalendarView
