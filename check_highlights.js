import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=')
  if (key && val) envVars[key.trim()] = val.trim()
})

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://msplriifoeyknlusfixm.supabase.co'
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('highlights').select('*')
  console.log("Error:", error)
  console.log("Highlights count:", data?.length)
  if (data) {
    const todayRows = data.filter(r => r.date === new Date().toISOString().split('T')[0])
    console.log("Today rows:", todayRows.length)
    console.log(todayRows)
  }
}

check()
