import express from 'express';
import MedicineReminder from '../models/MedicineReminder.js';
import MedicineDoseLog from '../models/MedicineDoseLog.js';
import Notification from '../models/Notification.js';
import ChronicCarePlan from '../models/ChronicCarePlan.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../services/notificationService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ── GET /api/medicine-reminders/alarm-sounds ─────────────────────────────────
router.get('/alarm-sounds', (req, res) => {
  const presets = [
    {
      id: 'classic_alarm',
      name: 'Classic Alarm',
      description: 'Traditional rhythmic beep-beep-beep alarm clock',
      type: 'synth',
    },
    {
      id: 'digital_buzzer',
      name: 'Digital Buzzer',
      description: 'Sharp electronic urgent buzzer',
      type: 'synth',
    },
    {
      id: 'gentle_rise',
      name: 'Gentle Rise',
      description: 'Softer harmonic ascending chime for pleasant waking',
      type: 'synth',
    },
    {
      id: 'chime_cascade',
      name: 'Chime Cascade',
      description: 'Repeating multi-tone melodic chime sequence',
      type: 'synth',
    },
    {
      id: 'custom',
      name: 'Custom Sound',
      description: 'Personal audio track',
      type: 'audio',
    },
  ];
  return res.json({ presets });
});

// ── GET /api/medicine-reminders/adherence ─────────────────────────────────────
router.get('/adherence', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const matchQuery = {
      userId: req.user._id,
      scheduledAt: { $gte: sinceDate },
    };

    if (req.query.carePlanId) {
      matchQuery.carePlanId = req.query.carePlanId;
    }
    if (req.query.reminderId) {
      matchQuery.reminderId = req.query.reminderId;
    }

    const allLogs = await MedicineDoseLog.find(matchQuery).sort({ scheduledAt: 1 }).lean();
    // Sirf responded logs gino — unanswered snooze "taken" gin jata tha, score jhootha banta tha
    const logs = allLogs.filter(l => l.respondedAt);

    let totalScheduled = logs.length;
    let takenCount = 0;
    let missedCount = 0;
    let skippedCount = 0;

    const dailyMap = {};

    logs.forEach(log => {
      const dayKey = new Date(log.scheduledAt).toISOString().split('T')[0];
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, taken: 0, missed: 0, skipped: 0, total: 0 };
      }
      dailyMap[dayKey].total += 1;

      if (log.status === 'taken' || log.status === 'snoozed_then_taken') {
        takenCount += 1;
        dailyMap[dayKey].taken += 1;
      } else if (log.status === 'missed' || log.status === 'snoozed_then_missed') {
        missedCount += 1;
        dailyMap[dayKey].missed += 1;
      } else if (log.status === 'skipped') {
        skippedCount += 1;
        dailyMap[dayKey].skipped += 1;
      }
    });

    const heatmap = Object.values(dailyMap).map(d => {
      let status = 'none';
      if (d.total > 0) {
        if (d.taken === d.total) status = 'taken';
        else if (d.taken > 0) status = 'partial';
        else status = 'missed';
      }
      return {
        date: d.date,
        status,
        taken: d.taken,
        missed: d.missed,
        skipped: d.skipped,
        total: d.total,
      };
    });

    const adherenceScore = totalScheduled > 0
      ? Math.round((takenCount / totalScheduled) * 100)
      : null;

    return res.json({
      days,
      adherenceScore,
      totalScheduled,
      takenCount,
      missedCount,
      skippedCount,
      heatmap,
    });
  } catch (err) {
    logger.error('Error fetching adherence metrics:', err);
    return res.status(500).json({ message: 'Failed to calculate adherence metrics' });
  }
});

// ── GET /api/medicine-reminders ──────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { status, carePlanId } = req.query;
    const filter = { userId: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (carePlanId) {
      filter.carePlanId = carePlanId;
    }

    const reminders = await MedicineReminder.find(filter)
      .sort({ createdAt: -1 })
      .populate('carePlanId', 'planName condition')
      .lean();

    // Fetch today's dose logs for these reminders to show today's execution state
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const reminderIds = reminders.map(r => r._id);
    const todayLogs = await MedicineDoseLog.find({
      userId: req.user._id,
      reminderId: { $in: reminderIds },
      scheduledAt: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const remindersWithToday = reminders.map(r => {
      const logsForThis = todayLogs.filter(l => l.reminderId.toString() === r._id.toString());
      return {
        ...r,
        todayLogs: logsForThis,
      };
    });

    return res.json({ reminders: remindersWithToday });
  } catch (err) {
    logger.error('Error fetching medicine reminders:', err);
    return res.status(500).json({ message: 'Failed to fetch medicine reminders' });
  }
});

