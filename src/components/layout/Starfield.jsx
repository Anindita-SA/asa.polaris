import { useMemo } from 'react'

const Starfield = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 180 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.2 + 0.4,
      dur: (Math.random() * 4 + 2).toFixed(1),
      delay: (Math.random() * 4).toFixed(1),
      maxOpacity: (Math.random() * 0.5 + 0.3).toFixed(2),
    }))
  }, [])

  const nebulae = useMemo(() => [
    { x: 15, y: 20, size: 400, color: '#3b82f6' },
    { x: 75, y: 15, size: 350, color: '#8b5cf6' },
    { x: 50, y: 70, size: 500, color: '#1e40af' },
    { x: 85, y: 65, size: 300, color: '#5b21b6' },
    { x: 10, y: 75, size: 280, color: '#1d4ed8' },
  ], [])

  return (
    <div className="starfield" style={{
      background: 'linear-gradient(45deg, #0b101e, #0a0a14, #0b101e, #130b1e)',
      backgroundSize: '400% 400%',
      animation: 'gradientBg 30s ease infinite'
    }}>
      <style>{`
        @keyframes gradientBg {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>
      {nebulae.map((n, i) => (
        <div
          key={i}
          className="nebula-blob"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: n.size,
            height: n.size,
            background: n.color,
            transform: 'translate(-50%, -50%)',
            animationDelay: `${i * 3}s`,
            animationDuration: `${18 + i * 4}s`,
          }}
        />
      ))}
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
            '--max-opacity': s.maxOpacity,
          }}
        />
      ))}
    </div>
  )
}

export default Starfield
