import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_MILESTONES, DEFAULT_NODES, DEFAULT_SUBNODES } from '../data/defaults'

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
          .insert({ id: userId })
          .select()
          .single()

        if (insertError) { console.error('Profile insert error:', insertError); return }
        await seedUserData(userId)
        setProfile(newProfile)
        return
      }

      if (error) { console.error('Profile fetch error:', error); return }

      const { count } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (count === 0) await seedUserData(userId)

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
      if (u) fetchProfile(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
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
      options: { redirectTo: window.location.origin + '/asa.polaris/' },
    })

  const signOut = () => {
    fetchingFor.current = null
    seeding = false
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile, addXP }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
