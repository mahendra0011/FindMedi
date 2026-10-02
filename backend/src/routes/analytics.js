import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import LabBooking from '../models/LabBooking.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { Types } from 'mongoose';

const router = express.Router();

// DLB-23: this endpoint was `protect`-only and scoped with
// `if (req.user?.hospitalId)`. Every account WITHOUT a hospital (patients,
// doctors, riders, lawyers) got platform-wide appointments, patients, bills and
// lab bookings — i.e. the whole clinic's revenue and patient list.
router.get('/doctor', protect, authorize('reports:read'), async (req, res) => {
  try {
    const { doctorId, name } = req.query;
    const query = {};

    // Tenant scope is mandatory: superadmin may omit it, nobody else.
    if (req.user?.role !== 'superadmin') {
      const scope = req.user?.hospitalId || req.user?.facilityId;
      if (!scope) {
        return res.status(403).json({ message: 'Analytics are limited to hospital/facility accounts' });
      }
      query.hospitalId = String(scope);
    }

    // Determine doctor filter
    if (doctorId && doctorId !== 'all') {
      if (Types.ObjectId.isValid(doctorId)) {
        query.doctorId = new Types.ObjectId(doctorId);
      } else {
        query.doctor = { $regex: doctorId, $options: 'i' };
      }
    } else if (name) {
      query.doctor = { $regex: name, $options: 'i' };
    } else if (['Clinic Doctor', 'clinic_doctor', 'Hospital Doctor', 'doctor'].includes(req.user.role)) {
      query.doctor = { $regex: req.user.name, $options: 'i' };
    }

    // Fetch Appointments
    const appointments = await Appointment.find(query).select('date time status type').lean();
    
    // Fetch Patients
    const patientQuery = {};
    if (query.hospitalId) patientQuery.hospitalId = query.hospitalId;
    if (query.doctor) patientQuery.doctor = query.doctor;
    if (query.doctorId) patientQuery.doctorId = query.doctorId;
    const patients = await Patient.find(patientQuery).select('age gender').lean();

    // Fetch Bills for Earnings
    const bills = await Billing.find(query).select('date amount paid type service').lean();

    // Fetch Lab Bookings (tests)
    const labQuery = {};
    if (query.hospitalId) labQuery.hospitalId = query.hospitalId;
    if (req.user?._id) labQuery.createdBy = req.user._id;
    const labBookings = await LabBooking.find(labQuery).select('bookingDate status totalAmount paymentStatus').lean();

    res.json({
      success: true,
      appointments,
      patients,
      bills,
      labBookings,
    });
  } catch (error) {
    logger.error('Error fetching doctor analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

export default router;
