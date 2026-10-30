import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lastScoutDateFile = path.join(__dirname, '.last_scout_date');

async function run() {
  const args = process.argv.slice(2);
  const forceAdmin = args.includes('--force-admin') || args.includes('--admin-override');
  const today = new Date().toLocaleDateString('en-CA');

  if (!forceAdmin && fs.existsSync(lastScoutDateFile)) {
    const lastDate = fs.readFileSync(lastScoutDateFile, 'utf8').trim();
    if (lastDate === today) {
      console.log(`Cloud scouts already ran today (${today}). Skipping duplicate run.`);
      process.exit(0);
    }
  }

  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or URL in env');
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    console.log('Invoking scout-opportunities...');
    const scoutPayload = forceAdmin
      ? { force: true, admin_override: true }
      : { force: false };

    const { data: scoutData, error: scoutErr } = await supabase.functions.invoke('scout-opportunities', {
      body: scoutPayload
    });
    if (scoutErr) {
      console.error('scout-opportunities failed:', scoutErr);
    } else {
      console.log('scout-opportunities success:', scoutData);
      fs.writeFileSync(lastScoutDateFile, today, 'utf8');
    }

    console.log('Invoking generate-morning-brief...');
    const { data: mbData, error: mbErr } = await supabase.functions.invoke('generate-morning-brief', {
      body: { force: true }
    });
    if (mbErr) {
      console.error('generate-morning-brief failed:', mbErr);
    } else {
      console.log('generate-morning-brief success:', mbData);
    }

    console.log('Cloud scouts executed successfully.');
  } catch (err) {
    console.error('Failed to run cloud scouts:', err);
    process.exit(1);
  }
}

run();
