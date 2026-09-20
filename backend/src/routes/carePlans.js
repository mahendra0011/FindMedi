import express from 'express';
import ChronicCarePlan from '../models/ChronicCarePlan.js';
import MedicineReminder from '../models/MedicineReminder.js';
import MedicineDoseLog from '../models/MedicineDoseLog.js';
import VitalsLog from '../models/VitalsLog.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── Permission helpers: kaun plan dekh sakta hai ───
async function resolveDoctorId(user) {
  if (user.role !== 'doctor' && user.role !== 'clinic_doctor') return null;
  const doc = await Doctor.findOne({
    $or: [{ user_id: user._id.toString() }, { email: user.email }],
  }).select('_id');
  return doc?._id || null;
}

async function canViewPlan(plan, user) {
  if (String(plan.userId?._id || plan.userId) === String(user._id)) return true;
  if (user.role === 'superadmin') return true;
  if (!plan.shareWithDoctor || !plan.linkedDoctorId) return false;
  const docId = await resolveDoctorId(user);
  return !!docId && String(docId) === String(plan.linkedDoctorId?._id || plan.linkedDoctorId);
}

// ── GET /api/care-plans/doctor-view ──────────────────────────────────────────
// Doctor views consented care plans for their patients
router.get('/doctor-view', protect, async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'clinic_doctor') {
      return res.status(403).json({ message: 'Access restricted to doctors only' });
    }

    let doctorId = req.doctor?._id;
    if (!doctorId) {
      const doc = await Doctor.findOne({
        $or: [
          { user_id: req.user._id.toString() },
          { email: req.user.email },
        ],
      });
      doctorId = doc?._id;
    }

    if (!doctorId) {
      return res.json({ carePlans: [] });
    }

    // Strict privacy consent enforcement: shareWithDoctor MUST be true
    const plans = await ChronicCarePlan.find({
      linkedDoctorId: doctorId,
      shareWithDoctor: true,
      status: { $in: ['active', 'paused'] },
    })
      .populate('userId', 'name email phone')
      .populate('medicineReminderIds', 'medicineName dosage frequency times status')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach latest vitals and 30-day adherence for each plan
    const enhancedPlans = await Promise.all(
      plans.map(async (plan) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Calculate adherence — sirf responded logs
        const logs = (await MedicineDoseLog.find({
          carePlanId: plan._id,
          scheduledAt: { $gte: thirtyDaysAgo },
        }).lean()).filter(l => l.respondedAt);

        const totalDoses = logs.length;
        const takenDoses = logs.filter(l => l.status === 'taken' || l.status === 'snoozed_then_taken').length;
        const adherenceScore = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : null;

        // Fetch latest vitals for tracked types
        const trackedTypes = (plan.vitalsTracked || []).map(v => v.vitalType);
        const latestVitals = await Promise.all(
          trackedTypes.map(async (vType) => {
            const latest = await VitalsLog.findOne({
              userId: plan.userId?._id || plan.userId,
              vitalType: vType,
            }).sort({ recordedAt: -1 }).lean();
            return { vitalType: vType, reading: latest };
          })
        );

        return {
          ...plan,
          adherenceScore,
          latestVitals,
        };
      })
    );

    return res.json({ carePlans: enhancedPlans });
  } catch (err) {
    logger.error('Error fetching doctor care plans:', err);
    return res.status(500).json({ message: 'Failed to fetch doctor care plans' });
  }
});

// ── GET /api/care-plans ──────────────────────────────────────────────────────
// Patient lists their own care plans
router.get('/', protect, async (req, res) => {
  try {
    const plans = await ChronicCarePlan.find({ userId: req.user._id })
      .populate('linkedDoctorId', 'name specialization hospital_name')
      .populate('medicineReminderIds', 'medicineName dosage frequency times status')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ carePlans: plans });
  } catch (err) {
    logger.error('Error fetching care plans:', err);
    return res.status(500).json({ message: 'Failed to fetch care plans' });
  }
});

