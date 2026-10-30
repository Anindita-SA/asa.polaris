/**
 * Day Guide Persistence & Dual-Write Architecture (Sprint B)
 *
 * Provides:
 * 1. Rollback Feature Flag (polaris_ff_day_guide_db_read, default: true)
 * 2. Idempotent one-time import from localStorage to daily_plan and daily_plan_streams
 * 3. Dual-write operations keeping localStorage and database in lockstep
 * 4. DB-to-UI state mapper for TodayAgendaWidget
 */

import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete, generateUUID } from './offlineApi';

export const FF_DAY_GUIDE_DB_READ = 'polaris_ff_day_guide_db_read';

/**
 * Checks whether database-backed reading is enabled.
 * Defaults to true (ON). Setting to 'false' enables safe rollback to localStorage.
 */
export function isDayGuideDbReadEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const val = localStorage.getItem(FF_DAY_GUIDE_DB_READ);
    if (val === 'false' || val === 'off') return false;
    return true;
  } catch (e) {
    return true;
  }
}

/**
 * Sets the rollback feature flag.
 * @param {boolean} enabled
 */
export function setDayGuideDbReadEnabled(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(FF_DAY_GUIDE_DB_READ, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to set day guide feature flag:', e);
  }
}

/**
 * Idempotently imports today's localStorage values into daily_plan and daily_plan_streams.
 * If daily_plan already has rows for (userId, todayStr), it skips insertion.
 */
export async function importTodayLocalStorageToDb({ userId, todayStr, candidateTasks = [], boxMins = 15 }) {
  if (!userId || !todayStr) {
    return { imported: false, reason: 'missing_user_or_date', plans: [] };
  }

  try {
    // 1. Idempotency check: see if rows already exist
    const { data: existingPlans } = await offlineSelect('daily_plan', {
      user_id: userId,
      plan_date: todayStr
    });

    if (existingPlans && existingPlans.length > 0) {
      return { imported: false, reason: 'already_exists', plans: existingPlans };
    }

    // 2. Read saved order from localStorage
    let savedOrder = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`polaris_today_order_${todayStr}`);
        if (raw) savedOrder = JSON.parse(raw);
      } catch (e) {}
    }

    // Determine the top 3 task IDs
    const taskIdsToImport = [];
    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      savedOrder.slice(0, 3).forEach(id => taskIdsToImport.push(id));
    } else if (candidateTasks.length > 0) {
      candidateTasks.slice(0, 3).forEach(t => taskIdsToImport.push(t.id));
    }

    if (taskIdsToImport.length === 0) {
      return { imported: false, reason: 'no_tasks_to_import', plans: [] };
    }

    const insertedPlans = [];

    // 3. For each slot (1 to 3), import plan and tracks
    for (let i = 0; i < taskIdsToImport.length; i++) {
      const taskId = taskIdsToImport[i];
      const slot = i + 1;
      const task = candidateTasks.find(t => t.id === taskId) || { id: taskId, title: 'Task' };

      // Read timeboxes array from localStorage
      let rawBoxes = [];
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const rawB = localStorage.getItem(`polaris_timeboxes_${todayStr}_${taskId}`);
          if (rawB) rawBoxes = JSON.parse(rawB);
        } catch (e) {}
      }

      // Read tracks array from localStorage
      let rawTracks = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const rawT = localStorage.getItem(`polaris_tracks_${todayStr}_${taskId}`);
          if (rawT) rawTracks = JSON.parse(rawT);
        } catch (e) {}
      }

      const totalMins = task.estimated_minutes || task.time_estimate_minutes || (boxMins * 2);
      const defCount = Math.max(1, Math.min(8, Math.ceil(totalMins / boxMins)));
      const unit = task.box_unit || (task.target_count ? 'count' : 'min');
      const targetBoxes = rawTracks && rawTracks[0]?.count
        ? rawTracks[0].count
        : (unit === 'count' && task.target_count ? task.target_count : defCount);
      const doneBoxes = Array.isArray(rawBoxes) ? rawBoxes.filter(Boolean).length : 0;
      const status = doneBoxes >= targetBoxes ? 'cleared' : (task.completed ? 'cleared' : 'planned');

      const planRow = {
        id: generateUUID(),
        user_id: userId,
        plan_date: todayStr,
        slot,
        task_id: taskId,
        unit,
        target_boxes: Math.max(1, targetBoxes),
        done_boxes: Math.max(0, doneBoxes),
        source: 'auto',
        locked: false,
        status,
        energy_tier: 'Medium'
      };

      await offlineInsert('daily_plan', planRow);
      insertedPlans.push(planRow);

      // Import streams/tracks
      const tracksToImport = Array.isArray(rawTracks) && rawTracks.length > 0
        ? rawTracks
        : [
            {
              id: 'default',
              name: unit === 'count' ? 'count' : `${boxMins}m units`,
              count: targetBoxes,
              boxes: rawBoxes
            }
          ];

      for (let trIdx = 0; trIdx < tracksToImport.length; trIdx++) {
        const tr = tracksToImport[trIdx];
        const streamDone = Array.isArray(tr.boxes) ? tr.boxes.filter(Boolean).length : 0;
        const streamRow = {
          id: generateUUID(),
          user_id: userId,
          plan_id: planRow.id,
          label: tr.name || '15m units',
          unit: tr.name === 'count' ? 'count' : 'min',
          target_boxes: Math.max(1, tr.count || 1),
          done_boxes: Math.max(0, streamDone),
          position: trIdx + 1
        };
        await offlineInsert('daily_plan_streams', streamRow);
      }
    }

    return { imported: true, count: insertedPlans.length, plans: insertedPlans };
  } catch (err) {
    console.error('Error during idempotent import of today localStorage:', err);
    return { imported: false, error: err };
  }
}

