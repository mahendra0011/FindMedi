import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { applyUserSettings, DEFAULT_USER_SETTINGS } from '@/lib/settings';
import type { UserSettings } from '@/types/models/user';
import type { ThemeMode, Density } from '@/types/enums';

const initialState: UserSettings = { ...DEFAULT_USER_SETTINGS };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSetting: (state, action: PayloadAction<{ key: keyof UserSettings; value: unknown }>) => {
      const { key, value } = action.payload;
      if (key in state) {
        (state as Record<string, unknown>)[key] = value;
      }
    },
    updateSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      return { ...state, ...action.payload };
    },
    resetSettings: () => {
      return { ...DEFAULT_USER_SETTINGS };
    },
    loadSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      return { ...DEFAULT_USER_SETTINGS, ...action.payload };
    },
    loadUserSettings: (state, action: PayloadAction<UserSettings | undefined>) => {
      return { ...DEFAULT_USER_SETTINGS, ...(action.payload || {}) };
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
    setDensity: (state, action: PayloadAction<Density>) => {
      state.density = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
  },
});

export const {
  updateSetting,
  updateSettings,
  resetSettings,
  loadSettings,
  loadUserSettings,
  setTheme,
  setDensity,
  setLanguage,
} = settingsSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectSetting = (state: { settings: UserSettings }): UserSettings => state.settings;
export const selectTheme = (state: { settings: UserSettings }): ThemeMode => state.settings.theme;
export const selectLanguage = (state: { settings: UserSettings }): string => state.settings.language;
export const selectDensity = (state: { settings: UserSettings }): Density =>
  state.settings.density as Density;

export const selectNotificationPrefs = (state: { settings: UserSettings }) => ({
  emailNotifications: state.settings.emailNotifications,
  systemNotifications: state.settings.systemNotifications,
  appointmentReminders: state.settings.appointmentReminders,
  weeklyReports: state.settings.weeklyReports,
  criticalAlerts: state.settings.criticalAlerts,
});

/**
 * Apply theme/language/density changes to the DOM whenever settings change.
 * Called from a Client Component wrapper in the root layout.
 */
export const applySettingsEffect = (settings: Partial<UserSettings>): UserSettings => {
  if (typeof document !== 'undefined') {
    return applyUserSettings(settings);
  }
  return { ...DEFAULT_USER_SETTINGS, ...settings };
};

export default settingsSlice.reducer;
