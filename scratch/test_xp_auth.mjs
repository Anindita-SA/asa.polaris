import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '.env.test')
let testEmail = '', testPassword = ''

try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const [k, v] = line.split('=')
    if (k?.trim() === 'POLARIS_TEST_EMAIL') testEmail = v?.trim()
    if (k?.trim() === 'POLARIS_TEST_PASSWORD') testPassword = v?.trim()
  }
} catch {
  console.error('Could not read scratch/.env.test')
  process.exit(1)
}

if (!testEmail || !testPassword) {
  console.error('Fill in POLARIS_TEST_EMAIL and POLARIS_TEST_PASSWORD in scratch/.env.test')
  process.exit(1)
}

const supabase = createClient(
  'https://msplriifoeyknlusfixm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcGxyaWlmb2V5a25sdXNmaXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzgxNDYsImV4cCI6MjA5MDI1NDE0Nn0.Ipg7Shpe_AfU6pQ21vUk69QOmHqV_hKEH_34JISJKn8'
)

function pass(msg) { console.log(`  ✅ PASS: ${msg}`) }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`) }
function info(msg) { console.log(`  ℹ️  ${msg}`) }

async function ensureProfile(userId) {
  // Check if profile exists
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId)
  if (existing && existing.length > 0) return existing[0]

  // Create profile if missing
  console.log('  (Creating profile for test user...)')
  const { data: created, error } = await supabase.from('profiles')
    .insert({ id: userId, xp: 100 })
    .select()
  if (error) {
    console.error('  Profile creation failed:', error.message)
    return null
  }
  return created?.[0]
}

async function run() {
  console.log('\n==============================')
  console.log('  POLARIS XP DIAGNOSTIC SUITE')
  console.log('==============================\n')

  // ── AUTH ──────────────────────────────────────────────────────────────────
  console.log('1. Authenticating...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword })
  if (authErr) { fail(`Auth failed: ${authErr.message}`); process.exit(1) }
  const userId = authData.user.id
  pass(`Signed in as ${authData.user.email} | UID: ${userId}`)

  // ── PROFILE ───────────────────────────────────────────────────────────────
  console.log('\n2. Ensuring profile exists...')
  const profile = await ensureProfile(userId)
  if (!profile) { fail('Could not get or create profile'); process.exit(1) }
  const startXP = profile.xp ?? 0
  pass(`Current XP: ${startXP}`)

  // ── RPC EXISTS? ───────────────────────────────────────────────────────────
  console.log('\n3. Testing increment_xp RPC (+100)...')
  const { error: addErr } = await supabase.rpc('increment_xp', { user_id: userId, amount: 100 })
  if (addErr) {
    fail(`RPC +100 FAILED: ${addErr.message} [code: ${addErr.code}]`)
    info('This means increment_xp function does NOT exist in your database. You need to run the SQL patch.')
    process.exit(1)
  }
  const { data: p2arr } = await supabase.from('profiles').select('xp').eq('id', userId)
  const p2 = p2arr?.[0]
  if (p2?.xp === startXP + 100) pass(`XP: ${startXP} → ${p2.xp} (+100 ✓)`)
  else fail(`XP: ${startXP} → ${p2?.xp} (expected ${startXP + 100}) — RPC ran but DB did not change!`)

  // ── NEGATIVE RPC ──────────────────────────────────────────────────────────
  console.log('\n4. Testing increment_xp RPC (-50)...')
  const { error: subErr } = await supabase.rpc('increment_xp', { user_id: userId, amount: -50 })
  if (subErr) {
    fail(`RPC -50 FAILED: ${subErr.message} [code: ${subErr.code}]`)
    info('Your increment_xp function exists but may not support negative values. Apply the SQL patch.')
  } else {
    const { data: p3arr } = await supabase.from('profiles').select('xp').eq('id', userId)
    const p3 = p3arr?.[0]
    const expected = startXP + 100 - 50
    if (p3?.xp === expected) pass(`XP: ${startXP + 100} → ${p3.xp} (-50 ✓)`)
    else fail(`XP: ${startXP + 100} → ${p3?.xp} (expected ${expected}) — NEGATIVES NOT WORKING`)
  }

  // ── RESTORE ───────────────────────────────────────────────────────────────
  console.log('\n5. Restoring XP...')
  const { data: pNowArr } = await supabase.from('profiles').select('xp').eq('id', userId)
  const pNow = pNowArr?.[0]
  const diff = startXP - (pNow?.xp ?? 0)
  await supabase.rpc('increment_xp', { user_id: userId, amount: diff })
  const { data: pFinalArr } = await supabase.from('profiles').select('xp').eq('id', userId)
  const pFinal = pFinalArr?.[0]
  if (pFinal?.xp === startXP) pass(`XP restored to ${startXP}`)
  else fail(`Restore failed — XP is ${pFinal?.xp}, expected ${startXP}`)

  console.log('\n==============================')
  console.log('  DONE')
  console.log('==============================\n')
}

run()
