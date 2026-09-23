import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSafeClient } from './lib/safe_supabase.js';
import { generateWithFallbackNode } from './lib/llm_utils.js';

/**
 * Deterministic heuristic Eisenhower quadrant classifier when LLM is unavailable.
 */
export function classifyTaskHeuristically(task, activeGoals = []) {
  const currentDate = new Date();
  if (task.deadline) {
    const d = new Date(task.deadline);
    const diffDays = Math.ceil((d - currentDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return 'urgent_important';
    }
  }

  const titleLower = (task.title || '').toLowerCase();
  const notesLower = (task.notes || '').toLowerCase();
  const contextLower = (task.context || '').toLowerCase();
  const fullText = `${titleLower} ${notesLower} ${contextLower}`;

  const isGoalAligned = (activeGoals || []).some(g => {
    const gTitle = (g.title || '').toLowerCase();
    return gTitle.split(/\s+/).some(w => w.length > 3 && fullText.includes(w));
  });

  if (isGoalAligned || /(research|paper|msc|thesis|delft|kicad|code|build|design|write|substack|study|exam|project|portfolio|internship)/i.test(fullText)) {
    return 'important_not_urgent';
  }

  if ((task.estimated_minutes && task.estimated_minutes <= 15) || /(quick|email|inbox|reply|call|submit|pay|ping|update|sync|errand|bill|form|clean)/i.test(fullText)) {
    return 'urgent_not_important';
  }

  return 'neither';
}

/**
 * Deduplicates active tasks (status !== 'done') sharing the same normalized title or source_template_id.
 * Keeps the primary task (most recently updated/created) and returns extraneous duplicate IDs to be resolved.
 *
 * @param {Array} allActiveTasks - List of active tasks from DB
 * @returns {{ keptTasks: Array, duplicateTaskIds: Array }}
 */
export function deduplicateActiveTasks(allActiveTasks = []) {
  if (!allActiveTasks || allActiveTasks.length <= 1) {
    return { keptTasks: allActiveTasks ? [...allActiveTasks] : [], duplicateTaskIds: [] };
  }

  const n = allActiveTasks.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const titleToIdx = new Map();
  const templateToIdx = new Map();

  for (let i = 0; i < n; i++) {
    const task = allActiveTasks[i];
    const cleanTitle = (task.title || '').trim().toLowerCase();
    const templateId = task.source_template_id;

    if (cleanTitle) {
      const key = task.parent_task_id ? `sub:${task.parent_task_id}:${cleanTitle}` : `root:${cleanTitle}`;
      if (titleToIdx.has(key)) {
        union(i, titleToIdx.get(key));
      } else {
        titleToIdx.set(key, i);
      }
    }

    if (templateId) {
      if (templateToIdx.has(templateId)) {
        union(i, templateToIdx.get(templateId));
      } else {
        templateToIdx.set(templateId, i);
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root).push(allActiveTasks[i]);
  }

  const keptTasks = [];
  const duplicateTaskIds = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      keptTasks.push(group[0]);
    } else {
      // Sort group: most recently created first
      const sorted = [...group].sort((a, b) => {
        const tsA = a.created_at;
        const tsB = b.created_at;
        const timeA = tsA ? new Date(tsA).getTime() : 0;
        const timeB = tsB ? new Date(tsB).getTime() : 0;
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        return (b.id || '').localeCompare(a.id || '');
      });

      keptTasks.push(sorted[0]);
      for (let i = 1; i < sorted.length; i++) {
        duplicateTaskIds.push(sorted[i].id);
      }
    }
  }

  return { keptTasks, duplicateTaskIds };
}

/**
 * Deduplicates unsorted tasks against active tasks and within the unsorted batch.
 *
 * @param {Array} unsortedTasks - List of unsorted tasks to triage
 * @param {Array} allActiveTasks - List of active/scheduled/inbox tasks from DB
 * @returns {{ uniqueTasks: Array, duplicateTaskIds: Array }}
 */