// ── POST /api/medicine-reminders ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      medicineName,
      dosage,
      form,
      frequency,
      times,
      startDate,
      endDate,
      alarmSound,
      autoMissAfterMinutes,
      notifyDoctorOnMissThreshold,
      instructions,
      carePlanId,
      prescriptionId,
    } = req.body;

    if (!medicineName || !dosage || !times || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: 'Medicine name, dosage, and at least one reminder time are required' });
    }

    const reminder = new MedicineReminder({
      userId: req.user._id,
      patientId: req.user.patientId || null,
      prescriptionId: prescriptionId || null,
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      form: form || 'Tablet',
      frequency: frequency || 'once_daily',
      times: times.map(t => t.trim()),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      alarmSound: alarmSound || { presetId: 'classic_alarm' },
      autoMissAfterMinutes: autoMissAfterMinutes || 10,
      notifyDoctorOnMissThreshold: notifyDoctorOnMissThreshold || null,
      instructions: (instructions || '').trim(),
      carePlanId: carePlanId || null,
      status: 'active',
    });

    await reminder.save();

    // If linked to a care plan, register this reminder in the care plan
    if (carePlanId) {
      await ChronicCarePlan.findByIdAndUpdate(carePlanId, {
        $addToSet: { medicineReminderIds: reminder._id },
      });
    }

    return res.status(201).json({
      message: 'Medicine reminder created successfully',
      reminder,
    });
  } catch (err) {
    logger.error('Error creating medicine reminder:', err);
    return res.status(500).json({ message: 'Failed to create medicine reminder' });
  }
});

// ── GET /api/medicine-reminders/:id ──────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('carePlanId', 'planName condition');

    if (!reminder) {
      return res.status(404).json({ message: 'Medicine reminder not found' });
    }

    return res.json({ reminder });
  } catch (err) {
    logger.error('Error fetching reminder:', err);
    return res.status(500).json({ message: 'Failed to fetch reminder' });
  }
});

// ── PUT /api/medicine-reminders/:id ──────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Medicine reminder not found' });
    }

    const {
      medicineName,
      dosage,
      form,
      frequency,
      times,
      startDate,
      endDate,
      alarmSound,
      autoMissAfterMinutes,
      notifyDoctorOnMissThreshold,
      instructions,
      carePlanId,
      status,
    } = req.body;

    if (medicineName) reminder.medicineName = medicineName.trim();
    if (dosage) reminder.dosage = dosage.trim();
    if (form) reminder.form = form;
    if (frequency) reminder.frequency = frequency;
    if (times && Array.isArray(times) && times.length > 0) reminder.times = times.map(t => t.trim());
    if (startDate) reminder.startDate = new Date(startDate);
    if (endDate !== undefined) reminder.endDate = endDate ? new Date(endDate) : null;
    if (alarmSound) reminder.alarmSound = alarmSound;
    if (autoMissAfterMinutes) reminder.autoMissAfterMinutes = autoMissAfterMinutes;
    if (notifyDoctorOnMissThreshold !== undefined) reminder.notifyDoctorOnMissThreshold = notifyDoctorOnMissThreshold;
    if (instructions !== undefined) reminder.instructions = instructions.trim();
    if (status) reminder.status = status;

    if (carePlanId !== undefined && carePlanId !== reminder.carePlanId?.toString()) {
      if (reminder.carePlanId) {
        await ChronicCarePlan.findByIdAndUpdate(reminder.carePlanId, {
          $pull: { medicineReminderIds: reminder._id },
        });
      }
      reminder.carePlanId = carePlanId || null;
      if (carePlanId) {
        await ChronicCarePlan.findByIdAndUpdate(carePlanId, {
          $addToSet: { medicineReminderIds: reminder._id },
        });
      }
    }

    await reminder.save();

    return res.json({
      message: 'Medicine reminder updated successfully',
      reminder,
    });
  } catch (err) {
    logger.error('Error updating medicine reminder:', err);
    return res.status(500).json({ message: 'Failed to update medicine reminder' });
  }
});

// ── PUT /api/medicine-reminders/:id/pause ────────────────────────────────────
router.put('/:id/pause', protect, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'paused' },
      { new: true }
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Reminder paused', reminder });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to pause reminder' });
  }
});

// ── PUT /api/medicine-reminders/:id/resume ───────────────────────────────────
router.put('/:id/resume', protect, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'active' },
      { new: true }
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Reminder resumed', reminder });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to resume reminder' });
  }
});

