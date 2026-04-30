import { Download, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const TABLES = [
  'profiles',
  'nodes',
  'goals',
  'focus_items',
  'backburner',
  'milestones',
  'highlights',
  'habits',
  'habit_logs',
  'eulogies',
  'pomodoro_logs',
  'subtasks',
]

const SettingsPanel = ({ open, onClose }) => {
  const { user } = useAuth()
  if (!open) return null

  const downloadBackup = async () => {
    const entries = await Promise.all(TABLES.map(async (table) => {
      const query = supabase.from(table).select('*')
      const scoped = table === 'profiles' ? query.eq('id', user.id) : query.eq('user_id', user.id)
      const { data } = await scoped
      return [table, data || []]
    }))

    const backup = {
      exported_at: new Date().toISOString(),
      ...Object.fromEntries(entries),
      profile: entries.find(([name]) => name === 'profiles')?.[1]?.[0] || null,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const date = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `polaris-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="modal-overlay fixed inset-0 z-[70] bg-void/75 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass border border-blue-900/30 rounded-2xl p-5 w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-starlight">Settings</h3>
          <button onClick={onClose} className="text-dim hover:text-starlight"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-dim">Export all Polaris data for your account as JSON.</p>
        <button onClick={downloadBackup} className="w-full py-2 rounded-lg bg-pulsar/20 border border-pulsar/30 text-pulsar flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download backup
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
