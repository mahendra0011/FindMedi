/**
 * Generates stub Client Component page files for all dashboard routes.
 * Each stub imports the equivalent old component from the Vite project
 * and wraps it in a Client Component shell.
 *
 * Usage: node scripts/generate-stubs.js
 */
const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '../src/app/(dashboard)');

// Map of route paths to their old component names and titles
// Based on ROUTE_INVENTORY.md
const routes = [
  // Patient routes
  { dir: 'patient', name: 'addresses', title: 'Patient Addresses' },
  { dir: 'patient', name: 'appointments', title: 'My Appointments' },
  { dir: 'patient', name: 'booking-history', title: 'Booking History' },
  { dir: 'patient', name: 'bookings', title: 'My Bookings' },
  { dir: 'patient', name: 'emergency', title: 'Emergency' },
  { dir: 'patient', name: 'family', title: 'Family Members' },
  { dir: 'patient', name: 'favorites', title: 'Favorites' },
  { dir: 'patient', name: 'history', title: 'Medical History' },
  { dir: 'patient', name: 'medicine-orders', title: 'Medicine Orders' },
  { dir: 'patient', name: 'prescriptions', title: 'My Prescriptions' },
  { dir: 'patient', name: 'profile', title: 'Profile' },
  { dir: 'patient', name: 'records', title: 'Medical Records' },
  { dir: 'patient', name: 'refunds', title: 'Refunds' },
  { dir: 'patient', name: 'reports', title: 'Test Reports' },
  { dir: 'patient', name: 'reviews', title: 'My Reviews' },
  { dir: 'patient', name: 'reviews/write', title: 'Write a Review' },
  { dir: 'patient', name: 'services', title: 'My Services' },
  { dir: 'patient', name: 'settings', title: 'Settings' },
  { dir: 'patient', name: 'support', title: 'Support' },

  // Doctor routes
  { dir: 'doctor', name: 'appointments', title: 'Appointments' },
  { dir: 'doctor', name: 'appointments/approve', title: 'Approve Appointments' },
  { dir: 'doctor', name: 'appointments/history', title: 'Appointment History' },
  { dir: 'doctor', name: 'consultations', title: 'Consultations' },
  { dir: 'doctor', name: 'earnings', title: 'Earnings' },
  { dir: 'doctor', name: 'emergency', title: 'Emergency' },
  { dir: 'doctor', name: 'leave-requests', title: 'Leave Requests' },
  { dir: 'doctor', name: 'patients', title: 'Patients' },
  { dir: 'doctor', name: 'prescriptions', title: 'Prescriptions' },
  { dir: 'doctor', name: 'profile', title: 'Profile' },
  { dir: 'doctor', name: 'reviews', title: 'Reviews' },
  { dir: 'doctor', name: 'schedule', title: 'Schedule' },
  { dir: 'doctor', name: 'test-results', title: 'Test Results' },

  // Clinic Doctor routes
  { dir: 'clinic', name: 'analytics', title: 'Analytics' },
  { dir: 'clinic', name: 'appointments', title: 'Appointments' },
  { dir: 'clinic', name: 'appointments/approve', title: 'Approve Appointments' },
  { dir: 'clinic', name: 'appointments/history', title: 'Appointment History' },
  { dir: 'clinic', name: 'billing', title: 'Billing' },
  { dir: 'clinic', name: 'consultations', title: 'Consultations' },
  { dir: 'clinic', name: 'dashboard', title: 'Dashboard' },
  { dir: 'clinic', name: 'earnings', title: 'Earnings' },
  { dir: 'clinic', name: 'fees', title: 'Fees' },
  { dir: 'clinic', name: 'management', title: 'Management' },
  { dir: 'clinic', name: 'notifications', title: 'Notifications' },
  { dir: 'clinic', name: 'patients', title: 'Patients' },
  { dir: 'clinic', name: 'payment-history', title: 'Payment History' },
  { dir: 'clinic', name: 'platform-settings', title: 'Platform Settings' },
  { dir: 'clinic', name: 'prescriptions', title: 'Prescriptions' },
  { dir: 'clinic', name: 'reviews', title: 'Reviews' },
  { dir: 'clinic', name: 'schedule', title: 'Schedule' },
  { dir: 'clinic', name: 'settings', title: 'Settings' },
  { dir: 'clinic', name: 'staff', title: 'Staff' },
  { dir: 'clinic', name: 'test-requests', title: 'Test Requests' },
  { dir: 'clinic', name: 'tests', title: 'Tests' },

  // Hospital Admin routes
  { dir: 'admin', name: 'analytics', title: 'Analytics' },
  { dir: 'admin', name: 'announcements', title: 'Announcements' },
  { dir: 'admin', name: 'beds', title: 'Bed Management' },
  { dir: 'admin', name: 'clinic-settings', title: 'Clinic Settings' },
  { dir: 'admin', name: 'departments', title: 'Departments' },
  { dir: 'admin', name: 'diagnostic', title: 'Diagnostic Dashboard' },
  { dir: 'admin', name: 'doctors', title: 'Doctors' },
  { dir: 'admin', name: 'emergency', title: 'Emergency' },
  { dir: 'admin', name: 'hospital-settings', title: 'Hospital Settings' },
  { dir: 'admin', name: 'lab-settings', title: 'Lab Settings' },
  { dir: 'admin', name: 'leave-requests', title: 'Leave Requests' },
  { dir: 'admin', name: 'pharmacy-settings', title: 'Pharmacy Settings' },
  { dir: 'admin', name: 'prescription-verification', title: 'Prescription Verification' },
  { dir: 'admin', name: 'reviews', title: 'Reviews' },
  { dir: 'admin', name: 'schedule-manage', title: 'Schedule Management' },
  { dir: 'admin', name: 'test-catalog', title: 'Test Catalog' },
  { dir: 'admin', name: 'users', title: 'Users' },

  // Super Admin routes
  { dir: 'superadmin', name: 'audit', title: 'Audit Logs' },
  { dir: 'superadmin', name: 'broadcast', title: 'Broadcast' },
  { dir: 'superadmin', name: 'catalog', title: 'Global Catalog' },
  { dir: 'superadmin', name: 'categories', title: 'Categories' },
  { dir: 'superadmin', name: 'cities', title: 'Cities' },
  { dir: 'superadmin', name: 'delivery-partners', title: 'Delivery Partners' },
  { dir: 'superadmin', name: 'disputes', title: 'Disputes' },
  { dir: 'superadmin', name: 'export', title: 'Data Export' },
  { dir: 'superadmin', name: 'facilities', title: 'Facilities' },
  { dir: 'superadmin', name: 'integrations', title: 'Integrations' },
  { dir: 'superadmin', name: 'legal', title: 'Legal' },
  { dir: 'superadmin', name: 'licenses', title: 'Licenses' },
  { dir: 'superadmin', name: 'moderation', title: 'Content Moderation' },
  { dir: 'superadmin', name: 'overview', title: 'Platform Overview' },
  { dir: 'superadmin', name: 'pending', title: 'Pending Approvals' },
  { dir: 'superadmin', name: 'promotions', title: 'Promotions' },
  { dir: 'superadmin', name: 'revenue', title: 'Revenue' },
  { dir: 'superadmin', name: 'settings', title: 'System Settings' },
  { dir: 'superadmin', name: 'stats', title: 'Platform Stats' },
  { dir: 'superadmin', name: 'team', title: 'Team' },
  { dir: 'superadmin', name: 'tickets', title: 'Support Tickets' },
  { dir: 'superadmin', name: 'users', title: 'User Management' },

  // Pharmacy routes
  { dir: 'pharmacy', name: 'analytics', title: 'Pharmacy Analytics' },
  { dir: 'pharmacy', name: 'dashboard', title: 'Pharmacy Dashboard' },
  { dir: 'pharmacy', name: 'delivery', title: 'Delivery' },
  { dir: 'pharmacy', name: 'inventory', title: 'Inventory' },
  { dir: 'pharmacy', name: 'offers', title: 'Offers' },
  { dir: 'pharmacy', name: 'orders', title: 'Orders' },
  { dir: 'pharmacy', name: 'prescriptions', title: 'Prescriptions' },
  { dir: 'pharmacy', name: 'returns', title: 'Returns' },
  { dir: 'pharmacy', name: 'reviews', title: 'Reviews' },
  { dir: 'pharmacy', name: 'settings', title: 'Settings' },
  { dir: 'pharmacy', name: 'staff', title: 'Staff' },

  // Lab Center routes
  { dir: 'labcenter', name: 'analytics', title: 'Lab Analytics' },
  { dir: 'labcenter', name: 'appointments', title: 'Appointments' },
  { dir: 'labcenter', name: 'billing', title: 'Billing' },
  { dir: 'labcenter', name: 'bookings', title: 'Bookings' },
  { dir: 'labcenter', name: 'dashboard', title: 'Lab Dashboard' },
  { dir: 'labcenter', name: 'equipment', title: 'Equipment' },
  { dir: 'labcenter', name: 'packages', title: 'Packages' },
  { dir: 'labcenter', name: 'prescriptions', title: 'Prescriptions' },
  { dir: 'labcenter', name: 'reports', title: 'Reports' },
  { dir: 'labcenter', name: 'reviews', title: 'Reviews' },
  { dir: 'labcenter', name: 'samples', title: 'Sample Collection' },
  { dir: 'labcenter', name: 'settings', title: 'Settings' },
  { dir: 'labcenter', name: 'staff', title: 'Staff' },
  { dir: 'labcenter', name: 'tests', title: 'Test Catalog' },

  // Delivery routes
  { dir: 'delivery', name: 'documents', title: 'Documents' },
  { dir: 'delivery', name: 'earnings', title: 'Earnings' },
  { dir: 'delivery', name: 'history', title: 'Delivery History' },
  { dir: 'delivery', name: 'orders', title: 'Orders' },
  { dir: 'delivery', name: 'reviews', title: 'Reviews' },
  { dir: 'delivery', name: 'settings', title: 'Settings' },
  { dir: 'delivery', name: 'zone', title: 'Delivery Zone' },
];

