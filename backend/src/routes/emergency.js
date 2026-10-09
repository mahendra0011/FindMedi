import express from 'express';
import Emergency from '../models/Emergency.js';
import Admission from '../models/Admission.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createEmergencySchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { generateAdmissionId } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';

const router = express.Router();

const createNotification = async (userId, title, message, type = 'system') => {

  try {
    await Notification.create({ 
      title, 
      message, 
      type, 
      read: false, 
      userId: userId.toString(), 
      date: getISTDateString() 
    });

  } catch (err) {
    logger.error('Error creating notification:', err);
  }
};

router.get('/', protect, async (req, res) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    
    if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      filter.$or = [
        { assignedDoctor: req.user.doctorProfileId || req.user._id },
        { status: 'Pending' }
      ];
    } else if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    }
    
    if (status && status !== 'All') filter.status = status;
    if (severity && severity !== 'All') filter.severity = severity;
    
    const emergencies = await Emergency.find(filter).sort({ createdAt: -1 });
    res.json(emergencies);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createEmergencySchema), async (req, res) => {
  try {
    const { patientName, patientId, age, gender, phone, condition, severity } = req.body;
    
    const emergency = await Emergency.create({
      patientName: patientName || 'Unknown',
      patientId,
      age,
      gender,
      phone,
      condition,
      severity: severity || 'Serious',
      status: 'Pending',
      hospitalId: req.user.hospitalId || undefined,
    });

    // File 22 P0-3: ER arrival opens an Encounter (idempotent per emergency).
    try {
      const { ensureEncounter } = await import('../lib/encounter.js');
      const enc = await ensureEncounter({
        hospitalId: req.user.hospitalId, patientId: patientId || null, type: 'ER',
        emergencyId: emergency._id, createdBy: req.user._id ?? req.user.id,
      });
      emergency.encounterId = enc._id;
      await emergency.save();
    } catch (e) {
      logger.warn(`ER encounter auto-create failed: ${e.message}`);
    }
    
    // AUTHZ: this fanned out to EVERY hospital_admin on the platform.
    //
    // `User.find({ role: 'hospital_admin' })` has no tenant predicate, so an
    // emergency raised at hospital A pushed a notification containing
    // `condition` — free-text clinical detail — into the admin inboxes of every
    // unrelated hospital B, C and D. That is a cross-tenant PHI leak, and the
    // clinical text is the payload.
    //
    // Sibling read routes in this file (GET /, GET /stats) already scope on
    // `req.user.hospitalId`; the write path did not, which is the tell.
    //
    // Fail CLOSED, and note that the two obvious shapes are BOTH wrong here:
    //
    //   if (req.user.hospitalId) adminFilter.hospitalId = ...;   // fail-open: a
    //     tenant-less caller skips the scope and fans out cross-tenant anyway.
    //   User.find({ role, hospitalId: req.user.hospitalId })     // ALSO fail-open:
    //     Mongoose strips the undefined key, so the filter degrades to
    //     `{ role }` and returns every admin on the platform.
    //
    // So the tenant-less case is decided explicitly, before the query, and is
    // denied the fan-out outright rather than granted the widest one.
    // check-tenant-guard-regression.mjs flags the first shape.
    const isSuper = req.user.role === 'superadmin';
    let admins = [];
    if (isSuper) {
      admins = await User.find({ role: 'hospital_admin' });
    } else if (req.user.hospitalId) {
      admins = await User.find({ role: 'hospital_admin', hospitalId: req.user.hospitalId });
    } else {
      logger.warn(
        `Emergency ${emergency._id} raised by ${req.user._id} with no hospitalId: ` +
        'admin notification fan-out skipped (fail closed)'
      );
    }

    for (const admin of admins) {
      await createNotification(admin._id, 'New Emergency Case', `${severity || 'Serious'} emergency: ${condition}`, 'system');
    }
    
    res.status(201).json(emergency);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;

    
    let userDoctorId = doctorId;
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);

      if (doctor) {
        if (doctor.user_id) {
          userDoctorId = doctor.user_id;

        } else {
          // Fallback: find User by email and link
          const user = await User.findOne({ email: doctor.email, role: 'doctor' });
          if (user) {
            userDoctorId = user._id.toString();
            await Doctor.findByIdAndUpdate(doctor._id, { user_id: user._id });

          } else {

          }
        }
      }
    }
    
    const existing = await Emergency.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Emergency case not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && existing.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      {
        assignedDoctor: userDoctorId,
        assignedDoctorName: doctorName,
        status: 'Assigned'
      },
      { new: true }
    );
    
    if (userDoctorId) {
      await createNotification(userDoctorId, 'Emergency Case Assigned', `You have been assigned to emergency case: ${emergency.condition}`, 'system');
    }
    
    res.json(emergency);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Emergency case not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && emergency.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    emergency.status = status;
    // RIDE-B-19: the old condition was
    //   status === 'Assigned' && !assignedDoctor && role === 'doctor' || role === 'counsellor' || role === 'psychiatrist'
    // and JS binds && before ||, so a counsellor/psychiatrist self-assigned as
    // the assigned doctor for ANY status (e.g. 'Discharged'). All three
    // conditions now sit inside one role-list check.
    if (
      status === 'Assigned'
      && !emergency.assignedDoctor
      && ['doctor', 'counsellor', 'psychiatrist'].includes(req.user.role)
    ) {
      emergency.assignedDoctor = req.user.doctorProfileId || req.user._id;
      emergency.assignedDoctorName = req.user.name;
    }
    
    if (emergency.assignedDoctor && !emergency.responseTime) {
      emergency.responseTime = Math.round((Date.now() - new Date(emergency.createdAt).getTime()) / 60000);
    }
    
    await emergency.save();
    res.json(emergency);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/notes', protect, adminOnly, async (req, res) => {
  try {
    const { text } = req.body;
    
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Emergency case not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && emergency.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    emergency.notes.push({
      text,
      timestamp: new Date(),
      doctorName: req.user.name
    });
    
    await emergency.save();
    res.json(emergency);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const matchFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') matchFilter.hospitalId = req.user.hospitalId;
    const stats = await Emergency.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const severityStats = await Emergency.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    
    const total = await Emergency.countDocuments(matchFilter);
    const critical = await Emergency.countDocuments({ ...matchFilter, severity: 'Critical', status: { $nin: ['Discharged', 'Transferred'] } });
    
    res.json({
      total,
      critical,
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      bySeverity: severityStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Emergency to IPD Transfer ─────────────────────────────────────────────
router.post('/:id/transfer-to-ipd', protect, adminOnly, async (req, res) => {
  try {
    const { ward, admissionNotes } = req.body;
    
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Emergency case not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && emergency.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (emergency.status === 'Transferred') {
      return res.status(400).json({ message: 'Already transferred' });
    }

    // Generate admission ID
    const admissionId = generateAdmissionId();

    // Find appropriate bed based on severity
    const bed = await Bed.findOne({
      ward: ward || (emergency.severity === 'Critical' ? 'ICU' : 'General'),
      status: 'Available'
    }).sort({ bedNumber: 1 });

    const admission = await Admission.create({
      admissionId,
      patientId: emergency.patientId,
      patientName: emergency.patientName,
      bedId: bed?._id,
      bedNumber: bed?.bedNumber,
      ward: bed?.ward || ward,
      hospitalId: req.user.hospitalId || undefined,
      admittedBy: req.user._id,
      admittingDoctor: emergency.assignedDoctorName || req.user.name,
      primaryDiagnosis: emergency.condition,
      source: 'Emergency',
      admissionNotes: admissionNotes || `Transferred from Emergency. Severity: ${emergency.severity}`,
      status: 'Admitted',
    });

    // Update bed status if assigned
    if (bed) {
      bed.status = 'Occupied';
      bed.currentPatientId = emergency.patientId;
      bed.currentPatientName = emergency.patientName;
      bed.admissionId = admission._id;
      bed.occupiedSince = new Date();
      await bed.save();
    }

    // Update emergency status
    emergency.status = 'Transferred';
    await emergency.save();

    // Notify ward staff
    if (ward) {
      const wardStaff = await User.find({ role: 'nurse', status: 'active' }).select('_id');
      await Notification.insertMany(wardStaff.map(s => ({
        title: 'New IPD Admission',
        message: `${emergency.patientName} transferred from Emergency to ${ward}`,
        type: 'ipd',
        userId: s._id.toString(),
      })));
    }

    res.status(201).json({ admission, emergency });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Bed Transfer (Emergency to Ward) ─────────────────────────────────────────
router.post('/beds/transfer/:id', protect, async (req, res) => {
  try {
    const { fromBedId, toBedId, notes } = req.body;
    
    const fromBed = await Bed.findById(fromBedId);
    const toBed = await Bed.findById(toBedId);
    
    if (!fromBed || !toBed) return res.status(404).json({ message: 'Bed not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && (fromBed.hospitalId?.toString() !== req.user.hospitalId.toString() || toBed.hospitalId?.toString() !== req.user.hospitalId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // RIDE-B-20: fail CLOSED for a tenant-less caller (the old `if (hospitalId && …)`
    // let any account without a hospital move beds between unrelated hospitals).
    if (req.user.role !== 'superadmin') {
      if (!req.user.hospitalId
        || !fromBed.hospitalId || !toBed.hospitalId
        || fromBed.hospitalId.toString() !== req.user.hospitalId.toString()
        || toBed.hospitalId.toString() !== req.user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    if (toBed.status !== 'Available') return res.status(400).json({ message: 'Target bed not available' });

    // RIDE-B-20: capture the admission link BEFORE it is cleared below — the old
    // code set `fromBed.admissionId = null` and then read it, so the Admission
    // record kept pointing at the old bed forever (silent IPD data corruption).
    const admissionId = fromBed.admissionId || null;
    const movedPatientId = fromBed.currentPatientId;
    const movedPatientName = fromBed.currentPatientName;

    // Move patient from one bed to another
    toBed.status = 'Occupied';
    toBed.currentPatientId = movedPatientId;
    toBed.currentPatientName = movedPatientName;
    toBed.admissionId = admissionId;
    toBed.occupiedSince = new Date();
    await toBed.save();

    // Free the source bed
    fromBed.status = 'Under Cleaning';
    fromBed.currentPatientId = null;
    fromBed.currentPatientName = null;
    fromBed.admissionId = null;
    fromBed.occupiedSince = null;
    await fromBed.save();

    // Update admission record (using the captured id, not the cleared field)
    if (admissionId) {
      const admission = await Admission.findById(admissionId);
      if (admission) {
        admission.bedId = toBed._id;
        admission.bedNumber = toBed.bedNumber;
        admission.ward = toBed.ward;
        admission.admissionNotes = `${admission.admissionNotes || ''}\nBed transferred: ${fromBed.bedNumber} → ${toBed.bedNumber}. ${notes || ''}`;
        await admission.save();
      }
    }

    res.json({ fromBed, toBed });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;

