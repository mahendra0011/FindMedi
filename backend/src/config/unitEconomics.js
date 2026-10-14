/**
 * Document 16 — Business Model & Unit Economics
 * Canonical definitions, revenue streams, category benchmarks, calculation formulas,
 * and statutory commercial guardrails.
 */

export const BUSINESS_MODEL_CANVAS = {
  customerSegments: [
    'Patients & families across urban and tier-2/3 cities',
    'Elderly individuals and family caregivers',
    'Preventive health and fitness/wellness seekers',
    'Independent healthcare & wellness providers (clinics, labs, pharmacies, gyms, home-care)',
    'B2B clients (corporates, schools, NGOs, insurers/TPAs)',
  ],
  valueProposition: {
    patients: 'Unified healthcare marketplace: discover → verify → book → pay → records → reminders; transparent pricing, vernacular support, emergency routing',
    providers: 'Verified patient demand, automated calendars & CRM, fast payouts, review management, digital prescription & lab workflows',
    b2b: 'Corporate wellness programs, aggregate health analytics (zero PHI), streamlined employee health checkups',
  },
  channels: [
    'SEO-optimised city and category discovery pages',
    'Community WhatsApp groups and verified partner referrals',
    'On-ground health camps and community screening events',
    'RWA, corporate and educational institution partnerships',
    'Field ops concierge supply onboarding team',
  ],
  customerRelationships: [
    'Self-serve web and mobile applications with automated workflows',
    'Multilingual human support and grievance redressal helpline',
    'Dedicated provider success managers for high-volume clinics and hospitals',
  ],
  revenueStreams: [
    'Booking and order commissions (technology facilitation fee on GMV)',
    'Provider SaaS subscriptions (Free, Basic, Premium)',
    'Clearly labelled featured and sponsored listings',
    'Recurring memberships & wellness programs rev-share',
    'Equipment rental commissions and deposit management',
    'B2B corporate wellness subscription plans',
  ],
  keyResources: [
    'Cloud-native platform technology & search index',
    'Verified network of independent medical and wellness providers',
    'Brand trust, statutory compliance repository, and clinical protocols',
    'Consented & aggregated health data architecture (zero PHI leakage)',
  ],
  keyActivities: [
    'Provider document verification and KYC audits',
    'Marketplace liquidity and search ranking optimization',
    'Payment gateway reconciliation and automated provider payouts',
    'Patient dispute resolution and clinical grievance redressal',
  ],
  keyPartners: [
    'Hospitals, diagnostic laboratories, and retail pharmacies',
    'Accredited fitness centers, yoga studios, and diet kitchens',
    'RBI-licensed payment aggregators (Razorpay, Cashfree)',
    'Logistics and phlebotomy field sample collection partners',
  ],
  costStructure: {
    variableCosts: [
      'Payment gateway processing fees (~2% of GMV)',
      'DLT-compliant SMS and WhatsApp notification units',
      'Customer support handling cost per booking ticket',
      'Refund and chargeback dispute leakage (~1% of GMV)',
      'Video consultation minutes (LiveKit) and mapping API calls',
    ],
    fixedCosts: [
      'Engineering, product design, operations, and clinical advisor salaries',
      'Cloud infrastructure (Compute, MongoDB Atlas, OpenSearch, Redis, Kafka)',
      'Observability and security logging (Sentry, Prometheus)',
      'Periodic independent third-party penetration testing and audits',
      'Legal and chartered accountancy retainer fees',
    ],
  },
};

export const REVENUE_STREAMS = [
  {
    stream: 'Booking & Order Commission',
    structure: '% of GMV differentiated by category and city tier (via CommissionConfig)',
    regulatorySafeguard: 'Enforced strictly as platform technology service fee. Zero fee-splitting or referral fees to doctors in compliance with NMC/MCI ethics.',
  },
  {
    stream: 'Provider SaaS Subscriptions',
    structure: 'Tiered monthly/annual plans: Free (listing) → Basic (calendar/reminders) → Premium (CRM, staff seats, analytics)',
    regulatorySafeguard: 'Clear value delivery; clinical ratings and verified status remain strictly unpurchasable.',
  },
  {
    stream: 'Featured & Sponsored Listings',
    structure: 'Paid promotional placement with distinct "Sponsored" badge',
    regulatorySafeguard: 'Ad density capped; banned medical cure claims prevented; sensitive clinical categories excluded.',
  },
  {
    stream: 'Memberships & Program Rev-Share',
    structure: 'Recurring health plans (gym, yoga, chronic care bundles) with UPI AutoPay',
    regulatorySafeguard: 'Strictly service-based bundles; framed to avoid triggering IRDAI insurance underwriting regulations.',
  },
  {
    stream: 'Equipment Rental & Medical Devices',
    structure: 'Take-rate on rental charges plus security deposit handling',
    regulatorySafeguard: 'Deposits managed through escrow/nodal channels; post-rental condition inspection workflows.',
  },
  {
    stream: 'B2B Corporate Wellness',
    structure: 'Per-employee-per-month corporate wellness and annual health checkup packages',
    regulatorySafeguard: 'Aggregated statistical reports only; zero individual employee health records exposed to employers.',
  },
];