// Also create shared dashboard shell routes
const sharedRoutes = [
  { dir: '.', name: 'dashboard', title: 'Role Dashboard' },
  { dir: '.', name: 'ai-chat', title: 'AI Assistant' },
  { dir: '.', name: 'analytics-reports', title: 'Reports' },
  { dir: '.', name: 'appointments', title: 'Appointments' },
  { dir: '.', name: 'audit-logs', title: 'Audit Logs' },
  { dir: '.', name: 'billing', title: 'Billing' },
  { dir: '.', name: 'bloodbank', title: 'Blood Bank' },
  { dir: '.', name: 'diet', title: 'Diet Kitchen' },
  { dir: '.', name: 'doctor-consultation', title: 'Doctor Consultation' },
  { dir: '.', name: 'doctors', title: 'Doctors' },
  { dir: '.', name: 'housekeeping', title: 'Housekeeping' },
  { dir: '.', name: 'import-export', title: 'Import/Export' },
  { dir: '.', name: 'insurance', title: 'Insurance' },
  { dir: '.', name: 'inventory', title: 'Inventory' },
  { dir: '.', name: 'ipd', title: 'IPD' },
  { dir: '.', name: 'lab', title: 'Lab' },
  { dir: '.', name: 'mentalhealth', title: 'Mental Health' },
  { dir: '.', name: 'notifications', title: 'Notifications' },
  { dir: '.', name: 'nursing', title: 'Nursing Charts' },
  { dir: '.', name: 'opd-registration', title: 'OPD Registration' },
  { dir: '.', name: 'opd-token', title: 'OPD Token' },
  { dir: '.', name: 'ot', title: 'Operation Theatre' },
  { dir: '.', name: 'patient-registration', title: 'Patient Registration' },
  { dir: '.', name: 'patients', title: 'Patients' },
  { dir: '.', name: 'pharmacy', title: 'Pharmacy' },
  { dir: '.', name: 'physio', title: 'Physiotherapy' },
  { dir: '.', name: 'radiology', title: 'Radiology' },
  { dir: '.', name: 'records', title: 'Medical Records' },
  { dir: '.', name: 'reports', title: 'PDF Reports' },
  { dir: '.', name: 'settings', title: 'Settings' },
  { dir: '.', name: 'staff', title: 'Staff' },
  { dir: '.', name: 'triage', title: 'Triage' },
  { dir: '.', name: 'upload', title: 'File Upload' },
  { dir: '.', name: 'verify-transaction', title: 'Verify Transaction' },
];

