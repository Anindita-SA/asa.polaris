import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ChevronLeft, ChevronRight, Edit2, History } from 'lucide-react'

const DEFAULT_EULOGY = `Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education -- not academic learning in general -- and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff.`

const AnchorPanel = ({ collapsed, onToggle }) => {
  const { user, profile, updateProfile } = useAuth()
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [editingEulogy, setEditingEulogy] = useState(false)
  const [editingMission, setEditingMission] = useState(false)
  const [editingChapter, setEditingChapter] = useState(false)
  const [eulogyText, setEulogyText] = useState('')
  const [versionLabel, setVersionLabel] = useState('')

  const fetchEulogies = async () => {
    const { data } = await supabase
      .from('eulogies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
    setLatest(data?.[0] || null)
  }

  useEffect(() => {
    fetchEulogies()
  }, [])

  const saveEulogy = async () => {
    if (!eulogyText.trim()) return
    await supabase.from('eulogies').insert({
      user_id: user.id,
      content: eulogyText.trim(),
      version_label: versionLabel || `Updated ${new Date().toLocaleDateString('en-GB')}`,
      written_date: new Date().toISOString().slice(0, 10),
    })
    setEditingEulogy(false)
    setVersionLabel('')
    fetchEulogies()
  }

  if (collapsed) {
    return (
      <button onClick={onToggle} className="absolute left-2 top-3 z-30 glass border border-blue-900/30 rounded-full w-9 h-9 flex items-center justify-center text-dim hover:text-starlight">
        <ChevronRight className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 z-30 w-96 glass border-r border-blue-900/20 overflow-y-auto">
      <div className="p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-starlight">Anchor</h3>
          <button onClick={onToggle} className="text-dim hover:text-starlight"><ChevronLeft className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-dim">Eulogy</p>
          <div className="glass border border-blue-900/20 rounded-xl p-3">
            <p className="text-xs text-starlight/90 whitespace-pre-wrap font-body">{latest?.content || DEFAULT_EULOGY}</p>
            <button onClick={() => { setEulogyText(latest?.content || DEFAULT_EULOGY); setEditingEulogy(true) }} className="mt-2 text-xs text-nova flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> New version
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-dim">Mission statement</p>
          {editingMission ? (
            <textarea rows={3} className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none"
              defaultValue={profile?.clarity_anchor || 'You hold the steering wheel. Polaris is your GPS.'}
              onBlur={async e => { await updateProfile({ clarity_anchor: e.target.value }); setEditingMission(false) }} />
          ) : (
            <button onClick={() => setEditingMission(true)} className="w-full text-left glass border border-blue-900/20 rounded-xl p-3 text-sm text-starlight/90">
              {profile?.clarity_anchor || 'You hold the steering wheel. Polaris is your GPS.'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-dim">North star</p>
          {editingChapter ? (
            <input className="w-full bg-stardust/50 text-sm text-aurora border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
              defaultValue={profile?.current_chapter || 'Chapter I: The Foundation'}
              onBlur={async e => { await updateProfile({ current_chapter: e.target.value }); setEditingChapter(false) }} />
          ) : (
            <button onClick={() => setEditingChapter(true)} className="w-full text-left glass border border-blue-900/20 rounded-xl p-3 text-sm text-aurora/90">
              {profile?.current_chapter || 'Chapter I: The Foundation'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-dim flex items-center gap-1"><History className="w-3 h-3" /> Eulogy history</p>
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="glass border border-blue-900/20 rounded-lg p-2">
                <p className="text-xs text-nova">{item.version_label || 'Version'}</p>
                <p className="text-xs text-dim">{item.written_date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingEulogy && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setEditingEulogy(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-5 w-full max-w-2xl space-y-3">
            <h3 className="font-display text-starlight">Save new eulogy version</h3>
            <input className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none" placeholder="Version label"
              value={versionLabel} onChange={e => setVersionLabel(e.target.value)} />
            <textarea rows={10} className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none"
              value={eulogyText} onChange={e => setEulogyText(e.target.value)} />
            <button onClick={saveEulogy} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar text-sm font-display rounded-lg">
              SAVE NEW VERSION
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnchorPanel
