#!/usr/bin/env node
/**
 * Polaris Daily Audit - Data Query Script
 *
 * Queries Supabase for all data needed by the Daily Task Audit Report.
 * Outputs structured JSON to scripts/temp_audit_data.json.
 *
 * Usage: node scripts/audit_query.js
 * Requires: .env with SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 * Requires: .user_id_lock with the user's UUID
 *
 * Column names are locked to docs/DATABASE_SCHEMA.md as of Oct 14, 2026.
 * If schema changes, update this script - do NOT write ad-hoc queries.
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  // Read user_id from lock file
  const lockPath = path.join(process.cwd(), '.user_id_lock');
  if (!fs.existsSync(lockPath)) {
    console.error('ERROR: Missing .user_id_lock file in project root');
    process.exit(1);
  }
  const userId = fs.readFileSync(lockPath, 'utf8').trim();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Date calculations (use local timezone date or passed argument)
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const today = process.argv[2] || process.env.AUDIT_DATE || localNow.toISOString().split('T')[0];
  const targetDate = new Date(`${today}T00:00:00Z`);
  const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const sevenDaysAhead = new Date(targetDate.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(targetDate.getTime() - 3 * 86400000).toISOString().split('T')[0];

  console.log(`[audit_query] User: ${userId}`);
  console.log(`[audit_query] Today: ${today}`);

  // ---- Query 1: Pending tasks ----
  // Columns from tasks table (DATABASE_SCHEMA.md lines 656-682)
  const { data: pendingTasks, error: e1 } = await supabase
    .from('tasks')
    .select('id, title, notes, deadline, quadrant, status, mental_load, estimated_minutes, time_estimate_minutes, parent_task_id, milestone_id, created_at, completion_dates, category')
    .eq('user_id', userId)
    .in('status', ['inbox', 'active', 'scheduled'])
    .order('deadline', { ascending: true, nullsFirst: false });

  if (e1) { console.error('Tasks query error:', e1.message); process.exit(1); }

  // ---- Query 2: Completed tasks (count only) ----
  const { data: completedTasks, error: e2 } = await supabase
    .from('tasks')
    .select('id, title, deadline, completion_dates, created_at')
    .eq('user_id', userId)
    .eq('status', 'done');

  if (e2) { console.error('Completed tasks error:', e2.message); process.exit(1); }

  // ---- Query 3: Milestones ----
  // Columns from milestones table (DATABASE_SCHEMA.md lines 136-149)
  const { data: milestones, error: e3 } = await supabase
    .from('milestones')
    .select('id, title, deadline, status, note, created_at')
    .eq('user_id', userId)
    .order('deadline', { ascending: true });

  if (e3) { console.error('Milestones error:', e3.message); process.exit(1); }

  // ---- Query 4: Meal logs (last 7 days) ----
  // Columns from meal_logs table (DATABASE_SCHEMA.md lines 1-26)
  const { data: mealLogs, error: e4 } = await supabase
    .from('meal_logs')
    .select('id, log_date, meal_tag, food_name, kcal, protein, carbs, fat, cost')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo)
    .order('log_date', { ascending: false });

  if (e4) { console.error('Meal logs error:', e4.message); process.exit(1); }

  // ---- Query 5: Outreach targets ----
  // Columns from outreach_targets table (DATABASE_SCHEMA.md lines 837-855)
  const { data: outreachTargets, error: e5 } = await supabase
    .from('outreach_targets')
    .select('id, name, institution, email, status, fit_brief, sent_date, follow_up_due, created_at')
    .eq('user_id', userId);

  if (e5) { console.error('Outreach error:', e5.message); process.exit(1); }

  // ---- Query 6: Morning briefs (last 3 days) ----
  // Columns from morning_briefs table (DATABASE_SCHEMA.md lines 824-835)
  const { data: morningBriefs, error: e6 } = await supabase
    .from('morning_briefs')
    .select('id, date, items, seen, created_at')
    .eq('user_id', userId)
    .gte('date', threeDaysAgo)
    .order('date', { ascending: false });

  if (e6) { console.error('Morning briefs error:', e6.message); process.exit(1); }

  // ---- Process: Task categorization ----
  const overdue = pendingTasks.filter(t => t.deadline && t.deadline < today);
  const todayTasks = pendingTasks.filter(t => t.deadline === today);
  const upcoming7d = pendingTasks.filter(t => t.deadline && t.deadline > today && t.deadline <= sevenDaysAhead);
  const inboxNoDeadline = pendingTasks.filter(t => !t.deadline);
  const inboxLeaking = inboxNoDeadline.filter(t => t.quadrant && t.quadrant !== 'null' && t.quadrant !== '');

  // ---- Process: Deadline density map ----
  const densityMap = {};
  for (const task of pendingTasks) {
    const key = task.deadline || 'NO_DEADLINE';
    densityMap[key] = (densityMap[key] || 0) + 1;
  }

  // ---- Process: Nutrition summary ----
  const mealsByDate = {};
  for (const log of mealLogs) {
    if (!mealsByDate[log.log_date]) mealsByDate[log.log_date] = [];
    mealsByDate[log.log_date].push(log);
  }

  const nutritionSummary = Object.entries(mealsByDate).map(([date, meals]) => ({
    date,
    meal_count: meals.length,
    total_protein: meals.reduce((sum, m) => sum + (parseFloat(m.protein) || 0), 0),
    total_kcal: meals.reduce((sum, m) => sum + (parseFloat(m.kcal) || 0), 0),
  }));

  // Calculate blackout days (consecutive days before today with no logs)
  const loggedDates = new Set(mealLogs.map(m => m.log_date));
  let blackoutDays = 0;
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
    if (!loggedDates.has(checkDate)) blackoutDays++;
    else break;
  }

  // ---- Process: Outreach status counts ----
  const outreachByStatus = {
    drafted: outreachTargets.filter(t => t.status === 'drafted').length,
    sent: outreachTargets.filter(t => t.status === 'sent').length,
    replied: outreachTargets.filter(t => t.status === 'replied').length,
    researching: outreachTargets.filter(t => t.status === 'researching').length,
    total: outreachTargets.length,
  };

  // ---- Build output ----
  const output = {
    generated_at: now.toISOString(),
    today_date: today,
    tasks: {
      pending: pendingTasks,
      completed_count: completedTasks.length,
      total_pending: pendingTasks.length,
      total_completed: completedTasks.length,
      overdue,
      overdue_count: overdue.length,
      today: todayTasks,
      today_count: todayTasks.length,
      upcoming_7d: upcoming7d,
      inbox_no_deadline: inboxNoDeadline,
      inbox_no_deadline_count: inboxNoDeadline.length,
      inbox_leaking: inboxLeaking,
      inbox_leaking_count: inboxLeaking.length,
      density_map: densityMap,
    },
    milestones,
    milestone_count: milestones.length,
    nutrition: {
      meal_logs_7d: mealLogs,
      summary_by_date: nutritionSummary,
      blackout_days: blackoutDays,
      logged_today: loggedDates.has(today),
    },
    outreach: {
      targets: outreachTargets,
      by_status: outreachByStatus,
    },
    morning_briefs: morningBriefs,
  };

  // Write to file (UTF-8, no BOM - avoids PowerShell redirect encoding issues)
  const outPath = path.join(process.cwd(), 'scripts', 'temp_audit_data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  // Print summary
  console.log(`\n[audit_query] Output: ${outPath}`);
  console.log(`[audit_query] Tasks: ${pendingTasks.length} pending, ${completedTasks.length} completed`);
  console.log(`[audit_query] Overdue: ${overdue.length} | Today: ${todayTasks.length} | Upcoming 7d: ${upcoming7d.length}`);
  console.log(`[audit_query] Inbox: ${inboxNoDeadline.length} no deadline, ${inboxLeaking.length} leaking`);
  console.log(`[audit_query] Nutrition: ${mealLogs.length} logs in 7d, ${blackoutDays} blackout day(s)`);
  console.log(`[audit_query] Outreach: ${outreachByStatus.total} targets (${outreachByStatus.drafted} drafted, ${outreachByStatus.sent} sent, ${outreachByStatus.replied} replied)`);
  console.log(`[audit_query] Milestones: ${milestones.length} | Briefs: ${morningBriefs.length}`);
  console.log('[audit_query] Done.');
}

main().catch(err => {
  console.error('[audit_query] Fatal:', err.message);
  process.exit(1);
});
