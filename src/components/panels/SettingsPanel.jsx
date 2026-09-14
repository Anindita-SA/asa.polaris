import React, { useState, useEffect } from 'react'
import {
  X,
  Sliders,
  Bell,
  VolumeX,
  Volume2,
  RotateCcw,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  FileText,
  ExternalLink,
  Lock,
  Download,
  LogOut,
  User,
  Music,
  Compass,
  EyeOff,
  Eye,
  Bot,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  useUserSettings,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_NOTIFICATION_SETTINGS
} from '../../hooks/useUserSettings'

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
  'tasks',
  'recurring_task_templates',
  'user_settings'
]

const TASK_MODES = [
  {
    id: 'focus_only',
    label: 'Focus Task Only',
    badge: 'RECOMMENDED',
    description: 'Alerts only for the top priority focus task to prevent cognitive overload.'
  },
  {
    id: 'consolidated',
    label: 'Single Consolidated Nudge',
    badge: null,
    description: 'Bundles all overdue tasks into a single summary notification ping.'
  },
  {
    id: 'all',
    label: 'All Overdue & Reminders',
    badge: null,
    description: 'Alerts for each overdue task and nagging reminder individually.'
  },
  {
    id: 'off',
    label: 'Off (Visual Only)',
    badge: null,
    description: 'Disables task notification pings. In-app visual badges stay visible.'
  }
]

const FREQUENCY_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes (1 hour)' },
  { value: 120, label: '120 minutes (2 hours)' },
  { value: 240, label: '240 minutes (4 hours)' }
]

const AMBIENT_TRACK_OPTIONS = [
  { id: 'lofi', label: 'Lo-Fi Beats', desc: 'Chill beats for continuous flow' },
  { id: 'rain', label: 'Deep Rain & Thunder', desc: 'Calming rain soundscape' },
  { id: 'brown_noise', label: 'Brown Noise', desc: 'Deep broadband frequency for deep work' },
  { id: 'synth', label: 'Synthwave Flow', desc: 'Atmospheric electronic synthesizer tones' }
]

