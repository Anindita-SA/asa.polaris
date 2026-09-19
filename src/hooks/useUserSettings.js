import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_EVENT
} from './useNotificationSettings';

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_EVENT
};

export const USER_SETTINGS_STORAGE_KEY = 'polaris_user_settings';
export const USER_SETTINGS_EVENT = 'polaris-settings-changed';

export const DEFAULT_FEATURE_FLAGS = {
  auto_quadrant_suggest: false,
  nudges_enabled: true,
  nudge_intervals: {},
  contact_reminders_enabled: true,
  celebration_sounds: true,
  ambient_audio_default: 'lofi'
};

export const getStoredUserSettings = () => {
  if (typeof window === 'undefined') {
    return {
      featureFlags: DEFAULT_FEATURE_FLAGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS
    };
  }

  let featureFlags = { ...DEFAULT_FEATURE_FLAGS };
  let notificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

  // Read polaris_user_settings if available
  try {
    const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.featureFlags) {
        featureFlags = { ...featureFlags, ...parsed.featureFlags };
      }
      if (parsed.notificationSettings) {
        notificationSettings = { ...notificationSettings, ...parsed.notificationSettings };
      }
    }
  } catch (err) {
    console.error('Failed to parse polaris_user_settings from localStorage:', err);
  }

  // Also merge legacy / companion polaris_notification_settings
  try {
    const rawNotif = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (rawNotif) {
      const parsedNotif = JSON.parse(rawNotif);
      notificationSettings = { ...notificationSettings, ...parsedNotif };
    }
  } catch (err) {
    console.error('Failed to parse polaris_notification_settings from localStorage:', err);
  }

  return { featureFlags, notificationSettings };
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [featureFlags, setFeatureFlags] = useState(() => getStoredUserSettings().featureFlags);
  const [notificationSettings, setNotificationSettings] = useState(() => getStoredUserSettings().notificationSettings);
  const [loading, setLoading] = useState(false);

  // Sync with remote Supabase user_settings on mount or user change
  useEffect(() => {
    let isMounted = true;
    if (!user?.id || typeof supabase?.from !== 'function') return;

    const fetchRemoteSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('Could not fetch user_settings from Supabase (offline or table pending):', error.message || error);
          return;
        }

        if (data?.feature_flags && isMounted) {
          const mergedFlags = { ...DEFAULT_FEATURE_FLAGS, ...data.feature_flags };
          setFeatureFlags(mergedFlags);

          // Update local storage
          const currentStored = getStoredUserSettings();
          const next = {
            featureFlags: mergedFlags,
            notificationSettings: currentStored.notificationSettings
          };
          localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(USER_SETTINGS_EVENT, { detail: next }));
          }
        } else if (!data && isMounted) {
          // If no row exists yet for this user, insert initial row
          try {
            const { error: insertErr } = await supabase
              .from('user_settings')
              .insert({
                user_id: user.id,
                feature_flags: featureFlags,
                updated_at: new Date().toISOString()
              });

            if (insertErr) {
              console.warn('Initial user_settings row insert failed:', insertErr.message || insertErr);
            }
          } catch (insertErr) {
            console.warn('Initial user_settings row insert skipped:', insertErr);
          }
        }
      } catch (err) {
        console.warn('Remote settings sync error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRemoteSettings();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Window events synchronization
  useEffect(() => {
    const handleSettingsEvent = (e) => {
      if (e?.detail) {
        if (e.detail.featureFlags) {
          setFeatureFlags((prev) => ({ ...prev, ...e.detail.featureFlags }));
        }
        if (e.detail.notificationSettings) {
          setNotificationSettings((prev) => ({ ...prev, ...e.detail.notificationSettings }));
        }
      } else {
        const stored = getStoredUserSettings();
        setFeatureFlags(stored.featureFlags);
        setNotificationSettings(stored.notificationSettings);
      }
    };

    const handleNotifSettingsEvent = (e) => {
      if (e?.detail) {
        setNotificationSettings((prev) => ({ ...prev, ...e.detail }));
      }
    };

    const handleStorage = (e) => {
      if (e.key === USER_SETTINGS_STORAGE_KEY || e.key === NOTIFICATION_SETTINGS_STORAGE_KEY) {
        const stored = getStoredUserSettings();
        setFeatureFlags(stored.featureFlags);
        setNotificationSettings(stored.notificationSettings);
      }
    };

    window.addEventListener(USER_SETTINGS_EVENT, handleSettingsEvent);
    window.addEventListener(NOTIFICATION_SETTINGS_EVENT, handleNotifSettingsEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(USER_SETTINGS_EVENT, handleSettingsEvent);
      window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, handleNotifSettingsEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateFeatureFlag = useCallback(async (key, value) => {
    let nextFlags;
    setFeatureFlags((prev) => {
      nextFlags = { ...prev, [key]: value };

      // Update localStorage immediately for offline responsiveness
      const stored = getStoredUserSettings();
      const next = {
        featureFlags: nextFlags,
        notificationSettings: stored.notificationSettings
      };
      try {
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save user_settings to localStorage:', err);
      }

      // Dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(USER_SETTINGS_EVENT, { detail: next }));
      }

      return nextFlags;
    });

    // Async sync to Supabase if authenticated
    if (user?.id && typeof supabase?.from === 'function') {
      try {
        const { error: upsertErr } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            feature_flags: nextFlags || { [key]: value },
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (upsertErr) {
          console.warn('Supabase feature_flags sync warning:', upsertErr.message || upsertErr);
        }
      } catch (err) {
        console.warn('Supabase sync caught error:', err);
      }
    }
  }, [user?.id]);

  const updateNotificationSettings = useCallback((partial) => {
    setNotificationSettings((prev) => {
      const nextNotifs = { ...prev, ...partial };

      // Update polaris_user_settings in localStorage
      const stored = getStoredUserSettings();
      const next = {
        featureFlags: stored.featureFlags,
        notificationSettings: nextNotifs
      };
      try {
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save notification settings to polaris_user_settings:', err);
      }

      // Also sync to polaris_notification_settings for legacy listeners
      try {
        localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(nextNotifs));
      } catch (err) {
        console.error('Failed to save polaris_notification_settings:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(USER_SETTINGS_EVENT, { detail: next }));
        window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: nextNotifs }));
      }

      return nextNotifs;
    });
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify({
        featureFlags: DEFAULT_FEATURE_FLAGS,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS
      }));
      localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
    } catch (err) {
      console.error('Failed to reset user settings:', err);
    }
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(USER_SETTINGS_EVENT, {
        detail: { featureFlags: DEFAULT_FEATURE_FLAGS, notificationSettings: DEFAULT_NOTIFICATION_SETTINGS }
      }));
      window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: DEFAULT_NOTIFICATION_SETTINGS }));
    }
  }, []);

  return {
    featureFlags,
    updateFeatureFlag,
    notificationSettings,
    updateNotificationSettings,
    resetSettings,
    loading
  };
};
