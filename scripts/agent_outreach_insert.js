import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createSafeClient } from './lib/safe_supabase.js';

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  let supabase;

  try {
    supabase = await createSafeClient('agent_outreach_insert', false, isDryRun);
  } catch (err) {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  }

  const uid = supabase._uid;

  try {
    const input = fs.readFileSync(0, 'utf-8');
    const cleanInput = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;

    if (!cleanInput.trim()) {
      console.log('No input provided.');
      return;
    }

    const payload = JSON.parse(cleanInput);
    let rawTargets = [];

    if (Array.isArray(payload)) {
      rawTargets = payload;
    } else if (Array.isArray(payload.targets)) {
      rawTargets = payload.targets;
    } else if (Array.isArray(payload.outreach_targets)) {
      rawTargets = payload.outreach_targets;
    } else if (payload && typeof payload === 'object' && payload.name && payload.institution) {
      rawTargets = [payload];
    } else {
      console.error('Invalid input: Expected an array of targets or an object with "targets" array.');
      process.exit(1);
    }

    if (rawTargets.length === 0) {
      console.log('Zero targets to insert.');
      return;
    }

    const targetsToInsert = rawTargets.map((item) => {
      if (!item.name || !item.institution) {
        throw new Error(`Target missing required name or institution: ${JSON.stringify(item)}`);
      }
      return {
        name: item.name,
        institution: item.institution,
        email: item.email || null,
        status: item.status || 'researching',
        fit_brief: item.fit_brief || null,
        draft_text: item.draft_text || null,
        source_papers: item.source_papers || null,
        sent_date: item.sent_date || null,
        follow_up_due: item.follow_up_due || null,
        user_id: uid,
      };
    });

    const { error } = await supabase.from('outreach_targets').insert(targetsToInsert);
    if (error && !isDryRun) throw error;

    console.log(`Successfully inserted ${targetsToInsert.length} outreach targets.`);
  } catch (err) {
    console.error('Failed to insert outreach targets:', err.message || err);
    process.exit(1);
  }
}

run();
