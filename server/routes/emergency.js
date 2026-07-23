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

const router = express.Router();

const createNotification = async (userId, title, message, type = 'system') => {

  try {
    await Notification.create({ 
      title, 
      message, 
      type, 
      read: false, 
      userId: userId.toString(), 
      date: new Date().toISOString().split('T')[0] 
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
    
    if (req.user.role === 'doctor') {
      filter.$or = [
        { assignedDoctor: req.user._id },
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
    
    // Notify all admins about new emergency
    const admins = await User.find({ role: 'admin' });
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
    if (status === 'Assigned' && !emergency.assignedDoctor && req.user.role === 'doctor') {
      emergency.assignedDoctor = req.user._id;
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
    const count = await Admission.countDocuments();
    const admissionId = `IPD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Find appropriate bed based on severity
    let bed = await Bed.findOne({
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
    if (toBed.status !== 'Available') return res.status(400).json({ message: 'Target bed not available' });

    // Move patient from one bed to another
    toBed.status = 'Occupied';
    toBed.currentPatientId = fromBed.currentPatientId;
    toBed.currentPatientName = fromBed.currentPatientName;
    toBed.admissionId = fromBed.admissionId;
    toBed.occupiedSince = new Date();
    await toBed.save();

    // Free the source bed
    fromBed.status = 'Under Cleaning';
    fromBed.currentPatientId = null;
    fromBed.currentPatientName = null;
    fromBed.admissionId = null;
    fromBed.occupiedSince = null;
    await fromBed.save();

    // Update admission record
    if (fromBed.admissionId) {
      const admission = await Admission.findById(fromBed.admissionId);
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
// 23
