import db from './offlineStore';
import { offlineInsert, offlineUpdate, generateUUID } from './offlineApi';
import { flushQueue } from './syncManager';
import { supabase } from './supabase';

/**
 * Lists entries in db.sync_errors for daily_plan, daily_plan_items, and tasks
 * created since the migration date.
 * Report only, no mutations.
 */
export async function inspectSyncErrors(sinceDate = '2026-11-02T00:00:00Z') {
  if (!db.sync_errors) {
    return { count: 0, grouped: {} };
  }

  const sinceMs = new Date(sinceDate).getTime();
  const allErrors = await db.sync_errors.toArray();
  const targetTables = ['daily_plan', 'daily_plan_items', 'tasks'];

  const filtered = allErrors.filter(err => {
    const isTargetTable = targetTables.includes(err.table);
    const createdAt = typeof err.created_at === 'number' ? err.created_at : new Date(err.created_at || 0).getTime();
    return isTargetTable && createdAt >= sinceMs;
  });

  const grouped = {};
  for (const err of filtered) {
    const tbl = err.table || 'unknown';
    if (!grouped[tbl]) grouped[tbl] = {};

    let errorCategory = 'OTHER';
    const msg = String(err.error_message || '');
    if (msg.includes('PGRST205') || msg.includes('schema cache')) {
      errorCategory = 'PGRST205 (Table missing from schema cache)';
    } else if (msg.includes('42703') || msg.includes('column') || msg.includes('manual_boxes')) {
      errorCategory = '42703 (Column does not exist)';
    } else if (msg.includes('23505') || msg.includes('unique')) {
      errorCategory = '23505 (Unique violation)';
    } else {
      errorCategory = msg.slice(0, 80);
    }

    grouped[tbl][errorCategory] = (grouped[tbl][errorCategory] || 0) + 1;
  }

  return {
    totalTargetErrors: filtered.length,
    grouped,
    items: filtered
  };
}

/**
 * Resyncs 2026-11-03 daily plan and daily_plan_items from Dexie to Supabase.
 * - Re-enqueues local daily_plan_items via offlineInsert.
 * - Re-enqueues today's 3 daily_plan rows via offlineUpdate if remote mismatches.
 * - Skips anything already identical on remote.
 * - Flushes the queue.
 * - Clears only replayed entries from db.sync_errors after successful sync.
 */
