import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import RiderProfile from '../models/RiderProfile.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
import Vehicle from '../models/Vehicle.js';
import ServiceCity from '../models/ServiceCity.js';
import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import logger from '../config/logger.js';

export async function ensureDemoUsers() {
  try {
    // ─── 0. Seed Service Cities ──────────────────────────────────────────────
    const demoCities = [
      { name: 'Jabalpur', state: 'Madhya Pradesh', centerLat: 23.1815, centerLng: 79.9864 },
      { name: 'Indore', state: 'Madhya Pradesh', centerLat: 22.7196, centerLng: 75.8577 },
      { name: 'Bhopal', state: 'Madhya Pradesh', centerLat: 23.2599, centerLng: 77.4126 },
      { name: 'Pune', state: 'Maharashtra', centerLat: 18.5204, centerLng: 73.8567 },
      { name: 'Delhi', state: 'Delhi', centerLat: 28.7041, centerLng: 77.1025 },
      { name: 'Mumbai', state: 'Maharashtra', centerLat: 19.076, centerLng: 72.8777 },
    ];

    for (const c of demoCities) {
      const exists = await ServiceCity.findOne({ name: new RegExp(`^${c.name}$`, 'i') });
      if (!exists) {
        await ServiceCity.create({
          name: c.name,
          state: c.state,
          centerLat: c.centerLat,
          centerLng: c.centerLng,
          isActive: true,
        });
        logger.info(`Seeded ServiceCity: ${c.name}`);
      }
    }

    // ─── 1. Demo Patient Account ─────────────────────────────────────────────
    let patientUser = await User.findOne({ email: 'patient@findmedi.com' });
    if (!patientUser) {
      patientUser = new User({
        name: 'Rahul Sharma',
        email: 'patient@findmedi.com',
        password: 'password',
        role: 'patient',
        phone: '9876543210',
        address: 'Model Town, Jabalpur, MP',
        gender: 'Male',
        isVerified: true,
        status: 'active',
        approvalStatus: 'approved',
      });
      await patientUser.save();
      logger.info('Created demo patient user: patient@findmedi.com');
    }

    // ─── 2. 5 Demo Riders ───────────────────────────────────────────────────
    const demoRiders = [
      {
        email: 'rider@findmedi.com',
        name: 'Vikram Singh',
        phone: '9876543220',
        address: 'Civil Lines, Jabalpur, MP',
        gender: 'Male',
        operatingCity: 'Jabalpur',
        operatingArea: 'Civil Lines & Wright Town',
        lat: 23.1815,
        lng: 79.9864, // Jabalpur center (~0 km)
        govtIdType: 'Aadhaar',
        govtIdNumber: '123456789012',
        drivingLicenseNumber: 'MP20-20220012345',
        vehicle: {
          type: 'car',
          brand: 'Maruti Suzuki',
          model: 'Dzire',
          color: 'White',
          rcNumber: 'MP20CA1234',
          insuranceNumber: 'INS-2022-998877',
          capacity: 4,
        },
      },
      {
        email: 'rider2@findmedi.com',
        name: 'Amit Patel',
        phone: '9876543226',
        address: 'Vijay Nagar, Jabalpur, MP',
        gender: 'Male',
        operatingCity: 'Jabalpur',
        operatingArea: 'Vijay Nagar & Madan Mahal',
        lat: 23.1895,
        lng: 79.9920, // ~1.2 km away
        govtIdType: 'Aadhaar',
        govtIdNumber: '123456789013',
        drivingLicenseNumber: 'MP09-20210045678',
        vehicle: {
          type: 'bike',
          brand: 'Honda',
          model: 'Activa 6G',
          color: 'Grey',
          rcNumber: 'MP09AB5678',
          insuranceNumber: 'INS-2021-445566',
          capacity: 1,
        },
      },
      {
        email: 'rider3@findmedi.com',
        name: 'Ravi Kumar',
        phone: '9876543227',
        address: 'Adhartal, Jabalpur, MP',
        gender: 'Male',
        operatingCity: 'Jabalpur',
        operatingArea: 'Adhartal & Ghamapur',
        lat: 23.1600,
        lng: 79.9650, // ~3.4 km away
        govtIdType: 'PAN',
        govtIdNumber: 'ABCDE1234F',
        drivingLicenseNumber: 'MP04-20200078901',
        vehicle: {
          type: 'car',
          brand: 'Maruti Suzuki',
          model: 'Ertiga',
          color: 'Silver',
          rcNumber: 'MP04XY9012',
          insuranceNumber: 'INS-2020-112233',
          capacity: 6,
        },
      },
      {
        email: 'rider4@findmedi.com',
        name: 'Sanjay Verma',
        phone: '9876543228',
        address: 'Gorakhpur, Jabalpur, MP',
        gender: 'Male',
        operatingCity: 'Jabalpur',
        operatingArea: 'Medical College & Gorakhpur',
        lat: 23.1950,
        lng: 79.9750, // ~2.1 km away (Ambulance)
        govtIdType: 'Aadhaar',
        govtIdNumber: '123456789015',
        drivingLicenseNumber: 'MH12-20190033445',
        vehicle: {
          type: 'ambulance',
          brand: 'Force Motors',
          model: 'Traveller Ambulance',
          color: 'White/Red',
          rcNumber: 'MH12AM1122',
          insuranceNumber: 'INS-2019-778899',
          capacity: 2,
        },
      },
      {
        email: 'rider5@findmedi.com',
        name: 'Deepak Sharma',
        phone: '9876543229',
        address: 'Sihora Highway, Jabalpur Outskirts, MP',
        gender: 'Male',
        operatingCity: 'Jabalpur',
        operatingArea: 'Highway & Outskirts',
        lat: 23.4500,
        lng: 80.2500, // ~35 km away (Out of standard 5km/15km radius)
        govtIdType: 'Aadhaar',
        govtIdNumber: '123456789016',
        drivingLicenseNumber: 'DL01-20220055667',
        vehicle: {
          type: 'car',
          brand: 'Maruti Suzuki',
          model: 'Swift',
          color: 'Blue',
          rcNumber: 'DL1CA3344',
          insuranceNumber: 'INS-2022-334455',
          capacity: 4,
        },
      },
    ];

    for (const r of demoRiders) {
      let u = await User.findOne({ email: r.email });
      if (!u) {
        u = new User({
          name: r.name,
          email: r.email,
          password: 'password',
          role: 'rider',
          phone: r.phone,
          address: r.address,
          gender: r.gender,
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });
        await u.save();
        logger.info(`Created demo rider user: ${r.email}`);
      } else {
        u.name = r.name;
        u.status = 'active';
        u.approvalStatus = 'approved';
        await u.save();
      }

      let v = await Vehicle.findOne({ rcNumber: r.vehicle.rcNumber });
      if (!v) {
        v = new Vehicle({
          riderId: u._id,
          type: r.vehicle.type,
          brand: r.vehicle.brand,
          model: r.vehicle.model,
          color: r.vehicle.color,
          rcNumber: r.vehicle.rcNumber,
          insuranceNumber: r.vehicle.insuranceNumber,
          insuranceExpiry: new Date(2030, 11, 31),
          capacity: r.vehicle.capacity,
          isDocumentVerified: true,
        });
        await v.save();
      }

      const riderLat = r.lat ?? 23.1815;
      const riderLng = r.lng ?? 79.9864;
      const locData = {
        type: 'Point',
        coordinates: [Number(riderLng), Number(riderLat)],
        lat: Number(riderLat),
        lng: Number(riderLng),
        updatedAt: new Date(),
      };

      let p = await RiderProfile.findOne({ userId: u._id });
      if (!p) {
        p = new RiderProfile({
          userId: u._id,
          role: 'rider',
          vehicleId: v._id,
          govtIdType: r.govtIdType,
          govtIdNumber: r.govtIdNumber,
          drivingLicenseNumber: r.drivingLicenseNumber,
          drivingLicenseExpiry: new Date(2030, 11, 31),
          operatingCity: r.operatingCity,
          operatingArea: r.operatingArea,
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          riderStatus: 'active',
          isOnline: true,
          currentLocation: locData,
        });
        await p.save();
      } else {
        p.vehicleId = v._id;
        p.operatingCity = r.operatingCity;
        p.operatingArea = r.operatingArea;
        p.riderStatus = 'active';
        p.isOnline = true;
        p.currentLocation = locData;
        await p.save();
      }
    }

    // ─── 3. 5 Demo Assistants ────────────────────────────────────────────────
    const demoAssistants = [
      {
        email: 'assistant@findmedi.com',
        name: 'Sunita Sharma',
        avatar: 'https://images.unsplash.com/photo-1594824813575-58535a824e4d?w=400&h=400&fit=crop&crop=faces',
        phone: '9876543221',
        address: 'Wright Town, Jabalpur, MP',
        gender: 'Female',
        operatingCity: 'Jabalpur',
        experienceYears: 4,
        languages: ['Hindi', 'English'],
        bio: 'Compassionate care assistant with 4+ years helping patients through discharge, pharmacy queues, and paperwork at Jabalpur hospitals.',
        serviceCategories: ['paperwork', 'medicine', 'reports', 'errand', 'full_attendant'],
        hospitalsCovered: ['FindMedi Super Specialty Hospital', 'City Metro Hospital', 'Jabalpur Medical Center'],
        pricePerHour: 150,
        pricePerFullDay: 1000,
      },
      {
        email: 'assistant2@findmedi.com',
        name: 'Manoj Chouhan',
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces',
        phone: '9876543230',
        address: 'Palasia, Indore, MP',
        gender: 'Male',
        operatingCity: 'Indore',
        experienceYears: 5,
        languages: ['Hindi', 'English'],
        bio: 'Experienced patient attendant specialized in wheelchair mobility, ICU step-down companion care, and elderly assistance.',
        serviceCategories: ['full_attendant', 'elderly_care', 'medicine', 'errand'],
        hospitalsCovered: ['Indore Care Hospital', 'Bombay Hospital Indore', 'CHL Hospital'],
        pricePerHour: 180,
        pricePerFullDay: 1200,
      },
      {
        email: 'assistant3@findmedi.com',
        name: 'Pooja Tiwari',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces',
        phone: '9876543231',
        address: 'Arera Colony, Bhopal, MP',
        gender: 'Female',
        operatingCity: 'Bhopal',
        experienceYears: 3,
        languages: ['Hindi', 'English'],
        bio: 'Hospital documentation and billing liaison assistant helping families speed up cashless TPA processing and diagnostic collection.',
        serviceCategories: ['paperwork', 'reports', 'medicine'],
        hospitalsCovered: ['Bhopal City Hospital', 'Bansal Hospital', 'AIIMS Bhopal Partner Desk'],
        pricePerHour: 140,
        pricePerFullDay: 900,
      },
      {
        email: 'assistant4@findmedi.com',
        name: 'Neha Kulkarni',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
        phone: '9876543232',
        address: 'Shivaji Nagar, Pune, MH',
        gender: 'Female',
        operatingCity: 'Pune',
        experienceYears: 6,
        languages: ['Hindi', 'English', 'Marathi'],
        bio: 'Senior patient care attendant providing overnight hospital stays, post-op mobility support, and medicine management.',
        serviceCategories: ['full_attendant', 'elderly_care', 'reports', 'medicine'],
        hospitalsCovered: ['Ruby Hall Clinic', 'KEM Hospital Pune', 'Sahyadri Super Speciality'],
        pricePerHour: 200,
        pricePerFullDay: 1400,
      },
      {
        email: 'assistant5@findmedi.com',
        name: 'Rajesh Yadav',
        avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=faces',
        phone: '9876543233',
        address: 'Saket, New Delhi',
        gender: 'Male',
        operatingCity: 'Delhi',
        experienceYears: 4,
        languages: ['Hindi', 'English'],
        bio: 'Reliable healthcare companion facilitating admission formalities, emergency errands, and bedside support for outstation families.',
        serviceCategories: ['errand', 'medicine', 'paperwork', 'full_attendant'],
        hospitalsCovered: ['Max Healthcare Saket', 'Apollo Hospital Delhi', 'Fortis Escorts'],
        pricePerHour: 220,
        pricePerFullDay: 1500,
      },
    ];

    for (const a of demoAssistants) {
      let u = await User.findOne({ email: a.email });
      if (!u) {
        u = new User({
          name: a.name,
          email: a.email,
          avatar: a.avatar,
          password: 'password',
          role: 'assistant',
          phone: a.phone,
          address: a.address,
          gender: a.gender,
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });
        await u.save();
        logger.info(`Created demo assistant user: ${a.email}`);
      } else {
        u.name = a.name;
        u.avatar = a.avatar;
        u.status = 'active';
        u.approvalStatus = 'approved';
        await u.save();
      }

      let p = await AssistantProfile.findOne({ userId: u._id });
      if (!p) {
        p = new AssistantProfile({
          userId: u._id,
          govtIdType: 'Aadhaar',
          govtIdNumber: '987654321098',
          operatingCity: a.operatingCity,
          experienceYears: a.experienceYears,
          experienceTypes: ['Bedside Care', 'Discharge Formalities', 'Mobility Support'],
          languages: a.languages,
          bio: a.bio,
          serviceCategories: a.serviceCategories,
          hospitalsCovered: a.hospitalsCovered,
          shiftTypes: ['2hr', '4hr', 'full_day'],
          pricePerHour: a.pricePerHour,
          pricePerFullDay: a.pricePerFullDay,
          assistantStatus: 'active',
          isAvailable: true,
          isDocumentVerified: true,
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        });
        await p.save();
      } else {
        p.operatingCity = a.operatingCity;
        p.serviceCategories = a.serviceCategories;
        p.hospitalsCovered = a.hospitalsCovered;
        p.assistantStatus = 'active';
        p.isAvailable = true;
        p.isDocumentVerified = true;
        p.bio = a.bio;
        p.extraSkills = {
          mobilityAssistance: true,
          wheelchairComfort: true,
          ownVehicleMedicine: true,
          overnightStays: true,
        };
        p.healthCertification = {
          isVaccinated: true,
          vaccines: ['COVID-19 Booster', 'Hepatitis B', 'Annual Flu Shot'],
          isCertifiedFit: true,
        };
        p.onTimeRate = 98;
        p.completionRate = 99;
        p.repeatClientsCount = 14;
        p.trainedEmergencyAdmissions = true;
        p.badgeIdentifier = 'FindMedi Official Blue Lanyard & Attendant ID';
        p.dayInWorkDescription = 'Dedicated bedside hospital attendant. I manage medicine runs, specimen handover at labs, wheelchair assistance for CT/MRI, and patient admission/discharge queues.';
        await p.save();
      }
    }

    // ─── 4. 5 Demo Lawyers ───────────────────────────────────────────────────
    const demoLawyers = [
      {
        email: 'lawyer@findmedi.com',
        name: 'Rajesh Verma',
        phone: '9876543222',
        address: 'High Court Complex, Jabalpur, MP',
        gender: 'Male',
        barCouncilNumber: 'MP/1042/2018',
        stateBarCouncil: 'Bar Council of Madhya Pradesh',
        yearOfEnrollment: 2018,
        practiceCategories: ['medical_negligence', 'insurance', 'accident_mlc', 'consumer_rights', 'general_consultation'],
        yearsOfPractice: 6,
        courtsPracticedIn: ['District Court', 'Consumer Forum', 'High Court'],
        jurisdictionCity: 'Jabalpur',
        operatingCity: 'Jabalpur',
        consultationModes: ['in_person', 'video', 'phone', 'chat'],
        consultationFee: 500,
        followUpFee: 400,
        casesHandled: 145,
        rating: { avg: 4.9, count: 38 },
        bio: 'Advocate specializing in hospital medical negligence claims, cashless insurance dispute recovery, and patient consumer forum representations.',
        languages: ['Hindi', 'English'],
      },
      {
        email: 'priya.malhotra@findmedi.com',
        name: 'Priya Malhotra',
        phone: '9876543223',
        address: 'Shivaji Nagar, Pune, MH',
        gender: 'Female',
        barCouncilNumber: 'MH/1234/2015',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        yearOfEnrollment: 2015,
        practiceCategories: ['medical_negligence', 'insurance', 'consumer_rights'],
        yearsOfPractice: 10,
        courtsPracticedIn: ['District Court', 'Consumer Forum', 'Bombay High Court'],
        jurisdictionCity: 'Pune',
        operatingCity: 'Pune',
        consultationModes: ['in_person', 'video', 'phone', 'chat'],
        consultationFee: 800,
        followUpFee: 500,
        casesHandled: 210,
        rating: { avg: 4.8, count: 54 },
        bio: 'Specializing in medical negligence litigation, health insurance claim rejections, and hospital dispute resolution with 10+ years experience.',
        languages: ['Hindi', 'English', 'Marathi'],
      },
      {
        email: 'rohan.deshmukh@findmedi.com',
        name: 'Rohan Deshmukh',
        phone: '9876543224',
        address: 'Connaught Place, New Delhi',
        gender: 'Male',
        barCouncilNumber: 'DL/5829/2012',
        stateBarCouncil: 'Bar Council of Delhi',
        yearOfEnrollment: 2012,
        practiceCategories: ['accident_mlc', 'criminal_law', 'civil_property'],
        yearsOfPractice: 12,
        courtsPracticedIn: ['Tis Hazari Court', 'Delhi High Court'],
        jurisdictionCity: 'Delhi',
        operatingCity: 'Delhi',
        consultationModes: ['in_person', 'video', 'phone'],
        consultationFee: 1200,
        followUpFee: 800,
        casesHandled: 340,
        rating: { avg: 4.9, count: 72 },
        bio: 'Senior criminal and MLC documentation counsel handling road accidents, hospital police liaison, and medico-legal liability matters.',
        languages: ['Hindi', 'English', 'Punjabi'],
      },
      {
        email: 'ananya.roy@findmedi.com',
        name: 'Ananya Roy',
        phone: '9876543225',
        address: 'Palasia, Indore, MP',
        gender: 'Female',
        barCouncilNumber: 'MP/9140/2019',
        stateBarCouncil: 'Bar Council of Madhya Pradesh',
        yearOfEnrollment: 2019,
        practiceCategories: ['family_law', 'corporate_contract', 'general_consultation'],
        yearsOfPractice: 5,
        courtsPracticedIn: ['District Court Indore', 'Consumer Forum Indore'],
        jurisdictionCity: 'Indore',
        operatingCity: 'Indore',
        consultationModes: ['in_person', 'video', 'chat', 'phone'],
        consultationFee: 600,
        followUpFee: 400,
        casesHandled: 95,
        rating: { avg: 4.7, count: 29 },
        bio: 'Advising patients and healthcare institutions on medical consent, guardianship, personal healthcare disputes, and institutional service contracts.',
        languages: ['Hindi', 'English'],
      },
      {
        email: 'lawyer5@findmedi.com',
        name: 'Vikramaditya Rao',
        phone: '9876543234',
        address: 'Arera Hills, Bhopal, MP',
        gender: 'Male',
        barCouncilNumber: 'MP/4450/2014',
        stateBarCouncil: 'Bar Council of Madhya Pradesh',
        yearOfEnrollment: 2014,
        practiceCategories: ['medical_negligence', 'consumer_rights', 'civil_property'],
        yearsOfPractice: 9,
        courtsPracticedIn: ['District Court Bhopal', 'State Consumer Disputes Redressal Commission'],
        jurisdictionCity: 'Bhopal',
        operatingCity: 'Bhopal',
        consultationModes: ['in_person', 'video', 'phone'],
        consultationFee: 900,
        followUpFee: 600,
        casesHandled: 180,
        rating: { avg: 4.8, count: 42 },
        bio: 'Dedicated counsel for hospital billing grievances, unapproved charges, patient rights, and high-value medical insurance repudiation cases.',
        languages: ['Hindi', 'English'],
      },
    ];

    for (const d of demoLawyers) {
      let u = await User.findOne({ email: d.email });
      if (!u) {
        u = new User({
          name: d.name,
          email: d.email,
          password: 'password',
          role: 'lawyer',
          phone: d.phone,
          address: d.address,
          gender: d.gender,
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });
        await u.save();
        logger.info(`Created demo lawyer user: ${d.email}`);
      } else {
        u.name = d.name;
        u.status = 'active';
        u.approvalStatus = 'approved';
        await u.save();
      }

      let p = await LawyerProfile.findOne({ userId: u._id });
      if (!p) {
        p = new LawyerProfile({
          userId: u._id,
          barCouncilNumber: d.barCouncilNumber,
          stateBarCouncil: d.stateBarCouncil,
          yearOfEnrollment: d.yearOfEnrollment,
          practiceCategories: d.practiceCategories,
          yearsOfPractice: d.yearsOfPractice,
          courtsPracticedIn: d.courtsPracticedIn,
          jurisdictionCity: d.jurisdictionCity,
          operatingCity: d.operatingCity,
          consultationModes: d.consultationModes,
          consultationFee: d.consultationFee,
          followUpFee: d.followUpFee,
          sessionDuration: 30,
          lawyerStatus: 'active',
          isAvailable: true,
          acceptsUrgent: true,
          casesHandled: d.casesHandled,
          rating: d.rating,
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          bio: d.bio,
          languages: d.languages,
          favorableOutcomesRate: 88,
          avgResponseMinutes: 12,
          currentSessionStatus: 'available',
          isPoliceVerified: true,
          notableCases: [
            'Handled 18+ Hospital Negligence Claims',
            'Resolved ₹45L+ Cashless Insurance Rejection Disputes',
            '25+ Medico-Legal MLC Court Appearances',
          ],
          faqs: [
            {
              question: 'Do you visit the hospital in person for urgent consultation?',
              answer: 'Yes, within my operating jurisdiction, I visit hospital ICUs, admission desks, or client wards for in-person advisory.',
            },
            {
              question: 'What documents should I prepare before our session?',
              answer: 'Keep hospital admission records, discharge summary, treatment bills, diagnostic test reports, and any written correspondence with the hospital.',
            },
            {
              question: 'Can you assist with immediate police MLC formalities?',
              answer: 'Yes, I guide patients and families on MLC statements, police reporting in trauma cases, and preserving crucial medical evidence.',
            },
          ],
          awards: ['Distinguished Medico-Legal Advocate (Bar Association)', 'Consumer Rights Defender Award'],
        });
        await p.save();
      } else {
        p.lawyerStatus = 'active';
        p.isAvailable = true;
        p.acceptsUrgent = true;
        p.operatingCity = d.operatingCity;
        p.jurisdictionCity = d.jurisdictionCity;
        p.practiceCategories = d.practiceCategories;
        p.consultationModes = d.consultationModes;
        p.consultationFee = d.consultationFee;
        p.casesHandled = d.casesHandled;
        p.rating = d.rating;
        p.favorableOutcomesRate = 88;
        p.avgResponseMinutes = 12;
        p.currentSessionStatus = 'available';
        p.isPoliceVerified = true;
        p.notableCases = [
          'Handled 18+ Hospital Negligence Claims',
          'Resolved ₹45L+ Cashless Insurance Rejection Disputes',
          '25+ Medico-Legal MLC Court Appearances',
        ];
        p.faqs = [
          {
            question: 'Do you visit the hospital in person for urgent consultation?',
            answer: 'Yes, within my operating jurisdiction, I visit hospital ICUs, admission desks, or client wards for in-person advisory.',
          },
          {
            question: 'What documents should I prepare before our session?',
            answer: 'Keep hospital admission records, discharge summary, treatment bills, diagnostic test reports, and any written correspondence with the hospital.',
          },
          {
            question: 'Can you assist with immediate police MLC formalities?',
            answer: 'Yes, I guide patients and families on MLC statements, police reporting in trauma cases, and preserving crucial medical evidence.',
          },
        ];
        p.awards = ['Distinguished Medico-Legal Advocate (Bar Association)', 'Consumer Rights Defender Award'];
        await p.save();
      }
    }
    // ─── 4. Demo Ambulance Driver (hospital-owned ambulance + login) ─────────
    // Hospital admin ManageAmbulancesPage se driver ko invite karta hai;
    // yahan demo ke liye pehle se active driver seed kar rahe hain.
    let demoHospital = await Hospital.findOne({ slug: 'demo-city-hospital-jabalpur' });
    if (!demoHospital) {
      demoHospital = new Hospital({
        name: 'Demo City Hospital',
        slug: 'demo-city-hospital-jabalpur',
        email: 'demo-hospital@findmedi.com',
        phone: '9876543200',
        address: 'Civil Lines, Jabalpur, MP',
        city: 'Jabalpur',
        state: 'Madhya Pradesh',
        pincode: '482001',
        licenseNumber: 'DEMO-HOSP-001',
        status: 'approved',
        emergencySupport: true,
        emergency24x7: true,
        ambulanceService: true,
        location: { type: 'Point', coordinates: [79.9864, 23.1815] },
      });
      await demoHospital.save();
      logger.info('Created demo hospital: Demo City Hospital');
    }

    let ambulanceUser = await User.findOne({ email: 'ambulance@findmedi.com' });
    if (!ambulanceUser) {
      ambulanceUser = new User({
        name: 'Ramesh Driver',
        email: 'ambulance@findmedi.com',
        password: 'password',
        role: 'ambulance',
        phone: '9876543299',
        hospitalId: demoHospital._id,
        isVerified: true,
        status: 'active',
        approvalStatus: 'approved',
      });
      await ambulanceUser.save();
      logger.info('Created demo ambulance user: ambulance@findmedi.com');
    } else {
      // Pehle kabhi is email pe invite gaya ho to random password set hoga —
      // demo login guarantee ke liye reset karo (dev seed only)
      ambulanceUser.password = 'password';
      ambulanceUser.role = 'ambulance';
      ambulanceUser.isVerified = true;
      ambulanceUser.status = 'active';
      ambulanceUser.approvalStatus = 'approved';
      if (!ambulanceUser.hospitalId) ambulanceUser.hospitalId = demoHospital._id;
      await ambulanceUser.save();
      logger.info('Reset demo ambulance user password: ambulance@findmedi.com');
    }

    const demoAmb = await Ambulance.findOne({ registrationNumber: 'MP20AB1234' });
    if (!demoAmb) {
      await Ambulance.create({
        hospitalId: demoHospital._id,
        registrationNumber: 'MP20AB1234',
        vehicleModel: 'Force Traveller',
        ambulanceType: 'BLS',
        equipmentLevel: 'Oxygen, Stretcher',
        userId: ambulanceUser._id,
        driverName: 'Ramesh Driver',
        driverPhone: '9876543299',
        loginEmail: 'ambulance@findmedi.com',
        loginStatus: 'active',
        emergencySupport: true,
      });
      logger.info('Created demo ambulance: MP20AB1234');
    } else if (!demoAmb.userId) {
      demoAmb.userId = ambulanceUser._id;
      demoAmb.loginStatus = 'active';
      await demoAmb.save();
    }

    // ─── 5. Demo Counsellors (Therapy & Emotional Wellbeing — NO "Dr." prefix) ─
    const demoCounsellors = [
      {
        name: 'Aisha Mehra',
        email: 'aisha.mehra@mindsupport.seed',
        phone: '9876543291',
        gender: 'Female',
        specialization: 'Anxiety and Stress Management',
        qualifications: 'PhD Clinical Psychology, RCI registered',
        education: 'PhD Clinical Psychology, RCI registered',
        counsellorType: 'professional',
        experience: '8 years',
        bio: 'Licensed psychologist helping students manage anxiety, panic, exam stress, and emotional overwhelm with practical coping plans.',
        consultation_fees: 599,
        location: 'Mumbai, Maharashtra',
        languages: ['English', 'Hindi'],
        rating: 4.9,
        reviews_count: 128,
        patients: 1400,
        areas_of_expertise: ['Anxiety', 'Stress', 'Student Pressure'],
        profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 599, shortTerm: 1799, mediumTerm: 2999, longTerm: 4799 },
      },
      {
        name: 'Neha Iyer',
        email: 'neha.iyer@mindsupport.seed',
        phone: '9876543292',
        gender: 'Female',
        specialization: 'Depression and Mood Support',
        qualifications: 'M.Phil Clinical Psychology, licensed therapist',
        education: 'M.Phil Clinical Psychology, licensed therapist',
        counsellorType: 'professional',
        experience: '10 years',
        bio: 'Professional counsellor supporting low mood, loneliness, grief, emotional numbness, and therapy progress tracking.',
        consultation_fees: 549,
        location: 'Chennai, Tamil Nadu',
        languages: ['English', 'Tamil'],
        rating: 4.8,
        reviews_count: 142,
        patients: 1650,
        areas_of_expertise: ['Depression', 'Loneliness', 'General'],
        profile_photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 549, shortTerm: 1649, mediumTerm: 2749, longTerm: 4399 },
      },
      {
        name: 'Priya Nair',
        email: 'priya.nair@mindsupport.seed',
        phone: '9876543293',
        gender: 'Female',
        specialization: 'Trauma Support and Grounding',
        qualifications: 'PsyD Counselling Psychology, trauma-informed care',
        education: 'PsyD Counselling Psychology, trauma-informed care',
        counsellorType: 'professional',
        experience: '12 years',
        bio: 'Trauma-informed therapist helping clients with grounding, safety planning, triggers, PTSD symptoms, and emotional regulation.',
        consultation_fees: 599,
        location: 'Kochi, Kerala',
        languages: ['English', 'Malayalam', 'Hindi'],
        rating: 4.9,
        reviews_count: 166,
        patients: 1800,
        areas_of_expertise: ['Trauma Support', 'PTSD', 'Anxiety'],
        profile_photo: 'https://images.unsplash.com/photo-1587614382344-4ecb093b79b2?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 599, shortTerm: 1799, mediumTerm: 2999, longTerm: 4799 },
      },
      {
        name: 'Rahul Verma',
        email: 'rahul.verma@mindsupport.seed',
        phone: '9876543294',
        gender: 'Male',
        specialization: 'Career Pressure and Confidence',
        qualifications: 'Peer support certification and career mentoring training',
        education: 'Peer support certification and career mentoring training',
        counsellorType: 'mentor',
        experience: '5 years',
        bio: 'Community mentor focused on career stress, self-confidence, interview pressure, and small-step motivation for students.',
        consultation_fees: 299,
        location: 'Pune, Maharashtra',
        languages: ['English', 'Hindi', 'Marathi'],
        rating: 4.7,
        reviews_count: 86,
        patients: 890,
        areas_of_expertise: ['Career Stress', 'Self Confidence', 'Motivation'],
        profile_photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 299, shortTerm: 899, mediumTerm: 1499, longTerm: 2399 },
      },
      {
        name: 'Ananya Verma',
        email: 'counsellor@findmedi.com',
        phone: '9876543298',
        gender: 'Female',
        specialization: 'Mental Wellness & Counselling',
        qualifications: 'M.A. Clinical Psychology, Certified Counsellor',
        education: 'M.A. Clinical Psychology',
        counsellorType: 'professional',
        experience: '6 years',
        bio: 'Compassionate licensed therapist specializing in anxiety, stress relief, academic burnout, and emotional balance.',
        consultation_fees: 599,
        location: 'Civil Lines, Jabalpur, MP',
        languages: ['Hindi', 'English'],
        rating: 4.9,
        reviews_count: 120,
        patients: 1100,
        areas_of_expertise: ['Anxiety', 'Stress', 'Student Pressure', 'Emotional Balance'],
        profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 599, shortTerm: 1499, mediumTerm: 2499, longTerm: 3999 },
      },
    ];

    for (const c of demoCounsellors) {
      let u = await User.findOne({ email: c.email });
      if (!u) {
        u = new User({
          name: c.name,
          email: c.email,
          password: 'password',
          role: 'counsellor',
          phone: c.phone,
          gender: c.gender,
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
          specialization: c.specialization,
          qualification: c.qualifications,
          experience: c.experience,
          bio: c.bio,
          consultationModes: ['google-meet', 'in-person', 'voice-call', 'video-chat', 'chat-only'],
        });
        await u.save();
        logger.info(`Created demo counsellor user: ${c.email}`);
      } else {
        u.name = c.name;
        u.role = 'counsellor';
        u.status = 'active';
        u.approvalStatus = 'approved';
        u.isVerified = true;
        u.specialization = c.specialization;
        u.qualification = c.qualifications;
        u.experience = c.experience;
        u.bio = c.bio;
        u.password = 'password';
        await u.save();
      }

      await Doctor.updateOne(
        { email: c.email },
        {
          $set: {
            name: c.name,
            email: c.email,
            specialization: 'Counselling',
            department: 'Mental Health & Counselling',
            qualifications: c.qualifications,
            experience: c.experience,
            bio: c.bio,
            consultation_fees: c.consultation_fees,
            location: c.location,
            phone: c.phone,
            languages: c.languages,
            rating: c.rating,
            reviews_count: c.reviews_count,
            patients: c.patients,
            gender: c.gender === 'Male' ? 'male' : 'female',
            areas_of_expertise: c.areas_of_expertise,
            profile_photo: c.profile_photo,
            supportPlanPrices: c.supportPlanPrices,
            appointmentFees: {
              video: c.consultation_fees,
              audio: Math.round(c.consultation_fees * 0.8),
              chat: Math.round(c.consultation_fees * 0.6),
              offline: c.consultation_fees,
            },
            appointmentModes: ['video', 'audio', 'chat', 'offline'],
            approved: true,
            available: true,
            doctor_type: 'clinic',
            user_id: u._id,
          },
        },
        { upsert: true }
      );
    }

    // Sync with mind_users collection & strip accidental "Dr." prefixes from counsellors
    try {
      if (mongoose.connection?.db) {
        const mindUsers = mongoose.connection.db.collection('mind_users');
        for (const c of demoCounsellors) {
          await mindUsers.updateOne(
            { email: c.email },
            {
              $set: {
                name: c.name,
                email: c.email,
                role: 'counsellor',
                status: 'approved',
                verificationStatus: 'approved',
                counsellorType: c.counsellorType,
                specialization: c.specialization,
                sessionPricing: c.consultation_fees,
                education: c.education,
                experience: c.experience,
                languages: c.languages,
                bio: c.bio,
                consultationModes: ['google-meet', 'in-person', 'voice-call'],
                rating: c.rating,
                reviews: c.reviews_count,
                location: c.location,
              },
            },
            { upsert: true }
          );
        }

        // Remove "Dr." prefix from any counsellors in mind_users
        const drCounsellors = await mindUsers.find({ role: 'counsellor', name: /^Dr\.?\s+/i }).toArray();
        for (const c of drCounsellors) {
          const cleanName = c.name.replace(/^Dr\.?\s+/i, '').trim();
          await mindUsers.updateOne({ _id: c._id }, { $set: { name: cleanName } });
        }
      }
    } catch (e) {
      logger.warn('mind_users sync note: ' + e.message);
    }

    // ─── 6. 5 Demo Psychiatrists (Medical Doctors — Diagnosis & Medication) ───
    const demoPsychiatrists = [
      {
        name: 'Dr. Rohan Deshmukh',
        email: 'psychiatrist@findmedi.com',
        phone: '9876543210',
        specialization: 'Psychiatry',
        qualifications: 'MBBS, MD Psychiatry',
        experience: '12 years',
        bio: 'Senior psychiatrist specialising in diagnosis, depression, mood disorders, and psychiatric medication management alongside supportive therapy.',
        department: 'Psychiatry',
        consultation_fees: 1800,
        location: 'Civil Lines, Jabalpur, MP',
        languages: ['Hindi', 'English', 'Marathi'],
        rating: 4.8,
        reviews_count: 210,
        patients: 3200,
        gender: 'male',
        areas_of_expertise: ['Depression', 'Mood Disorders', 'Dysthymia', 'Pharmacotherapy'],
        profile_photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 1800, shortTerm: 5000, mediumTerm: 9000, longTerm: 16000 },
      },
      {
        name: 'Dr. Ananya Sharma',
        email: 'psychiatrist2@findmedi.com',
        phone: '9876543211',
        specialization: 'Psychiatry',
        qualifications: 'MBBS, MD Psychiatry',
        experience: '9 years',
        bio: 'Consultant psychiatrist focused on clinical diagnosis, panic disorders, phobias, and medication support for severe anxiety.',
        department: 'Psychiatry',
        consultation_fees: 1500,
        location: 'Palasia, Indore, MP',
        languages: ['Hindi', 'English'],
        rating: 4.9,
        reviews_count: 186,
        patients: 2400,
        gender: 'female',
        areas_of_expertise: ['Anxiety Disorders', 'Panic Attacks', 'Phobia', 'Clinical Evaluation'],
        profile_photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 1500, shortTerm: 4500, mediumTerm: 8500, longTerm: 14000 },
      },
      {
        name: 'Dr. Vikram Rao',
        email: 'psychiatrist3@findmedi.com',
        phone: '9876543212',
        specialization: 'Psychiatry',
        qualifications: 'MBBS, MD Psychiatry',
        experience: '15 years',
        bio: 'Senior consultant psychiatrist for bipolar disorder, mania, schizophrenia, psychosis, and adult neuropsychiatric stabilization.',
        department: 'Psychiatry',
        consultation_fees: 2000,
        location: 'Arera Colony, Bhopal, MP',
        languages: ['Hindi', 'English'],
        rating: 4.7,
        reviews_count: 164,
        patients: 4100,
        gender: 'male',
        areas_of_expertise: ['Bipolar Disorder', 'Schizophrenia', 'Psychosis', 'Neuropsychiatry'],
        profile_photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces&auto=format',
        supportPlanPrices: { oneTime: 2000, shortTerm: 6000, mediumTerm: 11000, longTerm: 18000 },
      },
      {
        name: 'Dr. Kavya Menon',
        email: 'psychiatrist4@findmedi.com',
        phone: '9876543213',
        specialization: 'Psychiatry',
        qualifications: 'MBBS, MD Psychiatry',
        experience: '10 years',
        bio: 'Psychiatrist treating clinical insomnia, sleep-wake schedule disorders, substance dependence, and de-addiction medical therapy.',
        department: 'Psychiatry',
        consultation_fees: 1600,
        location: 'Shivaji Nagar, Pune, MH',
        languages: ['Hindi', 'English', 'Marathi'],
        rating: 4.8,
        reviews_count: 142,
        patients: 2600,
        gender: 'female',
        areas_of_expertise: ['Sleep Disorders', 'Insomnia', 'Addiction Medicine', 'De-addiction'],
        profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format',
        supportPlanPrices: { oneTime: 1600, shortTerm: 4800, mediumTerm: 8800, longTerm: 14500 },
      },
      {
        name: 'Dr. Aditya Patel',
        email: 'psychiatrist5@findmedi.com',
        phone: '9876543214',
        specialization: 'Psychiatry',
        qualifications: 'MBBS, MD Psychiatry',
        experience: '8 years',
        bio: 'Child and adolescent psychiatrist helping with ADHD, autism spectrum support, OCD, and pediatric behavioural medication management.',
        department: 'Psychiatry',
        consultation_fees: 1400,
        location: 'Saket, New Delhi',
        languages: ['Hindi', 'English'],
        rating: 4.7,
        reviews_count: 128,
        patients: 1900,
        gender: 'male',
        areas_of_expertise: ['Child & Adolescent', 'ADHD', 'Autism', 'OCD'],
        profile_photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=faces&auto=format',
        supportPlanPrices: { oneTime: 1400, shortTerm: 4200, mediumTerm: 8000, longTerm: 13000 },
      },
    ];

    for (const d of demoPsychiatrists) {
      let u = await User.findOne({ email: d.email });
      if (!u) {
        u = new User({
          name: d.name,
          email: d.email,
          password: 'password',
          role: 'psychiatrist',
          phone: d.phone,
          specialization: d.specialization,
          qualification: d.qualifications,
          gender: d.gender === 'male' ? 'Male' : 'Female',
          isVerified: true,
          status: 'active',
          approvalStatus: 'approved',
        });
        await u.save();
        logger.info(`Created demo psychiatrist user: ${d.email}`);
      } else {
        u.name = d.name;
        u.role = 'psychiatrist';
        u.status = 'active';
        u.approvalStatus = 'approved';
        u.isVerified = true;
        u.password = 'password';
        await u.save();
      }

      await Doctor.updateOne(
        { email: d.email },
        {
          $set: {
            name: d.name,
            email: d.email,
            specialization: d.specialization,
            qualifications: d.qualifications,
            experience: d.experience,
            bio: d.bio,
            department: d.department,
            consultation_fees: d.consultation_fees,
            location: d.location,
            phone: d.phone,
            languages: d.languages,
            rating: d.rating,
            reviews_count: d.reviews_count,
            patients: d.patients,
            gender: d.gender,
            areas_of_expertise: d.areas_of_expertise,
            profile_photo: d.profile_photo,
            supportPlanPrices: d.supportPlanPrices,
            appointmentFees: {
              video: d.consultation_fees,
              audio: Math.round(d.consultation_fees * 0.8),
              chat: Math.round(d.consultation_fees * 0.6),
              offline: d.consultation_fees,
            },
            appointmentModes: ['video', 'audio', 'chat', 'offline'],
            available: true,
            approved: true,
            doctor_type: 'clinic',
            user_id: u._id,
          },
        },
        { upsert: true }
      );
      logger.info(`Upserted psychiatrist Doctor: ${d.name} (${d.email})`);
    }

    logger.info('Demo seed finished: 5 Riders, 5 Assistants, 5 Lawyers, 1 Ambulance Driver, 1 Counsellor, 5 Psychiatrists, and ServiceCities active.');
  } catch (err) {
    logger.warn('Error verifying demo accounts: ' + err.message);
  }
}
