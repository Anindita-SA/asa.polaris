// Quick diagnostic — check if curriculum tables exist and have data
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://msplriifoeyknlusfixm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcGxyaWlmb2V5a25sdXNmaXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzgxNDYsImV4cCI6MjA5MDI1NDE0Nn0.Ipg7Shpe_AfU6pQ21vUk69QOmHqV_hKEH_34JISJKn8'
)

async function main() {
  // Login with test account
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'polaris.test@gmail.com', password: 'PolarisTester'
  })
  if (authErr) { console.error('AUTH FAIL:', authErr.message); process.exit(1) }
  console.log('Logged in as:', auth.user.id)

  // Check each table
  const tables = ['curriculum_categories', 'curricula', 'curriculum_topics', 'curriculum_resources', 'media_log']
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3)
    console.log(`\n${t}:`, error ? `ERROR: ${error.message}` : `${data?.length || 0} rows`)
    if (data?.length) console.log('  sample:', JSON.stringify(data[0]).slice(0, 150))
  }

  // Now try inserting a test category
  console.log('\n--- Testing insert ---')
  const { data: testCat, error: insertErr } = await supabase.from('curriculum_categories').insert({
    user_id: auth.user.id, title: 'TEST', accent_color: '#ff0000', position: 99
  }).select().single()
  console.log('Insert result:', insertErr ? `ERROR: ${insertErr.message}` : `OK id=${testCat?.id}`)

  // Clean up test
  if (testCat?.id) {
    await supabase.from('curriculum_categories').delete().eq('id', testCat.id)
    console.log('Cleaned up test row')
  }
}

main().catch(e => console.error('FATAL:', e))