// ── POST /api/care-plans ─────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      planName,
      condition,
      customCondition,
      linkedDoctorId,
      medicineReminderIds,
      vitalsTracked,
      followUpIntervalDays,
      shareWithDoctor,
      notes,
      patientUserId, // If created by doctor
    } = req.body;

    if (!planName || !condition) {
      return res.status(400).json({ message: 'Plan name and condition are required' });
    }

    const isDoctor = req.user.role === 'doctor' || req.user.role === 'clinic_doctor';
    const targetUserId = (isDoctor && patientUserId) ? patientUserId : req.user._id;

    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + (followUpIntervalDays || 30));

    const carePlan = new ChronicCarePlan({
      userId: targetUserId,
      planName: planName.trim(),
      condition,
      customCondition: (customCondition || '').trim(),
      linkedDoctorId: linkedDoctorId || null,
      medicineReminderIds: medicineReminderIds || [],
      vitalsTracked: vitalsTracked || [],
      followUpIntervalDays: followUpIntervalDays || 30,
      nextFollowUpDueAt: nextFollowUp,
      shareWithDoctor: isDoctor ? true : !!shareWithDoctor,
      notes: (notes || '').trim(),
      status: isDoctor && targetUserId.toString() !== req.user._id.toString()
        ? 'pending_patient_acceptance'
        : 'active',
      createdBy: isDoctor ? 'doctor' : 'patient',
    });

    await carePlan.save();

    // Link any specified medicine reminders — sirf apni (target user ki)
    if (medicineReminderIds && medicineReminderIds.length > 0) {
      await MedicineReminder.updateMany(
        { _id: { $in: medicineReminderIds }, userId: targetUserId },
        { $set: { carePlanId: carePlan._id } }
      );
    }

    if (isDoctor && targetUserId.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: String(targetUserId),
        type: 'reminder',
        title: `❤️ New Care Plan from Dr. ${req.user.name}`,
        message: `Your doctor has initiated "${planName}". Open your Care Plans tab to review and activate it.`,
      }).catch(e => logger.warn('Notification create failed:', e.message));
    }

    return res.status(201).json({
      message: 'Care Plan created successfully',
      carePlan,
    });
  } catch (err) {
    logger.error('Error creating care plan:', err);
    return res.status(500).json({ message: 'Failed to create care plan' });
  }
});

// ── GET /api/care-plans/:id/today ────────────────────────────────────────────
// Today's combined checklist for a care plan
router.get('/:id/today', protect, async (req, res) => {
  try {
    const plan = await ChronicCarePlan.findById(req.params.id)
      .populate('linkedDoctorId', 'name specialization')
      .populate('medicineReminderIds');

    if (!plan) {
      return res.status(404).json({ message: 'Care plan not found' });
    }

    // Permission check — owner, superadmin, ya consented linked doctor
    if (!(await canViewPlan(plan, req.user))) {
      return res.status(403).json({ message: 'Not authorized to view this care plan' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Medicines scheduled today
    const medicinesDue = [];
    for (const rem of (plan.medicineReminderIds || [])) {
      if (rem.status !== 'active') continue;
      for (const timeStr of (rem.times || [])) {
        // Fetch any dose log for this time today
        const [hours, minutes] = timeStr.split(':').map(Number);
        const schedTime = new Date();
        schedTime.setHours(hours, minutes, 0, 0);

        const windowStart = new Date(schedTime.getTime() - 45 * 60 * 1000);
        const windowEnd = new Date(schedTime.getTime() + 45 * 60 * 1000);

        const log = await MedicineDoseLog.findOne({
          reminderId: rem._id,
          scheduledAt: { $gte: windowStart, $lte: windowEnd },
        }).lean();

        medicinesDue.push({
          reminderId: rem._id,
          medicineName: rem.medicineName,
          dosage: rem.dosage,
          form: rem.form,
          time: timeStr,
          scheduledAt: schedTime,
          status: log ? log.status : 'pending',
          doseLogId: log?._id || null,
        });
      }
    }

    // Vitals tracked due today
    const vitalsDue = [];
    for (const item of (plan.vitalsTracked || [])) {
      const todayLog = await VitalsLog.findOne({
        userId: plan.userId,
        vitalType: item.vitalType,
        recordedAt: { $gte: todayStart, $lte: todayEnd },
      }).sort({ recordedAt: -1 }).lean();

      vitalsDue.push({
        vitalType: item.vitalType,
        targetDescription: item.targetDescription,
        personalizedTarget: item.personalizedTarget,
        loggedToday: !!todayLog,
        latestReading: todayLog || null,
      });
    }

    // Next follow-up calculation
    let daysUntilFollowUp = null;
    if (plan.nextFollowUpDueAt) {
      const diffMs = new Date(plan.nextFollowUpDueAt).getTime() - Date.now();
      daysUntilFollowUp = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return res.json({
      planId: plan._id,
      planName: plan.planName,
      condition: plan.condition,
      medicinesDue,
      vitalsDue,
      followUp: {
        nextFollowUpDueAt: plan.nextFollowUpDueAt,
        daysUntilFollowUp,
        linkedDoctor: plan.linkedDoctorId,
      },
    });
  } catch (err) {
    logger.error('Error fetching today checklist:', err);
    return res.status(500).json({ message: 'Failed to fetch today checklist' });
  }
});

// ── GET /api/care-plans/:id ──────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const plan = await ChronicCarePlan.findById(req.params.id)
      .populate('linkedDoctorId', 'name specialization hospital_name email phone')
      .populate('medicineReminderIds')
      .lean();

    if (!plan) {
      return res.status(404).json({ message: 'Care plan not found' });
    }

    if (!(await canViewPlan(plan, req.user))) {
      return res.status(403).json({ message: 'Not authorized to view this care plan' });
    }

    // Fetch 30-day adherence and logs — sirf responded logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const doseLogs = (await MedicineDoseLog.find({
      carePlanId: plan._id,
      scheduledAt: { $gte: thirtyDaysAgo },
    }).lean()).filter(l => l.respondedAt);

    const totalScheduled = doseLogs.length;
    const takenDoses = doseLogs.filter(l => l.status === 'taken' || l.status === 'snoozed_then_taken').length;
    const adherenceScore = totalScheduled > 0 ? Math.round((takenDoses / totalScheduled) * 100) : null;

    // Fetch recent vitals readings
    const vitalsLogs = await VitalsLog.find({
      userId: plan.userId,
      recordedAt: { $gte: thirtyDaysAgo },
    }).sort({ recordedAt: 1 }).lean();

    // Rule-based correlation insight
    // E.g. find days where missed dose coincided with out-of-range vital reading
    const missedDoseDays = new Set(
      doseLogs
        .filter(l => l.status === 'missed' || l.status === 'snoozed_then_missed')
        .map(l => new Date(l.scheduledAt).toISOString().split('T')[0])
    );

    let missedDoseSpikes = 0;
    vitalsLogs.forEach(v => {
      if (v.flag === 'high' || v.flag === 'fever') {
        const vDay = new Date(v.recordedAt).toISOString().split('T')[0];
        if (missedDoseDays.has(vDay)) {
          missedDoseSpikes += 1;
        }
      }
    });

    let correlationInsight = null;
    if (missedDoseSpikes > 0) {
      correlationInsight = `Observed out-of-range readings on ${missedDoseSpikes} day(s) that coincided with missed medicine doses. Keeping adherence above 90% typically stabilizes readings.`;
    } else if (adherenceScore === null) {
      correlationInsight = `Abhi koi dose record nahi hua hai. Reminders set karein taaki adherence track ho sake.`;
    } else if (adherenceScore >= 90) {
      correlationInsight = `Great consistency! Your 30-day adherence is ${adherenceScore}%, and readings show strong alignment with your targets.`;
    } else {
      correlationInsight = `Adherence is currently ${adherenceScore}%. Consider setting reminder alarms to maintain consistent daily medication schedules.`;
    }

    return res.json({
      carePlan: {
        ...plan,
        adherenceScore,
        doseLogsCount: totalScheduled,
        correlationInsight,
        recentVitals: vitalsLogs.slice(-20),
      },
    });
  } catch (err) {
    logger.error('Error fetching care plan details:', err);
    return res.status(500).json({ message: 'Failed to fetch care plan' });
  }
});

