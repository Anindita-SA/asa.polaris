import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_MILESTONES, DEFAULT_NODES, DEFAULT_SUBNODES } from '../data/defaults'

const AuthContext = createContext(null)

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
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!data) {
      // First login — seed profile + data
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()
      await seedUserData(userId)
      setProfile(newProfile)
    } else {
      setProfile(data)
    }
  }

  const seedUserData = async (userId) => {
    // Seed milestones
    await supabase.from('milestones').insert(
      DEFAULT_MILESTONES.map(m => ({ ...m, user_id: userId }))
    )

    // Seed root + main nodes
    const { data: insertedNodes } = await supabase.from('nodes').insert(
      DEFAULT_NODES.map(n => ({ ...n, user_id: userId }))
    ).select()

    // Map titles to IDs for parent lookup
    const nodeMap = {}
    insertedNodes.forEach(n => { nodeMap[n.title] = n.id })

    // Seed subnodes
    await supabase.from('nodes').insert(
      DEFAULT_SUBNODES.map(n => ({
        ...n,
        user_id: userId,
        parent_id: nodeMap[n.parentTitle] || null,
        parentTitle: undefined,
      }))
    )
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
    const newXP = (profile?.xp || 0) + amount
    await updateProfile({ xp: newXP })
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
