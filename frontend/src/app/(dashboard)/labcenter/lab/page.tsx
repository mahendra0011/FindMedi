/**
 * Lab Overview — lab home hub with live counts and links to sub-sections.
 * No legacy source exists for this route; aggregates the real lab endpoints.
 */
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { FlaskConical, CalendarDays, ClipboardList, Package, ArrowRight, Loader2 } from 'lucide-react';
import { lab, tests } from '@/lib/api';

const links = [
  { href: '/labcenter/bookings', label: 'Bookings', desc: 'Manage collection bookings' },
  { href: '/labcenter/samples', label: 'Samples', desc: 'Track sample collection' },
  { href: '/labcenter/tests', label: 'Test Catalog', desc: 'Browse offered tests' },
  { href: '/labcenter/packages', label: 'Packages', desc: 'Health checkup bundles' },
  { href: '/labcenter/reports', label: 'Reports', desc: 'Upload and deliver reports' },
  { href: '/labcenter/equipment', label: 'Equipment', desc: 'Analyzer and device registry' },
];

export default function LabPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['lab-overview-stats'],
    queryFn: () => lab.getStats(),
    staleTime: 60_000,
  });

  const { data: testsData } = useQuery({
    queryKey: ['lab-overview-tests'],
    queryFn: () => tests.get({}),
    staleTime: 300_000,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['lab-overview-bookings'],
    queryFn: () => lab.getBookings({}),
    staleTime: 30_000,
  });

  const stats = (statsData ?? {}) as { total?: number; pending?: number };
  const testCount = Array.isArray(testsData) ? testsData.length : 0;
  const bookings = (Array.isArray(bookingsData) ? bookingsData : []) as unknown as { status?: string }[];
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Overview</h1>
        <p className="text-muted-foreground">Your diagnostic center at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{testCount}</p>
          <p className="text-sm text-muted-foreground">Tests Offered</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
            <CalendarDays className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
          <p className="text-sm text-muted-foreground">Total Bookings</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-2">
            <ClipboardList className="w-5 h-5 text-info" />
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <Package className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total ?? bookings.length}</p>
          <p className="text-sm text-muted-foreground">All Time</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l, i) => (
          <motion.div
            key={l.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={l.href}
              className="flex items-center justify-between bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div>
                <p className="font-semibold text-foreground">{l.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
