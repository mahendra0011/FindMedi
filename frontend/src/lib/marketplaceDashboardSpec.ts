/**
 * File 48 (Part B) — Marketplace, provider & patient-adjacent role dashboards.
 *
 * Provider dashboards are mobile-first and payout-aware; sensitive verticals
 * (mental health, fertility, maternity, child development) carry extra consent
 * alerts. KPI values start as em-dashes and are filled only from live payloads.
 */
import type { HmsDashboardConfig } from './hmsDashboardSpec';
import { buildDashboardSpec } from './platformTrustDashboardSpec';

export const MARKETPLACE_SPECS: Record<string, HmsDashboardConfig> = {
  pharmacy_owner: buildDashboardSpec({
    roleKey: 'pharmacy_owner',
    title: 'Pharmacy Owner Dashboard',
    subtitle: 'Sales, margin, expiry loss, vendors and online orders',
    permissions: ['pharmacy:business', 'inventory:read', 'finance:read'],
    sidebarSections: ['Dashboard', 'Sales', 'Stock', 'Vendors', 'Compliance'],
    layer: 4,
    layerName: 'Pharmacy & Diagnostics',
    kpis: [
      ['Sales MTD', 'Sales month-to-date'],
      ['Gross Margin', 'Margin percentage month-to-date'],
      ['Expiry Loss', 'Value lost to expiry this month'],
      ['Stock Value', 'Inventory value at cost'],
      ['Online Orders', 'Marketplace orders this month'],
      ['Vendor Payables', 'Outstanding vendor payables'],
    ],
    tasks: [
      'Review reorder suggestions for fast movers',
      'Approve near-expiry return proposals',
      'Verify vendor invoices against purchase orders',
    ],
    alerts: [
      ['Dead stock ageing above 90 days', 'warn'],
      ['Drug licence expiring soon', 'urgent'],
    ],
    workQueues: ['Reorder Suggestions', 'Near-Expiry Stock', 'Vendor Invoices', 'Refund Requests'],
    quickActions: ['Create Purchase Order', 'Approve Return', 'View Licence', 'Open Sales Report'],
    domainModules: [
      ['sales', '📈', 'Sales & Margin', 'ABC-VED analysis and category performance.', 'Open Sales', '/pharmacy-business/dashboard'],
      ['vendors', '🚚', 'Vendor Scorecard', 'KYC status, payables and delivery reliability.', 'Open Vendors', '/inventory/vendors'],
    ],
  }),

  physiotherapist: buildDashboardSpec({
    roleKey: 'physiotherapist',
    title: 'Physiotherapist Dashboard',
    subtitle: 'Sessions, treatment plans, outcome scales and packages',
    permissions: ['physio:sessions', 'physio:plans'],
    sidebarSections: ['Dashboard', 'Sessions', 'Plans', 'Outcomes'],
    kpis: [
      ['Sessions Today', 'Booked physiotherapy sessions today'],
      ['Active Plans', 'Treatment plans in progress'],
      ['Outcome Improvement', 'Average Barthel/FIM improvement'],
      ['Package Sessions Left', 'Prepaid sessions remaining'],
    ],
    tasks: [
      'Review home-exercise adherence for active plans',
      'Update outcome scores after each session',
      'Flag missed sessions for follow-up',
    ],
    alerts: [
      ['High-risk patient missed a session', 'urgent'],
      ['Treatment plan review overdue', 'warn'],
    ],
    workQueues: ['Session List', 'Home-Exercise Plans', 'Outcome Reviews', 'Missed Sessions'],
    quickActions: ['Start Session', 'Update Plan', 'Record Outcome Score', 'Book Follow-Up'],
    domainModules: [
      ['sessions', '🧑‍⚕️', 'Session Board', 'Daily session list with plan context.', 'Open Sessions', '/physio'],
      ['outcomes', '📏', 'Outcome Scales', 'Barthel, FIM and range-of-motion trends.', 'Open Outcomes', '/physio?tab=outcomes'],
    ],
  }),

  counsellor: buildDashboardSpec({
    roleKey: 'counsellor',
    title: 'Counsellor Dashboard',
    subtitle: 'Sessions, risk flags and supervision (sensitive records)',
    permissions: ['mental_health:sessions', 'mental_health:notes'],
    sidebarSections: ['Dashboard', 'Sessions', 'Risk', 'Supervision'],
    kpis: [
      ['Sessions Today', 'Counselling sessions scheduled today'],
      ['Follow-Ups Due', 'Follow-up sessions due'],
      ['High-Risk Flags', 'Clients with active risk flags'],
      ['Earnings MTD', 'Counsellor earnings month-to-date'],
    ],
    tasks: [
      'Review high-risk flags before starting sessions',
      'Complete session notes within the confidentiality window',
      'Attend scheduled supervision review',
    ],
    alerts: [
      ['Client risk flag raised', 'urgent'],
      ['High-risk client missed follow-up', 'urgent'],
    ],
    workQueues: ['Today Sessions', 'Risk Flag Review', 'Supervision Queue', 'Care Plans'],
    quickActions: ['Start Session', 'Record Risk Assessment', 'Escalate To Supervisor', 'Open Care Plan'],
    domainModules: [
      ['sessions', '🛋️', 'Session Board', 'Locked psychotherapy notes with consent context.', 'Open Sessions', '/mind/counsellor'],
      ['risk', '🚩', 'Risk Register', 'Risk flags and crisis protocol steps.', 'Open Risk', '/mind/counsellor?tab=risk'],
    ],
  }),

  mid_level_counselor: buildDashboardSpec({
    roleKey: 'mid_level_counselor',
    title: 'Mid-Level Counsellor Dashboard',
    subtitle: 'Sessions, risk escalation and senior supervision review',
    permissions: ['mental_health:sessions', 'mental_health:notes'],
    sidebarSections: ['Dashboard', 'Sessions', 'Risk', 'Supervision'],
    kpis: [
      ['Sessions Today', 'Counselling sessions scheduled today'],
      ['High-Risk Flags', 'Clients with active risk flags'],
      ['Pending Supervision', 'Cases awaiting senior review'],
      ['Follow-Ups Due', 'Follow-up sessions due'],
    ],
    tasks: [
      'Queue complex cases for senior supervision',
      'Review risk flags before each session',
      'Submit session notes for supervision sign-off',
    ],
    alerts: [
      ['High-risk case requires senior review', 'urgent'],
      ['Supervision review overdue', 'warn'],
    ],
    workQueues: ['Today Sessions', 'Risk Flag Review', 'Supervision Escalations', 'Care Plans'],
    quickActions: ['Start Session', 'Escalate To Senior', 'Record Risk Assessment', 'Request Supervision'],
    domainModules: [
      ['sessions', '🛋️', 'Session Board', 'Session list with supervision markers.', 'Open Sessions', '/mind/counsellor'],
      ['supervision', '👥', 'Supervision Queue', 'Cases escalated for senior review.', 'Open Supervision', '/mind/counsellor?tab=supervision'],
    ],
  }),

  senior_counselor: buildDashboardSpec({
    roleKey: 'senior_counselor',
    title: 'Senior Counsellor Dashboard',
    subtitle: 'Complex cases, risk oversight and supervision of mid-level counsellors',
    permissions: ['mental_health:sessions', 'mental_health:supervision'],
    sidebarSections: ['Dashboard', 'Sessions', 'Supervision', 'Risk Oversight'],
    kpis: [
      ['Sessions Today', 'Senior counselling sessions today'],
      ['Supervision Pending', 'Cases awaiting senior sign-off'],
      ['High-Risk Caseload', 'Active high-risk clients under care'],
      ['Follow-Ups Due', 'Follow-up sessions due'],
    ],
    tasks: [
      'Review mid-level counsellor escalations',
      'Approve care plans for complex cases',
      'Audit risk documentation for the caseload',
    ],
    alerts: [
      ['Suicide-risk flag on the caseload', 'urgent'],
      ['Mid-level supervision SLA breach', 'warn'],
    ],
    workQueues: ['Today Sessions', 'Supervision Sign-offs', 'High-Risk Caseload', 'Care Plan Reviews'],
    quickActions: ['Start Session', 'Approve Care Plan', 'Open Supervision', 'Escalate To Crisis Team'],
    domainModules: [
      ['supervision', '👥', 'Supervision Desk', 'Review and sign off mid-level cases.', 'Open Supervision', '/mind/counsellor?tab=supervision'],
      ['risk', '🚩', 'Risk Oversight', 'Caseload-wide risk flags and crisis protocol.', 'Open Risk', '/mind/counsellor?tab=risk'],
    ],
  }),

  psychiatrist: buildDashboardSpec({
    roleKey: 'psychiatrist',
    title: 'Psychiatrist Dashboard',
    subtitle: 'Sessions, risk assessment, outcome scales and restricted records',
    permissions: ['mental_health:sessions', 'mental_health:prescribe'],
    sidebarSections: ['Dashboard', 'Sessions', 'Risk', 'Care Plans', 'Scales'],
    kpis: [
      ['Sessions Today', 'Psychiatric sessions scheduled today'],
      ['PHQ-9 Trend', 'Depression scale trend for the caseload'],
      ['GAD-7 Trend', 'Anxiety scale trend for the caseload'],
      ['High-Risk Patients', 'Patients with active high-risk flags'],
      ['No-Shows', 'Missed appointments this week'],
    ],
    tasks: [
      'Review outcome scale trends before medication changes',
      'Document risk assessment for high-risk patients',
      'Update care plans after each session',
    ],
    alerts: [
      ['Suicide-risk flag raised', 'urgent'],
      ['High-risk patient missed follow-up', 'urgent'],
    ],
    workQueues: ['Session List', 'Risk Flag Review', 'Care Plans', 'Medication Reviews'],
    quickActions: ['Start Session', 'Record Scale', 'Update Care Plan', 'Open Crisis Protocol'],
    domainModules: [
      ['sessions', '🧠', 'Session Board', 'Sessions with restricted-sensitivity records.', 'Open Sessions', '/mind/psychiatrist'],
      ['scales', '📊', 'Outcome Scales', 'PHQ-9 and GAD-7 trends with consent context.', 'Open Scales', '/mind/psychiatrist?tab=scales'],
    ],
  }),

  technician: buildDashboardSpec({
    roleKey: 'technician',
    title: 'Technician Dashboard',
    subtitle: 'Assigned field tasks, response times and proof of completion',
    permissions: ['tasks:execute'],
    sidebarSections: ['Dashboard', 'Tasks', 'History'],
    kpis: [
      ['Tasks Assigned', 'Open tasks assigned today'],
      ['Tasks Completed', 'Tasks completed today'],
      ['Avg Response Time', 'Average task acceptance time'],
      ['Overdue Tasks', 'Tasks past their due time'],
    ],
    tasks: [
      'Accept urgent tasks within the response window',
      'Upload proof of completion for each task',
      'Report blocked tasks to the coordinator',
    ],
    alerts: [
      ['Urgent task unaccepted past SLA', 'urgent'],
      ['Task proof missing on closure', 'warn'],
    ],
    workQueues: ['My Tasks', 'Urgent Tasks', 'Overdue Tasks', 'Completed Today'],
    quickActions: ['Accept Task', 'Mark In Progress', 'Upload Proof', 'Report Issue'],
    domainModules: [
      ['tasks', '🛠️', 'Work Tasks', 'Scan-proof task cards with SLA timers.', 'Open Tasks', '/dashboard'],
    ],
  }),

  helper: buildDashboardSpec({
    roleKey: 'helper',
    title: 'Helper Dashboard',
    subtitle: 'Assigned support tasks and transport requests',
    permissions: ['tasks:execute'],
    sidebarSections: ['Dashboard', 'Tasks', 'Transport'],
    kpis: [
      ['Tasks Assigned', 'Open helper tasks'],
      ['Tasks Completed', 'Tasks completed today'],
      ['Transports Pending', 'Pending patient/equipment transports'],
      ['Overdue Tasks', 'Tasks past due'],
    ],
    tasks: [
      'Accept assigned tasks from the ward console',
      'Confirm pick-up and drop-off with scan proof',
      'Escalate blocked transports to the coordinator',
    ],
    alerts: [
      ['STAT task not accepted', 'urgent'],
      ['Transport waiting above SLA', 'warn'],
    ],
    workQueues: ['My Tasks', 'Transport Requests', 'Urgent Tasks', 'Completed Today'],
    quickActions: ['Accept Task', 'Mark Picked Up', 'Mark Delivered', 'Report Issue'],
    domainModules: [
      ['tasks', '🧰', 'Task Cards', 'Ward tasks with scan proof.', 'Open Tasks', '/dashboard'],
      ['transport', '🚶', 'Transport Board', 'Patient and sample movement requests.', 'Open Transport', '/dashboard'],
    ],
  }),

  delivery_boy: buildDashboardSpec({
    roleKey: 'delivery_boy',
    title: 'Delivery Partner Dashboard',
    subtitle: 'Assigned medicine and lab-sample deliveries with OTP handover',
    permissions: ['delivery:execute', 'earnings:read'],
    sidebarSections: ['Dashboard', 'Deliveries', 'Earnings'],
    kpis: [
      ['Deliveries Today', 'Assigned deliveries for today'],
      ['On-Time %', 'Deliveries completed within SLA'],
      ['Earnings MTD', 'Delivery earnings month-to-date'],
      ['COD Pending', 'Cash-on-delivery to reconcile'],
    ],
    tasks: [
      'Accept assigned deliveries promptly',
      'Verify OTP at handover',
      'Flag cold-chain items for priority handling',
    ],
    alerts: [
      ['Delivery overdue against SLA', 'urgent'],
      ['Cold-chain item in the queue', 'warn'],
    ],
    workQueues: ['Assigned Deliveries', 'Cold-Chain Deliveries', 'COD Reconciliation', 'Completed Today'],
    quickActions: ['Accept Delivery', 'Mark Picked Up', 'Complete With OTP', 'Open Earnings'],
    domainModules: [
      ['deliveries', '🛵', 'Delivery Queue', 'Route map with handover OTP.', 'Open Deliveries', '/dashboard'],
      ['earnings', '💸', 'Earnings', 'Payout statements and COD reconciliation.', 'Open Earnings', '/dashboard?tab=earnings'],
    ],
  }),

  rider: buildDashboardSpec({
    roleKey: 'rider',
    title: 'Ride Partner Dashboard',
    subtitle: 'Patient transport rides, fares and earnings',
    permissions: ['rides:execute', 'earnings:read'],
    sidebarSections: ['Dashboard', 'Rides', 'Earnings'],
    kpis: [
      ['Rides Today', 'Completed rides today'],
      ['Earnings MTD', 'Ride earnings month-to-date'],
      ['Acceptance Rate', 'Accepted ride requests percentage'],
      ['Rating', 'Average rider rating'],
    ],
    tasks: [
      'Go online during peak transport hours',
      'Accept requests within the dispatch window',
      'Complete the trip checklist before pickup',
    ],
    alerts: [
      ['Safety SOS raised', 'urgent'],
      ['Ride request expiring', 'warn'],
    ],
    workQueues: ['Ride Requests', 'Active Ride', 'Completed Rides', 'Safety Reports'],
    quickActions: ['Go Online', 'Accept Ride', 'Start Trip', 'Raise SOS'],
    domainModules: [
      ['rides', '🚕', 'Ride Board', 'Live GPS and fare estimate.', 'Open Rides', '/rider/dashboard'],
      ['earnings', '💸', 'Earnings', 'Daily and monthly fare breakdown.', 'Open Earnings', '/rider/dashboard?tab=earnings'],
    ],
  }),

  assistant: buildDashboardSpec({
    roleKey: 'assistant',
    title: 'Care Assistant Dashboard',
    subtitle: 'Home and hospital attendant jobs with check-in proof',
    permissions: ['assistant:jobs', 'earnings:read'],
    sidebarSections: ['Dashboard', 'Jobs', 'Earnings'],
    kpis: [
      ['Jobs Today', 'Assigned care jobs today'],
      ['Earnings MTD', 'Attendant earnings month-to-date'],
      ['Rating', 'Average family rating'],
      ['Availability', 'Current availability status'],
    ],
    tasks: [
      'Check in with geo-proof at job start',
      'Complete the per-job care checklist',
      'Check out and submit the job report',
    ],
    alerts: [
      ['Late for an assigned job', 'urgent'],
      ['Job check-out missing', 'warn'],
    ],
    workQueues: ['Job Requests', 'Active Job', 'Completed Jobs', 'Payout Statements'],
    quickActions: ['Accept Job', 'Check In', 'Check Out', 'Open Earnings'],
    domainModules: [
      ['jobs', '🤝', 'Job Board', 'Live job tracker with checklists.', 'Open Jobs', '/assistant/dashboard'],
      ['earnings', '💸', 'Earnings', 'Payout statements and deductions.', 'Open Earnings', '/assistant/dashboard?tab=earnings'],
    ],
  }),

  lawyer: buildDashboardSpec({
    roleKey: 'lawyer',
    title: 'Legal Advisor Dashboard',
    subtitle: 'Consultations, case files, confidentiality and earnings',
    permissions: ['legal:consults', 'legal:cases'],
    sidebarSections: ['Dashboard', 'Consultations', 'Cases', 'Earnings'],
    kpis: [
      ['Consults Today', 'Legal consultations scheduled today'],
      ['Open Cases', 'Active case files'],
      ['Earnings MTD', 'Legal consultation earnings this month'],
      ['Rating', 'Average client rating'],
    ],
    tasks: [
      'Review conflict-of-interest flags before consults',
      'Update case file status and next hearing dates',
      'Submit consultation notes to the secure vault',
    ],
    alerts: [
      ['Conflict-of-interest flag raised', 'urgent'],
      ['Case filing deadline approaching', 'warn'],
    ],
    workQueues: ['Today Bookings', 'Open Case Files', 'Document Vault', 'Earnings Statements'],
    quickActions: ['Join Consultation', 'Upload Document', 'Open Case File', 'View Earnings'],
    domainModules: [
      ['cases', '⚖️', 'Case Files', 'Confidential client case workspace.', 'Open Cases', '/lawyer/dashboard'],
      ['vault', '🔒', 'Secure Vault', 'Encrypted documents with strict confidentiality.', 'Open Vault', '/lawyer/dashboard?tab=documents'],
    ],
  }),

  dentist: buildDashboardSpec({
    roleKey: 'dentist',
    title: 'Dental Clinic Dashboard',
    subtitle: 'Chair schedule, dental chart, treatment plans and revenue',
    permissions: ['dental:schedule', 'dental:charts', 'dental:billing'],
    sidebarSections: ['Dashboard', 'Schedule', 'Charts', 'Plans', 'Revenue'],
    kpis: [
      ['Appointments Today', 'Dental appointments scheduled today'],
      ['Chair Utilisation', 'Share of chair time booked'],
      ['Open Treatment Plans', 'Plans awaiting patient acceptance'],
      ['Revenue MTD', 'Clinic revenue month-to-date'],
    ],
    tasks: [
      'Review treatment plans awaiting acceptance',
      'Update tooth-wise dental charts after procedures',
      'Confirm recall appointments for the week',
    ],
    alerts: [
      ['Missed recall appointment', 'warn'],
      ['Sterilisation log incomplete', 'urgent'],
    ],
    workQueues: ['Chair Schedule', 'Treatment Plans', 'Recalls', 'Sterilisation Log'],
    quickActions: ['Open Dental Chart', 'Create Treatment Plan', 'Book Recall', 'Log Sterilisation'],
    domainModules: [
      ['chart', '🦷', 'Dental Chart', 'Tooth-wise charting and staged billing.', 'Open Chart', '/dashboard/dentist'],
      ['plans', '📋', 'Treatment Plans', 'Staged plans with acceptance tracking.', 'Open Plans', '/dashboard/dentist?tab=plans'],
    ],
  }),

  optician: buildDashboardSpec({
    roleKey: 'optician',
    title: 'Optical Shop Dashboard',
    subtitle: 'Eye exams, frame and lens orders, inventory and pickups',
    permissions: ['optical:exams', 'optical:orders', 'inventory:read'],
    sidebarSections: ['Dashboard', 'Exams', 'Orders', 'Inventory'],
    kpis: [
      ['Exams Today', 'Eye examinations scheduled today'],
      ['Open Orders', 'Frame and lens orders in progress'],
      ['Revenue MTD', 'Optical revenue month-to-date'],
      ['Ready For Pickup', 'Orders ready for collection'],
    ],
    tasks: [
      'Confirm lab orders with prescription details',
      'Notify patients when glasses are ready',
      'Reconcile frame and lens stock',
    ],
    alerts: [
      ['Lab order delayed', 'warn'],
      ['Prescription mismatch on an order', 'urgent'],
    ],
    workQueues: ['Exam Queue', 'Lab Orders', 'Pickup Counter', 'Stock Alerts'],
    quickActions: ['New Eye Exam', 'Place Lens Order', 'Mark Ready', 'Open Inventory'],
    domainModules: [
      ['exams', '👓', 'Eye Exams', 'Prescription records with history.', 'Open Exams', '/dashboard/optician'],
      ['orders', '📦', 'Order Tracking', 'Frame/lens orders and pickup status.', 'Open Orders', '/dashboard/optician?tab=orders'],
    ],
  }),

  home_nursing_admin: buildDashboardSpec({
    roleKey: 'home_nursing_admin',
    title: 'Home Nursing Admin Dashboard',
    subtitle: 'Home-visit scheduling, nurse routing, kits and per-visit billing',
    permissions: ['home_nursing:manage', 'billing:read'],
    sidebarSections: ['Dashboard', 'Schedule', 'Nurses', 'Kits', 'Billing'],
    kpis: [
      ['Visits Today', 'Home nursing visits scheduled today'],
      ['On-Time %', 'Visits started within the window'],
      ['Nurses Available', 'Nurses available for assignment'],
      ['Visit Revenue MTD', 'Home nursing revenue month-to-date'],
      ['Open Complaints', 'Service complaints awaiting resolution'],
    ],
    tasks: [
      'Assign unassigned home-visit requests',
      'Optimise routes for the next shift',
      'Reconcile visit kits after rounds',
    ],
    alerts: [
      ['Visit running late against slot', 'warn'],
      ['Kit stock below threshold', 'warn'],
    ],
    workQueues: ['Visit Schedule', 'Unassigned Requests', 'Kit Stock', 'Pending Reports'],
    quickActions: ['Assign Nurse', 'Reschedule Visit', 'Bill Visit', 'Open Route Map'],
    domainModules: [
      ['schedule', '🏠', 'Visit Board', 'Route-aware visit scheduling with e-consent.', 'Open Visits', '/dashboard/home-nursing'],
      ['kits', '🧰', 'Kit Inventory', 'Per-visit kit issue and return.', 'Open Kits', '/dashboard/home-nursing?tab=kits'],
    ],
  }),

  yoga_studio_admin: buildDashboardSpec({
    roleKey: 'yoga_studio_admin',
    title: 'Yoga Studio Dashboard',
    subtitle: 'Classes, members, memberships and instructor payouts',
    permissions: ['yoga:manage', 'memberships:manage'],
    sidebarSections: ['Dashboard', 'Schedule', 'Members', 'Revenue'],
    kpis: [
      ['Classes Today', 'Classes scheduled today'],
      ['Active Members', 'Members with a live membership'],
      ['Revenue MTD', 'Studio revenue month-to-date'],
      ['Retention', 'Rolling membership retention'],
    ],
    tasks: [
      'Fill under-booked classes with waitlist offers',
      'Send renewals for expiring memberships',
      'Reconcile instructor payouts',
    ],
    alerts: [
      ['Class under-booked', 'warn'],
      ['Membership renewals pending', 'info'],
    ],
    workQueues: ['Class Schedule', 'Expiring Memberships', 'Instructor Payouts', 'Member Waitlist'],
    quickActions: ['Add Class', 'Sell Membership', 'Send Renewal', 'Open Payouts'],
    domainModules: [
      ['schedule', '🧘', 'Class Schedule', 'Capacity and instructor rota.', 'Open Schedule', '/dashboard/yoga'],
      ['members', '👥', 'Memberships', 'Freeze, renew and retention view.', 'Open Members', '/dashboard/yoga?tab=members'],
    ],
  }),

  gym_owner: buildDashboardSpec({
    roleKey: 'gym_owner',
    title: 'Gym Owner Dashboard',
    subtitle: 'Memberships, check-ins, trainers and churn',
    permissions: ['gym:manage', 'memberships:manage'],
    sidebarSections: ['Dashboard', 'Members', 'Check-Ins', 'Revenue'],
    kpis: [
      ['Active Members', 'Members with a live plan'],
      ['Check-Ins Today', 'QR check-ins today'],
      ['Revenue MTD', 'Gym revenue month-to-date'],
      ['Churn Risk', 'Members at risk of churning'],
    ],
    tasks: [
      'Follow up on expiring memberships',
      'Review trainer commission statements',
      'Launch retention campaign for churn-risk members',
    ],
    alerts: [
      ['Churn risk above threshold', 'warn'],
      ['Membership payment failures', 'info'],
    ],
    workQueues: ['Expiring Memberships', 'Trainer Schedule', 'Churn-Risk Members', 'Payment Failures'],
    quickActions: ['Add Member', 'Check In', 'Assign Trainer', 'Open Revenue'],
    domainModules: [
      ['members', '🏋️', 'Member Console', 'Plans, check-ins and retention.', 'Open Members', '/dashboard/gym'],
      ['trainers', '🧑‍🏫', 'Trainer Rota', 'Schedules and commission statements.', 'Open Trainers', '/dashboard/gym?tab=trainers'],
    ],
  }),

  wellness_admin: buildDashboardSpec({
    roleKey: 'wellness_admin',
    title: 'Wellness Centre Dashboard',
    subtitle: 'Services, bookings, therapist rota and packages',
    permissions: ['wellness:manage', 'bookings:manage'],
    sidebarSections: ['Dashboard', 'Bookings', 'Catalogue', 'Staff'],
    kpis: [
      ['Bookings Today', 'Wellness bookings today'],
      ['Utilisation', 'Share of available therapist time booked'],
      ['Revenue MTD', 'Wellness revenue month-to-date'],
      ['Rating', 'Average service rating'],
    ],
    tasks: [
      'Balance therapist assignments for the day',
      'Approve custom service packages',
      'Respond to low-rating feedback',
    ],
    alerts: [
      ['Therapist absent with bookings', 'urgent'],
      ['Service rating drop', 'warn'],
    ],
    workQueues: ['Bookings', 'Therapist Schedule', 'Package Requests', 'Service Reviews'],
    quickActions: ['Add Service', 'Block Slot', 'Assign Therapist', 'Open Reviews'],
    domainModules: [
      ['bookings', '💆', 'Booking Board', 'Service and package bookings.', 'Open Bookings', '/dashboard/wellness'],
      ['staff', '👥', 'Therapist Rota', 'Availability and assignment view.', 'Open Rota', '/dashboard/wellness?tab=staff'],
    ],
  }),

  equipment_vendor: buildDashboardSpec({
    roleKey: 'equipment_vendor',
    title: 'Equipment Vendor Dashboard',
    subtitle: 'Orders, shipments, returns and payouts',
    permissions: ['vendor:orders', 'vendor:catalogue'],
    sidebarSections: ['Dashboard', 'Orders', 'Catalogue', 'Payouts'],
    kpis: [
      ['Orders Today', 'New equipment orders today'],
      ['Revenue MTD', 'Vendor revenue month-to-date'],
      ['Return %', 'Returned orders as a share of shipped'],
      ['Rating', 'Buyer rating for the vendor'],
    ],
    tasks: [
      'Dispatch confirmed orders with tracking',
      'Update catalogue stock levels',
      'Resolve open return requests',
    ],
    alerts: [
      ['Order dispatch overdue', 'warn'],
      ['Stock-out on a listed product', 'urgent'],
    ],
    workQueues: ['New Orders', 'Shipments', 'Returns', 'Payout Statements'],
    quickActions: ['Add Product', 'Ship Order', 'Approve Return', 'Open Payouts'],
    domainModules: [
      ['orders', '📦', 'Order Console', 'Order lifecycle with shipment tracking.', 'Open Orders', '/dashboard/equipment'],
      ['catalogue', '🗂️', 'Catalogue', 'Product listings and stock.', 'Open Catalogue', '/dashboard/equipment?tab=catalogue'],
    ],
  }),

  event_organizer: buildDashboardSpec({
    roleKey: 'event_organizer',
    title: 'Event Organizer Dashboard',
    subtitle: 'Health camps, registrations, check-ins and camp reports',
    permissions: ['events:manage', 'registrations:manage'],
    sidebarSections: ['Dashboard', 'Events', 'Registrations', 'Reports'],
    kpis: [
      ['Upcoming Events', 'Camps and workshops scheduled'],
      ['Registrations', 'Registrations for upcoming events'],
      ['Attendance %', 'Checked-in share of registrations'],
      ['Revenue MTD', 'Event revenue month-to-date'],
    ],
    tasks: [
      'Review registration capacity per event',
      'Prepare screening forms for the next camp',
      'Publish the post-event camp report',
    ],
    alerts: [
      ['Event capacity reached', 'info'],
      ['Check-in list missing', 'warn'],
    ],
    workQueues: ['Upcoming Events', 'Registrations', 'Check-In List', 'Camp Reports'],
    quickActions: ['Create Event', 'Scan Check-In', 'Export Registrations', 'Open Reports'],
    domainModules: [
      ['events', '🎪', 'Event Console', 'Camp creation and screening forms.', 'Open Events', '/dashboard/events'],
      ['reports', '📊', 'Camp Reports', 'Attendance and conversion analytics.', 'Open Reports', '/dashboard/events?tab=reports'],
    ],
  }),

  group_host: buildDashboardSpec({
    roleKey: 'group_host',
    title: 'Support Group Host Dashboard',
    subtitle: 'Group sessions, members and safety moderation',
    permissions: ['groups:host', 'groups:moderate'],
    sidebarSections: ['Dashboard', 'Sessions', 'Members', 'Moderation'],
    kpis: [
      ['Sessions This Week', 'Group sessions scheduled this week'],
      ['Active Members', 'Members in moderated groups'],
      ['Attendance', 'Average session attendance'],
      ['Flagged Posts', 'Posts awaiting moderation'],
    ],
    tasks: [
      'Review flagged posts before the next session',
      'Send session reminders to members',
      'Escalate safety concerns to the clinical team',
    ],
    alerts: [
      ['Abuse report in a support group', 'urgent'],
      ['Session starts without a host', 'warn'],
    ],
    workQueues: ['Upcoming Sessions', 'Flagged Posts', 'Member Reports', 'Attendance Log'],
    quickActions: ['Create Session', 'Moderate Post', 'Send Reminder', 'Open Safety Protocol'],
    domainModules: [
      ['sessions', '🗣️', 'Group Sessions', 'Anonymity-preserving chat and video.', 'Open Sessions', '/dashboard/events'],
      ['moderation', '🛡️', 'Safety Moderation', 'Flagged content and escalation trail.', 'Open Moderation', '/dashboard/events?tab=moderation'],
    ],
  }),

  trainer_org: buildDashboardSpec({
    roleKey: 'trainer_org',
    title: 'Training Organisation Dashboard',
    subtitle: 'Courses, batches, enrolments and certificates',
    permissions: ['training:manage', 'enrolments:manage'],
    sidebarSections: ['Dashboard', 'Courses', 'Enrolments', 'Certificates'],
    kpis: [
      ['Active Courses', 'Courses open for enrolment'],
      ['Enrolments', 'Enrolments in the current period'],
      ['Revenue MTD', 'Training revenue month-to-date'],
      ['Completion %', 'Learners who completed their course'],
    ],
    tasks: [
      'Confirm batch schedules with trainers',
      'Issue certificates for completed batches',
      'Follow up on abandoned enrolments',
    ],
    alerts: [
      ['Batch under-filled', 'warn'],
      ['Certificate issuance pending', 'info'],
    ],
    workQueues: ['Course Catalogue', 'Enrolments', 'Batch Schedule', 'Certificate Queue'],
    quickActions: ['Add Course', 'Create Batch', 'Issue Certificate', 'Open Enrolments'],
    domainModules: [
      ['courses', '🎓', 'Course Catalogue', 'Course and batch management.', 'Open Courses', '/dashboard/gym'],
      ['certs', '📜', 'Certificates', 'Completion certificates with verification.', 'Open Certificates', '/dashboard/gym?tab=certificates'],
    ],
  }),

  fertility_admin: buildDashboardSpec({
    roleKey: 'fertility_admin',
    title: 'Fertility / IVF Clinic Dashboard',
    subtitle: 'Cycles, protocols, embryology lab and sensitive consents',
    permissions: ['fertility:cycles', 'fertility:lab', 'consents:manage'],
    sidebarSections: ['Dashboard', 'Cycles', 'Lab', 'Consents'],
    kpis: [
      ['Active Cycles', 'Treatment cycles in progress'],
      ['Success Metrics', 'Cycle success rate for the period'],
      ['Lab Schedule', 'Embryology lab events today'],
      ['Consents Pending', 'Sensitive consents awaiting signature'],
    ],
    tasks: [
      'Verify consent completeness before cycle start',
      'Review embryology lab schedule',
      'Update cycle outcome tracking',
    ],
    alerts: [
      ['Consent missing before a procedure', 'urgent'],
      ['Lab schedule conflict', 'warn'],
    ],
    workQueues: ['Cycle Board', 'Lab Schedule', 'Consent Queue', 'Outcome Tracking'],
    quickActions: ['Start Cycle', 'Capture Consent', 'Open Lab Log', 'Record Outcome'],
    domainModules: [
      ['cycles', '🧬', 'Cycle Board', 'Protocol and cycle progress tracking.', 'Open Cycles', '/dashboard/ivf'],
      ['lab', '🔬', 'Embryology Lab', 'Lab events with sensitive access control.', 'Open Lab', '/dashboard/ivf?tab=lab'],
    ],
  }),

  maternity_admin: buildDashboardSpec({
    roleKey: 'maternity_admin',
    title: 'Maternity Centre Dashboard',
    subtitle: 'ANC visits, labour board, newborn screening and birth certificates',
    permissions: ['maternity:anc', 'maternity:labour', 'certificates:issue'],
    sidebarSections: ['Dashboard', 'ANC', 'Labour', 'Newborn'],
    kpis: [
      ['ANC Visits Due', 'Antenatal visits due this week'],
      ['Deliveries Today', 'Deliveries recorded today'],
      ['Newborn Screens Pending', 'Screening tests awaiting completion'],
      ['Birth Certificates Issued', 'Certificates issued this month'],
    ],
    tasks: [
      'Review overdue antenatal visits',
      'Complete newborn screening documentation',
      'Issue pending birth certificates',
    ],
    alerts: [
      ['Overdue ANC visit', 'warn'],
      ['Newborn screening pending', 'warn'],
    ],
    workQueues: ['ANC List', 'Labour Board', 'Newborn Screening', 'Certificate Requests'],
    quickActions: ['Open Labour Record', 'Record Delivery', 'Issue Birth Certificate', 'Book ANC'],
    domainModules: [
      ['anc', '🤰', 'ANC Register', 'Antenatal card and visit schedule.', 'Open ANC', '/dashboard/maternity'],
      ['labour', '👶', 'Labour Board', 'Partogram and delivery documentation.', 'Open Labour', '/dashboard/maternity?tab=labour'],
    ],
  }),

  rehab_admin: buildDashboardSpec({
    roleKey: 'rehab_admin',
    title: 'Rehabilitation Centre Dashboard',
    subtitle: 'Programmes, sessions and functional outcome improvement',
    permissions: ['rehab:programmes', 'rehab:sessions'],
    sidebarSections: ['Dashboard', 'Programmes', 'Sessions', 'Outcomes'],
    kpis: [
      ['Active Patients', 'Patients in rehabilitation programmes'],
      ['Sessions Today', 'Therapy sessions scheduled today'],
      ['Outcome Improvement', 'Average functional gain'],
      ['Missed Sessions', 'Sessions missed this week'],
    ],
    tasks: [
      'Review missed sessions and reschedule',
      'Update functional outcome scores',
      'Coordinate therapist scheduling',
    ],
    alerts: [
      ['Missed session without follow-up', 'warn'],
      ['Outcome deterioration flagged', 'urgent'],
    ],
    workQueues: ['Programme Board', 'Session Schedule', 'Outcome Reviews', 'Missed Sessions'],
    quickActions: ['Plan Session', 'Record Outcome', 'Reschedule Session', 'Open Programme'],
    domainModules: [
      ['programmes', '♿', 'Programmes', 'Multi-disciplinary rehabilitation plans.', 'Open Programmes', '/physio'],
      ['outcomes', '📏', 'Outcome Scales', 'Barthel/FIM trends per patient.', 'Open Outcomes', '/physio?tab=outcomes'],
    ],
  }),

  govt_facility_staff: buildDashboardSpec({
    roleKey: 'govt_facility_staff',
    title: 'Government Facility Dashboard',
    subtitle: 'Public facility listing, scheme enquiries and footfall',
    permissions: ['govt:facility', 'schemes:read'],
    sidebarSections: ['Dashboard', 'Profile', 'Schemes', 'Enquiries'],
    kpis: [
      ['Services Listed', 'Public services visible on the listing'],
      ['Scheme Enquiries', 'Enquiries about eligible schemes'],
      ['Footfall', 'Recorded footfall for the current period'],
      ['Profile Freshness', 'Age of the last profile update'],
    ],
    tasks: [
      'Update facility timings and holiday calendar',
      'Respond to scheme eligibility enquiries',
      'Verify listed services against current capacity',
    ],
    alerts: [
      ['Facility information outdated', 'warn'],
      ['Scheme enquiry unanswered', 'info'],
    ],
    workQueues: ['Enquiries', 'Service Listings', 'Scheme Information', 'Profile Updates'],
    quickActions: ['Update Profile', 'Edit Services', 'Reply To Enquiry', 'Open Scheme Guide'],
    domainModules: [
      ['profile', '🏛️', 'Facility Profile', 'Public listing, timings and holidays.', 'Open Profile', '/dashboard'],
      ['schemes', '📜', 'Scheme Guide', 'Eligibility information for public schemes.', 'Open Schemes', '/dashboard?tab=schemes'],
    ],
  }),

  elder_care_admin: buildDashboardSpec({
    roleKey: 'elder_care_admin',
    title: 'Elder Care Dashboard',
    subtitle: 'Residents, MAR compliance, care plans and family updates',
    permissions: ['elder_care:residents', 'elder_care:mar'],
    sidebarSections: ['Dashboard', 'Residents', 'MAR', 'Care Plans', 'Family'],
    kpis: [
      ['Residents', 'Active residents in care'],
      ['MAR Compliance %', 'Medication rounds completed on time'],
      ['Incidents', 'Open resident incidents'],
      ['Family Updates Sent', 'Family communications sent this week'],
    ],
    tasks: [
      'Verify medication administration rounds',
      'Update care plans after assessments',
      'Send weekly family updates',
    ],
    alerts: [
      ['Missed medication round', 'urgent'],
      ['Resident fall reported', 'urgent'],
    ],
    workQueues: ['Medication Rounds', 'Care Plan Reviews', 'Incident Register', 'Family Updates'],
    quickActions: ['Record MAR', 'Update Care Plan', 'Log Incident', 'Send Family Update'],
    domainModules: [
      ['residents', '🧓', 'Resident Console', 'Care plans and MAR with retention class.', 'Open Residents', '/dashboard/elder-care'],
      ['family', '👪', 'Family Portal', 'Updates and consent-aware communication.', 'Open Family', '/dashboard/elder-care?tab=family'],
    ],
  }),

  vaccination_admin: buildDashboardSpec({
    roleKey: 'vaccination_admin',
    title: 'Vaccination Centre Dashboard',
    subtitle: 'Due lists, batches, cold-chain logs and certificates',
    permissions: ['vaccination:administer', 'vaccination:stock'],
    sidebarSections: ['Dashboard', 'Due List', 'Stock', 'Certificates'],
    kpis: [
      ['Doses Today', 'Vaccine doses administered today'],
      ['Due / Overdue', 'Beneficiaries due or overdue'],
      ['Wastage', 'Dose wastage this period'],
      ['Cold-Chain Status', 'Current cold-chain alert state'],
    ],
    tasks: [
      'Confirm batch and expiry before administration',
      'Send due reminders for overdue beneficiaries',
      'Log cold-chain temperatures for the shift',
    ],
    alerts: [
      ['Cold-chain excursion recorded', 'urgent'],
      ['Batch expiring soon', 'warn'],
    ],
    workQueues: ['Due List', 'Batch & Expiry', 'Cold-Chain Log', 'Certificate Queue'],
    quickActions: ['Give Dose', 'Print Certificate', 'Log Temperature', 'Record Wastage'],
    domainModules: [
      ['due', '💉', 'Due List', 'Age-based vaccination schedule.', 'Open Due List', '/dashboard/vaccination'],
      ['stock', '🧊', 'Cold-Chain', 'Batch, expiry and temperature logs.', 'Open Stock', '/dashboard/vaccination?tab=stock'],
    ],
  }),

  child_dev_admin: buildDashboardSpec({
    roleKey: 'child_dev_admin',
    title: 'Child Development Centre Dashboard',
    subtitle: 'Assessments, therapy sessions and milestone tracking',
    permissions: ['child_dev:assessments', 'child_dev:therapy'],
    sidebarSections: ['Dashboard', 'Children', 'Sessions', 'Milestones'],
    kpis: [
      ['Children Active', 'Children under active care'],
      ['Sessions Today', 'Therapy and assessment sessions today'],
      ['Assessments Due', 'Assessment reviews due'],
      ['Milestone Progress', 'Children meeting age milestones'],
    ],
    tasks: [
      'Schedule developmental assessments',
      'Record milestone progress after sessions',
      'Share guardian-consented progress notes',
    ],
    alerts: [
      ['Missed therapy session', 'warn'],
      ['Guardian consent missing', 'urgent'],
    ],
    workQueues: ['Assessments', 'Therapy Sessions', 'Milestone Reviews', 'Parent Portal'],
    quickActions: ['Add Assessment', 'Start Session', 'Record Milestone', 'Open Parent Portal'],
    domainModules: [
      ['children', '🧒', 'Child Console', 'Assessments and growth charts (WHO).', 'Open Children', '/dashboard/child-dev'],
      ['milestones', '📈', 'Milestones', 'Milestone and parent-reported progress.', 'Open Milestones', '/dashboard/child-dev?tab=milestones'],
    ],
  }),

  specialty_centre_admin: buildDashboardSpec({
    roleKey: 'specialty_centre_admin',
    title: 'Specialty Centre Dashboard',
    subtitle: 'Procedures, utilisation, packages and equipment readiness',
    permissions: ['specialty:manage', 'procedures:schedule'],
    sidebarSections: ['Dashboard', 'Schedule', 'Packages', 'Revenue'],
    kpis: [
      ['Procedures Today', 'Specialty procedures scheduled today'],
      ['Utilisation', 'Share of procedure capacity used'],
      ['Revenue MTD', 'Specialty centre revenue month-to-date'],
      ['Equipment Due', 'Equipment maintenance or calibration due'],
    ],
    tasks: [
      'Confirm procedure readiness and consents',
      'Review package pricing and inclusions',
      'Plan equipment maintenance windows',
    ],
    alerts: [
      ['Equipment calibration due', 'warn'],
      ['Procedure consent missing', 'urgent'],
    ],
    workQueues: ['Procedure Schedule', 'Package Requests', 'Equipment Readiness', 'Revenue Review'],
    quickActions: ['Add Package', 'Schedule Procedure', 'Check Readiness', 'Open Revenue'],
    domainModules: [
      ['schedule', '🏥', 'Procedure Board', 'Specialty schedule with readiness gates.', 'Open Schedule', '/dashboard/specialty'],
      ['packages', '📦', 'Packages', 'Specialty packages and pricing.', 'Open Packages', '/dashboard/specialty?tab=packages'],
    ],
  }),
};

const MARKETPLACE_ALIASES: Record<string, string> = {
  counselor: 'counsellor',
  dental_clinic_admin: 'dentist',
  optical_shop_owner: 'optician',
  yoga_instructor: 'yoga_studio_admin',
  trainer: 'gym_owner',
  therapist: 'wellness_admin',
  product_vendor: 'equipment_vendor',
};

export function getMarketplaceDashboardSpec(roleKey: string | null | undefined): HmsDashboardConfig | undefined {
  if (!roleKey) return undefined;
  const key = String(roleKey).toLowerCase().trim();
  const base = MARKETPLACE_SPECS[key] ? key : MARKETPLACE_ALIASES[key];
  const spec = base ? MARKETPLACE_SPECS[base] : undefined;
  return spec ? { ...spec, roleKey: key } : undefined;
}

export function getAllMarketplaceRoles(): string[] {
  return Object.keys(MARKETPLACE_SPECS);
}
