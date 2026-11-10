import './lib/env_loader.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { createSafeClient } from './lib/safe_supabase.js';

export const CANONICAL_PARENTS = [
  {
    key: 'chaarg_hw',
    title: 'CHAARG Hardware & PCB Documentation',
    category: 'career',
    quadrant: 'urgent_important',
    deadline: '2026-11-07',
    mental_load: 'high',
    status: 'active',
    notes: 'Canonical parent sprint task for CHAARG KiCad hardware design and manufacturing package.'
  },
  {
    key: 'chaarg_doc',
    title: 'CHAARG: Hardware Case Study & Portfolio Documentation',
    category: 'career',
    quadrant: 'important_not_urgent',
    deadline: '2026-11-09',
    mental_load: 'medium',
    status: 'scheduled',
    notes: 'Canonical parent sprint task for CHAARG Hardware Case Study and Portfolio Documentation.'
  },
  {
    key: 'agri',
    title: 'Agri Solar Energy Survey Paper (Collaboration & Synthesis)',
    category: 'academic',
    quadrant: 'important_not_urgent',
    deadline: '2026-11-20',
    mental_load: 'medium',
    status: 'scheduled',
    notes: 'Canonical parent sprint task for Agri Solar Energy Survey Paper (Collaboration & Synthesis).'
  },
  {
    key: 'masters',
    title: "Master's Portfolio & Application Strategy",
    category: 'academic',
    quadrant: 'important_not_urgent',
    deadline: '2026-10-15',
    mental_load: 'high',
    status: 'active',
    notes: "Canonical parent sprint task for Master's Portfolio layout, Europass CV, and Application Strategy."
  },
  {
    key: 'speaker',
    title: 'Concrete Speaker Portfolio Project',
    category: 'creative',
    quadrant: 'neither',
    deadline: '2026-10-31',
    mental_load: 'medium',
    status: 'active',
    notes: 'Canonical parent sprint task for Concrete Speaker Portfolio showcase and demonstrations.'
  },
  {
    key: 'vignesh',
    title: 'Conducted EMI/EMC Filter Design & Simulation Paper (Power Electronics Research)',
    category: 'academic',
    quadrant: 'urgent_important',
    deadline: '2026-11-10',
    milestone_id: '1586bc04-8175-4535-8007-0926e97f7cbe',
    mental_load: 'high',
    status: 'active',
    notes: 'Canonical parent sprint task for simulation-based research paper on Dual Active Bridge (DAB) converter closed-loop control and conducted EMI filtering.'
  },
  {
    key: 'nptel',
    title: 'NPTEL Exam Preparation',
    category: 'academic',
    quadrant: 'important_not_urgent',
    deadline: '2026-10-16',
    mental_load: 'high',
    status: 'active',
    notes: 'Canonical parent sprint task for NPTEL Exam.'
  }
];

