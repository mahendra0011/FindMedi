/**
 * Document 22 — Pitch / Investor Deck Outline (+ Q&A Prep) Specifications (Client Library)
 * 14-Slide Full Pitch Deck Framework, 5-Slide 3-Minute Quick Pitch,
 * Narrative Elevator Script, TAM / SAM / SOM Market Sizing Models,
 * Complete 13-Question Investor Objection Defense Matrix,
 * Due-Diligence Data Room Checklist, and Funding Path Alternatives.
 */

export interface PitchDeckSlide {
  slideNumber: number;
  title: string;
  subtitle: string;
  category: string;
  keyTakeaway: string;
  bullets: string[];
}

export interface ThreeMinutePitchItem {
  step: string;
  content: string;
}

export interface NarrativeScript {
  title: string;
  hindiScript: string;
}

export interface MarketSizingItem {
  label: string;
  valueUsd: string;
  valueInr: string;
  description: string;
}

export interface MarketSizingFramework {
  tam: MarketSizingItem;
  sam: MarketSizingItem;
  som: MarketSizingItem;
}

export interface InvestorQaItem {
  id: string;
  category: string;
  question: string;
  answerSummary: string;
  defensePoints: string[];
}

export interface DueDiligenceDataRoomItem {
  category: string;
  documents: string[];
}

export interface FundingPathAlternative {
  path: string;
  suitability: string;
  action: string;
}

export interface GtmPhase {
  phase: string;
  target: string;
  milestones: string[];
}

export interface CityMarketPotentialInput {
  cityPopulation?: number;
  averageHouseholdSize?: number;
  annualHouseholdHealthSpend?: number;
  outpatientSharePercent?: number;
  digitalPenetrationPercent?: number;
  findmediTargetSharePercent?: number;
  takeRatePercent?: number;
}

export interface CityMarketPotentialResult {
  households: number;
  totalCityHealthSpendInr: number;
  outpatientSpendInr: number;
  addressableDigitalSpendInr: number;
  findmediGmvInr: number;
  findmediRevenueInr: number;
  monthlyRevenueInr: number;
}

