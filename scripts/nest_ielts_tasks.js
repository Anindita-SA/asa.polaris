import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { createSafeClient } from './lib/safe_supabase.js';

const CANONICAL_PARENT_TITLE = 'IELTS Preparation Sprint (Oct 3 Exam)';

const SUBTASKS_DEF = [
  {
    title: 'IELTS Writing Practice (Task 1 & Task 2)',
    keywords: ['writing', 'task 1', 'task 2'],
    time_estimate_minutes: 45,
    mental_load: 'high',
    category: 'academic',
    quadrant: 'urgent_important',
    status: 'active'
  },
  {
    title: 'IELTS Speaking Practice (Mock Interview)',
    keywords: ['speaking', 'mock interview'],
    time_estimate_minutes: 20,
    mental_load: 'medium',
    category: 'academic',
    quadrant: 'urgent_important',
    status: 'active'
  },
  {
    title: 'IELTS Reading Practice (Academic Module)',
    keywords: ['reading', 'academic module'],
    time_estimate_minutes: 45,
    mental_load: 'medium',
    category: 'academic',
    quadrant: 'urgent_important',
    status: 'active'
  },
  {
    title: 'IELTS Listening Practice (Full Test Simulation)',
    keywords: ['listening', 'simulation'],
    time_estimate_minutes: 30,
    mental_load: 'low',
    category: 'academic',
    quadrant: 'urgent_important',
    status: 'active'
  }
];