// ── PUT /api/care-plans/:id ──────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const plan = await ChronicCarePlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Care plan not found' });
    }

    const {
      planName,
      condition,
      customCondition,
      linkedDoctorId,
      medicineReminderIds,
      vitalsTracked,
      followUpIntervalDays,
      shareWithDoctor,
      notes,
    } = req.body;

    if (planName) plan.planName = planName.trim();
    if (condition) plan.condition = condition;
    if (customCondition !== undefined) plan.customCondition = customCondition.trim();
    if (linkedDoctorId !== undefined) plan.linkedDoctorId = linkedDoctorId || null;
    if (medicineReminderIds) plan.medicineReminderIds = medicineReminderIds;
    if (vitalsTracked) plan.vitalsTracked = vitalsTracked;
    if (followUpIntervalDays) {
      plan.followUpIntervalDays = followUpIntervalDays;
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + followUpIntervalDays);
      plan.nextFollowUpDueAt = nextDue;
    }
    if (shareWithDoctor !== undefined) plan.shareWithDoctor = shareWithDoctor;
    if (notes !== undefined) plan.notes = notes.trim();

    await plan.save();

    // Sync medicine reminders carePlanId — sirf plan owner ki reminders
    if (medicineReminderIds && medicineReminderIds.length > 0) {
      await MedicineReminder.updateMany(
        { _id: { $in: medicineReminderIds }, userId: plan.userId },
        { $set: { carePlanId: plan._id } }
      );
    }

    return res.json({ message: 'Care Plan updated successfully', carePlan: plan });
  } catch (err) {
    logger.error('Error updating care plan:', err);
    return res.status(500).json({ message: 'Failed to update care plan' });
  }
});

// ── PUT /api/care-plans/:id/status ───────────────────────────────────────────
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const plan = await ChronicCarePlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    );

    if (!plan) return res.status(404).json({ message: 'Care plan not found' });
    return res.json({ message: `Care plan marked as ${status}`, carePlan: plan });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update care plan status' });
  }
});

// ── PUT /api/care-plans/:id/consent ──────────────────────────────────────────
router.put('/:id/consent', protect, async (req, res) => {
  try {
    const { shareWithDoctor } = req.body;
    const plan = await ChronicCarePlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { shareWithDoctor: !!shareWithDoctor },
      { new: true }
    );

    if (!plan) return res.status(404).json({ message: 'Care plan not found' });
    return res.json({
      message: `Doctor sharing ${plan.shareWithDoctor ? 'enabled' : 'disabled'}`,
      shareWithDoctor: plan.shareWithDoctor,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update consent' });
  }
});

export default router;
