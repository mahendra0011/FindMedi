/**
 * DOC-M-03: data dictionary builder.
 *
 * The finding: 100+ mongoose schemas and no generated reference — nobody can
 * answer "which collections hold email addresses?", "what is indexed on
 * appointments?", or "does this model fall under the 7-year audit retention?"
 * without reading every file. This module derives all three from the schemas
 * themselves, so the dictionary cannot drift from the code the way a hand
 * table does: if a field is added, the next regen lists it.
 *
 * Design rules, all load-bearing:
 *
 *   - DETERMINISTIC OUTPUT. No timestamps, files sorted, so
 *     `renderMarkdown(buildDictionary()) === committed docs/data-dictionary.md`
 *     is a testable freshness check (and is tested — see
 *     test/unit/dataDictionary.spec.js).
 *   - PII classification is field-name driven (ordered rules, first match
 *     wins) and deliberately CONSERVATIVE: a false positive just prints a
 *     category, a false negative hides data from a DPDP audit. Rules are
 *     anchored patterns, not bare substrings — `company` must not match `pan`.
 *   - Two precision guards keep the noise out:
 *       1. ORGANIZATION/CATALOG MODELS (orgs, inventories, city lists…) are
 *          records about things, not people. Their `name`, `address`,
 *          `location` and webhook `secret` are not personal data, so no field
 *          rules run for them — they classify as operational config.
 *       2. LABEL CONTEXTS (`attachments.name`, `steps.name`,
 *          `certifications.name`…) are file/step labels, not person names, and
 *          are excluded before the name rules run.
 *   - Retention comes from docs/privacy/RETENTION.md's data classes. A model
 *     with PII that maps to NO class is reported as unmapped instead of being
 *     guessed at: an invented retention period is worse than a visible gap.
 *   - A model with no detected PII is classified as operational config and
 *     skips retention entirely (drug catalogs and city lists do not have a
 *     statutory retention clock).
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Ordered: first match wins, so specific patterns precede broad ones. */
export const PII_RULES = [
  // Credential — secrets and authenticators (never render these in logs either).
  [/(^|[^a-z])(password|passwordhash|pin|secret|apikey|clientsecret|otp|otphash|otpcode|totpsecret|fcmtoken|accesstoken|refreshtoken|sessionid|qrcodepayload)([^a-z]|$)/, 'Credential'],
  // Government identifiers — India-specific ID numbers.
  [/(^|[^a-z])(aadhaar|abha|abhanumber|passport|voterid|drivinglicence|drivinglicense|pan|pannumber|pancard)([^a-z]|$)/, 'Government ID'],
  // Contact details.
  [/(^|[^a-z])(email|emailaddress|phone|phonenumber|mobile|mobilenumber|alternatenumber|alternatophone|emergencyphone|address|street|pincode|postalcode|contactnumber)([^a-z]|$)/, 'Contact'],
  // Financial instrument data.
  [/(^|[^a-z])(cardnumber|cvv|upi|upiid|bankaccount|accountnumber|ifsc|ifsccode|gstin|razorpaypaymentid|paymentid|settlementaccount|walletaddress|salary)([^a-z]|$)/, 'Financial'],
  // Health / clinical content — the PHI itself.
  [/(^|[^a-z])(diagnosis|diagnoses|symptom|symptoms|allergy|allergies|medication|medications|prescription|medicalhistory|condition|conditions|treatment|therapynotes|doctornotes|clinicalnotes|labresult|labvalue|resultvalue|icdcode|icd10|chiefcomplaint|bloodpressure|heartrate|spo2|bloodsugar|hba1c|phq9|gad7|bmi|vitals|immunization|immunisation|dosehistory|mentalhealthstatus|psychiatricnotes)([^a-z]|$)/, 'Health'],
  // Demographics.
  [/(^|[^a-z])(gender|dob|dateofbirth|age|bloodgroup|maritalstatus|nationality|religion|ethnicity|occupation)([^a-z]|$)/, 'Demographic'],
  // Location traces and coordinates.
  [/(^|[^a-z])(location|currentlocation|coordinates|latitude|longitude|lat|lng|gps|geohash|pickuplocation|droplocation|pickupaddress|dropaddress|routepolyline|placeid)([^a-z]|$)/, 'Location'],
  // Images and biometric-adjacent artifacts.
  [/(^|[^a-z])(avatar|photo|photourl|imageurl|profilepic|signatureurl|fingerprint|faceid|iris)([^a-z]|$)/, 'Image/Biometric'],
  // Network and device identifiers.
  [/(^|[^a-z])(ip|ipaddress|useragent|deviceid|deviceinfo|platform)([^a-z]|$)/, 'Device/Network'],
  // Person reference keys — pseudonymous, but they ARE the link to a person.
  [/(^|[^a-z])(patientid|userid|ownerid|providerid|createdby|createdbyid|assignedto|assignedtoid|authorid|senderid|receiverid|memberid|applicantid|riderid|assistantid|lawyerid|doctorid|guardianid|reporterid)([^a-z]|$)/, 'Identifier'],
  // Person names. Anchored on the whole path or a person-prefix/suffix so
  // `fileName`/`modelName`/`cityName` do not become "PII".
  [/(^|[^a-z])(name|fullname|firstname|lastname|middlename|patientname|doctorname|username|ownername|guardianname|mothername|fathername|hospitalname|facilityname|displayname|legalname)([^a-z]|$)/, 'Identity'],
];

