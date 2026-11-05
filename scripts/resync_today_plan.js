/**
 * Resync Tool for 2026-11-03 Daily Plan (Sprint C Verification)
 *
 * Usage:
 *   node scripts/resync_today_plan.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or Key in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const TARGET_DATE = '2026-11-03';

async function main() {
  console.log(`[resync_today_plan] Running remote check for date: ${TARGET_DATE}`);

  // 1. Fetch remote daily_plan rows for 2026-11-03
  const { data: plans, error: planErr } = await supabase
    .from('daily_plan')
    .select('id, user_id, plan_date, slot, status, target_boxes, done_boxes, manual_boxes, xp_awarded, task_id')
    .eq('plan_date', TARGET_DATE)
    .order('slot', { ascending: true });

  if (planErr) {
    console.error('Error fetching remote daily_plan:', planErr);
    process.exit(1);
  }

  console.log(`Remote daily_plan count for ${TARGET_DATE}: ${plans ? plans.length : 0}`);
  if (plans && plans.length > 0) {
    for (const p of plans) {
      console.log(`  Slot ${p.slot}: id=${p.id}, status=${p.status}, target_boxes=${p.target_boxes}, done_boxes=${p.done_boxes}, manual_boxes=${p.manual_boxes}, task_id=${p.task_id}`);
    }
  }

  const planIds = (plans || []).map(p => p.id);

  // 2. Fetch remote daily_plan_items for these plans
  let items = [];
  if (planIds.length > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from('daily_plan_items')
      .select('id, plan_id, task_id, position, completed_by_slot, created_at')
      .in('plan_id', planIds);

    if (itemErr) {
      console.error('Error fetching remote daily_plan_items:', itemErr);
      process.exit(1);
    }
    items = itemRows || [];
  }

  console.log(`Remote daily_plan_items count for ${TARGET_DATE}: ${items.length}`);
  if (items.length > 0) {
    for (const it of items) {
      console.log(`  Item ${it.id}: plan_id=${it.plan_id}, task_id=${it.task_id}, pos=${it.position}`);
    }
  }

  // 3. Instruction for client Dexie sync
  console.log('\n[resync_today_plan] Summary:');
  console.log(`- Remote daily_plan slots: ${plans ? plans.length : 0}`);
  console.log(`- Remote daily_plan_items: ${items.length}`);
  if (items.length === 0) {
    console.log('\nNOTE: daily_plan_items is currently empty on remote (items failed sync before migration was applied).');
    console.log('To flush local Dexie items to remote, execute window.__resyncTodayPlan() in the app console,');
    console.log('or visit the Day Brief view where the dev resync helper runs.');
  }
}

main().catch(err => {
  console.error('[resync_today_plan] Unexpected error:', err);
  process.exit(1);
});
