// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useUserSettings,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_EVENT,
  DEFAULT_FEATURE_FLAGS
} from './useUserSettings';
import {
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_EVENT,
  DEFAULT_NOTIFICATION_SETTINGS
} from './useNotificationSettings';
import { supabase } from '../lib/supabase';

const mockUser = { id: 'test-user-123' };

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('useUserSettings hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides default feature flags and notification settings when localStorage is empty', () => {
    const { result } = renderHook(() => useUserSettings());

    expect(result.current.featureFlags).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(result.current.notificationSettings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('updates feature flag, saves to localStorage, and dispatches custom event', () => {
    const listener = vi.fn();
    window.addEventListener(USER_SETTINGS_EVENT, listener);

    const { result } = renderHook(() => useUserSettings());

    act(() => {
      result.current.updateFeatureFlag('auto_quadrant_suggest', true);
    });

    expect(result.current.featureFlags.auto_quadrant_suggest).toBe(true);

    const stored = JSON.parse(localStorage.getItem(USER_SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.featureFlags.auto_quadrant_suggest).toBe(true);

    expect(listener).toHaveBeenCalled();
    window.removeEventListener(USER_SETTINGS_EVENT, listener);
  });

  it('updates notification settings and syncs to both storage keys and events', () => {
    const userSettingsListener = vi.fn();
    const notifSettingsListener = vi.fn();
    window.addEventListener(USER_SETTINGS_EVENT, userSettingsListener);
    window.addEventListener(NOTIFICATION_SETTINGS_EVENT, notifSettingsListener);

    const { result } = renderHook(() => useUserSettings());

    act(() => {
      result.current.updateNotificationSettings({ taskMode: 'consolidated', masterMuted: true });
    });

    expect(result.current.notificationSettings.taskMode).toBe('consolidated');
    expect(result.current.notificationSettings.masterMuted).toBe(true);

    const storedUser = JSON.parse(localStorage.getItem(USER_SETTINGS_STORAGE_KEY) || '{}');
    expect(storedUser.notificationSettings.taskMode).toBe('consolidated');

    const storedNotif = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY) || '{}');
    expect(storedNotif.taskMode).toBe('consolidated');

    expect(userSettingsListener).toHaveBeenCalled();
    expect(notifSettingsListener).toHaveBeenCalled();

    window.removeEventListener(USER_SETTINGS_EVENT, userSettingsListener);
    window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, notifSettingsListener);
  });

  it('resets settings to default', () => {
    const { result } = renderHook(() => useUserSettings());

    act(() => {
      result.current.updateFeatureFlag('auto_quadrant_suggest', true);
      result.current.updateNotificationSettings({ taskMode: 'off' });
    });

    expect(result.current.featureFlags.auto_quadrant_suggest).toBe(true);
    expect(result.current.notificationSettings.taskMode).toBe('off');

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.featureFlags).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(result.current.notificationSettings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);

    const stored = JSON.parse(localStorage.getItem(USER_SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.featureFlags.auto_quadrant_suggest).toBe(false);
  });
});
