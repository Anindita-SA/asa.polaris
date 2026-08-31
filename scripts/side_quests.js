import { createSafeClient } from './lib/safe_supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
export const config = {
  groqApiKey: process.env.GROQ_API_KEY
};

/**
 * Validates environment variables.
 */
export function validateEnvironment(cfg = config) {
  if (!cfg.groqApiKey) {
    throw new Error("Missing required environment variable GROQ_API_KEY.");
  }
}

/**
 * Reads the curriculum and extracts current [NEXT] side quests.
 */
export function extractNextQuests() {
  const curriculumPath = path.resolve(__dirname, '../dev guides/curriculum_master_list.md');
  const content = fs.readFileSync(curriculumPath, 'utf8');
  
  // Extract all lines containing [NEXT]
  const nextItems = content
    .split('\n')
    .filter(line => line.includes('[NEXT]'))
    .map(line => line.replace('- **[NEXT]**', '').trim());
    
  return nextItems;
}

/**
 * Calls Groq API to generate tasks based on active [NEXT] side quests.
 */
export async function generateSideQuestTasks(groqApiKey, quests) {
  const prompt = `
You are a productivity and learning assistant for an ambitious engineer.
The user has a Master Curriculum with several active side quests marked as [NEXT].
Here are their current active quests:
${JSON.stringify(quests)}

Pick exactly 2 of these quests to focus on this period. For each chosen quest, generate a concrete, actionable task to make progress on it.
Output ONLY a raw JSON array of task objects. No markdown formatting, no backticks, no explanations.

Schema for each task object:
{
  "title": "Clear action-oriented task title (e.g. 'Complete module 1 of Knight Center Journalism course')",
  "notes": "Context or reasoning for the task",
  "estimated_minutes": 45
}

Generate the JSON array now:`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  const groqData = await response.json();
  if (groqData.error) throw new Error(`Groq API Error: ${groqData.error.message}`);
  
  return groqData.choices[0].message.content.trim();
}

/**
 * Parses the raw AI text into a JSON array safely.
 */
export function parseAITasks(aiText) {
  try {
    const cleanText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON. Output was: ${aiText}`);
  }
}

/**
 * Inserts parsed tasks into the database inbox.
 */
export async function insertTasks(supabase, userId, newTasks) {
  if (!newTasks || newTasks.length === 0) return 0;

  const insertData = newTasks.map(t => ({
    user_id: userId,
    title: t.title,
    notes: t.notes,
    estimated_minutes: t.estimated_minutes || 45,
    estimate_source: 'ai',
    status: 'inbox',
    quadrant: null
  }));

  const { error } = await supabase.from('tasks').insert(insertData);
  if (error) throw error;
  
  return insertData.length;
}

/**
 * Main execution flow.
 */
export async function runSideQuests() {
  console.log("Starting side quest generation...");
  validateEnvironment(config);
  
  const isDryRun = process.argv.includes('--dry-run');
  const supabase = await createSafeClient('side_quests', false, isDryRun);
  const userId = supabase._uid;
  
  const nextQuests = extractNextQuests();
  console.log(`Found ${nextQuests.length} active [NEXT] quests in curriculum.`);
  
  if (nextQuests.length === 0) {
    console.log("No active quests found. Exiting.");
    return;
  }
  
  const rawAIText = await generateSideQuestTasks(config.groqApiKey, nextQuests);
  const parsedTasks = parseAITasks(rawAIText);
  
  const insertedCount = await insertTasks(supabase, userId, parsedTasks);
  console.log(`Successfully inserted ${insertedCount} side quest tasks into the inbox.`);
}

// Execute if run directly via Node CLI
if (process.argv[1] && process.argv[1] === __filename) {
  runSideQuests().catch(err => {
    console.error("Side quests insertion failed:", err);
    process.exit(1);
  });
}
