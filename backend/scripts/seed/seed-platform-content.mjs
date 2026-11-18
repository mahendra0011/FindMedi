/**
 * Seeds the versioned platform-content CMS (PlatformContent) with the 7 legal
 * page bodies extracted from the public React pages + an honest Patient Rights
 * Charter summary. Status is 'published' because these are the same texts the
 * public site ships.
 *
 * Run: node scripts/seed/seed-platform-content.mjs [--dry-run]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import { configureMongoDns, connectMongooseWithRetry } from '../../src/config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DRY = process.argv.includes('--dry-run');

const LEGAL = {
  terms: { title: 'Terms of Service' },
  privacy: { title: 'Privacy Policy' },
  disclaimer: { title: 'Medical Disclaimer & Emergency Notice' },
  refund: { title: 'Refund & Cancellation Policy' },
  grievance: { title: 'Grievance Redressal & DPO Office' },
  telemedicine: { title: 'Telemedicine Consent & Guidelines' },
  cookies: { title: 'Cookie Policy' },
};

const patientRightsBody = `Patient Rights Charter — FindMedi (adopted in line with the National
Charter of Patient Rights, Ministry of Health & Family Welfare, India 2018).

1. Right to information: patients are entitled to complete information about their diagnosis, proposed treatment, risks, benefits, expected outcomes, and alternatives, in a language they understand.
2. Right to consent: no treatment or procedure may proceed without the patient's informed consent (or that of a legally authorized representative), except in life-threatening emergencies covered by the emergency doctrine.
3. Right to dignity & non-discrimination: care must be delivered with respect, without discrimination on the basis of age, gender, religion, caste, place of origin, or ability to pay.
4. Right to privacy & confidentiality: all health information is protected under DPDP Act 2023; access is granted strictly on a need-to-know basis and every access outside the care team is logged and visible to the patient.
5. Right to emergency treatment: no patient shall be denied emergency care regardless of payment capacity or documentation status.
6. Right to a second medical opinion: patients may seek review of their diagnosis or treatment plan from another practitioner, on request.
7. Right to grievance redressal: every grievance is registered, acknowledged, and resolved within statutory timelines; the DPO is reachable at dpo@findmedi.in.
8. Right to access records: patients may obtain their own medical records in portable form and may challenge inaccuracies.
9. Right to discharge summary: every inpatient discharge includes a written summary of diagnosis, treatment received, follow-up advice, and medications.
10. Right to research transparency: participation in any study/treatment trial is voluntary and requires explicit informed consent.`;

const readLegal = (key) => fs.readFileSync(path.join(__dirname, '..', '..', 'mock-data', 'platform-content', `legal-${key}.txt`), 'utf8').trim();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run platform-content seed in production.');
    process.exit(1);
  }
  configureMongoDns();
  try {
    await connectMongooseWithRetry(mongoose, process.env.MONGO_URI);
  } catch (err) {
    console.error('SRV connect failed, falling back to direct shard hosts:', err.message);
    const direct = process.env.MONGO_URI.replace(
      /mongodb\+srv:\/\/([^@]+)@[^\/]+\/(\w+)\?.*/,
      'mongodb://$1@ac-s20wcft-shard-00-00.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-01.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-02.5l9k4vd.mongodb.net:27017/$2?replicaSet=atlas-11ih9f-shard-0&authSource=admin&tls=true'
    );
    await mongoose.connect(direct);
  }
  const { default: PlatformContent } = await import('../../src/models/PlatformContent.js');

  const docs = [];
  for (const [key, meta] of Object.entries(LEGAL)) {
    docs.push({ key, title: meta.title, body: readLegal(key), status: 'published', contentType: 'page' });
  }
  docs.push({ key: 'patient_rights', title: 'Patient Rights Charter', body: patientRightsBody, status: 'published', contentType: 'page' });

  if (DRY) {
    for (const d of docs) console.log(`${d.key}: ${d.title} (${d.body.length} chars)`);
    console.log('dry-run complete');
    await mongoose.disconnect();
    return;
  }

  for (const d of docs) {
    const existing = await PlatformContent.findOne({ key: d.key });
    if (existing) {
      existing.title = d.title;
      existing.body = d.body;
      existing.contentType = d.contentType;
      existing.status = 'published';
      existing.publishedAt = existing.publishedAt || new Date();
      existing.version += 1;
      await existing.save();
      console.log(`updated ${d.key} (v${existing.version}, ${d.body.length} chars)`);
    } else {
      await PlatformContent.create({ ...d, version: 1, publishedAt: new Date() });
      console.log(`created ${d.key} (${d.body.length} chars)`);
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
