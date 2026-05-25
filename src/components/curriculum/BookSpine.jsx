const BookSpine = ({ curriculum, accentColor, onClick, isFlipping }) => {
  const totalTopics = curriculum._topicCount || 0
  const doneTopics = curriculum._doneCount || 0
  const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0

  return (
    <div
      className="book-spine relative flex-shrink-0"
      style={{
        width: 200,
        height: 300,
        perspective: '1000px',
      }}
      onClick={() => onClick(curriculum)}
    >
      {/* 3D book wrapper — this is what flips */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipping ? 'rotateY(-120deg) scale(0.9)' : 'rotateY(0deg)',
          transformOrigin: 'left center',
        }}
      >
        <div
          className="w-full h-full rounded-xl overflow-hidden relative group"
          style={{
            background: curriculum.cover_url
              ? `url(${curriculum.cover_url}) center/cover`
              : `linear-gradient(145deg, ${accentColor}18, ${accentColor}06, rgba(10,15,30,0.95), ${accentColor}08)`,
            border: `1px solid ${accentColor}25`,
            boxShadow: `inset -4px 0 12px rgba(0,0,0,0.5), 3px 6px 20px rgba(0,0,0,0.4)`,
          }}
        >
          {/* Spine accent strip */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[8px] rounded-l-xl"
            style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}60)` }}
          />

          {/* Vertical title on spine */}
          <div className="absolute left-[14px] top-4 bottom-16 flex items-center">
            <span
              className="font-display text-[14px] tracking-wider text-starlight/90 whitespace-nowrap"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                maxHeight: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {curriculum.title}
            </span>
          </div>

          {/* Hover overlay with title + description */}
          <div className="absolute inset-0 flex items-center justify-center p-5 bg-void/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm rounded-xl">
            <div className="text-center">
              <span className="font-display text-base text-starlight leading-snug block" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
                {curriculum.title}
              </span>
              {curriculum.description && (
                <span className="text-[11px] text-dim mt-2 block font-body line-clamp-3">{curriculum.description}</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/40 rounded-b-xl">
            <div className="h-full transition-all duration-500 rounded-bl-xl" style={{ width: `${pct}%`, background: accentColor }} />
          </div>

          {/* Pct badge */}
          {totalTopics > 0 && (
            <div className="absolute bottom-3 right-3 text-[11px] font-mono px-2 py-1 rounded-full"
              style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>
              {pct}%
            </div>
          )}

          {/* Hours badge */}
          {curriculum.estimated_hours && (
            <div className="absolute top-3 right-3 text-[10px] font-mono text-dim/60 px-2 py-0.5 rounded-full bg-void/50">
              {curriculum.estimated_hours}h
            </div>
          )}

          {/* Hover glow */}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ boxShadow: `0 0 30px ${accentColor}50, 0 12px 40px ${accentColor}25` }} />
        </div>
      </div>
    </div>
  )
}

export default BookSpine