export function deduplicateTasks(unsortedTasks = [], allActiveTasks = []) {
  const unsortedIdSet = new Set(unsortedTasks.map(u => u.id));
  const existingTitles = new Set(
    (allActiveTasks || [])
      .filter(t => !unsortedIdSet.has(t.id) && !t.parent_task_id)
      .map(t => (t.title || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const seenTitles = new Set(existingTitles);
  const duplicateTaskIds = [];
  const uniqueTasks = [];

  for (const t of unsortedTasks) {
    const cleanTitle = (t.title || '').trim().toLowerCase();
    if (seenTitles.has(cleanTitle)) {
      duplicateTaskIds.push(t.id);
    } else {
      seenTitles.add(cleanTitle);
      uniqueTasks.push(t);
    }
  }

  return { uniqueTasks, duplicateTaskIds };
}

/**
 * Marks duplicate task IDs with status 'done'.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} uid - User ID
 * @param {Array<string>} duplicateIds - IDs of duplicate tasks to resolve
 * @param {boolean} isDryRun - Whether this is a dry run
 * @returns {Promise<{ updatedCount: number }>}
 */
export async function resolveDuplicates(supabase, uid, duplicateIds = [], isDryRun = false) {
  if (!duplicateIds || duplicateIds.length === 0) return { updatedCount: 0 };
  console.log(`Found ${duplicateIds.length} duplicate tasks in inbox. Marking duplicates as done...`);
  if (!isDryRun) {
    const { error } = await supabase.from('tasks').update({ status: 'done' }).in('id', duplicateIds).eq('user_id', uid);
    if (error) throw error;
  }
  return { updatedCount: duplicateIds.length };
}

/**
 * Increments skip_count for triaged tasks.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} uid - User ID
 * @param {Array} tasks - Triaged tasks
 * @param {boolean} isDryRun - Whether this is a dry run
 * @returns {Promise<number>}
 */
export async function incrementSkipCounts(supabase, uid, tasks = [], isDryRun = false) {
  if (!tasks || tasks.length === 0) return 0;
  const skipPromises = tasks.map(async (task) => {
    if (isDryRun) {
      console.log(`[DRY RUN] Would increment skip_count for task ${task.id}`);
      return true;
    }
    const currentSkipCount = task.skip_count || 0;
    const { error } = await supabase
      .from('tasks')
      .update({ skip_count: currentSkipCount + 1 })
      .eq('id', task.id)
      .eq('user_id', uid);
    if (error) {
      console.error(`Failed to increment skip_count for task ${task.id}:`, error);
      return false;
    }
    return true;
  });
  const skipResults = await Promise.all(skipPromises);
  const skipSuccessCount = skipResults.filter(Boolean).length;
  console.log(`Incremented skip_count for ${skipSuccessCount}/${tasks.length} triaged tasks.`);
  return skipSuccessCount;
}

/**
 * Detects active parent tasks whose child tasks have not moved status in 3 days.
 *
 * @param {Array} allTasks - List of all tasks from DB
 * @param {Date|string|number} [referenceDate=new Date()] - Reference timestamp (for testing)
 * @returns {Array} List of stale parent tasks
 */
export function detectStaleParentTasks(allTasks = [], referenceDate = new Date()) {
  if (!allTasks || allTasks.length === 0) return [];

  const refTime = new Date(referenceDate).getTime();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  const childrenByParentId = new Map();
  for (const t of allTasks) {
    if (t.parent_task_id) {
      if (!childrenByParentId.has(t.parent_task_id)) {
        childrenByParentId.set(t.parent_task_id, []);
      }
      childrenByParentId.get(t.parent_task_id).push(t);
    }
  }

  const staleParents = [];

  for (const task of allTasks) {
    if (task.status === 'done') continue;
    const children = childrenByParentId.get(task.id);
    if (!children || children.length === 0) continue;

    const incompleteChildren = children.filter(c => c.status !== 'done');
    if (incompleteChildren.length > 0) {
      const hasRecentActivity = children.some(c => {
        const ts = c.updated_at || c.created_at;
        if (!ts) return false;
        const itemTime = new Date(ts).getTime();
        return (refTime - itemTime) < THREE_DAYS_MS;
      });

      if (!hasRecentActivity) {
        staleParents.push(task);
      }
    }
  }

  return staleParents;
}

/**
 * Handles stale parent tasks by incrementing skip_count and updating notes.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} uid - User ID
 * @param {Array} staleParents - List of stale parent tasks
 * @param {boolean} isDryRun - Whether this is a dry run
 * @returns {Promise<number>} Number of updated parent tasks
 */
export async function handleStaleParentTasks(supabase, uid, staleParents = [], isDryRun = false) {
  if (!staleParents || staleParents.length === 0) return 0;
  console.log(`Found ${staleParents.length} stale parent tasks with inactive subtasks.`);

  const staleTag = '[Stale: Subtasks inactive for 3+ days]';
  const results = await Promise.all(staleParents.map(async (parent) => {
    const nextSkip = (parent.skip_count || 0) + 1;
    let updatedNotes = parent.notes || '';
    if (!updatedNotes.includes(staleTag)) {
      updatedNotes = updatedNotes ? `${updatedNotes}\n${staleTag}` : staleTag;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would update stale parent task ${parent.id} with skip_count: ${nextSkip} and notes`);
      return true;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        skip_count: nextSkip,
        notes: updatedNotes
      })
      .eq('id', parent.id)
      .eq('user_id', uid);

    if (error) {
      console.error(`Failed to update stale parent task ${parent.id}:`, error);
      return false;
    }
    return true;
  }));

  const count = results.filter(Boolean).length;
  console.log(`Updated ${count}/${staleParents.length} stale parent tasks.`);
  return count;
}

/**
 * Evaluates parent task quadrant based on child subtask urgency inheritance and parent deadline.
 *
 * @param {Object} parentTask - The parent task object
 * @param {Array} childSubtasks - Array of child subtasks belonging to this parent task
 * @param {Date|string|number} [referenceDate=new Date()] - Reference date for deadline evaluation
 * @returns {string|null} Evaluated quadrant ('urgent_important' | 'important_not_urgent' | null)
 */
export function evaluateParentTaskQuadrant(parentTask, childSubtasks = [], referenceDate = new Date()) {
  if (!parentTask) return null;

  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  const isDueIn48h = (deadline) => {
    if (!deadline) return false;
    const d = new Date(typeof deadline === 'string' && !deadline.includes('T') ? deadline + 'T00:00:00' : deadline);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  const isMoreThan3DaysAway = (deadline) => {
    if (!deadline) return true;
    const d = new Date(typeof deadline === 'string' && !deadline.includes('T') ? deadline + 'T00:00:00' : deadline);
    if (isNaN(d.getTime())) return true;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  };

  const incompleteSubtasks = (childSubtasks || []).filter(c => c.status !== 'done');
  const hasUrgentIncompleteChild = incompleteSubtasks.some(c => isDueIn48h(c.deadline));

  // If any incomplete child subtask is due within 48h, evaluate parent quadrant as urgent_important
  if (hasUrgentIncompleteChild) {
    return 'urgent_important';
  }

  // If all urgent child subtasks are done, and parent task's own deadline is > 3 days away, evaluate parent quadrant as important_not_urgent
  if (!hasUrgentIncompleteChild && isMoreThan3DaysAway(parentTask.deadline)) {
    return 'important_not_urgent';
  }

  return null;
}

/**
 * Triages parent tasks based on urgency inheritance from child subtasks.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} uid - User ID
 * @param {Array} allTasks - All tasks for the user
 * @param {boolean} isDryRun - Whether this is a dry run
 * @param {Date|string|number} [referenceDate=new Date()] - Reference date
 * @returns {Promise<Array>} List of updated parent tasks
 */
export async function triageParentTasksUrgency(supabase, uid, allTasks = [], isDryRun = false, referenceDate = new Date()) {
  if (!allTasks || allTasks.length === 0) return [];

  const childrenByParentId = new Map();
  for (const t of allTasks) {
    if (t.parent_task_id) {
      if (!childrenByParentId.has(t.parent_task_id)) {
        childrenByParentId.set(t.parent_task_id, []);
      }
      childrenByParentId.get(t.parent_task_id).push(t);
    }
  }

  const parentTasks = allTasks.filter(t => !t.parent_task_id && t.status !== 'done' && childrenByParentId.has(t.id));
  const updates = [];

  for (const parent of parentTasks) {
    const children = childrenByParentId.get(parent.id) || [];
    const suggestedQuad = evaluateParentTaskQuadrant(parent, children, referenceDate);
    if (suggestedQuad && suggestedQuad !== parent.quadrant) {
      updates.push({ parent, newQuadrant: suggestedQuad });
    }
  }

  if (updates.length > 0) {
    console.log(`Found ${updates.length} parent tasks requiring urgency inheritance updates.`);
    for (const { parent, newQuadrant } of updates) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would update parent task ${parent.id} quadrant to ${newQuadrant}`);
      } else {
        await supabase
          .from('tasks')
          .update({ quadrant: newQuadrant })
          .eq('id', parent.id)
          .eq('user_id', uid);
      }
    }
  }

  return updates;
}

/**
 * Filters unsorted tasks to exclude parents that have subtasks and habit tasks.
 * Parent tasks with children derive their quadrant solely through urgency inheritance.
 *
 * @param {Array} unsortedTasks - Array of candidate tasks to triage
 * @param {Set<string>} parentTaskIdsWithChildren - Set of parent task IDs that have child subtasks
 * @returns {Array} Filtered list of tasks eligible for LLM / rule-based triage
 */
export function filterTasksForTriage(unsortedTasks = [], parentTaskIdsWithChildren = new Set()) {
  return (unsortedTasks || []).filter(t => {
    if (parentTaskIdsWithChildren.has(t.id)) return false;
    if (t.category === 'habits') return false;
    return true;
  });
}

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const MODEL = 'qwen2.5:1.5b';

async function checkOllama() {
  try {
    const res = await fetch('http://127.0.0.1:11434/');
    if (!res.ok) throw new Error('Ollama not ready');
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  try {
    const res = await fetch(process.env.VITE_SUPABASE_URL, { method: 'HEAD' });
    if (!res.ok && res.status !== 405 && res.status !== 404 && res.status !== 200) {
      console.warn("No internet or Supabase unreachable - skipping triage. Will retry next scheduled run.");
      process.exit(0);
    }
  } catch (err) {
    console.warn("No internet or Supabase unreachable - skipping triage. Will retry next scheduled run.");
    process.exit(0);
  }

  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting Local LLM Task Triage... (Dry Run: ${isDryRun})`);

  const ollamaReady = await checkOllama();
  if (!ollamaReady && !isDryRun) {
    console.warn('Ollama is not running on 127.0.0.1:11434. LLM triage will be skipped, but other processing will continue.');
  } else if (!ollamaReady && isDryRun) {
    console.warn('Ollama not running, but continuing for dry run prompt verification.');
  }

  let supabase;
  try {
    // Triage script uses read-mostly mode
    supabase = await createSafeClient('task_triage', true, isDryRun);
  } catch (err) {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  }

  const uid = supabase._uid;

  const triageReport = {
    runDate: new Date().toISOString(),
    orphanTemplates: 0,
    ghostTasks: 0,
    polarisTasks: 0,
    activeDuplicates: 0,
    staleParents: 0,
    parentUrgencyUpdates: 0,
    unsortedDuplicates: 0,
    classifiedTasks: [],
    successCount: 0,
    invalidItems: 0
  };

  try {
    // 0. Pre-process #polaris tasks
    const { data: polarisTasks, error: polarisErr } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', uid)
      .ilike('title', '%#polaris%');
      
    if (polarisErr) throw polarisErr;
    
    if (polarisTasks && polarisTasks.length > 0) {
      console.log(`Found ${polarisTasks.length} #polaris tasks. Moving to polaris category...`);
      triageReport.polarisTasks = polarisTasks.length;
      for (const pt of polarisTasks) {
        const cleanTitle = pt.title.replace(/#polaris/gi, '').trim();
        if (isDryRun) {
           console.log(`[DRY RUN] Would update task ${pt.id} to title: "${cleanTitle}", category: "polaris"`);
        } else {
           await supabase.from('tasks').update({ title: cleanTitle, category: 'polaris' }).eq('id', pt.id).eq('user_id', uid);
        }
      }
    }

    // 1. Fetch user tasks for deduplication, stale parent detection, and urgency inheritance
    const { data: allUserTasks, error: userTasksErr } = await supabase
      .from('tasks')
      .select('id, title, notes, source_template_id, status, quadrant, created_at, parent_task_id, skip_count, deadline')
      .eq('user_id', uid);

    if (userTasksErr) throw userTasksErr;

    const allActiveTasks = (allUserTasks || []).filter(t => t.status !== 'done');

    const { duplicateTaskIds: activeDuplicateIds } = deduplicateActiveTasks(allActiveTasks || []);
    if (activeDuplicateIds.length > 0) {
      console.log(`Found ${activeDuplicateIds.length} active duplicate tasks. Marking duplicates as done...`);
      await resolveDuplicates(supabase, uid, activeDuplicateIds, isDryRun);
      triageReport.activeDuplicates = activeDuplicateIds.length;
    }

    const activeDuplicateIdSet = new Set(activeDuplicateIds);

    // 1b. Stale parent task detection and surface
    const remainingUserTasks = (allUserTasks || []).filter(t => !activeDuplicateIdSet.has(t.id));
    const staleParents = detectStaleParentTasks(remainingUserTasks);
    if (staleParents.length > 0) {
      triageReport.staleParents = staleParents.length;
      await handleStaleParentTasks(supabase, uid, staleParents, isDryRun);
    }

    // 1c. Parent task urgency inheritance triage (sole authority for deciding quadrant for parent tasks with child subtasks)
    const urgencyUpdates = await triageParentTasksUrgency(supabase, uid, remainingUserTasks, isDryRun);
    triageReport.parentUrgencyUpdates = urgencyUpdates.length;

    // Build a set of parent task IDs with child subtasks
    const parentTaskIdsWithChildren = new Set(
      (remainingUserTasks || [])
        .filter(t => t.parent_task_id)
        .map(t => t.parent_task_id)
        .filter(Boolean)
    );

    // 2. Fetch unsorted tasks
    let { data: unsortedTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, notes, deadline, estimated_minutes, skip_count, category')
      .eq('user_id', uid)
      .is('quadrant', null)
      .is('parent_task_id', null)
      .in('status', ['inbox', 'active']);

    if (taskErr) throw taskErr;

    if (!unsortedTasks || unsortedTasks.length === 0) {
      console.log('No unsorted tasks found. Exiting.');

    const reportPath = path.join(process.cwd(), 'docs', '_TRIAGE_REPORT.md');
    let reportMd = `# Triage Report\n\n**Run Date:** ${new Date(triageReport.runDate).toLocaleString()}\n\n`;
    reportMd += `## Summary\n`;
    reportMd += `- **Orphan Templates Deactivated:** ${triageReport.orphanTemplates}\n`;
    reportMd += `- **Ghost Tasks Archived:** ${triageReport.ghostTasks}\n`;
    reportMd += `- **#polaris Tasks Moved:** ${triageReport.polarisTasks}\n`;
    reportMd += `- **Active Duplicates Resolved:** ${triageReport.activeDuplicates}\n`;
    reportMd += `- **Stale Parents Updated:** ${triageReport.staleParents}\n`;
    reportMd += `- **Parent Urgency Updates:** ${triageReport.parentUrgencyUpdates}\n`;
    reportMd += `- **Unsorted Duplicates Resolved:** ${triageReport.unsortedDuplicates}\n`;
    reportMd += `- **Tasks Classified & Triaged:** ${triageReport.successCount}\n`;
    if (triageReport.invalidItems > 0) reportMd += `- **Invalid/Skipped Items:** ${triageReport.invalidItems}\n`;
    
    if (triageReport.classifiedTasks.length > 0) {
      reportMd += `\n## Classified Tasks\n`;
      for (const ct of triageReport.classifiedTasks) {
        reportMd += `- [${ct.quadrant}] ${ct.title}\n`;
      }
    }
    fs.writeFileSync(reportPath, reportMd, 'utf8');
    console.log(`Wrote Triage Report to _TRIAGE_REPORT.md`);

      return;
    }

    // Filter out any unsorted tasks that were marked done in active deduplication
    unsortedTasks = unsortedTasks.filter(t => !activeDuplicateIdSet.has(t.id));

    // Also run batch deduplication on remaining unsorted tasks against remaining active tasks
    const remainingActiveTasks = (allActiveTasks || []).filter(t => !activeDuplicateIdSet.has(t.id));
    const { uniqueTasks, duplicateTaskIds: unsortedDuplicateIds } = deduplicateTasks(unsortedTasks, remainingActiveTasks);

    if (unsortedDuplicateIds.length > 0) {
      await resolveDuplicates(supabase, uid, unsortedDuplicateIds, isDryRun);
      triageReport.unsortedDuplicates = unsortedDuplicateIds.length;
    }

    // Exclude parent tasks that have subtasks and habit category tasks
    unsortedTasks = filterTasksForTriage(uniqueTasks, parentTaskIdsWithChildren);

    if (unsortedTasks.length === 0) {
      console.log('All unsorted tasks were duplicates, habits, or parent tasks with children. Exiting.');

    const reportPath = path.join(process.cwd(), 'docs', '_TRIAGE_REPORT.md');
    let reportMd = `# Triage Report\n\n**Run Date:** ${new Date(triageReport.runDate).toLocaleString()}\n\n`;
    reportMd += `## Summary\n`;
    reportMd += `- **Orphan Templates Deactivated:** ${triageReport.orphanTemplates}\n`;
    reportMd += `- **Ghost Tasks Archived:** ${triageReport.ghostTasks}\n`;
    reportMd += `- **#polaris Tasks Moved:** ${triageReport.polarisTasks}\n`;
    reportMd += `- **Active Duplicates Resolved:** ${triageReport.activeDuplicates}\n`;
    reportMd += `- **Stale Parents Updated:** ${triageReport.staleParents}\n`;
    reportMd += `- **Parent Urgency Updates:** ${triageReport.parentUrgencyUpdates}\n`;
    reportMd += `- **Unsorted Duplicates Resolved:** ${triageReport.unsortedDuplicates}\n`;
    reportMd += `- **Tasks Classified & Triaged:** ${triageReport.successCount}\n`;
    if (triageReport.invalidItems > 0) reportMd += `- **Invalid/Skipped Items:** ${triageReport.invalidItems}\n`;
    
    if (triageReport.classifiedTasks.length > 0) {
      reportMd += `\n## Classified Tasks\n`;
      for (const ct of triageReport.classifiedTasks) {
        reportMd += `- [${ct.quadrant}] ${ct.title}\n`;
      }
    }
    fs.writeFileSync(reportPath, reportMd, 'utf8');
    console.log(`Wrote Triage Report to _TRIAGE_REPORT.md`);

      return;
    }

    console.log(`Found ${unsortedTasks.length} unsorted tasks. Building context...`);

    // 2b. Fetch opportunity scores for Application tasks
    const applyTasks = unsortedTasks.filter(t => t.title.startsWith('Apply for:'));
    if (applyTasks.length > 0) {
      const { data: opps } = await supabase
        .from('hardware_opportunities')
        .select('task_id, profile_match, acceptance_chance')
        .in('task_id', applyTasks.map(t => t.id));
        
      if (opps && opps.length > 0) {
        const oppMap = new Map(opps.map(o => [o.task_id, o]));
        unsortedTasks.forEach(t => {
          if (oppMap.has(t.id)) {
            const opp = oppMap.get(t.id);
            t.context = `Application Opportunity. Profile Match: ${opp.profile_match}%, Acceptance Chance: ${opp.acceptance_chance}%`;
          }
        });
      }
    }

    // 3. Fetch context
    const [goalsRes, eulogyRes] = await Promise.all([
      supabase.from('goals').select('title, deadline').eq('user_id', uid).eq('completed', false),
      supabase.from('eulogies').select('content').eq('user_id', uid).limit(1).maybeSingle()
    ]);

    const activeGoals = (goalsRes.data || []).map(g => `${g.title} (Target: ${g.deadline || 'None'})`).join('; ');
    const eulogyText = eulogyRes.data?.content || 'No specific eulogy set.';

    // 4. Build Prompt
    const currentDate = new Date().toISOString().split('T')[0];
    const prompt = `You are a task triage assistant. Given the tasks below and the user's goals/mission, classify each into an Eisenhower quadrant.
    
    CURRENT DATE: ${currentDate}. Evaluate deadlines relative to this.
    
    QUADRANTS:
    - urgent_important: Due within 3 days OR blocking a critical goal. For applications: High match + approaching deadline.
    - important_not_urgent: Advances long-term goals (TU Delft, portfolio, engineering skills). For applications: High match + no immediate deadline.
    - urgent_not_important: Quick admin/errands, < 15 min, no strategic value. For applications: Low match.
    - neither: Nice-to-have, no deadline, no goal alignment.
    
    USER CONTEXT:
    - Goals: ${activeGoals}
    - Life mission: ${eulogyText.substring(0, 500)}
    - Writing & Reflection: The user is an active Substack writer and needs to capture both good moments and challenges. Creative/writing blocks are highly important for their mental clarity and output, and should be prioritized (e.g., important_not_urgent, or urgent_important if there's a deadline).
    
    TASKS TO CLASSIFY:
    ${JSON.stringify(unsortedTasks, null, 2)}
    
    Return ONLY valid JSON in this exact format, with no markdown formatting or backticks:
    [{"id": "uuid-here", "quadrant": "quadrant-name"}]`;
    
    if (isDryRun) {
      console.log('--- PROMPT SENT TO LLM ---');
      console.log(prompt);
      console.log('--------------------------');
    }

    // 5. Tiered Classification: Ollama -> Groq / Gemini -> Heuristic
    let normalized = [];
    if (ollamaReady) {
      try {
        console.log(`Calling local model: ${MODEL}...`);
        const res = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false,
            format: 'json'
          })
        });

        if (res.ok) {
          const json = await res.json();
          let resultText = json.response ? json.response.trim() : (json.message?.content || "").trim();
          resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(resultText);
          if (Array.isArray(parsed)) {
            normalized = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            for (const key in parsed) {
              if (Array.isArray(parsed[key])) normalized.push(...parsed[key]);
              else if (typeof parsed[key] === 'object') normalized.push(parsed[key]);
              else if (parsed.id && parsed.quadrant) { normalized.push(parsed); break; }
            }
          }
        }
      } catch (ollamaErr) {
        console.warn("Ollama invocation failed, proceeding to cloud LLM fallback:", ollamaErr.message || ollamaErr);
      }
    }

    if (normalized.length === 0) {
      try {
        console.log("Calling Groq/Gemini fallback cascade for task triage...");
        const rawCloudText = await generateWithFallbackNode(prompt, null, null, true);
        if (rawCloudText) {
          let cleanText = rawCloudText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed)) {
            normalized = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            for (const key in parsed) {
              if (Array.isArray(parsed[key])) normalized.push(...parsed[key]);
              else if (typeof parsed[key] === 'object') normalized.push(parsed[key]);
              else if (parsed.id && parsed.quadrant) { normalized.push(parsed); break; }
            }
          }
        }
      } catch (cloudErr) {
        console.warn("Cloud LLM providers unavailable or failed, applying deterministic heuristic triage:", cloudErr.message || cloudErr);
      }
    }

    // Tier 3 Deterministic Heuristic Fallback
    const existingMappedIds = new Set(normalized.map(item => item.id));
    const missingTasks = unsortedTasks.filter(t => !existingMappedIds.has(t.id));
    if (missingTasks.length > 0) {
      console.log(`Applying heuristic triage for ${missingTasks.length} tasks...`);
      for (const t of missingTasks) {
        normalized.push({
          id: t.id,
          quadrant: classifyTaskHeuristically(t, goalsRes?.data || [])
        });
      }
    }

    console.log(`Classified ${normalized.length} total tasks.`);
    
    const validQuadrants = ['urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither'];
    let successCount = 0;

    // 6. Apply updates in parallel
    const validIds = new Set(unsortedTasks.map(t => t.id));
    const validItems = normalized.filter(item => item.id && validIds.has(item.id) && validQuadrants.includes(item.quadrant));
    
    const updatePromises = validItems.map(async (item) => {
      const updateChain = supabase.from('tasks').update({ quadrant: item.quadrant });
      if (isDryRun) {
        updateChain.eq('id', item.id);
        return true;
      } else {
        const { error } = await updateChain.eq('id', item.id).eq('user_id', uid);
        if (error) {
          console.error(`Error updating task ${item.id}:`, error);
          return false;
        }
        await supabase
          .from('tasks')
          .update({ quadrant: item.quadrant })
          .eq('parent_task_id', item.id)
          .eq('user_id', uid);
        return true;
      }
    });

    const results = await Promise.all(updatePromises);
    successCount = results.filter(success => success).length;
    triageReport.successCount = successCount;
    
    const taskMap = new Map(unsortedTasks.map(t => [t.id, t.title]));
    triageReport.classifiedTasks = validItems.map(item => ({
      title: taskMap.get(item.id) || item.id,
      quadrant: item.quadrant
    }));

    // Log items that were skipped because they were invalid
    const invalidItems = normalized.filter(item => !(item.id && validIds.has(item.id) && validQuadrants.includes(item.quadrant)));
    if (invalidItems.length > 0) {
      console.warn(`Skipped ${invalidItems.length} invalid items from LLM response.`);
      triageReport.invalidItems = invalidItems.length;
    }

    console.log(`Triage complete. Successfully processed ${isDryRun ? normalized.length : successCount} tasks.`);

    // 7. Increment skip_count for all triaged tasks (surfaced without action = a skip)
    // await incrementSkipCounts(supabase, uid, unsortedTasks, isDryRun);

    // 8. Output polaris tasks to docs/_FEATURE_PROPOSALS.md
    const { data: devTasks, error: devErr } = await supabase
      .from('tasks')
      .select('id, title, notes, status')
      .eq('user_id', uid)
      .eq('category', 'polaris')
      .neq('status', 'done');

    if (devErr) throw devErr;

    const fpPath = path.join(process.cwd(), 'docs', '_FEATURE_PROPOSALS.md');
    if (devTasks && devTasks.length > 0) {
      let fpContent = `# Polaris Feature Proposals\n\nGenerated on ${new Date().toISOString()}\n\n`;
      for (const t of devTasks) {
        fpContent += `## ${t.title}\n`;
        fpContent += `- **ID:** \`${t.id}\`\n`;
        fpContent += `- **Status:** ${t.status}\n`;
        if (t.notes) fpContent += `- **Notes:** ${t.notes}\n`;
        fpContent += `\n`;
      }
      fs.writeFileSync(fpPath, fpContent, 'utf8');
      console.log(`Wrote ${devTasks.length} dev tasks to _FEATURE_PROPOSALS.md`);
    } else {
      fs.writeFileSync(fpPath, `# Polaris Feature Proposals\n\nNo pending dev tasks found.\n`, 'utf8');
      console.log(`No pending dev tasks found. Wrote empty state to _FEATURE_PROPOSALS.md`);
    }

    // 9. Output Triage Report
    const reportPath = path.join(process.cwd(), 'docs', '_TRIAGE_REPORT.md');
    let reportMd = `# Triage Report\n\n**Run Date:** ${new Date(triageReport.runDate).toLocaleString()}\n\n`;
    reportMd += `## Summary\n`;
    reportMd += `- **Orphan Templates Deactivated:** ${triageReport.orphanTemplates}\n`;
    reportMd += `- **Ghost Tasks Archived:** ${triageReport.ghostTasks}\n`;
    reportMd += `- **#polaris Tasks Moved:** ${triageReport.polarisTasks}\n`;
    reportMd += `- **Active Duplicates Resolved:** ${triageReport.activeDuplicates}\n`;
    reportMd += `- **Stale Parents Updated:** ${triageReport.staleParents}\n`;
    reportMd += `- **Parent Urgency Updates:** ${triageReport.parentUrgencyUpdates}\n`;
    reportMd += `- **Unsorted Duplicates Resolved:** ${triageReport.unsortedDuplicates}\n`;
    reportMd += `- **Tasks Classified & Triaged:** ${triageReport.successCount}\n`;
    if (triageReport.invalidItems > 0) reportMd += `- **Invalid/Skipped Items:** ${triageReport.invalidItems}\n`;
    
    if (triageReport.classifiedTasks.length > 0) {
      reportMd += `\n## Classified Tasks\n`;
      for (const ct of triageReport.classifiedTasks) {
        reportMd += `- [${ct.quadrant}] ${ct.title}\n`;
      }
    }
    fs.writeFileSync(reportPath, reportMd, 'utf8');
    console.log(`Wrote Triage Report to _TRIAGE_REPORT.md`);

  } catch (err) {
    console.error('Triage script failed:', err);
    process.exit(1);
  }
}

export { run };

const isDirectExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isDirectExecution) {
  run();
}
