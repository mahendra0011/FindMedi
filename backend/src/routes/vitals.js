import express from 'express';
import VitalsLog from '../models/VitalsLog.js';
import VitalsReminder from '../models/VitalsReminder.js';
import ChronicCarePlan from '../models/ChronicCarePlan.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Helper: Calculate clinical normal/high/low/fever flag
function computeVitalFlag(vitalType, values, personalizedTarget = null) {
  if (personalizedTarget && personalizedTarget.min != null && personalizedTarget.max != null) {
    let checkVal = null;
    if (vitalType === 'bp') checkVal = values.systolic;
    else if (vitalType === 'blood_sugar') checkVal = values.sugarValue;
    else if (vitalType === 'weight') checkVal = values.weightKg;
    else if (vitalType === 'temperature') checkVal = values.tempValue;

    if (checkVal != null) {
      if (checkVal > personalizedTarget.max) return 'high';
      if (checkVal < personalizedTarget.min) return 'low';
      return 'normal';
    }
  }

  if (vitalType === 'bp') {
    const sys = values.systolic;
    const dia = values.diastolic;
    if (sys == null || dia == null) return 'normal';
    if (sys > 140 || dia > 90) return 'high';
    if (sys < 90 || dia < 60) return 'low';
    return 'normal';
  }

  if (vitalType === 'blood_sugar') {
    const val = values.sugarValue;
    if (val == null) return 'normal';
    const ctx = values.sugarContext || 'random';
    if (ctx === 'fasting') {
      if (val > 126) return 'high';
      if (val < 70) return 'low';
      return 'normal';
    } else if (ctx === 'post_meal') {
      if (val > 180) return 'high';
      if (val < 70) return 'low';
      return 'normal';
    } else {
      if (val > 180) return 'high';
      if (val < 70) return 'low';
      return 'normal';
    }
  }

  if (vitalType === 'temperature') {
    let val = values.tempValue;
    if (val == null) return 'normal';
    // Convert to Fahrenheit if unit is C for uniform evaluation
    if (values.tempUnit === 'C') {
      val = (val * 9 / 5) + 32;
    }
    if (val >= 100.4) return 'fever';
    if (val < 95.0) return 'low';
    return 'normal';
  }

  return 'normal';
}

// ── GET /api/vitals/reference-ranges ─────────────────────────────────────────
router.get('/reference-ranges', (req, res) => {
  return res.json({
    ranges: {
      bp: {
        systolic: { normalMin: 90, normalMax: 120, highThreshold: 140, lowThreshold: 90, unit: 'mmHg' },
        diastolic: { normalMin: 60, normalMax: 80, highThreshold: 90, lowThreshold: 60, unit: 'mmHg' },
        disclaimer: 'General clinical adult reference range. Consult your doctor for personalized targets.',
      },
      blood_sugar: {
        fasting: { normalMin: 70, normalMax: 100, highThreshold: 126, lowThreshold: 70, unit: 'mg/dL' },
        post_meal: { normalMin: 90, normalMax: 140, highThreshold: 180, lowThreshold: 70, unit: 'mg/dL' },
        random: { normalMin: 70, normalMax: 140, highThreshold: 180, lowThreshold: 70, unit: 'mg/dL' },
        bedtime: { normalMin: 100, normalMax: 140, highThreshold: 180, lowThreshold: 90, unit: 'mg/dL' },
      },
      temperature: {
        normalMinF: 97.0,
        normalMaxF: 99.0,
        feverThresholdF: 100.4,
        unit: '°F',
      },
      weight: {
        unit: 'kg',
        note: 'Monitored as percentage change trend over time.',
      },
    },
  });
});

