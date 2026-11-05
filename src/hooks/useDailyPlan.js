import { useState, useEffect, useRef, useCallback } from 'react';
import { liveQuery } from 'dexie';
import db from '../lib/offlineStore';
import { useAuth } from './useAuth';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete, generateUUID } from '../lib/offlineApi';
import { playChime } from '../lib/sound';
import { estimateDurationHeuristic, classifyTaskType, applyPlanXpDelta } from '../lib/dayGuidePersistence';
import { 
  createDailyPlanIfMissing, 
  executeSprintCCutover, 
  recomputeTargetBoxes, 
  selectSubtasksForSlot 
} from '../lib/dayPlanCreator';

/**
 * Focus session logger.
 * Single writer pattern: logs focus increments to pomodoro_logs and io_logs with plan_id.
 */
export async function logFocusSession({
  userId,
  planId,
  taskId,
  durationMinutes = 15,
  source = 'manual',
  taskType = 'output',
  category = 'other',
  label = ''
}) {
  if (!userId) return;
  const now = new Date().toISOString();
  const todayStr = new Date().toLocaleDateString('en-CA');

  try {
    await offlineInsert('pomodoro_logs', {
      id: generateUUID(),
      user_id: userId,
      task_id: taskId || null,
      date: todayStr,
      duration_minutes: durationMinutes,
      label: label || 'Daily Plan Focus',
      plan_id: planId || null,
      source,
      created_at: now
    });

    await offlineInsert('io_logs', {
      id: generateUUID(),
      user_id: userId,
      date: todayStr,
      minutes: durationMinutes,
      type: taskType,
      category: category || 'other',
      plan_id: planId || null,
      created_at: now
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-io-logs-changed', { detail: { table: 'io_logs' } }));
    }
  } catch (err) {
    console.warn('[useDailyPlan] Error logging focus session:', err);
  }
}

/**
 * Removes the most recent focus log associated with planId on untick.
 */
export async function removeFocusSession({ userId, planId }) {
  if (!userId || !planId) return;
  try {
    const pomoRes = await offlineSelect('pomodoro_logs', { user_id: userId, plan_id: planId });
    const pomoLogs = pomoRes?.data || [];
    if (pomoLogs.length > 0) {
      const sorted = [...pomoLogs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      await offlineDelete('pomodoro_logs', { id: sorted[0].id, user_id: userId });
    }

    const ioRes = await offlineSelect('io_logs', { user_id: userId, plan_id: planId });
    const ioLogs = ioRes?.data || [];
    if (ioLogs.length > 0) {
      const sortedIo = [...ioLogs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      await offlineDelete('io_logs', { id: sortedIo[0].id, user_id: userId });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-io-logs-changed', { detail: { table: 'io_logs' } }));
    }
  } catch (err) {
    console.warn('[useDailyPlan] Error removing focus session:', err);
  }
}

/**
 * Primary reactive hook for daily plan board state.
 * Observes db.daily_plan, db.daily_plan_items, and db.tasks via Dexie liveQuery.
 * Zero localStorage plan state. Every user action is exactly one local write + one sync queue item.
 */
export function useDailyPlan(initialTodayStr) {
  const { user, addXP } = useAuth();
  const userId = user?.id;

  const [activeTodayStr, setActiveTodayStr] = useState(
    () => initialTodayStr || new Date().toLocaleDateString('en-CA')
  );

  const [liveState, setLiveState] = useState({
    plans: [],
    itemsByPlanId: {},
    tasksById: {},
    childSubtasksByParentId: {},
    loaded: false
  });

  const [undoState, setUndoState] = useState(null);
  const undoTimerRef = useRef(null);
  const isInitializingRef = useRef(false);

  // Sync if initialTodayStr changes
  useEffect(() => {
    if (initialTodayStr && initialTodayStr !== activeTodayStr) {
      setActiveTodayStr(initialTodayStr);
    }
  }, [initialTodayStr]);

  // Midnight rollover timer and visibility listener
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const current = new Date().toLocaleDateString('en-CA');
        setActiveTodayStr(prev => (prev !== current ? current : prev));
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // Local midnight timer
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
    const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

    const midnightTimer = setTimeout(() => {
      const nextDate = new Date().toLocaleDateString('en-CA');
      setActiveTodayStr(nextDate);
    }, msUntilMidnight);

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      clearTimeout(midnightTimer);
    };
  }, [activeTodayStr]);

  // Dexie liveQuery observation
  useEffect(() => {
    if (!userId || !db?.daily_plan || !db?.daily_plan_items || !db?.tasks) {
      setLiveState(prev => ({ ...prev, loaded: true }));
      return;
    }

    const observable = liveQuery(async () => {
      // 1. Fetch plans for today
      const allUserPlans = await db.daily_plan.where('user_id').equals(userId).toArray();
      const plans = allUserPlans
        .filter(p => p.plan_date === activeTodayStr)
        .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

      if (plans.length === 0) {
        return {
          plans: [],
          itemsByPlanId: {},
          tasksById: {},
          childSubtasksByParentId: {},
          loaded: true
        };
      }

      // 2. Fetch items for current plans
      const planIds = new Set(plans.map(p => p.id));
      const allItems = await db.daily_plan_items.where('user_id').equals(userId).toArray();
      const currentItems = allItems.filter(i => planIds.has(i.plan_id));
      currentItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      const itemsByPlanId = {};
      plans.forEach(p => { itemsByPlanId[p.id] = []; });
      currentItems.forEach(i => {
        if (itemsByPlanId[i.plan_id]) {
          itemsByPlanId[i.plan_id].push(i);
        }
      });

      // 3. Fetch referenced tasks and child subtasks
      const taskIds = new Set();
      plans.forEach(p => { if (p.task_id) taskIds.add(p.task_id); });
      currentItems.forEach(i => { if (i.task_id) taskIds.add(i.task_id); });

      const allUserTasks = await db.tasks.where('user_id').equals(userId).toArray();
      const tasksById = {};
      const childSubtasksByParentId = {};

      allUserTasks.forEach(t => {
        tasksById[t.id] = t;
        if (t.parent_task_id) {
          if (!childSubtasksByParentId[t.parent_task_id]) {
            childSubtasksByParentId[t.parent_task_id] = [];
          }
          childSubtasksByParentId[t.parent_task_id].push(t);
        }
      });

      return {
        plans,
        itemsByPlanId,
        tasksById,
        childSubtasksByParentId,
        loaded: true
      };
    });

    const subscription = observable.subscribe({
      next: (val) => setLiveState(val),
      error: (err) => {
        console.error('[useDailyPlan] liveQuery error:', err);
        setLiveState(prev => ({ ...prev, loaded: true }));
      }
    });

    return () => subscription.unsubscribe();
  }, [userId, activeTodayStr]);

  // Automatic Plan Initialization & Cutover
  useEffect(() => {
    if (!userId || !liveState.loaded || isInitializingRef.current) return;
    const hasLegacyLeafPlans = liveState.plans?.some(p => {
      const t = liveState.tasksById[p.task_id];
      return t && t.parent_task_id !== null;
    });

    if (liveState.plans && liveState.plans.length > 0 && !hasLegacyLeafPlans) return;

    isInitializingRef.current = true;
    (async () => {
      try {
        await executeSprintCCutover({ userId, todayStr: activeTodayStr });
        await createDailyPlanIfMissing({ userId, todayStr: activeTodayStr });
      } catch (err) {
        console.error('[useDailyPlan] Initialization error:', err);
      } finally {
        isInitializingRef.current = false;
      }
    })();
  }, [userId, activeTodayStr, liveState.loaded, liveState.plans]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Set undo timer helper
  const triggerUndoToast = useCallback((undoData) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState(undoData);
    undoTimerRef.current = setTimeout(() => {
      setUndoState(null);
      undoTimerRef.current = null;
    }, 6000);
  }, []);

  // Core Action: tickBox
  const tickBox = useCallback(async (slotNumber, { source = 'manual' } = {}) => {
    if (!userId) return;
    const plan = liveState.plans.find(p => p.slot === slotNumber);
    if (!plan) return;

    const items = liveState.itemsByPlanId[plan.id] || [];
    const parentTask = liveState.tasksById[plan.task_id] || null;
    const allChildSubtasks = liveState.childSubtasksByParentId[plan.task_id] || [];

    // done_boxes is the single source of truth: ticking advances by 1
    const nextDoneBoxes = (plan.done_boxes || 0) + 1;

    // XP Delta
    const { nextXpAwarded } = await applyPlanXpDelta(plan, nextDoneBoxes, addXP);

    const isClearing = nextDoneBoxes >= plan.target_boxes;
    let nextStatus = plan.status;
    let nextAutoCompleted = plan.auto_completed;
    const subtasksCompletedBySlot = [];

    if (isClearing && plan.status !== 'cleared') {
      nextStatus = 'cleared';
      nextAutoCompleted = true;
      playChime('success');

      // Auto-complete chosen subtasks that are not yet done
      for (const item of items) {
        const subtask = liveState.tasksById[item.task_id];
        if (subtask && subtask.status !== 'done' && !subtask.completed) {
          await offlineUpdate('daily_plan_items', { id: item.id }, { completed_by_slot: true });
          await offlineUpdate('tasks', { id: subtask.id }, { status: 'done', completed: true });
          subtasksCompletedBySlot.push(subtask.id);
        }
      }

      // Check Parent Task Completion Rule:
      // Parent completes ONLY IF all child subtasks are done
      let parentCompletedBySlot = false;
      if (allChildSubtasks.length > 0) {
        const allCompleted = allChildSubtasks.every(st => {
          if (subtasksCompletedBySlot.includes(st.id)) return true;
          return st.status === 'done' || st.completed === true;
        });
        if (allCompleted && parentTask && parentTask.status !== 'done') {
          await offlineUpdate('tasks', { id: parentTask.id }, { status: 'done', completed: true });
          parentCompletedBySlot = true;
        }
      } else if (parentTask && parentTask.status !== 'done') {
        // Standalone task
        await offlineUpdate('tasks', { id: parentTask.id }, { status: 'done', completed: true });
        parentCompletedBySlot = true;
      }

      // Arm 6-second undo toast
      triggerUndoToast({
        type: 'clear',
        planId: plan.id,
        slotNumber,
        prevDoneBoxes: plan.done_boxes || 0,
        prevStatus: plan.status,
        prevAutoCompleted: plan.auto_completed,
        prevXpAwarded: plan.xp_awarded || 0,
        subtasksCompleted: subtasksCompletedBySlot,
        parentCompleted: parentCompletedBySlot,
        parentTaskId: parentTask?.id
      });
    }

    // Update daily_plan row in place (done_boxes single source of truth)
    await offlineUpdate('daily_plan', { id: plan.id }, {
      done_boxes: nextDoneBoxes,
      xp_awarded: nextXpAwarded,
      status: nextStatus,
      auto_completed: nextAutoCompleted,
      updated_at: new Date().toISOString()
    });

    // Central focus logging
    const displayLabel = parentTask?.title || 'Daily Plan Focus';
    await logFocusSession({
      userId,
      planId: plan.id,
      taskId: plan.task_id,
      durationMinutes: 15,
      source,
      taskType: classifyTaskType(parentTask),
      category: parentTask?.category || 'other',
      label: displayLabel
    });
  }, [userId, liveState, addXP, triggerUndoToast]);

  // Core Action: untickBox
  const untickBox = useCallback(async (slotNumber) => {
    if (!userId) return;
    const plan = liveState.plans.find(p => p.slot === slotNumber);
    if (!plan) return;

    const items = liveState.itemsByPlanId[plan.id] || [];
    const parentTask = liveState.tasksById[plan.task_id] || null;

    // done_boxes is the single source of truth: unticking lowers by 1 (floor 0)
    // and stays lowered even if ticked subtasks cover more boxes
    const nextDoneBoxes = Math.max(0, (plan.done_boxes || 0) - 1);

    // XP Delta
    const { nextXpAwarded } = await applyPlanXpDelta(plan, nextDoneBoxes, addXP);

    let nextStatus = plan.status;
    let nextAutoCompleted = plan.auto_completed;

    // If slot was cleared and now drops below target_boxes, revert slot
    if (plan.status === 'cleared' && nextDoneBoxes < plan.target_boxes) {
      nextStatus = 'planned';
      nextAutoCompleted = false;

      // Selective Reversible Untick:
      // Reopen ONLY subtasks where completed_by_slot === true
      for (const item of items) {
        if (item.completed_by_slot) {
          await offlineUpdate('daily_plan_items', { id: item.id }, { completed_by_slot: false });
          await offlineUpdate('tasks', { id: item.task_id }, { status: 'in_progress', completed: false });
        }
      }

      // Reopen parent if it was completed
      if (parentTask && (parentTask.status === 'done' || parentTask.completed === true)) {
        await offlineUpdate('tasks', { id: parentTask.id }, { status: 'in_progress', completed: false });
      }
    }

    // Update daily_plan row in place
    await offlineUpdate('daily_plan', { id: plan.id }, {
      done_boxes: nextDoneBoxes,
      xp_awarded: nextXpAwarded,
      status: nextStatus,
      auto_completed: nextAutoCompleted,
      updated_at: new Date().toISOString()
    });

    // Remove focus session log
    await removeFocusSession({ userId, planId: plan.id });
  }, [userId, liveState, addXP]);

  // Core Action: toggleSubtask
  const toggleSubtask = useCallback(async (slotNumber, subtaskId) => {
    if (!userId) return;
    const plan = liveState.plans.find(p => p.slot === slotNumber);
    if (!plan) return;

    const items = liveState.itemsByPlanId[plan.id] || [];
    const parentTask = liveState.tasksById[plan.task_id] || null;
    const subtask = liveState.tasksById[subtaskId];
    const item = items.find(i => i.task_id === subtaskId);
    if (!subtask || !item) return;

    const isNowDone = subtask.status !== 'done' && !subtask.completed;

    // Update subtask
    await offlineUpdate('tasks', { id: subtaskId }, {
      status: isNowDone ? 'done' : 'in_progress',
      completed: isNowDone
    });

    // Manual click always sets completed_by_slot to false
    await offlineUpdate('daily_plan_items', { id: item.id }, { completed_by_slot: false });

    // Recalculate subtask boxes
    const tickedSubtaskMinutes = items.reduce((acc, it) => {
      const isDone = it.task_id === subtaskId
        ? isNowDone
        : (liveState.tasksById[it.task_id]?.status === 'done' || liveState.tasksById[it.task_id]?.completed);
      if (isDone) {
        const t = liveState.tasksById[it.task_id];
        return acc + (t?.estimated_minutes || t?.time_estimate_minutes || 15);
      }
      return acc;
    }, 0);

    const subtaskBoxes = Math.ceil(tickedSubtaskMinutes / 15);
    const currentDone = plan.done_boxes || 0;
    // Checking a subtask sets done_boxes = max(done_boxes, ceil(sum of ticked subtask minutes / 15))
    // Unticking a box lowers done_boxes and it must stay lowered even if ticked subtasks cover more boxes
    const nextDoneBoxes = isNowDone ? Math.max(currentDone, subtaskBoxes) : currentDone;

    // XP Delta
    const { nextXpAwarded } = await applyPlanXpDelta(plan, nextDoneBoxes, addXP);

    let nextStatus = plan.status;
    let nextAutoCompleted = plan.auto_completed;

    if (nextDoneBoxes >= plan.target_boxes && plan.status !== 'cleared') {
      nextStatus = 'cleared';
      nextAutoCompleted = true;
      playChime('success');
    } else if (nextDoneBoxes < plan.target_boxes && plan.status === 'cleared') {
      nextStatus = 'planned';
      nextAutoCompleted = false;
    }

    // Check parent task completion rule
    const allChildSubtasks = liveState.childSubtasksByParentId[plan.task_id] || [];
    if (allChildSubtasks.length > 0) {
      const allDone = allChildSubtasks.every(st => {
        if (st.id === subtaskId) return isNowDone;
        return st.status === 'done' || st.completed === true;
      });
      if (allDone && parentTask?.status !== 'done') {
        await offlineUpdate('tasks', { id: parentTask.id }, { status: 'done', completed: true });
      } else if (!allDone && parentTask?.status === 'done') {
        await offlineUpdate('tasks', { id: parentTask.id }, { status: 'in_progress', completed: false });
      }
    }

    // Update daily_plan row in place
    await offlineUpdate('daily_plan', { id: plan.id }, {
      done_boxes: nextDoneBoxes,
      xp_awarded: nextXpAwarded,
      status: nextStatus,
      auto_completed: nextAutoCompleted,
      updated_at: new Date().toISOString()
    });
  }, [userId, liveState, addXP]);

  // Core Action: swapSlot (In-place update of the same daily_plan row)
  const swapSlot = useCallback(async (slotNumber, newParentTaskId) => {
    if (!userId || !newParentTaskId) return;
    const plan = liveState.plans.find(p => p.slot === slotNumber);
    if (!plan) return;

    const oldTaskId = plan.task_id;
    const newParentTask = liveState.tasksById[newParentTaskId];
    if (!newParentTask) return;

    // 1. Delete old daily_plan_items for this plan
    const oldItems = liveState.itemsByPlanId[plan.id] || [];
    for (const it of oldItems) {
      await offlineDelete('daily_plan_items', { id: it.id, user_id: userId });
    }

    // 2. Select subtasks for the new parent task
    const openSubtasks = (liveState.childSubtasksByParentId[newParentTaskId] || []).filter(
      st => st.status !== 'done' && st.completed !== true
    );
    const slotType = slotNumber === 1 ? 'anchor' : (slotNumber === 4 ? 'bonus' : 'support');
    const { chosenSubtasks, targetBoxes } = await selectSubtasksForSlot(newParentTask, openSubtasks, slotType);

    // 3. Update the same daily_plan row in place
    // swapped_from = oldTaskId (references tasks.id)
    await offlineUpdate('daily_plan', { id: plan.id }, {
      task_id: newParentTaskId,
      swapped_from: oldTaskId,
      target_boxes: targetBoxes,
      done_boxes: 0,
      status: 'planned',
      auto_completed: false,
      xp_awarded: 0,
      updated_at: new Date().toISOString()
    });

    // 4. Insert new daily_plan_items
    for (let i = 0; i < chosenSubtasks.length; i++) {
      const st = chosenSubtasks[i];
      await offlineInsert('daily_plan_items', {
        id: generateUUID(),
        user_id: userId,
        plan_id: plan.id,
        task_id: st.id,
        position: i,
        completed_by_slot: false,
        created_at: new Date().toISOString()
      });
    }
  }, [userId, liveState]);

  // Core Action: recomputeSlotTarget
  const recomputeSlotTarget = useCallback(async (slotNumber) => {
    if (!userId) return;
    const plan = liveState.plans.find(p => p.slot === slotNumber);
    if (!plan) return;

    const items = liveState.itemsByPlanId[plan.id] || [];
    const chosenSubtasks = items.map(i => liveState.tasksById[i.task_id]).filter(Boolean);
    const parentTask = liveState.tasksById[plan.task_id] || null;

    const nextTarget = recomputeTargetBoxes(chosenSubtasks, parentTask);
    if (nextTarget !== plan.target_boxes) {
      await offlineUpdate('daily_plan', { id: plan.id }, {
        target_boxes: nextTarget,
        updated_at: new Date().toISOString()
      });
    }
  }, [userId, liveState]);

  // Core Action: undoLastAction
  const undoLastAction = useCallback(async () => {
    if (!userId || !undoState) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const {
      planId,
      prevDoneBoxes,
      prevStatus,
      prevAutoCompleted,
      prevXpAwarded,
      subtasksCompleted,
      parentCompleted,
      parentTaskId
    } = undoState;

    const plan = liveState.plans.find(p => p.id === planId);
    if (plan) {
      // Revert daily_plan row
      await offlineUpdate('daily_plan', { id: planId }, {
        done_boxes: prevDoneBoxes,
        status: prevStatus,
        auto_completed: prevAutoCompleted,
        xp_awarded: prevXpAwarded,
        updated_at: new Date().toISOString()
      });

      // Deduct XP delta if any
      const xpDelta = prevXpAwarded - (plan.xp_awarded || 0);
      if (xpDelta !== 0 && typeof addXP === 'function') {
        await addXP(xpDelta);
      }

      // Reopen auto-completed subtasks
      if (subtasksCompleted && subtasksCompleted.length > 0) {
        for (const stId of subtasksCompleted) {
          const item = (liveState.itemsByPlanId[planId] || []).find(i => i.task_id === stId);
          if (item) {
            await offlineUpdate('daily_plan_items', { id: item.id }, { completed_by_slot: false });
          }
          await offlineUpdate('tasks', { id: stId }, { status: 'in_progress', completed: false });
        }
      }

      // Reopen parent task if it was completed by slot
      if (parentCompleted && parentTaskId) {
        await offlineUpdate('tasks', { id: parentTaskId }, { status: 'in_progress', completed: false });
      }

      // Remove focus log
      await removeFocusSession({ userId, planId });
    }

    setUndoState(null);
  }, [userId, undoState, liveState, addXP]);

  // Build normalized slot objects for the board view
  const slots = [1, 2, 3, 4].map(slotNumber => {
    const plan = liveState.plans.find(p => p.slot === slotNumber) || null;
    if (!plan) return null;

    const parentTask = liveState.tasksById[plan.task_id] || null;
    const items = (liveState.itemsByPlanId[plan.id] || []).map(item => ({
      item,
      task: liveState.tasksById[item.task_id] || null
    }));

    const chosenSubtasks = items.map(i => i.task).filter(Boolean);
    const allChildSubtasks = liveState.childSubtasksByParentId[plan.task_id] || [];

    const totalMinutes = chosenSubtasks.length > 0
      ? chosenSubtasks.reduce((acc, st) => acc + (st.estimated_minutes || st.time_estimate_minutes || 15), 0)
      : (parentTask?.estimated_minutes || parentTask?.time_estimate_minutes || 30);

    const remainderMinutes = totalMinutes % 15 !== 0 ? (totalMinutes % 15) : 0;
    const targetBoxes = plan.target_boxes || Math.max(1, Math.ceil(totalMinutes / 15));
    // done_boxes is the single source of truth from daily_plan row
    const doneBoxes = plan.done_boxes || 0;

    return {
      slot: slotNumber,
      plan,
      parentTask,
      items,
      chosenSubtasks,
      allChildSubtasks,
      targetBoxes,
      doneBoxes,
      totalMinutes,
      remainderMinutes,
      isCleared: plan.status === 'cleared' || doneBoxes >= targetBoxes,
      status: plan.status,
      type: slotNumber === 1 ? 'anchor' : (slotNumber === 4 ? 'bonus' : 'support')
    };
  }).filter(Boolean);

  return {
    todayStr: activeTodayStr,
    slots,
    loading: !liveState.loaded,
    undoState,
    tickBox,
    untickBox,
    toggleSubtask,
    swapSlot,
    recomputeSlotTarget,
    undoLastAction
  };
}