/**
 * Maps database plan rows and stream rows into the state objects needed by TodayAgendaWidget.
 */
export function mapDbPlanToUiState({ plans = [], streams = [], tasks = [], boxMins = 15 }) {
  const sortedPlans = [...plans].sort((a, b) => a.slot - b.slot);
  const orderedTasks = [];
  const timeboxesMap = {};
  const taskTracksMap = {};

  sortedPlans.forEach((plan) => {
    const task = tasks.find(t => t.id === plan.task_id);
    if (!task) return;
    orderedTasks.push(task);

    // Filter streams belonging to this plan
    const planStreams = streams
      .filter(s => s.plan_id === plan.id)
      .sort((a, b) => a.position - b.position);

    if (planStreams.length > 0) {
      const tracks = planStreams.map((s) => {
        const boxes = Array.from({ length: s.target_boxes }, (_, idx) => idx < s.done_boxes);
        return {
          id: s.id,
          name: s.label,
          count: s.target_boxes,
          boxes
        };
      });
      taskTracksMap[task.id] = tracks;

      // Construct overall timeboxesMap from primary track or all boxes
      const allBoxes = [];
      tracks.forEach(tr => {
        allBoxes.push(...tr.boxes);
      });
      timeboxesMap[task.id] = allBoxes.slice(0, plan.target_boxes);
    } else {
      const boxes = Array.from({ length: plan.target_boxes }, (_, idx) => idx < plan.done_boxes);
      timeboxesMap[task.id] = boxes;
      taskTracksMap[task.id] = [
        {
          id: 'default',
          name: plan.unit === 'count' ? 'count' : `${boxMins}m units`,
          count: plan.target_boxes,
          boxes
        }
      ];
    }
  });

  return { orderedTasks, timeboxesMap, taskTracksMap };
}

/**
 * Dual-write handler for tally box toggling.
 * Writes to localStorage and persists to daily_plan / daily_plan_streams.
 */
