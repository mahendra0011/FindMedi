import crypto from 'crypto';

/**
 * Spec 3.1: versioned legal documents rendered by the app + accepted through
 * the PolicyAcceptance ledger. The hash is computed from the canonical content
 * (JSON shape below) and stored with every acceptance, so "what did they
 * accept?" is provable even after a new version ships.
 */
const DOCUMENTS = [
  {
    context: 'community_guidelines',
    templateId: 'community_guidelines',
    version: '2026-10-01',
    title: 'Community Guidelines',
    titleHi: 'सामुदायिक दिशानिर्देश',
    updatedAt: '2026-10-01',
    summary: 'How patients, providers and partners behave on Findmedi.',
    sections: [
      {
        heading: 'Respect and safety',
        body: 'Treat every patient, provider and delivery partner with dignity. Harassment, hate speech, threats and discrimination on the basis of caste, religion, gender, disability or sexual orientation are not allowed and will lead to account action.',
      },
      {
        heading: 'Accurate health information',
        body: 'Share only information you know to be true. Do not impersonate a doctor, forge prescriptions, or post misleading medical claims. Emergency symptoms must be directed to emergency services, not to community threads.',
      },
      {
        heading: 'Privacy of others',
        body: 'Do not post another person\u2019s reports, prescriptions, contact details or images without their consent. Screenshots that identify a patient are removed on request.',
      },
      {
        heading: 'Reviews and ratings',
        body: 'Reviews must describe your own experience. Incentivised, abusive or competitor-driven reviews are removed. Providers may reply once per review; personal data in replies is redacted.',
      },
      {
        heading: 'Reporting and enforcement',
        body: 'Use the in-app report action for content that breaks these rules. We review reports within 72 hours. Outcomes range from a warning to permanent suspension, and serious safety issues are reported to the appropriate authority.',
      },
    ],
  },
  {
    context: 'provider_agreement',
    templateId: 'provider_agreement',
    version: '2026-10-01',
    title: 'Provider Agreement',
    titleHi: 'प्रदाता अनुबंध',
    updatedAt: '2026-10-01',
    summary: 'Terms that apply to doctors, hospitals, labs, pharmacies and partners.',
    sections: [
      {
        heading: 'Registration and credentials',
        body: 'You must hold a valid registration with the relevant council or authority and keep it current. Findmedi may verify credentials, suspend listings with expired registrations, and request re-verification at any time.',
      },
      {
        heading: 'Clinical responsibility',
        body: 'Clinical decisions remain yours. You are responsible for the advice, prescriptions and procedures you provide, for maintaining records as required by law, and for obtaining informed consent before treatment.',
      },
      {
        heading: 'Teleconsultation standards',
        body: 'Follow the Telemedicine Practice Guidelines: identify yourself, confirm the patient, keep a record of the encounter, and do not prescribe prohibited categories remotely. Emergency cases must be referred immediately.',
      },
      {
        heading: 'Listing accuracy and pricing',
        body: 'Services, timings, fees and facility details must be accurate and updated promptly. Displayed prices must match what the patient is charged; undisclosed charges are refunded and may lead to delisting.',
      },
      {
        heading: 'Data protection',
        body: 'Patient data accessed through Findmedi may be used only to provide the requested care. Do not copy, sell or share it. Report any suspected breach within 24 hours.',
      },
      {
        heading: 'Commission, payouts and refunds',
        body: 'Platform commission, payout timing and refund rules follow the agreed commercial terms and the Cancellation Policy shown in the app. Disputed invoices are reviewed against the recorded policy snapshot for that booking.',
      },
      {
        heading: 'Suspension and termination',
        body: 'We may suspend a listing for patient-safety complaints, credential lapse, fraud or repeated policy breaches. You may terminate at any time after settling pending bookings and patient obligations.',
      },
    ],
  },
];

const canonical = (doc) => JSON.stringify({
  context: doc.context,
  version: doc.version,
  title: doc.title,
  sections: doc.sections,
});

const withHash = (doc) => ({
  ...doc,
  documentHash: crypto.createHash('sha256').update(canonical(doc)).digest('hex'),
});

export const LEGAL_DOCUMENTS = DOCUMENTS.map(withHash);

export const getLegalDocument = (context) => (
  LEGAL_DOCUMENTS.find((d) => d.context === context) || null
);

export const listLegalDocuments = () => LEGAL_DOCUMENTS.map((d) => ({
  context: d.context,
  templateId: d.templateId,
  version: d.version,
  title: d.title,
  titleHi: d.titleHi,
  updatedAt: d.updatedAt,
  summary: d.summary,
  documentHash: d.documentHash,
}));
