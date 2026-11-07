import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Helper to determine quadrant badge based on task quadrant and group label.
 * Strictly no em dashes.
 */
const getQuadrantBadge = (task, groupLabel = '') => {
  const quad = task.quadrant
  if (quad === 'urgent_important' || groupLabel.includes('Q1')) {
    return { label: 'Q1', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' }
  }
  if (quad === 'important_not_urgent' || groupLabel.includes('Q2')) {
    return { label: 'Q2', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' }
  }
  if (quad === 'urgent_not_important' || groupLabel.includes('Q3')) {
    return { label: 'Q3', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' }
  }
  if (quad === 'neither' || groupLabel.includes('Q4')) {
    return { label: 'Q4', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' }
  }
  if (groupLabel.includes('Today') || task.is_curated) {
    return { label: 'Today', color: 'text-amber-300 bg-amber-400/20 border-amber-400/40' }
  }
  return null
}

export default function TimerTaskSearch({
  taskGroups = [],
  selectedTaskId = '',
  onSelectTask,
  onSetCustomTopic,
  placeholder = '🎯 Select Task to Focus On...',
  className = '',
  isExpanded = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Flatten all tasks with their respective group label
  const allTasks = useMemo(() => {
    const list = []
    taskGroups.forEach(group => {
      ;(group.tasks || []).forEach(task => {
        list.push({ ...task, _groupLabel: group.label })
      })
    })
    return list
  }, [taskGroups])

  // Current selected task
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null
    return allTasks.find(t => t.id === selectedTaskId) || null
  }, [allTasks, selectedTaskId])

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allTasks
    return allTasks.filter(t => {
      const titleMatch = (t.title || '').toLowerCase().includes(q)
      const notesMatch = (t.notes || '').toLowerCase().includes(q)
      return titleMatch || notesMatch
    })
  }, [allTasks, searchQuery])

  // Visible items when navigating with keyboard
  const isQueryMode = searchQuery.trim().length > 0
  const flatVisibleTasks = isQueryMode ? filteredTasks : allTasks

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setIsFocused(false)
        setSearchQuery('')
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Scroll active item into view when navigating via keyboard
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current && flatVisibleTasks[activeIndex]) {
      const activeEl = listRef.current.querySelector(
        `#task-option-${flatVisibleTasks[activeIndex].id}`
      )
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex, flatVisibleTasks])

  // Handle task selection
  const handleSelect = (taskId) => {
    if (onSelectTask) {
      onSelectTask(taskId)
    }
    setSearchQuery('')
    setIsOpen(false)
    setIsFocused(false)
    setActiveIndex(-1)
  }

  // Handle custom topic fallback
  const handleCustomTopic = (topic) => {
    if (onSetCustomTopic) {
      onSetCustomTopic(topic)
    }
    if (selectedTaskId && onSelectTask) {
      onSelectTask('')
    }
    setSearchQuery('')
    setIsOpen(false)
    setIsFocused(false)
    setActiveIndex(-1)
  }

  // Input change handler supporting backward compatibility with task ID selection
  const handleChange = (e) => {
    const val = e.target.value

    if (!val) {
      setSearchQuery('')
      if (selectedTaskId && onSelectTask) {
        onSelectTask('')
      }
      return
    }

    // Backward compatibility: If an onChange event or input change has a value matching a task ID in taskGroups, immediately call onSelectTask(taskId)
    const matchingTaskById = allTasks.find(t => t.id === val)
    if (matchingTaskById) {
      if (onSelectTask) {
        onSelectTask(matchingTaskById.id)
      }
      setSearchQuery('')
      setIsOpen(false)
      setIsFocused(false)
      return
    }

    setSearchQuery(val)
    if (!isOpen) setIsOpen(true)
    setActiveIndex(-1)
  }

  // Clear button click
  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSearchQuery('')
    if (selectedTaskId && onSelectTask) {
      onSelectTask('')
    }
    setActiveIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Chevron toggle
  const handleToggleOpen = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(prev => {
      const next = !prev
      if (next) {
        setIsFocused(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        setIsFocused(false)
        setSearchQuery('')
      }
      return next
    })
  }

  // Focus handler
  const handleFocus = () => {
    setIsFocused(true)
    setIsOpen(true)
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const maxItems = flatVisibleTasks.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(0)
        return
      }
      if (maxItems > 0) {
        setActiveIndex(prev => (prev < maxItems - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(maxItems - 1)
        return
      }
      if (maxItems > 0) {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : maxItems - 1))
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault()
        if (maxItems > 0 && activeIndex >= 0 && activeIndex < maxItems) {
          handleSelect(flatVisibleTasks[activeIndex].id)
        } else if (maxItems === 1 && activeIndex === -1) {
          handleSelect(flatVisibleTasks[0].id)
        } else if (maxItems === 0 && searchQuery.trim() && onSetCustomTopic) {
          handleCustomTopic(searchQuery.trim())
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setIsFocused(false)
      setSearchQuery('')
      setActiveIndex(-1)
      inputRef.current?.blur()
    } else if (e.key === 'Tab') {
      setIsOpen(false)
      setIsFocused(false)
      setSearchQuery('')
      setActiveIndex(-1)
    }
  }

  // Input value and placeholder calculation
  const hasValue = Boolean(searchQuery || selectedTaskId)
  const displayValue = isFocused ? searchQuery : (selectedTask ? selectedTask.title : searchQuery)
  const displayPlaceholder = selectedTask ? selectedTask.title : placeholder

  // Render individual task button
  const renderTaskButton = (task, groupLabel, flatIndex) => {
    const isSelected = task.id === selectedTaskId
    const isActive = flatIndex === activeIndex
    const isCompleted = task.completed || task.status === 'done'
    const badge = getQuadrantBadge(task, groupLabel)

    return (
      <button
        key={task.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        data-active={isActive}
        id={`task-option-${task.id}`}
        onClick={() => handleSelect(task.id)}
        onMouseEnter={() => setActiveIndex(flatIndex)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors font-body ${
          isSelected
            ? 'bg-amber-400/20 text-amber-300 font-semibold'
            : isActive
            ? 'bg-stardust/40 text-starlight'
            : 'text-starlight/90 hover:bg-stardust/30'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isCompleted && (
            <span className="text-emerald-400 font-bold shrink-0 text-xs">✓</span>
          )}
          <span className="truncate flex-1">{task.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {task.estimated_minutes ? (
            <span className="text-[10px] font-mono text-nova/60">
              {task.estimated_minutes}m
            </span>
          ) : null}
          {badge && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.color} shrink-0`}
            >
              {badge.label}
            </span>
          )}
        </div>
      </button>
    )
  }

  // Counter to calculate flat index across groups when in grouped mode
  let runningGroupIndex = 0

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Trigger */}
      <div
        className={`w-full flex items-center gap-1.5 transition-colors ${
          isExpanded
            ? 'bg-stardust/80 border border-amber-400/40 rounded-xl px-3 py-2 shadow-lg'
            : 'bg-stardust/60 border border-pulsar/40 focus-within:border-amber-400/60 rounded-lg px-2.5 py-1.5'
        } ${isOpen ? 'border-amber-400/60 ring-1 ring-amber-400/20' : ''}`}
      >
        <Search className={`${isExpanded ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-nova/60 shrink-0`} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="timer-task-dropdown"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={displayPlaceholder}
          className="flex-1 bg-transparent text-xs text-starlight placeholder:text-nova/50 outline-none font-body min-w-0 truncate"
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear task selection"
            className="text-nova/50 hover:text-starlight transition-colors p-0.5 rounded shrink-0"
          >
            <X className={`${isExpanded ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleOpen}
          aria-label={isOpen ? 'Close task selector' : 'Open task selector'}
          className="text-nova/50 hover:text-starlight transition-colors p-0.5 rounded shrink-0"
        >
          {isOpen ? (
            <ChevronUp className={`${isExpanded ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
          ) : (
            <ChevronDown className={`${isExpanded ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
          )}
        </button>
      </div>

      {/* Dropdown Popover List */}
      {isOpen && (
        <div
          ref={listRef}
          id="timer-task-dropdown"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0a0f1d] border border-amber-400/40 rounded-xl shadow-2xl backdrop-blur-md max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-400/20"
        >
          {isQueryMode ? (
            /* Filtered Search Results */
            filteredTasks.length > 0 ? (
              <div className="py-1">
                {filteredTasks.map((task, idx) =>
                  renderTaskButton(task, task._groupLabel, idx)
                )}
              </div>
            ) : (
              /* No Matches State */
              <div className="p-3 text-center text-xs text-nova/70">
                <p className="mb-2">No tasks found matching &quot;{searchQuery}&quot;</p>
                {onSetCustomTopic && (
                  <button
                    type="button"
                    onClick={() => handleCustomTopic(searchQuery.trim())}
                    className="w-full py-1.5 px-2 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>🎯 Use &apos;{searchQuery}&apos; as focus topic</span>
                  </button>
                )}
              </div>
            )
          ) : (
            /* Grouped Tasks View */
            taskGroups.length > 0 ? (
              <div className="py-1">
                {taskGroups.map(group => {
                  if (!group.tasks || group.tasks.length === 0) return null
                  return (
                    <div key={group.label} className="border-b border-pulsar/10 last:border-b-0">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80 bg-[#0a0f1d] border-b border-pulsar/20 sticky top-0 z-10">
                        {group.label}
                      </div>
                      <div>
                        {group.tasks.map(task => {
                          const itemIndex = runningGroupIndex++
                          return renderTaskButton(task, group.label, itemIndex)
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-nova/60">
                No tasks available
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
