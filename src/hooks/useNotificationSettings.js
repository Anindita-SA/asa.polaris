import { useState, useEffect, useCallback } from 'react';

export const DEFAULT_NOTIFICATION_SETTINGS = {
  taskMode: 'focus_only', // 'focus_only' | 'consolidated' | 'all' | 'off'
  habitNudgesEnabled: true,
  pomodoroAlertsEnabled: true,
  masterMuted: false,
  taskIntervalMinutes: 120
};

export const NOTIFICATION_SETTINGS_STORAGE_KEY = 'polaris_notification_settings';
export const NOTIFICATION_SETTINGS_EVENT = 'polaris-notification-settings-changed';

export const getNotificationSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to parse notification settings from localStorage:', err);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState(getNotificationSettings);

  useEffect(() => {
    const handleSettingsChange = (event) => {
      if (event?.detail) {
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...event.detail });
      } else {
        setSettings(getNotificationSettings());
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === NOTIFICATION_SETTINGS_STORAGE_KEY) {
        setSettings(getNotificationSettings());
      }
    };

    window.addEventListener(NOTIFICATION_SETTINGS_EVENT, handleSettingsChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, handleSettingsChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save notification settings:', err);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: next }));
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
    } catch (err) {
      console.error('Failed to reset notification settings:', err);
    }
    setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: DEFAULT_NOTIFICATION_SETTINGS }));
    }
  }, []);

  return { settings, updateSettings, resetSettings };
};
