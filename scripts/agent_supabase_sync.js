import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars, prioritizing a special agent env file for the service role key
dotenv.config({ path: path.join(__dirname, '../.env.agent') });
dotenv.config({ path: path.join(__dirname, '../.env') }); // fallback to main .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing. The agent cannot bypass RLS without it.");
  process.exit(1);
}

// Initialize Supabase with the Service Role Key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncTasks() {
  const syncFilePath = path.join(__dirname, '../src/data/local_tasks_sync.json');
  
  if (!fs.existsSync(syncFilePath)) {
    console.log("No tasks to sync.");
    return;
  }

  const tasks = JSON.parse(fs.readFileSync(syncFilePath, 'utf8'));
  
  console.log(`Syncing ${tasks.length} tasks to Supabase...`);

  // Fetch user ID based on configured agent email or fallback to first user
  const userEmail = process.env.AGENT_USER_EMAIL || "";
  
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  const user = userEmail
    ? users.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase())
    : users.users[0];
  if (!user) {
      console.error(`Could not find a Supabase user. Provide AGENT_USER_EMAIL or check auth table.`);
      return;
  }
  
  const userId = user.id;

  for (const task of tasks) {
    // Check if task exists for this user by title
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('user_id', userId)
      .eq('title', task.title);

    let error;
    if (existingTasks && existingTasks.length > 0) {
      // Check current status in DB
      const remoteStatus = existingTasks[0].status;
      
      // Update existing, but respect user's 'done' status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          notes: task.notes,
          quadrant: task.quadrant,
          deadline: task.deadline,
          estimated_minutes: task.estimated_minutes,
          estimate_source: task.estimate_source,
          status: remoteStatus === 'done' ? 'done' : task.status
        })
        .eq('id', existingTasks[0].id);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: task.title,
          notes: task.notes,
          quadrant: task.quadrant,
          deadline: task.deadline,
          estimated_minutes: task.estimated_minutes,
          estimate_source: task.estimate_source,
          status: task.status
        });
      error = insertError;
    }

    if (error) {
      console.error(`Failed to sync task "${task.title}":`, error.message);
    } else {
      console.log(`✅ Synced: ${task.title}`);
    }
  }
}

syncTasks();