export async function nestProjectTasks(supabaseClient = null, isDryRun = false) {
  console.log('Starting project task nesting and consolidation...');
  const supabase = supabaseClient || (await createSafeClient('nest_project_tasks.js', false, isDryRun));
  const uid = supabase._uid;

  // 1. Fetch all tasks for user
  const { data: allTasks, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', uid);

  if (tErr) {
    console.error('Error querying tasks:', tErr);
    throw tErr;
  }

  const tasks = allTasks || [];
  const parentIds = {};

  // 2. Ensure the 4 canonical parent sprint tasks exist
  for (const pDef of CANONICAL_PARENTS) {
    let existingParent = tasks.find(t =>
      t.title && (
        t.title.trim().toLowerCase() === pDef.title.toLowerCase() ||
        (pDef.key === 'vignesh' && t.title.toLowerCase().includes('conducted emi/emc filter design'))
      )
    );

    const parentPayload = {
      title: pDef.title,
      category: pDef.category,
      quadrant: pDef.quadrant,
      deadline: pDef.deadline,
      mental_load: pDef.mental_load,
      status: pDef.status,
      notes: pDef.notes,
      parent_task_id: null
    };

    if (existingParent) {
      console.log(`Found existing canonical parent "${pDef.title}" (${existingParent.id}). Preserving manual changes.`);
      parentIds[pDef.key] = existingParent.id;
      // Do not update the parent payload to avoid overwriting user manual changes
    } else {
      console.log(`Creating canonical parent "${pDef.title}"...`);
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
        parentIds[pDef.key] = createdParent.id;
      } else {
        parentIds[pDef.key] = `mock-parent-${pDef.key}`;
      }
    }
    console.log(`Canonical Parent [${pDef.key}] ID: ${parentIds[pDef.key]}`);
  }

  const chaargHwParentId = parentIds.chaarg_hw;
  const chaargDocParentId = parentIds.chaarg_doc;
  const agriParentId = parentIds.agri;
  const mastersParentId = parentIds.masters;
  const speakerParentId = parentIds.speaker;
  const vigneshParentId = parentIds.vignesh;
  const nptelParentId = parentIds.nptel;

  // 3. Match and reparent child tasks
  const chaargKeywords = [
    'kicad',
    'chaarg',
    'drc',
    'photo taking',
    'photos of the completed pcb',
    'caption',
    'photos to the documentation',
    'schematic notes',
    'pcb\'s schematic',
    'description of the pcb',
    'pdf export',
    'chaarg_pcb_documentation',
    'chaarg pcb documentation',
    'verify all components are placed and routed'
  ];

  const vigneshKeywords = [
    'dab survey',
    'dab control',
    'dr. vignesh',
    'vignesh',
    'sic emi',
    'emc',
    'dab converter',
    'sic mosfet',
    'tag 3 papers as \'dab control\'',
    'dab survey paper'
  ];

  const agriKeywords = [
    'sections 1 & 2',
    'sections 1-2',
    'section 3',
    'section 4a',
    'section 4b',
    'section 5',
    'sections 6 & 7',
    'sections 6-7',
    'prisma flowchart',
    'literature matrix',
    'zotero setup',
    'notebooklm',
    'mdpi energies',
    'mdpi template',
    'agri solar survey paper',
    'agri energy survey',
    'agri solar',
    'agri energy',
    'synthesize literature',
    'first pass',
    'second pass',
    'thematic batches to notebooklm',
    'battery longevity as primary metric'
  ];

  const mastersKeywords = [
    'portfolio: refine visual layout for ipd standards',
    'portfolio layout for ipd',
    'ipd standards',
    'europass cv',
    'update resume & create europass cv',
    'weekly cold email batch',
    'send weekly cold email batch',
    'personal statement',
    'sweden',
    'swedish',
    'replace placeholders',
    'portfolio site',
    'deadline',
    'application'
  ];

  const speakerKeywords = [
    'youtube',
    'soundcloud',
    'demonstrating the speaker',
    'concrete speaker',
    'upload 2 images of the concrete speaker',
    'portfolio: add process photos for concrete speaker',
    'project page titled \'concrete speaker\''
  ];

  const nptelKeywords = [
    'nptel'
  ];

  const updatedChildCounts = { chaarg_hw: 0, chaarg_doc: 0, agri: 0, masters: 0, speaker: 0, vignesh: 0, nptel: 0 };

  for (const t of tasks) {
    // Never reparent canonical parent tasks themselves
    if (Object.values(parentIds).includes(t.id)) continue;

    const titleLower = (t.title || '').toLowerCase();

    // Match NPTEL child tasks
    if (nptelKeywords.some(kw => titleLower.includes(kw))) {
      if (t.parent_task_id !== nptelParentId) {
        console.log(`Reparenting NPTEL task: "${t.title}" (${t.id}) -> parent ${nptelParentId}`);
        updatedChildCounts.nptel++;
        if (!isDryRun) {
          const { error: nErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: nptelParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (nErr) throw nErr;
        }
      }
      continue;
    }

    // Match CHAARG child tasks
    if (chaargKeywords.some(kw => titleLower.includes(kw))) {
      const isDocTask = titleLower.includes('case study') || titleLower.includes('render') || titleLower.includes('documentation') || titleLower.includes('portfolio');
      const targetParentId = isDocTask ? chaargDocParentId : chaargHwParentId;
      const countKey = isDocTask ? 'chaarg_doc' : 'chaarg_hw';
      if (t.parent_task_id !== targetParentId && t.parent_task_id !== chaargHwParentId && t.parent_task_id !== chaargDocParentId) {
        console.log(`Reparenting CHAARG task: "${t.title}" (${t.id}) -> parent ${targetParentId}`);
        updatedChildCounts[countKey]++;
        if (!isDryRun) {
          const { error: cErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: targetParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (cErr) throw cErr;
        }
      }
      continue;
    }

    // Match Vignesh DAB / EMC child tasks FIRST (before generic survey terms)
    if (vigneshKeywords.some(kw => titleLower.includes(kw))) {
      if (t.parent_task_id !== vigneshParentId) {
        console.log(`Reparenting Vignesh DAB research task: "${t.title}" (${t.id}) -> parent ${vigneshParentId}`);
        updatedChildCounts.vignesh++;
        if (!isDryRun) {
          const { error: vErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: vigneshParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (vErr) throw vErr;
        }
      }
      continue;
    }

    // Match Agri Solar child tasks
    if (agriKeywords.some(kw => titleLower.includes(kw))) {
      if (t.parent_task_id !== agriParentId) {
        console.log(`Reparenting Agri Solar task: "${t.title}" (${t.id}) -> parent ${agriParentId}`);
        updatedChildCounts.agri++;
        if (!isDryRun) {
          const { error: aErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: agriParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (aErr) throw aErr;
        }
      }
      continue;
    }

    // Match Master's child tasks
    if (mastersKeywords.some(kw => titleLower.includes(kw))) {
      if (t.parent_task_id !== mastersParentId) {
        console.log(`Reparenting Master's task: "${t.title}" (${t.id}) -> parent ${mastersParentId}`);
        updatedChildCounts.masters++;
        if (!isDryRun) {
          const { error: mErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: mastersParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (mErr) throw mErr;
        }
      }
      continue;
    }

    // Match Concrete Speaker child tasks
    if (speakerKeywords.some(kw => titleLower.includes(kw))) {
      if (t.parent_task_id !== speakerParentId) {
        console.log(`Reparenting Concrete Speaker task: "${t.title}" (${t.id}) -> parent ${speakerParentId}`);
        updatedChildCounts.speaker++;
        if (!isDryRun) {
          const { error: sErr } = await supabase
            .from('tasks')
            .update({ parent_task_id: speakerParentId })
            .eq('id', t.id)
            .eq('user_id', uid);
          if (sErr) throw sErr;
        }
      }
      continue;
    }
  }

  console.log('Reparenting summary:', updatedChildCounts);

  // 4. Soft-retire non-P0 deprecated tasks
  const deprecatedKeywords = [
    'submit reef internship form',
    'consolidate cover letter',
    'phase 1: triage & snowballing',
    'phase 1: zotero setup'
  ];

  const deprecatedTasks = tasks.filter(t => {
    if (t.status === 'done' || t.status === 'archived') return false;
    const titleLower = (t.title || '').toLowerCase();
    return deprecatedKeywords.some(kw => titleLower.includes(kw));
  });

  if (deprecatedTasks.length > 0) {
    console.log(`Found ${deprecatedTasks.length} deprecated tasks to soft-retire (mark done)...`);
    for (const dt of deprecatedTasks) {
      console.log(`Retiring: "${dt.title}" (${dt.id})`);
    }
    const deprecatedIds = deprecatedTasks.map(t => t.id);
    if (!isDryRun) {
      const { error: rErr } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .in('id', deprecatedIds)
        .eq('user_id', uid);
      if (rErr) throw rErr;
    }
  } else {
    console.log('No deprecated tasks to soft-retire.');
  }

  console.log('Project task nesting and consolidation completed successfully.');
  return {
    parentIds,
    updatedChildCounts,
    retiredCount: deprecatedTasks.length
  };
}

const isDirectExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isDirectExecution) {
  const isDryRun = process.argv.includes('--dry-run');
  nestProjectTasks(null, isDryRun).catch(err => {
    console.error('Project task nesting script failed:', err);
    process.exit(1);
  });
}
