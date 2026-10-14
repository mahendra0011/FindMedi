/**
 * Document 20 — Support & Operations Playbooks (SOPs, Escalation, Staffing)
 * Multi-tiered operating model, 17 Core SOPs, Channel SLAs, Ticket Taxonomy,
 * Sev-1 to Sev-4 Escalation Matrix, Pilot Staffing Model, and Standard Communication Templates.
 */

export const OPERATING_MODEL = {
  tiers: [
    {
      tier: 'Tier 0 — Self-Serve',
      description: 'Zero-touch resolution via comprehensive FAQs, safe rule-based triage chatbot, and real-time in-app status tracking.',
      coverage: '24x7 automated',
      escalationTrigger: 'User requests human agent or inputs safety/crisis keyword.',
    },
    {
      tier: 'Tier 1 — Frontline Support Agents',
      description: 'Multilingual human agents handling active booking inquiries, basic refund assistance, order status, and general FAQs.',
      coverage: '8:00 AM – 10:00 PM IST (7 days a week)',
      escalationTrigger: 'Financial discrepancy > ₹1,000, provider misconduct, safety/SOS alert, or unresolved after 15 minutes.',
    },
    {
      tier: 'Tier 2 — Functional Specialists',
      description: 'Dedicated functional desks: Payments & Refunds, Clinical Operations, Provider Success, and Trust & Safety / Moderation.',
      coverage: '9:00 AM – 8:00 PM IST + on-call rotation for emergencies',
      escalationTrigger: 'Suspected fraud ring, medical adverse event, statutory legal notice, or Sev-1/Sev-2 incident.',
    },
    {
      tier: 'Tier 3 — Leadership & Legal / Clinical Advisory',
      description: 'Incident Commanders, Engineering Leads, Legal Counsel, Data Protection Officer (DPO), and Part-Time Clinical Advisor.',
      coverage: '24x7 emergency war-room availability for Sev-1 incidents',
      escalationTrigger: 'Data breach, regulatory audit, clinical negligence claim, or severe patient safety incident.',
    },
  ],
  teams: [
    { name: 'Patient Support', responsibility: 'Booking and order issues, refund tracking, user guidance, initial grievance intake.' },
    { name: 'Provider Success', responsibility: 'Provider onboarding assistance, catalog quality, no-show coaching, provider-side dispute resolution.' },
    { name: 'Field Operations & Verification', responsibility: 'On-ground clinic visits, physical address checks, document verification, camp logistics.' },
    { name: 'KYC & Compliance Reviewers', responsibility: 'Provider application processing, council registry checks, license renewal monitoring.' },
    { name: 'Trust & Safety / Moderation', responsibility: 'Review moderation, fraud detection, patient safety investigations, crisis keyword escalations.' },
    { name: 'Finance Operations', responsibility: 'Payout runs, payment gateway reconciliations, TDS/GST compliance, dispute chargebacks.' },
    { name: 'Clinical Advisor', responsibility: 'Medical content review, adverse event triage, healthcare safety policy governance.' },
    { name: 'Incident Commander', responsibility: 'Rotating senior engineer/ops lead leading Sev-1/Sev-2 war room coordination.' },
    { name: 'Community & Events Ops', responsibility: 'Health camp approvals, organizer verification, screening camp execution support.' },
  ],
};

