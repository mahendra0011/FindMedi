import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const countOf = (res, keys = []) => {
  if (!res) return 0;
  if (Array.isArray(res)) return res.length;
  for (const k of keys) {
    if (Array.isArray(res[k])) return res[k].length;
  }
  if (typeof res.total === 'number') return res.total;
  return 0;
};

// Per-role widget wiring — every call exists in lib/api.js and fails soft.
const ROLE_CONFIG = {
  nurse: {
    title: 'Nursing Console',
    calls: [
      { key: 'todayAppts', label: "Today's Appointments", link: '/appointments', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
      { key: 'beds', label: 'Bed Occupancy', link: '/admin/beds', run: () => api.getBedStats().catch(() => null) },
      { key: 'nursing', label: 'Nursing Charts', link: '/nursing', run: () => api.getNursingCharts({ limit: 50 }).catch(() => null) },
      { key: 'emergency', label: 'ER Queue', link: '/admin/emergency', run: () => api.getEmergencyStats().catch(() => null) },
    ],
  },
  pharmacist: {
    title: 'Pharmacy Counter',
    calls: [
      { key: 'orders', label: 'Pending Orders', link: '/pharmacy', run: () => api.getPharmacyOrders({ limit: 200 }).catch(() => null) },
      { key: 'rx', label: 'Prescriptions to Verify', link: '/admin/prescription-verification', run: () => api.getPrescriptions({}).catch(() => null) },
      { key: 'inventory', label: 'Low-stock Alerts', link: '/inventory', run: () => api.getInventoryStats().catch(() => null) },
      { key: 'billing', label: "Today's Billing", link: '/billing', run: () => api.getBilling({ limit: 200 }).catch(() => null) },
    ],
  },
  lab_receptionist: {
    title: 'Lab Reception',
    calls: [
      { key: 'bookings', label: "Today's Bookings", link: '/lab-business/bookings', run: () => api.getLabBookings({ limit: 200 }).catch(() => null) },
      { key: 'orders', label: 'Orders in Process', link: '/lab-business/dashboard', run: () => api.getLabOrders({ limit: 200 }).catch(() => null) },
      { key: 'tests', label: 'Test Catalog', link: '/lab-business/tests', run: () => api.getTests({}).catch(() => null) },
    ],
  },
  lab_technician: {
    title: 'Lab Technician Bench',
    calls: [
      { key: 'orders', label: 'Samples to Process', link: '/lab-business/dashboard', run: () => api.getLabOrders({ limit: 200 }).catch(() => null) },
      { key: 'bookings', label: 'Bookings Queue', link: '/lab-business/bookings', run: () => api.getLabBookings({ limit: 200 }).catch(() => null) },
      { key: 'tests', label: 'Test Catalog', link: '/lab-business/tests', run: () => api.getTests({}).catch(() => null) },
    ],
  },
  pathologist: {
    title: 'Pathologist Sign-off',
    calls: [
      { key: 'orders', label: 'Reports Awaiting Verification', link: '/lab-business/reports', run: () => api.getLabOrders({ limit: 200 }).catch(() => null) },
      { key: 'bookings', label: 'Bookings Queue', link: '/lab-business/bookings', run: () => api.getLabBookings({ limit: 200 }).catch(() => null) },
    ],
  },
  radiologist: {
    title: 'Radiology Console',
    calls: [
      { key: 'orders', label: 'Imaging Orders', link: '/radiology', run: () => api.getLabOrders({ limit: 200 }).catch(() => null) },
      { key: 'bookings', label: 'Bookings Queue', link: '/lab-business/bookings', run: () => api.getLabBookings({ limit: 200 }).catch(() => null) },
    ],
  },
  dietitian: {
    title: 'Diet Kitchen Board',
    calls: [
      { key: 'diet', label: "Today's Diet Orders", link: '/diet', run: () => api.getDietOrders({ limit: 200 }).catch(() => null) },
      { key: 'dietStats', label: 'Diet Stats', link: '/diet', run: () => api.getDietStats().catch(() => null) },
      { key: 'appointments', label: "Today's Appointments", link: '/appointments', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
    ],
  },
  physiotherapist: {
    title: 'Physio Schedule',
    calls: [
      { key: 'appointments', label: "Today's Sessions", link: '/physio', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
      { key: 'beds', label: 'Ward Beds', link: '/admin/beds', run: () => api.getBedStats().catch(() => null) },
    ],
  },
  counselor: {
    title: 'Counselling Desk',
    calls: [
      { key: 'appointments', label: "Today's Sessions", link: '/appointments', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
    ],
  },
  accountant: {
    title: 'Accounts Desk',
    calls: [
      { key: 'billing', label: "Today's Billing", link: '/billing', run: () => api.getBilling({ limit: 200 }).catch(() => null) },
      { key: 'txns', label: 'Transactions', link: '/billing', run: () => api.getTransactions({ limit: 100 }).catch(() => null) },
    ],
  },
  security: {
    title: 'Security Desk',
    calls: [
      { key: 'appointments', label: "Today's Footfall (Appointments)", link: '/appointments', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
      { key: 'emergency', label: 'ER Status', link: '/admin/emergency', run: () => api.getEmergencyStats().catch(() => null) },
    ],
  },
  technician: {
    title: 'Biomedical Technician',
    calls: [
      { key: 'beds', label: 'Ward Status', link: '/admin/beds', run: () => api.getBedStats().catch(() => null) },
      { key: 'inventory', label: 'Inventory Alerts', link: '/inventory', run: () => api.getInventoryStats().catch(() => null) },
    ],
  },
  helper: {
    title: 'Helper Console',
    calls: [
      { key: 'appointments', label: "Today's Appointments", link: '/appointments', run: () => api.getAppointments({ limit: 200 }).catch(() => null) },
      { key: 'beds', label: 'Ward Beds', link: '/admin/beds', run: () => api.getBedStats().catch(() => null) },
    ],
  },
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const role = user?.role || 'staff';
  const conf = ROLE_CONFIG[role] || ROLE_CONFIG.helper;
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const out = {};
      await Promise.all(conf.calls.map(async (c) => {
        try {
          const res = await c.run();
          out[c.key] = res;
        } catch { out[c.key] = null; }
      }));
      if (active) {
        setStats(out);
        setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const valueFor = (key, res) => {
    if (!res) return '—';
    if (key === 'beds' && (res.available ?? res.total)) {
      return `${res.available ?? 0}/${res.total ?? 0} free`;
    }
    if (key === 'billing' && Array.isArray(res.bills || res.data)) {
      const rows = res.bills || res.data;
      const sum = rows.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      return inr(sum);
    }
    return countOf(res, ['orders', 'bookings', 'appointments', 'data', 'items', 'rows']);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{conf.title}</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user?.name} · {role} · live ward data below</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {conf.calls.map((c) => (
            <Link key={c.key} to={c.link} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-2xl font-bold text-foreground">{valueFor(c.key, stats[c.key])}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label} →</p>
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Full clinical tools are in the sidebar (IPD, Triage, Nursing, Diet, BloodBank, Physio, OPD Token, Lab, Pharmacy, Radiology).</p>
    </div>
  );
}