export const PITCH_DECK_SLIDES: PitchDeckSlide[] = [
  {
    slideNumber: 1,
    title: 'FindMedi — Healthcare for Bharat',
    subtitle: 'Bharosemand health & wellness, aapke shehar me — ek hi jagah.',
    category: 'Vision & Hook',
    keyTakeaway: 'The unified, trust-first healthcare ecosystem for India’s next 500 million users.',
    bullets: [
      'Bridging the massive trust and discovery gap in Tier-2 and Tier-3 healthcare.',
      'Connecting patients, verified doctors, diagnostic labs, pharmacies, and elder-care services.',
      'Vernacular-first (Hindi/English), privacy-respecting (zero PHI ad targeting), and built for the entire family.',
    ],
  },
  {
    slideNumber: 2,
    title: 'The Problem: Fragmented, Opaque & Distrustful Healthcare',
    subtitle: 'Why getting healthcare outside metro cities is stressful and expensive.',
    category: 'Problem',
    keyTakeaway: 'Healthcare in non-metro India is hyper-fragmented with zero price transparency.',
    bullets: [
      'No trusted discovery: Patients rely on unverified hearsay and touts; rampant risk of quackery.',
      'Opaque pricing: Wildly fluctuating consultation and diagnostic test prices with surprise bills.',
      'Paper prescription chaos: Lost medical history leading to repeat tests and medication errors.',
      'Elder-care crisis: Aging parents in hometowns lack reliable attendant care, equipment rentals, and emergency support.',
    ],
  },
  {
    slideNumber: 3,
    title: 'Why Now? Policy & Infrastructure Tailwinds',
    subtitle: 'Structural shifts in Indian healthcare technology and digital consumer behavior.',
    category: 'Market Timing',
    keyTakeaway: 'Regulatory formalization (ABDM, DPDP) and UPI adoption create the ideal launch window.',
    bullets: [
      'Digital payment ubiquity: UPI adoption in Tier-2/3 families has eliminated friction for micro-transactions.',
      'Ayushman Bharat Digital Mission (ABDM): Rapid adoption of ABHA IDs and digital health records.',
      'DPDP Act 2023 compliance: Consumers demanding privacy; zero tolerance for shady data resale.',
      'Telemedicine Practice Guidelines 2020: Established legal framework for remote consultations and digital Rx.',
    ],
  },
  {
    slideNumber: 4,
    title: 'The Solution: The FindMedi Unified Care Ecosystem',
    subtitle: 'Discover → Verify → Book → Deliver → Manage across 25+ healthcare verticals.',
    category: 'Solution',
    keyTakeaway: 'A single, end-to-end platform covering the patient journey from prevention to post-care.',
    bullets: [
      '100% Verified Providers: Council registry verified doctors, AERB approved imaging, licensed pharmacies.',
      'Transparent & Upfront Pricing: See consultation fees, test rates, and medicine prices before booking.',
      'Family Digital Health Passport: Secure, ABDM-aligned digital records, chronic reminders, and discreet health sharing.',
      'Integrated Care Delivery: Clinic visits, teleconsults, home sample collection, medicine delivery, and medical rentals.',
    ],
  },
  {
    slideNumber: 5,
    title: 'Product Proof & Architecture: Live Enterprise Platform',
    subtitle: 'Multi-role RBAC, verifiable compliance, and zero data leakage architecture.',
    category: 'Product Proof',
    keyTakeaway: 'Built ground-up with 24 specialized roles, WebRTC video, and offline PWA resiliency.',
    bullets: [
      '24 specialized roles & 25+ provider taxonomies: Doctors, clinics, labs, pharmacies, ambulances, counselors, lawyers.',
      'Dual-lane KYC verification: Automated council checks paired with physical field inspections.',
      'Security-first: AES-256-GCM encryption for PHI, row-level tenant security, and audit logging.',
      'Offline-capable PWA: Fast, lightweight mobile web designed for Tier-2 4G networks.',
    ],
  },
  {
    slideNumber: 6,
    title: 'Traction & Beachhead Validation',
    subtitle: 'Pilot execution in Tier-2 Madhya Pradesh (Bhopal & Jabalpur).',
    category: 'Traction',
    keyTakeaway: 'Proven initial supply density with high repeat frequency and zero-CAC organic loops.',
    bullets: [
      'Anchor supply pipeline: 150+ verified clinics, 30 diagnostic centers, and 40 neighborhood pharmacies.',
      'High repeat frequency: 42% 60-day repeat booking rate driven by chronic care refills and family health circles.',
      'Customer NPS & CSAT: 4.8/5.0 average patient rating with verified verified-only reviews.',
      'Low CAC: 65% of demand generated through clinic waiting room QR kits and society health camps.',
    ],
  },
  {
    slideNumber: 7,
    title: 'Market Opportunity: TAM / SAM / SOM',
    subtitle: 'A massive $110B+ outpatient market ripe for digital consolidation.',
    category: 'Market Sizing',
    keyTakeaway: 'A multi-billion dollar domestic opportunity focused on out-of-pocket outpatient spend.',
    bullets: [
      'TAM: $110B+ Indian Healthcare Outpatient & Diagnostics Market.',
      'SAM: $22B digital healthcare market across Tier-1, Tier-2, and Tier-3 urban clusters.',
      'SOM (3-Year): $18M across initial launch state (Madhya Pradesh: Bhopal, Jabalpur, Indore, Gwalior).',
      'High Out-of-Pocket Expenditure (OOPE): 48% of total healthcare spend is paid directly by families.',
    ],
  },
  {
    slideNumber: 8,
    title: 'Business Model: Diversified & High Margin',
    subtitle: 'Take rates, SaaS subscriptions, and B2B corporate wellness partnerships.',
    category: 'Monetization',
    keyTakeaway: 'Multi-stream revenue model with strong unit economics and predictable recurring SaaS.',
    bullets: [
      'Marketplace Take Rate (10–15%): Commission on consultations, diagnostic tests, and home care services.',
      'Provider SaaS & Tools (₹999–₹2,999/mo): Clinic practice management, queue tracking, and digital EMR.',
      'B2B Corporate & School Health: Ergonomic wellness, annual employee checkups, and certified CPR camps.',
      'Pharmacy & Equipment Marketplace: Commission on medicine orders and monthly medical bed/oxygen rentals.',
    ],
  },
  {
    slideNumber: 9,
    title: 'Go-To-Market (GTM): The Zero-CAC Flywheel',
    subtitle: 'Hyperlocal clinic distribution combined with trusted community wellness camps.',
    category: 'GTM & Growth',
    keyTakeaway: 'Acquiring patients at ₹0 CAC in clinic waiting rooms and society screening camps.',
    bullets: [
      'Waiting Room QR Kit: Acrylic QR stands placed at partner doctor reception desks ("Book follow-up on FindMedi").',
      'RWA & Society Screening Camps: Free hypertension and blood sugar screening drives with local resident welfare associations.',
      'Family Referral Engine: ₹150 booking wallet credits for adding parents and spouses to the Family Care circle.',
      'Vernacular Local SEO: Programmatic city × category pages targeting high-intent local queries in Hindi and English.',
    ],
  },
  {
    slideNumber: 10,
    title: 'Competitive Advantage & Moat',
    subtitle: 'Why generic metro-centric platforms cannot replicate FindMedi’s local trust.',
    category: 'Defensibility',
    keyTakeaway: 'Hyperlocal supply density, vernacular familiarity, and offline clinic presence.',
    bullets: [
      'Hyperlocal Density: Deep supply concentration in specific pin codes rather than thin superficial national spread.',
      'Doctor Practice Integration: Daily clinic operations run on FindMedi EMR, ensuring low provider churn.',
      'Ethical Alignment: Strictly zero miracle cures (Drugs & Magic Remedies Act) and zero hidden booking fees.',
      'Complete Family Coverage: Pediatric to geriatric care, including bedridden elder care and medical rentals.',
    ],
  },
  {
    slideNumber: 11,
    title: 'Trust, Safety & Compliance: The Health Moat',
    subtitle: 'Enterprise compliance posture designed for stringent medical regulations.',
    category: 'Trust & Moat',
    keyTakeaway: 'Rigorous KYC, DPDP compliance, and dedicated clinical advisory oversight.',
    bullets: [
      'Two-Person KYC Approval: Mandatory dual sign-off for high-risk surgical and diagnostic facilities.',
      'DPDP Act 2023 Readiness: Purpose-bound consent, zero health-data ad retargeting, and full DSR workflows.',
      'Medical Ethics & Claims Policy: Automatic scanning for miracle cure claims under Drugs & Magic Remedies Act 1954.',
      'Clinical Advisory Board: Practicing MD physicians providing medical oversight, content reviews, and escalation support.',
    ],
  },
  {
    slideNumber: 12,
    title: 'Product Roadmap: Phased Execution',
    subtitle: 'Disciplined sprint progression from beachhead dominance to regional multi-city scale.',
    category: 'Roadmap',
    keyTakeaway: 'Phased rollout prioritizing foundation and pilot categories before broad expansion.',
    bullets: [
      'R0 (Foundations): RBAC, 2-person KYC, secure auth, emergency helplines, billing reconciliation.',
      'R1 (Pilot Categories): Doctors, dental, diagnostics, pharmacies, and physiotherapy in pilot city.',
      'R2 (Engagement): Preventive health camps, annual memberships, and family care health passport.',
      'R3 & R4 (Scale & Regulated): Hospital IPD admissions, corporate wellness contracts, and multi-state expansion.',
    ],
  },
  {
    slideNumber: 13,
    title: 'Leadership & Execution Team',
    subtitle: 'A balanced team combining technology, clinical governance, and ground operations.',
    category: 'Team',
    keyTakeaway: 'Execution excellence backed by clinical, legal, and operational leadership.',
    bullets: [
      'Engineering & Product: Scaled high-throughput, security-first platforms with zero-trust architectures.',
      'Clinical Advisory Board: Practicing MD physicians ensuring medical safety, ethics, and content integrity.',
      'Legal & Compliance: DPDP data protection officer and healthcare regulatory specialists.',
      'Ground Ops & Field Team: Local city managers with deep regional doctor and RWA networks.',
    ],
  },
  {
    slideNumber: 14,
    title: 'The Ask & 18-Month Milestones',
    subtitle: 'Seed / Pre-Series A round to dominate the launch state and scale the playbook.',
    category: 'The Ask',
    keyTakeaway: 'Capitalizing city playbook expansion across 5 key urban clusters.',
    bullets: [
      'Fundraise Target: $1.2M Seed Round for 18 months runway.',
      'Use of Funds: 45% Tech & Product | 30% City Supply Expansion | 15% Trust & Brand SEO | 10% Regulatory & Reserve.',
      'Target Milestones: 1,500 Verified Providers, 50,000 Monthly Completed Bookings, CM2 Positive in Pilot Hubs.',
    ],
  },
];

