import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineApi';
import { generateLlmResponse } from '../lib/llm';

function estimateDurationHeuristic(title) {
  const t = (title || '').toLowerCase();
  const minMatch = t.match(/(\d+)\s*(?:m|min|mins|minutes)\b/);
  const hrMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)\b/);

  let explicitMinutes = null;
  if (minMatch) {
    explicitMinutes = Math.min(240, Math.max(5, parseInt(minMatch[1], 10)));
  } else if (hrMatch) {
    explicitMinutes = Math.min(240, Math.max(5, Math.round(parseFloat(hrMatch[1]) * 60)));
  }

  // High Load (45-60m)
  if (/(code|write|build|design|derive|simulate|implement|architect|pcb|hardware|math|proof|sop)\b/i.test(t)) {
    return {
      minutes: explicitMinutes || 45,
      mentalLoad: 'high',
      taskType: 'output'
    };
  }

  // Medium Load (30-40m)
  if (/(draft|outline|email|reach out|fill|plan|submit|apply|test|debug|solve|practice|prep)\b/i.test(t)) {
    return {
      minutes: explicitMinutes || 30,
      mentalLoad: 'medium',
      taskType: 'output'
    };
  }

  // Low Load (20-25m)
  if (/(read|research|survey|review|explore|watch|listen|skim|browse|check|organize|tag|clean|request)\b/i.test(t)) {
    return {
      minutes: explicitMinutes || 20,
      mentalLoad: 'low',
      taskType: /(read|research|survey|explore|watch|listen|skim|browse)/i.test(t) ? 'input' : 'output'
    };
  }

  return {
    minutes: explicitMinutes || 30,
    mentalLoad: 'medium',
    taskType: 'output'
  };
}
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  GripVertical, 
  Edit3, 
  X, 
  Inbox,
  Flame,
  Target,
  Zap,
  Archive,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Quadrant Configuration
const QUADRANTS = [
  {
    id: 'urgent_important',
    title: 'Urgent & Important',
    shortLabel: 'Do First',
    subtitle: 'High impact, pressing deadlines',
    accentColor: '#d9634f', // Red/Danger
    badgeBg: 'rgba(217, 99, 79, 0.15)',
    borderColor: 'rgba(217, 99, 79, 0.3)',
    icon: Flame,
  },
  {
    id: 'important_not_urgent',
    title: 'Important, Not Urgent',
    shortLabel: 'Schedule',
    subtitle: 'Strategic growth & long-term goals',
    accentColor: '#3ea8a0', // Teal
    badgeBg: 'rgba(62, 168, 160, 0.15)',
    borderColor: 'rgba(62, 168, 160, 0.3)',
    icon: Target,
  },
  {
    id: 'urgent_not_important',
    title: 'Urgent, Not Important',
    shortLabel: 'Delegate / Quick',
    subtitle: 'Interruptions & quick operational tasks',
    accentColor: '#6c6fa0', // Violet
    badgeBg: 'rgba(108, 111, 160, 0.15)',
    borderColor: 'rgba(108, 111, 160, 0.3)',
    icon: Zap,
  },
  {
    id: 'neither',
    title: 'Neither Urgent nor Important',
    shortLabel: 'Eliminate / Backburner',
    subtitle: 'Low priority distractions',
    accentColor: '#8a91a3', // Muted Slate
    badgeBg: 'rgba(138, 145, 163, 0.15)',
    borderColor: 'rgba(138, 145, 163, 0.3)',
    icon: Archive,
  },
];

// Helper: Check if task needs reassessment flag
function checkReassess(task) {
  if (task.status === 'done') return false;

  const now = new Date();
  const createdAt = new Date(task.created_at || now);
  const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // (a) status='inbox' and created > 24hrs ago
  if (task.status === 'inbox' && hoursOld > 24) {
    return true;
  }

  // (b) deadline is within 3 days AND (quadrant IS NULL OR task is stale in quadrant)
  if (task.deadline) {
    const deadlineDate = new Date(task.deadline);
    const daysUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= -1 && daysUntil <= 3) {
      if (!task.quadrant || hoursOld > 48) {
        return true;
      }
    }
  }

  return false;
}

