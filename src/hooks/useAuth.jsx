import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { safeMutate } from '../lib/safeMutate'
import { initSyncManager } from '../lib/syncManager'
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete, offlineUpsert } from '../lib/offlineApi'
import { 
  DEFAULT_MILESTONES, DEFAULT_NODES, DEFAULT_SUBNODES,
  DEFAULT_GOALS, DEFAULT_HABITS, DEFAULT_FOCUS_ITEMS, DEFAULT_BACKBURNER, DEFAULT_EULOGY,
  DEFAULT_CLARITY_ANCHOR, DEFAULT_CURRENT_CHAPTER
} from '../data/defaults'
import { CURRICULUM_CATEGORIES, SEED_CURRICULA, SEED_MEDIA_LOG } from '../data/curriculumDefaults'

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
        await Promise.all(DEFAULT_MILESTONES.map(m => offlineInsert('milestones', { ...m, user_id: userId })))
      }

      if (!existingNodes?.length) {
        const insertedNodes = []
        let error = null
        for (const n of DEFAULT_NODES) {
          const res = await offlineInsert('nodes', { ...n, user_id: userId })
          if (res?.error) error = res.error
          else if (res?.data) insertedNodes.push(res.data)
        }

        if (error || !insertedNodes?.length) {
          console.error('Node insert failed:', error)
          return
        }

        const nodeMap = {}
        insertedNodes.forEach(n => { nodeMap[n.title] = n.id })

        await Promise.all(DEFAULT_SUBNODES.map(({ parentTitle, ...n }) => offlineInsert('nodes', {
            ...n,
            user_id: userId,
            parent_id: nodeMap[parentTitle] || null,
        })))
      }

      // 3. Seed Goals (only if none exist)
      const { data: existingGoals } = await supabase.from('goals').select('id').eq('user_id', userId).limit(1)
      if (!existingGoals?.length) {
        await Promise.all(DEFAULT_GOALS.map(({ node_title, ...g }) => offlineInsert('goals', { ...g, user_id: userId })))
      }

      // 4. Seed Habits (only if none exist)
      const { data: existingHabits } = await supabase.from('habits').select('id').eq('user_id', userId).limit(1)
      if (!existingHabits?.length) {
        await Promise.all(DEFAULT_HABITS.map(h => offlineInsert('habits', { ...h, user_id: userId })))
      }

      // 5. Seed Focus Items (only if none exist)
      const { data: existingFocus } = await supabase.from('focus_items').select('id').eq('user_id', userId).limit(1)
      if (!existingFocus?.length) {
        await Promise.all(DEFAULT_FOCUS_ITEMS.map(f => offlineInsert('focus_items', { ...f, user_id: userId, status: 'active' })))
      }

      // 6. Seed Backburner (only if none exist)
      const { data: existingBackburner } = await supabase.from('backburner').select('id').eq('user_id', userId).limit(1)
      if (!existingBackburner?.length) {
        await Promise.all(DEFAULT_BACKBURNER.map(b => offlineInsert('backburner', { ...b, user_id: userId })))
      }

      // 7. Seed Eulogy (only if none exists)
      const { data: existingEulogies } = await supabase.from('eulogies').select('id').eq('user_id', userId)
      if (!existingEulogies?.length) {
        await offlineInsert('eulogies', {
            user_id: userId,
            content: DEFAULT_EULOGY.content,
            version_label: DEFAULT_EULOGY.version_label,
            written_date: DEFAULT_EULOGY.written_date
        })
      }

      // 8. Seed Curriculum v2 (categories + curricula + topics + resources + media_log)
      const { data: existingCats, error: catCheckErr } = await supabase.from('curriculum_categories').select('id').eq('user_id', userId).limit(1)
      console.log('[Seed] curriculum_categories check:', existingCats?.length || 0, 'existing', catCheckErr ? `ERROR: ${catCheckErr.message}` : 'OK')
      if (!existingCats?.length && !catCheckErr) {
        // Insert categories
        const catMap = {}
        for (const cat of CURRICULUM_CATEGORIES) {
          const { data: inserted, error: catErr } = await offlineInsert('curriculum_categories', {
              user_id: userId, title: cat.title, accent_color: cat.accent_color, position: cat.position,
          })
          if (catErr) console.error('[Seed] category insert error:', cat.title, catErr?.message)
          if (inserted) catMap[inserted.title] = inserted.id
        }

        // Insert curricula with topics and resources
        for (let i = 0; i < SEED_CURRICULA.length; i++) {
          const c = SEED_CURRICULA[i]
          const categoryId = catMap[c.category]
          if (!categoryId) continue

          const { data: curr } = await offlineInsert('curricula', {
              user_id: userId, category_id: categoryId, title: c.title,
              description: c.description, estimated_hours: c.estimated_hours, position: i,
          })
          if (!curr?.id) continue

          // Insert topics
          if (c.topics?.length) {
            await Promise.all(c.topics.map((t, idx) => offlineInsert('curriculum_topics', {
                  user_id: userId, curriculum_id: curr.id, title: t.title,
                  estimated_hours: t.estimated_hours || null,
                  is_recommended_next: t.is_recommended_next || false,
                  position: idx,
            })))
          }

          // Insert resources
          if (c.resources?.length) {
            await Promise.all(c.resources.map(r => offlineInsert('curriculum_resources', {
                  user_id: userId, curriculum_id: curr.id, title: r.title,
                  author: r.author || null, resource_type: r.resource_type || 'book',
                  url: r.url || null,
            })))
          }
        }

        // Insert media log entries
        if (SEED_MEDIA_LOG?.length) {
          await Promise.all(SEED_MEDIA_LOG.map(m => offlineInsert('media_log', { user_id: userId, ...m })))
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
      const { data, error } = await offlineSelect('profiles', { id: userId })

      if (!data || data.length === 0) {
        const { data: newProfile, error: insertError } = await offlineInsert('profiles', { 
              id: userId,
              clarity_anchor: DEFAULT_CLARITY_ANCHOR,
              current_chapter: DEFAULT_CURRENT_CHAPTER
        })

        if (insertError) { console.error('Profile insert error:', insertError); return }
        await seedUserData(userId)
        setProfile(newProfile)
        return
      }

      if (error) { console.error('Profile fetch error:', error); return }

      setProfile(data?.[0])
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
      
      let pToken = session?.provider_token ?? null
      let pRefreshToken = session?.provider_refresh_token ?? null
      if (pToken) {
        localStorage.setItem('polaris_provider_token', pToken)
        localStorage.setItem('polaris_provider_token_saved_at', Date.now().toString())
      } else {
        pToken = localStorage.getItem('polaris_provider_token')
      }
      if (pRefreshToken) {
        localStorage.setItem('polaris_provider_refresh_token', pRefreshToken)
      }
      setProviderToken(pToken)
      
      if (u) { fetchProfile(u.id); initSyncManager(u.id); }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      
      let pToken = session?.provider_token ?? null
      let pRefreshToken = session?.provider_refresh_token ?? null
      if (pToken) {
        localStorage.setItem('polaris_provider_token', pToken)
        localStorage.setItem('polaris_provider_token_saved_at', Date.now().toString())
      } else if (u) {
        pToken = localStorage.getItem('polaris_provider_token')
      }
      if (pRefreshToken) {
        localStorage.setItem('polaris_provider_refresh_token', pRefreshToken)
      }
      setProviderToken(pToken)

      if (u) { fetchProfile(u.id); initSyncManager(u.id); }
      else { 
        setProfile(null)
        fetchingFor.current = null 
        localStorage.removeItem('polaris_provider_token')
        localStorage.removeItem('polaris_provider_refresh_token')
        localStorage.removeItem('polaris_provider_token_saved_at')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) return
    const { data } = await offlineUpdate('profiles', user.id, updates)
    if (data) setProfile(data)
  }, [user?.id])

  const addXP = useCallback(async (amount) => {
    if (!user?.id) return
    const amt = parseInt(amount, 10)
    if (isNaN(amt) || amt === 0) return

    // 1. Optimistic local update - UI snaps immediately
    setProfile(prev => {
      if (!prev) return prev
      return { ...prev, xp: Math.max(0, (prev.xp || 0) + amt) }
    })

    // 2. Persist to DB via RPC (no re-fetch after - the optimistic update IS the truth)
    const { error } = await supabase.rpc('increment_xp', { user_id: user.id, amount: amt })
    if (error) {
      console.error('XP RPC error:', error)
      // On failure, roll back the optimistic update
      setProfile(prev => {
        if (!prev) return prev
        return { ...prev, xp: Math.max(0, (prev.xp || 0) - amt) }
      })
    }
  }, [user?.id])

  /**
   * trackXP - centralized toggle-safe XP helper.
   * Components call this instead of manually computing +/- addXP.
   *
   * @param {boolean} wasActive - was the item completed/checked BEFORE this action?
   * @param {boolean} isNowActive - is the item completed/checked AFTER this action?
   * @param {number}  amount - the absolute XP reward (always positive)
   */
  const trackXP = useCallback((wasActive, isNowActive, amount) => {
    const abs = Math.abs(parseInt(amount, 10) || 0)
    if (!abs || wasActive === isNowActive) return
    return addXP(isNowActive ? abs : -abs)
  }, [addXP])

  const signInWithGoogle = useCallback((forceConsent = false) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin + '/asa.polaris/',
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: { 
          access_type: 'offline', 
          prompt: forceConsent ? 'consent' : 'select_account' 
        },
      },
    }), [])

  const signInAsGuest = useCallback(async () => {
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
  }, [])

  const signOut = useCallback(() => {
    fetchingFor.current = null
    seeding = false
    return supabase.auth.signOut()
  }, [])

  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    providerToken,
    signInWithGoogle,
    signInAsGuest,
    signOut,
    updateProfile,
    addXP,
    trackXP
  }), [user, profile, loading, providerToken, signInWithGoogle, signInAsGuest, signOut, updateProfile, addXP, trackXP])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)