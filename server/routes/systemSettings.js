import express from 'express';
import { z } from 'zod';
import SystemSetting from '../models/SystemSetting.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';

const systemSettingSchema = z.object({ value: z.any().optional() });

const router = express.Router();

const DEFAULT_SETTINGS = {
  platformCommissionPercent: { value: 10, type: 'number', description: 'Platform commission percentage on each transaction' },
  supportedCities: { value: ['Lucknow', 'Delhi', 'Mumbai', 'Bangalore'], type: 'array', description: 'Cities where platform operates' },
  maxSlaHours: { value: 24, type: 'number', description: 'Maximum SLA hours for complaints' },
  enableHomeCollection: { value: true, type: 'boolean', description: 'Enable home sample collection' },
  enableTeleconsultation: { value: true, type: 'boolean', description: 'Enable teleconsultation feature' },
  maxDoctorsPerHospital: { value: 50, type: 'number', description: 'Maximum doctors allowed per hospital' },
  autoApproveDoctors: { value: false, type: 'boolean', description: 'Auto-approve doctor registrations' },
  maintenanceMode: { value: false, type: 'boolean', description: 'Put platform in maintenance mode' },
  autoConfirmAppointment: { value: true, type: 'boolean', description: 'Auto-confirm appointments globally after successful payment (facilities can override)' },
  supportEmail: { value: 'support@medicore.com', type: 'string', description: 'Platform support email' },
  termsVersion: { value: '1.0', type: 'string', description: 'Current terms of service version' },
};

async function ensureDefaults() {
  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = await SystemSetting.findOne({ key });
    if (!exists) {
      await SystemSetting.create({ key, value: config.value, description: config.description });
    }
  }
}

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    await ensureDefaults();
    const settings = await SystemSetting.find().sort({ key: 1 });
    const result = {};
    settings.forEach(s => {
      result[s.key] = {
        value: s.value,
        description: s.description,
        type: DEFAULT_SETTINGS[s.key]?.type || typeof s.value,
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:key', protect, superadminOnly, validate(systemSettingSchema), async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ message: 'Value is required' });
    const setting = await SystemSetting.findOneAndUpdate(
      { key: req.params.key },
      { value, updatedBy: req.user.name || req.user.id, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    await auditLog('update_system_setting', req.user._id, { settingKey: req.params.key, newValue: value, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ key: setting.key, value: setting.value });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