export async function nestIeltsTasks(supabaseClient = null, isDryRun = false) {
  console.log('Starting IELTS task nesting and consolidation...');
  const supabase = supabaseClient || (await createSafeClient('nest_ielts_tasks', false, isDryRun));
  const uid = supabase._uid;

  // 1. Fetch milestone if exists
  let ieltsMilestoneId = null;
  try {
    const { data: milestones, error: mErr } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('user_id', uid)
      .ilike('title', '%ielts%');

    if (mErr) {
      console.warn('Could not query milestones:', mErr.message);
    } else if (milestones && milestones.length > 0) {
      ieltsMilestoneId = milestones[0].id;
      console.log(`Found linked IELTS milestone: ${milestones[0].title} (${ieltsMilestoneId})`);
    }
  } catch (err) {
    console.warn('Milestone query error:', err.message);
  }

  // 2. Fetch all tasks for user
  const { data: allTasks, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', uid);

  if (tErr) {
    console.error('Error querying tasks:', tErr);
    throw tErr;
  }

  const tasks = allTasks || [];

  // 3. Find or create canonical parent task
  let parentTask = tasks.find(t =>
    t.title && t.title.trim().toLowerCase() === CANONICAL_PARENT_TITLE.toLowerCase()
  );

  if (!parentTask) {
    parentTask = tasks.find(t =>
      t.title && t.title.toLowerCase().includes('ielts preparation sprint')
    );
  }

  let parentId = parentTask ? parentTask.id : null;

  const parentPayload = {
    title: CANONICAL_PARENT_TITLE,
    category: 'academic',
    quadrant: 'urgent_important',
    status: 'active',
    time_estimate_minutes: 140,
    mental_load: 'high',
    deadline: '2026-10-03',
    notes: 'Canonical parent sprint task for computer-delivered IELTS exam on Oct 3, 2026.',
    parent_task_id: null
  };
  if (ieltsMilestoneId) {
    parentPayload.milestone_id = ieltsMilestoneId;
  }

  if (parentTask) {
    console.log(`Updating existing canonical parent task ${parentTask.id}...`);
    if (!isDryRun) {
      const { error: pUpdateErr } = await supabase
        .from('tasks')
        .update(parentPayload)
        .eq('id', parentTask.id)
        .eq('user_id', uid);
      if (pUpdateErr) throw pUpdateErr;
    }
  } else {
    console.log('Creating canonical parent sprint task...');
    if (!isDryRun) {
      const insertData = {
        user_id: uid,
        ...parentPayload
      };
      const { data: createdParent, error: pInsertErr } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();
      if (pInsertErr) throw pInsertErr;
      parentId = createdParent.id;
    } else {
      parentId = 'mock-parent-id';
    }
  }

  console.log(`Canonical IELTS parent task ID: ${parentId}`);

  // 4. Create or reparent the 4 child subtasks
  const claimedTaskIds = new Set();
  const subtaskIds = [];

  for (const def of SUBTASKS_DEF) {
    const targetTitleLower = def.title.toLowerCase();

    // Look for exact title match first
    let candidate = tasks.find(t =>
      t.id !== parentId &&
      !claimedTaskIds.has(t.id) &&
      t.title &&
      t.title.trim().toLowerCase() === targetTitleLower
    );

    // Look for existing child matching keywords
    if (!candidate) {
      candidate = tasks.find(t =>
        t.id !== parentId &&
        !claimedTaskIds.has(t.id) &&
        t.parent_task_id === parentId &&
        t.title &&
        def.keywords.some(kw => t.title.toLowerCase().includes(kw))
      );
    }

    // Look for active/inbox/scheduled tasks matching keywords and 'ielts'
    if (!candidate) {
      candidate = tasks.find(t =>
        t.id !== parentId &&
        !claimedTaskIds.has(t.id) &&
        t.status !== 'done' &&
        t.title &&
        t.title.toLowerCase().includes('ielts') &&
        def.keywords.some(kw => t.title.toLowerCase().includes(kw))
      );
    }

    const subtaskPayload = {
      title: def.title,
      parent_task_id: parentId,
      time_estimate_minutes: def.time_estimate_minutes,
      mental_load: def.mental_load,
      category: def.category,
      quadrant: def.quadrant,
      status: def.status
    };

    if (candidate) {
      console.log(`Reparenting existing task "${candidate.title}" (${candidate.id}) -> "${def.title}"...`);
      claimedTaskIds.add(candidate.id);
      subtaskIds.push(candidate.id);

      if (!isDryRun) {
        const { error: sUpdateErr } = await supabase
          .from('tasks')
          .update(subtaskPayload)
          .eq('id', candidate.id)
          .eq('user_id', uid);
        if (sUpdateErr) throw sUpdateErr;
      }
    } else {
      console.log(`Creating child subtask "${def.title}"...`);
      if (!isDryRun) {
        const insertData = {
          user_id: uid,
          ...subtaskPayload
        };
        const { data: createdSubtask, error: sInsertErr } = await supabase
          .from('tasks')
          .insert(insertData)
          .select()
          .single();
        if (sInsertErr) throw sInsertErr;
        if (createdSubtask?.id) {
          claimedTaskIds.add(createdSubtask.id);
          subtaskIds.push(createdSubtask.id);
        }
      } else {
        const mockSubId = `mock-sub-${def.keywords[0]}`;
        claimedTaskIds.add(mockSubId);
        subtaskIds.push(mockSubId);
      }
    }
  }

  // 5. Mark loose active duplicate IELTS tasks as done
  const looseIeltsTasks = tasks.filter(t =>
    t.status !== 'done' &&
    t.id !== parentId &&
    t.parent_task_id !== parentId &&
    !claimedTaskIds.has(t.id) &&
    (t.title || '').toLowerCase().includes('ielts')
  );

  const looseTaskIds = looseIeltsTasks.map(t => t.id);

  if (looseTaskIds.length > 0) {
    console.log(`Found ${looseTaskIds.length} loose active duplicate IELTS task(s). Marking as done...`);
    if (!isDryRun) {
      const { error: dErr } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .in('id', looseTaskIds)
        .eq('user_id', uid);
      if (dErr) throw dErr;
    }
  } else {
    console.log('No loose duplicate IELTS tasks found.');
  }

  console.log('IELTS task nesting and consolidation completed successfully.');
  return {
    parentId,
    subtaskIds,
    looseTaskIds
  };
}

const isDirectExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isDirectExecution) {
  const isDryRun = process.argv.includes('--dry-run');
  nestIeltsTasks(null, isDryRun).catch(err => {
    console.error('IELTS task nesting script failed:', err);
    process.exit(1);
  });
}