export const SUPPORT_CHANNELS_SLAS = {
  inAppChat: {
    channel: 'In-App Live Chat',
    hours: '8:00 AM – 10:00 PM IST (7 days a week)',
    firstResponseSla: '≤ 2 minutes (bot triage) / ≤ 10 minutes (human agent)',
    resolutionSla: 'Sev-3 issues: ≤ 24 hours',
  },
  phoneCallback: {
    channel: 'Inbound Phone / Callback Request',
    hours: '9:00 AM – 9:00 PM IST',
    firstResponseSla: 'Direct call wait ≤ 2 minutes / Callback initiated ≤ 30 minutes',
    resolutionSla: 'Within same business day',
  },
  whatsApp: {
    channel: 'Verified WhatsApp Business (Opt-in only)',
    hours: 'Business hours (9:00 AM – 8:00 PM IST)',
    firstResponseSla: '≤ 15 minutes',
    resolutionSla: '≤ 24 hours',
  },
  emailAndTickets: {
    channel: 'Email / Web Support Portal',
    hours: '24x7 intake',
    firstResponseSla: '≤ 4 hours',
    resolutionSla: '≤ 48 hours',
  },
  safetyAndSos: {
    channel: 'Safety & Emergency SOS Line',
    hours: '24x7 continuous coverage',
    firstResponseSla: 'Immediate (≤ 5 minutes)',
    resolutionSla: 'Per Emergency SOP (instant casualty escalation)',
  },
  providerPriority: {
    channel: 'Provider Dedicated Support Line',
    hours: 'Business hours + 24x7 priority line for live teleconsults',
    firstResponseSla: '≤ 1 hour',
    resolutionSla: '≤ 24 hours',
  },
  priorityQueueOrder: [
    '1. Safety / SOS Emergency Alerts',
    '2. Payments Stuck / Failed Deductions',
    '3. Active Bookings in Next 24 Hours',
    '4. Cancellation & Refund Requests',
    '5. General Inquiries & How-To Questions',
    '6. Feedback & Feature Suggestions',
  ],
};

export const TICKET_TAXONOMY = [
  {
    category: 'Safety / Emergency',
    examples: 'SOS button trigger, home-visit misconduct, ambulance dispatch delay',
    routingQueue: 'Trust & Safety + Incident Commander',
    targetSla: 'Immediate (≤ 5 mins)',
    severity: 'Sev-1',
  },
  {
    category: 'Booking & Scheduling',
    examples: 'Unable to reserve slot, doctor running late, doctor no-show, reschedule request',
    routingQueue: 'Tier 1 Support → Provider Success',
    targetSla: '≤ 4 hours',
    severity: 'Sev-3',
  },
  {
    category: 'Payments & Refunds',
    examples: 'Amount debited but booking pending, refund delay, coupon discount not applied',
    routingQueue: 'Finance Operations Desk',
    targetSla: '24 – 48 hours',
    severity: 'Sev-2 / Sev-3',
  },
  {
    category: 'Pharmacy & Medicine Orders',
    examples: 'Wrong medication received, damaged package, prescription rejected by pharmacist',
    routingQueue: 'Support Desk + Fulfilling Pharmacy Partner',
    targetSla: '4 – 12 hours (Wrong medicine: Immediate)',
    severity: 'Sev-2',
  },
  {
    category: 'Health Records & Privacy (DSR)',
    examples: 'Data export request, consent revocation, record deletion request, incorrect document',
    routingQueue: 'Data Protection Officer (DPO) Queue',
    targetSla: 'Within statutory DPDP SLA (72 hours ack)',
    severity: 'Sev-2',
  },
  {
    category: 'Service Quality & Disputes',
    examples: 'Substandard consultation, unexpected fee charged at clinic, cleanliness complaint',
    routingQueue: 'Disputes & Grievance Desk',
    targetSla: '≤ 3 business days',
    severity: 'Sev-3',
  },
  {
    category: 'Provider Onboarding & KYC',
    examples: 'Document verification status, license rejection appeal, bank account update',
    routingQueue: 'KYC Reviewer / Provider Success',
    targetSla: '≤ 24 hours',
    severity: 'Sev-3',
  },
  {
    category: 'Technical & Platform Bugs',
    examples: 'App crash, OTP delivery failure, WebRTC video black screen',
    routingQueue: 'Support → Engineering Triage',
    targetSla: '≤ 24 hours',
    severity: 'Sev-2 / Sev-3',
  },
  {
    category: 'Legal, Content & Takedown',
    examples: 'Copyright infringement notice, defamatory review takedown, regulatory notice',
    routingQueue: 'Legal & Statutory Compliance Desk',
    targetSla: '24 hours acknowledgement',
    severity: 'Sev-2',
  },
  {
    category: 'Feedback & Suggestions',
    examples: 'Feature requests, usability feedback, praise for provider',
    routingQueue: 'Product Operations Inbox',
    targetSla: 'Weekly review cadence',
    severity: 'Sev-4',
  },
];

