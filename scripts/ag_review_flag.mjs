import 'dotenv/config';
import { createSafeClient } from './lib/safe_supabase.js';

async function run() {
  const taskId = process.argv[2];
  if (!taskId) {
    console.error('Usage: node ag_review_flag.mjs <task_id>');
    process.exit(1);
  }

  let supabase;
  try {
    supabase = await createSafeClient('ag_review_flag', true, false);
  } catch (err) {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  }

  const uid = supabase._uid;

  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .eq('user_id', uid)
      .single();

    if (fetchErr || !task) {
      console.error('Task ' + taskId + ' not found or error fetching:', fetchErr);
      process.exit(1);
    }

    if (task.title.includes('[NEEDS REVIEW]')) {
      console.log('Task already has [NEEDS REVIEW] flag.');
      process.exit(0);
    }

    const newTitle = task.title + ' [NEEDS REVIEW]';

    const { error: updateErr } = await supabase
      .from('tasks')
      .update({ title: newTitle })
      .eq('id', taskId)
      .eq('user_id', uid);

    if (updateErr) {
      console.error('Failed to update task:', updateErr);
      process.exit(1);
    }

    console.log('Successfully flagged task ' + taskId + ' as [NEEDS REVIEW]');
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
}

run();
