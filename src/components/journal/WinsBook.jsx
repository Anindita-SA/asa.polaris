import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCelebration } from '../../hooks/useCelebration'
import { Trophy, Plus, Sparkles } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const WinsBook = ({ dateStr }) => {
  const { user } = useAuth()
  const { celebrate } = useCelebration()
  const [wins, setWins] = useState([])
  const [nodes, setNodes] = useState([])
  
  // Form State
  const [text, setText] = useState('')
  const [size, setSize] = useState('micro')
  const [nodeId, setNodeId] = useState('')

  useEffect(() => {
    if (user) {
      fetchNodes()
      fetchWins()
    }
  }, [user])

  const fetchNodes = async () => {
    const { data } = await supabase.from('nodes').select('id, title').eq('user_id', user.id).order('title')
    if (data) setNodes(data)
  }

  const fetchWins = async () => {
    const { data } = await supabase
      .from('wins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setWins(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    const newWin = {
      user_id: user.id,
      text: text.trim(),
      size,
      node_id: nodeId || null,
      log_date: dateStr // Maps to the selected date in Journal
    }

    const { data, error } = await supabase.from('wins').insert(newWin).select().single()
    
    if (data) {
      setWins(prev => [data, ...prev])
      setText('')
      setSize('micro')
      setNodeId('')
      celebrate()
    } else {
      console.error("Error inserting win:", error)
    }
  }

  const getNodeTitle = (id) => {
    const n = nodes.find(n => n.id === id)
    return n ? n.title : 'Unknown'
  }

  return (
    <div className="glass border border-amber-500/20 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h3 className="font-display tracking-wider text-starlight text-xs uppercase">Wins Book</h3>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 mb-6 bg-white/5 p-3 rounded-lg border border-white/10">
        <input 
          type="text" 
          placeholder="Log a win..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-transparent border-none text-sm text-starlight placeholder-dim focus:outline-none focus:ring-0 px-2"
        />
        
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-3">
          <select 
            value={size} 
            onChange={(e) => setSize(e.target.value)}
            className="bg-void border border-white/10 text-xs text-dim rounded px-2 py-1.5 focus:outline-none"
          >
            <option value="micro">Micro Win</option>
            <option value="big">Big Win</option>
          </select>

          <select 
            value={nodeId} 
            onChange={(e) => setNodeId(e.target.value)}
            className="bg-void border border-white/10 text-xs text-dim rounded px-2 py-1.5 focus:outline-none max-w-[120px]"
          >
            <option value="">No Link</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>

          <button 
            type="submit"
            disabled={!text.trim()}
            className="h-8 px-3 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-display tracking-widest hidden md:inline">ADD</span>
          </button>
        </div>
      </form>

      {/* Wins List */}
      <div className="space-y-3">
        {wins.map(win => (
          <div key={win.id} className="bg-amber-400/10 border border-amber-400/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 group transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${win.size === 'big' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'}`}>
                {win.size === 'big' ? <Trophy className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-starlight leading-snug">{win.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono text-dim opacity-70">
                    {win.log_date ? format(parseISO(win.log_date), 'MMM d, yyyy') : 'No Date'}
                  </span>
                  {win.node_id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-900/30 text-sky bg-sky/5 font-mono">
                      {getNodeTitle(win.node_id)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center mt-2 md:mt-0">
               <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-display ${win.size === 'big' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
                 {win.size}
               </span>
            </div>
          </div>
        ))}
        {wins.length === 0 && (
          <p className="text-center text-xs text-dim italic py-4">No wins logged yet. Celebrate the small things!</p>
        )}
      </div>
    </div>
  )
}

export default WinsBook
