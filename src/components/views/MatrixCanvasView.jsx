import { getGroqKey } from '../../lib/llm';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { supabase } from '../../lib/supabase';
import { computeWSJFScore } from '../../hooks/useWSJFScore';
import { useAuth } from '../../hooks/useAuth';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../../lib/offlineApi';
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  Flame, 
  Target, 
  Zap, 
  Archive, 
  CheckCircle2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Bot, 
  Inbox,
  Play,
  Star,
  Search,
  Filter,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Link,
  Unlink,
  RefreshCw,
  List,
  FileText,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Quadrant Config matching Polaris Constellation Color Palette
const QUADRANTS = {
  urgent_important: {
    id: 'urgent_important',
    title: 'Urgent & Important',
    subtitle: 'Do First (High Impact)',
    color: '#f59e0b', // Gold / North Star
    bg: 'rgba(245, 158, 11, 0.04)',
    border: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.25)',
    icon: Flame,
    cx: 300, cy: 200,
  },
  important_not_urgent: {
    id: 'important_not_urgent',
    title: 'Important, Not Urgent',
    subtitle: 'Schedule (Strategic Growth)',
    color: '#3b82f6', // Pulsar Blue
    bg: 'rgba(59, 130, 246, 0.04)',
    border: 'rgba(59, 130, 246, 0.25)',
    glow: 'rgba(59, 130, 246, 0.25)',
    icon: Target,
    cx: 900, cy: 200,
  },
  urgent_not_important: {
    id: 'urgent_not_important',
    title: 'Urgent, Not Important',
    subtitle: 'Delegate / Quick Wins',
    color: '#8b5cf6', // Aurora Violet
    bg: 'rgba(139, 92, 246, 0.04)',
    border: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.25)',
    icon: Zap,
    cx: 300, cy: 600,
  },
  neither: {
    id: 'neither',
    title: 'Neither Urgent nor Important',
    subtitle: 'Eliminate / Backburner',
    color: '#10b981', // Emerald / Stardust
    bg: 'rgba(16, 185, 129, 0.04)',
    border: 'rgba(16, 185, 129, 0.25)',
    glow: 'rgba(16, 185, 129, 0.25)',
    icon: Archive,
    cx: 900, cy: 600,
  }
};

function getQuadrantFromCoords(x, y) {
  const isRight = x >= 600;
  const isBottom = y >= 400;
  if (!isRight && !isBottom) return 'urgent_important';
  if (isRight && !isBottom) return 'important_not_urgent';
  if (!isRight && isBottom) return 'urgent_not_important';
  return 'neither';
}

function getDefaultCoords(quadrantId) {
  switch (quadrantId) {
    case 'urgent_important': return { x: 260, y: 180 };
    case 'important_not_urgent': return { x: 860, y: 180 };
    case 'urgent_not_important': return { x: 260, y: 580 };
    case 'neither': return { x: 860, y: 580 };
    default: return { x: 600, y: 400 };
  }
}

import { useUserSettings } from '../../hooks/useUserSettings';

export const QUADRANT_SHORT_NAMES = {
  urgent_important: 'Q1',
  important_not_urgent: 'Q2',
  urgent_not_important: 'Q3',
  neither: 'Q4'
};

export function isDueWithin48h(deadline) {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d;
  if (deadline instanceof Date) {
    d = new Date(deadline);
  } else if (typeof deadline === 'string') {
    d = new Date(deadline.includes('T') ? deadline : deadline + 'T00:00:00');
  } else {
    d = new Date(deadline);
  }
  if (isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

export function computeActiveSubtask(incompleteSubtasks) {
  if (!incompleteSubtasks || incompleteSubtasks.length === 0) return null;

  // Tier 1 (Deadline override): Any incomplete subtask due within 48h (deadline <= today + 2 days).
  // If multiple qualify, pick the lowest time_estimate_minutes (or estimated_minutes).
  const urgentSubtasks = incompleteSubtasks.filter(s => isDueWithin48h(s.deadline));
  if (urgentSubtasks.length > 0) {
    return urgentSubtasks.reduce((minTask, currentTask) => {
      const minEst = minTask.time_estimate_minutes ?? minTask.estimated_minutes ?? Infinity;
      const currentEst = currentTask.time_estimate_minutes ?? currentTask.estimated_minutes ?? Infinity;
      return currentEst < minEst ? currentTask : minTask;
    });
  }

  // Tier 2 (Priority flag): If none are near deadline, surface the first subtask with status === 'in_progress' or priority === 'high'.
  const prioritySubtask = incompleteSubtasks.find(s => s.status === 'in_progress' || s.priority === 'high');
  if (prioritySubtask) {
    return prioritySubtask;
  }

  // Tier 3 (Sequence with low-friction nudge): Sort by position (or created_at).
  const sorted = [...incompleteSubtasks].sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position;
    if (a.position != null) return -1;
    if (b.position != null) return 1;
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });

  const first = sorted[0];
  const firstEst = first.time_estimate_minutes ?? first.estimated_minutes ?? 0;
  if (firstEst > 60 && first.mental_load === 'high') {
    const warmUp = [sorted[1], sorted[2]].find(s => {
      if (!s) return false;
      const sEst = s.time_estimate_minutes ?? s.estimated_minutes;
      return sEst != null && sEst <= 20;
    });
    if (warmUp) return warmUp;
  }

  return first;
}

export function computeSuggestedQuadrant(task) {
  if (!task) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let isUrgent = false;
  if (task.deadline) {
    const d = new Date(task.deadline + 'T00:00:00');
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) {
      isUrgent = true;
    }
  }

  const load = task.mental_load;
  let isImportant = false;
  if (load === 'high') {
    isImportant = true;
  } else if (load === 'low') {
    isImportant = false;
  } else if (load === 'medium') {
    isImportant = Boolean(task.deadline || task.milestone_id || task.category === 'polaris' || task.category === 'academic');
  } else {
    isImportant = Boolean(task.milestone_id || (task.deadline && isUrgent));
  }

  if (isUrgent && isImportant) return 'urgent_important';
  if (!isUrgent && isImportant) return 'important_not_urgent';
  if (isUrgent && !isImportant) return 'urgent_not_important';
  return 'neither';
}

