import { generateWithFallbackNode } from './llm_utils.js';

/**
 * TaskIntakeEngine: Deep, atomic milestone subtask generator and intake processor.
 * Replaces disconnected audit generators and fragile downstream regex reparenting.
 */

export async function fetchActiveProjects(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, category, quadrant')
    .eq('user_id', userId)
    .is('parent_task_id', null)
    .neq('status', 'done');

  if (error) throw error;
  return data || [];
}

export async function fetchUpcomingMilestones(supabase, userId, daysAhead = 14) {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const targetStr = targetDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('milestones')
    .select('id, title, deadline, status, note')
    .eq('user_id', userId)
    .neq('status', 'done')
    .gte('deadline', today)
    .lte('deadline', targetStr);

  if (error) throw error;
  return data || [];
}

export function buildIntakePrompt(milestones, parentProjects) {
  const milestoneSummary = milestones.map(m => ({
    id: m.id,
    title: m.title,
    deadline: m.deadline,
    note: m.note
  }));

  const projectSummary = parentProjects.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category
  }));

  return `You are a specialized personal assistant and task delegator for an engineering student and high-volume worker with potential ADHD and a fast-moving, scatter-brained workflow.
Your core mission is to eliminate daily friction, cognitive overload, and decision paralysis.

CORE ASSISTANT PRINCIPLES (ADHD-FRIENDLY & FRICTION-FREE):
1. Low Activation Energy: Generate concrete, bite-sized micro-steps that are effortless to initiate (e.g. "Open KiCad and route pin 4" or "Write 3 bullet points for SOP intro", NOT "Work on hardware" or "Finish essay").
2. No Overwhelming Floods: Never overwhelm the user with broad backlogs. Generate ONLY 1-2 immediate, next physical actions per active milestone due within 14 days.
3. Anti-Corporate & Practical: Strictly personal DIY engineering, circuit testing, simulation, coding, and academic writing. Never generate corporate marketing slop (no "brand guidelines", "PR", or "marketing").
4. Clear Lineage: Every subtask MUST link to a parent project so the user always has clear context and never experiences "where does this belong?" friction.

UPCOMING MILESTONES (Next 14 Days):
${JSON.stringify(milestoneSummary, null, 2)}

ACTIVE CANONICAL PARENT PROJECTS:
${JSON.stringify(projectSummary, null, 2)}

INSTRUCTIONS:
1. For each upcoming milestone due within 14 days, generate 1-2 concrete, immediate, actionable subtasks.
2. For physical hardware projects (Concrete Speaker, CHAARG, DAB power converter), tasks must reflect raw DIY engineering (wiring, schematic checks, code, testing).
3. For academic milestones (NPTEL, Swedish university portal, Agri Solar paper), generate focused, discrete prep tasks.
4. MANDATORY CONTRACT: Every task MUST specify "parent_task_id" matching one of the UUIDs from the ACTIVE CANONICAL PARENT PROJECTS list above if it belongs to that project. If it genuinely does not belong to any parent project, set "parent_task_id": null.
5. Set "milestone_id" to the corresponding milestone UUID.
6. Output ONLY a valid JSON array of task objects. No markdown formatting, no backticks, no explanations.

SCHEMA:
[
  {
    "title": "Clear, action-oriented subtask title",
    "notes": "Actionable instructions and next steps",
    "estimated_minutes": 15,
    "parent_task_id": "uuid-from-projects-or-null",
    "milestone_id": "uuid-from-milestones-or-null"
  }
]`;
}

export function parseAITasks(rawOutput) {
  if (!rawOutput) return [];
  try {
    const cleaned = typeof rawOutput === 'string'
      ? rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim()
      : rawOutput;
    const parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
    const items = Array.isArray(parsed) ? parsed : (parsed?.tasks || []);
    return items.filter(item => item && typeof item.title === 'string' && item.title.trim().length > 0);
  } catch (err) {
    console.error('TaskIntakeEngine: Failed to parse LLM JSON output:', err.message);
    return [];
  }
}

