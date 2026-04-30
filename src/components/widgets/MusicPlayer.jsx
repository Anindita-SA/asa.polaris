import { ChevronDown, ChevronUp, Music } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'polaris.music.collapsed'
const PLAYLIST_URL = 'https://www.youtube.com/embed/videoseries?list=OLAK5uy_nE_yXCZeQMMpkcszZD3v9oiY8DnuKmaAw'

const MusicPlayer = () => {
  const [collapsed, setCollapsed] = useState(true)
  const [autoplay, setAutoplay] = useState(false)

  useEffect(() => {
    const value = window.localStorage.getItem(STORAGE_KEY)
    setCollapsed(value !== 'expanded')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  const src = `${PLAYLIST_URL}&autoplay=${autoplay ? 1 : 0}`

  return (
    <div className="fixed left-4 bottom-4 z-[59] glass border border-blue-900/30 rounded-2xl w-[350px] overflow-hidden">
      <button onClick={() => setCollapsed(v => !v)} className="w-full px-3 py-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-starlight"><Music className="w-4 h-4 text-nova" /> Focus playlist</span>
        {collapsed ? <ChevronUp className="w-4 h-4 text-dim" /> : <ChevronDown className="w-4 h-4 text-dim" />}
      </button>
      {!collapsed && (
        <div className="space-y-2 px-3 pb-3">
          <label className="text-xs text-dim flex items-center gap-2">
            <input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} />
            autoplay
          </label>
          <iframe
            title="Polaris playlist"
            className="w-full h-52 rounded-lg border border-blue-900/20"
            src={src}
            allow="autoplay; encrypted-media"
          />
        </div>
      )}
    </div>
  )
}

export default MusicPlayer
