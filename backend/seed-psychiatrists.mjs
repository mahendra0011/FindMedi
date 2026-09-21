import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { configureMongoDns } from './src/config/mongoDns.js';

configureMongoDns();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

import Doctor from './src/models/Doctor.js';

const psychiatrists = [
  {
    name: 'Dr. Rohan Deshmukh',
    email: 'psychiatrist@findmedi.com',
    specialization: 'Psychiatry',
    qualifications: 'MBBS, MD Psychiatry',
    experience: '12 years',
    bio: 'Senior psychiatrist specialising in depression, persistent low mood and mood disorders with combined pharmacotherapy and supportive therapy.',
    department: 'Psychiatry',
    consultation_fees: 1800,
    location: 'Bandra West, Mumbai',
    phone: '+919876543210',
    languages: ['Hindi', 'English', 'Marathi'],
    rating: 4.8,
    reviews_count: 210,
    patients: 3200,
    gender: 'male',
    areas_of_expertise: ['Depression', 'Mood Disorders', 'Dysthymia'],
    profile_photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face&auto=format',
    supportPlanPrices: { oneTime: 1800, shortTerm: 5000, mediumTerm: 9000, longTerm: 16000 },
  },
  {
    name: 'Dr. Ananya Sharma',
    email: 'psychiatrist2@findmedi.com',
    specialization: 'Psychiatry',
    qualifications: 'MBBS, MD Psychiatry',
    experience: '9 years',
    bio: 'Psychiatrist focused on anxiety disorders, panic attacks and phobias using evidence-based medication management and CBT support.',
    department: 'Psychiatry',
    consultation_fees: 1500,
    location: 'Connaught Place, Delhi',
    phone: '+919876543211',
    languages: ['Hindi', 'English'],
    rating: 4.9,
    reviews_count: 186,
    patients: 2400,
    gender: 'female',
    areas_of_expertise: ['Anxiety Disorders', 'Panic Attacks', 'Phobia'],
    profile_photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face&auto=format',
    supportPlanPrices: { oneTime: 1500, shortTerm: 4500, mediumTerm: 8500, longTerm: 14000 },
  },
  {
    name: 'Dr. Vikram Rao',
    email: 'psychiatrist3@findmedi.com',
    specialization: 'Psychiatry',
    qualifications: 'MBBS, MD Psychiatry',
    experience: '15 years',
    bio: 'Consultant psychiatrist for bipolar disorder, mania, schizophrenia and psychosis with long-term stabilisation and family counselling.',
    department: 'Psychiatry',
    consultation_fees: 2000,
    location: 'Koramangala, Bengaluru',
    phone: '+919876543212',
    languages: ['English', 'Kannada', 'Hindi'],
    rating: 4.7,
    reviews_count: 164,
    patients: 4100,
    gender: 'male',
    areas_of_expertise: ['Bipolar Disorder', 'Schizophrenia', 'Psychosis'],
    profile_photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces&auto=format',
    supportPlanPrices: { oneTime: 2000, shortTerm: 6000, mediumTerm: 11000, longTerm: 18000 },
  },
  {
    name: 'Dr. Kavya Menon',
    email: 'psychiatrist4@findmedi.com',
    specialization: 'Psychiatry',
    qualifications: 'MBBS, MD Psychiatry',
    experience: '10 years',
    bio: 'Psychiatrist treating insomnia and sleep disorders along with addiction, substance abuse, alcohol dependence and de-addiction programs.',
    department: 'Psychiatry',
    consultation_fees: 1600,
    location: 'Marine Drive, Kochi',
    phone: '+919876543213',
    languages: ['English', 'Malayalam', 'Hindi'],
    rating: 4.8,
    reviews_count: 142,
    patients: 2600,
    gender: 'female',
    areas_of_expertise: ['Sleep Disorders', 'Insomnia', 'Addiction', 'De-addiction'],
    profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format',
    supportPlanPrices: { oneTime: 1600, shortTerm: 4800, mediumTerm: 8800, longTerm: 14500 },
  },
  {
    name: 'Dr. Aditya Patel',
    email: 'psychiatrist5@findmedi.com',
    specialization: 'Psychiatry',
    qualifications: 'MBBS, MD Psychiatry',
    experience: '8 years',
    bio: 'Child and adolescent psychiatrist helping with ADHD, autism spectrum concerns, OCD and obsessive behaviour in young patients.',
    department: 'Psychiatry',
    consultation_fees: 1400,
    location: 'Satellite, Ahmedabad',
    phone: '+919876543214',
    languages: ['English', 'Gujarati', 'Hindi'],
    rating: 4.7,
    reviews_count: 128,
    patients: 1900,
    gender: 'male',
    areas_of_expertise: ['Child & Adolescent', 'ADHD', 'Autism', 'OCD'],
    profile_photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=faces&auto=format',
    supportPlanPrices: { oneTime: 1400, shortTerm: 4200, mediumTerm: 8000, longTerm: 13000 },
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');
  for (const doc of psychiatrists) {
    await Doctor.updateOne(
      { email: doc.email },
      { $set: { ...doc, available: true, approved: true, doctor_type: 'clinic' } },
      { upsert: true }
    );
    console.log(`- upserted ${doc.name} (${doc.email})`);
  }
  const count = await Doctor.countDocuments({ specialization: 'Psychiatry' });
  console.log(`Psychiatry doctors in DB: ${count}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
