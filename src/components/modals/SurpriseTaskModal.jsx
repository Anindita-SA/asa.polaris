import { useState, useEffect } from 'react'
import { Sparkles, Dices, X } from 'lucide-react'
import { playChime } from '../../lib/sound'
import { motion, AnimatePresence } from 'framer-motion'

const SurpriseTaskModal = ({ isOpen, onClose, tasks = [], toggleComplete }) => {
  const [selectedTask, setSelectedTask] = useState(null)
  const [isRolling, setIsRolling] = useState(false)

  const pickRandom = () => {
    const incomplete = tasks.filter(t => !t.completed && t.status !== 'done')
    if (incomplete.length === 0) {
      setSelectedTask(null)
      return
    }
    
    setIsRolling(true)
    try {
      playChime('neutral')
    } catch (e) {
      // Audio fallback
    }
    
    let rolls = 0
    const maxRolls = 8
    const interval = setInterval(() => {
      setSelectedTask(incomplete[Math.floor(Math.random() * incomplete.length)])
      rolls++
      if (rolls >= maxRolls) {
        clearInterval(interval)
        setIsRolling(false)
        try {
          playChime('success')
        } catch (e) {}
      }
    }, 60)
  }

  useEffect(() => {
    if (isOpen) {
      pickRandom()
    } else {
      setSelectedTask(null)
    }
  }, [isOpen, tasks.length])

  const handleComplete = () => {
    if (selectedTask && toggleComplete) {
      toggleComplete(selectedTask.id || selectedTask);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay fixed inset-0 bg-void/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md" 
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="modal-content glass border border-amber-500/30 rounded-2xl p-8 w-full max-w-sm space-y-6 text-center relative shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-dim hover:text-starlight">
              <X className="w-5 h-5"/>
            </button>
            
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Dices className={`w-8 h-8 text-amber-400 ${isRolling ? 'animate-spin' : ''}`} />
            </div>

            {selectedTask ? (
              <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
                <p className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  AI & WSJF Picked Task
                </p>
                <h3 className="text-xl font-display text-starlight leading-snug">
                  {selectedTask.title}
                </h3>
                {selectedTask.estimated_minutes && (
                  <p className="text-xs font-mono text-dim">
                    Estimated Time: {selectedTask.estimated_minutes}m
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
                <h3 className="text-xl font-display text-starlight">No active tasks in queue</h3>
                <p className="text-sm text-dim italic">Add new tasks in Brain Dump or run AI Auditor!</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {selectedTask && (
                <button 
                  onClick={handleComplete}
                  disabled={isRolling}
                  className="w-full py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors font-display tracking-wider disabled:opacity-50 font-bold"
                >
                  LET'S GO (MARK DONE)
                </button>
              )}
              <button 
                onClick={selectedTask ? pickRandom : onClose}
                disabled={isRolling}
                className="w-full py-2.5 bg-white/5 text-starlight border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-body disabled:opacity-50"
              >
                {selectedTask ? 'SHUFFLE AGAIN' : 'CLOSE'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SurpriseTaskModal
