import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, X } from 'lucide-react'

const INPUT_CATEGORIES = ['reading', 'lecture', 'video', 'course', 'scrolling', 'other']
const OUTPUT_CATEGORIES = ['writing', 'building', 'designing', 'coding', 'creating', 'practicing', 'other']

const IOBalanceBar = () => {
  const { user, addXP } = useAuth()
  const [logs, setLogs] = useState([])
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [logType, setLogType] = useState('input')
  const [logMins, setLogMins] = useState(30)
  const [logCategory, setLogCategory] = useState('other')

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (user?.id) fetchLogs()
  }, [user?.id])

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('io_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
    setLogs(data || [])
  }

  const inputMins = logs.filter(l => l.type === 'input').reduce((s, l) => s + l.minutes, 0)
  const outputMins = logs.filter(l => l.type === 'output').reduce((s, l) => s + l.minutes, 0)
  const total = inputMins + outputMins || 1
  const inputPct = (inputMins / total) * 100
  const outputPct = (outputMins / total) * 100

  // Balance state
  const diff = outputMins - inputMins
  const balanceState = diff >= 0 ? 'balanced' : diff >= -30 ? 'warning' : 'alert'

  const addLog = async () => {
    if (!user?.id || logMins <= 0) return
    await supabase.from('io_logs').insert({
      user_id: user.id,
      type: logType,
      category: logCategory,
      minutes: logMins,
      date: today,
    })
    // XP for output
    if (logType === 'output') await addXP(5)
    // Check if ratio just hit 1:1
    const newOutputMins = outputMins + (logType === 'output' ? logMins : 0)
    const newInputMins = inputMins + (logType === 'input' ? logMins : 0)
    if (newOutputMins >= newInputMins && outputMins < inputMins) {
      await addXP(10) // bonus for reaching equilibrium
    }
    setShowQuickLog(false)
    fetchLogs()
  }

  return (
    <>
      {/* Aurora animation keyframes */}
      <style>{`
        @keyframes aurora-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aurora-pulse {
          0%, 100% { opacity: 0.4; filter: blur(2px); }
          50% { opacity: 0.8; filter: blur(4px); }
        }
        @keyframes alert-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Balance bar row - matches XP bar width */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowQuickLog(s => !s)}>
        <span className="text-xs font-display tracking-wider whitespace-nowrap" style={{
          color: balanceState === 'balanced' ? '#10b981' : balanceState === 'warning' ? '#f59e0b' : '#ef4444'
        }}>I/O</span>

        <div className="relative flex-1 h-2 rounded-full overflow-hidden bg-stardust/20 min-w-[80px]" 
          title={`📥 ${inputMins}min input | 📤 ${outputMins}min output`}>
          
          {/* Center equilibrium marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-starlight/20 z-30" />
          
          {/* Input bar — amber, grows from center leftward */}
          <div className="absolute right-1/2 top-0 bottom-0 rounded-l-full transition-all duration-1000 z-10"
            style={{ 
              width: `${inputMins > 0 ? Math.max(Math.min((inputMins / Math.max(inputMins + outputMins, 1)) * 100, 50), 3) : 0}%`,
              background: balanceState === 'alert' 
                ? 'linear-gradient(270deg, #f59e0b, #ef4444, #f59e0b)'
                : 'linear-gradient(270deg, #f59e0b90, #f59e0b50)',
              backgroundSize: balanceState === 'alert' ? '200% 100%' : 'auto',
              animation: balanceState === 'alert' ? 'aurora-shift 2s ease-in-out infinite' : 'none',
            }} 
          />
          
          {/* Output bar — emerald/aurora, grows from center rightward */}
          <div className="absolute left-1/2 top-0 bottom-0 rounded-r-full transition-all duration-1000 z-10"
            style={{ 
              width: `${outputMins > 0 ? Math.max(Math.min((outputMins / Math.max(inputMins + outputMins, 1)) * 100, 50), 3) : 0}%`,
              background: balanceState === 'balanced'
                ? 'linear-gradient(90deg, #10b981, #06d6a0, #34d399, #10b981)'
                : 'linear-gradient(90deg, #10b98180, #10b98150)',
              backgroundSize: balanceState === 'balanced' ? '300% 100%' : 'auto',
              animation: balanceState === 'balanced' ? 'aurora-shift 3s ease-in-out infinite' : 'none',
            }} 
          />

          {/* Aurora glow layer — only when balanced and active */}
          {balanceState === 'balanced' && outputMins > 0 && (
            <div className="absolute inset-0 rounded-full z-20 pointer-events-none"
              style={{ 
                background: 'linear-gradient(90deg, transparent 10%, rgba(16,185,129,0.25) 30%, rgba(6,214,160,0.3) 50%, rgba(52,211,153,0.25) 70%, transparent 90%)',
                backgroundSize: '200% 100%',
                animation: 'aurora-shift 4s ease-in-out infinite, aurora-pulse 2.5s ease-in-out infinite',
              }} 
            />
          )}

          {/* Red pulsing alert layer */}
          {balanceState === 'alert' && (
            <div className="absolute inset-0 rounded-full z-20 pointer-events-none"
              style={{ 
                background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 50%, transparent 100%)',
                animation: 'alert-pulse 1.5s ease-in-out infinite',
              }} 
            />
          )}
        </div>

        <div className="flex gap-1 text-xs font-mono whitespace-nowrap">
          <span className={balanceState === 'alert' ? 'text-red-400' : 'text-amber-400/70'}>{inputMins}m</span>
          <span className="text-dim/30">:</span>
          <span className={balanceState === 'balanced' && outputMins > 0 ? 'text-emerald-400' : 'text-emerald-400/50'}>{outputMins}m</span>
        </div>
      </div>

      {/* Quick-log dropdown */}
      {showQuickLog && (
        <div className="fixed top-14 right-4 z-[60] glass border border-blue-900/20 rounded-2xl p-4 w-72 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm text-starlight tracking-wider">LOG I/O</h4>
            <button onClick={() => setShowQuickLog(false)} className="text-dim hover:text-starlight">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-blue-900/20">
            <button onClick={() => { setLogType('input'); setLogCategory(INPUT_CATEGORIES[0]) }}
              className={`flex-1 text-xs py-1.5 font-body transition-all ${logType === 'input' ? 'bg-amber-500/20 text-amber-400' : 'text-dim hover:text-starlight'}`}>
              📥 Input
            </button>
            <button onClick={() => { setLogType('output'); setLogCategory(OUTPUT_CATEGORIES[0]) }}
              className={`flex-1 text-xs py-1.5 font-body transition-all ${logType === 'output' ? 'bg-emerald-500/20 text-emerald-400' : 'text-dim hover:text-starlight'}`}>
              📤 Output
            </button>
          </div>

          {/* Category */}
          <select value={logCategory} onChange={e => setLogCategory(e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-2 py-1.5 outline-none font-body">
            {(logType === 'input' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Duration quick-picks */}
          <div className="flex gap-2">
            {[15, 30, 45, 60].map(m => (
              <button key={m} onClick={() => setLogMins(m)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-mono ${
                  logMins === m 
                    ? 'border-pulsar/40 bg-pulsar/10 text-starlight' 
                    : 'border-blue-900/20 text-dim hover:text-starlight'
                }`}>
                {m}m
              </button>
            ))}
          </div>

          <button onClick={addLog}
            className="w-full py-2 rounded-lg text-xs font-display tracking-wider transition-all border"
            style={{
              background: logType === 'output' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              borderColor: logType === 'output' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
              color: logType === 'output' ? '#10b981' : '#f59e0b',
            }}>
            LOG {logMins} MIN {logType.toUpperCase()}
          </button>

          {/* Today's breakdown */}
          <div className="pt-2 border-t border-blue-900/10 space-y-1">
            <p className="text-[10px] font-mono text-dim uppercase tracking-wider">Today</p>
            <div className="flex justify-between text-xs font-body">
              <span className="text-amber-400">📥 {inputMins} min input</span>
              <span className="text-emerald-400">📤 {outputMins} min output</span>
            </div>
            <p className={`text-[10px] font-mono text-center mt-1 ${
              balanceState === 'balanced' ? 'text-emerald-400' : 
              balanceState === 'warning' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {balanceState === 'balanced' 
                ? '✨ Output ≥ Input — keep creating!' 
                : balanceState === 'warning'
                ? '⚠️ Input ahead by ' + Math.abs(diff) + 'min — time to create'
                : '🚨 Brain rot alert — ' + Math.abs(diff) + 'min deficit!'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default IOBalanceBar