export const CORE_SOPS = [
  {
    id: 'SOP-01',
    title: 'Booking Issue (Provider No-Show, Late Arrival or Sudden Cancellation)',
    trigger: 'Patient reports doctor not joined video call or clinic closed upon arrival.',
    steps: [
      '1. Verify appointment logs, provider join timestamps, and chat transcripts.',
      '2. If provider no-show confirmed: initiate automated 100% refund immediately to original payment source.',
      '3. Issue complimentary ₹150 patient goodwill wallet credit for immediate rebooking.',
      '4. Offer top 2 alternate verified providers with open slots within next 2 hours.',
      '5. Record formal strike against provider profile; notify Provider Success for coaching.',
      '6. If acute clinical symptoms indicated, immediately provide national emergency numbers (112/108).',
    ],
  },
  {
    id: 'SOP-02',
    title: 'Payment Debited but Booking Failed to Confirm',
    trigger: 'Patient bank account debited but appointment remains in PENDING status.',
    steps: [
      '1. Query payment gateway API using transaction reference / order ID.',
      '2. If payment captured and slot remains vacant: run automated reconciliation to transition booking to CONFIRMED.',
      '3. If slot was claimed by another user: immediately process full refund and notify patient with ARN reference.',
      '4. Transmit status confirmation SMS within 60 minutes.',
      '5. Log payment anomaly in accounting ledger for daily gateway reconciliation.',
    ],
  },
  {
    id: 'SOP-03',
    title: 'General Refund Request Execution',
    trigger: 'Patient requests appointment or service cancellation with refund.',
    steps: [
      '1. Retrieve immutable cancellation policy snapshot captured at time of booking.',
      '2. Apply refund matrix: >2h prior = 100% refund; <2h prior = provider policy deduction applied.',
      '3. Process refund through Razorpay / gateway escrow API.',
      '4. Generate statutory credit note with GST adjustment.',
      '5. Transmit refund reference number (ARN) to patient with 3–7 business days timeline.',
    ],
  },
  {
    id: 'SOP-04',
    title: 'Pharmacy Order Discrepancy & Wrong Drug Dispensation',
    trigger: 'Patient reports wrong medicine, expired batch, or missing tablet blister.',
    steps: [
      '1. Request high-resolution photo of medicine packaging, batch number, and invoice.',
      '2. If wrong drug or expired batch delivered: classify as Sev-2 Clinical Safety Incident immediately.',
      '3. Instruct patient NOT to consume medicine under any circumstances.',
      '4. Flag fulfilling pharmacy store; lock batch from digital inventory across platform.',
      '5. Dispatch correct replacement order via priority runner or issue 100% immediate refund.',
      '6. Clinical advisor reviews incident and files report with pharmacy licensing compliance officer.',
    ],
  },
  {
    id: 'SOP-05',
    title: 'Home-Visit Emergency & Physical Safety Incident',
    trigger: 'SOS alert triggered during home nursing, phlebotomy, or elder attendant visit.',
    steps: [
      '1. Immediate emergency outbound call to patient and provider (within ≤ 3 minutes).',
      '2. If imminent physical danger or medical collapse: dial emergency police/ambulance (112/108) with live GPS.',
      '3. Automatically suspend provider active status pending formal safety investigation.',
      '4. Preserve all telemetry: GPS track, app communication logs, and call audio metadata.',
      '5. Trust & Safety lead convenes formal incident review within 24 hours.',
      '6. File formal police complaint assistance and offer trauma counseling support resources.',
    ],
  },
  {
    id: 'SOP-06',
    title: 'Mental Health Crisis & Self-Harm Keyword Escalation',
    trigger: 'Chat or support message contains suicide, self-harm, or acute violence keywords.',
    steps: [
      '1. Automated safety bot immediately halts standard flow and alerts 24x7 on-call safety specialist.',
      '2. Display prominent emergency mental health helpline banner: Tele-MANAS (14416) & National Helpline (112).',
      '3. On-call specialist reviews context within ≤ 5 minutes and executes empathetic, non-judgmental outreach script.',
      '4. Verify if patient is in a safe location with someone nearby.',
      '5. Offer immediate connection to on-duty psychiatrist or clinical crisis counselor.',
      '6. Never ban or penalize account; document interaction in confidential safety audit ledger.',
    ],
  },
  {
    id: 'SOP-07',
    title: 'Patient-Provider Service Dispute Resolution',
    trigger: 'Patient files formal complaint regarding poor service quality or extra cash demands.',
    steps: [
      '1. Open dispute case in CRM workbench; place temporary hold on payout portion for disputed booking.',
      '2. Request detailed statements and evidence from both patient and provider within 48-hour window.',
      '3. Grievance officer reviews clinical notes, consultation duration, and billing breakdown.',
      '4. Render binding determination per platform terms (full refund, partial credit, or claim dismissal).',
      '5. Provide both parties with 7-day appeal window before closing dispute ledger.',
    ],
  },
  {
    id: 'SOP-08',
    title: 'Provider Onboarding Verification & Dual-Approval Lane',
    trigger: 'New practitioner or medical facility completes join application wizard.',
    steps: [
      '1. Verify state medical council / dental council registration on statutory NMC/DCI verification portals.',
      '2. Validate clinical establishment certificate, drug license (Form 20/21), and GSTIN/PAN.',
      '3. Run ClamAV automated malware scan and duplicate registration detector on all uploaded documents.',
      '4. For high-risk categories (IVF, Dialysis, Elder-Care): route through mandatory Two-Person Approval lane.',
      '5. Conduct physical field verification visit or live video geo-tagged clinic inspection.',
      '6. Activate live listing on 30-day initial probation with payout reserve hold.',
    ],
  },
  {
    id: 'SOP-09',
    title: 'Provider Document Expiration & Automated Re-Verification',
    trigger: 'Doctor license, clinic establishment permit, or indemnity insurance nears expiry.',
    steps: [
      '1. Trigger automated re-verification notifications at 60-day, 30-day, and 7-day milestones.',
      '2. Provider uploads renewed document via Provider Portal.',
      '3. KYC reviewer audits renewed certificate within 24 hours SLA.',
      '4. If document expires without renewal: automatically delist provider from public search discovery.',
      '5. Existing confirmed bookings are honored or reassigned; no new appointments can be booked until renewed.',
    ],
  },
  {
    id: 'SOP-10',
    title: 'Fraud Detection, Review Manipulation & Slot Hoarding',
    trigger: 'Unusual booking spikes, coupon redemption from duplicate device fingerprints, or fake 5-star reviews.',
    steps: [
      '1. Fraud detection engine applies shadow-flagging to suspicious account.',
      '2. Trust & Safety officer inspects IP addresses, device hashes, and payment instrument links.',
      '3. If review manipulation detected: permanently purge fraudulent reviews and deduct provider trust score.',
      '4. If slot hoarding detected: cancel bot-reserved slots and enforce rate-limiting on offending IP.',
      '5. For organized fraud syndicates: black-list phone/PAN and escalate to legal counsel.',
    ],
  },
  {
    id: 'SOP-11',
    title: 'Content & User-Generated Review Moderation',
    trigger: 'User posts medical review containing offensive language, doctor defamation, or miracle cure claims.',
    steps: [
      '1. Review routed to moderation queue with severity score.',
      '2. Check against Drugs & Magic Remedies Act policy (strictly zero tolerance for guaranteed cure claims).',
      '3. Mask patient sensitive clinical details accidentally disclosed in public review text.',
      '4. Approve genuine patient feedback; reject abusive or unsubstantiated defamatory claims.',
      '5. Provide user with clear rejection justification and opportunity to edit and resubmit.',
    ],
  },
  {
    id: 'SOP-12',
    title: 'DPDP Data Subject Rights (DSR) & Personal Data Erasure',
    trigger: 'User submits personal data access, export, or right-to-be-forgotten request.',
    steps: [
      '1. Authenticate user identity via OTP and secondary identity verification check.',
      '2. Classify request type: Data Access, Data Portability Export, or Personal Data Erasure.',
      '3. Compile encrypted ZIP archive containing all personal health records, bookings, and profile data within 72 hours.',
      '4. If Erasure requested: purge personal profile data while preserving statutory tax and financial ledger entries.',
      '5. Propagate erasure tokens to downstream processors (Sentry, PostHog, notification logs).',
      '6. Transmit formal compliance confirmation certificate to data principal.',
    ],
  },
  {
    id: 'SOP-13',
    title: 'Security Breach & Data Incident Escalation',
    trigger: 'Suspected unauthorized data access, compromised API credentials, or cyber attack.',
    steps: [
      '1. Immediately isolate compromised systems, revoke active authentication tokens, and snapshot server logs.',
      '2. Convene emergency War Room with Incident Commander, CTO, and Data Protection Officer (DPO).',
      '3. File statutory incident notification with CERT-In within the mandatory 6-hour reporting window.',
      '4. Assess whether sensitive personal health data was impacted; notify Data Protection Board of India per DPDP Act.',
      '5. Publish transparent security advisory to affected users with actionable protective steps.',
      '6. Conduct blameless postmortem and implement permanent architectural controls.',
    ],
  },
  {
    id: 'SOP-14',
    title: 'Community Screening Camps & Health Event Operations',
    trigger: 'Partner facility requests approval to host free neighborhood cardiac/diabetes camp.',
    steps: [
      '1. Verify organizer credentials, partner clinic medical license, and on-site emergency casualty plan.',
      '2. Validate patient informed consent forms for community screening data capture.',
      '3. Issue unique digital event tickets with encrypted verification QR codes.',
      '4. Provide camp staff with mobile app offline check-in queue for high-volume entry management.',
      '5. Ensure all collected test results and screening vitals sync securely to patient health lockers.',
      '6. Publish post-event clinical report and audit compliance documentation.',
    ],
  },
  {
    id: 'SOP-15',
    title: 'Finance Payouts, Reconciliation & Dispute Escrow',
    trigger: 'Weekly provider settlement payout cycle.',
    steps: [
      '1. Run daily automated reconciliation between payment gateway settlement logs and internal booking ledger.',
      '2. Calculate gross consult fee, platform commission, 194-O TDS deduction, and GST liability.',
      '3. Freeze payouts associated with open patient disputes or active probationary investigations.',
      '4. Enforce mandatory Dual-Person Approval for aggregate provider payouts exceeding ₹1,00,000 threshold.',
      '5. Dispatch bank transfer via automated Razorpay Route / Payouts API.',
      '6. Transmit itemized payout statement and Form 16A TDS certificate to provider.',
    ],
  },
  {
    id: 'SOP-16',
    title: 'Provider Delisting, Suspension & Orderly Offboarding',
    trigger: 'Provider requests offboarding, commits gross clinical violation, or fails license re-verification.',
    steps: [
      '1. Send formal notice of suspension with specific justification and 7-day appeal mechanism.',
      '2. Instantly delist provider profile from public search index and booking calendar.',
      '3. Audit upcoming scheduled appointments: automatically reassign to approved partner or process 100% refund.',
      '4. Settle pending completed booking payouts minus verified dispute penalties.',
      '5. Maintain historical patient consultation records and prescriptions for mandatory 3-year statutory medical retention period.',
    ],
  },
  {
    id: 'SOP-17',
    title: 'Platform Outage, Degraded Mode & Status Communication',
    trigger: 'Critical infrastructure failure, cloud provider outage, or payment gateway downtime.',
    steps: [
      '1. Update public status page within ≤ 15 minutes of verified platform degradation.',
      '2. Activate Degraded Mode: serve cached read-only booking schedule and local offline emergency casualty numbers.',
      '3. Queue non-urgent notifications in Redis backpressure buffer; suppress non-critical marketing alerts.',
      '4. Equip support team with pre-approved outage explanation macros and proactive customer outreach scripts.',
      '5. Upon restoration: run automated data integrity sweep and credit patient compensation vouchers if appointments were disrupted.',
    ],
  },
];

