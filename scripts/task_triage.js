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
    let resultText = json.response.trim();
    
    let parsed = JSON.parse(resultText);
    
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    const validQuadrants = ['urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither'];
    let successCount = 0;

    // 5. Apply updates
    const validIds = new Set(unsortedTasks.map(t => t.id));
    for (const item of parsed) {
      if (item.id && validIds.has(item.id) && validQuadrants.includes(item.quadrant)) {
        const updateChain = supabase.from('tasks').update({ quadrant: item.quadrant });
        if (isDryRun) {
           updateChain.eq('id', item.id);
        } else {
           const { error } = await updateChain.eq('id', item.id);
           if (error) console.error(`Error updating task ${item.id}:`, error);
           else successCount++;
        }
      } else {
        console.warn('Invalid item skipped:', item);
      }
    }

    console.log(`Triage complete. Successfully processed ${isDryRun ? parsed.length : successCount} tasks.`);

  } catch (err) {
    console.error('Triage script failed:', err);
    process.exit(1);
  }
}
run();
