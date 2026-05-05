import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=')
  if (key && val) envVars[key.trim()] = val.trim()
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('nodes').select('*')
  if (error) console.log("Error:", error)
  else {
    console.log("Nodes count:", data.length)
    if (data.length > 0) {
      const roots = data.filter(n => n.type === 'root')
      console.log("Roots count:", roots.length)
      console.log("Root IDs:", roots.map(r => r.id))
      console.log("Sample nodes:", data.slice(0, 3).map(n => ({ id: n.id, parent: n.parent_id })))
    }
  }
}

check()