export const ESCALATION_MATRIX = {
  SEV_1: {
    level: 'Sev-1 — Critical Emergency',
    definition: 'Direct patient life-safety risk, verified data breach, total platform outage, or complete payment/SOS failure.',
    team: 'Incident Commander, CTO, Founder, Legal Counsel, and Data Protection Officer (DPO).',
    responseCadence: 'Immediate response (≤ 5 mins); live emergency war-room; stakeholder updates every 30 minutes.',
  },
  SEV_2: {
    level: 'Sev-2 — Major Service Disruption',
    definition: 'Core clinical flow broken (e.g., video calls failing across platform, wrong medicine delivery, mass booking failure).',
    team: 'Engineering Lead, Support Operations Lead, and Lead Clinical Advisor.',
    responseCadence: 'Response within ≤ 1 hour; hotfix mobilization; status updates hourly until resolved.',
  },
  SEV_3: {
    level: 'Sev-3 — Moderate / Individual Disruption',
    definition: 'Single patient booking dispute, delayed refund, individual provider KYC issue, or localized UI glitch.',
    team: 'Tier 1 Support Agents and Functional Specialists (Tier 2).',
    responseCadence: 'Initial response within 2–4 hours; resolution within ≤ 1 business day.',
  },
  SEV_4: {
    level: 'Sev-4 — Minor / Cosmetic',
    definition: 'Cosmetic text error, feature suggestion, general feedback, or non-blocking minor bug.',
    team: 'Product Management & Backlog Grooming.',
    responseCadence: 'Triaged during weekly sprint planning cadence.',
  },
};