export async function persistTimeboxToggleDual({
  userId,
  todayStr,
  task,
  nextList,
  trackId,
  updatedTracks = null
}) {
  // 1. Write to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`polaris_timeboxes_${todayStr}_${task.id}`, JSON.stringify(nextList));
      if (updatedTracks) {
        localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updatedTracks));
      }
    } catch (e) {}
  }

  // 2. Write to Database
  if (!userId) return;

  try {
    const { data: plans } = await offlineSelect('daily_plan', {
      user_id: userId,
      plan_date: todayStr,
      task_id: task.id
    });

    if (plans && plans.length > 0) {
      const plan = plans[0];
      const newDoneBoxes = nextList.filter(Boolean).length;
      const isCleared = newDoneBoxes >= plan.target_boxes;
      await offlineUpdate(
        'daily_plan',
        { id: plan.id, user_id: userId },
        {
          done_boxes: newDoneBoxes,
          status: isCleared ? 'cleared' : 'planned',
          updated_at: new Date().toISOString()
        }
      );

      // If a specific stream track was updated, sync stream done_boxes
      if (trackId && updatedTracks) {
        const targetTrack = updatedTracks.find(tr => tr.id === trackId);
        if (targetTrack) {
          const streamDone = Array.isArray(targetTrack.boxes) ? targetTrack.boxes.filter(Boolean).length : 0;
          const { data: streams } = await offlineSelect('daily_plan_streams', {
            user_id: userId,
            plan_id: plan.id
          });
          const stream = streams?.find(s => s.id === trackId || s.label === targetTrack.name);
          if (stream) {
            await offlineUpdate(
              'daily_plan_streams',
              { id: stream.id, user_id: userId },
              {
                done_boxes: streamDone,
                target_boxes: targetTrack.count || stream.target_boxes
              }
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error in persistTimeboxToggleDual DB write:', err);
  }
}

/**
 * Dual-write handler for adjusting track box counts (+ / -).
 */
export async function persistAdjustBoxCountDual({
  userId,
  todayStr,
  task,
  trackId,
  updatedTracks
}) {
  // 1. Write to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updatedTracks));
    } catch (e) {}
  }

  // 2. Write to Database
  if (!userId) return;

  try {
    const { data: plans } = await offlineSelect('daily_plan', {
      user_id: userId,
      plan_date: todayStr,
      task_id: task.id
    });

    if (plans && plans.length > 0) {
      const plan = plans[0];
      const targetTrack = updatedTracks.find(tr => tr.id === trackId);
      if (targetTrack) {
        const { data: streams } = await offlineSelect('daily_plan_streams', {
          user_id: userId,
          plan_id: plan.id
        });
        const stream = streams?.find(s => s.id === trackId || s.label === targetTrack.name);
        if (stream) {
          await offlineUpdate(
            'daily_plan_streams',
            { id: stream.id, user_id: userId },
            { target_boxes: targetTrack.count }
          );
        }
        // Update main plan target boxes if primary track
        if (updatedTracks[0]?.id === trackId) {
          await offlineUpdate(
            'daily_plan',
            { id: plan.id, user_id: userId },
            { target_boxes: targetTrack.count, updated_at: new Date().toISOString() }
          );
        }
      }
    }
  } catch (err) {
    console.warn('Error in persistAdjustBoxCountDual DB write:', err);
  }
}

/**
 * Dual-write handler for adding a micro-stream.
 */
export async function persistAddTrackDual({
  userId,
  todayStr,
  task,
  newTrack,
  updatedTracks
}) {
  // 1. Write to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updatedTracks));
    } catch (e) {}
  }

  // 2. Write to Database
  if (!userId) return;

  try {
    const { data: plans } = await offlineSelect('daily_plan', {
      user_id: userId,
      plan_date: todayStr,
      task_id: task.id
    });

    if (plans && plans.length > 0) {
      const plan = plans[0];
      await offlineInsert('daily_plan_streams', {
        id: generateUUID(),
        user_id: userId,
        plan_id: plan.id,
        label: newTrack.name,
        unit: 'min',
        target_boxes: newTrack.count || 3,
        done_boxes: 0,
        position: updatedTracks.length
      });
    }
  } catch (err) {
    console.warn('Error in persistAddTrackDual DB write:', err);
  }
}

/**
 * Dual-write handler for reordering or locking primary tasks.
 */
export async function persistOrderDual({
  userId,
  todayStr,
  taskIds
}) {
  // 1. Write to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(taskIds));
    } catch (e) {}
  }

  // 2. Write to Database
  if (!userId || !Array.isArray(taskIds)) return;

  try {
    const { data: plans } = await offlineSelect('daily_plan', {
      user_id: userId,
      plan_date: todayStr
    });

    if (plans && plans.length > 0) {
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i];
        const slot = i + 1;
        const matchingPlan = plans.find(p => p.task_id === taskId);
        if (matchingPlan && matchingPlan.slot !== slot) {
          await offlineUpdate(
            'daily_plan',
            { id: matchingPlan.id, user_id: userId },
            { slot, updated_at: new Date().toISOString() }
          );
        }
      }
    }
  } catch (err) {
    console.warn('Error in persistOrderDual DB write:', err);
  }
}
