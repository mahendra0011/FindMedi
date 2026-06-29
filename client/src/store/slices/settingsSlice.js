import { createSlice } from '@reduxjs/toolkit';
import { applyUserSettings } from '@/lib/settings';

const DEFAULT_SETTINGS = {
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

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { ...DEFAULT_SETTINGS },
  reducers: {
    updateSetting: (state, action) => {
      const { key, value } = action.payload;
      if (key in state) {
        state[key] = value;
      }
    },
    resetSettings: (state) => {
      return { ...DEFAULT_SETTINGS };
    },
    loadSettings: (state, action) => {
      return { ...DEFAULT_SETTINGS, ...action.payload };
    },
  },
});

export const { updateSetting, resetSettings, loadSettings } = settingsSlice.actions;

export const selectSetting = (state) => state.settings;
export const selectTheme = (state) => state.settings.theme;
export const selectLanguage = (state) => state.settings.language;
export const selectNotificationPrefs = (state) => ({
  emailNotifications: state.settings.emailNotifications,
  systemNotifications: state.settings.systemNotifications,
  appointmentReminders: state.settings.appointmentReminders,
  weeklyReports: state.settings.weeklyReports,
  criticalAlerts: state.settings.criticalAlerts,
});

// Apply theme/language changes to DOM whenever settings change
export const applySettingsEffect = (settings) => {
  if (typeof document !== 'undefined') {
    applyUserSettings(settings);
  }
};

export default settingsSlice.reducer;