const ToggleRow = ({ id, label, description, checked, onChange, icon: Icon, isDestructive }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-void/50 border border-pulsar/20 hover:border-pulsar/40 transition-colors">
    <div className="flex items-start gap-3 pr-3">
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          checked 
            ? (isDestructive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30')
            : 'bg-void/80 text-nova/50 border border-pulsar/20'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-xs font-display text-starlight cursor-pointer block">
          {label}
        </label>
        {description && (
          <p className="text-[11px] font-body text-nova/60 leading-tight">
            {description}
          </p>
        )}
      </div>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked
          ? (isDestructive ? 'bg-red-500' : 'bg-[#f5a623]')
          : 'bg-pulsar/30'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0c0f14] shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

const SettingsPanel = ({ open, isOpen, onClose, initialSection = 'all' }) => {
  const isVisible = open || isOpen
  const { user, profile, signOut } = useAuth()
  const {
    featureFlags,
    updateFeatureFlag,
    notificationSettings,
    updateNotificationSettings,
    resetSettings
  } = useUserSettings()

  const [activeSection, setActiveSection] = useState(initialSection)

  // Matrix canvas memory filter state from localStorage
  const [hideFarScheduled, setHideFarScheduled] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_far_scheduled')
      return saved !== null ? saved === 'true' : true
    } catch (e) {
      return true
    }
  })

  const [hideReminders, setHideReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_reminders')
      return saved !== null ? saved === 'true' : false
    } catch (e) {
      return false
    }
  })

  const [hidePolaris, setHidePolaris] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_matrix_hide_polaris')
      return saved !== null ? saved === 'true' : false
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection, isVisible])

  const [recurringTemplates, setRecurringTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const fetchTemplates = async () => {
    if (!user?.id) return
    try {
      setLoadingTemplates(true)
      let query = supabase
        .from('recurring_task_templates')
        .select('*')
        .eq('user_id', user.id)
      if (query && typeof query.order === 'function') {
        query = query.order('created_at', { ascending: false })
      }
      const { data, error } = await query
      if (!error && data) {
        setRecurringTemplates(data)
      }
    } catch (e) {
      console.warn('Error fetching recurring templates in settings:', e)
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (isVisible && user?.id) {
      fetchTemplates()
    }
  }, [isVisible, user?.id])

  const handleToggleTemplateActive = async (templateId, isActive) => {
    if (!user?.id) return
    setRecurringTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_active: isActive } : t))
    try {
      await supabase
        .from('recurring_task_templates')
        .update({ is_active: isActive })
        .eq('id', templateId)
        .eq('user_id', user.id)
    } catch (e) {
      console.error('Error updating template status:', e)
      fetchTemplates()
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!user?.id) return
    setRecurringTemplates(prev => prev.filter(t => t.id !== templateId))
    try {
      await supabase
        .from('recurring_task_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id)
    } catch (e) {
      console.error('Error deleting template:', e)
      fetchTemplates()
    }
  }

  const toggleHideFarScheduled = (val) => {
    setHideFarScheduled(val)
    try {
      localStorage.setItem('polaris_matrix_hide_far_scheduled', val.toString())
    } catch (e) {}
  }

  const toggleHideReminders = (val) => {
    setHideReminders(val)
    try {
      localStorage.setItem('polaris_matrix_hide_reminders', val.toString())
    } catch (e) {}
  }

  const toggleHidePolaris = (val) => {
    setHidePolaris(val)
    try {
      localStorage.setItem('polaris_matrix_hide_polaris', val.toString())
    } catch (e) {}
  }

  if (!isVisible) return null

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
    if (onClose) onClose()
    window.location.hash = route
  }

  const handleResetDefaults = () => {
    resetSettings()
  }

  const SECTIONS = [
    { id: 'all', label: 'All Settings' },
    { id: 'matrix', label: 'Triage & Matrix' },
    { id: 'reminders', label: 'Reminders & Nudges' },
    { id: 'focus', label: 'Focus & Audio' },
    { id: 'account', label: 'Data & Account' }
  ]

  const showMatrix = activeSection === 'all' || activeSection === 'matrix'
  const showReminders = activeSection === 'all' || activeSection === 'reminders'
  const showFocus = activeSection === 'all' || activeSection === 'focus'
  const showAccount = activeSection === 'all' || activeSection === 'account'

  return (
    <div
      className="modal-overlay fixed inset-0 z-[110] bg-void/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        className="modal-content glass border border-pulsar/40 rounded-t-2xl rounded-b-none md:rounded-2xl p-5 md:p-6 w-full max-w-full md:max-w-2xl space-y-5 max-h-[92vh] overflow-y-auto scrollbar-hide shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-pulsar/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-display text-starlight leading-tight">
                {activeSection === 'reminders' ? 'Notification Settings' : 'Settings & Preferences'}
              </h3>
              <p className="text-xs font-mono text-nova/60 mt-0.5">
                Tune nudges, alerts, and quiet focus preferences
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {signOut && (
              <button
                type="button"
                onClick={signOut}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-nova/60 hover:text-starlight p-1.5 rounded-lg hover:bg-pulsar/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 border-b border-pulsar/20">
          {SECTIONS.map(sec => {
            const isSelected = activeSection === sec.id
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-void/40 text-nova/60 hover:text-starlight hover:bg-pulsar/20 border border-transparent'
                }`}
              >
                {sec.label}
              </button>
            )
          })}
        </div>

        {/* SECTION 1: Triage & Matrix */}
        {showMatrix && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-1 border-b border-pulsar/20">
              <Compass className="w-4 h-4 text-gold" />
              <h4 className="text-xs font-mono text-gold uppercase tracking-wider font-bold">
                Triage &amp; Matrix
              </h4>
            </div>

            <div className="space-y-2.5">
              <ToggleRow
                id="auto-quadrant-suggest-toggle"
                label="Auto Quadrant Suggestions"
                description="Calculates smart quadrant suggestions based on mental load and deadline proximity, showing one-click move chips on task cards."
                checked={featureFlags.auto_quadrant_suggest}
                onChange={(val) => updateFeatureFlag('auto_quadrant_suggest', val)}
                icon={Sparkles}
                isDestructive={false}
              />
            </div>

            {/* Matrix View Filters Memory */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-mono uppercase tracking-wider text-nova/70 block">
                Matrix View Filters Memory
              </label>
              <p className="text-[11px] font-body text-nova/60 leading-tight">
                Controls which task types are shown on the 2D spatial matrix plane.
              </p>
              <div className="space-y-2">
                <ToggleRow
                  id="filter-hide-far-scheduled"
                  label="Hide Far Scheduled Tasks (> 1 week away)"
                  description="Keeps future scheduled tasks off the immediate matrix canvas to maintain clarity."
                  checked={hideFarScheduled}
                  onChange={toggleHideFarScheduled}
                  icon={EyeOff}
                  isDestructive={false}
                />
                <ToggleRow
                  id="filter-hide-reminders"
                  label="Hide Nagging Reminders"
                  description="Filters out reminder category items from cluttering the core task matrix."
                  checked={hideReminders}
                  onChange={toggleHideReminders}
                  icon={Bell}
                  isDestructive={false}
                />
                <ToggleRow
                  id="filter-hide-polaris"
                  label="Hide Polaris Building Tasks"
                  description="Filters out Polaris meta-building tasks from the main canvas."
                  checked={hidePolaris}
                  onChange={toggleHidePolaris}
                  icon={Bot}
                  isDestructive={false}
                />
              </div>
            </div>

            {/* Recurring Tasks & Routines Subsection */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-nova/70 block">
                    Recurring Tasks &amp; Routines
                  </label>
                  <p className="text-[11px] font-body text-nova/60 leading-tight">
                    Manage recurring routines and templates configured to repeat in your workspace.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                  {recurringTemplates.length} {recurringTemplates.length === 1 ? 'template' : 'templates'}
                </span>
              </div>

              {recurringTemplates.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-void/50 border border-dashed border-pulsar/20 text-center text-xs text-nova/60 italic font-body">
                  No recurring templates found. Turn on &quot;Repeat Daily&quot; in any task&apos;s details to create one.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                  {recurringTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-void/50 border border-pulsar/20 hover:border-pulsar/40 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          template.is_active
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-void/80 text-nova/40 border border-pulsar/20'
                        }`}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className={`text-xs font-display block truncate ${template.is_active ? 'text-starlight' : 'text-nova/50 line-through'}`}>
                            {template.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-nova/60">
                            <span className="capitalize">{template.frequency || 'daily'}</span>
                            <span>•</span>
                            <span>{template.estimated_minutes || 30}m</span>
                            {template.quadrant && (
                              <>
                                <span>•</span>
                                <span className="uppercase text-pulsar/80">{template.quadrant.replace(/_/g, ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-label={`Toggle ${template.title}`}
                          aria-checked={Boolean(template.is_active)}
                          onClick={() => handleToggleTemplateActive(template.id, !template.is_active)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            template.is_active ? 'bg-[#f5a623]' : 'bg-pulsar/30'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0c0f14] shadow ring-0 transition duration-200 ease-in-out ${
                              template.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${template.title}`}
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 text-nova/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: Reminders & Nudges */}
        {showReminders && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-1 border-b border-pulsar/20">
              <Bell className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono text-amber-400 uppercase tracking-wider font-bold">
                Reminders &amp; Nudges
              </h4>
            </div>

            {/* Master Mute Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
                Master Controls
              </label>
              <ToggleRow
                id="master-mute-toggle"
                label="Master Mute (Do Not Disturb)"
                description="Instantly silences all scheduled background notification pings."
                checked={notificationSettings.masterMuted}
                onChange={(val) => updateNotificationSettings({ masterMuted: val })}
                icon={VolumeX}
                isDestructive={true}
              />
            </div>

            {/* Task Reminder Mode */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
                Task Reminder Mode
              </label>
              <div className="space-y-2">
                {TASK_MODES.map((mode) => {
                  const isSelected = notificationSettings.taskMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateNotificationSettings({ taskMode: mode.id })}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-all border flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 text-starlight border-amber-500/40 shadow-sm'
                          : 'bg-void/40 text-nova/70 border-pulsar/20 hover:border-pulsar/40 hover:text-starlight'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-display text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-starlight'}`}>
                            {mode.label}
                          </span>
                          {mode.badge && (
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded">
                              {mode.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-body text-nova/60 leading-relaxed">
                          {mode.description}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-amber-400 bg-amber-500' : 'border-pulsar/40 bg-void/60'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0c0f14]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Task Reminder Frequency Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="task-frequency-select" className="text-xs font-mono uppercase tracking-wider text-nova/70 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-nova/60" /> Task Reminder Frequency
              </label>
              <div className="relative">
                <select
                  id="task-frequency-select"
                  value={notificationSettings.taskIntervalMinutes}
                  onChange={(e) => updateNotificationSettings({ taskIntervalMinutes: Number(e.target.value) })}
                  className="w-full bg-void/70 border border-pulsar/40 rounded-xl px-3 py-2.5 text-xs text-starlight outline-none appearance-none focus:border-amber-500/50 cursor-pointer font-body"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0c0f14] text-starlight">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-nova/60">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* System Habit, Pomodoro & Contact Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
                Habits, Pomodoro and Contacts
              </label>
              <div className="space-y-2">
                <ToggleRow
                  id="habit-nudges-toggle"
                  label="System Habit Nudges"
                  description="Periodic gentle prompts for hydration, posture check, and micro-breaks."
                  checked={featureFlags.nudges_enabled && notificationSettings.habitNudgesEnabled}
                  onChange={(val) => {
                    updateFeatureFlag('nudges_enabled', val)
                    updateNotificationSettings({ habitNudgesEnabled: val })
                  }}
                  icon={Sparkles}
                  isDestructive={false}
                />
                <ToggleRow
                  id="pomodoro-alerts-toggle"
                  label="Pomodoro Timer Alerts"
                  description="Auditory chimes and completion alerts when focus sessions finish."
                  checked={notificationSettings.pomodoroAlertsEnabled}
                  onChange={(val) => updateNotificationSettings({ pomodoroAlertsEnabled: val })}
                  icon={Bell}
                  isDestructive={false}
                />
                <ToggleRow
                  id="contact-reminders-toggle"
                  label="Contact Reach Out Reminders"
                  description="Periodic reminders to check in with relationships based on contact tier cadence."
                  checked={featureFlags.contact_reminders_enabled}
                  onChange={(val) => updateFeatureFlag('contact_reminders_enabled', val)}
                  icon={User}
                  isDestructive={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Focus & Audio */}
        {showFocus && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-1 border-b border-pulsar/20">
              <Music className="w-4 h-4 text-emerald" />
              <h4 className="text-xs font-mono text-emerald uppercase tracking-wider font-bold">
                Focus &amp; Audio
              </h4>
            </div>

            <div className="space-y-2.5">
              <ToggleRow
                id="celebration-sounds-toggle"
                label="Celebration Sounds &amp; Effects"
                description="Auditory sound effects and celebratory visual confetti upon completing tasks or milestones."
                checked={featureFlags.celebration_sounds}
                onChange={(val) => updateFeatureFlag('celebration_sounds', val)}
                icon={Volume2}
                isDestructive={false}
              />
            </div>

            {/* Ambient Audio Default */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono uppercase tracking-wider text-nova/70 block">
                Ambient Audio Default
              </label>
              <p className="text-[11px] font-body text-nova/60 leading-tight">
                Select default ambient soundscape played during focus sessions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AMBIENT_TRACK_OPTIONS.map((track) => {
                  const isSelected = featureFlags.ambient_audio_default === track.id
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => updateFeatureFlag('ambient_audio_default', track.id)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-emerald/15 border-emerald/50 text-starlight'
                          : 'bg-void/40 border-pulsar/20 text-nova/70 hover:border-pulsar/40 hover:text-starlight'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-display font-bold ${isSelected ? 'text-emerald' : 'text-starlight'}`}>
                          {track.label}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald bg-emerald' : 'border-pulsar/40'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0c0f14]" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-nova/60 mt-1 leading-snug">
                        {track.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Data & Account */}
        {showAccount && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-1 border-b border-pulsar/20">
              <Lock className="w-4 h-4 text-gold" />
              <h4 className="text-xs font-mono text-gold uppercase tracking-wider font-bold">
                Data &amp; Account
              </h4>
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 rounded-xl bg-void/50 border border-pulsar/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-bold text-xs">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : 'PO'}
                  </div>
                  <div>
                    <p className="text-xs font-display text-starlight font-bold">
                      {user?.email || 'Guest User'}
                    </p>
                    <p className="text-[10px] font-mono text-nova/60">
                      {profile?.current_chapter ? `Chapter: ${profile.current_chapter}` : 'Polaris Workspace'}
                    </p>
                  </div>
                </div>
                {signOut && (
                  <button
                    type="button"
                    onClick={signOut}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-mono transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out
                  </button>
                )}
              </div>
            </div>

            {/* Data Management Section */}
            <div className="space-y-2">
              <h5 className="text-xs font-mono text-nova/80 uppercase tracking-wider">
                Data Portability &amp; Backup
              </h5>
              <p className="text-xs text-nova/70 leading-relaxed">
                Export a complete JSON archive of all your workspace records (tasks, goals, habits, milestones, and settings).
              </p>
              <button
                type="button"
                onClick={downloadBackup}
                className="w-full py-2.5 rounded-lg bg-pulsar/20 border border-pulsar/30 text-pulsar hover:bg-pulsar/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Download Complete JSON Backup
              </button>
            </div>

            {/* Legal & Privacy Section */}
            <div className="space-y-3 border-t border-pulsar/20 pt-4">
              <h5 className="text-xs font-mono text-gold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Legal &amp; Privacy Policies</span>
              </h5>
              <p className="text-xs text-nova/70 leading-relaxed">
                Polaris adheres to strict data privacy and isolation standards. Your data is isolated via Row Level Security and is never used for advertising, tracking, or AI model training.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
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
                  type="button"
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
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-pulsar/30">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 text-xs font-mono text-nova/60 hover:text-starlight rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-bold rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Save and Close
          </button>
        </div>

        {/* Contact info footer */}
        <div className="text-[11px] text-nova/40 font-mono text-center pt-1 border-t border-pulsar/10">
          <span>Polaris v1.2.6 . Created by Anindita Sarker Aloka</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
