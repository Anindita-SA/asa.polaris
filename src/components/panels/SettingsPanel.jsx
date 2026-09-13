import { Download, X, ShieldCheck, FileText, ExternalLink, Lock } from 'lucide-react'
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
    if (!user) return
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

  const handleOpenLegal = (route) => {
    onClose()
    window.location.hash = route
  }

  return (
    <div
      className="modal-overlay fixed inset-0 z-[70] bg-void/75 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content glass border border-pulsar/40 rounded-t-2xl rounded-b-none md:rounded-xl p-5 w-full max-w-full md:max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pulsar/20 pb-3">
          <h3 className="text-lg font-display text-starlight">Settings &amp; Preferences</h3>
          <button
            onClick={onClose}
            className="text-nova/60 hover:text-starlight transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Data Management Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-gold uppercase tracking-wider">
            Data Portability &amp; Backup
          </h4>
          <p className="text-xs text-nova/70 leading-relaxed">
            Export a complete JSON archive of all your workspace records (tasks, goals, habits, milestones, and focus items).
          </p>
          <button
            onClick={downloadBackup}
            className="w-full py-2.5 rounded-lg bg-pulsar/20 border border-pulsar/30 text-pulsar hover:bg-pulsar/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Download Complete JSON Backup
          </button>
        </div>

        {/* Legal & Privacy Section */}
        <div className="space-y-3 border-t border-pulsar/20 pt-4">
          <h4 className="text-xs font-mono text-gold uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Legal &amp; Privacy Policies</span>
          </h4>
          <p className="text-xs text-nova/70 leading-relaxed">
            Polaris adheres to strict data privacy and isolation standards. Your data is isolated via Row Level Security and is never used for advertising, tracking, or AI model training.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleOpenLegal('#/privacy')}
              className="px-3 py-2.5 rounded-lg glass border border-pulsar/30 hover:border-gold/50 text-left transition-colors group flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span className="text-xs text-starlight group-hover:text-gold transition-colors font-medium">
                  Privacy Policy
                </span>
              </div>
              <ExternalLink className="w-3 h-3 text-nova/50 group-hover:text-gold" />
            </button>

            <button
              onClick={() => handleOpenLegal('#/terms')}
              className="px-3 py-2.5 rounded-lg glass border border-pulsar/30 hover:border-gold/50 text-left transition-colors group flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" />
                <span className="text-xs text-starlight group-hover:text-gold transition-colors font-medium">
                  Terms of Service
                </span>
              </div>
              <ExternalLink className="w-3 h-3 text-nova/50 group-hover:text-gold" />
            </button>
          </div>

          <div className="rounded-lg bg-void/50 border border-pulsar/20 p-3 text-[11px] text-nova/60 space-y-1">
            <p className="text-starlight font-medium">Google API Limited Use Disclosure:</p>
            <p>
              Polaris complies with the Google API Services User Data Policy, including Limited Use requirements for Google Calendar and Google Tasks integrations.
            </p>
          </div>
        </div>

        {/* Contact info footer */}
        <div className="text-[11px] text-nova/40 font-mono text-center pt-2 border-t border-pulsar/10">
          <span>Polaris v1.1.8 · Created by Anindita Sarker Aloka</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
