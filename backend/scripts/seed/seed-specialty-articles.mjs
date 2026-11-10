import mongoose from 'mongoose';
import PlatformContent from '../src/models/PlatformContent.js';

const ARTICLES = [
  { code: 'SPEC.CARDIO', title: 'Understanding Heart Health', summary: 'An overview of cardiovascular health and prevention.' },
  { code: 'SPEC.DERM', title: 'Skin Care Basics', summary: 'Daily skin care and when to see a dermatologist.' },
  { code: 'SPEC.ORTHO', title: 'Joint Pain: Causes and Care', summary: 'Common causes of joint pain and management.' },
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('Set MONGODB_URI'); process.exit(1); }
  await mongoose.connect(uri);
  const reviewerId = new mongoose.Types.ObjectId();
  let n = 0;
  for (const a of ARTICLES) {
    const key = `article.${a.code.toLowerCase().replace(/\./g, '-')}`;
    const exists = await PlatformContent.findOne({ key });
    if (exists) { console.log('skip (exists):', key); continue; }
    await PlatformContent.create({
      key,
      title: a.title,
      body: `<p>${a.summary}</p><p>This is a medically reviewed article for ${a.code}.</p>`,
      summary: a.summary,
      contentType: 'article',
      specialtyCodes: [a.code],
      status: 'published',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      version: 1,
    });
    n++;
    console.log('created:', key);
  }
  console.log(`done: ${n} articles created`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
