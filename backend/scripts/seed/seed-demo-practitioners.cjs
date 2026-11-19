/**
 * Adds practitioner Provider listings for the demo doctors so search /
 * browse surfaces show them. Additive, skip-if-exists (by slug).
 * Usage: node seed-demo-practitioners.cjs
 */
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

const DOCTORS = [
  { name: 'Dr. Sarah Smith', email: 'sarah.smith@findmedi.com', spec: 'Cardiology', rating: 4.8, patients: 3421, city: 'Jabalpur' },
  { name: 'Dr. Rajesh Verma', email: 'rajesh.verma@findmedi.com', spec: 'General Medicine', rating: 4.6, patients: 2890, city: 'Jabalpur' },
  { name: 'Dr. Priya Patel', email: 'priya.patel@findmedi.com', spec: 'Orthopaedics', rating: 4.7, patients: 1500, city: 'Jabalpur' },
  { name: 'Dr. Vikram Singh', email: 'vikram.singh@findmedi.com', spec: 'Pediatrics', rating: 4.9, patients: 2200, city: 'Jabalpur' },
  { name: 'Dr. Anita Desai', email: 'anita.desai@findmedi.com', spec: 'Dermatology', rating: 4.5, patients: 1300, city: 'Jabalpur' },
  { name: 'Dr. Meera Joshi', email: 'meera.joshi@findmedi.com', spec: 'Gynecology', rating: 4.8, patients: 1900, city: 'Jabalpur' },
  { name: 'Dr. Sanjay Gupta', email: 'sanjay.gupta@findmedi.com', spec: 'Neurology', rating: 4.7, patients: 1200, city: 'Jabalpur' },
  { name: 'Dr. Kavita Nair', email: 'kavita.nair@findmedi.com', spec: 'Ophthalmology', rating: 4.6, patients: 1600, city: 'Jabalpur' },
  { name: 'Dr. Deepak Sharma', email: 'deepak.sharma@findmedi.com', spec: 'Psychiatry', rating: 4.8, patients: 950, city: 'Jabalpur' },
  { name: 'Dr. Rohan Deshmukh', email: 'psychiatrist@findmedi.com', spec: 'Psychiatry', rating: 4.9, patients: 1900, city: 'Ahmedabad' },
];

(async () => {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('providers');
  let created = 0;
  for (const d of DOCTORS) {
    const slug = d.name.toLowerCase().replace(/^dr\.\s*/, 'dr-').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const exists = await col.findOne({ slug });
    if (exists) { console.log('skip (exists)', slug); continue; }
    await col.insertOne({
      kind: 'practitioner',
      type: 'doctor',
      group: 'clinical',
      name: d.name,
      slug,
      tagline: `${d.spec} specialist`,
      description: `${d.spec} specialist with extensive clinical experience. Demo listing for preview.`,
      status: 'live',
      tier: 'T2',
      verification: { status: 'verified', level: 2, verifiedAt: new Date(), scope: ['registration'] },
      categoryCodes: ['SPEC.CARDIO'],
      systemOfMedicine: 'Modern Medicine (Allopathy)',
      ownership: 'Independent',
      address: { line1: 'Demo Clinic', area: 'Napier Town', city: d.city, state: 'Madhya Pradesh', pincode: '482001', geo: { type: 'Point', coordinates: [79.9864, 23.1815] } },
      contact: { publicPhone: '+91-755-5555555' },
      timings: { weekly: [{ day: 'mon', open: '09:00', close: '19:00', closed: false }, { day: 'tue', open: '09:00', close: '19:00', closed: false }, { day: 'wed', open: '09:00', close: '19:00', closed: false }, { day: 'thu', open: '09:00', close: '19:00', closed: false }, { day: 'fri', open: '09:00', close: '19:00', closed: false }, { day: 'sat', open: '09:00', close: '14:00', closed: false }, { day: 'sun', open: '', close: '', closed: true }], is247: false },
      media: [],
      amenities: [],
      stats: { ratingAvg: d.rating, ratingCount: d.patients, responseTimeMin: 5, completionRate: 97 },
      plan: 'basic',
      isActive: true,
      claim: { status: 'none', requestedAt: null, decidedAt: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created++;
  }
  console.log('practitioner providers created:', created);
  const total = await col.countDocuments({});
  console.log('total providers now:', total);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
