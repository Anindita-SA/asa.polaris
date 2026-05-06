
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envStr = fs.readFileSync('.env', 'utf-8');
const env = {};
envStr.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.slice(0,i).trim()] = line.slice(i+1).trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { error } = await supabase.from('goals').insert({ 
    title: 'Test Daily', 
    target: 1, 
    scope: 'daily'
  });
  console.log('Insert daily error:', error);
}
check();
