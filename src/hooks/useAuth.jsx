import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  DEFAULT_MILESTONES, DEFAULT_NODES, DEFAULT_SUBNODES,
  DEFAULT_GOALS, DEFAULT_HABITS, DEFAULT_FOCUS_ITEMS, DEFAULT_BACKBURNER, DEFAULT_EULOGY,
  DEFAULT_CLARITY_ANCHOR, DEFAULT_CURRENT_CHAPTER, DEFAULT_CURRICULUM
} from '../data/defaults'

const AuthContext = createContext(null)

let seeding = false
let seedingPromise = null

const seedUserData = async (userId) => {
  if (seeding) return seedingPromise
  seeding = true
  seedingPromise = (async () => {
    try {
      const [{ data: existingNodes }, { data: existingMilestones }] = await Promise.all([
        supabase.from('nodes').select('id').eq('user_id', userId),
        supabase.from('milestones').select('id').eq('user_id', userId),
      ])

      if (!existingMilestones?.length) {
        await supabase.from('milestones').insert(
          DEFAULT_MILESTONES.map(m => ({ ...m, user_id: userId }))
        )
      }

      if (!existingNodes?.length) {
        const { data: insertedNodes, error } = await supabase
          .from('nodes')
          .insert(DEFAULT_NODES.map(n => ({ ...n, user_id: userId })))
          .select()

        if (error || !insertedNodes?.length) {
          console.error('Node insert failed:', error)
          return
        }

        const nodeMap = {}
        insertedNodes.forEach(n => { nodeMap[n.title] = n.id })

        await supabase.from('nodes').insert(
          DEFAULT_SUBNODES.map(({ parentTitle, ...n }) => ({
            ...n,
            user_id: userId,
            parent_id: nodeMap[parentTitle] || null,
          }))
        )
      }

      // 3. Seed Goals (only if none exist)
      const { data: existingGoals } = await supabase.from('goals').select('id').eq('user_id', userId).limit(1)
      if (!existingGoals?.length) {
        await supabase.from('goals').insert(DEFAULT_GOALS.map(({ node_title, ...g }) => ({ ...g, user_id: userId })))
      }

      // 4. Seed Habits (only if none exist)
      const { data: existingHabits } = await supabase.from('habits').select('id').eq('user_id', userId).limit(1)
      if (!existingHabits?.length) {
        await supabase.from('habits').insert(DEFAULT_HABITS.map(h => ({ ...h, user_id: userId })))
      }

      // 5. Seed Focus Items (only if none exist)
      const { data: existingFocus } = await supabase.from('focus_items').select('id').eq('user_id', userId).limit(1)
      if (!existingFocus?.length) {
        await supabase.from('focus_items').insert(DEFAULT_FOCUS_ITEMS.map(f => ({ ...f, user_id: userId, status: 'active' })))
      }

      // 6. Seed Backburner (only if none exist)
      const { data: existingBackburner } = await supabase.from('backburner').select('id').eq('user_id', userId).limit(1)
      if (!existingBackburner?.length) {
        await supabase.from('backburner').insert(DEFAULT_BACKBURNER.map(b => ({ ...b, user_id: userId })))
      }

      // 7. Seed Eulogy (only if none exists)
      const { data: existingEulogies } = await supabase.from('eulogies').select('id').eq('user_id', userId)
      if (!existingEulogies?.length) {
        await supabase.from('eulogies').insert({
          user_id: userId,
          content: DEFAULT_EULOGY.content,
          version_label: DEFAULT_EULOGY.version_label,
          written_date: DEFAULT_EULOGY.written_date
        })
      }

      // 8. Seed Curriculum (only if none exists)
      const { data: existingChapters } = await supabase.from('curriculum_chapters').select('id').eq('user_id', userId).limit(1)
      if (!existingChapters?.length) {
        for (const chapter of DEFAULT_CURRICULUM) {
          const { data: inserted } = await supabase.from('curriculum_chapters').insert({
            user_id: userId,
            title: chapter.title,
            description: chapter.description || null,
            node_title: chapter.node_title,
            position: 0,
          }).select('id').single()
          if (inserted?.id && chapter.topics?.length) {
            await supabase.from('curriculum_topics').insert(
              chapter.topics.map((t, idx) => ({
                user_id: userId,
                chapter_id: inserted.id,
                title: t,
                position: idx,
              }))
            )
          }
        }
      }
    } catch (e) {
      console.error('Seeding error:', e)
    } finally {
      seeding = false
      seedingPromise = null
    }
  })()
  return seedingPromise
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [providerToken, setProviderToken] = useState(null)
  const fetchingFor = useRef(null)

  const fetchProfile = async (userId) => {
    if (fetchingFor.current === userId) return
    fetchingFor.current = userId

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error?.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: userId,
            clarity_anchor: DEFAULT_CLARITY_ANCHOR,
            current_chapter: DEFAULT_CURRENT_CHAPTER
          })
          .select()
          .single()

        if (insertError) { console.error('Profile insert error:', insertError); return }
        await seedUserData(userId)
        setProfile(newProfile)
        return
      }

      if (error) { console.error('Profile fetch error:', error); return }

      // Always call seedUserData. It internally checks if tables are empty and is idempotent.
      await seedUserData(userId)

      const { data: freshProfile } = await supabase
        .from('profiles').select('*').eq('id', userId).single()

      setProfile(freshProfile || data)
    } finally {
      fetchingFor.current = null
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      setProviderToken(session?.provider_token ?? null)
      if (u) fetchProfile(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      setProviderToken(session?.provider_token ?? null)
      if (u) fetchProfile(u.id)
      else { setProfile(null); fetchingFor.current = null }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const updateProfile = async (updates) => {
    const { data } = await supabase
      .from('profiles').update(updates).eq('id', user.id).select().single()
    setProfile(data)
  }

  const addXP = async (amount) => {
    await supabase.rpc('increment_xp', { user_id: user.id, amount })
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin + '/asa.polaris/',
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

  const signInAsGuest = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'guest@polaris.com',
        password: 'polarisguest123',
      })
      if (error) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'guest@polaris.com',
          password: 'polarisguest123',
        })
        if (signUpError) {
          console.error('Guest sign up error:', signUpError)
        } else if (signUpData?.user) {
          setUser(signUpData.user)
          await fetchProfile(signUpData.user.id)
        }
      } else if (data?.user) {
        setUser(data.user)
        await fetchProfile(data.user.id)
      }
    } catch (err) {
      console.error('Guest sign in failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    fetchingFor.current = null
    seeding = false
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, providerToken, signInWithGoogle, signInAsGuest, signOut, updateProfile, addXP }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)