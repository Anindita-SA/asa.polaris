import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting reading tasks migration (dry run: ${isDryRun})...`);

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Fetch any tasks matching Read: prefix or Dense-Fluid
  const { data: tasks, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, user_id, title, notes, status, quadrant, created_at')
    .or('title.ilike.Read: %,title.ilike.%Dense-Fluid%');

  if (fetchErr) {
    console.error('Error fetching tasks:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${tasks?.length || 0} reading tasks to process.`);

  if (!tasks || tasks.length === 0) {
    console.log('No reading tasks found. Complete.');
    return;
  }

  for (const task of tasks) {
    const cleanTitle = task.title.replace(/^Read:\s*/i, '').trim();
    const notes = task.notes || '';

    // Check if already in media_log
    const { data: existingMedia } = await supabase
      .from('media_log')
      .select('id')
      .eq('user_id', task.user_id)
      .eq('title', cleanTitle)
      .limit(1);

    if (!existingMedia || existingMedia.length === 0) {
      const sourceMatch = notes.match(/Source:\s*([^\n]+)/i);
      const urlMatch = notes.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
      const summaryMatch = notes.match(/Summary:\s*([\s\S]+)/i);

      const source = sourceMatch ? sourceMatch[1].trim() : 'Morning Brief';
      const url = urlMatch ? urlMatch[1].trim() : null;
      const summary = summaryMatch ? summaryMatch[1].trim() : null;

      const mediaEntry = {
        user_id: task.user_id,
        title: cleanTitle,
        author_or_creator: source,
        media_type: 'article',
        status: 'want_to',
        recommended_by: 'Morning Brief',
        one_line_takeaway: summary,
        full_review: url ? `URL: ${url}` : null,
        tags: ['morning-brief', 'article']
      };

      if (!isDryRun) {
        const { data: inserted, error: insertErr } = await supabase
          .from('media_log')
          .insert(mediaEntry)
          .select()
          .single();

        if (insertErr) {
          console.error(`Error inserting media_log:`, insertErr);
          continue;
        }
        console.log(`Inserted media_log entry: ${inserted.id}`);
      } else {
        console.log(`[DRY RUN] Would insert media_log entry for: ${cleanTitle}`);
      }
    } else {
      console.log(`media_log already contains entry for: "${cleanTitle}" (id: ${existingMedia[0].id})`);
    }

    if (!isDryRun) {
      const { error: delErr } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
        .eq('user_id', task.user_id);

      if (delErr) {
        console.error(`Error deleting task ${task.id}:`, delErr);
      } else {
        console.log(`Deleted task [${task.id}]: "${task.title}"`);
      }
    } else {
      console.log(`[DRY RUN] Would delete task [${task.id}]: "${task.title}"`);
    }
  }

  console.log('\nReading tasks migration completed successfully.');
}

main().catch(err => {
  console.error('Fatal error in migration:', err);
  process.exit(1);
});