export async function runTaskIntake(supabase, userId, options = {}) {
  const {
    daysAhead = 14,
    isDryRun = false,
    groqApiKey = null,
    geminiApiKey = null
  } = options;

  console.log('TaskIntakeEngine: Starting atomic milestone subtask ingestion...');

  // 1. Fetch data
  const [milestones, parentProjects] = await Promise.all([
    fetchUpcomingMilestones(supabase, userId, daysAhead),
    fetchActiveProjects(supabase, userId)
  ]);

  if (milestones.length === 0) {
    console.log('TaskIntakeEngine: No upcoming milestones within', daysAhead, 'days.');
    return { generated: 0, inserted: 0, tasks: [] };
  }

  console.log(`TaskIntakeEngine: Found ${milestones.length} upcoming milestones and ${parentProjects.length} active parent projects.`);

  // 2. Build prompt and generate
  const prompt = buildIntakePrompt(milestones, parentProjects);
  const response = await generateWithFallbackNode(prompt, groqApiKey, geminiApiKey, {
    asJson: true,
    tryOllama: true,
    ollamaModel: 'qwen2.5:3b'
  });

  const rawTasks = parseAITasks(response);
  if (rawTasks.length === 0) {
    console.log('TaskIntakeEngine: No tasks parsed from LLM response.');
    return { generated: 0, inserted: 0, tasks: [] };
  }

  console.log(`TaskIntakeEngine: LLM returned ${rawTasks.length} candidate tasks.`);

  // 3. Fetch existing tasks to prevent duplicate insertion
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('title, parent_task_id')
    .eq('user_id', userId)
    .neq('status', 'done');

  const existingTitles = new Set((existingTasks || []).map(t => t.title?.trim().toLowerCase()));
  const validParentIds = new Set(parentProjects.map(p => p.id));

  const tasksToInsert = [];
  for (const t of rawTasks) {
    const cleanTitle = t.title.trim();
    if (existingTitles.has(cleanTitle.toLowerCase())) {
      console.log(`TaskIntakeEngine: Skipping duplicate title: "${cleanTitle}"`);
      continue;
    }

    // Validate parent_task_id belongs to an active project
    let assignedParentId = t.parent_task_id;
    if (assignedParentId && !validParentIds.has(assignedParentId)) {
      console.warn(`TaskIntakeEngine: Model returned unknown parent_task_id ${assignedParentId}, setting null`);
      assignedParentId = null;
    }

    // Match parent task category or fallback
    const matchedParent = parentProjects.find(p => p.id === assignedParentId);
    const category = matchedParent ? matchedParent.category : 'career';

    tasksToInsert.push({
      user_id: userId,
      title: cleanTitle,
      notes: t.notes || null,
      estimated_minutes: parseInt(t.estimated_minutes, 10) || 15,
      estimate_source: 'ai',
      status: 'inbox',
      quadrant: null, // Strict Overlook Protection: subtasks and inbox items have null quadrant
      parent_task_id: assignedParentId || null,
      milestone_id: t.milestone_id || null,
      category: category
    });
  }

  if (tasksToInsert.length === 0) {
    console.log('TaskIntakeEngine: All candidate tasks were duplicates. Nothing to insert.');
    return { generated: rawTasks.length, inserted: 0, tasks: [] };
  }

  if (isDryRun) {
    console.log(`[DRY RUN] Would insert ${tasksToInsert.length} atomic tasks:`, tasksToInsert);
    return { generated: rawTasks.length, inserted: tasksToInsert.length, tasks: tasksToInsert };
  }

  const { error: insertErr } = await supabase.from('tasks').insert(tasksToInsert);
  if (insertErr) throw insertErr;

  console.log(`TaskIntakeEngine: Successfully inserted ${tasksToInsert.length} atomic subtasks.`);
  return { generated: rawTasks.length, inserted: tasksToInsert.length, tasks: tasksToInsert };
}
