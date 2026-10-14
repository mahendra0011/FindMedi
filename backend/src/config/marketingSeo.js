/**
 * Document 21 — Marketing, Brand & SEO Plan Specifications
 * Brand Foundation, Healthcare Marketing Principles, Channel Funnel Strategy,
 * Technical & Local SEO Architecture, Schema.org Generator, Keyword Clusters,
 * Annual Health Calendar, Lifecycle CRM Journeys, and Claims Compliance Checker.
 */

export const BRAND_FOUNDATION = {
  positioning: 'Aapke shehar me bharosemand health aur wellness — doctor se dawai, test se yoga tak — ek hi jagah.',
  promise: 'Trust + Convenience + Transparent Pricing',
  audience: {
    primaryDemand: 'Urban and Tier-2 families (age 25–55), caregivers of elderly parents, young parents, chronic care patients, wellness seekers.',
    supplyPartners: 'Clinics, dentists, diagnostic labs, pharmacies, physiotherapists, AYUSH doctors, yoga studios, gym owners, home-care agencies.',
  },
  pillars: [
    { title: '1. Verified', description: 'Every doctor license, clinic registration, and pharmacy permit is rigorously verified.' },
    { title: '2. Simple', description: 'One-click appointments, seamless digital payments, and instant prescription access.' },
    { title: '3. Local & Vernacular', description: 'Hindi-first experience, native Hinglish search, and neighborhood neighborhood familiarity.' },
    { title: '4. Private & Safe', description: 'Zero PHI ad targeting, DPDP compliance, and discrete health record sharing.' },
    { title: '5. Complete Care', description: 'Full spectrum healthcare for the entire family: doctors, tests, medicines, elder-care, and wellness.' },
  ],
  tone: 'Warm, calm, respectful, plain Hindi and English. Never fear-mongering; strictly zero miracle cure claims.',
  dosAndDonts: {
    do: ['Clarity and simplicity', 'Empathy for anxious patients', 'Factual and transparent pricing', 'Real verified provider credentials'],
    dont: ['Guaranteed cures or miracle claims', 'Health shaming', 'Fear/scare tactics', 'Cheesy stock-photo clichés'],
  },
  vernacularTaxonomyAliases: {
    Doctor: 'चिकित्सक / डॉक्टर',
    Dentist: 'दांतों के डॉक्टर',
    Pharmacy: 'दवा दुकान / मेडिकल स्टोर',
    DiagnosticLab: 'जांच केंद्र / पैथोलॉजी लैब',
    HomeVisit: 'घर पर डॉक्टर / होम विजिट',
    Ayush: 'आयुर्वेद एवं प्राकृतिक चिकित्सा',
  },
};

export const HEALTHCARE_MARKETING_PRINCIPLES = [
  'Trust first: Verification badges, genuine verified reviews, and transparent pricing always take priority over aggressive discounts.',
  'Zero health-data/PHI ad targeting: Strictly no advertising retargeting based on medical diagnoses, prescriptions, or sensitive health queries.',
  'Claims discipline: Full compliance with the Drugs and Magic Remedies (Objectionable Advertisements) Act 1954; zero miracle cure guarantees.',
  'Education over hype: Content written or reviewed by credentialed medical professionals; seasonal preventive awareness.',
  'Respect privacy & DND: Strict opt-in consent for WhatsApp/SMS, TRAI DLT-registered transactional templates, and instant 1-click opt-out.',
  'Local relevance: City and neighborhood specific communications, local community leaders, and camp partnerships.',
  'Measure honestly: Long-term cohort retention, repeat consultations, and patient safety outweigh vanity app download metrics.',
];

