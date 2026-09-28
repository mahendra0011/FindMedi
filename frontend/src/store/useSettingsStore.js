// Settings state — pure UI preferences (theme, language, notification prefs).
//
// Migrated from Redux (store/slices/settingsSlice.js) per the tech-stack audit:
// pure-UI state belongs in Zustand, server-derived state stays in React Query /
// Redux. The reactive surface kept deliberately small:
//
//   const settings = useSettings();                 // the values object
//   const updateSetting = useUpdateSetting();       // stable action ref
//   const loadUserSettings = useLoadUserSettings(); // stable action ref
//
// `values` is replaced (never mutated) on every action, so selecting it is a
// stable reference between updates — no shallow-compare needed, no re-render
// loops.
import { create } from 'zustand';
import { applyUserSettings } from '@/lib/settings';

export const DEFAULT_SETTINGS = {
  emailNotifications: true,
  systemNotifications: true,
  weeklyReports: false,
  appointmentReminders: true,
  labResultEmails: true,
  criticalAlerts: true,
  adminDigest: true,
  doctorScheduleAlerts: true,
  patientRecordSharing: false,
  theme: 'system',
  density: 'comfortable',
  language: 'en',
  timezone: 'Asia/Calcutta',
  defaultDashboard: 'overview',
  twoFactorEnabled: false,
  dataSharing: false,
  profileVisibility: 'care_team',
};

// Mirrors the Redux slice's `if (key in state)` guard, which exists so an
// unknown key can never be written into settings.
const isSettingKey = (key) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key);

export const useSettingsStore = create((set) => ({
  values: { ...DEFAULT_SETTINGS },
  updateSetting: ({ key, value }) =>
    set((state) => (isSettingKey(key) ? { values: { ...state.values, [key]: value } } : state)),
  resetSettings: () => set({ values: { ...DEFAULT_SETTINGS } }),
  loadSettings: (payload) => set({ values: { ...DEFAULT_SETTINGS, ...(payload || {}) } }),
  loadUserSettings: (payload) => set({ values: { ...DEFAULT_SETTINGS, ...(payload || {}) } }),
}));

/** Reactive settings object (stable identity between updates). */
export const useSettings = () => useSettingsStore((s) => s.values);

/** Action hooks — zustand action refs are stable across renders. */
export const useUpdateSetting = () => useSettingsStore((s) => s.updateSetting);
export const useLoadUserSettings = () => useSettingsStore((s) => s.loadUserSettings);
export const useResetSettings = () => useSettingsStore((s) => s.resetSettings);

/** Non-hook access, for callbacks outside the React tree. */
export const settingsActions = {
  updateSetting: (payload) => useSettingsStore.getState().updateSetting(payload),
  loadUserSettings: (payload) => useSettingsStore.getState().loadUserSettings(payload),
  loadSettings: (payload) => useSettingsStore.getState().loadSettings(payload),
  resetSettings: () => useSettingsStore.getState().resetSettings(),
};

// Apply theme/language changes to the DOM whenever settings change.
export const applySettingsEffect = (settings) => {
  if (typeof document !== 'undefined') {
    applyUserSettings(settings);
  }
};
