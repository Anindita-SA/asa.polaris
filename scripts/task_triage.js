import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSafeClient } from './lib/safe_supabase.js';

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
      .filter(t => !unsortedIdSet.has(t.id))
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
      for (const pt of polarisTasks) {
        const cleanTitle = pt.title.replace(/#polaris/gi, '').trim();
        if (isDryRun) {
           console.log(`[DRY RUN] Would update task ${pt.id} to title: "${cleanTitle}", category: "polaris"`);
        } else {
           await supabase.from('tasks').update({ title: cleanTitle, category: 'polaris' }).eq('id', pt.id).eq('user_id', uid);
        }
      }
    }

    // 1. Fetch unsorted tasks
    let { data: unsortedTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, notes, deadline, estimated_minutes, skip_count, category')
      .eq('user_id', uid)
      .is('quadrant', null)
      .in('status', ['inbox', 'active']);

    if (taskErr) throw taskErr;

    if (!unsortedTasks || unsortedTasks.length === 0) {
      console.log('No unsorted tasks found. Exiting.');
      return;
    }

    // 1a. Deduplicate tasks (prevent duplicates of existing active/scheduled/inbox tasks)
    const { data: allActiveTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', uid)
      .neq('status', 'done');
      
    const { uniqueTasks, duplicateTaskIds } = deduplicateTasks(unsortedTasks, allActiveTasks);

    if (duplicateTaskIds.length > 0) {
      await resolveDuplicates(supabase, uid, duplicateTaskIds, isDryRun);
    }

    unsortedTasks = uniqueTasks;
    unsortedTasks = unsortedTasks.filter(t => t.category !== 'habits');

    if (unsortedTasks.length === 0) {
      console.log('All unsorted tasks were duplicates or habits. Exiting.');
      return;
    }

    console.log(`Found ${unsortedTasks.length} unsorted tasks. Building context...`);

    // 1b. Fetch opportunity scores for Application tasks
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

    // 2. Fetch context
    const [goalsRes, eulogyRes] = await Promise.all([
      supabase.from('goals').select('title, deadline').eq('user_id', uid).eq('completed', false),
      supabase.from('eulogies').select('content').eq('user_id', uid).limit(1).maybeSingle()
    ]);

    const activeGoals = (goalsRes.data || []).map(g => `${g.title} (Target: ${g.deadline || 'None'})`).join('; ');
    const eulogyText = eulogyRes.data?.content || 'No specific eulogy set.';

    // 3. Build Prompt
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

    // 4. Call Ollama
    let resultText = "";
    if (ollamaReady) {
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

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }

      const json = await res.json();
      resultText = json.response ? json.response.trim() : (json.message?.content || "").trim();
    } else {
      console.log("Mocking LLM response since Ollama is not ready...");
      resultText = "[]"; // Empty response
    }
    
    console.log("LLM Raw Output:", resultText);

    let parsed = JSON.parse(resultText);
    
    // Normalize LLM output to a flat array
    let normalized = [];
    if (Array.isArray(parsed)) {
      normalized = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Handle cases where the LLM returns {"id": [...]} or {"id": {id, quadrant}}
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) {
          normalized.push(...parsed[key]);
        } else if (typeof parsed[key] === 'object') {
          normalized.push(parsed[key]);
        } else if (parsed.id && parsed.quadrant) {
          // It's a single object
          normalized.push(parsed);
          break;
        }
      }
    }
    
    const validQuadrants = ['urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither'];
    let successCount = 0;

    // 5. Apply updates in parallel
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
        return true;
      }
    });

    const results = await Promise.all(updatePromises);
    successCount = results.filter(success => success).length;

    // Log items that were skipped because they were invalid
    const invalidItems = normalized.filter(item => !(item.id && validIds.has(item.id) && validQuadrants.includes(item.quadrant)));
    if (invalidItems.length > 0) {
      console.warn(`Skipped ${invalidItems.length} invalid items from LLM response.`);
    }

    console.log(`Triage complete. Successfully processed ${isDryRun ? parsed.length : successCount} tasks.`);

    // 5b. Increment skip_count for all triaged tasks (surfaced without action = a skip)
    await incrementSkipCounts(supabase, uid, unsortedTasks, isDryRun);

    // 6. Output polaris tasks to docs/_FEATURE_PROPOSALS.md
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