function generateStubContent(title) {
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '');
  return `/**
 * ${title} — Dashboard page stub.
 *
 * Migrated from client/src/pages/.
 * Full component implementation will be ported in Phase 4.
 * This stub provides the correct route structure and Client Component wrapper.
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ${safeName}Page() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">${title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>${title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is under migration from the legacy Vite app.
            Full implementation coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
`;
}

let count = 0;
[...routes, ...sharedRoutes].forEach((route) => {
  // Build the full directory path for this route
  // e.g. { dir: 'patient', name: 'addresses' } → (dashboard)/patient/addresses/page.tsx
  // e.g. { dir: '.', name: 'ai-chat' }        → (dashboard)/ai-chat/page.tsx
  // e.g. { dir: 'doctor', name: 'appointments/approve' } → (dashboard)/doctor/appointments/approve/page.tsx
  const baseDir = route.dir === '.' ? APP_DIR : path.join(APP_DIR, route.dir);
  const parts = route.name.split('/');
  const fullDir = path.join(baseDir, ...parts);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }
  const pageFile = path.join(fullDir, 'page.tsx');
  if (fs.existsSync(pageFile)) return; // skip if already exists (e.g. layout.tsx or dashboard page)

  const content = generateStubContent(route.title);
  fs.writeFileSync(pageFile, content);
  count++;
});

console.log(`Generated ${count} stub pages.`);
