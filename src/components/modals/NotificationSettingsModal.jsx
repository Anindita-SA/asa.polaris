import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Bell, VolumeX, RotateCcw, Check, Sparkles, Clock, ShieldAlert } from 'lucide-react';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

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
];

const FREQUENCY_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes (1 hour)' },
  { value: 120, label: '120 minutes (2 hours)' },
  { value: 240, label: '240 minutes (4 hours)' }
];

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
);

const NotificationSettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useNotificationSettings();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="notification-settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg glass border border-amber-500/30 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-pulsar/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-display text-starlight leading-tight">
                  Notification Settings
                </h3>
                <p className="text-xs font-mono text-nova/60 mt-0.5">
                  Tune nudges, alerts, and quiet focus preferences
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-nova/60 hover:text-starlight p-1.5 rounded-lg hover:bg-pulsar/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
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
              checked={settings.masterMuted}
              onChange={(val) => updateSettings({ masterMuted: val })}
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
                const isSelected = settings.taskMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateSettings({ taskMode: mode.id })}
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
                );
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
                value={settings.taskIntervalMinutes}
                onChange={(e) => updateSettings({ taskIntervalMinutes: Number(e.target.value) })}
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

          {/* System Habit & Pomodoro Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
              Habits and Pomodoro
            </label>
            <div className="space-y-2">
              <ToggleRow
                id="habit-nudges-toggle"
                label="System Habit Nudges"
                description="Periodic gentle prompts for hydration, posture check, and micro-breaks."
                checked={settings.habitNudgesEnabled}
                onChange={(val) => updateSettings({ habitNudgesEnabled: val })}
                icon={Sparkles}
                isDestructive={false}
              />
              <ToggleRow
                id="pomodoro-alerts-toggle"
                label="Pomodoro Timer Alerts"
                description="Auditory chimes and completion alerts when focus sessions finish."
                checked={settings.pomodoroAlertsEnabled}
                onChange={(val) => updateSettings({ pomodoroAlertsEnabled: val })}
                icon={Bell}
                isDestructive={false}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-pulsar/30">
            <button
              type="button"
              onClick={resetSettings}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationSettingsModal;