export const THREE_MINUTE_PITCH: ThreeMinutePitchItem[] = [
  {
    step: '1. Problem + Why Now',
    content: 'Outside metro India, 500M citizens face opaque pricing, quackery, and scattered medical records. With UPI ubiquity, ABDM health IDs, and DPDP privacy laws, the timing to organize outpatient healthcare is right now.',
  },
  {
    step: '2. Solution & Live Platform',
    content: 'FindMedi is Bharat’s unified healthcare ecosystem: 100% verified doctors, labs, pharmacies, and elder-care in one bilingual app with transparent pricing, digital records, and 24x7 emergency SOS.',
  },
  {
    step: '3. Traction & Unit Economics',
    content: 'Tested in Tier-2 MP (Bhopal/Jabalpur) with anchor clinics. 12.5% blended take rate + clinic SaaS fees with 72% gross margin and <45 days CAC payback.',
  },
  {
    step: '4. GTM & Zero-CAC Flywheel',
    content: 'We acquire patients at ₹0 CAC using acrylic QR stands at doctor reception desks and weekend RWA screening camps, creating sticky local network effects.',
  },
  {
    step: '5. Team & The Ask',
    content: 'Experienced tech, clinical, and operations leadership raising $1.2M Seed capital to dominate 5 cities in Central India and reach 50,000 monthly bookings.',
  },
];

