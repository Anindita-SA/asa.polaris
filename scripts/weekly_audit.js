import 'dotenv/config';
import { createSafeClient } from './lib/safe_supabase.js';
import { generateWithFallbackNode } from './lib/llm_utils.js';

// Configuration
export const config = {
  groqApiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
};

/**
 * Validates environment variables.
 */
export function validateEnvironment(cfg = config) {
  if (!cfg.groqApiKey) {
    throw new Error("Missing required environment variables (GROQ_API_KEY).");
  }
}

/**
 * Initializes Supabase client.
 */
export async function getSupabaseClient() {
  return await createSafeClient('weekly_audit', false, false);
}

/**
 * Fetches the primary user ID from the safe client.
 */
export async function fetchPrimaryUser(supabase) {
  if (!supabase._uid) throw new Error("Could not find a user profile.");
  return supabase._uid;
}

/**
 * Fetches upcoming milestones (next 14 days).
 */
export async function fetchUpcomingMilestones(supabase, userId, daysAhead = 14) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done')
    .lte('deadline', targetDate.toISOString().split('T')[0]);
    
  if (error) throw error;
  return data || [];
}

/**
 * Fetches recent meal logs (past 7 days).
 */
export async function fetchRecentMeals(supabase, userId, daysBack = 7) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', targetDate.toISOString().split('T')[0]);

  if (error) throw error;
  return data || [];
}

/**
 * Calls Groq API to generate tasks based on milestones and meals.
 */
export async function generateTasksFromAI(groqApiKey, milestones, meals) {
  const prompt = `
You are a productivity and nutrition auditor.
Analyze the following user data and generate actionable tasks.
Output ONLY a raw JSON array of task objects. No markdown formatting, no backticks, no explanations.

Schema for each task object:
{
  "title": "Clear action-oriented task title",
  "notes": "Reasoning or details for the task",
  "estimated_minutes": 15
}

Rules for Tasks:
1. Look at these Upcoming Milestones: ${JSON.stringify(milestones)}
   - Generate 1-2 concrete, immediate sub-tasks to move forward on any milestone due within 14 days.
2. Look at these Recent Meals: ${JSON.stringify(meals)}
   - Check if any single egg/egg-based meal has suspiciously high protein (>12g per egg).
   - Check if any meals are missing cost data.
   - If anomalies exist, create ONE task titled "Audit Nutrition Logs" and list the anomalies in the notes.

Generate the JSON array now:`;

  const geminiApiKey = process.env.GEMINI_API_KEY || null;
  if (!groqApiKey && !geminiApiKey) throw new Error("No LLM API keys configured");
  
  return await generateWithFallbackNode(prompt, groqApiKey, geminiApiKey, false);
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

  const { data: existingTasks, error: fetchErr } = await supabase
    .from('tasks')
    .select('title')
    .eq('user_id', userId)
    .neq('status', 'done');

  if (fetchErr) throw fetchErr;

  const existingTitles = new Set(
    (existingTasks || []).map(t => t.title?.trim().toLowerCase())
  );

  const filteredTasks = newTasks.filter(t => t.title && !existingTitles.has(t.title.trim().toLowerCase()));

  if (filteredTasks.length === 0) return 0;

  const insertData = filteredTasks.map(t => ({
    user_id: userId,
    title: t.title,
    notes: t.notes,
    estimated_minutes: t.estimated_minutes || 15,
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
export async function runAudit() {
  console.log("Starting weekly AI audit...");
  
  const supabase = await getSupabaseClient();
  const userId = await fetchPrimaryUser(supabase);
  
  const [milestones, meals] = await Promise.all([
    fetchUpcomingMilestones(supabase, userId),
    fetchRecentMeals(supabase, userId)
  ]);
  
  console.log(`Found ${milestones.length} upcoming milestones and ${meals.length} recent meals.`);
  
  const rawAIText = await generateTasksFromAI(config.groqApiKey, milestones, meals);
  const parsedTasks = parseAITasks(rawAIText);
  
  const insertedCount = await insertTasks(supabase, userId, parsedTasks);
  console.log(`Successfully inserted ${insertedCount} tasks into the inbox.`);
}

import { fileURLToPath } from 'url';
// Execute if run directly via Node CLI
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  runAudit().catch(err => {
    console.error("Audit failed:", err);
    process.exit(1);
  });
}
