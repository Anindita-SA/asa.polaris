import { useState, useEffect } from 'react'
import { Sparkles, Dices, X } from 'lucide-react'
import { playChime } from '../../lib/sound'
import { motion, AnimatePresence } from 'framer-motion'

const SurpriseTaskModal = ({ isOpen, onClose, tasks, toggleComplete }) => {
  const [selectedTask, setSelectedTask] = useState(null)
  const [isRolling, setIsRolling] = useState(false)

  const pickRandom = () => {
    const incomplete = tasks.filter(t => !t.completed)
    if (incomplete.length === 0) {
      setSelectedTask(null)
      return
    }
    
    setIsRolling(true)
    playChime('neutral') // Or some rolling sound
    
    // Quick visual shuffling effect
    let rolls = 0
    const maxRolls = 10
    const interval = setInterval(() => {
      setSelectedTask(incomplete[Math.floor(Math.random() * incomplete.length)])
      rolls++
      if (rolls >= maxRolls) {
        clearInterval(interval)
        setIsRolling(false)
        playChime('success') // Found it!
      }
    }, 50)
  }

  useEffect(() => {
    if (isOpen) {
      pickRandom()
    } else {
      setSelectedTask(null)
    }
  }, [isOpen, tasks.length])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay fixed inset-0 bg-void/80 z-[100] flex items-center justify-center p-4" 
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="modal-content glass border border-amber-500/30 rounded-2xl p-8 w-full max-w-sm space-y-6 text-center relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-dim hover:text-starlight"><X className="w-5 h-5"/></button>
            
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <Dices className={`w-8 h-8 text-amber-400 ${isRolling ? 'animate-spin' : 'animate-pulse-glow'}`} />
            </div>

            {selectedTask ? (
              <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
                <p className="text-xs font-mono uppercase tracking-widest text-amber-500/70">
                  {selectedTask.__type === 'goal' ? 'Daily Goal' : 'Daily Task'}
                </p>
                <h3 className="text-xl font-display text-starlight leading-snug">
                  {selectedTask.title}
                </h3>
                {selectedTask.__type === 'goal' && selectedTask.target > 1 && (
                  <p className="text-sm text-dim">
                    Progress: {selectedTask.current} / {selectedTask.target} {selectedTask.unit !== 'done' ? selectedTask.unit : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
                <h3 className="text-xl font-display text-starlight">Nothing left!</h3>
                <p className="text-sm text-dim">You're done for today.</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {selectedTask && (
                <button 
                  onClick={handleComplete}
                  disabled={isRolling}
                  className="w-full py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors font-display tracking-wider disabled:opacity-50"
                >
                  LET'S GO (MARK DONE)
                </button>
              )}
              <button 
                onClick={selectedTask ? pickRandom : onClose}
                disabled={isRolling}
                className="w-full py-3 bg-white/5 text-starlight border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-body disabled:opacity-50"
              >
                {selectedTask ? 'PICK ANOTHER' : 'CLOSE'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SurpriseTaskModal