export const NARRATIVE_SCRIPT: NarrativeScript = {
  title: 'Elevator Pitch Script (3–5 Minutes)',
  hindiScript: 'Aapke ghar me kisi ko dard hota hai — kaunsa doctor? kitna fee? slot kab? dawai kahan se? report kahan rakhein? Aaj ye sab alag-alag jagah, bina kisi bharose ke chalta hai. FindMedi aapke shehar me verified doctors, labs, pharmacies aur elder-care ko ek jagah laata hai. Har doctor council se verified hai, har rate pehle se dikhta hai, aur records hamesha surakshit rehte hain. Humne pilot me dekha ki clinic waiting room QR stands se patients bina kisi marketing kharche ke hamare regular users ban jaate hain. Hum is proven playbook ko agle 18 mahino me 5 sheharo me scale kar rahe hain.',
};

export const MARKET_SIZING_FRAMEWORK: MarketSizingFramework = {
  tam: {
    label: 'Total Addressable Market (TAM)',
    valueUsd: '$110 Billion',
    valueInr: '₹9.1 Lakh Crore',
    description: 'Total Indian healthcare outpatient, diagnostic testing, pharmacy, and wellness expenditure.',
  },
  sam: {
    label: 'Serviceable Available Market (SAM)',
    valueUsd: '$22 Billion',
    valueInr: '₹1.8 Lakh Crore',
    description: 'Digital-first outpatient healthcare spend across Tier-1, Tier-2, and Tier-3 urban clusters.',
  },
  som: {
    label: 'Serviceable Obtainable Market (SOM - 3 Year)',
    valueUsd: '$18 Million',
    valueInr: '₹150 Crore',
    description: 'Targeted revenue capture across 5 launch cities in Madhya Pradesh (Bhopal, Jabalpur, Indore, Gwalior, Ujjain).',
  },
};

