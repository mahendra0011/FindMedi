'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  TestTube, ShoppingCart, ClipboardList, ChevronRight, Syringe, Pill
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LabBookingItem {
  _id: string;
  bookingId?: string;
  tests?: string[];
  labName?: string;
  status: string;
}

export interface MedOrderItem {
  _id: string;
  orderId?: string;
  total?: number;
  status: string;
}

export interface PrescriptionRecord {
  _id: string;
  doctorName?: string;
  medicines?: unknown[];
  status?: string;
}

const statusColors: Record<string, string> = {
  Confirmed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Shipped: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Dispensed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Ready: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

interface PatientServicesRowProps {
  recentTests: LabBookingItem[];
  recentOrders: MedOrderItem[];
  activeOrders: number;
  prescriptions: PrescriptionRecord[];
  activeRxCount: number;
}

export function PatientServicesRow({
  recentTests,
  recentOrders,
  activeOrders,
  prescriptions,
  activeRxCount,
}: PatientServicesRowProps) {
  const router = useRouter();

  return (
    <div className="grid lg:grid-cols-3 gap-6 mb-6">
      {/* Recent Lab Bookings */}
      <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center shadow-sm">
              <TestTube className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Lab Tests</h3>
              <p className="text-xs text-muted-foreground">
                {recentTests.length > 0 ? `${recentTests.length} recent` : 'No tests booked'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-500"
            onClick={() => router.push('/patient/bookings')}
          >
            View <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        {recentTests.length > 0 ? (
          <div className="space-y-3">
            {recentTests.map(t => (
              <div
                key={t._id}
                className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-cyan-500/20 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    <p className="text-sm font-semibold text-foreground">{t.labName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                    {(t.tests || []).slice(0, 2).join(', ')}
                    {t.tests && t.tests.length > 2 ? ` +${t.tests.length - 2}` : ''}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <TestTube className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No tests booked</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Schedule a lab test</p>
            <Button
              size="sm"
              className="mt-4 rounded-xl shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700"
              onClick={() => router.push('/patient/services')}
            >
              <Syringe className="w-3.5 h-3.5 mr-1.5" /> Book Now
            </Button>
          </div>
        )}
      </div>

      {/* Active Orders */}
      <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Medicine Orders</h3>
              <p className="text-xs text-muted-foreground">
                {activeOrders > 0 ? `${activeOrders} active` : 'No active orders'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-amber-500 border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-500"
            onClick={() => router.push('/patient/medicine-orders')}
          >
            View <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div
                key={o._id}
                className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-amber-500/20 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Pill className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-sm font-semibold text-foreground">
                      {o.orderId || `Order #${String(o._id).slice(-6)}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5">₹{o.total?.toLocaleString() || 0}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No active orders</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Order medicines for delivery</p>
            <Button
              size="sm"
              className="mt-4 rounded-xl shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => router.push('/pharmacy')}
            >
              <Pill className="w-3.5 h-3.5 mr-1.5" /> Shop Now
            </Button>
          </div>
        )}
      </div>

      {/* Active Prescriptions */}
      <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
              <ClipboardList className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Active Prescriptions</h3>
              <p className="text-xs text-muted-foreground">
                {activeRxCount > 0 ? `${activeRxCount} active` : 'No active scripts'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-blue-500 border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500"
            onClick={() => router.push('/patient/prescriptions')}
          >
            View <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        {prescriptions.length > 0 ? (
          <div className="space-y-3">
            {prescriptions.slice(0, 3).map(rx => (
              <div
                key={rx._id}
                className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-blue-500/20 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-sm font-semibold text-foreground">{rx.doctorName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                    {(rx.medicines || []).length} medicines prescribed
                  </p>
                </div>
                <StatusBadge status={rx.status || 'Active'} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No prescriptions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Visit a doctor to get one</p>
          </div>
        )}
      </div>
    </div>
  );
}
