import 'dotenv/config';
import { createSafeClient } from './lib/safe_supabase.js';

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
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting Local LLM Task Triage... (Dry Run: ${isDryRun})`);

  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    console.error('Ollama is not running on 127.0.0.1:11434. Skipping triage.');
    process.exit(0);
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
    // 1. Fetch unsorted tasks
    const { data: unsortedTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, notes, deadline, estimated_minutes')
      .eq('user_id', uid)
      .is('quadrant', null)
      .in('status', ['inbox', 'active']);

    if (taskErr) throw taskErr;

    if (!unsortedTasks || unsortedTasks.length === 0) {
      console.log('No unsorted tasks found. Exiting.');
      return;
    }

    console.log(`Found ${unsortedTasks.length} unsorted tasks. Building context...`);

    // 2. Fetch context
    const [goalsRes, eulogyRes] = await Promise.all([
      supabase.from('goals').select('title, deadline').eq('user_id', uid).eq('completed', false),
      supabase.from('eulogies').select('content').eq('user_id', uid).limit(1).maybeSingle()
    ]);

    const activeGoals = (goalsRes.data || []).map(g => `${g.title} (Target: ${g.deadline || 'None'})`).join('; ');
    const eulogyText = eulogyRes.data?.content || 'No specific eulogy set.';

    // 3. Build Prompt
    const prompt = `You are a task triage assistant. Given the tasks below and the user's goals/mission, classify each into an Eisenhower quadrant.
    
    QUADRANTS:
    - urgent_important: Due within 3 days OR blocking a critical goal.
    - important_not_urgent: Advances long-term goals (TU Delft, portfolio, engineering skills).
    - urgent_not_important: Quick admin/errands, < 15 min, no strategic value.
    - neither: Nice-to-have, no deadline, no goal alignment.
    
    USER CONTEXT:
    - Goals: ${activeGoals}
    - Life mission: ${eulogyText.substring(0, 500)}
    
    TASKS TO CLASSIFY:
    ${JSON.stringify(unsortedTasks, null, 2)}
    
    Return ONLY valid JSON in this exact format, with no markdown formatting or backticks:
    [{"id": "uuid-here", "quadrant": "quadrant-name"}]`;

    // 4. Call Ollama
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
    let resultText = json.response ? json.response.trim() : (json.message?.content || "").trim();
    
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
        const { error } = await updateChain.eq('id', item.id);
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

  } catch (err) {
    console.error('Triage script failed:', err);
    process.exit(1);
  }
}
run();