export const CHANNEL_STRATEGY = {
  p0_coreZeroCac: [
    {
      channel: 'Local & Content SEO',
      role: 'High-intent organic discovery via city, specialty, and test pricing pages',
      priority: 'P0 - Core Foundation',
      action: 'Programmatic city × category pages with real verified provider inventory',
    },
    {
      channel: 'Google Business Profile & Maps',
      role: 'Hyperlocal discovery for clinics and diagnostic centers',
      priority: 'P0 - Core Foundation',
      action: 'Optimize FindMedi profiles and train onboarded providers to link their listings',
    },
    {
      channel: 'Provider Reception QR Sticker Kits',
      role: 'Zero-CAC patient acquisition at clinic waiting rooms',
      priority: 'P0 - Core Foundation',
      action: 'Deploy "Book Next Visit on FindMedi" branded QR acrylic stands and stickers',
    },
    {
      channel: 'Community Screening Camps & Events',
      role: 'High-trust on-ground patient acquisition',
      priority: 'P0 - Core Foundation',
      action: 'Execute free cardiac/diabetes screening camps in partnership with local RWAs and NGOs',
    },
    {
      channel: 'Institutional Partnerships',
      role: 'Scalable trusted group onboarding',
      priority: 'P0 - Core Foundation',
      action: 'Tie up with Resident Welfare Associations (RWAs), senior citizen clubs, and local SME employers',
    },
  ],
  p1_growthChannels: [
    { channel: 'Opt-in WhatsApp Business Alerts', role: 'Booking confirmations, prep instructions, and chronic refill reminders', priority: 'P1' },
    { channel: 'Family Referral & Loyalty Rewards', role: 'Organic family word-of-mouth growth with ₹150 booking credits', priority: 'P1' },
    { channel: 'High-Intent Search Ads (Google Ads)', role: 'Laser-focused paid search on emergency and high-intent terms ("dentist near me")', priority: 'P1' },
    { channel: 'Transactional Email Communications', role: 'Invoices, medical record backups, and monthly health newsletters', priority: 'P1' },
  ],
  p2_supplementary: [
    { channel: 'Doctor & Specialist Ethical Content', role: 'Doctor-led educational video reels with mandatory NMC advertising compliance', priority: 'P2' },
    { channel: 'Local PR & Vernacular News Columns', role: 'Credibility building in local Hindi newspapers and radio stations', priority: 'P2' },
    { channel: 'App Store Optimization (ASO)', role: 'Bilingual Play Store / App Store listings with verified patient reviews', priority: 'P2' },
    { channel: 'Offline Posters & Society Notice Boards', role: 'Cost-effective physical awareness in residential apartment societies', priority: 'P2' },
  ],
};

export const SEO_SITE_ARCHITECTURE = {
  urlHierarchy: [
    '/<city>/ (e.g. /bhopal, /jabalpur, /indore)',
    '/<city>/<category>/ (e.g. /bhopal/dentist/)',
    '/<city>/<category>/<area>/ (e.g. /bhopal/dentist/arera-colony/)',
    '/<city>/<category>/<slug> (Provider or clinic facility profile)',
    '/doctors/<specialty>/<city>/<slug> (Practitioner profile)',
    '/tests/<test-slug>/<city> (Diagnostic test pricing and lab comparison)',
    '/medicines/<salt-or-brand> (Non-promotional drug information page)',
    '/health/<topic>/ (Medical-reviewed clinical guidance in Hindi and English)',
    '/events/<city>/<slug> (Health screening camps and CPR workshops)',
    '/packages/<slug> (Comprehensive health checkup packages)',
  ],
  qualityGateMinimumVerifiedProviders: 3,
  noindexBelowThreshold: true,
  neverIndexRoutes: [
    '/patient/*',
    '/records/*',
    '/dashboard/*',
    '/checkout/*',
    '/auth/*',
    '/search?*query=*',
  ],
  schemaOrgTypesSupported: [
    'MedicalOrganization',
    'Physician',
    'Dentist',
    'Pharmacy',
    'MedicalWebPage',
    'OpeningHoursSpecification',
    'AggregateRating',
    'FAQPage',
    'Event',
    'BreadcrumbList',
  ],
};

