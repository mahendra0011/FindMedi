import User from '../models/User.js';
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

    logger.info('Demo seed finished: 5 Riders, 5 Assistants, 5 Lawyers, 1 Ambulance Driver, and ServiceCities active.');
  } catch (err) {
    logger.warn('Error verifying demo accounts: ' + err.message);
  }
}
