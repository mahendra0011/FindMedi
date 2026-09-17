import SystemSetting from '../models/SystemSetting.js';

const DEFAULTS = {
  pharmacyRejectionReasons: [
    'Unclear/blurry prescription image',
    'Prescription has expired',
    'Medicine name does not match handwriting',
    'Doctor signature/stamp missing',
    'Requested quantity exceeds prescribed amount',
  ],
  reportTypes: [
    { id: 'Bed Occupancy', name: 'Bed Occupancy Report', category: 'Administrative' },
    { id: 'Financial Summary', name: 'Financial Summary', category: 'Financial' },
    { id: 'Lab Statistics', name: 'Laboratory Statistics', category: 'Clinical' },
    { id: 'Pharmacy', name: 'Pharmacy Report', category: 'Clinical' },
    { id: 'Staff Attendance', name: 'Staff Attendance Report', category: 'HR' },
    { id: 'Inventory', name: 'Inventory Status Report', category: 'Administrative' },
    { id: 'OT Statistics', name: 'Operation Theatre Statistics', category: 'Clinical' },
    { id: 'Appointment', name: 'Appointment Statistics', category: 'Administrative' },
    { id: 'Patient', name: 'Patient Statistics', category: 'Clinical' },
    { id: 'Birth Certificate', name: 'Birth Certificate Report', category: 'Administrative' },
    { id: 'Death Certificate', name: 'Death Certificate Report', category: 'Administrative' },
    { id: 'Notifiable Disease', name: 'Notifiable Disease Report', category: 'Administrative' },
  ],
  coupons: [],
};

export async function getConfig(key) {
  try {
    const setting = await SystemSetting.findOne({ key });
    if (setting) return setting.value;
  } catch {}
  return DEFAULTS[key] ?? null;
}

export async function ensureConfigDefaults() {
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    const exists = await SystemSetting.findOne({ key });
    if (!exists) {
      await SystemSetting.create({
        key,
        value: defaultValue,
        description: `Default configuration for ${key}`,
      });
    }
  }
}
