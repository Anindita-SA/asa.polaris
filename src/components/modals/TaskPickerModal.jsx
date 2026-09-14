import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Clock, Play, Target } from 'lucide-react'

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'urgent_important', label: 'Q1', fullName: 'Urgent & Important' },
  { id: 'important_not_urgent', label: 'Q2', fullName: 'Important, Not Urgent' },
  { id: 'urgent_not_important', label: 'Q3', fullName: 'Urgent, Not Important' },
  { id: 'neither', label: 'Q4', fullName: 'Neither' },
  { id: 'backlog', label: 'Backlog', fullName: 'Backlog & Inbox' }
]

const QUADRANT_BADGES = {
  urgent_important: { label: 'Q1', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
  important_not_urgent: { label: 'Q2', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' },
  urgent_not_important: { label: 'Q3', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' },
  neither: { label: 'Q4', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
  backlog: { label: 'Backlog', color: 'text-nova/70 bg-void/60 border-pulsar/40' }
}

const TaskPickerModal = ({ isOpen, onClose, tasks = [], onSelectTask }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'done') return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const titleMatch = (t.title || '').toLowerCase().includes(query)
        const notesMatch = (t.notes || '').toLowerCase().includes(query)
        if (!titleMatch && !notesMatch) return false
      }

      if (selectedFilter === 'all') return true
      if (selectedFilter === 'backlog') {
        return !t.quadrant || t.status === 'inbox'
      }
      return t.quadrant === selectedFilter
    })
  }, [tasks, searchQuery, selectedFilter])

  const handlePickTask = (task) => {
    if (onSelectTask) {
      onSelectTask(task)
    }
    if (onClose) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="task-picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay fixed inset-0 bg-void/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="modal-content glass border border-amber-500/30 rounded-2xl p-5 md:p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-pulsar/30 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-display text-starlight leading-tight">
                  Choose Focus Task
                </h3>
                <p className="text-xs font-mono text-nova/60">
                  Select a priority task to launch into deep work
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-nova/60 hover:text-starlight p-1.5 rounded-lg hover:bg-pulsar/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-nova/50 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active tasks..."
              className="w-full bg-void/70 border border-pulsar/40 focus:border-amber-500/60 text-starlight text-xs rounded-xl pl-9 pr-8 py-2 outline-none font-body transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-nova/50 hover:text-starlight"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quadrant Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0 pb-1">
            {FILTER_CHIPS.map((chip) => {
              const isSelected = selectedFilter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedFilter(chip.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 font-bold'
                      : 'bg-void/50 text-nova/60 hover:text-starlight hover:bg-pulsar/20 border border-pulsar/20'
                  }`}
                  title={chip.fullName || chip.label}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-1 min-h-[160px]">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/20 rounded-xl">
                No matching tasks found.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const badgeInfo = task.quadrant ? (QUADRANT_BADGES[task.quadrant] || QUADRANT_BADGES.backlog) : QUADRANT_BADGES.backlog
                const estMinutes = task.time_estimate_minutes || task.estimated_minutes || 30

                return (
                  <div
                    key={task.id}
                    onClick={() => handlePickTask(task)}
                    className="p-3 rounded-xl bg-void/60 border border-pulsar/30 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold shrink-0 ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </span>
                        <h4 className="text-xs font-body text-starlight truncate group-hover:text-amber-300 transition-colors">
                          {task.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-nova/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald" /> {estMinutes}m
                        </span>
                        {task.mental_load && (
                          <>
                            <span>•</span>
                            <span className="uppercase text-pulsar/80">{task.mental_load} load</span>
                          </>
                        )}
                        {task.deadline && (
                          <>
                            <span>•</span>
                            <span>Due {task.deadline}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePickTask(task)
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-[#0c0f14] border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      title="Start Focus"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Focus</span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TaskPickerModal
