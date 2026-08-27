import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      setTimeout(() => setMounted(false), 300)
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted && !isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[59] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[60] max-h-[80vh] flex flex-col bg-[#0a0f1e] border-t border-white/10 rounded-t-2xl md:hidden transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex-shrink-0 pt-3 pb-2 flex flex-col items-center cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
          {title && <h3 className="text-starlight font-display text-sm ">{title}</h3>}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
