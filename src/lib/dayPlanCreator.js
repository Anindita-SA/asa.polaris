import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete, generateUUID } from './offlineApi';
import { estimateDurationHeuristic } from './dayGuidePersistence';
import db from './offlineStore';

export const QUADRANT_WEIGHTS = {
  urgent_important: 4,
  important_not_urgent: 3,
  urgent_not_important: 2,
  neither: 1,
};

export const SLOT_CAPS = {
  anchor: 120, // 120 minutes default for Anchor (Slot 1)
  support: 30, // 30 minutes default for Support (Slots 2 and 3)
  bonus: 30    // 30 minutes default for Bonus (Slot 4)
};

/**
 * Computes deterministic priority score for a task.
 * Formula: Score = Value + Urgency + RolloverBonus
 * Size is explicitly removed from score denominator. Size only determines slot fit.
 */
export function computeDeterministicScore(task, todayStr = new Date().toLocaleDateString('en-CA')) {
  if (!task) return { score: 0, value: 0, urgency: 0, rolloverBonus: 0, isStale: false, isWithin48h: false };

  // 1. Value Weight from Quadrant
  const value = task.quadrant ? (QUADRANT_WEIGHTS[task.quadrant] ?? 1) : 1;

  // 2. Urgency Weight from Deadline
  let urgency = 1;
  let isStale = false;
  let isWithin48h = false;

  if (task.deadline) {
    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const diffMs = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      if (diffDays < -3) {
        // Overdue by > 3 days: Stale decay down to 2
        urgency = 2;
        isStale = true;
      } else {
        // Overdue by 0 to 3 days
        urgency = 4;
      }
    } else if (diffDays <= 2) {
      // Due within 48 hours: claims Support slot priority
      urgency = 3;
      isWithin48h = true;
    } else if (diffDays <= 7) {
      // Due within current week
      urgency = 2;
    } else {
      urgency = 1;
    }
  }

  // 3. Rollover Age Bonus
  const daysRolledOver = task.days_rolled_over || task.rollover_count || 0;
  const rolloverBonus = Math.min(1.0, 0.2 * daysRolledOver);

  const rawScore = value + urgency + rolloverBonus;
  const score = Math.round(rawScore * 100) / 100;

  return {
    score,
    value,
    urgency,
    rolloverBonus: Math.round(rolloverBonus * 100) / 100,
    isStale,
    isWithin48h
  };
}

/**
 * Filters task pool for daily plan candidates.
 * Candidates must be parents or standalone tasks (parent_task_id === null).
 * Leaf subtasks are strictly ineligible.
 */
export function filterEligibleCandidates(tasks, milestones = []) {
  if (!Array.isArray(tasks)) return [];

  const completedMilestoneIds = new Set(
    milestones
      .filter(m => m.status === 'done' || m.completed === true)
      .map(m => m.id)
  );

  return tasks.filter(task => {
    // Must be open
    if (task.status === 'done' || task.completed === true) return false;
    // Must not be archived
    if (task.archived === true) return false;
    // Must be Parent or Standalone task (leaf subtasks strictly barred)
    if (task.parent_task_id !== null && task.parent_task_id !== undefined) return false;
    // Milestone must not be completed
    if (task.milestone_id && completedMilestoneIds.has(task.milestone_id)) return false;
    // Must not be an inactive template
    if (task.is_active === false) return false;
    // Domestic chores must not be auto-slotted into the daily plan
    if (task.category === 'domestic' || task.category === 'chores') return false;

    return true;
  });
}

/**
 * Recomputes target_boxes for a slot.
 * Formula: Math.max(1, Math.ceil(totalMinutes / 15))
 */
export function recomputeTargetBoxes(chosenSubtasks, parentTask) {
  if (chosenSubtasks && chosenSubtasks.length > 0) {
    const totalMinutes = chosenSubtasks.reduce((acc, st) => {
      const mins = st.estimated_minutes || st.time_estimate_minutes || 15;
      return acc + mins;
    }, 0);
    return Math.max(1, Math.ceil(totalMinutes / 15));
  }

  const mins = parentTask?.estimated_minutes || parentTask?.time_estimate_minutes || 30;
  return Math.max(1, Math.ceil(mins / 15));
}

