import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ChevronDown, ChevronUp, Edit2, Check, X, Plus, GripVertical, Sunrise, Sun, Moon } from 'lucide-react'

const TIME_GROUPS = [
  { id: 'morning', label: 'Morning', icon: Sunrise, color: 'text-aurora' },
  { id: 'anytime', label: 'Anytime', icon: Sun, color: 'text-gold' },
  { id: 'evening', label: 'Evening', icon: Moon, color: 'text-pulsar' }
]

const DailyRitual = ({ dateStr }) => {
  const { user, addXP } = useAuth()
  const [expanded, setExpanded] = useState(() => {
    return localStorage.getItem('polaris_ritual_expanded') === 'true'
  })
  const [editing, setEditing] = useState(false)
  
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemTime, setNewItemTime] = useState('morning')

  useEffect(() => {
    localStorage.setItem('polaris_ritual_expanded', expanded)
  }, [expanded])

  useEffect(() => {
    if (user) {
      fetchItems()
      fetchLogs()
    }
  }, [user, dateStr])

  const fetchItems = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('ritual_items')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    setItems(data || [])
  }

  const fetchLogs = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('ritual_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
    setLogs(data || [])
  }

  const toggleItem = async (item) => {
    if (editing || !user?.id) return

    const log = logs.find(l => l.item_id === item.id)
    if (log) {
      // Uncheck
      await supabase.from('ritual_logs').delete().eq('id', log.id)
      setLogs(prev => prev.filter(l => l.id !== log.id))
      await addXP(-5)
    } else {
      // Check
      const { data } = await supabase.from('ritual_logs').insert({
        user_id: user.id,
        item_id: item.id,
        date: dateStr
      }).select().single()
      
      if (data) {
        setLogs(prev => [...prev, data])
        await addXP(5)
      }
    }
  }

  const addItem = async () => {
    if (!newItemTitle.trim() || !user?.id) return
    
    const { data } = await supabase.from('ritual_items').insert({
      user_id: user.id,
      title: newItemTitle,
      time_of_day: newItemTime,
      position: items.length
    }).select().single()
    
    if (data) {
      setItems(prev => [...prev, data])
      setNewItemTitle('')
    }
  }

  const deleteItem = async (id) => {
    if (!user?.id) return
    await supabase.from('ritual_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setLogs(prev => prev.filter(l => l.item_id !== id))
  }

  // Simplified moving: just move up or down one slot
  const moveItem = async (index, direction) => {
    if (index + direction < 0 || index + direction >= items.length) return
    
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index + direction]
    newItems[index + direction] = temp
    
    setItems(newItems)
    
    // Update DB
    for (let i = 0; i < newItems.length; i++) {
      await supabase.from('ritual_items').update({ position: i }).eq('id', newItems[i].id)
    }
  }

  const progress = items.length > 0 ? (logs.length / items.length) * 100 : 0

  return (
    <div className="glass border border-blue-900/20 rounded-xl overflow-hidden mb-6 transition-all duration-300">
      {/* Header (always visible) */}
      <div 
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-900/30">
            {expanded ? <ChevronUp className="w-4 h-4 text-starlight" /> : <ChevronDown className="w-4 h-4 text-starlight" />}
          </div>
          <div>
            <h3 className="font-display tracking-widest text-starlight text-sm uppercase">Daily Ritual Stack</h3>
            <p className="text-[10px] font-mono text-dim mt-0.5">{logs.length} / {items.length} COMPLETED</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mini progress bar */}
          <div className="w-24 h-1.5 bg-stardust rounded-full overflow-hidden hidden sm:block">
            <div 
              className="h-full bg-gradient-to-r from-aurora to-emerald transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setEditing(!editing); if (!editing) setExpanded(true); }}
            className={`p-1.5 rounded-md transition-colors ${editing ? 'bg-pulsar/20 text-pulsar' : 'hover:bg-white/10 text-dim'}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-blue-900/10">
          
          {editing && (
            <div className="mb-6 p-4 rounded-lg bg-black/20 border border-dashed border-blue-900/30 flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="New ritual step..." 
                className="flex-1 bg-transparent border-b border-blue-900/50 text-sm text-starlight outline-none focus:border-pulsar font-body"
                value={newItemTitle}
                onChange={e => setNewItemTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <select 
                className="bg-void border border-blue-900/30 text-dim text-xs rounded px-2 py-1 outline-none font-display"
                value={newItemTime}
                onChange={e => setNewItemTime(e.target.value)}
              >
                <option value="morning">Morning</option>
                <option value="anytime">Anytime</option>
                <option value="evening">Evening</option>
              </select>
              <button 
                onClick={addItem}
                className="px-4 py-1.5 bg-pulsar/20 text-pulsar border border-pulsar/30 rounded text-xs font-display hover:bg-pulsar/30 transition-colors"
              >
                ADD
              </button>
            </div>
          )}

          {items.length === 0 && !editing ? (
            <div className="text-center py-6 text-dim/50 text-xs font-body italic">
              No rituals defined. Click the edit icon to add your first step.
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {TIME_GROUPS.map(group => {
                const groupItems = items.filter(i => i.time_of_day === group.id)
                if (groupItems.length === 0) return null
                
                const GroupIcon = group.icon
                
                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GroupIcon className={`w-3.5 h-3.5 ${group.color}`} />
                      <h4 className="text-[10px] font-display tracking-widest text-dim uppercase">{group.label}</h4>
                      <div className="flex-1 h-px bg-blue-900/10 ml-2" />
                    </div>
                    
                    <div className="space-y-2">
                      {groupItems.map(item => {
                        const isDone = logs.some(l => l.item_id === item.id)
                        const originalIndex = items.findIndex(i => i.id === item.id)
                        
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => toggleItem(item)}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              editing ? 'border-blue-900/20 bg-black/10' :
                              isDone ? 'border-emerald/30 bg-emerald/5' : 
                              'border-blue-900/10 bg-white/5 hover:border-blue-900/30 cursor-pointer'
                            }`}
                          >
                            {!editing && (
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                                isDone ? 'border-emerald bg-emerald text-void' : 'border-blue-900/40 text-transparent'
                              }`}>
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </div>
                            )}
                            
                            <span className={`flex-1 text-sm font-body transition-colors ${
                              isDone && !editing ? 'text-dim line-through opacity-50' : 'text-starlight'
                            }`}>
                              {item.title}
                            </span>
                            
                            {editing && (
                              <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); moveItem(originalIndex, -1) }} className="p-1 text-dim hover:text-starlight"><ChevronUp className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); moveItem(originalIndex, 1) }} className="p-1 text-dim hover:text-starlight"><ChevronDown className="w-3 h-3" /></button>
                                <div className="w-px h-3 bg-blue-900/30 mx-1" />
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} className="p-1 text-danger hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DailyRitual
