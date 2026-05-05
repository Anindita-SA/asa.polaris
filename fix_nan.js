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

async function fixNaNs() {
  const { data, error } = await supabase.from('nodes').select('id, x_pos, y_pos')
  if (error) {
    console.error('Error fetching nodes:', error)
    return
  }
  let fixedCount = 0
  for (const node of data) {
    if (isNaN(node.x_pos) || isNaN(node.y_pos) || node.x_pos === null || node.y_pos === null) {
      console.log('Fixing node', node.id)
      await supabase.from('nodes').update({
        x_pos: 0.5 + (Math.random() * 0.1 - 0.05),
        y_pos: 0.5 + (Math.random() * 0.1 - 0.05)
      }).eq('id', node.id)
      fixedCount++
    }
  }
  console.log('Fixed', fixedCount, 'nodes')
}

fixNaNs()