export const PII_CATEGORIES = [
  'Credential', 'Government ID', 'Contact', 'Financial', 'Health',
  'Demographic', 'Location', 'Image/Biometric', 'Device/Network',
  'Identifier', 'Identity',
];

/**
 * Records about organizations, catalogs, and things — a drug name, a city
 * list, a facility's reception phone, a webhook secret are NOT personal data.
 * Field rules are suppressed wholesale for these models (so a facility row
 * does not claim its address is a patient's address), and they classify as
 * operational config with no retention clock.
 */
export const ORG_MODEL_RE = /^(Announcement|Category|City|ClinicProfile|Department|Equipment|Facility|FeaturedListing|HealthPackage|Hospital|Housekeeping|IntegrationConfig|Inventory|License|Medicine|PlatformCoupon|PlatformContent|PurchaseOrder|ServiceCity|Supplier|SystemSetting|Test|Vehicle|ServicePrice|DiscountPolicy|RoomTariff|CashCounter|ResourceScope|Store|Indent|GRN|StockLedger|InstrumentSet|PrintTemplate|Queue|FormTemplate)$/;

export const isOrgModel = (modelName) => ORG_MODEL_RE.test(String(modelName || ''));

/**
 * Path prefixes whose trailing `name` is a label, not a person: attachment
 * file names, deletion-certificate step names, certification names, webhook
 * names. Matched against the path EXCLUDING the final segment so
 * `emergencyContact.name` still classifies as Identity.
 */
export const NAME_CONTEXT_DENY = /(^|\.)(attachments|files|steps|certifications|webhooks|skipped|template|labels|options|wallpapers)\./;

/** Per-model field suppression for paths the shared rules get wrong. */
const MODEL_FIELD_SUPPRESS = {
  PreferredPharmacy: [/^name$/], // pharmacy's name, not the patient's
  // Plan/Product are catalogue rows: `name` is the offering's title and
  // `providerid`/vendor links point at the seller org, the same precision
  // Service already gets below.
  Plan: [/^name$/, /^providerid$/],
  Product: [/^name$/],
  Service: [
    /^name$/, // a service's title ("Cardiology consult"), not a person
    /^packages\.name$/, // the title of a bundled package ("Full body checkup"), not a person
    /^providerid$/, // foreign key to the PROVIDER organisation, not an identifier of a person
    /^eligibility\.gender$/, // an eligibility filter on the offering, not anyone's gender
  ],
};

