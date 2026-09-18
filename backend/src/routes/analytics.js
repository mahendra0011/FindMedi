import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import LabBooking from '../models/LabBooking.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { Types } from 'mongoose';

const router = express.Router();

router.get('/doctor', protect, async (req, res) => {
  try {
    const { doctorId, name } = req.query;
    let query = {};
    
    // Scope by hospital if user has one (hospital doctors)
    if (req.user?.hospitalId) {
      query.hospitalId = req.user.hospitalId.toString();
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
    let patientQuery = {};
    if (req.user?.hospitalId) patientQuery.hospitalId = req.user.hospitalId.toString();
    if (query.doctor) patientQuery.doctor = query.doctor;
    if (query.doctorId) patientQuery.doctorId = query.doctorId;
    const patients = await Patient.find(patientQuery).select('age gender').lean();

    // Fetch Bills for Earnings
    const bills = await Billing.find(query).select('date amount paid type service').lean();

    // Fetch Lab Bookings (tests)
    let labQuery = {};
    if (req.user?.hospitalId) labQuery.hospitalId = req.user.hospitalId.toString();
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
