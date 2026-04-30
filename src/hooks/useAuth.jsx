import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_MILESTONES, DEFAULT_NODES, DEFAULT_SUBNODES } from '../data/defaults'

const AuthContext = createContext(null)
let seeding = false

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error?.code === 'PGRST116') {
      // PGRST116 = no rows found — first login
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()
      await seedUserData(userId)
      setProfile(newProfile)
      return
    }

    if (error) return

    // Profile exists — if seed failed on previous login, self-heal by backfilling nodes/milestones.
    const [{ count: nodeCount }, { count: milestoneCount }] = await Promise.all([
      supabase.from('nodes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('milestones').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    if ((nodeCount || 0) === 0 || (milestoneCount || 0) === 0) {
      await seedUserData(userId)
    }

    setProfile(data)
  }

  const seedUserData = async (userId) => {
    if (seeding) return
    seeding = true
    try {
      const [{ data: existingNodes }, { data: existingMilestones }] = await Promise.all([
        supabase.from('nodes').select('id, title').eq('user_id', userId),
        supabase.from('milestones').select('id, title').eq('user_id', userId),
      ])

      if (!existingMilestones?.length) {
        await supabase.from('milestones').insert(
          DEFAULT_MILESTONES.map(m => ({ ...m, user_id: userId }))
        )
      }

      if (!existingNodes?.length) {
        const { data: insertedNodes } = await supabase.from('nodes').insert(
          DEFAULT_NODES.map(n => ({ ...n, user_id: userId }))
        ).select()

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
    } finally {
      seeding = false
    }
  }

  const updateProfile = async (updates) => {
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
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

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile, addXP }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
