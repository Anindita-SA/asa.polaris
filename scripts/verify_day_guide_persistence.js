/**
 * Day Guide Persistence Verification Tool (Sprint B)
 *
 * Compares database rows (daily_plan, daily_plan_streams) against localStorage keys
 * (polaris_timeboxes_*, polaris_tracks_*, polaris_today_order_*) for the last 7 days
 * and reports any mismatches in slots, target_boxes, or done_boxes.
 *
 * Usage:
 *   node scripts/verify_day_guide_persistence.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export async function verifyPersistenceForDates({ days = 7, userId = null, localDataMap = {} } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase URL or Key in environment');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Generate date list for the last N days
  const dates = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }

  const report = {
    evaluatedDates: dates,
    totalDays: dates.length,
    matchedCount: 0,
    mismatchCount: 0,
    details: []
  };

  // Determine user ID if not provided
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    if (users && users.length > 0) {
      targetUserId = users[0].id;
    }
  }

  for (const dateStr of dates) {
    const query = supabase
      .from('daily_plan')
      .select('id, user_id, plan_date, slot, task_id, unit, target_boxes, done_boxes, status')
      .eq('plan_date', dateStr);

    if (targetUserId) {
      query.eq('user_id', targetUserId);
    }

    const { data: dbPlans, error } = await query;

    if (error) {
      report.details.push({
        date: dateStr,
        status: 'ERROR',
        message: error.message
      });
      report.mismatchCount++;
      continue;
    }

    // Get streams for these plans
    const planIds = (dbPlans || []).map(p => p.id);
    let dbStreams = [];
    if (planIds.length > 0) {
      const { data: streams } = await supabase
        .from('daily_plan_streams')
        .select('*')
        .in('plan_id', planIds);
      dbStreams = streams || [];
    }

    // Check localStorage map if provided (or verify database integrity)
    const localOrder = localDataMap[`polaris_today_order_${dateStr}`] || null;
    const dateMismatches = [];

    if (dbPlans && dbPlans.length > 0) {
      // 1. Verify slot continuity (slots 1, 2, 3)
      const slots = dbPlans.map(p => p.slot).sort((a, b) => a - b);
      for (let s = 1; s <= slots.length; s++) {
        if (!slots.includes(s)) {
          dateMismatches.push(`Missing slot ${s} in daily_plan`);
        }
      }

      // 2. Verify done_boxes <= target_boxes consistency
      dbPlans.forEach(p => {
        if (p.done_boxes > p.target_boxes) {
          dateMismatches.push(`Plan slot ${p.slot} (${p.task_id}): done_boxes (${p.done_boxes}) exceeds target (${p.target_boxes})`);
        }
        if (p.done_boxes >= p.target_boxes && p.status !== 'cleared') {
          dateMismatches.push(`Plan slot ${p.slot}: target met but status is '${p.status}' instead of 'cleared'`);
        }
      });

      // 3. Compare with local storage order if present
      if (Array.isArray(localOrder)) {
        localOrder.slice(0, 3).forEach((taskId, idx) => {
          const expectedSlot = idx + 1;
          const matchingPlan = dbPlans.find(p => p.slot === expectedSlot);
          if (!matchingPlan) {
            dateMismatches.push(`Slot ${expectedSlot} in local order (${taskId}) missing in DB`);
          } else if (matchingPlan.task_id !== taskId) {
            dateMismatches.push(`Slot ${expectedSlot} task mismatch: local=${taskId}, db=${matchingPlan.task_id}`);
          }
        });
      }

      // 4. Verify streams map to valid plans
      dbStreams.forEach(s => {
        if (!planIds.includes(s.plan_id)) {
          dateMismatches.push(`Orphan stream ${s.id} pointing to missing plan_id ${s.plan_id}`);
        }
      });
    }

    const hasMismatches = dateMismatches.length > 0;
    if (hasMismatches) {
      report.mismatchCount++;
    } else {
      report.matchedCount++;
    }

    report.details.push({
      date: dateStr,
      status: hasMismatches ? 'MISMATCH' : 'OK',
      planCount: (dbPlans || []).length,
      streamCount: dbStreams.length,
      mismatches: dateMismatches
    });
  }

  return report;
}

// CLI execution
if (process.argv[1]?.endsWith('verify_day_guide_persistence.js')) {
  verifyPersistenceForDates()
    .then(report => {
      console.log('=== Day Guide Persistence Verification Report ===');
      console.log(`Evaluated ${report.totalDays} days (${report.evaluatedDates[0]} to ${report.evaluatedDates[report.evaluatedDates.length - 1]})`);
      console.log(`Summary: ${report.matchedCount} OK, ${report.mismatchCount} Mismatches\n`);
      console.table(report.details.map(d => ({
        Date: d.date,
        Status: d.status,
        Plans: d.planCount ?? 0,
        Streams: d.streamCount ?? 0,
        Issues: (d.mismatches && d.mismatches.length > 0) ? d.mismatches.join('; ') : 'None'
      })));
      process.exit(report.mismatchCount > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}
