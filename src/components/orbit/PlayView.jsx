import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Gamepad2, Plus, Sparkles, X, ExternalLink, Columns } from 'lucide-react'

const DEFAULT_GAMES = [
  { title: 'Wordle', url: 'https://www.nytimes.com/games/wordle/index.html', type: 'link', icon: '📝', category: 'Word' },
  { title: 'NYT Connections', url: 'https://www.nytimes.com/games/connections', type: 'link', icon: '🔗', category: 'Word' },
  { title: 'Chess Daily', url: 'https://www.chess.com/puzzles', type: 'link', icon: '♟️', category: 'Strategy' },
  { title: 'Sudoku', url: 'https://sudoku.com', type: 'link', icon: '🔢', category: 'Logic' }
]

export default function PlayView() {
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [embedUrl, setEmbedUrl] = useState(null)
  
  const [form, setForm] = useState({ title: '', url: '', type: 'link', icon: '🎲', category: '' })

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('mini_games')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length === 0) {
        // Seed
        const seedData = DEFAULT_GAMES.map((g, i) => ({ ...g, user_id: user.id, sort_order: i }))
        await supabase.from('mini_games').insert(seedData)
        
        // Refetch
        const { data: refetched } = await supabase
          .from('mini_games')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('sort_order', { ascending: true })
        
        setGames(refetched || [])
      } else {
        setGames(data || [])
      }
    } catch (e) {
      console.error('Error fetching games:', e)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (game) => {
    if (game.type === 'link') {
      window.open(game.url, '_blank')
    } else {
      setEmbedUrl(game.url)
    }
  }

  const handleSurprise = () => {
    if (!games.length) return
    const randomGame = games[Math.floor(Math.random() * games.length)]
    handlePlay(randomGame)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.url) return
    
    await supabase.from('mini_games').insert({
      user_id: user.id,
      title: form.title,
      url: form.url,
      type: form.type,
      icon: form.icon,
      category: form.category || null,
      sort_order: games.length
    })
    
    setForm({ title: '', url: '', type: 'link', icon: '🎲', category: '' })
    setShowAddModal(false)
    fetchGames()
  }

  if (loading) {
    return <div className="p-6 text-dim text-xs font-mono animate-pulse text-center">Loading games...</div>
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={handleSurprise}
          className="flex-1 glass border border-amber-500/30 hover:bg-amber-500/10 rounded-xl p-4 flex items-center justify-center gap-2 group transition-all"
        >
          <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="font-display tracking-widest text-amber-400">SURPRISE ME</span>
        </button>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="glass border border-blue-900/30 hover:border-starlight/30 rounded-xl p-4 flex flex-col items-center justify-center text-dim hover:text-starlight transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {games.map(game => (
          <button 
            key={game.id} 
            onClick={() => handlePlay(game)}
            className="glass glass-hover hover:-translate-y-1 border border-amber-500/10 rounded-xl p-4 text-left group transition-all hover:bg-white/[0.03] hover:border-amber-500/30 flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl filter drop-shadow-md">{game.icon}</span>
              {game.type === 'link' ? (
                <ExternalLink className="w-3.5 h-3.5 text-dim group-hover:text-amber-400/70 transition-colors" />
              ) : (
                <Columns className="w-3.5 h-3.5 text-dim group-hover:text-amber-400/70 transition-colors" />
              )}
            </div>
            
            <h4 className="font-display text-sm text-starlight tracking-wide truncate mt-auto">{game.title}</h4>
            
            {game.category && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500/80 border border-amber-500/20 w-fit mt-1.5">
                {game.category}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass border border-blue-900/30 rounded-xl p-6 w-full max-w-sm animate-fade-in relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-dim hover:text-starlight">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-starlight tracking-widest mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-400" /> ADD GAME
            </h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="w-16">
                  <label className="text-[10px] text-dim font-mono uppercase">Icon</label>
                  <input required value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} className="w-full bg-black/20 border border-blue-900/30 rounded px-2 py-1.5 text-starlight outline-none text-center" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-dim font-mono uppercase">Title</label>
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/20 border border-blue-900/30 rounded px-3 py-1.5 text-starlight outline-none font-body text-sm" placeholder="Wordle" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-dim font-mono uppercase">URL</label>
                <input required type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-black/20 border border-blue-900/30 rounded px-3 py-1.5 text-starlight outline-none font-mono text-xs" placeholder="https://..." />
              </div>

              <div>
                <label className="text-[10px] text-dim font-mono uppercase">Category (Optional)</label>
                <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-black/20 border border-blue-900/30 rounded px-3 py-1.5 text-starlight outline-none font-body text-sm" placeholder="Puzzle, Word, etc." />
              </div>

              <div>
                <label className="text-[10px] text-dim font-mono block mb-1">Launch Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({...form, type: 'link'})} className={`flex-1 py-1.5 text-xs font-mono uppercase rounded transition-colors border ${form.type === 'link' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-black/20 border-blue-900/30 text-dim hover:text-starlight'}`}>
                    New Tab
                  </button>
                  <button type="button" onClick={() => setForm({...form, type: 'embed'})} className={`flex-1 py-1.5 text-xs font-mono uppercase rounded transition-colors border ${form.type === 'embed' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-black/20 border-blue-900/30 text-dim hover:text-starlight'}`}>
                    In-App
                  </button>
                </div>
                <p className="text-[9px] text-dim/60 mt-1.5 leading-relaxed">
                  Most sites block in-app embedding. Only use In-App if you know the site permits iframes.
                </p>
              </div>

              <button type="submit" className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded font-display tracking-widest text-sm transition-colors mt-2">
                ADD TO ARCADE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {embedUrl && (
        <div className="fixed inset-0 z-[100] bg-void/95 backdrop-blur flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b border-blue-900/30 bg-black/40">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span className="font-display tracking-widest text-sm text-starlight">NOW PLAYING</span>
            </div>
            <button onClick={() => setEmbedUrl(null)} className="p-1 text-dim hover:text-starlight hover:bg-white/10 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 w-full bg-void">
            <iframe 
              src={embedUrl} 
              className="w-full h-full border-none"
              title="Mini Game"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