/**
 * Calculates open minutes for a candidate task.
 */
export function getCandidateOpenMinutes(candidate, openSubtasks = []) {
  if (openSubtasks.length > 0) {
    return openSubtasks.reduce((sum, st) => {
      const explicit = st.estimated_minutes || st.time_estimate_minutes;
      if (explicit) return sum + explicit;
      const h = estimateDurationHeuristic(st.title);
      return sum + h.minutes;
    }, 0);
  }

  const explicit = candidate.estimated_minutes || candidate.time_estimate_minutes;
  if (explicit) return explicit;
  const h = estimateDurationHeuristic(candidate.title);
  return h.minutes;
}

/**
 * Allocates candidates to daily plan slots:
 * Slot 1 (Anchor): Highest scoring candidate with >= 60 open minutes (or top overall if none >= 60).
 * Slots 2 and 3 (Support): Next two highest scoring candidates (candidates with <= 48h deadline prioritized).
 * Slot 4 (Bonus, optional): Next candidate in ranked pool.
 */
export function allocateSlots(candidates, openSubtasksByParentId = {}, todayStr = new Date().toLocaleDateString('en-CA')) {
  if (!candidates || candidates.length === 0) return [];

  // Score all candidates
  const scored = candidates.map(candidate => {
    const scoring = computeDeterministicScore(candidate, todayStr);
    const subtasks = openSubtasksByParentId[candidate.id] || [];
    const openMinutes = getCandidateOpenMinutes(candidate, subtasks);
    return {
      candidate,
      ...scoring,
      openMinutes
    };
  });

  const remaining = [...scored];

  // 1. Anchor Allocation (Slot 1)
  let anchorIndex = -1;
  const qualifiedForAnchor = remaining
    .map((item, idx) => ({ ...item, originalIndex: idx }))
    .filter(item => item.openMinutes >= 60)
    .sort((a, b) => b.score - a.score);

  if (qualifiedForAnchor.length > 0) {
    anchorIndex = qualifiedForAnchor[0].originalIndex;
  } else {
    // If no candidate has >= 60 min, pick top scorer overall
    const topScorer = remaining
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .sort((a, b) => b.score - a.score)[0];
    anchorIndex = topScorer.originalIndex;
  }

  const anchorItem = remaining.splice(anchorIndex, 1)[0];
  const allocated = [{ slot: 1, type: 'anchor', item: anchorItem }];

  if (remaining.length === 0) return allocated;

  // 2. Support Allocations (Slots 2 and 3)
  // Tasks with deadline within 48 hours take priority for Support slots
  const sortSupportCandidates = (list) => {
    return [...list].sort((a, b) => {
      if (a.isWithin48h && !b.isWithin48h) return -1;
      if (!a.isWithin48h && b.isWithin48h) return 1;
      return b.score - a.score;
    });
  };

  const supportSorted = sortSupportCandidates(remaining);

  // Slot 2
  if (supportSorted.length > 0) {
    const support1 = supportSorted[0];
    const remIdx1 = remaining.findIndex(r => r.candidate.id === support1.candidate.id);
    remaining.splice(remIdx1, 1);
    allocated.push({ slot: 2, type: 'support', item: support1 });
  }

  // Slot 3
  if (remaining.length > 0) {
    const supportSorted2 = sortSupportCandidates(remaining);
    const support2 = supportSorted2[0];
    const remIdx2 = remaining.findIndex(r => r.candidate.id === support2.candidate.id);
    remaining.splice(remIdx2, 1);
    allocated.push({ slot: 3, type: 'support', item: support2 });
  }

  // 3. Bonus Allocation (Slot 4, optional)
  if (remaining.length > 0) {
    remaining.sort((a, b) => b.score - a.score);
    const bonus = remaining[0];
    allocated.push({ slot: 4, type: 'bonus', item: bonus });
  }

  return allocated;
}

/**
 * Selects subtasks for a parent slot up to the slot minute cap.
 * Executes creation-time heuristic pre-fill on unestimated subtasks.
 * Never runs heuristic at render time.
 */