export const STAFFING_MODEL = {
  pilotCityS0: {
    phase: 'S0 — Pilot (Single City Launch)',
    assumedVolume: '100–300 bookings/day, 50–150 active providers',
    teamAllocation: [
      { role: 'Frontline Support Agents (Hindi/English)', count: '2 – 4 agents (covering 8am–10pm in shifts)', duty: 'Chat, inbound calls, order tracking' },
      { role: 'Provider Success Executive', count: '1 – 2 executives', duty: 'Onboarding support, clinic visits, calendar training' },
      { role: 'KYC & Verification Reviewer', count: '1 – 2 reviewers', duty: 'Council checks, license audits, physical verifications' },
      { role: 'Field Operations Officers', count: '2 – 3 field executives', duty: 'Physical clinic inspections, QR kit distribution, camp ops' },
      { role: 'Trust & Safety / Moderator', count: '1 specialist (with on-call crisis roster)', duty: 'Review moderation, fraud check, crisis keyword escalation' },
      { role: 'Finance Operations Specialist', count: '1 specialist (part-time to full-time)', duty: 'Weekly payouts, gateway reconciliations, disputes' },
      { role: 'Support Lead / Operations Manager', count: '1 full-time manager', duty: 'Workforce scheduling, QA scorecards, escalation commander' },
      { role: 'Lead Clinical Advisor', count: '1 part-time physician (MD/MS)', duty: 'Adverse event reviews, medical content sign-off, triage safety' },
    ],
  },
  growthTriggers: [
    { trigger: 'Inbound tickets exceed 80 tickets/agent/day', action: 'Hire +1 Frontline Support Agent' },
    { trigger: 'Active providers exceed 150 providers/manager', action: 'Hire +1 Provider Success Executive' },
    { trigger: 'KYC review queue waiting time exceeds 18 hours', action: 'Hire +1 KYC Reviewer' },
    { trigger: 'New city expansion announced', action: 'Deploy dedicated local Field Operations cell (3 executives)' },
  ],
};