export const INVESTOR_QA_MATRIX: InvestorQaItem[] = [
  {
    id: 'QA-01',
    category: 'Competition',
    question: 'Why won’t big players, hospital chains, or telemedicine apps crush you locally?',
    answerSummary: 'Hyperlocal offline-first distribution, deep Tier-2/3 vernacular focus, and unified multi-vertical care.',
    defensePoints: [
      'Incumbents are metro-centric (70%+ volume from top 6 cities); their digital ad CAC in Tier-2/3 is unsustainably high.',
      'FindMedi acquires users at ₹0 CAC via physical clinic reception QR stands and RWA health camps.',
      'We offer an integrated family care umbrella: not just doctor appointments, but elder-care attendants, home sample collection, and hospital bed rentals.',
      'Strictly zero sponsored ad manipulation: We do not allow doctors to pay to jump search rankings, ensuring authentic user trust.',
    ],
  },
  {
    id: 'QA-02',
    category: 'Disintermediation',
    question: 'How will you stop patients and doctors from transacting offline after the first visit?',
    answerSummary: 'Deep EMR workflow lock-in, automated patient records, and value-added clinic utilities.',
    defensePoints: [
      'FindMedi provides free clinic queue management and digital prescription tools that doctors rely on daily.',
      'Patients insist on using FindMedi because their digital health records, past lab reports, and family history reside in the app.',
      'Automated WhatsApp appointment confirmations and medicine dosage reminders add immense value to both parties.',
      'Fair commission structure (10–12%) ensures doctors do not have an economic incentive to kick patients off the platform.',
    ],
  },
  {
    id: 'QA-03',
    category: 'Unit Economics',
    question: 'What are your category-wise unit economics and path to profitability?',
    answerSummary: 'High-margin take rates, chronic repeat orders, and recurring clinic SaaS revenue.',
    defensePoints: [
      'Average Order Values: ₹650 (Consultations), ₹1,400 (Diagnostics), ₹4,500 (Home Care packages).',
      'Blended take rate of 12.5% coupled with zero-CAC clinic reception QR acquisition delivers rapid payback under 45 days.',
      'Chronic care patients generate predictable, recurring revenue with monthly test panels and medicine refills.',
      'Lean SRE and serverless backend architecture keeps infrastructure cost under ₹20 per 1,000 bookings.',
    ],
  },
  {
    id: 'QA-04',
    category: 'Regulatory Compliance',
    question: 'How do you safeguard against telemedicine malpractice and regulatory crackdowns?',
    answerSummary: 'Strict adherence to Telemedicine 2020, NMC advertising guidelines, and Drugs & Magic Remedies Act.',
    defensePoints: [
      'Schedule X/narcotic drug prescription restrictions are strictly enforced in our digital prescription software.',
      'Dual-lane KYC verification: Automated council registry lookup plus mandatory physical field inspection.',
      'Automated marketing claim scanner flags prohibited miracle cure words ("100% cure", "shartiya ilaj").',
      'Compliance register reviewed quarterly with practicing MD clinical advisors and healthcare attorneys.',
    ],
  },
  {
    id: 'QA-05',
    category: 'Data Privacy & Security',
    question: 'How does FindMedi handle patient data privacy and DPDP Act compliance?',
    answerSummary: 'Zero PHI ad targeting, AES-256-GCM field encryption, and complete Data Subject Rights (DSR) workflows.',
    defensePoints: [
      'Strict Zero-PHI ad policy: Patient diagnoses and prescription details are never used for advertising retargeting.',
      'Encrypted at rest and in transit with key versioning; role-based access control enforces least privilege.',
      'DPDP-compliant DSR workflows allow patients to request data export, correction, or account deletion within statutory SLAs.',
      'Full CERT-In 6-hour incident response playbook with automated audit logging.',
    ],
  },
  {
    id: 'QA-06',
    category: 'Supply Quality',
    question: 'How do you ensure provider quality and avoid onboarding unverified practitioners?',
    answerSummary: 'Dual-sign-off verification, probation limits, and verified patient feedback loops.',
    defensePoints: [
      'High-risk categories (surgery, imaging, pathology) require two-person administrative approval before going live.',
      'Newly onboarded providers undergo a 30-day probation period with volume caps and payout holds.',
      'Only patients with completed, verified consultations can submit reviews, preventing fake ratings.',
      'Automated strike system flags provider no-shows or repeated cancellations for suspension.',
    ],
  },
  {
    id: 'QA-07',
    category: 'CAC & Scalability',
    question: 'Can your customer acquisition model scale beyond your pilot city to 50+ cities across India?',
    answerSummary: 'Standardized 90-day city launch playbook with templated field operations, local SEO, and RWA kits.',
    defensePoints: [
      'Documented 90-day city playbook: 50 anchor clinics, 300 reception QR kits, and 24 RWA weekend camps.',
      'Programmatic SEO architecture spins up city hubs (/<city>/<category>/) with vernacular Hindi keywords.',
      'Standardized field ops training kits allow new city teams to be operational within 3 weeks.',
      'Elastic cloud architecture supports 1M+ monthly bookings without structural redesign.',
    ],
  },
  {
    id: 'QA-08',
    category: 'Team & Governance',
    question: 'Why is this the right team to build and scale FindMedi?',
    answerSummary: 'Complementary strengths across scalable engineering, clinical governance, and ground execution.',
    defensePoints: [
      'Product and engineering leads with deep experience in zero-trust architectures and consumer apps.',
      'Active Clinical Advisory Board (practicing MD physicians) ensuring medical safety and ethics.',
      'Experienced legal and DPO counsel navigating DPDP, NMC, and e-pharmacy regulations.',
      'On-ground operations executives with established doctor and association networks in Central India.',
    ],
  },
  {
    id: 'QA-09',
    category: 'Moat & Defensibility',
    question: 'What constitutes your true competitive moat over the next 3–5 years?',
    answerSummary: 'Hyperlocal verified provider density, electronic health record lock-in, and community trust.',
    defensePoints: [
      'Hyperlocal Supply Density: Deep geographic concentration creates a high barrier to entry for generic players.',
      'Family Health Passport: Longitudinal patient health records create high switching costs.',
      'Clinic Workflow Integration: Doctors utilizing our EMR and appointment queue have near-zero churn.',
      'Offline Community Trust: RWA screening partnerships establish FindMedi as the trusted neighborhood brand.',
    ],
  },
  {
    id: 'QA-10',
    category: 'Exit & Return Path',
    question: 'What is the realistic exit and return path for investors in this round?',
    answerSummary: 'Strategic acquisition by healthcare conglomerates or IPO on Indian public exchanges.',
    defensePoints: [
      'Strategic acquisition by major hospital chains (Apollo, Fortis, Manipal) seeking digital outpatient reach.',
      'Consolidation by insurance and health-tech conglomerates seeking Tier-2/3 distribution.',
      'Long-term IPO on NSE/BSE supported by India’s expanding retail investor appetite for profitable healthcare platforms.',
      'Targeting 8–12x return multiples over a 5–7 year horizon based on regional health-tech benchmarks.',
    ],
  },
  {
    id: 'QA-11',
    category: 'Key Risks & Mitigations',
    question: 'What are the single biggest risks facing the business and how do you mitigate them?',
    answerSummary: 'Regulatory shifts, supply churn, and operational cash burn.',
    defensePoints: [
      'Regulatory: Constant alignment with ABDM, DPDP, and state medical councils through dedicated advisory board.',
      'Supply Churn: Free practice management utilities and zero-listing fees ensure providers remain engaged.',
      'Cash Burn: Disciplined zero-CAC marketing and lean cloud infrastructure prevent capital waste.',
      'Fraud & Abuse: Automated heuristics detect fake reviews, coupon abuse, and ghost bookings.',
    ],
  },
  {
    id: 'QA-12',
    category: 'Incident & Data Breach',
    question: 'What happens if a data breach or patient safety incident occurs?',
    answerSummary: 'Automated containment, 6-hour CERT-In reporting, and comprehensive incident response playbooks.',
    defensePoints: [
      'Incident Response SOP-13: Immediate session revocation, access token cycling, and database containment.',
      'CERT-In 6-hour mandatory reporting protocol and user notifications executed as per DPDP guidelines.',
      'Safety SOP-05: Priority patient safety complaints trigger immediate provider suspension pending review.',
      'Third-party security audits and scheduled penetration testing ensure continuous defense hardening.',
    ],
  },
  {
    id: 'QA-13',
    category: 'AI Usage & Guardrails',
    question: 'How does FindMedi incorporate Artificial Intelligence while managing clinical liability?',
    answerSummary: 'AI as an administrative copilot, strictly never providing unsupervised medical diagnoses.',
    defensePoints: [
      'AI is utilized for administrative workflows: appointment scheduling, queue estimation, and vernacular translation.',
      'Zero diagnostic AI: Platform strictly does not generate automated medical prescriptions or clinical diagnoses.',
      'Red-flag detection: Automated scanner routes emergency or self-harm keywords directly to Tele-MANAS/112.',
      'Human-in-the-loop: All medical content and triage guides are signed off by credentialed physicians.',
    ],
  },
];

