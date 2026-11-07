#!/usr/bin/env node
/**
 * Polaris Daily Objectives Deployment Script
 *
 * Deploys the daily audit report's 3 primary objectives and quick wins into Polaris:
 * 1. Reads docs/task_audit_report.md Section 4 (Today's Directives).
 * 2. Matches corresponding tasks in Supabase.
 * 3. Updates their deadline to today's date in `tasks` table.
 * 4. Inserts / updates `daily_plan` (slots 1, 2, 3) and `daily_plan_items` in Supabase.
 *
 * Enforces the 3-primary daily cap rule: strictly max 3 primaries per day.
 * Never creates arbitrary or unvetted tasks.
 *
 * Usage:
 *   node scripts/deploy_daily_objectives.js [YYYY-MM-DD]
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const lockPath = path.join(process.cwd(), '.user_id_lock');
  if (!fs.existsSync(lockPath)) {
    console.error('ERROR: Missing .user_id_lock file in project root');
    process.exit(1);
  }
  const userId = fs.readFileSync(lockPath, 'utf8').trim();

  // Determine target date
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const todayStr = process.argv[2] || localNow.toISOString().split('T')[0];

  console.log(`[deploy_daily_objectives] User: ${userId}`);
  console.log(`[deploy_daily_objectives] Deploying objectives for date: ${todayStr}`);

  // 1. Read docs/task_audit_report.md
  const reportPath = path.join(process.cwd(), 'docs', 'task_audit_report.md');
  if (!fs.existsSync(reportPath)) {
    console.error('ERROR: docs/task_audit_report.md not found.');
    process.exit(1);
  }

  const reportText = fs.readFileSync(reportPath, 'utf8');

  // Parse Section 4: Primaries and Quick Wins
  const section4Match = reportText.match(/## 4\. Today's Directives[\s\S]*?(?=## 5\.|$)/i);
  if (!section4Match) {
    console.error('ERROR: Could not find Section 4 in docs/task_audit_report.md');
    process.exit(1);
  }
  const section4Text = section4Match[0];

  // Extract the 3 primaries: "1. **Primary 1 (<tag>): <Title>** - <mins> mins | <load> load"
  const primaryRegex = /\d+\.\s+\*\*Primary\s+\d+(?:\s+\([^)]+\))?:\s+([^*]+)\*\*\s+-\s+(\d+)\s+mins\s+\|\s+(\w+)\s+load/gi;
  const parsedPrimaries = [];
  let pMatch;
  while ((pMatch = primaryRegex.exec(section4Text)) !== null) {
    parsedPrimaries.push({
      title: pMatch[1].trim(),
      minutes: parseInt(pMatch[2], 10) || 30,
      load: pMatch[3].trim()
    });
  }

  if (parsedPrimaries.length === 0) {
    // Fallback regex if header format has slight variance
    const fallbackRegex = /\d+\.\s+\*\*([^*]+)\*\*\s+-\s+(\d+)\s+mins/gi;
    let fbMatch;
    while ((fbMatch = fallbackRegex.exec(section4Text)) !== null) {
      let rawTitle = fbMatch[1].trim();
      rawTitle = rawTitle.replace(/^Primary\s+\d+(?:\s+\([^)]+\))?:\s*/i, '');
      parsedPrimaries.push({
        title: rawTitle,
        minutes: parseInt(fbMatch[2], 10) || 30,
        load: 'medium'
      });
    }
  }

  console.log(`[deploy_daily_objectives] Found ${parsedPrimaries.length} primaries in report:`);
  parsedPrimaries.forEach((p, idx) => console.log(`  P${idx + 1}: ${p.title} (${p.minutes}m, ${p.load})`));

  if (parsedPrimaries.length === 0) {
    console.error('ERROR: No primary directives parsed from report.');
    process.exit(1);
  }

  // Parse Quick Wins line-by-line
  const parsedQuickWins = [];
  const qwSectionMatch = section4Text.match(/### Quick Wins[\s\S]*?(?=### Deliberately Deferred|$)/i);
  if (qwSectionMatch) {
    const qwLines = qwSectionMatch[0].split('\n');
    for (const rawLine of qwLines) {
      const trimmed = rawLine.trim();
      const match = trimmed.match(/^-\s+(.+?)\s+\((\d+)\s*min(?:\s*each)?\)$/i);
      if (match) {
        parsedQuickWins.push({
          title: match[1].trim(),
          minutes: parseInt(match[2], 10) || 10
        });
      }
    }
  }
  console.log(`[deploy_daily_objectives] Found ${parsedQuickWins.length} quick wins in report:`);
  parsedQuickWins.forEach(qw => console.log(`  QW: ${qw.title} (${qw.minutes}m)`));

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  // 2. Fetch all user tasks from Supabase
  const { data: allTasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, user_id, title, deadline, status, quadrant, parent_task_id, estimated_minutes, time_estimate_minutes')
    .eq('user_id', userId);

  if (taskErr) {
    console.error('ERROR: Failed to query tasks from Supabase:', taskErr);
    process.exit(1);
  }

  const findTask = (queryTitle) => {
    const qLower = queryTitle.toLowerCase().trim();
    // 1. Exact match
    let match = allTasks.find(t => (t.title || '').toLowerCase().trim() === qLower);
    if (match) return match;

    // 2. Substring inclusion
    match = allTasks.find(t => {
      const tLower = (t.title || '').toLowerCase().trim();
      return tLower.includes(qLower) || qLower.includes(tLower);
    });
    if (match) return match;

    // 3. Keyword matching for known canonical topics
    const isEmi = qLower.includes('emi') || qLower.includes('lisn') || qLower.includes('converter') || (qLower.includes('proposal') && qLower.includes('pitch'));
    const isLor = qLower.includes('lor') || qLower.includes('recommendation') || qLower.includes('reference') || qLower.includes('letter');
    const isSandwell = qLower.includes('sandwell');
    const isLetterhead = qLower.includes('letterhead');

    if (isEmi) {
      if (qLower.includes('simulink') || qLower.includes('lisn') || qLower.includes('parasitical')) {
        return allTasks.find(t => (t.title || '').toLowerCase().includes('50-ohm lisn'));
      }
      if (qLower.includes('spectra') || qLower.includes('spectrum') || qLower.includes('extract')) {
        return allTasks.find(t => (t.title || '').toLowerCase().includes('extract cm/dm'));
      }
      return allTasks.find(t => (t.title || '').toLowerCase().includes('proposal') && (t.title || '').toLowerCase().includes('emi'));
    }
    if (isLor) {
      return allTasks.find(t => (t.title || '').toLowerCase().includes('recommendation') || (t.title || '').toLowerCase().includes('lor'));
    }
    if (isSandwell) {
      return allTasks.find(t => (t.title || '').toLowerCase().includes('sandwell'));
    }
    if (isLetterhead) {
      return allTasks.find(t => (t.title || '').toLowerCase().includes('letterhead'));
    }

    return null;
  };

  // Match tasks
  const matchedPrimaries = [];
  for (const p of parsedPrimaries) {
    const t = findTask(p.title);
    if (t) {
      matchedPrimaries.push({ ...p, task: t });
    } else {
      console.warn(`[deploy_daily_objectives] Warning: Could not match primary task "${p.title}"`);
    }
  }

  const matchedQuickWins = [];
  for (const qw of parsedQuickWins) {
    const t = findTask(qw.title);
    if (t) {
      matchedQuickWins.push({ ...qw, task: t });
    }
  }

  console.log(`[deploy_daily_objectives] Matched ${matchedPrimaries.length} primaries and ${matchedQuickWins.length} quick wins.`);

  // 3. Update task deadlines in Supabase `tasks` table
  const tasksToUpdateToday = new Set();
  matchedPrimaries.forEach(p => {
    tasksToUpdateToday.add(p.task.id);
    if (p.task.parent_task_id) {
      tasksToUpdateToday.add(p.task.parent_task_id);
    }
  });
  matchedQuickWins.forEach(qw => {
    tasksToUpdateToday.add(qw.task.id);
  });

  const updateIds = Array.from(tasksToUpdateToday);
  console.log(`[deploy_daily_objectives] Updating deadline to ${todayStr} for ${updateIds.length} tasks...`);

  const { error: updateErr } = await supabase
    .from('tasks')
    .update({
      deadline: todayStr,
      status: 'active'
    })
    .in('id', updateIds)
    .eq('user_id', userId);

  if (updateErr) {
    console.error('ERROR: Failed to update task deadlines:', updateErr);
    process.exit(1);
  }
  console.log('[deploy_daily_objectives] Successfully updated task deadlines.');

  // 4. Construct daily_plan and daily_plan_items
  // Check existing daily_plan rows for todayStr
  const { data: existingPlans, error: planCheckErr } = await supabase
    .from('daily_plan')
    .select('id, slot, task_id, target_boxes, done_boxes')
    .eq('user_id', userId)
    .eq('plan_date', todayStr);

  if (planCheckErr) {
    console.error('ERROR: Failed to check existing daily_plan:', planCheckErr);
    process.exit(1);
  }

  // Allocate slots 1, 2, 3
  // Group primaries by parent_task_id if they share a parent
  const parentGroups = new Map();
  matchedPrimaries.forEach(p => {
    const parentId = p.task.parent_task_id || p.task.id;
    if (!parentGroups.has(parentId)) {
      parentGroups.set(parentId, []);
    }
    parentGroups.get(parentId).push(p);
  });

  const sortedParentGroups = Array.from(parentGroups.entries()).sort((a, b) => {
    const minsA = a[1].reduce((sum, item) => sum + (item.minutes || 30), 0);
    const minsB = b[1].reduce((sum, item) => sum + (item.minutes || 30), 0);
    return minsB - minsA; // Anchor (>= 60 min) gets Slot 1
  });

  const slotsData = [];
  let slotIndex = 1;

  for (const [parentId, items] of sortedParentGroups) {
    if (slotIndex > 3) break;
    const totalMinutes = items.reduce((sum, item) => sum + (item.minutes || 30), 0);
    const targetBoxes = Math.max(1, Math.ceil(totalMinutes / 15));

    // Determine subtasks
    const subtaskIds = items
      .filter(it => it.task.id !== parentId)
      .map(it => it.task.id);

    // If parent is standalone with subtasks in quick wins, add them
    matchedQuickWins.forEach(qw => {
      if (qw.task.parent_task_id === parentId && !subtaskIds.includes(qw.task.id)) {
        subtaskIds.push(qw.task.id);
      }
    });

    slotsData.push({
      slot: slotIndex,
      task_id: parentId,
      target_boxes: targetBoxes,
      subtaskIds
    });
    slotIndex++;
  }

  // If we have fewer than 3 slots, check if quick wins have an outreach or standalone container
  if (slotIndex <= 3 && matchedQuickWins.length > 0) {
    const remainingQW = matchedQuickWins.filter(qw => {
      return !slotsData.some(s => s.subtaskIds.includes(qw.task.id) || s.task_id === qw.task.id);
    });
    if (remainingQW.length > 0) {
      const qwParentId = remainingQW[0].task.parent_task_id || remainingQW[0].task.id;
      const qwSubtaskIds = remainingQW.map(qw => qw.task.id);
      slotsData.push({
        slot: slotIndex,
        task_id: qwParentId,
        target_boxes: 2,
        subtaskIds: qwSubtaskIds
      });
      slotIndex++;
    }
  }

  console.log(`[deploy_daily_objectives] Configured ${slotsData.length} daily_plan slots:`);
  slotsData.forEach(s => console.log(`  Slot ${s.slot}: task_id=${s.task_id}, boxes=${s.target_boxes}, items=${s.subtaskIds.length}`));

  // Upsert daily_plan rows
  const deployedPlanIds = [];
  for (const s of slotsData) {
    const existing = (existingPlans || []).find(p => p.slot === s.slot);
    let planId = existing?.id;

    if (existing) {
      const { error: updErr } = await supabase
        .from('daily_plan')
        .update({
          task_id: s.task_id,
          target_boxes: s.target_boxes,
          status: 'planned'
        })
        .eq('id', planId)
        .eq('user_id', userId);

      if (updErr) console.error(`Error updating daily_plan slot ${s.slot}:`, updErr);
    } else {
      const { data: insData, error: insErr } = await supabase
        .from('daily_plan')
        .insert({
          user_id: userId,
          plan_date: todayStr,
          slot: s.slot,
          task_id: s.task_id,
          unit: 'min',
          target_boxes: s.target_boxes,
          done_boxes: 0,
          manual_boxes: 0,
          status: 'planned',
          source: 'auto'
        })
        .select('id')
        .single();

      if (insErr) {
        console.error(`Error inserting daily_plan slot ${s.slot}:`, insErr);
      } else {
        planId = insData.id;
      }
    }

    if (planId) {
      deployedPlanIds.push({ planId, subtaskIds: s.subtaskIds });
    }
  }

  // Update daily_plan_items
  for (const { planId, subtaskIds } of deployedPlanIds) {
    if (!subtaskIds || subtaskIds.length === 0) continue;

    // Clean existing items for this plan
    await supabase.from('daily_plan_items').delete().eq('plan_id', planId).eq('user_id', userId);

    const itemsToInsert = subtaskIds.map((taskId, pos) => ({
      user_id: userId,
      plan_id: planId,
      task_id: taskId,
      position: pos,
      completed_by_slot: false
    }));

    const { error: itemInsErr } = await supabase.from('daily_plan_items').insert(itemsToInsert);
    if (itemInsErr) {
      console.error(`Error inserting daily_plan_items for plan ${planId}:`, itemInsErr);
    }
  }

  console.log(`[deploy_daily_objectives] Daily plan successfully deployed for ${todayStr}.`);
}

main().catch(err => {
  console.error('[deploy_daily_objectives] Fatal error:', err);
  process.exit(1);
});
