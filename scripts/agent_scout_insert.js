import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  try {
    const input = fs.readFileSync(0, 'utf-8');
    const cleanInput = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input; const payload = JSON.parse(cleanInput);
    const { userId, opportunities, morningBriefHighlight } = payload;
    
    let uid = userId; 
    if (!uid) { 
      const { data } = await supabase.from('profiles').select('id').limit(1); 
      uid = data?.[0]?.id; 
    } 
    if (!uid) throw new Error('Could not find user profile');

    if (opportunities && opportunities.length > 0) {
      const { error } = await supabase.from('hardware_opportunities').insert(
        opportunities.map(opp => ({ ...opp, user_id: uid }))
      );
      if (error) throw error;
      console.log(`Successfully inserted ${opportunities.length} opportunities.`);
    }

    if (morningBriefHighlight) {
      const today = new Date().toLocaleDateString('en-CA');
      const { data: existingBrief } = await supabase
        .from('morning_briefs')
        .select('id, items')
        .eq('user_id', uid)
        .eq('date', today)
        .maybeSingle();
        
      if (existingBrief) {
        const newItems = [...(existingBrief.items || []), morningBriefHighlight];
        await supabase.from('morning_briefs').update({ items: newItems }).eq('id', existingBrief.id);
        console.log(`Appended highlight to today's brief.`);
      } else {
        await supabase.from('morning_briefs').insert({
          user_id: uid, date: today, items: [morningBriefHighlight], seen: false
        });
        console.log(`Created new brief with highlight.`);
      }
    }
  } catch (err) {
    console.error('Failed to insert scout results:', err);
    process.exit(1);
  }
}
run();
