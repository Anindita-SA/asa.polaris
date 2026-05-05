import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getLevelInfo } from '../../data/defaults'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { Trophy, Flame, Target, Clock } from 'lucide-react'

const ProgressDashboard = () => {
    const { user, profile } = useAuth()
    const [milestones, setMilestones] = useState([])
    const [goals, setGoals] = useState([])
    const [habitLogs, setHabitLogs] = useState([])
    const [habits, setHabits] = useState([])
    const [pomodoroLogs, setPomodoroLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user?.id) return
        Promise.all([
            supabase.from('milestones').select('*').eq('user_id', user.id),
            supabase.from('goals').select('*').eq('user_id', user.id),
            supabase.from('habits').select('*').eq('user_id', user.id),
            supabase.from('habit_logs').select('*').eq('user_id', user.id)
                .gte('date', format(subDays(new Date(), 365), 'yyyy-MM-dd')),
            supabase.from('pomodoro_logs').select('*').eq('user_id', user.id)
                .gte('date', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
                .order('date'),
        ]).then(([m, g, h, hl, p]) => {
            setMilestones(m.data || [])
            setGoals(g.data || [])
            setHabits(h.data || [])
            setHabitLogs(hl.data || [])
            setPomodoroLogs(p.data || [])
            setLoading(false)
        })
    }, [user?.id])

    const xp = profile?.xp || 0
    const { current, next, progress } = getLevelInfo(xp)

    // Milestone stats
    const msDone = milestones.filter(m => m.status === 'done').length
    const msInProgress = milestones.filter(m => m.status === 'in-progress').length
    const msUpcoming = milestones.filter(m => m.status === 'upcoming' || m.status === 'overdue').length
    const msTotal = milestones.length || 9

    // Goals stats by scope
    const scopeStats = ['weekly', 'monthly', 'quarterly'].map(scope => {
        const scoped = goals.filter(g => g.scope === scope)
        const done = scoped.filter(g => g.completed).length
        return { scope, done, total: scoped.length }
    })

    // Habit heatmap - last 365 days
    const heatmapDays = eachDayOfInterval({ start: subDays(new Date(), 364), end: new Date() })
    const logsByDate = {}
    habitLogs.forEach(l => {
        logsByDate[l.date] = (logsByDate[l.date] || 0) + 1
    })
    const today = format(new Date(), 'yyyy-MM-dd')
    const totalHabits = habits.length || 1

    // Streak
    let streak = 0
    for (let i = 0; i < 365; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
        if (logsByDate[d]) streak++
        else break
    }
    let maxStreak = 0, cur = 0
    heatmapDays.forEach(day => {
        const d = format(day, 'yyyy-MM-dd')
        if (logsByDate[d]) { cur++; maxStreak = Math.max(maxStreak, cur) }
        else cur = 0
    })
    const totalActiveDays = Object.keys(logsByDate).length

    // Pomodoro - last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
        const mins = pomodoroLogs.filter(p => p.date === d).reduce((s, p) => s + p.duration_minutes, 0)
        return { date: d, label: format(subDays(new Date(), 6 - i), 'EEE'), mins }
    })
    const maxMins = Math.max(...last7.map(d => d.mins), 1)
    const totalFocusWeek = last7.reduce((s, d) => s + d.mins, 0)

    // Heatmap weeks
    const weeks = []
    let week = []
    heatmapDays.forEach((day, i) => {
        week.push(day)
        if (week.length === 7 || i === heatmapDays.length - 1) { weeks.push(week); week = [] }
    })

    const getCellColor = (day) => {
        const d = format(day, 'yyyy-MM-dd')
        const count = logsByDate[d] || 0
        if (count === 0) return 'bg-stardust/40 border-blue-900/10'
        const intensity = Math.min(count / totalHabits, 1)
        if (intensity >= 0.8) return 'bg-emerald border-emerald/30'
        if (intensity >= 0.5) return 'bg-emerald/60 border-emerald/20'
        return 'bg-emerald/30 border-emerald/15'
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p className="font-display text-dim tracking-widest text-sm animate-pulse">COMPUTING STARS...</p>
        </div>
    )

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* XP + Level ring */}
                <div className="glass border border-blue-900/20 rounded-xl p-5 flex items-center gap-6">
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="8"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={(2 * Math.PI * 42) * (1 - progress / 100)}
                                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-display text-gold leading-none">{current.level}</span>
                            <span className="text-xs font-mono text-dim">LV</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-gold tracking-wider text-lg">{current.name}</p>
                        <p className="text-xs font-mono text-dim mt-1">{xp} XP {next ? `/ ${next.minXp} to ${next.name}` : '- MAX'}</p>
                        <div className="mt-2 h-2 bg-stardust rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-gold to-nova rounded-full xp-bar-fill transition-all duration-700"
                                style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>

                {/* Milestones - LeetCode style */}
                <div className="glass border border-blue-900/20 rounded-xl p-5">
                    <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-4">
                        <Trophy className="w-3.5 h-3.5 text-gold" /> Milestones
                    </h3>
                    <div className="flex items-center gap-6">
                        {/* Donut */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="10"
                                    strokeDasharray={2 * Math.PI * 38}
                                    strokeDashoffset={(2 * Math.PI * 38) * (1 - msDone / msTotal)}
                                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-display text-starlight leading-none">{msDone}</span>
                                <span className="text-xs font-mono text-dim">/{msTotal}</span>
                            </div>
                        </div>
                        {/* Bars */}
                        <div className="flex-1 space-y-2">
                            {[
                                { label: 'Done', count: msDone, color: 'bg-emerald', total: msTotal },
                                { label: 'In Progress', count: msInProgress, color: 'bg-pulsar', total: msTotal },
                                { label: 'Upcoming', count: msUpcoming, color: 'bg-dim/40', total: msTotal },
                            ].map(({ label, count, color, total }) => (
                                <div key={label} className="flex items-center gap-3">
                                    <span className="text-xs text-dim font-body w-20">{label}</span>
                                    <div className="flex-1 h-2 bg-stardust rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                                            style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-dim w-8 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Goals completion */}
                <div className="glass border border-blue-900/20 rounded-xl p-5">
                    <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-4">
                        <Target className="w-3.5 h-3.5 text-aurora" /> Goals
                    </h3>
                    <div className="space-y-3">
                        {scopeStats.map(({ scope, done, total }) => (
                            <div key={scope} className="flex items-center gap-3">
                                <span className="text-xs font-mono text-dim capitalize w-20">{scope}</span>
                                <div className="flex-1 h-2 bg-stardust rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${scope === 'weekly' ? 'bg-emerald' :
                                            scope === 'monthly' ? 'bg-pulsar' : 'bg-aurora'
                                        }`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs font-mono text-dim">{done}/{total}</span>
                            </div>
                        ))}
                        {!goals.length && <p className="text-xs text-dim italic font-body">No goals yet - add some in the Goals tab.</p>}
                    </div>
                </div>

                {/* Focus time - 7 day bar chart */}
                <div className="glass border border-blue-900/20 rounded-xl p-5">
                    <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-pulsar" /> Focus Time
                    </h3>
                    <p className="text-xs text-dim font-mono mb-4">
                        {Math.floor(totalFocusWeek / 60)}h {totalFocusWeek % 60}m this week
                    </p>
                    <div className="flex items-end gap-1.5 h-20">
                        {last7.map((d, i) => {
                            const isToday = d.date === today
                            const heightPct = d.mins > 0 ? Math.max((d.mins / maxMins) * 100, 8) : 0
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                                        <div className={`w-full rounded-sm transition-all duration-500 ${isToday ? 'bg-pulsar' : 'bg-pulsar/30'
                                            }`} style={{ height: `${heightPct}%`, minHeight: d.mins > 0 ? 4 : 0 }} />
                                    </div>
                                    <span className={`text-xs font-mono ${isToday ? 'text-pulsar' : 'text-dim/50'}`}>{d.label}</span>
                                </div>
                            )
                        })}
                    </div>
                    {totalFocusWeek === 0 && (
                        <p className="text-xs text-dim italic font-body mt-2">No pomodoro sessions logged yet.</p>
                    )}
                </div>

                {/* Habit heatmap - full year */}
                <div className="glass border border-blue-900/20 rounded-xl p-5">
                    <h3 className="font-display tracking-wider text-starlight text-sm flex items-center gap-2 mb-2">
                        <Flame className="w-3.5 h-3.5 text-gold" /> Habit Activity
                    </h3>
                    <div className="flex gap-4 mb-3 text-xs font-mono">
                        <span className="text-starlight">{totalActiveDays} active days</span>
                        <span className="text-gold">🔥 {streak} day streak</span>
                        <span className="text-dim">max {maxStreak}</span>
                    </div>

                    {/* Month labels */}
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-1" style={{ minWidth: weeks.length * 14 }}>
                            {weeks.map((week, wi) => {
                                const firstDay = week[0]
                                const showMonth = firstDay.getDate() <= 7
                                return (
                                    <div key={wi} className="flex flex-col gap-1" style={{ width: 12 }}>
                                        {showMonth && (
                                            <span className="text-dim/50 font-mono" style={{ fontSize: 8, marginBottom: 1 }}>
                                                {months[firstDay.getMonth()]}
                                            </span>
                                        )}
                                        {!showMonth && <span style={{ height: 9 }} />}
                                        {week.map((day, di) => {
                                            const isToday = format(day, 'yyyy-MM-dd') === today
                                            return (
                                                <div key={di}
                                                    title={format(day, 'MMM d yyyy')}
                                                    className={`border rounded-sm habit-cell ${getCellColor(day)} ${isToday ? 'ring-1 ring-pulsar/60' : ''
                                                        }`}
                                                    style={{ width: 12, height: 12 }}
                                                />
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                        <div className="w-3 h-3 rounded-sm bg-stardust/40 border border-blue-900/10" />
                        <span className="text-xs text-dim font-mono">none</span>
                        <div className="w-3 h-3 rounded-sm bg-emerald/30 border border-emerald/15 ml-2" />
                        <span className="text-xs text-dim font-mono">partial</span>
                        <div className="w-3 h-3 rounded-sm bg-emerald border border-emerald/30 ml-2" />
                        <span className="text-xs text-dim font-mono">all habits</span>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default ProgressDashboard