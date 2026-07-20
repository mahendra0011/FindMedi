import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Facility from '../models/Facility.js';
import Doctor from '../models/Doctor.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { type, account, facility, services, doctors } = req.body;

    if (!type || !account?.name || !account?.email || !account?.phone || !account?.password || !facility?.name) {
      return res.status(400).json({ message: 'Missing required fields: type, account (name, email, phone, password), facility.name' });
    }

    const existingUser = await User.findOne({ email: account.email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'An account with this email already exists' });

    const roleMap = {
      hospital: 'admin',
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
        licenseNumber: facility.license || '',
        description: facility.description || '',
        specialties: facility.specialties || [],
        establishedYear: facility.established || undefined,
        logo: facility.logo || '',
        image: facility.image || '',
        accreditations: facility.accreditations || [],
        workingHours: facility.weekSchedule || {},
        insuranceAccepted: (facility.insurance || []).map(i => ({ provider: i })),
        slug,
        status: 'pending',
      });

      await User.create({
        name: account.name,
        email: account.email.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        phone: account.phone,
        hospitalId: entity._id,
        isVerified: true,
        status: 'active',
        approvalStatus: 'not_required',
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
        },
      });

      await User.create({
        name: account.name,
        email: account.email.toLowerCase(),
        password: hashedPassword,
        role: roleMap[type] || 'clinic_doctor',
        phone: account.phone,
        facilityId: entity._id,
        facilityType: type,
        isVerified: true,
        status: 'active',
        approvalStatus: 'not_required',
      });
    }

    if (doctors?.length) {
      const user = await User.findOne({ email: account.email.toLowerCase() });
      for (const doc of doctors) {
        if (!doc.name || !doc.specialization) continue;
        const docEmail = doc.email || `${doc.name.toLowerCase().replace(/\s+/g, '.')}@${slug}.medicore.app`;
        const docPassword = 'doctor@123';
        const docUser = await User.create({
          name: doc.name,
          email: docEmail.toLowerCase(),
          password: docPassword,
          role: 'doctor',
          phone: doc.phone || account.phone,
          ...(type === 'hospital' ? { hospitalId: entity._id } : { facilityId: entity._id, facilityType: type }),
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });
        await Doctor.create({
          userId: docUser._id,
          name: doc.name,
          email: docEmail.toLowerCase(),
          phone: doc.phone || account.phone,
          specialization: doc.specialization,
          qualifications: doc.qualifications || '',
          experience: parseInt(doc.experience) || 0,
          ...(type === 'hospital' ? { hospitalId: entity._id } : { facilityId: entity._id, facilityType: type }),
          approved: true,
        });
      }
    }

    res.status(201).json({
      message: `${type} registration submitted successfully. Awaiting approval.`,
      [type === 'hospital' ? 'hospitalId' : 'facilityId']: entity._id,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