export const DUE_DILIGENCE_DATA_ROOM: DueDiligenceDataRoomItem[] = [
  {
    category: '1. Corporate & Legal',
    documents: [
      'Certificate of Incorporation & Articles of Association (AoA)',
      'Cap table, Shareholder Agreements & Board Resolutions',
      'ESOP Scheme Documentation & Allocation Records',
      'Trademark Filings & Brand Asset Assignments',
    ],
  },
  {
    category: '2. Product & Architecture',
    documents: [
      'System Architecture Diagram & Zero-Trust Network Topology',
      'Data Flow Diagram & Data Protection Impact Assessment (DPIA)',
      'Third-Party Vendor List & Data Processing Agreements (DPAs)',
      'Uptime SLA Reports & Incident Response Log',
    ],
  },
  {
    category: '3. Regulatory & Compliance',
    documents: [
      'Terms of Service, Privacy Policy & Provider Agreements (Counsel Reviewed)',
      'Telemedicine Guidelines & Drugs and Magic Remedies Compliance Checklist',
      'DPDP Act 2023 DPO Appointment & Data Retention Policy',
      'Clinical Advisory Board Charters & Sign-Off Records',
    ],
  },
  {
    category: '4. Financials & Unit Economics',
    documents: [
      'Audited Books & Monthly MIS Reports',
      'Payment Gateway Reconciliation & Payout Statements',
      'Category-Wise Unit Economics & CAC/LTV Projections',
      '18-Month Financial Budget & Runway Model',
    ],
  },
  {
    category: '5. Commercial & Operations',
    documents: [
      'Anchor Provider LOIs & Partnership MoUs (RWAs / Rotary)',
      'Customer Feedback Surveys, NPS & Retention Cohort Data',
      'City Launch SOP Playbook & Training Guides',
      'Field Operations Staff Badging & Verification Records',
    ],
  },
];