/** Classify one schema path. `modelName` enables org/label precision guards. */
export function classifyField(fieldPath, modelName = '') {
  const p = String(fieldPath).toLowerCase();
  if (isOrgModel(modelName)) return null;
  if (NAME_CONTEXT_DENY.test(`${p}.`)) return null;
  const suppress = MODEL_FIELD_SUPPRESS[modelName];
  if (suppress && suppress.some((re) => re.test(p))) return null;
  for (const [re, cat] of PII_RULES) {
    if (re.test(p)) return cat;
  }
  return null;
}

/**
 * Retention rules keyed by MODEL name, mirroring the data classes in
 * docs/privacy/RETENTION.md. Ordered: mental health before clinical, audit
 * before everything else it could swallow.
 */
export const RETENTION_RULES = [
  [/^MentalHealth$/, 'Mental-health records', 'Clinical statutory period, plus the consent validity period'],
  [/^Consent/, 'ABDM consent records', 'Consent validity, then 1 year'],
  // A handled DPDP request (access/correct/export) is the EVIDENCE the right
  // was honoured — same reason DeletionRequest sits here: the proof must
  // outlive the data it describes.
  [/^(AuditLog|LoginEvent|NotificationAudit|DeletionRequest|DataSubjectRequest)$/, 'Audit logs', '7 years (longer than the data they describe)'],
    [/^(TransactionLedger|Payment|DemoPayment|Refund|Payout|CommissionConfig|Billing|LoyaltyLedger|LoyaltyEarnRule|RewardCatalogItem|RewardRedemption|WalletGuard|Dispute|Insurance|PlatformCouponRedemption|PlatformCouponUserUsage|IpdDeposit|CreditNote|Expense|LedgerEntry)$/, 'Payment and ledger entries', '8 years (statutory accounting)'],
  [/^(Notification|NotificationDelivery)$/, 'Notifications', '90 days'],
  [/^(OTP|RefreshToken|AmbulanceSetupCode|Token)$/, 'OTP / setup codes / tokens', '15–60 minutes (TTL index) — tokens until logout or expiry'],
  [/^(RideBooking|RideTracking|Emergency|EmergencyRequest|EmergencyDoctorRequest|Ambulance)$/, 'Ride and SOS location traces', 'Trip duration + 30 days (dispute window)'],
  // Provider profiles: the KYC class is the only provider-relationship class
  // in RETENTION.md — it covers the person behind the profile, so the profile
  // PII rides the same "life of relationship + 1 year" clock. The join
  // application and its KYC documents are that same record from BEFORE the
  // relationship existed (2.md 12 keeps rejected applications so a re-apply
  // can reuse them), so they are held on the identical clock.
  [/^(ProviderApplication|ProviderDocument|Doctor|Staff|AssistantProfile|LawyerProfile|RiderProfile|DeliveryPartner|PharmacyStaff|Provider|PractitionerProfile)$/, 'Provider KYC documents', 'Life of the provider relationship + 1 year (provider deletion flow)'],
  // Clinical: dispensing (Pharmacy*), blood bank, physio and OT episodes are
  // health records about a patient, even though RETENTION.md's examples are
  // appointments/prescriptions/labs.
  [/^(Patient|PatientAddress|Appointment|Prescription|Record|RecordVersion|Report|LabOrder|LabBooking|Admission|VitalsLog|VitalsReminder|Triage|NursingChart|Radiology|DietOrder|ChronicCarePlan|MedicineDoseLog|MedicineReminder|Referral|FamilyMember|Physiotherapy|OperationTheatre|BloodRequest|BloodUnit|PharmacyOrder|PharmacyReturn|PharmacyDelivery|AssistantBooking|VaccinationSchedule|Encounter|ChargeItem|BedTransfer|DischargeWorkflow|WardRound|AdrReport|Incident|MlcCase|DeathRecord|PreAuthRequest|Claim|Order|ShiftHandover|AntenatalRecord|LabourRecord|IcuFlowsheet|ChemoProtocol|ChemoCycle|FormResponse|QueueTicket|PatientMovement|SignatureEvent|GrowthChart|VaccinationAlert|Partogram|NewbornScreening|ClinicBranch|ClinicPackage)$/, 'Clinical records', 'Statutory period for the jurisdiction, minimum 3 years'],
];