// ── DELETE /api/medicine-reminders/:id ───────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Medicine reminder not found' });
    }

    if (reminder.carePlanId) {
      await ChronicCarePlan.findByIdAndUpdate(reminder.carePlanId, {
        $pull: { medicineReminderIds: reminder._id },
      });
    }

    return res.json({ message: 'Medicine reminder deleted successfully' });
  } catch (err) {
    logger.error('Error deleting reminder:', err);
    return res.status(500).json({ message: 'Failed to delete reminder' });
  }
});

// ── POST /api/medicine-reminders/:id/dose/respond ────────────────────────────
// Record dose action: 'taken' | 'skipped' | 'snoozed' | 'missed'
router.post('/:id/dose/respond', protect, async (req, res) => {
  try {
    const { status, scheduledAt, note, snoozeMinutes } = req.body;

    if (!['taken', 'skipped', 'snoozed', 'missed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid response status' });
    }

    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();

    // Check if there is already a log for this specific schedule window (within 1 hour)
    const windowStart = new Date(scheduledDate);
    windowStart.setMinutes(windowStart.getMinutes() - 30);
    const windowEnd = new Date(scheduledDate);
    windowEnd.setMinutes(windowEnd.getMinutes() + 30);

    let doseLog = await MedicineDoseLog.findOne({
      reminderId: reminder._id,
      userId: req.user._id,
      scheduledAt: { $gte: windowStart, $lte: windowEnd },
    });

    if (status === 'snoozed') {
      if (doseLog) {
        doseLog.snoozeCount += 1;
        doseLog.note = note || doseLog.note;
        await doseLog.save();
      } else {
        doseLog = new MedicineDoseLog({
          reminderId: reminder._id,
          userId: req.user._id,
          carePlanId: reminder.carePlanId,
          scheduledAt: scheduledDate,
          status: 'snoozed_then_taken', // temporary state pending next response
          snoozeCount: 1,
          note: note || '',
        });
        await doseLog.save();
      }
      return res.json({
        message: `Reminder snoozed for ${snoozeMinutes || 10} minutes`,
        doseLog,
      });
    }

    let finalStatus = status;
    if (doseLog && doseLog.snoozeCount > 0) {
      finalStatus = status === 'taken' ? 'snoozed_then_taken' : 'snoozed_then_missed';
    }

    if (doseLog) {
      doseLog.status = finalStatus;
      doseLog.respondedAt = new Date();
      if (note) doseLog.note = note;
      await doseLog.save();
    } else {
      doseLog = new MedicineDoseLog({
        reminderId: reminder._id,
        userId: req.user._id,
        carePlanId: reminder.carePlanId,
        scheduledAt: scheduledDate,
        status: finalStatus,
        respondedAt: new Date(),
        note: note || '',
      });
      await doseLog.save();
    }

    // In-app notification creation
    if (status === 'missed') {
      await Notification.create({
        userId: String(req.user._id),
        type: 'reminder',
        title: `💊 Missed Dose: ${reminder.medicineName}`,
        message: `You missed your scheduled dose of ${reminder.medicineName} (${reminder.dosage}).`,
      }).catch(e => logger.warn('Missed-dose notification failed: ' + e.message));

      // Check if threshold for doctor notification is crossed
      if (reminder.notifyDoctorOnMissThreshold && reminder.carePlanId) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentMisses = await MedicineDoseLog.countDocuments({
          reminderId: reminder._id,
          status: { $in: ['missed', 'snoozed_then_missed'] },
          scheduledAt: { $gte: oneWeekAgo },
        });

        if (recentMisses >= reminder.notifyDoctorOnMissThreshold) {
          const plan = await ChronicCarePlan.findById(reminder.carePlanId);
          if (plan && plan.shareWithDoctor && plan.linkedDoctorId) {
            const doctor = await Doctor.findById(plan.linkedDoctorId);
            if (doctor && doctor.email) {
              await sendEmail({
                to: doctor.email,
                subject: `Patient Alert: Missed Doses for ${reminder.medicineName}`,
                text: `Patient ${req.user.name || 'Patient'} has missed ${recentMisses} doses of ${reminder.medicineName} in the last 7 days under their ${plan.planName}.`,
              }).catch(e => logger.warn('Failed to send doctor adherence alert email:', e.message));
            }
          }
        }
      }
    }

    return res.json({
      message: `Dose marked as ${status}`,
      doseLog,
    });
  } catch (err) {
    logger.error('Error responding to dose:', err);
    return res.status(500).json({ message: 'Failed to record dose response' });
  }
});

export default router;