export const FUNDING_PATH_ALTERNATIVES: FundingPathAlternative[] = [
  {
    path: '1. Angel Networks & Health-Tech Syndicates',
    suitability: 'Current Stage (Seed)',
    action: 'Target angel syndicates with doctors, hospital executives, and ex-healthtech founders.',
  },
  {
    path: '2. Startup India & DPIIT Benefits',
    suitability: 'Immediate',
    action: 'Leverage Section 80-IAC tax exemptions, fast-track patent/trademark filing, and government grant schemes.',
  },
  {
    path: '3. State Startup Policies (e.g. MP Startup Policy)',
    suitability: 'Pilot Stage',
    action: 'Apply for lease rental subsidies, employment assistance, and state venture capital co-investment funds.',
  },
  {
    path: '4. CSR Partnerships for Public Camps',
    suitability: 'Ongoing',
    action: 'Partner with corporate CSR foundations to sponsor community cardiac and diabetes screening drives.',
  },
  {
    path: '5. Strategic Corporate Venture Capital (CVC)',
    suitability: 'Series A',
    action: 'Explore strategic investments from diagnostic chains, private hospital groups, and health insurers.',
  },
];

export const GTM_THREE_PHASE_ROADMAP: GtmPhase[] = [
  {
    phase: 'Phase 1: Pilot City Dominance (Months 1–6)',
    target: 'Jabalpur / Bhopal (1 City Focus)',
    milestones: [
      'Onboard 150 verified anchor clinics, 30 diagnostic labs, and 40 pharmacies.',
      'Deploy 300 clinic reception QR kits to capture walk-in appointment traffic.',
      'Organize 24 weekend community screening camps with local RWAs and Rotary clubs.',
      'Achieve 10,000 completed monthly consultations and diagnostic bookings.',
    ],
  },
  {
    phase: 'Phase 2: Regional Cluster Expansion (Months 7–12)',
    target: 'Madhya Pradesh Cluster (Bhopal, Indore, Jabalpur, Gwalior)',
    milestones: [
      'Replicate city launch playbook across 4 adjacent regional hub cities.',
      'Introduce Provider SaaS tier (Clinic EMR & Queue Management system).',
      'Scale family care memberships for chronic elderly patients.',
      'Reach 50,000 monthly bookings and achieve CM2 profitability in initial pilot city.',
    ],
  },
  {
    phase: 'Phase 3: Multi-State Scale & Enterprise Care (Months 13–24)',
    target: 'Central & Northern India (15+ Tier-2/3 Cities)',
    milestones: [
      'Expand into Uttar Pradesh and Rajasthan tier-2 markets.',
      'Onboard 100+ B2B corporate and school health checkup contracts.',
      'Full ABDM health information provider (HIP/HIU) gateway certification.',
      'Cross 200,000 monthly active bookings with robust recurring SaaS revenue.',
    ],
  },
];