export const OPERATIONAL_ORG_CLASS = {
  dataClass: 'Operational config (organization/catalog record — not personal data)',
  retention: 'n/a — no personal data in this collection',
  ref: null,
};

export const OPERATIONAL_EMPTY_CLASS = {
  dataClass: 'No PII fields detected',
  retention: 'n/a — no personal data detected in this collection',
  ref: null,
};

/** @deprecated alias kept for consumers of the original export name. */
export const OPERATIONAL_CLASS = OPERATIONAL_EMPTY_CLASS;

export function retentionFor(modelName, piiFieldCount, orgRecord = false) {
  if (orgRecord) return { ...OPERATIONAL_ORG_CLASS };
  if (piiFieldCount === 0) return { ...OPERATIONAL_EMPTY_CLASS };
  for (const [re, dataClass, retention] of RETENTION_RULES) {
    if (re.test(modelName)) return { dataClass, retention, ref: 'docs/privacy/RETENTION.md' };
  }
  return null; // PII but no retention class — reported, never guessed
}

const typeOf = (p) => {
  if (p.instance === 'Array') {
    if (p.schema) return 'Array<subdocument>';
    const el = p.caster && (p.caster.instance || p.caster.constructor?.name);
    return `Array<${el || 'Mixed'}>`;
  }
  if (p.instance === 'Embedded' && p.schema) return 'Subdocument';
  return p.instance || 'Mixed';
};

const renderDefault = (v) => {
  if (v === undefined) return '';
  if (typeof v === 'function') return '[function]';
  if (v instanceof RegExp) return String(v);
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
};

const cell = (s, max = 300) => {
  const v = String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  return v.length > max ? `${v.slice(0, max)}… (${v.length} chars)` : v;
};

/**
 * Duck-typed model check. Files export `mongoose.model(...)` as default OR as
 * named exports (BloodBank.js exports BloodUnit and BloodRequest and no
 * default), so every export value is inspected, not just `default`.
 */
const isModel = (m) => Boolean(m && m.modelName && m.schema && m.schema.paths);

/**
 * Import every model file and collect its mongoose models.
 *
 * @param {string} modelsDir absolute path to src/models
 * @returns {Promise<{models: Array<{file:string, model:any}>, skipped: Array<{file:string, reason:string}>}>}
 */
export async function loadModels(modelsDir) {
  const files = readdirSync(modelsDir).filter((f) => f.endsWith('.js')).sort();
  const models = [];
  const skipped = [];
  const seen = new Set();

  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(path.join(modelsDir, file)).href);
      const found = Object.values(mod).filter(isModel);
      if (found.length === 0) {
        skipped.push({ file, reason: 'no mongoose model export' });
        continue;
      }
      for (const model of found) {
        if (seen.has(model.modelName)) {
          skipped.push({ file, reason: `duplicate model name ${model.modelName}` });
          continue;
        }
        seen.add(model.modelName);
        models.push({ file, model });
      }
    } catch (err) {
      skipped.push({ file, reason: `import failed: ${err.message}` });
    }
  }
  return { models, skipped };
}

/**
 * Flatten a schema into rows: top-level paths plus, for subdocument-bearing
 * paths (arrays like `prescription.medicines[]`), their nested fields prefixed
 * with the parent path — that is where the actual clinical content lives.
 */
