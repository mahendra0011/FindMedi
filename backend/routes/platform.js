import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Facility from '../models/Facility.js';
import Doctor from '../models/Doctor.js';
import { validate } from '../utils/validate.js';
import { createAndSendOTP } from '../services/otpService.js';
import { sendEmail } from '../services/notificationService.js';

const platformRegisterSchema = z.object({
  type: z.enum(['hospital', 'clinic', 'diagnostic', 'pharmacy']),
  account: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(8),
  }),
  facility: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    license: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    established: z.number().optional(),
    logo: z.string().optional(),
    image: z.string().optional(),
    accreditations: z.array(z.string()).optional(),
    weekSchedule: z.any().optional(),
    insurance: z.array(z.string()).optional(),
    amenities: z.any().optional(),
    socialLinks: z.any().optional(),
    timing: z.string().optional(),
    nablNumber: z.string().optional(),
    aerbNumber: z.string().optional(),
  }).passthrough().optional(),
  services: z.array(z.any()).optional(),
  doctors: z.array(z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    specialization: z.string().optional(),
    experience: z.string().optional(),
    qualifications: z.string().optional(),
    licenseNumber: z.string().optional(),
    consultationFee: z.number().optional(),
    appointmentModes: z.array(z.string()).optional(),
    appointmentFees: z.any().optional(),
  }).passthrough()).optional(),
  specialist: z.any().optional(),
});

const router = express.Router();