export async function resyncTodayPlan({ todayStr = '2026-11-03', userId = null } = {}) {
  if (todayStr !== '2026-11-03') {
    throw new Error('resyncTodayPlan is strictly restricted to 2026-11-03');
  }

  // 1. Load local daily_plan rows for 2026-11-03
  let localPlans = [];
  if (db?.daily_plan?.where) {
    localPlans = await db.daily_plan.where('plan_date').equals(todayStr).toArray();
  } else {
    const allPlans = await db.daily_plan.toArray();
    localPlans = allPlans.filter(p => p.plan_date === todayStr);
  }

  if (userId) {
    localPlans = localPlans.filter(p => p.user_id === userId);
  }

  const planIds = localPlans.map(p => p.id);

  // 2. Load local daily_plan_items for these plans
  let localItems = [];
  if (db?.daily_plan_items?.where) {
    for (const pid of planIds) {
      const items = await db.daily_plan_items.where('plan_id').equals(pid).toArray();
      localItems.push(...items);
    }
  } else {
    const allItems = await db.daily_plan_items.toArray();
    localItems = allItems.filter(i => planIds.includes(i.plan_id));
  }

  // 3. Load remote state from Supabase
  const { data: remotePlans, error: remotePlanErr } = await supabase
    .from('daily_plan')
    .select('id, slot, plan_date, status, target_boxes, done_boxes, manual_boxes, xp_awarded, task_id')
    .eq('plan_date', todayStr);

  if (remotePlanErr) throw remotePlanErr;

  const { data: remoteItems, error: remoteItemErr } = await supabase
    .from('daily_plan_items')
    .select('id, plan_id, task_id, position, completed_by_slot, created_at')
    .in('plan_id', planIds.length > 0 ? planIds : ['00000000-0000-0000-0000-000000000000']);

  if (remoteItemErr) throw remoteItemErr;

  const remoteItemMap = new Map((remoteItems || []).map(i => [i.id, i]));
  const remotePlanMap = new Map((remotePlans || []).map(p => [p.id, p]));

  // Log counts before
  const countsBefore = {
    localPlansCount: localPlans.length,
    localItemsCount: localItems.length,
    remotePlansCount: (remotePlans || []).length,
    remoteItemsCount: (remoteItems || []).length
  };

  // 4. Re-enqueue missing daily_plan_items
  let itemsEnqueued = 0;
  for (const item of localItems) {
    const remote = remoteItemMap.get(item.id);
    if (!remote) {
      await offlineInsert('daily_plan_items', {
        id: item.id,
        user_id: item.user_id,
        plan_id: item.plan_id,
        task_id: item.task_id,
        position: item.position ?? 0,
        completed_by_slot: Boolean(item.completed_by_slot),
        created_at: item.created_at || new Date().toISOString()
      });
      itemsEnqueued++;
    }
  }

  // 5. Re-enqueue daily_plan rows if mismatched
  let plansUpdated = 0;
  for (const plan of localPlans) {
    const remote = remotePlanMap.get(plan.id);
    if (remote) {
      const isMismatch = (
        remote.done_boxes !== plan.done_boxes ||
        remote.xp_awarded !== plan.xp_awarded ||
        remote.status !== plan.status ||
        remote.manual_boxes !== (plan.manual_boxes || 0)
      );

      if (isMismatch) {
        await offlineUpdate('daily_plan', { id: plan.id }, {
          done_boxes: plan.done_boxes || 0,
          manual_boxes: plan.manual_boxes || 0,
          xp_awarded: plan.xp_awarded || 0,
          status: plan.status || 'planned',
          updated_at: new Date().toISOString()
        });
        plansUpdated++;
      }
    }
  }

  // 6. Flush write queue to Supabase
  if (itemsEnqueued > 0 || plansUpdated > 0) {
    await flushQueue();
  }

  // 7. Verify post-sync state on Supabase
  const { data: verifiedItems } = await supabase
    .from('daily_plan_items')
    .select('id, plan_id, task_id')
    .in('plan_id', planIds.length > 0 ? planIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: verifiedPlans } = await supabase
    .from('daily_plan')
    .select('id, slot, done_boxes, manual_boxes, status')
    .eq('plan_date', todayStr);

  const countsAfter = {
    remotePlansCount: (verifiedPlans || []).length,
    remoteItemsCount: (verifiedItems || []).length,
    itemsEnqueued,
    plansUpdated
  };

  // 8. Clear only replayed entries from db.sync_errors
  let clearedDlqCount = 0;
  if (db.sync_errors && (verifiedItems || []).length === localItems.length && localItems.length > 0) {
    const replayedItemIds = new Set(localItems.map(i => i.id));
    const allErrors = await db.sync_errors.toArray();
    const errorIdsToDelete = [];

    for (const err of allErrors) {
      if (err.table === 'daily_plan_items') {
        const payloadId = err.payload?.id;
        if (payloadId && replayedItemIds.has(payloadId)) {
          errorIdsToDelete.push(err.id);
        }
      }
    }

    if (errorIdsToDelete.length > 0) {
      await db.sync_errors.bulkDelete(errorIdsToDelete);
      clearedDlqCount = errorIdsToDelete.length;
    }
  }

  return {
    todayStr,
    countsBefore,
    countsAfter,
    clearedDlqCount
  };
}

/**
 * One-time dev helper for 2026-11-03:
 * - In-place updates of Slot 2 (2537be39 to parent 28a6d124, target_boxes 4)
 * - In-place updates of Slot 3 (4305377a to parent 8255fd8b, target_boxes 2)
 * - Sets swapped_from: null
 * - Never deletes or inserts daily_plan rows
 * - Inserts the 2 daily_plan_items via offlineInsert
 * - Flushes write queue to Supabase
 * - Aborts without writing if any of the 3 rows has done_boxes > 0 or status !== 'planned'
 */
