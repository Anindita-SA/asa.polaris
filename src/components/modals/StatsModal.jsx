import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { X, TrendingUp, Activity, Shield, Award, Plus, Trash2 } from 'lucide-react'
import { getLevelInfo, TIERS } from '../../data/defaults'
import ProgressDashboard from '../widgets/ProgressDashboard'

const StatsModal = ({ onClose }) => {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('evolution') // 'evolution' | 'io' | 'progress'
  const [ioHistory, setIoHistory] = useState([])
  const [rawLogs, setRawLogs] = useState([])
  const [ioForm, setIoForm] = useState({ type: 'output', category: '', minutes: 25, date: new Date().toISOString().split('T')[0] })

  const xp = profile?.xp || 0
  const { current, next, progress } = getLevelInfo(xp)

  useEffect(() => {
    if (activeTab === 'io') fetchIOHistory()
  }, [activeTab])

  const fetchIOHistory = async () => {
    if (!user) return
    const dates = Array.from({length: 7}, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const { data } = await supabase.from('io_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', dates[0])

    const history = dates.map(dateStr => {
      const dayLogs = data?.filter(l => l.date === dateStr) || []
      const input = dayLogs.filter(l => l.type === 'input').reduce((s, l) => s + l.minutes, 0)
      const output = dayLogs.filter(l => l.type === 'output').reduce((s, l) => s + l.minutes, 0)
      const dateObj = new Date(dateStr)
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
      return { date: dateStr, dayName, input, output }
    })
    setIoHistory(history)

    const { data: allData } = await supabase.from('io_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)
    setRawLogs(allData || [])
  }

  const addManualIO = async () => {
    if (!user || !ioForm.category || !ioForm.minutes || !ioForm.date) return
    await supabase.from('io_logs').insert({
      user_id: user.id,
      type: ioForm.type,
      category: ioForm.category,
      minutes: parseInt(ioForm.minutes),
      date: ioForm.date,
    })
    setIoForm(f => ({ ...f, category: '', minutes: 25 }))
    fetchIOHistory()
  }

  const deleteIOLog = async (id) => {
    await supabase.from('io_logs').delete().eq('id', id)
    fetchIOHistory()
  }

  // Evolution Data
  const currentTierIndex = Math.min(Math.floor((current.level - 1) / 10), TIERS.length - 1)
  const xpNeeded = next ? next.minXp - xp : 0

  return (
    <div className="modal-overlay fixed inset-0 bg-void/80 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass border border-pulsar/40 rounded-t-2xl rounded-b-none md:rounded-xl p-6 w-full max-w-full md:max-w-4xl min-h-[520px] max-h-[90vh] flex flex-col bg-[#0c0f14]/95 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-pulsar/30 pb-4">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <button onClick={() => setActiveTab('evolution')} 
              className={`flex items-center gap-2 text-xs sm:text-lg font-display transition-colors ${activeTab === 'evolution' ? 'text-gold border-b-2 border-gold pb-1 font-bold' : 'text-nova/60 hover:text-starlight'}`}>
              <Shield className="w-4 h-4 text-gold" /> Evolution
            </button>

            <button onClick={() => setActiveTab('io')} 
              className={`flex items-center gap-2 text-xs sm:text-lg font-display transition-colors ${activeTab === 'io' ? 'text-emerald border-b-2 border-emerald pb-1 font-bold' : 'text-nova/60 hover:text-starlight'}`}>
              <Activity className="w-4 h-4 text-emerald" /> I/O Chronology
            </button>

            <button onClick={() => setActiveTab('progress')} 
              className={`flex items-center gap-2 text-xs sm:text-lg font-display transition-colors ${activeTab === 'progress' ? 'text-pulsar border-b-2 border-pulsar pb-1 font-bold' : 'text-nova/60 hover:text-starlight'}`}>
              <TrendingUp className="w-4 h-4 text-pulsar" /> Progress
            </button>
          </div>
          <button onClick={onClose} className="text-nova/60 hover:text-starlight p-1 rounded-lg hover:bg-pulsar/10"><X className="w-5 h-5" /></button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-2 scrollbar-hide">
          {activeTab === 'evolution' && (
            <div className="flex flex-col items-center justify-center space-y-12 py-8 flex-1">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-gold/20 rounded-full border-4 border-gold/40 flex items-center justify-center animate-pulse-slow ">
                  <Shield className="w-12 h-12 text-gold" />
                </div>
                <div>
                  <h2 className="text-base font-display text-starlight">{current.name}</h2>
                  <p className="text-nova font-mono text-sm mt-2">Level {current.level} ✦ {xp} Lifetime XP</p>
                </div>
              </div>

              {next && (
                <div className="w-full max-w-md mx-auto space-y-3">
                  <div className="flex justify-between text-xs font-mono text-nova/60">
                    <span>{current.name}</span>
                    <span>{next.name}</span>
                  </div>
                  <div className="h-3 bg-stardust rounded-full overflow-hidden border border-pulsar/40">
                    <div className="h-full bg-gold rounded-full xp-bar-fill transition-all duration-1000 relative"
                      style={{ width: `${progress}%` }}>
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMCAwIDAgNDAgNDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIi8+PC9zdmc+')] opacity-20 animate-slide-bg" />
                    </div>
                  </div>
                  <p className="text-center text-xs font-body text-nova/60 italic">
                    <span className="text-starlight font-mono">{xpNeeded} XP</span> required for promotion
                  </p>
                </div>
              )}

              <div className="w-full max-w-md mx-auto grid grid-cols-3 gap-2 mt-8">
                {TIERS.slice(currentTierIndex, currentTierIndex + 3).map((tier, idx) => (
                  <div key={tier} className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${idx === 0 ? 'bg-gold/10 border-gold/40' : 'bg-pulsar/10 border-pulsar/30 opacity-50'}`}>
                    <Award className={`w-5 h-5 mb-2 ${idx === 0 ? 'text-gold' : 'text-nova/60'}`} />
                    <span className={`text-xs font-mono uppercase tracking-wider ${idx === 0 ? 'text-starlight' : 'text-nova/60'}`}>{tier}</span>
                    {idx === 0 && <span className="text-[9px] text-gold mt-1">Current Rank</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'io' && (
            <div className="flex flex-col space-y-8 pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col items-center">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-500/80 mb-1">Total 7-Day Input</span>
                  <span className="text-2xl font-mono text-amber-400">{ioHistory.reduce((s, l) => s + l.input, 0)}m</span>
                </div>
                <div className="glass p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-500/80 mb-1">Total 7-Day Output</span>
                  <span className="text-2xl font-mono text-emerald-400">{ioHistory.reduce((s, l) => s + l.output, 0)}m</span>
                </div>
              </div>

              <div className="shrink-0 flex items-end justify-between gap-2 h-48 border-b border-pulsar/40 pb-2 relative mt-4">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full h-px bg-starlight" />
                  <div className="w-full h-px bg-starlight" />
                  <div className="w-full h-px bg-starlight" />
                  <div className="w-full h-px bg-starlight" />
                </div>

                {ioHistory.map((day, i) => {
                  const maxVal = Math.max(...ioHistory.map(d => Math.max(d.input, d.output)), 60)
                  const inPct = (day.input / maxVal) * 100
                  const outPct = (day.output / maxVal) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group">
                      <div className="flex items-end justify-center gap-1 w-full h-[90%]">
                        <div className="w-1/3 max-w-[12px] bg-amber-500 rounded-t transition-all duration-500 relative" style={{ height: `${inPct}%` }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-400 opacity-0 group-hover:opacity-100">{day.input}</span>
                        </div>
                        <div className="w-1/3 max-w-[12px] bg-emerald-500 rounded-t transition-all duration-500 relative" style={{ height: `${outPct}%` }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100">{day.output}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono uppercase tracking-wider text-nova/60 mt-2">{day.dayName}</span>
                    </div>
                  )
                })}
              </div>

              {/* Manual Entry Form */}
              <div className="glass p-4 rounded-xl border border-pulsar/40 flex flex-col gap-3">
                <h3 className="text-lg font-mono uppercase tracking-wider text-starlight mb-1">Manual I/O Entry</h3>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <select value={ioForm.type} onChange={e => setIoForm(f => ({ ...f, type: e.target.value }))}
                    className={`bg-stardust text-xs px-3 py-2 rounded-lg outline-none font-body border ${ioForm.type === 'input' ? 'border-amber-500/30 text-amber-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                    <option value="input">📥 Input</option>
                    <option value="output">📤 Output</option>
                  </select>
                  <input type="text" placeholder="Activity / Category" value={ioForm.category} onChange={e => setIoForm(f => ({ ...f, category: e.target.value }))}
                    className="flex-1 bg-stardust/40 text-starlight text-xs border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body min-w-[150px]" />
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" value={ioForm.minutes} onChange={e => setIoForm(f => ({ ...f, minutes: e.target.value }))}
                      className="w-16 bg-stardust/40 text-starlight text-xs border border-pulsar/30 rounded-lg px-2 py-2 outline-none font-mono text-center" />
                    <span className="text-xs text-nova/60 font-mono">min</span>
                  </div>
                  <input type="date" value={ioForm.date} onChange={e => setIoForm(f => ({ ...f, date: e.target.value }))}
                    className="bg-stardust/40 text-starlight text-xs border border-pulsar/30 rounded-lg px-2 py-2 outline-none font-mono"
                    style={{ colorScheme: 'dark' }} />
                  <button onClick={addManualIO}
                    className="w-8 h-8 rounded-lg bg-blue-900/20 text-starlight border border-blue-900/40 hover:bg-blue-900/40 flex items-center justify-center transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Raw History List */}
              <div className="space-y-2 pb-4">
                <h3 className="text-lg font-mono uppercase tracking-wider text-nova/60 mb-2 mt-4">Recent I/O Logs</h3>
                {rawLogs.length === 0 ? (
                  <p className="text-xs text-nova/60 italic font-body">No logs found.</p>
                ) : (
                  rawLogs.map(log => (
                    <div key={log.id} className="group flex items-center justify-between p-3 rounded-lg border border-blue-900/10 hover:border-pulsar/40 hover:bg-pulsar/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${log.type === 'input' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {log.type}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-body text-starlight">{log.category}</span>
                          <span className="text-xs text-nova/60 font-mono">{log.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-starlight">{log.minutes}m</span>
                        <button onClick={() => deleteIOLog(log.id)} className="text-nova/60 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="flex-1 overflow-y-auto">
              <ProgressDashboard />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default StatsModal