router.post('/register', validate(platformRegisterSchema), async (req, res) => {
  try {
    const { type, account, facility, services, doctors, specialist } = req.body;

    const existingUser = await User.findOne({ email: account.email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'An account with this email already exists' });

    const roleMap = {
      hospital: 'hospital_admin',
      clinic: 'clinic_doctor',
      diagnostic: 'lab_owner',
      pharmacy: 'pharmacy_owner',
    };

    const hashedPassword = await bcrypt.hash(account.password, 10);
    const slug = facility.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    let entity;

    if (type === 'hospital') {
      entity = await Hospital.create({
        name: facility.name,
        email: (facility.email || account.email).toLowerCase(),
        phone: facility.phone || account.phone,
        address: facility.address || '',
        city: facility.city || '',
        state: facility.state || '',
        pincode: facility.pincode || '',
        licenseNumber: facility.license || '',
        website: facility.website || '',
        description: facility.description || '',
        specialties: facility.specialties || [],
        establishedYear: facility.established || undefined,
        logo: facility.logo || '',
        image: facility.image || '',
        accreditations: facility.accreditations || [],
        workingHours: facility.weekSchedule || {},
        insuranceAccepted: (facility.insurance || []).map(i => ({ provider: i })),
        amenities: facility.amenities || { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, inHousePharmacy: false, drinkingWater: false, wifi: false, homeVisit: false },
        socialLinks: facility.socialLinks || { facebook: '', instagram: '', youtube: '' },
        appointmentModes: facility.appointmentModes || [],
        appointmentFees: facility.appointmentFees || {},
        emergencySupport: Boolean(facility.emergencySupport || facility.emergency24x7),
        emergency24x7: Boolean(facility.emergencySupport || facility.emergency24x7),
        refundOnMissedOrCancelled: Boolean(facility.refundPolicy ?? facility.refundOnMissedOrCancelled),
        ambulanceService: Boolean(facility.ambulanceSupport ?? facility.ambulanceService),
        slug,
        status: 'pending',
      });

      await User.create({
        name: account.name,
        email: account.email.toLowerCase(),
        password: hashedPassword,
        role: 'hospital_admin',
        phone: account.phone,
        hospitalId: entity._id,
        isVerified: false,
        status: 'inactive',
        approvalStatus: 'pending',
      });
    } else {
      entity = await Facility.create({
        type,
        name: facility.name,
        email: (facility.email || account.email).toLowerCase(),
        phone: facility.phone || account.phone,
        address: facility.address || '',
        city: facility.city || '',
        state: facility.state || '',
        licenseNumber: facility.license || '',
        pincode: facility.pincode || '',
        description: facility.description || '',
        specialties: facility.specialties || [],
        establishedYear: facility.established || undefined,
        logo: facility.logo || '',
        image: facility.image || '',
        accreditations: facility.accreditations || [],
        amenities: facility.amenities || {},
        socialLinks: facility.socialLinks || {},
        timing: facility.weekSchedule || {},
        workingHours: facility.timing || '',
        appointmentModes: facility.appointmentModes || [],
        appointmentFees: facility.appointmentFees || {},
        emergencySupport: Boolean(facility.emergencySupport),
        refundOnMissedOrCancelled: Boolean(facility.refundPolicy ?? facility.refundOnMissedOrCancelled),
        ambulanceService: Boolean(facility.ambulanceSupport ?? facility.ambulanceService),
        slug,
        status: 'pending',
        details: {
          timing: facility.timing || '',
          established: facility.established || '',
          website: facility.website || '',
          services: services || [],
          insurance: facility.insurance || [],
          amenities: facility.amenities || {},
          socialLinks: facility.socialLinks || {},
          appointmentModes: facility.appointmentModes || ['chat', 'video', 'offline'],
          appointmentFees: facility.appointmentFees || { chat: 300, video: 500, offline: 500 },
          emergencySupport: Boolean(facility.emergencySupport),
          refundOnMissedOrCancelled: facility.refundOnMissedOrCancelled !== false,
        },
        nablNumber: facility.nablNumber || '',
        aerbNumber: facility.aerbNumber || '',
        pathologistName: specialist?.pathologistName || '',
        pathologistQualification: specialist?.pathologistQualification || '',
        radiologistName: specialist?.radiologistName || '',
        radiologistQualification: specialist?.radiologistQualification || '',
        cardiologistName: specialist?.cardiologistName || '',
        cardiologistQualification: specialist?.cardiologistQualification || '',
        technicianName: specialist?.technicianName || '',
        technicianRole: specialist?.technicianRole || '',
        technicianQualification: specialist?.technicianQualification || '',
        technicianExperience: specialist?.technicianExperience || '',
      });

      const clinicUser = await User.create({
        name: account.name,
        email: account.email.toLowerCase(),
        password: hashedPassword,
        role: roleMap[type] || 'clinic_doctor',
        phone: account.phone,
        facilityId: entity._id,
        facilityType: type,
        isVerified: false,
        status: 'inactive',
        approvalStatus: 'pending',
      });

      // If Clinic Doctor, also create Doctor profile for discovery & booking
      if (type === 'clinic') {
        const chatFee = facility.appointmentFees?.chat || 300;
        const videoFee = facility.appointmentFees?.video || 500;
        const offlineFee = facility.appointmentFees?.offline || 500;
        const homeVisitFee = facility.appointmentFees?.home_visit || 800;

        await Doctor.create({
          user_id: clinicUser._id,
          name: account.name,
          email: account.email.toLowerCase(),
          phone: account.phone,
          specialization: facility.specialties?.[0] || 'General Medicine',
          experience: facility.established ? `${new Date().getFullYear() - Number(facility.established)} years` : '3 years',
          consultation_fees: offlineFee,
          chat_fee: chatFee,
          video_fee: videoFee,
          offline_fee: offlineFee,
          home_visit_fee: homeVisitFee,
          appointmentModes: facility.appointmentModes || ['chat', 'video', 'offline', 'home_visit'],
          appointmentFees: { chat: chatFee, video: videoFee, offline: offlineFee, home_visit: homeVisitFee },
          emergencySupport: Boolean(facility.emergencySupport),
          refundOnMissedOrCancelled: facility.refundOnMissedOrCancelled !== false,
          emergency_consultation: Boolean(facility.emergencySupport),
          facilityId: entity._id,
          facilityType: 'clinic',
          doctor_type: 'clinic',
          approved: false,
        });
      }
    }

    const user = await User.findOne({ email: account.email.toLowerCase() });

    if (doctors?.length) {
      for (const doc of doctors) {
        if (!doc.name || !doc.specialization) continue;
        const docEmail = doc.email || `${doc.name.toLowerCase().replace(/\s+/g, '.')}@${slug}.findmedi.app`;
        const tempPassword = Math.random().toString(36).slice(-10);
        const docChatFee = doc.appointmentFees?.chat || doc.chatFee || 300;
        const docVideoFee = doc.appointmentFees?.video || doc.videoFee || 500;
        const docOfflineFee = doc.appointmentFees?.offline || doc.offlineFee || doc.consultationFee || 500;
        const docHomeVisitFee = doc.appointmentFees?.home_visit || doc.homeVisitFee || 800;

        const docUser = await User.create({
          name: doc.name,
          email: docEmail.toLowerCase(),
          password: tempPassword,
          role: 'doctor',
          phone: doc.phone || account.phone,
          ...(type === 'hospital' ? { hospitalId: entity._id } : { facilityId: entity._id, facilityType: type }),
          specialization: doc.specialization || '',
          experience: doc.experience || '',
          qualification: doc.qualifications || '',
          licenseNumber: doc.licenseNumber || '',
          consultationFee: docOfflineFee,
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });

        await Doctor.create({
          userId: docUser._id,
          user_id: docUser._id,
          name: doc.name,
          email: docEmail.toLowerCase(),
          phone: doc.phone || account.phone,
          specialization: doc.specialization,
          qualifications: doc.qualifications || '',
          experience: parseInt(doc.experience) || 0,
          licenseNumber: doc.licenseNumber || '',
          consultation_fees: docOfflineFee,
          chat_fee: docChatFee,
          video_fee: docVideoFee,
          offline_fee: docOfflineFee,
          home_visit_fee: docHomeVisitFee,
          appointmentModes: doc.appointmentModes || facility.appointmentModes || ['chat', 'video', 'offline', 'home_visit'],
          appointmentFees: { chat: docChatFee, video: docVideoFee, offline: docOfflineFee, home_visit: docHomeVisitFee },
          emergencySupport: doc.emergencySupport !== undefined ? Boolean(doc.emergencySupport) : Boolean(facility.emergencySupport),
          refundOnMissedOrCancelled: doc.refundOnMissedOrCancelled !== undefined ? Boolean(doc.refundOnMissedOrCancelled) : facility.refundOnMissedOrCancelled !== false,
          ...(type === 'hospital' ? { hospitalId: entity._id } : { facilityId: entity._id, facilityType: type }),
          approved: true,
        });

        sendEmail({
          to: docEmail.toLowerCase(),
          subject: 'Your FindMedi Doctor Account Credentials',
          text: `Hi ${doc.name},\n\nYou have been registered on FindMedi by ${account.name}.\n\nLogin: ${docEmail.toLowerCase()}\nTemporary Password: ${tempPassword}\n\nPlease login and change your password.\n\nRegards,\nFindMedi Team`,
        }).catch(() => {});
      }
    }

    await createAndSendOTP({ userId: user._id, email: user.email, type: 'email' });

    res.status(201).json({
      message: 'Registration submitted. Please verify your email to continue.',
      requiresVerification: true,
      email: account.email,
      [type === 'hospital' ? 'hospitalId' : 'facilityId']: entity._id,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;

