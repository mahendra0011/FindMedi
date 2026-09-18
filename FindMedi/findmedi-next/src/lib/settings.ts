import type { UserSettings } from '@/types/models/user';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  emailNotifications: true,
  smsAlerts: true,
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

/**
 * Merge multiple settings objects, defaulting to DEFAULT_USER_SETTINGS.
 * Later objects take precedence.
 */
export function mergeSettings(...settingsList: (Partial<UserSettings> | undefined)[]): UserSettings {
  return settingsList.reduce<UserSettings>(
    (merged, settings) => ({ ...merged, ...(settings || {}) }),
    { ...DEFAULT_USER_SETTINGS },
  );
}

/** Read settings from localStorage (SSR-safe). */
export function readStoredSettings(): Partial<UserSettings> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('medicore_settings') || '{}');
  } catch {
    return {};
  }
}

/**
 * Apply settings to the DOM (theme, density, language).
 * Returns the merged settings object.
 */
export function applyUserSettings(settings: Partial<UserSettings> = {}): UserSettings {
  if (typeof document === 'undefined') return mergeSettings(settings);

  const next = mergeSettings(readStoredSettings(), settings);
  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  root.classList.toggle('dark', next.theme === 'dark' || (next.theme === 'system' && prefersDark));
  root.dataset.theme = next.theme;
  root.dataset.density = next.density;
  root.dataset.language = next.language;
  root.lang = next.language || 'en';
  root.dir = 'ltr';

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('medicore_settings', JSON.stringify(next));
  }

  return next;
}

// ─── Internationalization ────────────────────────────────────────────────────
// The old settings.js had large EN/HI/MR dictionaries. In the Next.js migration,
// we use next-intl for i18n. The dictionaries will be migrated in Phase 4.
// For now, we export a minimal t() function that returns the key.

export function t(key: string, language = 'en'): string {
  void language;
  // TODO: Migrate full i18n dictionaries to next-intl in Phase 4
  return key;
}