export const COMMUNICATION_TEMPLATES = {
  ticketAcknowledgement: {
    key: 'ticketAcknowledgement',
    name: 'Standard Ticket Intake Acknowledgement',
    template: 'Namaste {patientName}, we have received your request (Ref: #{ticketId}). Our team is reviewing it and will update you within {slaWindow}. If you are facing a life-threatening medical emergency, please immediately call 112 or 108.',
  },
  providerNoShowApology: {
    key: 'providerNoShowApology',
    name: 'Provider No-Show Apology & Goodwill Credit',
    template: 'Dear {patientName}, we sincerely apologize that Dr. {providerName} could not join your scheduled appointment. We have initiated a 100% refund of ₹{refundAmount} to your {paymentMethod} (Ref: #{arnNumber}) and added ₹150 FindMedi wallet credit to your account. Here are two verified alternative specialists available today: {alternativeLink}',
  },
  refundInitiated: {
    key: 'refundInitiated',
    name: 'Refund Processing Notification',
    template: 'Namaste {patientName}, your refund of ₹{refundAmount} for Appointment #{bookingId} has been successfully processed. Transaction ARN: {arnNumber}. The funds should reflect in your bank account / UPI within 3 to 7 business days.',
  },
  crisisOutreach: {
    key: 'crisisOutreach',
    name: 'Mental Health Crisis Compassionate Script (Trained Staff Only)',
    template: 'Hello {userName}, I am {agentName} from the FindMedi care team. I noticed your recent message and I want you to know that we care about your wellbeing. Are you in a safe place right now? If you are in immediate danger or feeling overwhelmed, please dial 112 or connect immediately with government counselors at Tele-MANAS (Toll-Free 14416). We are here to support you.',
  },
  privacyVerification: {
    key: 'privacyVerification',
    name: 'Data Subject Privacy Verification Challenge',
    template: 'To protect your health data privacy and fulfill your request #{ticketId}, please confirm your registered year of birth and the date of your last appointment. Reminder: FindMedi staff will NEVER ask you for your OTP, password, or UPI PIN.',
  },
};