export default function TaskMatrix() {
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [activeDragOver, setActiveDragOver] = useState(null); // 'bucket' | quadrantId
  const [estimatingId, setEstimatingId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null); // Task object for edit modal
  const [filterDone, setFilterDone] = useState(false);
  const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'planning'

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await offlineSelect('tasks', { user_id: userId });
      if (data) data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Zero-friction TASK VOMIT capture
  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title || isSubmitting || !userId) return;

    setIsSubmitting(true);
    try {
      const newTask = {
        title,
        status: 'inbox',
        quadrant: null,
        user_id: userId
      };
      newTask.id = crypto.randomUUID();
      newTask.created_at = new Date().toISOString();

      const { error } = await offlineInsert('tasks', newTask);

      if (error) throw error;

      setTasks((prev) => [newTask, ...prev]);
      setNewTitle('');
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move task to a quadrant (or back to TASK VOMIT if targetQuadrant === null)
  const moveTaskQuadrant = async (taskId, targetQuadrant) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, quadrant: targetQuadrant } : t))
    );

    try {
      const { error } = await offlineUpdate('tasks', { id: taskId }, { quadrant: targetQuadrant });

      if (error) {
        console.error('Error updating quadrant:', error);
        fetchTasks(); // Revert on failure
      }
    } catch (err) {
      console.error('Error updating quadrant:', err);
      fetchTasks();
    }
  };

  // Toggle task completed status
  const toggleTaskDone = async (task) => {
    const isSubtask = !!task.parent_task_id;
    const isCompleting = task.status !== 'done';
    const newStatus = isCompleting ? 'done' : (isSubtask ? 'active' : 'inbox');

    let shouldUpdateParent = false;
    let parentNewStatus = null;
    let childIdsToComplete = [];

    if (isSubtask) {
      if (isCompleting) {
        const siblingSubtasks = tasks.filter(t => t.parent_task_id === task.parent_task_id && t.id !== task.id);
        const allSiblingsDone = siblingSubtasks.every(t => t.status === 'done');
        if (allSiblingsDone) {
          shouldUpdateParent = true;
          parentNewStatus = 'done';
        }
      } else {
        const parentTask = tasks.find(t => t.id === task.parent_task_id);
        if (parentTask && parentTask.status === 'done') {
          shouldUpdateParent = true;
          parentNewStatus = 'active';
        }
      }
    } else {
      if (isCompleting) {
        const childSubtasks = tasks.filter(t => t.parent_task_id === task.id);
        childIdsToComplete = childSubtasks.map(c => c.id);
      }
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === task.id) {
          return { ...t, status: newStatus };
        }
        if (shouldUpdateParent && t.id === task.parent_task_id) {
          return { ...t, status: parentNewStatus };
        }
        if (childIdsToComplete.includes(t.id)) {
          return { ...t, status: 'done' };
        }
        return t;
      })
    );

    try {
      const { error } = await offlineUpdate('tasks', { id: task.id }, { status: newStatus });
      if (error) throw error;

      if (shouldUpdateParent && task.parent_task_id && parentNewStatus) {
        const { error: parentErr } = await offlineUpdate('tasks', { id: task.parent_task_id }, { status: parentNewStatus });
        if (parentErr) console.error('Error updating parent task status:', parentErr);
      }

      if (childIdsToComplete.length > 0) {
        for (const childId of childIdsToComplete) {
          const { error: childErr } = await offlineUpdate('tasks', { id: childId }, { status: 'done' });
          if (childErr) console.error('Error updating child subtask status:', childErr);
        }
      }
    } catch (err) {
      console.error('Error toggling done status:', err);
      fetchTasks();
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      const { error } = await offlineDelete('tasks', { id: taskId });
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  // Update task details from modal
  const saveTaskEdit = async (updatedFields) => {
    if (!editingTask) return;
    const taskId = editingTask.id;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updatedFields } : t))
    );
    setEditingTask(null);

    try {
      const { error } = await offlineUpdate('tasks', { id: taskId }, updatedFields);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating task:', err);
      fetchTasks();
    }
  };

  // AI Duration Estimate Call
  const estimateTimeWithAI = async (task) => {
    setEstimatingId(task.id);
    try {
      const prompt = `You are a pragmatic, realistic time-management coach. Estimate the duration in minutes and mental load ("low", "medium", "high") for the following task. You MUST account for context-switching, setup, and transition overhead (not just raw focused execution time).

Task Title: ${JSON.stringify(task.title || '')}
Task Notes: ${JSON.stringify(task.notes || 'None')}

Return ONLY a single valid JSON object in this exact format: {"minutes": 45, "mental_load": "medium"}. Do not add any commentary or markdown around it.`;

      let mins = null;
      let mentalLoad = null;
      let estimateSource = 'ai';
      try {
        const data = await generateLlmResponse([{ role: 'user', content: prompt }], true);
        const raw = data?.choices?.[0]?.message?.content || '{}';
        let parsed = {};
        try {
          parsed = JSON.parse(raw);
        } catch (pErr) {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }
        if (parsed && typeof parsed.minutes === 'number') {
          mins = Math.max(5, Math.round(parsed.minutes));
        } else {
          const numMatch = raw.match(/\d+/);
          if (numMatch) mins = Math.max(5, parseInt(numMatch[0], 10));
        }
        if (['low', 'medium', 'high'].includes(parsed?.mental_load)) {
          mentalLoad = parsed.mental_load;
        }
      } catch (llmErr) {
        console.error('LLM estimation error, falling back to heuristic:', llmErr);
      }

      if (!mins) {
        const heuristic = estimateDurationHeuristic(task.title);
        mins = heuristic.minutes;
        mentalLoad = heuristic.mentalLoad;
        estimateSource = 'heuristic';
      }

      // Save to Supabase
      const updatePayload = {
        estimated_minutes: mins,
        time_estimate_minutes: mins,
        mental_load: mentalLoad || 'medium',
        estimate_source: estimateSource
      };
      const { error } = await offlineUpdate('tasks', { id: task.id }, updatePayload);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, ...updatePayload }
            : t
        )
      );
    } catch (err) {
      console.error('AI Estimation Error:', err);
    } finally {
      setEstimatingId(null);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDragOver !== targetId) {
      setActiveDragOver(targetId);
    }
  };

  const handleDragLeave = (e, targetId) => {
    if (activeDragOver === targetId) {
      setActiveDragOver(null);
    }
  };

  const handleDrop = (e, targetQuadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDragOver(null);
    setDraggedTaskId(null);

    if (taskId) {
      moveTaskQuadrant(taskId, targetQuadrant);
    }
  };

  // Process tasks based on viewMode (Focus vs Planning)
  const processTasksForView = (qId, isUnsorted = false) => {
    const rootTasks = tasks.filter((t) => !t.parent_task_id && (isUnsorted ? t.quadrant === null : t.quadrant === qId) && (filterDone || t.status !== 'done'));
    
    if (viewMode === 'planning') {
      return rootTasks.map(root => {
        const subtasks = tasks.filter(t => t.parent_task_id === root.id).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        return { ...root, _subtasks: subtasks };
      });
    } else {
      // Focus mode (Sequential Focus)
      return rootTasks.map(root => {
        const activeSubtasks = tasks.filter(t => t.parent_task_id === root.id && t.status !== 'done').sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        if (activeSubtasks.length > 0) {
          // Replace parent with the next actionable subtask, injecting parent title for context
          return { ...activeSubtasks[0], _parentTitle: root.title, quadrant: activeSubtasks[0].quadrant || root.quadrant };
        }
        return root;
      });
    }
  };

  const unsortedTasks = processTasksForView(null, true);
  const getQuadrantTasks = (qId) => processTasksForView(qId, false);

  return (
    <div className="w-full min-h-screen bg-[#0c0f14] text-[#e8e6df] font-['Space_Grotesk',sans-serif] p-4 sm:p-6 md:p-8 selection:bg-[#f5a623] selection:text-black">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#2a3142] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#f5a623] animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Polaris <span className="text-[#f5a623]">/</span> TASK VOMIT & Matrix
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8a91a3] mt-1">
            Capture frictionlessly into the TASK VOMIT, then drag tasks into your Eisenhower priorities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setViewMode(prev => prev === 'focus' ? 'planning' : 'focus')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
              viewMode === 'focus'
                ? 'bg-[#f5a623]/20 border-[#f5a623] text-[#f5a623]'
                : 'bg-[#3ea8a0]/20 border-[#3ea8a0] text-[#3ea8a0]'
            }`}
          >
            {viewMode === 'focus' ? 'Sequential Focus' : 'Planning View'}
          </button>
          <button
            onClick={() => setFilterDone(!filterDone)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
              filterDone
                ? 'bg-[#f5a623]/20 border-[#f5a623] text-[#f5a623]'
                : 'bg-[#1c2230] border-[#2a3142] text-[#8a91a3] hover:border-[#8a91a3]'
            }`}
          >
            {filterDone ? 'Showing Completed' : 'Hiding Completed'}
          </button>
          <button
            onClick={fetchTasks}
            className="p-2 rounded-lg bg-[#1c2230] border border-[#2a3142] text-[#8a91a3] hover:text-white hover:border-[#f5a623] transition-all"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ==================================================================== */}
        {/* TASK VOMIT STRIP (Top Strip, Always Visible)                      */}
        {/* ==================================================================== */}
        <section
          onDragOver={(e) => handleDragOver(e, 'bucket')}
          onDragLeave={(e) => handleDragLeave(e, 'bucket')}
          onDrop={(e) => handleDrop(e, null)}
          className={`relative rounded-xl p-4 sm:p-5 transition-all duration-200 backdrop-blur-md border ${
            activeDragOver === 'bucket'
              ? 'bg-[#f5a623]/10 border-[#f5a623] shadow-[0_0_20px_rgba(245,166,35,0.2)]'
              : 'bg-[#151a24] border-[#2a3142] hover:border-[#3ea8a0]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#f5a623]" />
              <h2 className="text-xs font-bold text-[#f5a623]">
                Task Vomit
              </h2>
              <span className="text-xs font-mono bg-[#1c2230] border border-[#2a3142] text-[#8a91a3] px-2 py-0.5 rounded-full">
                {unsortedTasks.length} unsorted
              </span>
            </div>
            <span className="text-[11px] text-[#8a91a3] hidden sm:inline-block">
              Drop chips here to send back to inbox
            </span>
          </div>

          {/* Single Text Input (Zero Friction Capture) */}
          <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What's on your mind? Dump task here (Press Enter)..."
                className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] text-white placeholder-[#8a91a3] text-sm rounded-lg px-4 py-2.5 outline-none transition-all pr-10 shadow-inner"
              />
              {newTitle && (
                <button
                  type="button"
                  onClick={() => setNewTitle('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a91a3] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!newTitle.trim() || isSubmitting}
              className="bg-[#f5a623] hover:bg-[#f5a623]/90 disabled:opacity-50 text-[#0c0f14] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Dump</span>
            </button>
          </form>

          {/* Unsorted Chips Strip */}
          <div className="min-h-[52px] flex flex-wrap items-center gap-2.5 p-2 rounded-lg bg-[#0c0f14]/50 border border-[#2a3142]/60">
            {unsortedTasks.length === 0 ? (
              <p className="text-xs text-[#8a91a3] italic p-1">
                TASK VOMIT is clear! Type above to dump new thoughts.
              </p>
            ) : (
              <AnimatePresence>
                {unsortedTasks.map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    isHighlighted={highlightedTaskId === task.id}
                    isEstimating={estimatingId === task.id}
                    onDragStart={handleDragStart}
                    onToggleDone={() => toggleTaskDone(task)} onToggleSubtask={(sub) => toggleTaskDone(sub)}
                    onEstimate={() => estimateTimeWithAI(task)}
                    onHighlight={() => setHighlightedTaskId(highlightedTaskId === task.id ? null : task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* EISENHOWER MATRIX (Main Area, 2x2 Grid)                             */}
        {/* ==================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {QUADRANTS.map((quadrant) => {
            const quadTasks = getQuadrantTasks(quadrant.id);
            const isDragTarget = activeDragOver === quadrant.id;
            const Icon = quadrant.icon;

            return (
              <div
                key={quadrant.id}
                onDragOver={(e) => handleDragOver(e, quadrant.id)}
                onDragLeave={(e) => handleDragLeave(e, quadrant.id)}
                onDrop={(e) => handleDrop(e, quadrant.id)}
                className={`rounded-xl border p-4 sm:p-5 flex flex-col min-h-[280px] transition-all duration-200 backdrop-blur-md relative overflow-hidden ${
                  isDragTarget
                    ? 'border-2 shadow-[0_0_25px_rgba(245,166,35,0.25)] bg-[#1c2230]'
                    : 'bg-[#151a24] hover:bg-[#151a24]/90'
                }`}
                style={{
                  borderColor: isDragTarget ? quadrant.accentColor : 'rgba(42, 49, 66, 0.8)',
                }}
              >
                {/* Top Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: quadrant.accentColor }}
                />

                {/* Quadrant Header */}
                <div className="flex items-start justify-between mb-3 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: quadrant.accentColor }} />
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {quadrant.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-[#8a91a3] mt-0.5">
                      {quadrant.subtitle}
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: quadrant.badgeBg,
                      borderColor: quadrant.borderColor,
                      color: quadrant.accentColor,
                    }}
                  >
                    {quadTasks.length}
                  </span>
                </div>

                {/* Drop Area & Task List */}
                <div
                  className={`flex-1 rounded-lg p-2.5 transition-colors flex flex-col gap-2 overflow-y-auto max-h-[420px] scrollbar-hide ${
                    isDragTarget ? 'bg-[#0c0f14]/80' : 'bg-[#0c0f14]/40 border border-[#2a3142]/40'
                  }`}
                >
                  {quadTasks.length === 0 ? (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center border-2 border-dashed border-[#2a3142]/60 rounded-lg p-4">
                      <p className="text-xs text-[#8a91a3]">
                        Drag task chip here to set as <strong style={{ color: quadrant.accentColor }}>{quadrant.shortLabel}</strong>
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {quadTasks.map((task) => (
                        <TaskChip
                          key={task.id}
                          task={task}
                          isHighlighted={highlightedTaskId === task.id}
                          isEstimating={estimatingId === task.id}
                          onDragStart={handleDragStart}
                          onToggleDone={() => toggleTaskDone(task)} onToggleSubtask={(sub) => toggleTaskDone(sub)}
                          onEstimate={() => estimateTimeWithAI(task)}
                          onHighlight={() => setHighlightedTaskId(highlightedTaskId === task.id ? null : task.id)}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => deleteTask(task.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={saveTaskEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TASK CHIP COMPONENT
// ============================================================================
function TaskChip({
  task,
  isHighlighted,
  isEstimating,
  onDragStart,
  onToggleDone, onToggleSubtask,
  onEstimate,
  onHighlight,
  onEdit,
  onDelete,
}) {
  const needsReassess = checkReassess(task);
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`group relative flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
        isDone
          ? 'bg-[#151a24]/50 border-[#2a3142]/40 opacity-60 line-through'
          : isHighlighted
          ? 'bg-[#1c2230] border-[#f5a623] shadow-[0_0_12px_rgba(245,166,35,0.3)] ring-1 ring-[#f5a623]'
          : 'bg-[#1c2230] border-[#2a3142] hover:border-[#f5a623]/60 hover:bg-[#232a3b]'
      }`}
    >
      {/* Drag Grip Handle */}
      <div className="pt-0.5 text-[#8a91a3] opacity-40 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Checkbox */}
      <button
        onClick={onToggleDone}
        className={`mt-0.5 rounded p-0.5 transition-all cursor-pointer ${
          isDone
            ? 'text-[#3ea8a0]'
            : 'text-[#8a91a3] hover:text-[#f5a623]'
        }`}
        title={isDone ? 'Mark active' : 'Mark done'}
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>

      {/* Main Task Content */}
      <div className="flex-1 min-w-0" onClick={onEdit}>
        {task._parentTitle && (
          <div className="text-[9px] uppercase tracking-wider text-[#f5a623] mb-0.5 truncate pr-2 opacity-80 font-mono">
            {task._parentTitle}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-medium text-white truncate max-w-[200px] sm:max-w-[280px] ${task._parentTitle ? 'text-lg' : ''}`}>
            {task.title}
          </span>

          {/* Reassess Flag */}
          {needsReassess && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHighlight();
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f5a623]/20 border border-[#f5a623]/50 text-[#f5a623] hover:bg-[#f5a623]/30 transition-all cursor-pointer"
              title="Task needs attention or sorting"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-ping" />
              <span>Reassess?</span>
            </button>
          )}
        </div>

        {/* Task Badges & Metadata */}
        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] font-mono text-[#8a91a3]">
          {/* Estimated Minutes */}
          {task.estimated_minutes ? (
            <span className="flex items-center gap-1 bg-[#0c0f14] px-1.5 py-0.5 rounded border border-[#2a3142]">
              <Clock className="w-3 h-3 text-[#f5a623]" />
              <span>{task.estimated_minutes}m</span>
              {task.estimate_source === 'ai' && (
                <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] px-1 rounded font-sans font-semibold">
                  AI
                </span>
              )}
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEstimate();
              }}
              disabled={isEstimating}
              className="flex items-center gap-1 text-[#f5a623] hover:text-[#f5a623]/80 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 px-1.5 py-0.5 rounded border border-[#f5a623]/30 transition-all cursor-pointer disabled:opacity-50"
              title="Estimate realistic duration with AI"
            >
              <Sparkles className={`w-3 h-3 ${isEstimating ? 'animate-spin' : ''}`} />
              <span>{isEstimating ? 'Estimating...' : 'Estimate time'}</span>
            </button>
          )}

          {/* Notes indicator */}
          {task.notes && (
            <span className="text-[10px] text-[#8a91a3] italic truncate max-w-[120px]">
              {task.notes}
            </span>
          )}
        </div>

        {/* Nested Subtasks (Planning Mode) */}
        {task._subtasks && task._subtasks.length > 0 && (
          <div className="w-full mt-2.5 pl-3 border-l border-[#2a3142]/60 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {task._subtasks.map(sub => (
              <div key={sub.id} className="flex items-start gap-1.5 group/sub">
                <button 
                  onClick={() => onToggleSubtask && onToggleSubtask(sub)} 
                  className={`mt-0.5 shrink-0 ${sub.status === 'done' ? 'text-[#3ea8a0]' : 'text-[#8a91a3] hover:text-[#f5a623]'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <span className={`text-[11px] leading-tight flex-1 ${sub.status === 'done' ? 'text-[#8a91a3] line-through' : 'text-[#e8e6df]'}`}>
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 text-[#8a91a3] hover:text-white transition-colors"
          title="Edit Task"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-[#8a91a3] hover:text-[#d9634f] transition-colors"
          title="Delete Task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EDIT TASK MODAL COMPONENT
// ============================================================================
function EditTaskModal({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimated_minutes || ''
  );
  const [quadrant, setQuadrant] = useState(task.quadrant || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      deadline: deadline || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      quadrant: quadrant || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#151a24] border border-[#2a3142] rounded-xl p-5 shadow-2xl text-[#e8e6df]"
      >
        <div className="flex items-center justify-between mb-4 border-b border-[#2a3142] pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#f5a623]" /> Edit Task
          </h3>
          <button
            onClick={onClose}
            className="text-[#8a91a3] hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#8a91a3] mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] rounded-lg px-3 py-2 text-white outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#8a91a3] mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add details, links, or context..."
              className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] rounded-lg px-3 py-2 text-white outline-none resize-none"
            />
          </div>

          {/* Grid: Deadline & Estimated Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a91a3] mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8a91a3] mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="e.g. 45"
                className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          {/* Quadrant Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#8a91a3] mb-1">
              Quadrant
            </label>
            <select
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value)}
              className="w-full bg-[#0c0f14] border border-[#2a3142] focus:border-[#f5a623] rounded-lg px-3 py-2 text-white outline-none"
            >
              <option value="">TASK VOMIT (Unsorted)</option>
              {QUADRANTS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.shortLabel})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a3142]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#8a91a3] hover:text-white bg-[#1c2230] rounded-lg border border-[#2a3142]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-[#0c0f14] bg-[#f5a623] hover:bg-[#f5a623]/90 rounded-lg shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