function flattenPaths(schema, modelName, prefix = '', depth = 0, rows = []) {
  for (const [name, p] of Object.entries(schema.paths)) {
    if (name === '_id') continue;
    const full = prefix ? `${prefix}.${name}` : name;
    const options = p.options || {};
    const enumValues = p.enumValues && p.enumValues.length ? p.enumValues : null;
    rows.push({
      path: full,
      type: typeOf(p),
      required: options.required === true || Array.isArray(options.required) ? 'yes' : '',
      default: renderDefault(options.default),
      enum: enumValues ? cell(enumValues.map(String).join(', '), 280) : '',
      unique: options.unique ? 'yes' : '',
      ref: options.ref || '',
      pii: classifyField(full, modelName),
    });
    if (p.schema && depth < 2) flattenPaths(p.schema, modelName, full, depth + 1, rows);
  }
  return rows;
}

export function describeModel(model, file) {
  const schema = model.schema;
  const orgRecord = isOrgModel(model.modelName);
  const fields = flattenPaths(schema, model.modelName);
  const piiFields = fields.filter((f) => f.pii);
  const categories = [...new Set(piiFields.map((f) => f.pii))].sort();

  const seenIndexKeys = new Set();
  const indexes = [];
  for (const [keys, options = {}] of schema.indexes()) {
    const parts = Object.entries(keys).map(([k, v]) => `${k}:${v}`);
    const flags = [];
    if (options.unique) flags.push('unique');
    if (options.sparse) flags.push('sparse');
    if (options.expireAfterSeconds !== undefined) flags.push(`TTL ${options.expireAfterSeconds}s`);
    if (options.partialFilterExpression) flags.push('partial');
    // A schema declaring the same index twice (index:true + schema.index())
    // shows up twice — render it once, mongoose's own warning covers the rest.
    const signature = `${parts.join(', ')}|${flags.join(', ')}`;
    if (seenIndexKeys.has(signature)) continue;
    seenIndexKeys.add(signature);
    indexes.push({ keys: parts.join(', '), flags: flags.join(', ') });
  }

  const ttl = indexes.find((i) => i.flags.includes('TTL'));

  return {
    file,
    modelName: model.modelName,
    collection: model.collection.name,
    timestamps: Boolean(schema.options.timestamps),
    fields,
    piiFieldCount: piiFields.length,
    categories,
    indexes,
    ttlSeconds: ttl ? Number((ttl.flags.match(/TTL (\d+)s/) || [])[1] || 0) : null,
    virtualCount: Object.keys(schema.virtuals).filter((k) => k !== 'id').length,
    orgRecord,
    retention: retentionFor(model.modelName, piiFields.length, orgRecord),
  };
}

