import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createSafeClient } from './lib/safe_supabase.js';

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  let supabase;
  
  try {
    supabase = await createSafeClient('agent_scout_insert', false, isDryRun);
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
    const { opportunities, morningBriefItems } = payload;
    
    if (opportunities && opportunities.length > 0) {
      const { error } = await supabase.from('hardware_opportunities').insert(
        opportunities.map(opp => ({ ...opp, user_id: uid }))
      );
      if (error && !isDryRun) throw error;
      console.log(`Successfully inserted ${opportunities.length} opportunities.`);
    }

    if (morningBriefItems && morningBriefItems.length > 0) {
      // Tag items as opportunity
      const taggedItems = morningBriefItems.map(item => ({ ...item, type: 'opportunity' }));
      const today = new Date().toLocaleDateString('en-CA');
      
      const { data: existingBrief } = await supabase
        .from('morning_briefs')
        .select('id, items')
        .eq('user_id', uid)
        .eq('date', today)
        .maybeSingle();
        
      if (existingBrief) {
        // Keep existing news, replace/append opportunities
        const existingNews = (existingBrief.items || []).filter(i => i.type !== 'opportunity');
        const newItems = [...existingNews, ...taggedItems];
        
        const updateChain = supabase.from('morning_briefs').update({ items: newItems });
        if (isDryRun) {
            updateChain.eq('id', existingBrief.id);
        } else {
            const { error: updErr } = await updateChain.eq('id', existingBrief.id);
            if (updErr) throw updErr;
        }
        console.log(`Appended ${taggedItems.length} opportunities to today's brief.`);
      } else {
        const insertChain = supabase.from('morning_briefs').insert({
          user_id: uid, date: today, items: taggedItems, seen: false
        });
        if (!isDryRun) {
            const { error: insErr } = await insertChain;
            if (insErr) throw insErr;
        }
        console.log(`Created new brief with ${taggedItems.length} opportunities.`);
      }
    }
  } catch (err) {
    console.error('Failed to insert scout results:', err);
    process.exit(1);
  }
}
run();