export const KEYWORD_CLUSTERS = [
  {
    cluster: 'Doctors & Specialists',
    english: ['dentist near me', 'pediatrician in Bhopal', 'skin specialist', 'eye doctor cataract surgery', 'orthopedic surgeon'],
    hinglish: ['paas ka doctor', 'bachon ka specialist doctor', 'chamdi ke doctor', 'aankhon ka hospital', 'haddi ke doctor'],
  },
  {
    cluster: 'Diagnostics & Blood Tests',
    english: ['CBC test price', 'blood test home collection', 'MRI scan center near me', 'full body health checkup package'],
    hinglish: ['ghar baithe khoon ki jaanch', 'sasti pathology lab', 'MRI scan kitne ka hota hai', 'sugar test checkup'],
  },
  {
    cluster: 'Pharmacy & Medicines',
    english: ['medicine home delivery 2 hours', 'generic medicine store near me', 'Jan Aushadhi Kendra list', 'online chemist'],
    hinglish: ['dawai delivery ghar par', 'sasti generic dawai', 'paas ki medical store', 'Jan Aushadhi kendra'],
  },
  {
    cluster: 'Specialty Care Centers',
    english: ['dialysis center near me', 'IVF fertility clinic cost', 'physiotherapy at home', 'child development center'],
    hinglish: ['dialysis hospital paas me', 'IVF ka kharcha', 'ghar par physiotherapy', 'bachon ki speech therapy'],
  },
  {
    cluster: 'Home & Elder Care',
    english: ['home nursing service', 'elderly attendant for bedridden patient', 'palliative care at home', 'trained nurse 24 hours'],
    hinglish: ['bujurgon ke liye attendant', 'ghar par nurse lagwana', 'bedridden patient care', 'home care staff'],
  },
  {
    cluster: 'Equipment & Medical Rentals',
    english: ['oxygen concentrator on rent', 'hospital bed rental near me', 'wheelchair for rent monthly', 'biPAP machine rental'],
    hinglish: ['oxygen cylinder kiraye par', 'hospital bed rent par', 'wheelchair kiraye par lena', 'oxygen machine'],
  },
  {
    cluster: 'Govt Schemes & Helplines',
    english: ['Ayushman card hospital list', 'nearest Primary Health Centre PHC', 'CGHS approved clinics', 'free govt dispensary'],
    hinglish: ['Ayushman card se free ilaj kahan hota hai', 'sarkari aspatal list', 'Jan Aushadhi dawai'],
  },
];

export const HEALTH_CALENDAR_CAMPAIGNS = [
  {
    date: '24 March',
    theme: 'World TB Day',
    campaignTitle: 'Healthy Lungs, Strong City',
    action: 'Partner diagnostic labs offer complimentary chest X-ray and sputum screening camps.',
  },
  {
    date: '07 April',
    theme: 'World Health Day',
    campaignTitle: 'Har Parivar Swasth Parivar',
    action: 'City-wide preventive health packages with free home sample collection.',
  },
  {
    date: 'April – May',
    theme: 'Heatwave & Hydration Season',
    campaignTitle: 'Heat Safe City Alerts',
    action: 'In-app hydration trackers, heatstroke warnings, and ORS distribution at partner clinics.',
  },
  {
    date: 'June – September',
    theme: 'Monsoon Fever & Dengue Prevention',
    campaignTitle: 'Dengue-Mukt Shehar',
    action: 'Same-day platelet & fever panel tests, mosquito prevention guides, and doctor teleconsults.',
  },
  {
    date: '21 June',
    theme: 'International Yoga Day',
    campaignTitle: 'Yoga for Life',
    action: 'Free trial yoga sessions at partner studios and community parks.',
  },
  {
    date: '29 September',
    theme: 'World Heart Day',
    campaignTitle: 'Dil Ki Baat, Doctor Ke Saath',
    action: 'Cardiac risk scoring, discounted ECG & Lipid profile packages, CPR training workshops.',
  },
  {
    date: '10 October',
    theme: 'World Mental Health Day',
    campaignTitle: 'Man Ki Shanti',
    action: 'Confidential online counseling sessions, Tele-MANAS helpline integration, stress workshops.',
  },
  {
    date: '14 November',
    theme: 'World Diabetes Day',
    campaignTitle: 'Sugar Control, Life Control',
    action: 'Free HbA1c screening kiosks at partner pharmacies and diabetic meal planning guides.',
  },
  {
    date: 'October – December',
    theme: 'Winter Health & Senior Flu Season',
    campaignTitle: 'Winter Shield for Elders',
    action: 'Senior citizen home visits, pneumonia and flu vaccination drives, joint pain clinics.',
  },
];

