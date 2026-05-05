import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
  const tables = ['nodes', 'milestones', 'habits', 'focus_items', 'pomodoro_logs']
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1)
    if (error) {
      console.log(`Error reading ${t}:`, error.message)
    } else {
      if (data.length > 0) {
        console.log(`Table ${t} columns:`, Object.keys(data[0]).join(', '))
      } else {
        console.log(`Table ${t} is empty, checking columns via empty insert...`)
        const { error: err2 } = await supabase.from(t).insert({ id: '00000000-0000-0000-0000-000000000000' })
        console.log(`Insert error for ${t} (shows columns possibly):`, err2?.message)
      }
    }
  }
}

check()