export async function fixTodayPlan({ todayStr = '2026-11-03', userId = null } = {}) {
  if (todayStr !== '2026-11-03') {
    throw new Error('fixTodayPlan is strictly restricted to 2026-11-03');
  }

  // 1. Fetch today's plans from Dexie (or fallback)
  let localPlans = [];
  if (db?.daily_plan?.where) {
    localPlans = await db.daily_plan.where('plan_date').equals(todayStr).toArray();
  } else if (db?.daily_plan?.toArray) {
    const all = await db.daily_plan.toArray();
    localPlans = all.filter(p => p.plan_date === todayStr);
  }

  if (userId) {
    localPlans = localPlans.filter(p => p.user_id === userId);
  }

  if (!localPlans || localPlans.length === 0) {
    const { data: remotePlans } = await supabase
      .from('daily_plan')
      .select('*')
      .eq('plan_date', todayStr);
    localPlans = remotePlans || [];
  }

  if (localPlans.length === 0) {
    throw new Error('No daily_plan rows found for ' + todayStr);
  }

  // Safety guard: Abort without writing if any local row has done_boxes > 0 or status !== 'planned'
  for (const p of localPlans) {
    const doneBoxes = p.done_boxes || 0;
    const status = p.status || 'planned';
    if (doneBoxes > 0 || status !== 'planned') {
      const msg = `Safety abort: Local Slot ${p.slot} has done_boxes=${doneBoxes} and status='${status}'. Aborting without writing.`;
      console.warn('[fixTodayPlan]', msg);
      return {
        aborted: true,
        reason: msg
      };
    }
  }

  // Safety guard: Verify on remote Supabase before writing
  const { data: remotePlansCheck, error: remoteCheckErr } = await supabase
    .from('daily_plan')
    .select('id, slot, status, done_boxes')
    .eq('plan_date', todayStr);

  if (remoteCheckErr) throw remoteCheckErr;

  for (const rp of (remotePlansCheck || [])) {
    const doneBoxes = rp.done_boxes || 0;
    const status = rp.status || 'planned';
    if (doneBoxes > 0 || status !== 'planned') {
      const msg = `Safety abort: Remote Slot ${rp.slot} has done_boxes=${doneBoxes} and status='${status}'. Aborting without writing.`;
      console.warn('[fixTodayPlan]', msg);
      return {
        aborted: true,
        reason: msg
      };
    }
  }

  const effectiveUserId = userId || localPlans[0]?.user_id || '00000000-0000-0000-0000-000000000000';

  const slot2PlanId = '2537be39-b7e3-48ee-a65e-72f5d6817470';
  const slot2ParentTaskId = '28a6d124-be16-45e3-b471-5db2631fd73f';
  const slot2SubtaskId = '9d8d50c0-126a-448b-b9df-907b650aa461';
  const slot2TargetBoxes = 4;

  const slot3PlanId = '4305377a-ebc1-4c9c-921b-7117b6c415ff';
  const slot3ParentTaskId = '8255fd8b-977a-40d3-90ea-2cbe750b5d87';
  const slot3SubtaskId = 'e6418e42-782f-4676-a25a-3c1d256e48f6';
  const slot3TargetBoxes = 2;

  // 2. In-place update of Slot 2 (task_id, target_boxes, swapped_from null)
  await offlineUpdate('daily_plan', { id: slot2PlanId }, {
    task_id: slot2ParentTaskId,
    target_boxes: slot2TargetBoxes,
    swapped_from: null,
    updated_at: new Date().toISOString()
  });

  // 3. In-place update of Slot 3 (task_id, target_boxes, swapped_from null)
  await offlineUpdate('daily_plan', { id: slot3PlanId }, {
    task_id: slot3ParentTaskId,
    target_boxes: slot3TargetBoxes,
    swapped_from: null,
    updated_at: new Date().toISOString()
  });

  // 4. Insert the 2 daily_plan_items via offlineInsert
  let existingItems = [];
  if (db?.daily_plan_items?.where) {
    existingItems = await db.daily_plan_items.where('plan_id').equals(slot2PlanId).toArray();
    const slot3Items = await db.daily_plan_items.where('plan_id').equals(slot3PlanId).toArray();
    existingItems.push(...slot3Items);
  } else if (db?.daily_plan_items?.toArray) {
    const all = await db.daily_plan_items.toArray();
    existingItems = all.filter(i => i.plan_id === slot2PlanId || i.plan_id === slot3PlanId);
  }

  const existingItemKeys = new Set(existingItems.map(i => `${i.plan_id}:${i.task_id}`));

  let itemsInserted = 0;
  if (!existingItemKeys.has(`${slot2PlanId}:${slot2SubtaskId}`)) {
    await offlineInsert('daily_plan_items', {
      id: generateUUID(),
      user_id: effectiveUserId,
      plan_id: slot2PlanId,
      task_id: slot2SubtaskId,
      position: 0,
      completed_by_slot: false,
      created_at: new Date().toISOString()
    });
    itemsInserted++;
  }

  if (!existingItemKeys.has(`${slot3PlanId}:${slot3SubtaskId}`)) {
    await offlineInsert('daily_plan_items', {
      id: generateUUID(),
      user_id: effectiveUserId,
      plan_id: slot3PlanId,
      task_id: slot3SubtaskId,
      position: 0,
      completed_by_slot: false,
      created_at: new Date().toISOString()
    });
    itemsInserted++;
  }

  // 5. Flush write queue to Supabase
  await flushQueue();

  // 6. Query and report remote counts
  const planIds = [
    'c8055491-493b-433c-b8ed-b4a70004a0a2',
    slot2PlanId,
    slot3PlanId
  ];

  const { data: remotePlansAfter } = await supabase
    .from('daily_plan')
    .select('id, slot, task_id, target_boxes, done_boxes, status')
    .eq('plan_date', todayStr)
    .order('slot', { ascending: true });

  const { data: remoteItemsAfter } = await supabase
    .from('daily_plan_items')
    .select('id, plan_id, task_id, position')
    .in('plan_id', planIds);

  return {
    success: true,
    todayStr,
    itemsInserted,
    remotePlansCount: (remotePlansAfter || []).length,
    remoteItemsCount: (remoteItemsAfter || []).length,
    remotePlans: remotePlansAfter || [],
    remoteItems: remoteItemsAfter || []
  };
}