/**
 * Calculates bottom-up city market potential based on population and healthcare spending.
 */
export function calculateCityMarketPotential({
  cityPopulation = 1500000,
  averageHouseholdSize = 4.5,
  annualHouseholdHealthSpend = 25000,
  outpatientSharePercent = 60,
  digitalPenetrationPercent = 15,
  findmediTargetSharePercent = 20,
  takeRatePercent = 12,
}: CityMarketPotentialInput = {}): CityMarketPotentialResult {
  const households = cityPopulation / averageHouseholdSize;
  const totalAnnualHealthSpend = households * annualHouseholdHealthSpend;
  const outpatientSpend = totalAnnualHealthSpend * (outpatientSharePercent / 100);
  const addressableDigitalSpend = outpatientSpend * (digitalPenetrationPercent / 100);
  const findmediGrossMerchandiseValue = addressableDigitalSpend * (findmediTargetSharePercent / 100);
  const findmediAnnualRevenue = findmediGrossMerchandiseValue * (takeRatePercent / 100);

  return {
    households: Math.round(households),
    totalCityHealthSpendInr: Math.round(totalAnnualHealthSpend),
    outpatientSpendInr: Math.round(outpatientSpend),
    addressableDigitalSpendInr: Math.round(addressableDigitalSpend),
    findmediGmvInr: Math.round(findmediGrossMerchandiseValue),
    findmediRevenueInr: Math.round(findmediAnnualRevenue),
    monthlyRevenueInr: Math.round(findmediAnnualRevenue / 12),
  };
}
