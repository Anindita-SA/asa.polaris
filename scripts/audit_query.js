#!/usr/bin/env node
/**
 * Polaris Daily Audit - Data Query Script (Rubric v2)
 *
 * Implements the exact schema and data contract required by SKILL.md (Rubric v2).
 * Queries Supabase and outputs structured JSON to scripts/temp_audit_data.json.
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

  const lockPath = path.join(process.cwd(), '.user_id_lock');
  if (!fs.existsSync(lockPath)) {
    console.error('ERROR: Missing .user_id_lock file in project root');
    process.exit(1);
  }
  const userId = fs.readFileSync(lockPath, 'utf8').trim();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Date calculations
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const auditDate = process.argv[2] || process.env.AUDIT_DATE || localNow.toISOString().split('T')[0];
  const auditDateTime = new Date(`${auditDate}T00:00:00Z`);

  // Scored day is the day before the audit date (the full completed day)
  const scoredDayDate = new Date(auditDateTime.getTime() - 86400000);
  const scoredDay = scoredDayDate.toISOString().split('T')[0];

  const sevenDaysAgo = new Date(auditDateTime.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const fourteenDaysAgo = new Date(auditDateTime.getTime() - 14 * 86400000).toISOString().split('T')[0];
  const fourteenDaysAhead = new Date(auditDateTime.getTime() + 14 * 86400000).toISOString().split('T')[0];
  const ninetyDaysAhead = new Date(auditDateTime.getTime() + 90 * 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(auditDateTime.getTime() - 3 * 86400000).toISOString().split('T')[0];
  const dayAfterAudit = new Date(auditDateTime.getTime() + 86400000).toISOString().split('T')[0];

  console.log(`[audit_query_v2] User: ${userId}`);
  console.log(`[audit_query_v2] Audit Date: ${auditDate} | Scored Day: ${scoredDay}`);

  const warnings = [];

  // ---- Query 1: User Settings (for weight and protein targets) ----
  let userWeight = 59.35; // Default fallback
  const { data: settingsData, error: settingsErr } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (settingsErr) {
    warnings.push(`user_settings query error: ${settingsErr.message}`);
  } else if (settingsData && settingsData.length > 0) {
    if (settingsData[0].weight) {
      userWeight = parseFloat(settingsData[0].weight);
    } else {
      warnings.push('user_settings.weight is null, using default 59.35 kg');
    }
  }

  const proteinTargetG = Math.round(userWeight * 1.1 * 10) / 10;
  const proteinFloorG = Math.round(userWeight * 0.85 * 10) / 10;

  // ---- Query 2: Pending Tasks ----
  const { data: pendingTasks, error: e1 } = await supabase
    .from('tasks')
    .select('id, title, notes, deadline, quadrant, status, mental_load, estimated_minutes, time_estimate_minutes, parent_task_id, milestone_id, created_at, completion_dates, category')
    .eq('user_id', userId)
    .in('status', ['inbox', 'active', 'scheduled'])
    .order('deadline', { ascending: true, nullsFirst: false });

  if (e1) {
    console.error('Tasks query error:', e1.message);
    process.exit(1);
  }

  // ---- Query 3: Completed Tasks ----
  const { data: completedTasks, error: e2 } = await supabase
    .from('tasks')
    .select('id, title, deadline, quadrant, mental_load, estimated_minutes, time_estimate_minutes, milestone_id, completion_dates, created_at')
    .eq('user_id', userId)
    .eq('status', 'done');

  if (e2) {
    console.error('Completed tasks error:', e2.message);
    process.exit(1);
  }

  // ---- Query 4: Milestones ----
  const { data: milestones, error: e3 } = await supabase
    .from('milestones')
    .select('id, title, deadline, status, note, created_at')
    .eq('user_id', userId)
    .order('deadline', { ascending: true });

  if (e3) {
    console.error('Milestones error:', e3.message);
    process.exit(1);
  }

  // ---- Query 5: Meal logs (last 7 days) ----
  const { data: mealLogs, error: e4 } = await supabase
    .from('meal_logs')
    .select('id, log_date, meal_tag, food_name, kcal, protein, carbs, fat, cost')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo)
    .order('log_date', { ascending: false });

  if (e4) {
    warnings.push(`meal_logs query error: ${e4.message}`);
  }

  // ---- Query 6: Outreach targets ----
  const { data: outreachTargets, error: e5 } = await supabase
    .from('outreach_targets')
    .select('id, name, institution, email, status, fit_brief, sent_date, follow_up_due, created_at')
    .eq('user_id', userId);

  if (e5) {
    warnings.push(`outreach_targets query error: ${e5.message}`);
  }

  // ---- Query 7: Morning briefs ----
  const { data: morningBriefs, error: e6 } = await supabase
    .from('morning_briefs')
    .select('id, date, items, seen, created_at')
    .eq('user_id', userId)
    .gte('date', threeDaysAgo)
    .order('date', { ascending: false });

  if (e6) {
    warnings.push(`morning_briefs query error: ${e6.message}`);
  }

  // ---- Query 8: Pomodoro Logs (for Focus / Effort) ----
  const { data: pomodoroLogs, error: e7 } = await supabase
    .from('pomodoro_logs')
    .select('id, date, duration_minutes, node_id, label, created_at')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo);

  if (e7) {
    warnings.push(`pomodoro_logs query error: ${e7.message}`);
  }

  // ---- Query 9: IO Logs (for IO split) ----
  const { data: ioLogs, error: e8 } = await supabase
    .from('io_logs')
    .select('id, type, category, minutes, date')
    .eq('user_id', userId)
    .eq('date', scoredDay);

  if (e8) {
    warnings.push(`io_logs query error: ${e8.message}`);
  }

  // ---- Query 10: Wins (for outcomes) ----
  const { data: winsData, error: e9 } = await supabase
    .from('wins')
    .select('id, text, size, log_date, created_at')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo);

  if (e9) {
    warnings.push(`wins query error: ${e9.message}`);
  }

  // ---- Task categorization ----
  const overdue = (pendingTasks || []).filter(t => t.deadline && t.deadline < auditDate);
  const todayTasks = (pendingTasks || []).filter(t => t.deadline === auditDate);
  const upcoming7d = (pendingTasks || []).filter(t => t.deadline && t.deadline > auditDate && t.deadline <= fourteenDaysAhead.slice(0, 10));
  const dueIn14d = (pendingTasks || []).filter(t => t.deadline && t.deadline >= auditDate && t.deadline <= fourteenDaysAhead);
  const inboxNoDeadline = (pendingTasks || []).filter(t => !t.deadline);
  const inboxLeaking = inboxNoDeadline.filter(t => t.quadrant && t.quadrant !== 'null' && t.quadrant !== '');

  const densityMap = {};
  for (const task of pendingTasks || []) {
    const key = task.deadline || 'NO_DEADLINE';
    densityMap[key] = (densityMap[key] || 0) + 1;
  }

  // ---- Capacity Calculations (14-day window) ----
  let dueIn14dMinutes = 0;
  let unestimated14dCount = 0;
  for (const t of dueIn14d) {
    const mins = t.estimated_minutes || t.time_estimate_minutes;
    if (mins && parseInt(mins, 10) > 0) {
      dueIn14dMinutes += parseInt(mins, 10);
    } else {
      unestimated14dCount++;
    }
  }

  const unestimated14dPct = dueIn14d.length > 0 ? Math.round((unestimated14dCount / dueIn14d.length) * 100) : 0;
  const capacity14dMinutes = 14 * 180; // 2520 minutes realistic baseline
  const ratio14d = Math.round((dueIn14dMinutes / capacity14dMinutes) * 100) / 100;

  // ---- Milestone Pace Calculations (Next 90 Days) ----
  const p0Keywords = ['delft', 'agri solar', 'vignesh', 'emc', 'converter', 'steps', 'erasmus', 'portfolio', 'van effen'];
  const p1Keywords = ['sweden', 'scholarship', 'polimi', 'aalto', 'outreach'];

  function assignPriority(title) {
    const lower = (title || '').toLowerCase();
    if (p0Keywords.some(k => lower.includes(k))) return 'P0';
    if (p1Keywords.some(k => lower.includes(k))) return 'P1';
    return 'P2';
  }

  const milestones90d = (milestones || []).filter(m => {
    return m.status !== 'done' && m.deadline && m.deadline >= auditDate && m.deadline <= ninetyDaysAhead;
  });

  const milestonePace = milestones90d.map(m => {
    const priority = assignPriority(m.title);

    // Find linked pending tasks
    const linkedPending = (pendingTasks || []).filter(t => t.milestone_id === m.id);
    let remainingMinutes = 0;
    let unestimatedCount = 0;

    for (const t of linkedPending) {
      const mins = t.estimated_minutes || t.time_estimate_minutes;
      if (mins && parseInt(mins, 10) > 0) {
        remainingMinutes += parseInt(mins, 10);
      } else {
        remainingMinutes += 15; // default estimate for missing
        unestimatedCount++;
      }
    }

    // Find completed linked tasks in last 14 days
    const linkedCompleted = (completedTasks || []).filter(t => {
      if (t.milestone_id !== m.id) return false;
      const dates = t.completion_dates || [];
      return dates.some(d => d >= fourteenDaysAgo && d <= auditDate);
    });

    const completed14dMinutes = linkedCompleted.reduce((sum, t) => {
      return sum + (t.estimated_minutes || t.time_estimate_minutes || 15);
    }, 0);

    const mDate = new Date(`${m.deadline}T00:00:00Z`);
    const diffDays = Math.max(1, Math.round((mDate - auditDateTime) / 86400000));

    const requiredPace = Math.round((remainingMinutes / diffDays) * 10) / 10;
    const actualPace = Math.round((completed14dMinutes / 14) * 10) / 10;

    let ratio = 1.0;
    if (requiredPace > 0) {
      ratio = Math.round((actualPace / requiredPace) * 100) / 100;
    } else if (remainingMinutes > 0) {
      ratio = 0.0;
    }

    let planStatus = 'ok';
    if (linkedPending.length === 0) {
      planStatus = 'no_plan';
    } else if ((unestimatedCount / linkedPending.length) > 0.4) {
      planStatus = 'no_estimates';
    }

    return {
      id: m.id,
      title: m.title,
      deadline: m.deadline,
      priority,
      days_left: diffDays,
      remaining_estimated_minutes: remainingMinutes,
      completed_14d_minutes: completed14dMinutes,
      required_pace: requiredPace,
      actual_pace: actualPace,
      ratio,
      plan_status: planStatus,
      linked_pending_count: linkedPending.length,
    };
  });

  // ---- Focus / Effort Metrics ----
  const scoredDayPomos = (pomodoroLogs || []).filter(p => p.date === scoredDay);
  const scoredDayFocusMinutes = scoredDayPomos.reduce((sum, p) => {
    return sum + Math.min(parseInt(p.duration_minutes, 10) || 0, 120);
  }, 0);

  // Check 7-day focus streak over 240m
  const dailyFocusMap = {};
  for (const p of pomodoroLogs || []) {
    if (p.date) {
      const mins = Math.min(parseInt(p.duration_minutes, 10) || 0, 120);
      dailyFocusMap[p.date] = (dailyFocusMap[p.date] || 0) + mins;
    }
  }

  let daysOver240Streak = 0;
  for (let i = 1; i <= 7; i++) {
    const dStr = new Date(auditDateTime.getTime() - i * 86400000).toISOString().split('T')[0];
    if ((dailyFocusMap[dStr] || 0) >= 240) {
      daysOver240Streak++;
    } else {
      break;
    }
  }

  let ioInputMin = 0;
  let ioOutputMin = 0;
  for (const item of ioLogs || []) {
    if (item.type === 'input') ioInputMin += parseInt(item.minutes, 10) || 0;
    if (item.type === 'output') ioOutputMin += parseInt(item.minutes, 10) || 0;
  }

  // ---- Outcomes Metrics (Scored Day) ----
  const scoredDayCompletedTasks = (completedTasks || []).filter(t => {
    const dates = t.completion_dates || [];
    return dates.includes(scoredDay);
  });

  const scoredDayWins = (winsData || []).filter(w => w.log_date === scoredDay);

  let outcomesWeightedPoints = 0;
  for (const t of scoredDayCompletedTasks) {
    let pts = 1; // base
    if (t.quadrant === 'urgent_important') pts += 2;
    else if (t.quadrant === 'important_not_urgent') pts += 1;
    if (t.mental_load === 'high') pts += 1;

    // Check if linked to P0 milestone
    if (t.milestone_id) {
      const m = (milestones || []).find(m => m.id === t.milestone_id);
      if (m && assignPriority(m.title) === 'P0') pts += 1;
    }
    outcomesWeightedPoints += pts;
  }

  // Wins: +1 per win, max 2
  outcomesWeightedPoints += Math.min(scoredDayWins.length, 2);

  // ---- Nutrition Metrics ----
  const scoredDayMeals = (mealLogs || []).filter(m => m.log_date === scoredDay);
  const scoredDayProtein = scoredDayMeals.reduce((sum, m) => sum + (parseFloat(m.protein) || 0), 0);
  const scoredDayKcal = scoredDayMeals.reduce((sum, m) => sum + (parseFloat(m.kcal) || 0), 0);

  const loggedDates = new Set((mealLogs || []).map(m => m.log_date));
  let blackoutDays = 0;
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(auditDateTime.getTime() - i * 86400000).toISOString().split('T')[0];
    if (!loggedDates.has(checkDate)) blackoutDays++;
    else break;
  }

  const mealsByDate = {};
  for (const log of mealLogs || []) {
    if (!mealsByDate[log.log_date]) mealsByDate[log.log_date] = [];
    mealsByDate[log.log_date].push(log);
  }

  const nutritionSummary = Object.entries(mealsByDate).map(([date, meals]) => ({
    date,
    meal_count: meals.length,
    total_protein: Math.round(meals.reduce((sum, m) => sum + (parseFloat(m.protein) || 0), 0) * 10) / 10,
    total_kcal: Math.round(meals.reduce((sum, m) => sum + (parseFloat(m.kcal) || 0), 0)),
  }));

  // ---- Exam Context ----
  const examKeywords = ['exam', 'ct1', 'ct2', 'test', 'midterm', 'final', 'economics'];
  let nearestExam = null;
  let halveEffortBands = false;

  for (const m of milestones || []) {
    const lower = (m.title || '').toLowerCase();
    if (examKeywords.some(k => lower.includes(k))) {
      const mDate = new Date(`${m.deadline}T00:00:00Z`);
      const daysAway = Math.round((mDate - auditDateTime) / 86400000);
      if (daysAway >= -1 && daysAway <= 14) {
        if (!nearestExam || daysAway < nearestExam.days_away) {
          nearestExam = { title: m.title, date: m.deadline, days_away: daysAway };
        }
        // Exam on scored day or day after scored day (which is audit date or day after audit)
        if (m.deadline === scoredDay || m.deadline === auditDate || m.deadline === dayAfterAudit) {
          halveEffortBands = true;
        }
      }
    }
  }

  // Also check tasks for CT2 / Economics exam mentions if not in milestones
  if (!nearestExam) {
    for (const t of pendingTasks || []) {
      const lower = (t.title || '').toLowerCase();
      if (examKeywords.some(k => lower.includes(k)) && t.deadline) {
        const tDate = new Date(`${t.deadline}T00:00:00Z`);
        const daysAway = Math.round((tDate - auditDateTime) / 86400000);
        if (daysAway >= -1 && daysAway <= 7) {
          nearestExam = { title: t.title, date: t.deadline, days_away: daysAway };
          if (t.deadline === scoredDay || t.deadline === auditDate || t.deadline === dayAfterAudit) {
            halveEffortBands = true;
          }
          break;
        }
      }
    }
  }

  // Specific hardcoded context check for Economics CT2 on Oct 22
  if (auditDate === '2026-10-21' || scoredDay === '2026-10-21') {
    halveEffortBands = true;
    if (!nearestExam) {
      nearestExam = { title: 'Economics CT2', date: '2026-10-22', days_away: 1 };
    }
  }

  // ---- Outreach Metrics ----
  const sentTargets = (outreachTargets || []).filter(t => t.status === 'sent');
  const sentInPast7d = sentTargets.some(t => t.sent_date && t.sent_date >= sevenDaysAgo);
  const draftedOrQueued = (outreachTargets || []).filter(t => t.status === 'drafted' || t.status === 'queued').length;
  const frozenOver7d = !sentInPast7d && draftedOrQueued > 0;

  const outreachByStatus = {
    drafted: (outreachTargets || []).filter(t => t.status === 'drafted').length,
    queued: (outreachTargets || []).filter(t => t.status === 'queued').length,
    sent: sentTargets.length,
    replied: (outreachTargets || []).filter(t => t.status === 'replied').length,
    total: (outreachTargets || []).length,
  };

  // ---- Build Output JSON ----
  const output = {
    rubric_version: 'v2',
    audit_date: auditDate,
    scored_day: scoredDay,
    tasks: {
      pending: pendingTasks,
      completed_count: (completedTasks || []).length,
      total_pending: (pendingTasks || []).length,
      total_completed: (completedTasks || []).length,
      overdue,
      overdue_count: overdue.length,
      today: todayTasks,
      today_count: todayTasks.length,
      upcoming_7d: upcoming7d,
      due_in_14d: dueIn14d,
      inbox_no_deadline: inboxNoDeadline,
      inbox_no_deadline_count: inboxNoDeadline.length,
      inbox_leaking: inboxLeaking,
      inbox_leaking_count: inboxLeaking.length,
      density_map: densityMap,
    },
    capacity: {
      due_in_14d_tasks_count: dueIn14d.length,
      due_in_14d_minutes: dueIn14dMinutes,
      capacity_14d_minutes: capacity14dMinutes,
      ratio_14d: ratio14d,
      unestimated_count: unestimated14dCount,
      unestimated_pct: unestimated14dPct,
    },
    milestones: milestones || [],
    milestone_count: (milestones || []).length,
    milestone_pace: milestonePace,
    focus: {
      scored_day_minutes: scoredDayFocusMinutes,
      sessions_count: scoredDayPomos.length,
      days_over_240_streak: daysOver240Streak,
      io_split: {
        input_minutes: ioInputMin,
        output_minutes: ioOutputMin,
      },
    },
    outcomes: {
      scored_day_completions: scoredDayCompletedTasks,
      scored_day_completions_count: scoredDayCompletedTasks.length,
      scored_day_wins: scoredDayWins,
      scored_day_wins_count: scoredDayWins.length,
      weighted_points: outcomesWeightedPoints,
    },
    nutrition: {
      protein_target_g: proteinTargetG,
      protein_floor_g: proteinFloorG,
      user_weight_kg: userWeight,
      scored_day_meals: scoredDayMeals,
      scored_day_meal_count: scoredDayMeals.length,
      scored_day_protein: Math.round(scoredDayProtein * 10) / 10,
      scored_day_kcal: Math.round(scoredDayKcal),
      blackout_days: blackoutDays,
      logged_scored_day: scoredDayMeals.length > 0,
      summary_by_date: nutritionSummary,
      meal_logs_7d: mealLogs || [],
    },
    exam_context: {
      halve_effort_bands: halveEffortBands,
      nearest_exam: nearestExam,
    },
    outreach: {
      targets: outreachTargets || [],
      by_status: outreachByStatus,
      sent_in_past_7d: sentInPast7d,
      frozen_over_7d: frozenOver7d,
    },
    morning_briefs: morningBriefs || [],
    warnings,
  };

  const outPath = path.join(process.cwd(), 'scripts', 'temp_audit_data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\n[audit_query_v2] Output: ${outPath}`);
  console.log(`[audit_query_v2] Tasks: ${pendingTasks.length} pending, ${completedTasks.length} completed`);
  console.log(`[audit_query_v2] Overdue: ${overdue.length} | Today: ${todayTasks.length} | Due in 14d: ${dueIn14d.length} (${dueIn14dMinutes}m, ratio ${ratio14d})`);
  console.log(`[audit_query_v2] Focus (scored day ${scoredDay}): ${scoredDayFocusMinutes} min, Outcomes: ${outcomesWeightedPoints} pts`);
  console.log(`[audit_query_v2] Nutrition (scored day ${scoredDay}): ${scoredDayMeals.length} meals, ${scoredDayProtein}g protein (target: ${proteinTargetG}g, floor: ${proteinFloorG}g)`);
  console.log(`[audit_query_v2] Exam Context: halve_effort_bands=${halveEffortBands}, nearest: ${nearestExam?.title || 'None'}`);
  console.log(`[audit_query_v2] Warnings: ${warnings.length}`);
  console.log('[audit_query_v2] Done.');
}

main().catch(err => {
  console.error('[audit_query_v2] Fatal:', err.message);
  process.exit(1);
});
