import { ChevronDown, ChevronUp, Music } from 'lucide-react'
import { useEffect, useState, useRef, useCallback } from 'react'

const STORAGE_KEY = 'polaris.music.collapsed'
const POS_KEY = 'polaris.music.pos'
const PLAYLIST_URL = 'https://www.youtube.com/embed/videoseries?list=OLAK5uy_nE_yXCZeQMMpkcszZD3v9oiY8DnuKmaAw'

const MusicPlayer = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'expanded' } catch { return true }
  })
  const [autoplay, setAutoplay] = useState(false)
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(POS_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return { x: 16, y: window.innerHeight - 80 }
  })

  const clickOrigin = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos))
  }, [pos])

  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('iframe')) return
    clickOrigin.current = { x: e.clientX, y: e.clientY }
    isDragging.current = false
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = useCallback((e) => {
    if (!clickOrigin.current) return
    if (!isDragging.current) {
      const dx = Math.abs(e.clientX - clickOrigin.current.x)
      const dy = Math.abs(e.clientY - clickOrigin.current.y)
      if (dx > 3 || dy > 3) isDragging.current = true
      else return
    }
    
    let newX = e.clientX - dragOffset.current.x
    let newY = e.clientY - dragOffset.current.y
    const snap = 35
    const height = collapsed ? 56 : 280
    if (newX < snap) newX = 0
    if (newY < snap) newY = 0
    if (window.innerWidth - (newX + 350) < snap) newX = window.innerWidth - 350
    if (window.innerHeight - (newY + height) < snap) newY = window.innerHeight - height

    setPos({ x: newX, y: newY })
  }, [collapsed])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    clickOrigin.current = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  const src = `${PLAYLIST_URL}&autoplay=${autoplay ? 1 : 0}`

  return (
    <div className="fixed z-[59] glass border border-blue-900/30 rounded-2xl w-[350px] overflow-hidden group select-none shadow-xl"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}>
      <div className="w-full px-3 py-2 flex items-center justify-between text-sm cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-2 text-starlight"><Music className="w-4 h-4 text-nova" /> Focus playlist</span>
        <button onClick={() => setCollapsed(v => !v)} className="p-1 hover:bg-blue-900/30 rounded transition-colors">
          {collapsed ? <ChevronUp className="w-4 h-4 text-dim" /> : <ChevronDown className="w-4 h-4 text-dim" />}
        </button>
      </div>
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