// ── GET /api/vitals/trends ───────────────────────────────────────────────────
router.get('/trends', protect, async (req, res) => {
  try {
    const vitalType = req.query.vitalType || 'bp';
    const days = parseInt(req.query.days, 10) || 30;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const matchQuery = {
      userId: req.user._id,
      vitalType,
      recordedAt: { $gte: sinceDate },
    };

    if (req.query.carePlanId) {
      matchQuery.carePlanId = req.query.carePlanId;
    }

    const readings = await VitalsLog.find(matchQuery)
      .sort({ recordedAt: 1 })
      .lean();

    // Summary calculations
    let avg = null;
    let min = null;
    let max = null;

    if (readings.length > 0) {
      if (vitalType === 'bp') {
        const sysVals = readings.map(r => r.values.systolic).filter(v => v != null);
        const diaVals = readings.map(r => r.values.diastolic).filter(v => v != null);
        if (sysVals.length > 0 && diaVals.length > 0) {
          const avgSys = Math.round(sysVals.reduce((a, b) => a + b, 0) / sysVals.length);
          const avgDia = Math.round(diaVals.reduce((a, b) => a + b, 0) / diaVals.length);
          avg = `${avgSys}/${avgDia}`;
          min = `${Math.min(...sysVals)}/${Math.min(...diaVals)}`;
          max = `${Math.max(...sysVals)}/${Math.max(...diaVals)}`;
        }
      } else if (vitalType === 'blood_sugar') {
        const vals = readings.map(r => r.values.sugarValue).filter(v => v != null);
        if (vals.length > 0) {
          avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          min = Math.min(...vals);
          max = Math.max(...vals);
        }
      } else if (vitalType === 'weight') {
        const vals = readings.map(r => r.values.weightKg).filter(v => v != null);
        if (vals.length > 0) {
          avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
          min = Math.min(...vals);
          max = Math.max(...vals);
        }
      } else if (vitalType === 'temperature') {
        const vals = readings.map(r => r.values.tempValue).filter(v => v != null);
        if (vals.length > 0) {
          avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
          min = Math.min(...vals);
          max = Math.max(...vals);
        }
      }
    }

    return res.json({
      vitalType,
      days,
      count: readings.length,
      stats: { avg, min, max },
      readings,
    });
  } catch (err) {
    logger.error('Error fetching vitals trends:', err);
    return res.status(500).json({ message: 'Failed to fetch vitals trends' });
  }
});

// ── GET /api/vitals ──────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { vitalType, carePlanId, limit = 50 } = req.query;
    const filter = { userId: req.user._id };

    if (vitalType && vitalType !== 'all') {
      filter.vitalType = vitalType;
    }
    if (carePlanId) {
      filter.carePlanId = carePlanId;
    }

    const readings = await VitalsLog.find(filter)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('carePlanId', 'planName condition')
      .lean();

    // Attach canEdit flag (within 24 hours of creation)
    const now = Date.now();
    const withEditable = readings.map(r => {
      const ageHours = (now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      return {
        ...r,
        canEdit: ageHours <= 24,
      };
    });

    return res.json({ readings: withEditable });
  } catch (err) {
    logger.error('Error fetching vitals:', err);
    return res.status(500).json({ message: 'Failed to fetch vitals' });
  }
});

// ── POST /api/vitals ─────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { vitalType, values, note, recordedAt, carePlanId } = req.body;

    if (!vitalType || !values) {
      return res.status(400).json({ message: 'Vital type and values are required' });
    }

    let personalizedTarget = null;
    if (carePlanId) {
      const plan = await ChronicCarePlan.findById(carePlanId);
      if (plan && plan.vitalsTracked) {
        const matched = plan.vitalsTracked.find(v => v.vitalType === vitalType);
        if (matched && matched.personalizedTarget) {
          personalizedTarget = matched.personalizedTarget;
        }
      }
    }

    const flag = computeVitalFlag(vitalType, values, personalizedTarget);

    const recordDate = recordedAt ? new Date(recordedAt) : new Date();
    const isBackdated = Math.abs(Date.now() - recordDate.getTime()) > (30 * 60 * 1000);

    const log = new VitalsLog({
      userId: req.user._id,
      patientId: req.user.patientId || null,
      carePlanId: carePlanId || null,
      vitalType,
      values,
      note: (note || '').trim(),
      recordedAt: recordDate,
      isBackdated,
      flag,
    });

    await log.save();

    // If out of range, create an informational in-app notification
    if (flag === 'high' || flag === 'low' || flag === 'fever') {
      await Notification.create({
        user_id: req.user._id,
        type: 'reminder',
        title: `⚠️ Vitals Warning: ${vitalType.toUpperCase()} is ${flag}`,
        message: `Your reading recorded at ${recordDate.toLocaleTimeString()} was outside normal reference ranges (${flag}).`,
      }).catch(e => logger.warn('Notification create warning:', e.message));
    }

    return res.status(201).json({
      message: 'Vital reading logged successfully',
      reading: log,
    });
  } catch (err) {
    logger.error('Error logging vital:', err);
    return res.status(500).json({ message: 'Failed to log vital reading' });
  }
});