export const LIFECYCLE_CRM_JOURNEYS = [
  {
    stage: 'Welcome & Onboarding',
    trigger: 'New patient sign-up verified via OTP',
    message: 'Welcome to FindMedi! Add your family members to manage all doctor bookings and health records in one place.',
    channel: 'In-App + WhatsApp (Opt-in)',
  },
  {
    stage: 'First Booking Nudge',
    trigger: 'No appointment booked within 3 days of registration',
    message: 'Need help finding a verified doctor or lab nearby? Explore verified specialists with transparent pricing.',
    channel: 'Mobile Push Notification',
  },
  {
    stage: 'Pre-Appointment Preparation',
    trigger: 'Booking confirmed (12 hours prior to slot)',
    message: 'Your appointment with Dr. {doctorName} is tomorrow at {slotTime}. Remember to carry past prescriptions.',
    channel: 'Transactional SMS + WhatsApp',
  },
  {
    stage: 'Post-Visit Care & Feedback',
    trigger: 'Appointment marked completed by provider',
    message: 'Your consultation is complete. Prescription has been added to your digital records. Share your verified review.',
    channel: 'In-App + Mobile Push',
  },
  {
    stage: 'Chronic Refill Reminder',
    trigger: '25 days following a 30-day chronic prescription',
    message: 'Time for your monthly medicine refill. Order from your neighborhood verified pharmacy with 1-click.',
    channel: 'WhatsApp (Discreet Mode)',
  },
  {
    stage: 'Inactive Win-Back',
    trigger: '60–90 days of platform inactivity',
    message: 'Keep your family protected. Check out upcoming neighborhood health screening camps and wellness tips.',
    channel: 'Email Newsletter',
  },
];

export const PARTNERSHIP_PLAYBOOK = [
  {
    partnerType: 'Resident Welfare Associations (RWAs)',
    offer: 'Free community cardiac & diabetes screening camp, dedicated elderly support desk, exclusive society discount.',
    mechanism: 'Notice board poster QR kits, resident WhatsApp group broadcast, annual society health day.',
  },
  {
    partnerType: 'Corporates, SMEs & Schools',
    offer: 'Annual employee health checkup packages, ergonomic posture workshops, certified bystander CPR training.',
    mechanism: 'B2B executive health packages, HR dashboard reporting (strictly k-anonymous aggregate data).',
  },
  {
    partnerType: 'NGOs & CSR Foundations (Rotary / Lions)',
    offer: 'Free blood donation drives, cataract screening camps, maternal health nutrition kits.',
    mechanism: 'Co-organized public health drives with audited impact reports.',
  },
  {
    partnerType: 'Professional Medical Associations (IMA / IDA)',
    offer: 'Digital practice management tools, zero-commission listing probation, accredited CME webinars.',
    mechanism: 'Chapter meeting presentations, association newsletter features.',
  },
];

export const MARKETING_COMPLIANCE_CHECKLIST = [
  'Strict compliance with the Drugs and Magic Remedies (Objectionable Advertisements) Act 1954 (No cure guarantees)',
  'Zero health-data based ad retargeting; sensitive medical categories strictly excluded from marketing campaigns',
  'Adherence to National Medical Commission (NMC) regulations prohibiting commercial doctor self-advertising',
  'Explicit signed consent on file for all patient testimonials, clinic photographs, and case studies',
  'TRAI DLT registered SMS templates with verified header IDs and mandatory opt-out mechanisms',
  'Strict DPDP Act compliance: explicit opt-in consent for marketing; minor profiles excluded from behavioral tracking',
  'Sponsored doctor or clinic placements visibly labeled with distinct [Sponsored] visual badges',
  'All health content reviewed, signed off, and timestamped by credentialed medical practitioners',
  'Transparent pricing disclosures ("Consultation from ₹X") with zero hidden service fees',
  'All marketing claims approved through cross-functional Legal and Clinical Advisory clearance workflow',
];

export const NINETY_DAY_LAUNCH_PLAN = {
  days_1_30: {
    phase: 'Month 1: Brand Foundations & Local Presence',
    milestones: [
      'Finalize bilingual brand style kit and vernacular voice guidelines',
      'Optimize Google Business Profiles for pilot city operations hub',
      'Deploy programmatic city hub (/<city>/) and top 5 category pages with verified provider threshold',
      'Publish initial library of 20 medical-reviewed pillar health articles in Hindi and English',
      'Equip field operations team with physical acrylic reception QR kits and leaflets',
    ],
  },
  days_31_60: {
    phase: 'Month 2: Supply Density & Community Camps',
    milestones: [
      'Onboard 50 anchor clinics, diagnostic centers, and pharmacies across pilot target zone',
      'Execute 3 community screening camps in partnership with local RWAs and Rotary club',
      'Activate opt-in WhatsApp transactional update service with DLT-cleared templates',
      'Launch family referral program with ₹150 booking credits and fraud prevention controls',
      'Initiate targeted high-intent local search ads for urgent medical keywords',
    ],
  },
  days_61_90: {
    phase: 'Month 3: Retention, Expansion & CAC Optimization',
    milestones: [
      'Scale RWA partnership calendar to 2 weekend camps per week',
      'Collect and publish verified consented patient video testimonials',
      'Launch pilot membership packages for preventive chronic wellness care',
      'Audit customer acquisition cost (CAC) vs Lifetime Value (LTV) across all channels',
      'Prepare city expansion blueprint for next adjacent district',
    ],
  },
};

