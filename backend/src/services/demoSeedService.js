import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
import Vehicle from '../models/Vehicle.js';
import logger from '../utils/logger.js';

export async function ensureDemoUsers() {
  try {
    // 1. Rider Demo Account
    let riderUser = await User.findOne({ email: 'rider@findmedi.com' });
    if (!riderUser) {
      riderUser = new User({
        name: 'Vikram Singh (Rider)',
        email: 'rider@findmedi.com',
        password: 'password',
        role: 'rider',
        phone: '9876543220',
        address: 'Civil Lines, Jabalpur, MP',
        gender: 'Male',
        isVerified: true,
        status: 'active',
        approvalStatus: 'approved',
      });
      await riderUser.save();
      logger.info('Created demo rider user: rider@findmedi.com');
    }

    let riderVehicle = await Vehicle.findOne({ licensePlate: 'MP 20 CA 1234' });
    if (!riderVehicle) {
      riderVehicle = new Vehicle({
        type: 'car',
        make: 'Maruti Suzuki',
        model: 'Dzire',
        year: 2022,
        color: 'White',
        licensePlate: 'MP 20 CA 1234',
        seatingCapacity: 4,
        isAc: true,
        verificationStatus: 'approved',
        status: 'available',
      });
      await riderVehicle.save();
    }

    let riderProfile = await RiderProfile.findOne({ userId: riderUser._id });
    if (!riderProfile) {
      riderProfile = new RiderProfile({
        userId: riderUser._id,
        role: 'rider',
        vehicleId: riderVehicle._id,
        govtIdType: 'Aadhaar',
        govtIdNumber: '123456789012',
        drivingLicenseNumber: 'MP20-20220012345',
        drivingLicenseExpiry: new Date(2030, 11, 31),
        operatingArea: 'Jabalpur',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        riderStatus: 'approved',
        isOnline: true,
      });
      await riderProfile.save();
    }

    // 2. Assistant Demo Account
    let assistantUser = await User.findOne({ email: 'assistant@findmedi.com' });
    if (!assistantUser) {
      assistantUser = new User({
        name: 'Sunita Sharma (Care Assistant)',
        email: 'assistant@findmedi.com',
        password: 'password',
        role: 'assistant',
        phone: '9876543221',
        address: 'Wright Town, Jabalpur, MP',
        gender: 'Female',
        isVerified: true,
        status: 'active',
        approvalStatus: 'approved',
      });
      await assistantUser.save();
      logger.info('Created demo assistant user: assistant@findmedi.com');
    }

    let assistantProfile = await AssistantProfile.findOne({ userId: assistantUser._id });
    if (!assistantProfile) {
      assistantProfile = new AssistantProfile({
        userId: assistantUser._id,
        govtIdType: 'Aadhaar',
        govtIdNumber: '987654321098',
        experienceYears: 4,
        experienceTypes: ['Bedside Care', 'Discharge Formalities', 'Mobility Support'],
        languages: ['Hindi', 'English'],
        bio: 'Compassionate hospital care assistant with 4+ years assisting patients at FindMedi & City Hospital.',
        serviceCategories: ['paperwork', 'medicine', 'reports', 'errand', 'full_attendant'],
        hospitalsCovered: ['FindMedi Hospital', 'City Hospital'],
        shiftTypes: ['2hr', '4hr', 'full_day'],
        pricePerHour: 150,
        pricePerFullDay: 1000,
        assistantStatus: 'approved',
        isOnline: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      });
      await assistantProfile.save();
    }

    // 3. Lawyer Demo Account
    let lawyerUser = await User.findOne({ email: 'lawyer@findmedi.com' });
    if (!lawyerUser) {
      lawyerUser = new User({
        name: 'Adv. Rajesh Verma (Legal Counsel)',
        email: 'lawyer@findmedi.com',
        password: 'password',
        role: 'lawyer',
        phone: '9876543222',
        address: 'High Court Complex, Jabalpur, MP',
        gender: 'Male',
        isVerified: true,
        status: 'active',
        approvalStatus: 'approved',
      });
      await lawyerUser.save();
      logger.info('Created demo lawyer user: lawyer@findmedi.com');
    }

    let lawyerProfile = await LawyerProfile.findOne({ userId: lawyerUser._id });
    if (!lawyerProfile) {
      lawyerProfile = new LawyerProfile({
        userId: lawyerUser._id,
        barCouncilNumber: 'MP/1042/2018',
        stateBarCouncil: 'Bar Council of Madhya Pradesh',
        yearOfEnrollment: 2018,
        practiceCategories: ['medical_negligence', 'insurance', 'accident_mlc', 'consumer_rights', 'general_consultation'],
        yearsOfPractice: 6,
        courtsPracticedIn: ['District Court', 'Consumer Forum', 'High Court'],
        jurisdictionCity: 'Jabalpur',
        consultationModes: ['video', 'phone', 'in_person', 'chat'],
        consultationFee: 500,
        followUpFee: 500,
        freeFirstConsultation: true,
        sessionDuration: 30,
        lawyerStatus: 'approved',
        isOnline: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        bio: 'Advocate specializing in hospital medical negligence claims, cashless insurance dispute recovery, and patient consumer forum representations.',
        languages: ['Hindi', 'English'],
      });
      await lawyerProfile.save();
    }
  } catch (err) {
    logger.warn('Error verifying demo accounts: ' + err.message);
  }
}
