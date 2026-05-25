// Seed curriculum v2 for a specific user
import { createClient } from '@supabase/supabase-js'
import { CURRICULUM_CATEGORIES, SEED_CURRICULA, SEED_MEDIA_LOG } from '../src/data/curriculumDefaults.js'

const supabase = createClient(
  'https://msplriifoeyknlusfixm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcGxyaWlmb2V5a25sdXNmaXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzgxNDYsImV4cCI6MjA5MDI1NDE0Nn0.Ipg7Shpe_AfU6pQ21vUk69QOmHqV_hKEH_34JISJKn8'
)

// Change this to seed for a different account
const EMAIL = process.argv[2] || 'polaris.test@gmail.com'
const PASSWORD = process.argv[3] || 'PolarisTester'

async function main() {
  console.log(`Signing in as ${EMAIL}...`)
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1) }
  const userId = auth.user.id
  console.log(`User ID: ${userId}`)

  // Purge existing
  const { data: existingCats } = await supabase.from('curriculum_categories').select('id').eq('user_id', userId)
  if (existingCats?.length) {
    console.log(`Purging ${existingCats.length} existing categories...`)
    await supabase.from('curriculum_resources').delete().eq('user_id', userId)
    await supabase.from('curriculum_topics').delete().eq('user_id', userId).not('curriculum_id', 'is', null)
    await supabase.from('curricula').delete().eq('user_id', userId)
    await supabase.from('curriculum_categories').delete().eq('user_id', userId)
    await supabase.from('media_log').delete().eq('user_id', userId)
  }

  // Seed categories
  const catMap = {}
  for (const cat of CURRICULUM_CATEGORIES) {
    const { data: ins, error } = await supabase.from('curriculum_categories').insert({
      user_id: userId, title: cat.title, accent_color: cat.accent_color, position: cat.position,
    }).select('id, title').single()
    if (error) { console.error(`Category "${cat.title}":`, error.message); continue }
    catMap[ins.title] = ins.id
    console.log(`✓ Category: ${ins.title}`)
  }

  // Seed curricula
  for (let i = 0; i < SEED_CURRICULA.length; i++) {
    const c = SEED_CURRICULA[i]
    const categoryId = catMap[c.category]
    if (!categoryId) { console.error(`No category for "${c.category}"`); continue }

    const { data: curr, error } = await supabase.from('curricula').insert({
      user_id: userId, category_id: categoryId, title: c.title,
      description: c.description, estimated_hours: c.estimated_hours, position: i,
    }).select('id').single()
    if (error) { console.error(`Curriculum "${c.title}":`, error.message); continue }

    if (c.topics?.length) {
      const { error: tErr } = await supabase.from('curriculum_topics').insert(
        c.topics.map((t, idx) => ({
          user_id: userId, curriculum_id: curr.id, title: t.title,
          estimated_hours: t.estimated_hours || null,
          is_recommended_next: t.is_recommended_next || false, position: idx,
        }))
      )
      if (tErr) console.error(`  Topics error:`, tErr.message)
    }

    if (c.resources?.length) {
      const { error: rErr } = await supabase.from('curriculum_resources').insert(
        c.resources.map(r => ({
          user_id: userId, curriculum_id: curr.id, title: r.title,
          author: r.author || null, resource_type: r.resource_type || 'book', url: r.url || null,
        }))
      )
      if (rErr) console.error(`  Resources error:`, rErr.message)
    }
    console.log(`✓ ${c.title} (${c.topics?.length}t, ${c.resources?.length}r)`)
  }

  // Media log
  const { error: mErr } = await supabase.from('media_log').insert(
    SEED_MEDIA_LOG.map(m => ({ user_id: userId, ...m }))
  )
  if (mErr) console.error('Media log:', mErr.message)
  else console.log(`✓ ${SEED_MEDIA_LOG.length} media entries`)

  console.log('\n✅ Done! Refresh Polaris.')
}

main().catch(e => console.error('FATAL:', e))