/**
 * Generates valid Schema.org JSON-LD structured data for healthcare search discovery.
 */
export function generateSchemaOrgJsonLd(type, entityData = {}) {
  const baseContext = 'https://schema.org';

  switch (type) {
    case 'MedicalOrganization':
    case 'Physician':
    case 'Dentist':
    case 'Pharmacy':
      return JSON.stringify(
        {
          '@context': baseContext,
          '@type': type,
          name: entityData.name || 'FindMedi Verified Healthcare Provider',
          url: entityData.url || 'https://findmedi.in',
          telephone: entityData.phone || '+91-761-0000000',
          medicalSpecialty: entityData.specialty || 'General Practice',
          address: {
            '@type': 'PostalAddress',
            streetAddress: entityData.street || 'Civic Center',
            addressLocality: entityData.city || 'Jabalpur',
            addressRegion: entityData.state || 'Madhya Pradesh',
            postalCode: entityData.pincode || '482001',
            addressCountry: 'IN',
          },
          priceRange: entityData.priceRange || '₹₹',
          aggregateRating: entityData.rating
            ? {
                '@type': 'AggregateRating',
                ratingValue: entityData.rating,
                reviewCount: entityData.reviewCount || 1,
              }
            : undefined,
        },
        null,
        2
      );

    case 'MedicalWebPage':
      return JSON.stringify(
        {
          '@context': baseContext,
          '@type': 'MedicalWebPage',
          headline: entityData.title || 'Healthcare Guidance',
          url: entityData.url || 'https://findmedi.in/health',
          reviewedBy: {
            '@type': 'Physician',
            name: entityData.reviewerName || 'Dr. Clinical Advisor, MD',
          },
          lastReviewed: entityData.reviewedAt || new Date().toISOString().split('T')[0],
          publisher: {
            '@type': 'Organization',
            name: 'FindMedi Health Platform',
            url: 'https://findmedi.in',
          },
        },
        null,
        2
      );

    case 'FAQPage':
      return JSON.stringify(
        {
          '@context': baseContext,
          '@type': 'FAQPage',
          mainEntity: (entityData.faqs || []).map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
        null,
        2
      );

    default:
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'Thing',
        name: entityData.name || 'FindMedi Listing',
      });
  }
}

/**
 * Validates marketing claim text for compliance with Drugs and Magic Remedies Act.
 * Detects prohibited miracle words ('100% cure', 'guaranteed cure', 'shartiya ilaj', 'magical remedy').
 */
export function validateMarketingClaim(claimText = '') {
  const text = String(claimText).toLowerCase();

  const prohibitedPhrases = [
    '100% cure',
    'guaranteed cure',
    'shartiya ilaj',
    'magical remedy',
    'permanent cure for cancer',
    'miracle treatment',
    'guaranteed relief without doctor',
    'instant cure for diabetes',
  ];

  const matched = prohibitedPhrases.filter((phrase) => text.includes(phrase));

  return {
    isCompliant: matched.length === 0,
    matchedViolations: matched,
    recommendation:
      matched.length === 0
        ? 'Claim compliant: Factual, informative language adhered to.'
        : `NON-COMPLIANT under Drugs & Magic Remedies Act 1954: Prohibited phrase(s) detected [${matched.join(', ')}]. Replace with factual clinical language.`,
  };
}

/**
 * Builds canonical SEO-friendly URL for a healthcare listing.
 */
export function getSeoUrlForListing(city = 'bhopal', category = 'dentist', slug = '', area = '') {
  const cleanCity = String(city).toLowerCase().trim().replace(/\s+/g, '-');
  const cleanCat = String(category).toLowerCase().trim().replace(/\s+/g, '-');
  const cleanSlug = String(slug).toLowerCase().trim().replace(/\s+/g, '-');

  if (area) {
    const cleanArea = String(area).toLowerCase().trim().replace(/\s+/g, '-');
    return `/${cleanCity}/${cleanCat}/${cleanArea}/${cleanSlug}`;
  }
  return `/${cleanCity}/${cleanCat}/${cleanSlug}`;
}
