/**
 * P2-9: one-shot migration — encrypt legacy PLAINTEXT govt IDs + bank details
 * at rest (AES-256-GCM, see src/utils/phiFields.js).
 *
 *   node scripts/migrate-encrypt-phi.mjs --dry-run   # default: report only
 *   node scripts/migrate-encrypt-phi.mjs --apply      # encrypt in place
 *   node scripts/migrate-encrypt-phi.mjs --rollback   # decrypt back to plaintext
 *
 * Safety:
 * - Requires FIELD_ENCRYPTION_KEY(S) in env (dev fallback is per-boot random
 *   and MUST NOT be used for real data — the script refuses without a key
 *   unless --allow-dev-key is passed explicitly for local testing).
 * - Idempotent: already-encrypted values are skipped; blind-index hashes are
 *   (re)computed for every row that has an ID.
 * - --rollback only touches values it can decrypt; anything else is reported
 *   and left alone.
 * - Run a backup + --dry-run first. Verify with:
 *     db.assistantprofiles.countDocuments({ govtIdNumber: { $not: /^v1:/ } })
 */
import mongoose from 'mongoose';
import { isEncrypted, decryptField } from '../src/utils/fieldEncryption.js';
import {
  encryptPhi,
  decryptPhi,
  phiBlindIndex,
  normalizeGovtId,
  phiAad,
} from '../src/utils/phiFields.js';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const ROLLBACK = args.has('--rollback');
const ALLOW_DEV = args.has('--allow-dev-key');

if (!process.env.FIELD_ENCRYPTION_KEY && !process.env.FIELD_ENCRYPTION_KEYS && !ALLOW_DEV) {
  console.error('Refusing: set FIELD_ENCRYPTION_KEY(S) first (or --allow-dev-key for local throwaway data).');
  process.exit(2);
}
if (!process.env.MONGO_URI) {
  console.error('Refusing: MONGO_URI is not set.');
  process.exit(2);
}

const TARGETS = [
  { name: 'AssistantProfile', idField: 'govtIdNumber', bank: true },
  { name: 'RiderProfile', idField: 'govtIdNumber', bank: true },
  { name: 'LawyerProfile', idField: 'govtIdNumber', bank: true },
  { name: 'DeliveryPartner', idField: null, bank: 'dp' }, // accountNo/holderName shape
];

const stats = { scanned: 0, encrypted: 0, hashed: 0, decrypted: 0, skipped: 0, errors: [] };

const maybeEncrypt = (model, field, v) => {
  if (!v) return { value: v, changed: false };
  if (isEncrypted(String(v))) return { value: v, changed: false };
  return { value: encryptPhi(model, field, v), changed: true };
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const t of TARGETS) {
    const { default: Model } = await import(`../src/models/${t.name}.js`);
    const docs = await Model.find({}).lean(false);
    for (const doc of docs) {
      stats.scanned += 1;
      try {
        let dirty = false;
        if (ROLLBACK) {
          // Decrypt anything we can; leave the rest and report.
          for (const path of [t.idField, 'bankDetails.accountNumber', 'bankDetails.ifsc', 'bankDetails.upiId', 'bankDetails.accountNo'].filter(Boolean)) {
            const raw = path === t.idField ? doc[t.idField] : doc.bankDetails?.[path.split('.')[1]];
            if (typeof raw === 'string' && isEncrypted(raw)) {
              try {
                const plain = decryptField(raw, phiAad(t.name, path));
                if (path === t.idField) doc[t.idField] = plain;
                else doc.bankDetails[path.split('.')[1]] = plain;
                dirty = true;
                stats.decrypted += 1;
              } catch (e) {
                stats.errors.push(`${t.name}:${doc._id}:${path}: cannot decrypt (${e.message})`);
              }
            }
          }
        } else {
          if (t.idField && doc[t.idField]) {
            const norm = normalizeGovtId(doc[t.idField]);
            // Re-normalize legacy rows (register uppercases; old rows may not be).
            const r = maybeEncrypt(t.name, t.idField, isEncrypted(String(doc[t.idField])) ? doc[t.idField] : norm);
            if (r.changed || doc[t.idField] !== r.value) { doc[t.idField] = r.value; dirty = true; stats.encrypted += r.changed ? 1 : 0; }
            const h = norm ? phiBlindIndex(norm) : '';
            if (doc.govtIdNumberHash !== h) { doc.govtIdNumberHash = h; dirty = true; stats.hashed += 1; }
          }
          const bd = doc.bankDetails || {};
          const fields = t.bank === 'dp'
            ? [['accountNo', 'bankDetails.accountNo'], ['ifsc', 'bankDetails.ifsc'], ['upiId', 'bankDetails.upiId']]
            : [['accountNumber', 'bankDetails.accountNumber'], ['ifsc', 'bankDetails.ifsc'], ['upiId', 'bankDetails.upiId']];
          for (const [key, path] of fields) {
            if (bd[key]) {
              const r = maybeEncrypt(t.name, path, bd[key]);
              if (r.changed) { bd[key] = r.value; dirty = true; stats.encrypted += 1; }
            }
          }
          if (dirty && t.bank) doc.bankDetails = bd;
        }
        if (dirty) {
          if (APPLY || ROLLBACK) await doc.save();
          else stats.skipped += 1;
        }
      } catch (e) {
        stats.errors.push(`${t.name}:${doc._id}: ${e.message}`);
      }
    }
  }
  await mongoose.disconnect();
  console.log(JSON.stringify({ mode: ROLLBACK ? 'rollback' : APPLY ? 'apply' : 'dry-run', ...stats, errorCount: stats.errors.length }, null, 2));
  if (stats.errors.length) console.log('ERRORS:', stats.errors.slice(0, 20));
}

run().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
