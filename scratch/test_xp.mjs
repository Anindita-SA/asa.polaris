import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://msplriifoeyknlusfixm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcGxyaWlmb2V5a25sdXNmaXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzgxNDYsImV4cCI6MjA5MDI1NDE0Nn0.Ipg7Shpe_AfU6pQ21vUk69QOmHqV_hKEH_34JISJKn8'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  // 1. List all profiles (anon read - might be blocked by RLS)
  console.log('\n--- 1. Fetching profiles (anon read) ---')
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, xp').limit(5)
  if (pErr) {
    console.error('Profile read error (expected if RLS):', pErr.message)
  } else {
    console.log('Profiles found:', profiles)
  }

  // 2. Test increment_xp with a positive amount (anon call)
  console.log('\n--- 2. Testing increment_xp RPC (positive, anon) ---')
  const { error: rpcPosErr } = await supabase.rpc('increment_xp', { user_id: '00000000-0000-0000-0000-000000000000', amount: 10 })
  if (rpcPosErr) {
    console.error('RPC positive error:', rpcPosErr.message, '| Code:', rpcPosErr.code)
  } else {
    console.log('RPC positive call: OK (no error)')
  }

  // 3. Test increment_xp with a NEGATIVE amount (anon call)
  console.log('\n--- 3. Testing increment_xp RPC (NEGATIVE, anon) ---')
  const { error: rpcNegErr } = await supabase.rpc('increment_xp', { user_id: '00000000-0000-0000-0000-000000000000', amount: -10 })
  if (rpcNegErr) {
    console.error('RPC NEGATIVE error:', rpcNegErr.message, '| Code:', rpcNegErr.code)
  } else {
    console.log('RPC negative call: OK (no error)')
  }

  // 4. Try direct profiles update (anon)
  console.log('\n--- 4. Testing direct profiles UPDATE (anon) ---')
  const { error: updateErr } = await supabase.from('profiles').update({ xp: 999 }).eq('id', '00000000-0000-0000-0000-000000000000')
  if (updateErr) {
    console.error('Direct update error:', updateErr.message, '| Code:', updateErr.code)
  } else {
    console.log('Direct update: OK')
  }
}

run()