export async function buildDictionary({ modelsDir }) {
  const { models, skipped } = await loadModels(modelsDir);
  const descriptors = models
    .map(({ file, model }) => describeModel(model, file))
    .sort((a, b) => a.collection.localeCompare(b.collection));

  const unmappedRetention = descriptors.filter((d) => d.retention === null).map((d) => d.collection);

  const categoryCounts = {};
  for (const d of descriptors) {
    for (const c of d.categories) categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  return {
    counts: {
      files: new Set(descriptors.map((d) => d.file)).size + skipped.length,
      models: descriptors.length,
      skipped: skipped.length,
      fields: descriptors.reduce((n, d) => n + d.fields.length, 0),
      piiFields: descriptors.reduce((n, d) => n + d.piiFieldCount, 0),
      collectionsWithPii: descriptors.filter((d) => d.piiFieldCount > 0).length,
      ttlCollections: descriptors.filter((d) => d.ttlSeconds !== null).length,
      unmappedRetention: unmappedRetention.length,
    },
    categoryCounts,
    models: descriptors,
    skipped,
    unmappedRetention,
  };
}

export function renderMarkdown(dict) {
  const out = [];
  const c = dict.counts;

  out.push('# Data Dictionary (generated)');
  out.push('');
  out.push('> **Generated file — do not edit by hand.** Regenerate with');
  out.push('> `npm run docs:dictionary` (from `backend/`). The generator reads the');
  out.push('> mongoose schemas directly, so this table cannot drift from the code —');
  out.push('> `test/unit/dataDictionary.spec.js` fails if it does.');
  out.push('>');
  out.push('> PII classification is field-name driven and conservative (see legend).');
  out.push('> Organization/catalog records (facility lists, drug catalogs…) are not');
  out.push('> personal data and classify as operational config.');
  out.push('> Retention classes come from [`docs/privacy/RETENTION.md`](privacy/RETENTION.md);');
  out.push('> collections with PII but no class are listed as gaps rather than guessed at.');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push(`- **${c.models} models** across ${c.files} files (${c.skipped} skipped)`);
  out.push(`- **${c.fields} schema fields**, of which **${c.piiFields} classified as PII** in **${c.collectionsWithPii} collections**`);
  out.push(`- **${c.ttlCollections} collections** carry a TTL index`);
  out.push(`- **${c.unmappedRetention} collections** hold PII but map to no retention class in RETENTION.md (gaps below)`);
  out.push('');
  out.push('### PII categories');
  out.push('');
  out.push('| Category | Collections containing it |');
  out.push('|---|---|');
  for (const cat of PII_CATEGORIES) {
    out.push(`| ${cat} | ${dict.categoryCounts[cat] || 0} |`);
  }
  out.push('');
  out.push('## Collections');
  out.push('');
  out.push('| Collection | Model | Fields | PII fields | Indexes | TTL | Retention class |');
  out.push('|---|---|---|---|---|---|---|');
  for (const d of dict.models) {
    const retentionClass = d.retention ? cell(d.retention.dataClass, 120) : '**UNMAPPED — see gaps**';
    out.push(
      `| \`${d.collection}\` | ${d.modelName} | ${d.fields.length} | ${d.piiFieldCount} | ${d.indexes.length} | ${d.ttlSeconds !== null ? `${d.ttlSeconds}s` : '—'} | ${retentionClass} |`,
    );
  }
  out.push('');

  if (dict.unmappedRetention.length > 0) {
    out.push('## Retention gaps (PII present, no class in RETENTION.md)');
    out.push('');
    out.push('These collections hold personal data that the retention schedule does not');
    out.push('cover yet — each needs a decision, not a guess:');
    out.push('');
    for (const name of dict.unmappedRetention) out.push(`- \`${name}\``);
    out.push('');
  }

  if (dict.skipped.length > 0) {
    out.push('## Skipped files');
    out.push('');
    out.push('| File | Reason |');
    out.push('|---|---|');
    for (const s of dict.skipped) out.push(`| \`${s.file}\` | ${cell(s.reason, 160)} |`);
    out.push('');
  }

  out.push('## Detail by collection');
  out.push('');
  for (const d of dict.models) {
    out.push(`### \`${d.collection}\` — ${d.modelName}`);
    out.push('');
    const facts = [`source \`${d.file}\``];
    if (d.timestamps) facts.push('timestamps: yes');
    facts.push(`virtuals: ${d.virtualCount}`);
    if (d.retention) {
      facts.push(`retention: ${d.retention.retention}${d.retention.ref ? ` (${d.retention.ref})` : ''}`);
    } else {
      facts.push('retention: **UNMAPPED — holds PII but no class in RETENTION.md**');
    }
    if (d.categories.length) facts.push(`PII: ${d.categories.join(', ')}`);
    out.push(facts.join(' · '));
    out.push('');
    out.push('| Path | Type | Req | Unique | Default | Enum | Ref | PII |');
    out.push('|---|---|---|---|---|---|---|---|');
    for (const f of d.fields) {
      out.push(`| \`${f.path}\` | ${f.type} | ${f.required} | ${f.unique} | ${cell(f.default, 80)} | ${f.enum} | ${f.ref} | ${f.pii || ''} |`);
    }
    out.push('');
    if (d.indexes.length) {
      out.push('Indexes:');
      out.push('');
      out.push('| Keys | Flags |');
      out.push('|---|---|');
      for (const i of d.indexes) out.push(`| \`${i.keys}\` | ${i.flags} |`);
      out.push('');
    } else {
      out.push('_No indexes beyond the default `_id`._');
      out.push('');
    }
  }

  return out.join('\n');
}