export default function MatrixCanvasView({ onTasksChanged, refreshTrigger }) {
  const { user } = useAuth();
  const { featureFlags } = useUserSettings();
  const autoQuadrantSuggest = featureFlags?.auto_quadrant_suggest ?? false;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const toggleTaskExpand = (e, taskId) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Brain Dump Tab State ('backlog' | 'completed' | 'details')
  const [activeBrainDumpTab, setActiveBrainDumpTab] = useState('backlog');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    if (activeBrainDumpTab !== 'details' || !selectedTaskId) {
      setStatusDropdownOpen(false);
    }
  }, [activeBrainDumpTab, selectedTaskId]);

  // Brain Dump Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [brainDumpCollapsed, setBrainDumpCollapsed] = useState(false);

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCompleted, setShowCompleted] = useState(false);
  const [hideFarScheduled, setHideFarScheduled] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_far_scheduled');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const [hideReminders, setHideReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_reminders');
      return saved !== null ? saved === 'true' : false;
    } catch (e) {
      return false;
    }
  });
  const [hidePolaris, setHidePolaris] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_polaris');
      return saved !== null ? saved === 'true' : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('polaris_matrix_hide_far_scheduled', hideFarScheduled.toString());
    } catch (e) {}
  }, [hideFarScheduled]);

  useEffect(() => {
    try {
      localStorage.setItem('polaris_matrix_hide_reminders', hideReminders.toString());
    } catch (e) {}
  }, [hideReminders]);

  useEffect(() => {
    try {
      localStorage.setItem('polaris_matrix_hide_polaris', hidePolaris.toString());
    } catch (e) {}
  }, [hidePolaris]);

  const canvasRef = useRef(null);
  const innerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  const [recurringTemplates, setRecurringTemplates] = useState([]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    console.log('[MatrixCanvasView] fetchTasks called (Data loading triggered)');
    try {
      setLoading(true);
      const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      let { data, error } = await offlineSelect('tasks', { user_id: userId });

      if (error) throw error;

      const { data: mData } = await offlineSelect('milestones', { user_id: userId });
      setMilestones(mData || []);

      const { data: tplData } = await offlineSelect('recurring_task_templates', { user_id: userId });
      setRecurringTemplates(tplData || []);
      
      // Merge local canvasX and canvasY into the newly fetched data
      setTasks(prev => {
        const localCoords = {};
        prev.forEach(t => {
          if (t.canvasX != null && t.canvasY != null) {
            localCoords[t.id] = { canvasX: t.canvasX, canvasY: t.canvasY };
          }
        });
        return (data || []).map(t => ({
          ...t,
          canvasX: t.canvas_x != null ? t.canvas_x : localCoords[t.id]?.canvasX,
          canvasY: t.canvas_y != null ? t.canvas_y : localCoords[t.id]?.canvasY
        }));
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const saveLocalCoords = (taskId, x, y) => {
    try {
      offlineUpdate('tasks', { id: taskId }, { canvas_x: x, canvas_y: y });
    } catch (e) {
      console.warn('saveLocalCoords error:', e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  useEffect(() => {
    const handleTasksChanged = () => {
      fetchTasks();
    };

    window.addEventListener('polaris-tasks-changed', handleTasksChanged);
    return () => {
      window.removeEventListener('polaris-tasks-changed', handleTasksChanged);
    };
  }, [fetchTasks]);

  // Quick Dump Task into Brain Dump (Zero-Friction Capture)
  const handleDumpTask = async (e) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    try {
      const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return;
      const newTask = { title, status: 'inbox', quadrant: null, user_id: userId, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const { error } = await offlineInsert('tasks', newTask);
      const data = newTask;

      if (error) throw error;

      setTasks((prev) => [data, ...prev]);
      setNewTitle('');
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error dumping task:', err);
    }
  };

  // Add child subtask under selected task
  const handleAddSubtask = async (e) => {
    if (e) e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title || !selectedTaskId) return;

    try {
      const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return;
      const targetParent = tasks.find(t => t.id === selectedTaskId);
      const currentCount = tasks.filter(t => t.parent_task_id === selectedTaskId).length;
      const newSub = {
        id: crypto.randomUUID(),
        user_id: userId,
        title,
        parent_task_id: selectedTaskId,
        position: currentCount,
        status: 'active',
        quadrant: targetParent?.quadrant || 'important_not_urgent',
        category: targetParent?.category || 'academic',
        created_at: new Date().toISOString()
      };
      const { error } = await offlineInsert('tasks', newSub);
      if (error) throw error;
      setNewSubtaskTitle('');
      await fetchTasks();
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  // Set a specific subtask as next action (sets status: 'in_progress', reverts other incomplete subtasks to 'active')
  const handleSetNextAction = async (targetSubtask) => {
    const parentId = targetSubtask.parent_task_id;
    if (!parentId) return;

    setTasks(prev => prev.map(t => {
      if (t.parent_task_id === parentId && t.status !== 'done') {
        if (t.id === targetSubtask.id) {
          return { ...t, status: 'in_progress' };
        } else if (t.status === 'in_progress') {
          return { ...t, status: 'active' };
        }
      }
      return t;
    }));

    try {
      await offlineUpdate('tasks', { id: targetSubtask.id }, { status: 'in_progress' });
      const otherInProgress = tasks.filter(t => t.parent_task_id === parentId && t.id !== targetSubtask.id && t.status === 'in_progress');
      for (const other of otherInProgress) {
        await offlineUpdate('tasks', { id: other.id }, { status: 'active' });
      }
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error setting next action:', err);
      fetchTasks();
    }
  };

  // Reorder subtasks
  const handleMoveSubtask = async (subtaskId, direction) => {
    if (!selectedTaskId) return;
    const currentSubtasks = tasks
      .filter(t => t.parent_task_id === selectedTaskId)
      .sort((a, b) => {
        if (a.position != null && b.position != null) return a.position - b.position;
        if (a.position != null) return -1;
        if (b.position != null) return 1;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });

    const index = currentSubtasks.findIndex(s => s.id === subtaskId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSubtasks.length) return;

    const current = currentSubtasks[index];
    const target = currentSubtasks[targetIndex];

    const newCurrentPos = targetIndex;
    const newTargetPos = index;

    setTasks(prev => prev.map(t => {
      if (t.id === current.id) return { ...t, position: newCurrentPos };
      if (t.id === target.id) return { ...t, position: newTargetPos };
      return t;
    }));

    try {
      await offlineUpdate('tasks', { id: current.id }, { position: newCurrentPos });
      await offlineUpdate('tasks', { id: target.id }, { position: newTargetPos });
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error reordering subtask:', err);
      fetchTasks();
    }
  };

  // Deploy task from Brain Dump onto 2D Matrix Plane (lands in quadrant stack list)
  const deployFromBrainDump = async (task, targetQuadrant = 'urgent_important') => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, quadrant: targetQuadrant, canvasX: null, canvasY: null } : t
      )
    );

    try {
      const { error } = await offlineUpdate('tasks', { id: task.id }, { quadrant: targetQuadrant });

      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error deploying task:', err);
      fetchTasks();
    }
  };

  // Untether: Detach task from quadrant cluster list so it floats freely anywhere on 2D plane
  const handleUntether = async (task) => {
    const coords = getDefaultCoords(task.quadrant || 'urgent_important');
    const freeX = coords.x + (Math.random() * 140 - 70);
    const freeY = coords.y + (Math.random() * 100 - 50);

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, canvasX: freeX, canvasY: freeY } : t))
    );

    try {
      saveLocalCoords(task.id, freeX, freeY);
      // Wait, if we untether, we don't need to update Supabase since quadrant doesn't change
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error untethering task:', err);
    }
  };

  // Retether: Attach free-floating node back into a quadrant cluster list
  const handleRetether = async (task) => {
    const targetQuadrant = task.quadrant || getQuadrantFromCoords(task.canvasX || 300, task.canvasY || 300);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrant, canvasX: null, canvasY: null } : t));
    
    try {
      saveLocalCoords(task.id, null, null);
      const { error } = await offlineUpdate('tasks', { id: task.id }, { quadrant: targetQuadrant });
      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error retethering task:', err);
    }
  };

  // Return task to Brain Dump
  const returnToBrainDump = async (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, quadrant: null, canvasX: null, canvasY: null } : t))
    );
    saveLocalCoords(taskId, null, null);

    try {
      const { error } = await offlineUpdate('tasks', { id: taskId }, { quadrant: null });
      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error returning to brain dump:', err);
      fetchTasks();
    }
  };

  // Drag node on 2D plane
  const handleNodeDragStop = async (taskId, newX, newY) => {
    const newQuadrant = getQuadrantFromCoords(newX, newY);

    // Auto-tether untethered nodes to the quadrant they are dragged into
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, quadrant: newQuadrant, canvasX: null, canvasY: null } : t
      )
    );

    try {
      saveLocalCoords(taskId, null, null);
      const { error } = await offlineUpdate('tasks', { id: taskId }, { quadrant: newQuadrant });

      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error updating task location:', err);
      fetchTasks();
    }
  };

  // Toggle done status (Finished tasks are removed from 2D plane and appear in Brain Dump's Completed list)
  const toggleDone = async (task) => {
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
      await offlineUpdate('tasks', { id: task.id }, { status: newStatus });

      if (shouldUpdateParent && task.parent_task_id && parentNewStatus) {
        await offlineUpdate('tasks', { id: task.parent_task_id }, { status: parentNewStatus });
      }

      if (childIdsToComplete.length > 0) {
        for (const childId of childIdsToComplete) {
          await offlineUpdate('tasks', { id: childId }, { status: 'done' });
        }
      }

      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error toggling done:', err);
      fetchTasks();
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
      setStatusDropdownOpen(false);
    }
    try {
      await offlineDelete('tasks', { id: taskId });
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  // AI Auditor Function
  const runAIAuditor = async () => {
    setIsAuditing(true);
    setAuditMessage("Auditing Brain Dump & spatial matrix nodes...");

    try {
      const key = getGroqKey();
      if (!key) {
        alert("Groq API Key is not configured. Please enter your key to enable AI features.");
        setIsAuditing(false);
        return;
      }

      const unestimated = tasks.filter((t) => !t.estimated_minutes && t.status !== 'done');
      if (unestimated.length > 0) {
        setAuditMessage(`Estimating duration for ${unestimated.length} unestimated tasks via AI...`);
        for (const task of unestimated) {
          const safeTitle = JSON.stringify(task.title);
          const prompt = `Estimate realistic duration in minutes for task: ${safeTitle}. Return ONLY JSON like {"minutes": 35}.`;
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
              })
            });
            const data = await res.json();
            const parsed = JSON.parse(data.choices[0].message.content);
            const mins = parsed?.minutes ? Math.max(5, Math.round(parsed.minutes)) : 30;

            await offlineUpdate('tasks', { id: task.id }, { estimated_minutes: mins, estimate_source: 'ai' });
          } catch (e) {
            console.error('Estimate error for task:', task.title, e);
          }
        }
      }

      setAuditMessage("Scoring tasks with WSJF algorithm and picking Today's Tasks...");
      const auditUserId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!auditUserId) {
        setIsAuditing(false);
        return;
      }
      const { data: updatedData } = await offlineSelect('tasks', { user_id: auditUserId });
      const scored = (updatedData || []).map(t => ({
        ...t,
        score: computeWSJFScore(t).score
      })).sort((a, b) => b.score - a.score);

      let capacityMins = 0;
      const todayPickIds = [];
      for (const t of scored) {
        if (t.status === 'done') continue;
        const duration = t.estimated_minutes || 30;
        if (capacityMins + duration <= 240 || todayPickIds.length === 0) {
          todayPickIds.push(t.id);
          capacityMins += duration;
        }
      }

      for (const id of todayPickIds) {
        const task = scored.find(t => t.id === id);
        if (task && task.status !== 'in_progress' && task.status !== 'active') {
          await offlineUpdate('tasks', { id: id }, { status: 'active' });
        }
      }

      await fetchTasks();
      if (onTasksChanged) onTasksChanged();
      setAuditMessage(`Audit complete! Curated ${todayPickIds.length} priority tasks into Today's Tasks queue.`);
    } catch (err) {
      console.error('AI Auditor error:', err);
      setAuditMessage("Audit failed. Please check network connection.");
    } finally {
      setIsAuditing(false);
      setTimeout(() => setAuditMessage(null), 6000);
    }
  };

  // =======================================================================
  // D3 ZOOM & PAN INTEGRATION
  // =======================================================================
  useEffect(() => {
    if (!canvasRef.current || !innerRef.current) return;

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => {
        // High-performance direct DOM update
        d3.select(innerRef.current).style('transform', `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
        // Sync React state for drag-math and other components
        setZoom(e.transform.k);
        setPan({ x: e.transform.x, y: e.transform.y });
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(canvasRef.current).call(zoomBehavior).on("dblclick.zoom", null);

    return () => {
      d3.select(canvasRef.current).on('.zoom', null);
    };
  }, []);

  const handleZoomChange = (delta) => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, delta > 0 ? 1.25 : 1/1.25);
    }
  };

  const handleResetView = () => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Active matrix tasks (Finished tasks `status === 'done'` are hidden from matrix plane)
  const matrixTasks = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks.filter((t) => {
      if (t.parent_task_id || t.quadrant === null || t.status === 'done') return false;
      if (hideReminders && t.category === 'reminders') return false;
      if (hidePolaris && (t.category === 'polaris' || (t.title || '').toLowerCase().includes('polaris'))) return false;
      if (hideFarScheduled && t.status === 'scheduled' && t.deadline) {
        const deadlineDate = new Date(t.deadline);
        if (deadlineDate > oneWeekFromNow) return false;
      }
      return true;
    });
  }, [tasks, hideFarScheduled, hideReminders, hidePolaris]);

  // Unsorted Brain Dump tasks (`quadrant === null` and `status !== 'done'`)
  const brainDumpTasks = useMemo(() => {
    let result = tasks.filter((t) => !t.parent_task_id && t.quadrant === null && t.status !== 'done');
    if (hideReminders) {
      result = result.filter(t => t.category !== 'reminders');
    }
    if (hidePolaris) {
      result = result.filter(t => !(t.category === 'polaris' || (t.title || '').toLowerCase().includes('polaris')));
    }
    if (searchQuery.trim()) {
      result = result.filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }
    const catOrder = { 'polaris': 1, 'normal': 2, 'reminders': 3 };
    result.sort((a, b) => {
      const aCat = catOrder[a.category || 'normal'] || 2;
      const bCat = catOrder[b.category || 'normal'] || 2;
      return aCat - bCat;
    });
    return result;
  }, [tasks, searchQuery, hideReminders, hidePolaris]);

  // Completed Tasks list (`status === 'done'`)
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'done');
  }, [tasks]);

  const updateTaskField = async (taskId, field, value) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );
    try {
      const { error } = await offlineUpdate('tasks', { id: taskId }, { [field]: value });
      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error updating task field:', err);
    }
  };

  const handleEstimateChange = async (taskId, value) => {
    const rawVal = typeof value === 'string' ? value.trim() : value;
    const mins = rawVal !== '' && rawVal !== null && !isNaN(parseInt(rawVal, 10)) ? parseInt(rawVal, 10) : null;
    const currentTask = tasks.find(t => t.id === taskId);
    const oldMins = currentTask ? (currentTask.time_estimate_minutes ?? currentTask.estimated_minutes ?? null) : null;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, time_estimate_minutes: mins, estimated_minutes: mins } : t));

    try {
      const { error } = await offlineUpdate('tasks', { id: taskId }, { time_estimate_minutes: mins, estimated_minutes: mins });
      if (error) throw error;

      if (mins !== null && mins !== oldMins) {
        const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
        if (userId) {
          const calibrationRecord = {
            id: crypto.randomUUID(),
            user_id: userId,
            task_id: taskId,
            estimated_minutes: mins,
            actual_minutes: null,
            created_at: new Date().toISOString()
          };
          await offlineInsert('task_estimate_calibration', calibrationRecord);
        }
      }
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error updating estimate or logging calibration:', err);
    }
  };

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId);
  }, [tasks, selectedTaskId]);

  const selectedSubtasks = useMemo(() => {
    if (!selectedTask) return [];
    const subs = tasks.filter(t => t.parent_task_id === selectedTask.id);
    return [...subs].sort((a, b) => {
      if (a.position != null && b.position != null) return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [tasks, selectedTask]);

  const selectedIncompleteSubtasks = useMemo(() => {
    return selectedSubtasks.filter(t => t.status !== 'done');
  }, [selectedSubtasks]);

  const selectedActiveSubtask = useMemo(() => {
    return computeActiveSubtask(selectedIncompleteSubtasks);
  }, [selectedIncompleteSubtasks]);

  const fetchRecurringTemplates = useCallback(async () => {
    try {
      const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return;
      const { data: tplData } = await offlineSelect('recurring_task_templates', { user_id: userId });
      setRecurringTemplates(tplData || []);
    } catch (err) {
      console.warn('Error fetching recurring templates:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchRecurringTemplates();
    }
  }, [selectedTaskId, fetchRecurringTemplates]);

  const selectedTaskTemplate = useMemo(() => {
    if (!selectedTask || !selectedTask.source_template_id) return null;
    return recurringTemplates.find(tpl => tpl.id === selectedTask.source_template_id) || null;
  }, [selectedTask, recurringTemplates]);

  const isRecurringActive = useMemo(() => {
    if (!selectedTask) return false;
    if (selectedTaskTemplate) {
      return Boolean(selectedTaskTemplate.is_active);
    }
    return Boolean(selectedTask.source_template_id);
  }, [selectedTask, selectedTaskTemplate]);

  const handleToggleRecurring = async (enable) => {
    if (!selectedTask) return;
    const userId = user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
    if (!userId) return;

    try {
      if (enable) {
        if (selectedTask.source_template_id) {
          await offlineUpdate('recurring_task_templates', { id: selectedTask.source_template_id }, { is_active: true });
          setRecurringTemplates(prev => {
            const exists = prev.some(tpl => tpl.id === selectedTask.source_template_id);
            if (exists) {
              return prev.map(tpl => tpl.id === selectedTask.source_template_id ? { ...tpl, is_active: true } : tpl);
            }
            return [...prev, { id: selectedTask.source_template_id, user_id: userId, title: selectedTask.title, is_active: true }];
          });
        } else {
          const newTemplateId = crypto.randomUUID();
          const estMinutes = selectedTask.estimated_minutes || selectedTask.time_estimate_minutes || 30;
          const quad = selectedTask.quadrant || 'important_not_urgent';
          const newTemplate = {
            id: newTemplateId,
            user_id: userId,
            title: selectedTask.title,
            estimated_minutes: estMinutes,
            quadrant: quad,
            frequency: 'daily',
            is_active: true,
            created_at: new Date().toISOString()
          };

          const { error: insErr } = await offlineInsert('recurring_task_templates', newTemplate);
          if (insErr) throw insErr;

          setRecurringTemplates(prev => [...prev, newTemplate]);

          await offlineUpdate('tasks', { id: selectedTask.id }, { source_template_id: newTemplateId });
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, source_template_id: newTemplateId } : t));
        }
      } else {
        if (selectedTask.source_template_id) {
          await offlineUpdate('recurring_task_templates', { id: selectedTask.source_template_id }, { is_active: false });
          setRecurringTemplates(prev => prev.map(tpl => tpl.id === selectedTask.source_template_id ? { ...tpl, is_active: false } : tpl));
        }
      }
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error toggling recurring task:', err);
    }
  };

  return (
    <div className="w-full h-full bg-transparent text-starlight font-['Inter'] flex flex-col md:flex-row-reverse overflow-hidden relative selection:bg-gold selection:text-black">
      
      {/* ==================================================================== */}
      {/* Left / Center: Spatial Constellation 2d Canvas Matrix                */}
      {/* ==================================================================== */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-transparent">
        {/* Canvas Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setHidePolaris(!hidePolaris)}
            className={`flex items-center justify-center w-[26px] h-[26px] rounded-lg transition-colors ${
              hidePolaris ? 'bg-pulsar/20 text-pulsar border border-pulsar/40' : 'glass border border-pulsar/20 text-nova/60 hover:text-starlight'
            }`}
            title="Hide Polaris Edit Tasks"
          >
            <Bot className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setHideReminders(!hideReminders)}
            className={`flex items-center justify-center w-[26px] h-[26px] rounded-lg transition-colors ${
              hideReminders ? 'bg-pulsar/20 text-pulsar border border-pulsar/40' : 'glass border border-pulsar/20 text-nova/60 hover:text-starlight'
            }`}
            title="Hide Reminders"
          >
            {hideReminders ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setHideFarScheduled(!hideFarScheduled)}
            className={`flex items-center justify-center w-[26px] h-[26px] rounded-lg transition-colors ${
              hideFarScheduled ? 'bg-pulsar/20 text-pulsar border border-pulsar/40' : 'glass border border-pulsar/20 text-nova/60 hover:text-starlight'
            }`}
            title="Hide Scheduled Tasks (> 1 week away)"
          >
            {hideFarScheduled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {/* 2D Canvas Surface */}
        <div
          ref={canvasRef}
          data-role="canvas"
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative select-none"
          style={{
            backgroundColor: '#0a0a14',
          }}
        >
          <div
            ref={innerRef}
            className="absolute origin-top-left"
            style={{
              width: '1400px', // Wider canvas for more task space
              minHeight: '900px', // Let height grow with tasks
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Crosshair Dividers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
            </svg>

            {/* 4 Quadrant Regions with Vertically Stacked Task Pills */}
            <div className="w-full h-full min-h-[900px] grid grid-cols-2 grid-rows-2 gap-6 p-6">
              {Object.values(QUADRANTS).map((q) => {
                const QIcon = q.icon;
                const qTasks = matrixTasks.filter(t => t.quadrant === q.id && t.canvasX == null && t.canvasY == null);

                return (
                  <div
                    key={q.id}
                    data-role="quadrant-bg"
                    className="relative rounded-xl border transition-all p-5 flex flex-col glass shadow-xl"
                    style={{
                      backgroundColor: q.bg,
                      borderColor: q.border,
                    }}
                  >
                    {/* Quadrant Header */}
                    <div className="flex items-center justify-between border-b border-pulsar/30 pb-3 mb-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <QIcon className="w-5 h-5" style={{ color: q.color }} />
                        <div>
                          <h3 className="font-display text-lg text-starlight">
                            {q.title}
                          </h3>
                          <p className="text-[11px] font-['Inter'] text-nova/60 italic">{q.subtitle}</p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-mono px-2.5 py-1 rounded-md border"
                        style={{ color: q.color, borderColor: q.border, backgroundColor: 'rgba(3,7,18,0.7)' }}
                      >
                        {qTasks.length} tasks
                      </span>
                    </div>

                    {/* Vertically Stacked Compact Task Pills with Drag-Between-Quadrants & Hover into Space */}
                    <div className="flex-1 flex flex-col items-start gap-3 py-2 overflow-visible">
                      <AnimatePresence>
                        {qTasks.flatMap((task) => {
                          const isOutput = task.estimate_source === 'ai' || (task.title || '').toLowerCase().includes('write') || (task.title || '').toLowerCase().includes('code') || (task.title || '').toLowerCase().includes('ppt') || (task.title || '').toLowerCase().includes('fix');
                          const ioTag = isOutput ? 'OUT' : 'IN';
                          const childTasks = tasks.filter(t => t.parent_task_id === task.id);
                          const incompleteSubtasks = childTasks.filter(t => t.status !== 'done');
                          const activeSubtask = computeActiveSubtask(incompleteSubtasks);
                          const hasUrgentSubtask = incompleteSubtasks.some(s => isDueWithin48h(s.deadline));
                          const doneSubtasksCount = childTasks.filter(t => t.status === 'done').length;
                          const totalSubtasksCount = childTasks.length;
                          const remainingMinutes = incompleteSubtasks.reduce((sum, t) => sum + (t.time_estimate_minutes || t.estimated_minutes || 0), 0);
                          const isExpanded = expandedTasks.has(task.id);
                          const taskEstimate = task.time_estimate_minutes || task.estimated_minutes;

                          const parentNode = (
                            <motion.div
                              key={task.id}
                              layout
                              drag
                              dragSnapToOrigin={true}
                              dragElastic={0.1}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ 
                                opacity: 1, 
                                scale: 1,
                                y: [0, -2, 0]
                              }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              whileHover={{ 
                                scale: 1.05, 
                                y: -4, 
                                boxShadow: `0 0 20px ${q.color}80`,
                                borderColor: q.color,
                                transition: { duration: 0.15 } 
                              }}
                              whileDrag={{ 
                                scale: 1.1, 
                                zIndex: 100, 
                                boxShadow: `0 0 30px ${q.color}`,
                                cursor: 'grabbing' 
                              }}
                              onDragEnd={async (event, info) => {
                                if (canvasRef.current) {
                                  const canvasRect = canvasRef.current.getBoundingClientRect();
                                  const dropX = (info.point.x - canvasRect.left - pan.x) / zoom;
                                  const dropY = (info.point.y - canvasRect.top - pan.y) / zoom;
                                  const targetQuadrant = getQuadrantFromCoords(dropX, dropY);

                                  if (targetQuadrant && targetQuadrant !== task.quadrant) {
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrant } : t));
                                    try {
                                      await offlineUpdate('tasks', { id: task.id }, { quadrant: targetQuadrant });
                                      if (onTasksChanged) onTasksChanged();
                                    } catch (err) {
                                      console.error('Error updating task quadrant on drag drop:', err);
                                      fetchTasks();
                                    }
                                  }
                                }
                              }}
                              transition={{ 
                                y: { duration: 1.5 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' },
                                layout: { type: 'spring', stiffness: 350, damping: 25 },
                                default: { duration: 0.2 }
                              }}
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setActiveBrainDumpTab('details');
                                setBrainDumpCollapsed(false);
                              }}
                              className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0a0f1e]/90 border transition-all cursor-grab active:cursor-grabbing w-fit max-w-[450px] select-none"
                              style={{ 
                                borderColor: `${q.color}66`, 
                                boxShadow: `0 0 10px ${q.color}33` 
                              }}
                            >
                              {/* Left Bullet / Urgent Subtask Indicator */}
                              {hasUrgentSubtask ? (
                                <Sparkles data-testid="urgent-subtask-indicator" className="w-3 h-3 text-amber-400 shrink-0 pointer-events-none" title="Urgent Subtask Due within 48h" />
                              ) : task.status === 'in_progress' ? (
                                <Zap className="w-3 h-3 shrink-0 pointer-events-none" style={{ color: q.color }} fill="currentColor" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 pointer-events-none" style={{ backgroundColor: q.color }} />
                              )}
                              
                              {/* Title */}
                              <h4 className="text-[13px] font-body text-[#e2e8f0] truncate leading-none pointer-events-none">
                                {task.title}
                              </h4>

                              {/* Right Tags (IN / OUT & Duration) + Action Controls */}
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                                {task.source_template_id && (
                                  <RefreshCw className="w-3 h-3 text-pulsar/80 shrink-0 pointer-events-none" title="Recurring Task" />
                                )}

                                {autoQuadrantSuggest && (() => {
                                  if (task.quadrant === 'urgent_important' && !hasUrgentSubtask && task.deadline && !isDueWithin48h(task.deadline)) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: 'important_not_urgent' } : t));
                                          try {
                                            await offlineUpdate('tasks', { id: task.id }, { quadrant: 'important_not_urgent' });
                                            if (onTasksChanged) onTasksChanged();
                                          } catch (err) {
                                            console.error('Error moving task back to Q2:', err);
                                            fetchTasks();
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-void border border-blue-500/40 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer pointer-events-auto shrink-0"
                                        title="Click to move back to Q2"
                                      >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span>Move back to Q2?</span>
                                      </button>
                                    );
                                  }
                                  const suggestedQuad = computeSuggestedQuadrant(task);
                                  if (suggestedQuad && suggestedQuad !== task.quadrant) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: suggestedQuad } : t));
                                          try {
                                            await offlineUpdate('tasks', { id: task.id }, { quadrant: suggestedQuad });
                                            if (onTasksChanged) onTasksChanged();
                                          } catch (err) {
                                            console.error('Error moving task to suggested quadrant:', err);
                                            fetchTasks();
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-gold/20 text-gold hover:bg-gold hover:text-void border border-gold/40 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer pointer-events-auto shrink-0"
                                        title={`Click to move to ${QUADRANT_SHORT_NAMES[suggestedQuad]}`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span>Move to {QUADRANT_SHORT_NAMES[suggestedQuad]}</span>
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}

                                <span className={`px-1.5 py-0.5 rounded font-bold pointer-events-none ${
                                  ioTag === 'IN' ? 'bg-[#1a263d] text-[#60a5fa]' : 'bg-stardust text-nova/60 border border-pulsar/40'
                                }`}>
                                  {ioTag}
                                </span>

                                {totalSubtasksCount === 0 && taskEstimate && (
                                  <span className="text-nova/60 bg-void/60 px-1 py-0.5 rounded border border-pulsar/40 pointer-events-none">
                                    {taskEstimate}m
                                  </span>
                                )}

                                {totalSubtasksCount > 0 && (
                                  <button
                                    onClick={(e) => toggleTaskExpand(e, task.id)}
                                    className="ml-1 bg-pulsar/20 text-nova/80 hover:text-starlight hover:bg-pulsar/40 px-1.5 py-0.5 rounded flex items-center gap-1 border border-pulsar/30 transition-colors pointer-events-auto"
                                    title="Toggle Subtasks"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <><List className="w-3 h-3" /> {doneSubtasksCount}/{totalSubtasksCount}</>}
                                  </button>
                                )}

                                {/* Quick Hover Controls */}
                                <div className="hidden lg:group-hover:flex items-center gap-1 pl-1 border-l border-pulsar/40">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUntether(task); }}
                                    className="text-nova/60 hover:text-aurora p-0.5"
                                    title="Untether Node to Float Freely in Space"
                                  >
                                    <Unlink className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); returnToBrainDump(task.id); }}
                                    className="text-nova/60 hover:text-starlight p-0.5"
                                    title="Return to Brain Dump"
                                  >
                                    <Inbox className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                                    className="text-nova/60 hover:text-emerald p-0.5"
                                    title="Mark Done"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );

                          const childNodes = [];
                          if (isExpanded && activeSubtask) {
                            const subEstimate = activeSubtask.time_estimate_minutes || activeSubtask.estimated_minutes;
                            childNodes.push(
                              <motion.div
                                key={`active-${activeSubtask.id}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(activeSubtask.id);
                                  setActiveBrainDumpTab('details');
                                  setBrainDumpCollapsed(false);
                                }}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void/50 border border-amber-500/40 ml-6 w-fit max-w-[500px] select-none cursor-pointer hover:border-amber-500/70 transition-colors shadow-sm"
                              >
                                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                                <h4 className="text-[12px] text-starlight truncate pointer-events-none">
                                  {activeSubtask.title}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                  {activeSubtask.mental_load && (
                                    <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-bold pointer-events-none ${
                                      activeSubtask.mental_load === 'low' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                                      activeSubtask.mental_load === 'high' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                                      'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    }`}>
                                      {activeSubtask.mental_load}
                                    </span>
                                  )}
                                  {subEstimate && (
                                    <span className="text-nova/60 bg-void/60 px-1 py-0.5 rounded border border-pulsar/40 pointer-events-none">
                                      {subEstimate}m
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleDone(activeSubtask); }}
                                    className="text-nova/60 hover:text-emerald p-0.5 pointer-events-auto"
                                    title="Mark Done"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );

                            if (incompleteSubtasks.length > 1) {
                              childNodes.push(
                                <motion.button
                                  key={`more-${task.id}`}
                                  type="button"
                                  layout
                                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskId(task.id);
                                    setActiveBrainDumpTab('details');
                                    setBrainDumpCollapsed(false);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pulsar/10 border border-pulsar/30 hover:bg-pulsar/20 text-pulsar hover:text-starlight text-[11px] font-mono ml-6 w-fit cursor-pointer transition-colors"
                                >
                                  <span>+ {incompleteSubtasks.length - 1} queued in Project Drawer</span>
                                </motion.button>
                              );
                            }
                          }

                          return [parentNode, ...childNodes];
                        })}
                      </AnimatePresence>

                      {qTasks.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[11px] font-['Inter'] text-nova/60/50 italic border border-dashed border-pulsar/30 rounded-xl p-4">
                          No tasks in this quadrant
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Untethered Free-Floating Nodes on 2D Constellation Plane */}
            {matrixTasks.filter(t => t.canvasX != null && t.canvasY != null).map((task) => {
              const isOutput = task.estimate_source === 'ai' || (task.title || '').toLowerCase().includes('write') || (task.title || '').toLowerCase().includes('code') || (task.title || '').toLowerCase().includes('ppt') || (task.title || '').toLowerCase().includes('fix');
              const ioTag = isOutput ? 'OUT' : 'IN';
              const childTasks = tasks.filter(t => t.parent_task_id === task.id);
              const incompleteSubtasks = childTasks.filter(t => t.status !== 'done');
              const hasUrgentSubtask = incompleteSubtasks.some(s => isDueWithin48h(s.deadline));
              const doneSubtasksCount = childTasks.filter(t => t.status === 'done').length;
              const totalSubtasksCount = childTasks.length;
              const remainingMinutes = incompleteSubtasks.reduce((sum, t) => sum + (t.time_estimate_minutes || t.estimated_minutes || 0), 0);
              const taskEstimate = task.time_estimate_minutes || task.estimated_minutes;

              const qColor = QUADRANTS[task.quadrant]?.color || '#f59e0b';

              return (
                <motion.div
                  key={`untethered-${task.id}`}
                  drag
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    const newX = Math.max(20, Math.min(1100, task.canvasX + (info.offset.x / zoom)));
                    const newY = Math.max(20, Math.min(720, task.canvasY + (info.offset.y / zoom)));
                    handleNodeDragStop(task.id, newX, newY);
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    y: [0, -4, 0]
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.1, y: -6, boxShadow: `0 0 25px ${qColor}99` }}
                  whileDrag={{ scale: 1.15, zIndex: 100, boxShadow: `0 0 35px ${qColor}` }}
                  transition={{ 
                    y: { duration: 1.8 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' },
                    default: { duration: 0.2 }
                  }}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setActiveBrainDumpTab('details');
                    setBrainDumpCollapsed(false);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${task.canvasX}px`,
                    top: `${task.canvasY}px`,
                    zIndex: 40,
                    borderColor: qColor,
                    boxShadow: `0 0 15px ${qColor}66`
                  }}
                  className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0a0f1e]/95 border-2 cursor-grab active:cursor-grabbing w-fit max-w-[450px] select-none"
                >
                  {hasUrgentSubtask ? (
                    <Sparkles data-testid="urgent-subtask-indicator" className="w-3 h-3 text-amber-400 shrink-0 pointer-events-none" title="Urgent Subtask Due within 48h" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse pointer-events-none" style={{ backgroundColor: qColor }} />
                  )}
                  <h4 className="text-[13px] font-body text-starlight truncate leading-none pointer-events-none">
                    {task.title}
                  </h4>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
                    {task.source_template_id && (
                      <RefreshCw className="w-3 h-3 text-pulsar/80 shrink-0 pointer-events-none" title="Recurring Task" />
                    )}
                    {autoQuadrantSuggest && (() => {
                      const currentEffective = task.quadrant || getQuadrantFromCoords(task.canvasX || 300, task.canvasY || 300);
                      if (currentEffective === 'urgent_important' && !hasUrgentSubtask && task.deadline && !isDueWithin48h(task.deadline)) {
                        return (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: 'important_not_urgent', canvasX: null, canvasY: null } : t));
                              saveLocalCoords(task.id, null, null);
                              try {
                                await offlineUpdate('tasks', { id: task.id }, { quadrant: 'important_not_urgent' });
                                if (onTasksChanged) onTasksChanged();
                              } catch (err) {
                                console.error('Error moving untethered task back to Q2:', err);
                                fetchTasks();
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-void border border-blue-500/40 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer pointer-events-auto shrink-0"
                            title="Click to move back to Q2"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Move back to Q2?</span>
                          </button>
                        );
                      }
                      const suggestedQuad = computeSuggestedQuadrant(task);
                      if (suggestedQuad && suggestedQuad !== currentEffective) {
                        return (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: suggestedQuad, canvasX: null, canvasY: null } : t));
                              saveLocalCoords(task.id, null, null);
                              try {
                                await offlineUpdate('tasks', { id: task.id }, { quadrant: suggestedQuad });
                                if (onTasksChanged) onTasksChanged();
                              } catch (err) {
                                console.error('Error moving untethered task to suggested quadrant:', err);
                                fetchTasks();
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-gold/20 text-gold hover:bg-gold hover:text-void border border-gold/40 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer pointer-events-auto shrink-0"
                            title={`Click to move to ${QUADRANT_SHORT_NAMES[suggestedQuad]}`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Move to {QUADRANT_SHORT_NAMES[suggestedQuad]}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <span className={`px-1.5 py-0.5 rounded font-bold pointer-events-none ${
                      ioTag === 'IN' ? 'bg-[#1a263d] text-[#60a5fa]' : 'bg-stardust text-nova/60 border border-pulsar/40'
                    }`}>
                      {ioTag}
                    </span>
                    {totalSubtasksCount === 0 && taskEstimate && (
                      <span className="text-nova/60 bg-void/60 px-1 py-0.5 rounded border border-pulsar/40 pointer-events-none">
                        {taskEstimate}m
                      </span>
                    )}
                    {totalSubtasksCount > 0 && (
                      <span className="bg-pulsar/20 text-nova/80 px-1.5 py-0.5 rounded flex items-center gap-1 border border-pulsar/30 text-[9px]">
                        <List className="w-2.5 h-2.5" /> {doneSubtasksCount}/{totalSubtasksCount}
                      </span>
                    )}

                    {/* Retether & Hover Controls */}
                    <div className="hidden lg:group-hover:flex items-center gap-1 pl-1 border-l border-pulsar/40">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetether(task); }}
                        className="text-gold hover:text-white p-0.5"
                        title="Retether Node to Quadrant Cluster"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); returnToBrainDump(task.id); }}
                        className="text-nova/60 hover:text-starlight p-0.5"
                        title="Return to Brain Dump"
                      >
                        <Inbox className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                        className="text-nova/60 hover:text-emerald p-0.5"
                        title="Mark Done"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Left Sidebar: Restored Brain Dump Panel (Unsorted + Completed)      */}
      {/* ==================================================================== */}
      <aside className={`glass border-t md:border-t-0 md:border-r border-pulsar/30 flex flex-col h-auto md:h-full z-20 shadow-2xl transition-all duration-300 ${
        brainDumpCollapsed ? 'w-full md:w-12' : 'w-full md:w-80'
      }`}>
        {/* Brain Dump Header with BACKLOG & COMPLETED Sub-Tabs */}
        <div className={`border-b border-pulsar/30 bg-pulsar/10 flex items-center ${brainDumpCollapsed ? 'justify-center py-3' : 'px-4 py-3 justify-between gap-2'}`}>
          {!brainDumpCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 w-full pr-2">
              <Inbox className="w-4 h-4 text-gold shrink-0 hidden sm:block" />
              <div className="glass border border-pulsar/40 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 w-full">
                <button
                  onClick={() => { setActiveBrainDumpTab('backlog'); setStatusDropdownOpen(false); }}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'backlog'
                      ? 'bg-cosmic text-gold border border-gold/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title={`Backlog (${brainDumpTasks.length})`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold ">{brainDumpTasks.length}</span>
                </button>
                <button
                  onClick={() => { setActiveBrainDumpTab('completed'); setStatusDropdownOpen(false); }}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'completed'
                      ? 'bg-cosmic text-emerald border border-emerald/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title={`Completed (${completedTasks.length})`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold ">{completedTasks.length}</span>
                </button>
                <button
                  onClick={() => setActiveBrainDumpTab('details')}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'details'
                      ? 'bg-cosmic text-pulsar border border-pulsar/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title="Task Details"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setBrainDumpCollapsed(!brainDumpCollapsed)}
            className="text-nova/60 hover:text-starlight p-1 rounded-lg transition-colors hidden md:block shrink-0"
            title={brainDumpCollapsed ? "Expand Brain Dump" : "Collapse Brain Dump"}
          >
            {brainDumpCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!brainDumpCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeBrainDumpTab === 'backlog' ? (
              <>
                {/* Quick Capture Input (Zero Friction Brain Dump) */}
                <div className="px-4 py-3 border-b border-pulsar/30 space-y-2">
                  <form onSubmit={handleDumpTask} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Dump thoughts here (Press Enter)..."
                      className="w-full bg-stardust/50 border border-pulsar/40 focus:border-gold text-starlight text-xs rounded-lg px-3 py-2 outline-none font-['Inter']"
                    />
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0c0f14] font-display font-bold uppercase tracking-widest text-xs px-5 py-2 rounded-lg shrink-0 cursor-pointer shadow-md transition-all"
                    >
                      DUMP
                    </button>
                  </form>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-nova/60 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search backlog..."
                      className="w-full bg-void/60 border border-pulsar/40 text-starlight text-xs rounded-lg pl-8 pr-3 py-2 outline-none font-['Inter']"
                    />
                  </div>
                </div>

                {/* Unsorted Brain Dump Backlog Tasks */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
                  {brainDumpTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-xl font-['Inter']">
                      Brain Dump is clear! Type above to capture thoughts.
                    </div>
                  ) : (
                    brainDumpTasks.map((task) => {
                      const childTasks = tasks.filter(t => t.parent_task_id === task.id);
                      const incompleteSubtasks = childTasks.filter(t => t.status !== 'done');
                      const doneSubtasksCount = childTasks.filter(t => t.status === 'done').length;
                      const totalSubtasksCount = childTasks.length;
                      const remainingMinutes = incompleteSubtasks.reduce((sum, t) => sum + (t.time_estimate_minutes || t.estimated_minutes || 0), 0);
                      const taskEstimate = task.time_estimate_minutes || task.estimated_minutes;

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setActiveBrainDumpTab('details');
                          }}
                          className="group p-3 rounded-lg glass border border-pulsar/30 hover:border-gold/50 transition-all flex flex-col gap-1.5 shadow-sm cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-['Inter'] text-starlight leading-snug">
                              {task.title}
                            </span>
                            {task.mental_load && (
                              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                task.mental_load === 'low' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                                task.mental_load === 'high' ? 'bg-purple-950 text-purple-300 border border-purple-500/50' :
                                'bg-amber-950 text-amber-300 border border-amber-500/50'
                              }`}>
                                {task.mental_load === 'low' ? 'LOW LOAD' : task.mental_load === 'high' ? 'HIGH LOAD' : 'MED LOAD'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            {taskEstimate && totalSubtasksCount === 0 && (
                              <span className="text-nova/60 bg-void/60 px-1.5 py-0.5 rounded border border-pulsar/40 text-[10px]">
                                {taskEstimate}m
                              </span>
                            )}
                            {totalSubtasksCount > 0 && (
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="bg-pulsar/20 text-nova/80 px-1.5 py-0.5 rounded flex items-center gap-1 border border-pulsar/30">
                                  <List className="w-2.5 h-2.5" /> {doneSubtasksCount}/{totalSubtasksCount}
                                </span>
                                {remainingMinutes > 0 && (
                                  <span className="text-amber-400 border border-amber-500/30 bg-amber-950/40 px-1.5 py-0.5 rounded">
                                    {remainingMinutes}m
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-pulsar/30 text-xs font-mono">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-nova/60">Deploy:</span>
                              {autoQuadrantSuggest && (() => {
                                const suggestedQuad = computeSuggestedQuadrant(task);
                                if (suggestedQuad) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deployFromBrainDump(task, suggestedQuad);
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-gold/20 text-gold hover:bg-gold hover:text-void border border-gold/40 text-[9px] font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                                      title={`Click to deploy to suggested ${QUADRANT_SHORT_NAMES[suggestedQuad]}`}
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>{QUADRANT_SHORT_NAMES[suggestedQuad]}</span>
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'urgent_important'); }}
                                className="px-1.5 py-0.5 rounded bg-gold/15 text-gold hover:bg-gold hover:text-void transition-all font-bold"
                                title="Deploy to Urgent & Important"
                              >
                                U+I
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'important_not_urgent'); }}
                                className="px-1.5 py-0.5 rounded bg-pulsar/15 text-pulsar hover:bg-pulsar hover:text-void transition-all font-bold"
                                title="Deploy to Important (Schedule)"
                              >
                                Imp
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'urgent_not_important'); }}
                                className="px-1.5 py-0.5 rounded bg-aurora/15 text-aurora hover:bg-aurora hover:text-void transition-all font-bold"
                                title="Deploy to Urgent (Quick Wins)"
                              >
                                Urg
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'neither'); }}
                                className="px-1.5 py-0.5 rounded bg-dim/15 text-nova/60 hover:bg-dim hover:text-void transition-all font-bold"
                                title="Deploy to Neither (Backburner)"
                              >
                                Nei
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : activeBrainDumpTab === 'completed' ? (
              /* Completed Tasks List Tab */
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
                {completedTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-lg font-['Inter']">
                    No completed tasks yet.
                  </div>
                ) : (
                  completedTasks.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setActiveBrainDumpTab('details');
                      }}
                      className="flex items-center justify-between text-xs text-nova/60 p-3 rounded-lg glass border border-pulsar/30 cursor-pointer hover:border-emerald/50 transition-all"
                    >
                      <span className="truncate line-through text-nova/80">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); toggleDone(t); }} className="text-emerald hover:text-starlight p-1" title="Restore to Inbox">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }} className="text-nova/60 hover:text-red-400 p-1" title="Delete Task">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeBrainDumpTab === 'details' ? (
              /* DETAILS TAB */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide text-sm">
                {selectedTask ? (
                  <div key={selectedTask.id} className="flex flex-col gap-4 text-starlight">
                    {/* Linked Milestone or Parent Task Context */}
                    {selectedTask.milestone_id && (
                      <div className="bg-pulsar/10 border border-pulsar/30 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-pulsar shrink-0" />
                        <span className="text-nova/60 font-mono">Milestone:</span>
                        <span className="text-starlight truncate font-medium">
                          {milestones.find(m => m.id === selectedTask.milestone_id)?.title || selectedTask.milestone_id}
                        </span>
                      </div>
                    )}

                    {selectedTask.parent_task_id && (
                      <div className="bg-aurora/10 border border-aurora/30 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 text-aurora shrink-0" />
                        <span className="text-nova/60 font-mono">Parent Task:</span>
                        <span className="text-starlight truncate font-medium">
                          {tasks.find(t => t.id === selectedTask.parent_task_id)?.title || selectedTask.parent_task_id}
                        </span>
                      </div>
                    )}

                    {/* Mental Load Badge */}
                    {selectedTask.mental_load && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded font-bold tracking-wider ${
                          selectedTask.mental_load === 'low' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' :
                          selectedTask.mental_load === 'high' ? 'bg-purple-950 text-purple-300 border border-purple-500' :
                          'bg-amber-950 text-amber-300 border border-amber-500'
                        }`}>
                          {selectedTask.mental_load === 'low' ? 'LOW LOAD' : selectedTask.mental_load === 'high' ? 'HIGH LOAD' : 'MED LOAD'}
                        </span>
                        {autoQuadrantSuggest && (() => {
                          const suggestedQuad = computeSuggestedQuadrant(selectedTask);
                          if (suggestedQuad && suggestedQuad !== selectedTask.quadrant) {
                            return (
                              <button
                                type="button"
                                onClick={() => updateTaskField(selectedTask.id, 'quadrant', suggestedQuad)}
                                className="px-2 py-1 rounded bg-gold/20 text-gold hover:bg-gold hover:text-void border border-gold/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title={`Click to move to ${QUADRANT_SHORT_NAMES[suggestedQuad]}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Move to {QUADRANT_SHORT_NAMES[suggestedQuad]}</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Start Focus Now Action */}
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('polaris-start-task', { detail: { task: selectedTask } }));
                      }}
                      className="w-full py-2.5 px-4 bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0c0f14] font-display font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Focus Now
                    </button>

                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono ">Title</h4>
                      <input 
                        type="text" 
                        defaultValue={selectedTask.title || ''} 
                        onBlur={(e) => updateTaskField(selectedTask.id, 'title', e.target.value)}
                        className="w-full bg-void/40 border border-pulsar/40 rounded-lg p-3 text-sm font-['Inter'] leading-relaxed outline-none focus:border-pulsar/50 transition-colors"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono ">Notes</h4>
                      <textarea
                        defaultValue={selectedTask.notes || ''}
                        onBlur={(e) => updateTaskField(selectedTask.id, 'notes', e.target.value)}
                        rows={4}
                        className="w-full bg-void/40 border border-pulsar/40 rounded-lg p-3 text-xs font-['Inter'] leading-relaxed whitespace-pre-wrap outline-none focus:border-pulsar/50 transition-colors resize-none"
                        placeholder="Add notes..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Quadrant */}
                      <div className="col-span-1">
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Quad</h4>
                        <div className="bg-void/40 border border-pulsar/40 rounded-lg px-2 py-1.5 text-xs flex items-center focus-within:border-pulsar/50 transition-colors">
                          <select
                            value={selectedTask.quadrant || ''}
                            onChange={(e) => updateTaskField(selectedTask.id, 'quadrant', e.target.value || null)}
                            className="bg-transparent w-full outline-none font-mono text-starlight cursor-pointer"
                          >
                            <option value="" className="bg-void text-nova/60">--</option>
                            <option value="urgent_important" className="bg-void text-amber-400">Q1</option>
                            <option value="important_not_urgent" className="bg-void text-blue-400">Q2</option>
                            <option value="urgent_not_important" className="bg-void text-purple-400">Q3</option>
                            <option value="neither" className="bg-void text-emerald-400">Q4</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Mental Load */}
                      <div className="col-span-1">
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Mental Load</h4>
                        <div className="bg-void/40 border border-pulsar/40 rounded-lg px-2 py-1.5 text-xs flex items-center focus-within:border-pulsar/50 transition-colors">
                          <select
                            value={selectedTask.mental_load || ''}
                            onChange={(e) => updateTaskField(selectedTask.id, 'mental_load', e.target.value || null)}
                            className="bg-transparent w-full outline-none font-mono text-starlight cursor-pointer"
                          >
                            <option value="" className="bg-void text-nova/60">None</option>
                            <option value="low" className="bg-void text-emerald-400">Low</option>
                            <option value="medium" className="bg-void text-amber-400">Medium</option>
                            <option value="high" className="bg-void text-purple-400">High</option>
                          </select>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 relative">
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Status</h4>
                        <button
                          type="button"
                          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                          className={`w-full bg-void/40 border ${statusDropdownOpen ? 'border-pulsar/50' : 'border-pulsar/40'} rounded-lg px-2 py-1.5 text-[11px] flex items-center justify-between transition-colors outline-none cursor-pointer`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {selectedTask.status === 'done' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />
                            ) : selectedTask.status === 'in_progress' ? (
                              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : selectedTask.status === 'scheduled' ? (
                              <Calendar className="w-3.5 h-3.5 text-pulsar shrink-0" />
                            ) : selectedTask.status === 'inbox' ? (
                              <Inbox className="w-3.5 h-3.5 text-nova/60 shrink-0" />
                            ) : (
                              <Flame className="w-3.5 h-3.5 text-pulsar shrink-0" />
                            )}
                            <span className="text-starlight truncate">
                              {selectedTask.status === 'in_progress' ? 'Prog' :
                               selectedTask.status === 'done' ? 'Done' :
                               selectedTask.status === 'scheduled' ? 'Schd' :
                               selectedTask.status === 'inbox' ? 'Inbox' : 'Active'}
                            </span>
                          </div>
                          <ChevronDown className={`w-3 h-3 text-nova/60 shrink-0 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {statusDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(false); }} />
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full mt-2 left-0 right-0 bg-[#0a0f1e]/95 backdrop-blur-xl border border-blue-900/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 overflow-hidden py-1"
                              >
                                {[
                                  { value: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-nova/60' },
                                  { value: 'active', label: 'Active', icon: Flame, color: 'text-pulsar' },
                                  { value: 'in_progress', label: 'In Progress', icon: Zap, color: 'text-amber-400' },
                                  { value: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'text-pulsar' },
                                  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald' }
                                ].map(option => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      updateTaskField(selectedTask.id, 'status', option.value);
                                      setStatusDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                                      selectedTask.status === option.value ? 'bg-pulsar/20 text-starlight' : 'text-nova/60 hover:bg-blue-900/30 hover:text-starlight'
                                    }`}
                                  >
                                    <option.icon className={`w-3.5 h-3.5 shrink-0 ${option.color}`} />
                                    <span>{option.label}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Time Estimate Input */}
                    <div className="mt-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Time Estimate (minutes)</h4>
                      <div className="bg-void/40 border border-pulsar/40 rounded-lg px-2 py-1.5 text-xs flex items-center gap-1.5 focus-within:border-pulsar/50 transition-colors">
                        <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
                        <input
                          type="number"
                          min="0"
                          defaultValue={selectedTask.time_estimate_minutes != null ? selectedTask.time_estimate_minutes : (selectedTask.estimated_minutes != null ? selectedTask.estimated_minutes : '')}
                          onBlur={(e) => handleEstimateChange(selectedTask.id, e.target.value)}
                          className="bg-transparent w-full outline-none font-mono text-starlight"
                          placeholder="e.g. 30"
                        />
                      </div>
                    </div>
                    {/* Deadline */}
                    <div className="mt-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Deadline</h4>
                      <div className="bg-void/40 border border-pulsar/40 rounded-lg px-2 py-1.5 text-xs flex items-center gap-1.5 focus-within:border-pulsar/50 transition-colors">
                        <Calendar className="w-3.5 h-3.5 text-pulsar shrink-0" />
                        <input
                          type="date"
                          defaultValue={selectedTask.deadline || ''}
                          onBlur={(e) => updateTaskField(selectedTask.id, 'deadline', e.target.value || null)}
                          className="bg-transparent w-full outline-none text-starlight cursor-pointer min-w-[130px] font-sans"
                        />
                      </div>
                    </div>
                    {/* Category */}
                    <div className="mt-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono">Category</h4>
                      <div className="bg-void/40 border border-pulsar/40 rounded-lg px-2 py-1.5 text-xs flex items-center gap-1.5 focus-within:border-pulsar/50 transition-colors">
                        <select
                          value={selectedTask.category || 'normal'}
                          onChange={(e) => updateTaskField(selectedTask.id, 'category', e.target.value === 'normal' ? null : e.target.value)}
                          className="bg-transparent w-full outline-none text-starlight cursor-pointer font-sans"
                        >
                          <option value="normal" className="bg-void">Normal Task</option>
                          <option value="polaris" className="bg-void">Polaris Edit / Building</option>
                          <option value="reminders" className="bg-void">Reminders</option>
                        </select>
                      </div>
                    </div>

                    {/* Repeat Daily / Recurring Toggle */}
                    <div className="mt-2 p-3 rounded-xl bg-void/40 border border-pulsar/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isRecurringActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-void text-nova/50 border border-pulsar/20'}`}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label htmlFor="repeat-daily-toggle" className="text-xs font-display text-starlight font-medium block cursor-pointer">
                            Repeat Daily / Recurring
                          </label>
                          <span className="text-[10px] font-mono text-nova/60">
                            {isRecurringActive ? 'Active daily recurring routine' : 'One-time task'}
                          </span>
                        </div>
                      </div>
                      <button
                        id="repeat-daily-toggle"
                        type="button"
                        role="switch"
                        aria-checked={isRecurringActive}
                        onClick={() => handleToggleRecurring(!isRecurringActive)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isRecurringActive ? 'bg-[#f5a623]' : 'bg-pulsar/30'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0c0f14] shadow ring-0 transition duration-200 ease-in-out ${
                            isRecurringActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Subtasks Section */}
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-nova/60 font-mono">
                          Subtasks ({selectedSubtasks.filter(t => t.status === 'done').length}/{selectedSubtasks.length})
                        </h4>
                      </div>

                      <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Add a subtask..."
                          className="flex-1 bg-void/40 border border-pulsar/40 rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-pulsar/50"
                        />
                        <button
                          type="submit"
                          disabled={!newSubtaskTitle.trim()}
                          className="px-2.5 py-1.5 bg-pulsar/20 text-pulsar hover:bg-pulsar/30 disabled:opacity-40 rounded-lg text-xs font-mono transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </form>

                      {selectedSubtasks.length > 0 && (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {selectedSubtasks.map((st, idx) => {
                            const isSubDone = st.status === 'done';
                            const isActive = !isSubDone && selectedActiveSubtask && selectedActiveSubtask.id === st.id;
                            const stEstimate = st.time_estimate_minutes || st.estimated_minutes;

                            return (
                              <div
                                key={st.id}
                                className={`group p-2.5 rounded-lg border text-xs transition-all ${
                                  isActive
                                    ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                                    : isSubDone
                                      ? 'bg-void/20 border-pulsar/15'
                                      : 'bg-void/30 border-pulsar/20 hover:border-pulsar/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleDone(st)}
                                      className="mt-0.5 shrink-0 text-left cursor-pointer"
                                      aria-label={isSubDone ? 'Mark incomplete' : 'Mark complete'}
                                    >
                                      <span className={`font-mono font-bold ${isSubDone ? 'text-emerald' : 'text-nova/60'}`}>
                                        {isSubDone ? '✓' : '○'}
                                      </span>
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`break-words text-xs leading-snug ${isSubDone ? 'text-slate-400 line-through' : 'text-starlight font-medium'}`}>
                                          {st.title}
                                        </span>

                                        {isActive && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[9px] font-semibold tracking-wide shrink-0">
                                            Next Action
                                          </span>
                                        )}

                                        {!isSubDone && !isActive && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetNextAction(st)}
                                            className="opacity-0 group-hover:opacity-100 px-1.5 py-0.2 rounded bg-pulsar/20 hover:bg-pulsar hover:text-void text-pulsar border border-pulsar/30 font-mono text-[9px] font-medium transition-all cursor-pointer shrink-0"
                                          >
                                            Set as Next Action
                                          </button>
                                        )}

                                        {st.mental_load && !isSubDone && (
                                          <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase shrink-0 ${
                                            st.mental_load === 'low' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' :
                                            st.mental_load === 'high' ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40' :
                                            'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                          }`}>
                                            {st.mental_load}
                                          </span>
                                        )}

                                        {stEstimate && !isSubDone && (
                                          <span className="px-1.5 py-0.2 rounded font-mono text-[9px] text-nova/70 bg-void/40 border border-pulsar/30 shrink-0">
                                            {stEstimate}m
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {!isSubDone && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await handleSetNextAction(st);
                                          window.dispatchEvent(new CustomEvent('polaris-start-task', { detail: { task: st } }));
                                        }}
                                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 p-1 rounded transition-colors"
                                        title="Start Focus on Subtask"
                                        aria-label="Start Focus on Subtask"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      </button>
                                    )}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveSubtask(st.id, 'up')}
                                        className="text-nova/50 hover:text-starlight disabled:opacity-20 p-0.5"
                                        title="Move Up"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === selectedSubtasks.length - 1}
                                        onClick={() => handleMoveSubtask(st.id, 'down')}
                                        className="text-nova/50 hover:text-starlight disabled:opacity-20 p-0.5"
                                        title="Move Down"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteTask(st.id)}
                                        className="text-nova/60 hover:text-red-400 p-0.5 ml-0.5"
                                        title="Delete Subtask"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Delete Task Button */}
                    <div className="pt-4 mt-2 border-t border-pulsar/30 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            deleteTask(selectedTask.id);
                            setSelectedTaskId(null);
                            setStatusDropdownOpen(false);
                            setActiveBrainDumpTab('backlog');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Task
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-xl font-['Inter'] mt-4">
                    Select a task from the matrix or backlog to view its details.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
