import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function run() {
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or URL in env');
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    console.log('Invoking generate-morning-brief...');
    const { data: mbData, error: mbErr } = await supabase.functions.invoke('generate-morning-brief', {
      body: { force: true }
    });
    if (mbErr) {
      console.error('generate-morning-brief failed:', mbErr);
    } else {
      console.log('generate-morning-brief success:', mbData);
    }

    console.log('Invoking scout-opportunities...');
    const { data: scoutData, error: scoutErr } = await supabase.functions.invoke('scout-opportunities', {
      body: { force: true }
    });
    if (scoutErr) {
      console.error('scout-opportunities failed:', scoutErr);
    } else {
      console.log('scout-opportunities success:', scoutData);
    }

    console.log('Cloud scouts executed successfully.');
  } catch (err) {
    console.error('Failed to run cloud scouts:', err);
    process.exit(1);
  }
}

run();