// ── PUT /api/vitals/:id ──────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const log = await VitalsLog.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ message: 'Vital reading not found' });
    }

    // Enforce 24-hour edit window
    const ageHours = (Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      return res.status(403).json({
        message: 'Readings cannot be edited after 24 hours to preserve health data integrity',
      });
    }

    const { values, note, recordedAt, carePlanId } = req.body;

    if (values) {
      log.values = { ...log.values, ...values };
      log.flag = computeVitalFlag(log.vitalType, log.values);
    }
    if (note !== undefined) log.note = note.trim();
    if (recordedAt) {
      log.recordedAt = new Date(recordedAt);
      log.isBackdated = Math.abs(Date.now() - log.recordedAt.getTime()) > (30 * 60 * 1000);
    }
    if (carePlanId !== undefined) log.carePlanId = carePlanId || null;

    await log.save();

    return res.json({
      message: 'Vital reading updated successfully',
      reading: log,
    });
  } catch (err) {
    logger.error('Error updating vital:', err);
    return res.status(500).json({ message: 'Failed to update vital reading' });
  }
});

// ── DELETE /api/vitals/:id ───────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const log = await VitalsLog.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ message: 'Vital reading not found' });
    }

    // Enforce 24-hour delete window
    const ageHours = (Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      return res.status(403).json({
        message: 'Readings cannot be deleted after 24 hours to preserve health data integrity',
      });
    }

    await VitalsLog.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Vital reading deleted successfully' });
  } catch (err) {
    logger.error('Error deleting vital:', err);
    return res.status(500).json({ message: 'Failed to delete vital reading' });
  }
});

// ── Vitals Reminders Sub-Routes ──────────────────────────────────────────────
router.get('/reminders/all', protect, async (req, res) => {
  try {
    const reminders = await VitalsReminder.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ reminders });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch vitals reminders' });
  }
});

router.post('/reminders', protect, async (req, res) => {
  try {
    const { vitalType, times, frequency, daysOfWeek, alarmSound, instructions, carePlanId } = req.body;

    if (!vitalType || !times || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: 'Vital type and reminder times are required' });
    }

    const reminder = new VitalsReminder({
      userId: req.user._id,
      carePlanId: carePlanId || null,
      vitalType,
      times: times.map(t => t.trim()),
      frequency: frequency || 'daily',
      daysOfWeek: daysOfWeek || [],
      alarmSound: alarmSound || { presetId: 'classic_alarm' },
      instructions: (instructions || '').trim(),
      status: 'active',
    });

    await reminder.save();

    return res.status(201).json({
      message: 'Vitals reminder created successfully',
      reminder,
    });
  } catch (err) {
    logger.error('Error creating vitals reminder:', err);
    return res.status(500).json({ message: 'Failed to create vitals reminder' });
  }
});

router.put('/reminders/:id', protect, async (req, res) => {
  try {
    const reminder = await VitalsReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Vitals reminder updated', reminder });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update vitals reminder' });
  }
});

router.delete('/reminders/:id', protect, async (req, res) => {
  try {
    const reminder = await VitalsReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Vitals reminder deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete vitals reminder' });
  }
});

export default router;
