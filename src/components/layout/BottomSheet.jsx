import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setMounted(false), 300)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted && !isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[59] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[60] max-h-[85vh] flex flex-col bg-[#0a0f1e] border-t border-pulsar/40 rounded-t-2xl md:hidden transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex-shrink-0 pt-3 pb-2 flex flex-col items-center cursor-pointer select-none" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-white/20 mb-2 mx-auto" />
          {title && <h3 className="text-starlight font-display text-lg px-4 text-center">{title}</h3>}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