export const CATEGORY_BENCHMARKS = {
  consult: {
    name: 'Doctor & Specialist Consultation',
    aov: 800,
    takeRatePercent: 12,
    gatewayFeePercent: 2,
    notifCost: 2,
    supportCost: 6,
    refundLeakagePercent: 1,
    targetFrequencyYr: 3,
  },
  lab: {
    name: 'Diagnostic Tests & Pathology',
    aov: 1200,
    takeRatePercent: 10,
    gatewayFeePercent: 2,
    notifCost: 2,
    supportCost: 8,
    refundLeakagePercent: 1,
    targetFrequencyYr: 2,
  },
  pharmacy: {
    name: 'Prescription & OTC Medicines',
    aov: 600,
    takeRatePercent: 5,
    gatewayFeePercent: 2,
    notifCost: 2,
    supportCost: 5,
    refundLeakagePercent: 1,
    targetFrequencyYr: 6,
  },
  home_nursing: {
    name: 'Home Nursing & Attendant Care',
    aov: 1500,
    takeRatePercent: 15,
    gatewayFeePercent: 2,
    notifCost: 3,
    supportCost: 12,
    refundLeakagePercent: 1,
    targetFrequencyYr: 4,
  },
  gym_yoga: {
    name: 'Gym & Yoga Memberships',
    aov: 2500,
    takeRatePercent: 15,
    gatewayFeePercent: 2,
    notifCost: 2,
    supportCost: 10,
    refundLeakagePercent: 2,
    targetFrequencyYr: 4,
  },
  equipment_rental: {
    name: 'Medical Equipment Rental',
    aov: 3000,
    takeRatePercent: 12,
    gatewayFeePercent: 2,
    notifCost: 3,
    supportCost: 15,
    refundLeakagePercent: 2,
    targetFrequencyYr: 2,
  },
  events: {
    name: 'Health Camps & Screening Events',
    aov: 500,
    takeRatePercent: 10,
    gatewayFeePercent: 2,
    notifCost: 2,
    supportCost: 4,
    refundLeakagePercent: 2,
    targetFrequencyYr: 2,
  },
};

/**
 * Calculates net contribution margin per booking in INR.
 */
export function calculateContributionMargin({
  aov,
  takeRatePercent,
  gatewayFeePercent = 2,
  notifCost = 2,
  supportCost = 6,
  refundLeakagePercent = 1,
}) {
  const safeAov = Number(aov) || 0;
  const revenue = safeAov * (Number(takeRatePercent) / 100);
  const gateway = safeAov * (Number(gatewayFeePercent) / 100);
  const refund = safeAov * (Number(refundLeakagePercent) / 100);
  const variableCosts = gateway + Number(notifCost) + Number(supportCost) + refund;
  const contribution = revenue - variableCosts;
  return {
    revenue: Math.round(revenue * 100) / 100,
    variableCosts: Math.round(variableCosts * 100) / 100,
    contribution: Math.round(contribution * 100) / 100,
    contributionMarginPercent: safeAov > 0 ? Math.round((contribution / safeAov) * 1000) / 10 : 0,
  };
}

/**
 * Calculates expected Patient Lifetime Value (LTV) in INR.
 */
export function calculatePatientLtv({
  contributionPerBooking,
  bookingsPerYear = 3,
  retentionYears = 2,
  reactivationCost = 0,
}) {
  const grossLtv = Number(contributionPerBooking) * Number(bookingsPerYear) * Number(retentionYears);
  const netLtv = grossLtv - Number(reactivationCost);
  return Math.max(0, Math.round(netLtv * 100) / 100);
}

/**
 * Calculates monthly break-even booking volume required to cover fixed overheads.
 */
export function calculateBreakEvenBookings({
  fixedCostsMonthly,
  subscriptionRevenueMonthly = 0,
  blendedContributionPerBooking,
}) {
  const netFixed = Math.max(0, Number(fixedCostsMonthly) - Number(subscriptionRevenueMonthly));
  const contribution = Number(blendedContributionPerBooking);
  if (contribution <= 0) return Infinity;
  return Math.ceil(netFixed / contribution);
}

/**
 * Calculates LTV:CAC health ratio and evaluation badge.
 */
export function calculateLtvCacRatio({ ltv, cac }) {
  const safeCac = Number(cac) || 0;
  const safeLtv = Number(ltv) || 0;
  if (safeCac <= 0) return { ratio: 0, status: 'unknown' };
  const ratio = Math.round((safeLtv / safeCac) * 10) / 10;
  let status = 'poor';
  if (ratio >= 4) status = 'excellent';
  else if (ratio >= 3) status = 'healthy';
  else if (ratio >= 1.5) status = 'fair';
  return { ratio, status };
}

export const LEGAL_COMMERCIAL_GUARDRAILS = [
  {
    rule: 'Prohibition of Doctor Referral Fees / Fee-Splitting',
    regulation: 'Indian Medical Council Regulations 2002 & NMC Telemedicine Guidelines',
    requirement: 'Marketplace fees must strictly represent platform technology, software facilitation, and calendar convenience. Per-referral kickbacks to medical practitioners are illegal.',
  },
  {
    rule: 'Escrow & Payment Aggregator Nodal Account Compliance',
    regulation: 'RBI Guidelines on Regulation of Payment Aggregators and Payment Gateways',
    requirement: 'Customer advances, security deposits, and booking payments cannot be pooled into proprietary company operating accounts; they must flow via licensed PA nodal/escrow accounts.',
  },
  {
    rule: 'E-Commerce Tax Deductions (TDS & GST)',
    regulation: 'Finance Act Section 194-O & Central Goods and Services Tax Act 2017',
    requirement: '18% GST applicable on platform commission revenues; Section 194-O TDS applicable to marketplace merchant payouts where mandatory.',
  },
  {
    rule: 'Consumer Protection & Price Transparency',
    regulation: 'Consumer Protection (E-Commerce) Rules 2020',
    requirement: 'Total payable price inclusive of taxes and convenience fees must be presented prior to payment; dark patterns and unconsented basket additions prohibited.',
  },
];