export const OPS_LAUNCH_CHECKLIST = [
  'Helpdesk ticketing platform configured with strict SLA timers, macros, and skill-based routing',
  'Frontline support team trained on privacy handling, medical crisis escalation, and refund rules',
  '24x7 incident roster established with clinical advisor and legal counsel contact details',
  'All 17 Core SOPs reviewed with dry-run drills conducted for safety alerts and payment discrepancies',
  'Mandatory Two-Person Approval lane operational for high-risk provider KYC verifications',
  'Finance payout reconciliation pipeline validated with secondary approval on high-value transfers',
  'Automated review moderation rules active with zero-tolerance checks for miracle cure claims',
  'Statutory Grievance Officer details published with DSR export pipeline verified',
  'Public status page and offline degraded mode emergency dialers tested',
  'Real-time operations dashboards active for support response time, booking no-shows, and safety incidents',
];

/**
 * Returns the matching SOP details by its ID (e.g. 'SOP-01', 'SOP-05').
 */
export function getSopDetails(sopId) {
  const normalized = String(sopId).toUpperCase();
  const match = CORE_SOPS.find((s) => s.id === normalized);
  if (!match) {
    return { found: false, message: `SOP with ID "${sopId}" not found.` };
  }
  return { found: true, sop: match };
}

/**
 * Determines appropriate support routing queue and SLA for a ticket.
 */
export function routeSupportTicket(category, isEmergency = false) {
  if (isEmergency) {
    return {
      category: 'Safety / Emergency',
      routingQueue: 'Trust & Safety + Incident Commander',
      targetSla: 'Immediate (≤ 5 mins)',
      severity: 'Sev-1',
      isEmergency: true,
      action: 'TRIGGER_EMERGENCY_WAR_ROOM',
    };
  }

  const match = TICKET_TAXONOMY.find(
    (t) => t.category.toLowerCase().includes(String(category).toLowerCase())
  );

  if (match) {
    return {
      category: match.category,
      routingQueue: match.routingQueue,
      targetSla: match.targetSla,
      severity: match.severity,
      isEmergency: false,
      action: 'DISPATCH_TO_SPECIALIST_QUEUE',
    };
  }

  return {
    category: 'General Inquiry',
    routingQueue: 'Tier 1 Frontline Support',
    targetSla: '≤ 4 hours',
    severity: 'Sev-3',
    isEmergency: false,
    action: 'STANDARD_QUEUE_DISPATCH',
  };
}

/**
 * Fills variables into a pre-approved communication template safely.
 */
export function renderCommunicationTemplate(templateKey, variables = {}) {
  const item = COMMUNICATION_TEMPLATES[templateKey];
  if (!item) {
    return { success: false, message: `Template "${templateKey}" not found.` };
  }

  let text = item.template;
  for (const [k, v] of Object.entries(variables)) {
    text = text.replaceAll(`{${k}}`, String(v || ''));
  }

  return {
    success: true,
    templateKey,
    name: item.name,
    renderedText: text,
  };
}