export async function selectSubtasksForSlot(parentTask, openSubtasks = [], slotType = 'support') {
  if (!openSubtasks || openSubtasks.length === 0) {
    return { chosenSubtasks: [], targetBoxes: recomputeTargetBoxes([], parentTask) };
  }

  // Order subtasks strictly by position ASC, created_at ASC, id ASC
  const sorted = [...openSubtasks].sort((a, b) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    if (posA !== posB) return posA - posB;

    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  const minuteCap = SLOT_CAPS[slotType] || SLOT_CAPS.support;
  const chosenSubtasks = [];
  let accumulatedMinutes = 0;

  for (const st of sorted) {
    let subtaskMins = st.estimated_minutes ?? st.time_estimate_minutes;

    // Local heuristic pre-fill if estimate is missing
    if (subtaskMins == null) {
      const h = estimateDurationHeuristic(st.title);
      subtaskMins = h.minutes;

      // Update subtask in Dexie and sync queue with heuristic marker
      const updateMatch = { id: st.id };
      const effectiveUserId = st.user_id || parentTask?.user_id;
      if (effectiveUserId) {
        updateMatch.user_id = effectiveUserId;
      }
      await offlineUpdate('tasks', updateMatch, {
        estimated_minutes: h.minutes,
        time_estimate_minutes: h.minutes,
        mental_load: h.mentalLoad,
        estimate_source: 'heuristic'
      });

      st.estimated_minutes = h.minutes;
      st.time_estimate_minutes = h.minutes;
      st.mental_load = h.mentalLoad;
      st.estimate_source = 'heuristic';
    }

    chosenSubtasks.push(st);
    accumulatedMinutes += subtaskMins;

    // Stop once we meet or exceed the cap, but guarantee at least 1 subtask
    if (accumulatedMinutes >= minuteCap && chosenSubtasks.length >= 1) {
      break;
    }
  }

  const targetBoxes = recomputeTargetBoxes(chosenSubtasks, parentTask);
  return { chosenSubtasks, targetBoxes };
}

/**
 * Creates the day's plan rows in daily_plan and daily_plan_items if missing.
 * Idempotent: If todayStr already has rows, plan creation is skipped entirely.
 */
export async function createDailyPlanIfMissing({ userId, todayStr = new Date().toLocaleDateString('en-CA'), energyTier = 'Medium' }) {
  if (!userId) return [];

  // 1. Idempotency Check: query existing plans for today
  let existingPlans = [];
  try {
    if (db?.daily_plan?.where) {
      const query = db.daily_plan.where('user_id');
      let userPlans = [];
      if (typeof query?.equals === 'function') {
        userPlans = await query.equals(userId).toArray();
      } else if (typeof query?.toArray === 'function') {
        userPlans = await query.toArray();
      }
      existingPlans = userPlans.filter(p => p.plan_date === todayStr);
    } else {
      const { data } = await offlineSelect('daily_plan', { user_id: userId, plan_date: todayStr });
      existingPlans = data || [];
    }
  } catch (err) {
    console.warn('[dayPlanCreator] Error checking existing daily_plan:', err);
  }

  if (existingPlans && existingPlans.length > 0) {
    // Existing rows stand. Never recreate or recompute.
    return existingPlans;
  }

  // 2. Fetch Tasks and Milestones from Dexie / offline storage
  let allTasks = [];
  let allMilestones = [];

  try {
    if (db?.tasks) {
      allTasks = await db.tasks.where('user_id').equals(userId).toArray();
    } else {
      const { data } = await offlineSelect('tasks', { user_id: userId });
      allTasks = data || [];
    }

    if (db?.milestones) {
      allMilestones = await db.milestones.where('user_id').equals(userId).toArray();
    } else {
      const { data } = await offlineSelect('milestones', { user_id: userId });
      allMilestones = data || [];
    }
  } catch (err) {
    console.error('[dayPlanCreator] Error loading candidate tasks:', err);
    return [];
  }

  // 3. Filter candidates
  const candidates = filterEligibleCandidates(allTasks, allMilestones);
  if (candidates.length === 0) {
    return [];
  }

  // 4. Index open subtasks by parent_task_id
  const openSubtasksByParentId = {};
  allTasks.forEach(t => {
    if (t.parent_task_id && t.status !== 'done' && t.completed !== true) {
      if (!openSubtasksByParentId[t.parent_task_id]) {
        openSubtasksByParentId[t.parent_task_id] = [];
      }
      openSubtasksByParentId[t.parent_task_id].push(t);
    }
  });

  // 5. Allocate Slots
  const allocations = allocateSlots(candidates, openSubtasksByParentId, todayStr);
  const createdPlans = [];

  // 6. Persist each slot and its chosen items
  for (const alloc of allocations) {
    const parentTask = alloc.item.candidate;
    const openSubtasks = openSubtasksByParentId[parentTask.id] || [];
    const planId = generateUUID();

    const { chosenSubtasks, targetBoxes } = await selectSubtasksForSlot(parentTask, openSubtasks, alloc.type);

    const planRow = {
      id: planId,
      user_id: userId,
      plan_date: todayStr,
      slot: alloc.slot,
      task_id: parentTask.id,
      unit: 'min',
      target_boxes: targetBoxes,
      done_boxes: 0,
      source: 'auto',
      locked: false,
      status: 'planned',
      energy_tier: energyTier,
      swapped_from: null,
      xp_awarded: 0,
      auto_completed: false,
      target_overridden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await offlineInsert('daily_plan', planRow);
    createdPlans.push(planRow);

    // Insert daily_plan_items for chosen subtasks
    for (let i = 0; i < chosenSubtasks.length; i++) {
      const st = chosenSubtasks[i];
      await offlineInsert('daily_plan_items', {
        id: generateUUID(),
        user_id: userId,
        plan_id: planId,
        task_id: st.id,
        position: i,
        completed_by_slot: false,
        created_at: new Date().toISOString()
      });
    }
  }

  return createdPlans;
}

/**
 * One-time legacy cutover execution:
 * Identifies today's legacy daily_plan rows that reference leaf subtasks (parent_task_id !== null).
 * Purges only today's legacy rows and their streams via offlineDelete so PostgREST cleans them up.
 * Yesterday's and historical plans are strictly untouched.
 */
export async function executeSprintCCutover({ userId, todayStr = new Date().toLocaleDateString('en-CA') }) {
  if (!userId) return { executed: false, purgedPlans: 0 };

  try {
    let todayPlans = [];
    if (db?.daily_plan?.where) {
      const query = db.daily_plan.where('user_id');
      let userPlans = [];
      if (typeof query?.equals === 'function') {
        userPlans = await query.equals(userId).toArray();
      } else if (typeof query?.toArray === 'function') {
        userPlans = await query.toArray();
      }
      todayPlans = userPlans.filter(p => p.plan_date === todayStr);
    } else {
      const { data } = await offlineSelect('daily_plan', { user_id: userId, plan_date: todayStr });
      todayPlans = data || [];
    }

    if (!todayPlans || todayPlans.length === 0) {
      return { executed: false, purgedPlans: 0 };
    }

    // Check if any plan row references a leaf task (task with parent_task_id)
    const legacyPlanIds = [];
    for (const plan of todayPlans) {
      if (plan.task_id) {
        let task = null;
        if (db?.tasks) {
          task = await db.tasks.get(plan.task_id);
        } else {
          const { data } = await offlineSelect('tasks', { id: plan.task_id, user_id: userId });
          task = data?.[0] || null;
        }

        if (task && task.parent_task_id) {
          legacyPlanIds.push(plan.id);
        }
      }
    }

    if (legacyPlanIds.length === 0) {
      // No legacy leaf subtasks in today's plans
      return { executed: false, purgedPlans: 0 };
    }

    // Delete associated legacy streams and daily_plan rows
    for (const planId of legacyPlanIds) {
      let streams = [];
      if (db?.daily_plan_streams) {
        streams = await db.daily_plan_streams.where({ plan_id: planId }).toArray();
      } else {
        const { data } = await offlineSelect('daily_plan_streams', { plan_id: planId, user_id: userId });
        streams = data || [];
      }

      for (const stream of streams) {
        await offlineDelete('daily_plan_streams', { id: stream.id, user_id: userId });
      }

      await offlineDelete('daily_plan', { id: planId, user_id: userId });
    }

    return { executed: true, purgedPlans: legacyPlanIds.length };
  } catch (err) {
    console.error('[dayPlanCreator] Error executing legacy cutover:', err);
    return { executed: false, error: err, purgedPlans: 0 };
  }
}
