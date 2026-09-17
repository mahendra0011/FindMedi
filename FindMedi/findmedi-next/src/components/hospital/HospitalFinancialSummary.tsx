'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IndianRupee, ChevronRight, Download, Users, Star, Quote, MessageCircle,
  TestTube, Zap, RotateCcw, CreditCard, Smartphone, Landmark, Wallet,
  CalendarDays, ClipboardList, Syringe, Stethoscope, FileText, type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadPaymentInvoice } from '@/lib/api';

const methodIcons: Record<string, LucideIcon> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Landmark,
  cash: Wallet,
};

const quickActions = [
  { label: 'Schedule', icon: CalendarDays, link: '/clinic/schedule', desc: 'Manage slots' },
  { label: 'Patients', icon: Users, link: '/clinic/patients', desc: 'View records' },
  { label: 'Prescriptions', icon: ClipboardList, link: '/clinic/prescriptions', desc: 'Write Rx' },
  { label: 'Lab Tests', icon: Syringe, link: '/clinic/tests', desc: 'Order tests' },
  { label: 'Billing', icon: IndianRupee, link: '/clinic/billing', desc: 'Invoices' },
  { label: 'Consultations', icon: Stethoscope, link: '/clinic/consultations', desc: 'Active visits' },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Confirmed: 'bg-success/10 text-success',
    Pending: 'bg-warning/10 text-warning',
    Completed: 'bg-success/10 text-success',
    Cancelled: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

export interface HospitalFinancialReview {
  _id?: string;
  patientName?: string;
  doctorName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface HospitalFinancialTestRequest {
  _id?: string;
  bookingId?: string;
  testName?: string;
  tests?: string[];
  patientName?: string;
  status?: string;
  totalAmount?: number;
  discountedAmount?: number;
  date?: string;
  [key: string]: unknown;
}

export interface HospitalFinancialRefund {
  _id?: string;
  refundId?: string;
  refund_amount?: number;
  amount?: number;
  reason?: string;
  description?: string;
  status?: string;
  date?: string;
  patient?: string;
  patient_name?: string;
  patientName?: string;
  [key: string]: unknown;
}

export interface HospitalFinancialPayment {
  _id?: string;
  transactionId?: string;
  amount?: number;
  status?: string;
  date?: string;
  patient?: string;
  [key: string]: unknown;
}

interface HospitalFinancialSummaryProps {
  patients: string[];
  reviews: HospitalFinancialReview[];
  testRequests: HospitalFinancialTestRequest[];
  refunds: HospitalFinancialRefund[];
  totalRefunded: number;
  pendingRefunds: number;
  payments: HospitalFinancialPayment[];
}

export function HospitalFinancialSummary({
  patients,
  reviews,
  testRequests,
  refunds,
  totalRefunded,
  pendingRefunds,
  payments,
}: HospitalFinancialSummaryProps) {
  const router = useRouter();

  return (
    <>
      {/* Patients & Reviews Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Patients */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Patients</h3>
                <p className="text-xs text-muted-foreground">
                  {patients.length > 0 ? `${patients.length} total` : 'No patients'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-amber-500 border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-500"
              onClick={() => router.push('/clinic/patients')}
            >
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {patients.length > 0 ? (
            <div className="space-y-3">
              {patients.slice(0, 3).map((p, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-2 p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-amber-500/20 transition-all duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-sm font-semibold text-foreground truncate">{p}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No patients yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Patients will appear here</p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Recent Reviews</h3>
                <p className="text-xs text-muted-foreground">
                  {reviews.length > 0
                    ? `${reviews.length} review${reviews.length > 1 ? 's' : ''}`
                    : 'No reviews yet'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-blue-500 border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500"
              onClick={() => router.push('/clinic/reviews')}
            >
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.slice(0, 2).map(rv => (
                <div
                  key={rv._id}
                  className="p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-blue-500/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-foreground text-sm truncate">{rv.patientName}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= (rv.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rv.comment && (
                    <div className="flex items-start gap-1.5">
                      <Quote className="w-3 h-3 text-muted-foreground/30 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">{rv.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Patient reviews will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Requests */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center shadow-sm">
              <TestTube className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Test Requests</h3>
              <p className="text-xs text-muted-foreground">
                {testRequests.length > 0
                  ? `${testRequests.length} request${testRequests.length > 1 ? 's' : ''}`
                  : 'No test requests'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-rose-500 border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-500"
            onClick={() => router.push('/clinic/test-requests')}
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        {testRequests.length > 0 ? (
          <div className="space-y-3">
            {testRequests.slice(0, 4).map(req => {
              const testNames = req.tests?.join(', ') || req.testName || 'Test';
              const status = req.status || 'Pending';
              const amount = req.discountedAmount || req.totalAmount || 0;
              return (
                <div
                  key={req._id || req.bookingId}
                  className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-rose-500/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      <TestTube className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{req.patientName || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{testNames}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-foreground">₹{amount.toLocaleString('en-IN')}</span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <TestTube className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No test requests yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">When patients book tests, they will appear here</p>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Quick Actions</h3>
              <p className="text-xs text-muted-foreground">Tasks at your fingertips</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map(a => (
            <Link
              key={a.label}
              href={a.link}
              className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <a.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {a.label}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{a.desc}</span>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-border/0 group-hover:ring-primary/20 transition-all" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Refund Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border/60 p-5 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Refunds</h3>
              <p className="text-xs text-muted-foreground">
                {refunds.length > 0 ? `${refunds.length} record${refunds.length > 1 ? 's' : ''}` : 'No refunds'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()}</span>
            {pendingRefunds > 0 && <span className="text-warning font-medium">{pendingRefunds} pending</span>}
          </div>
        </div>
        {refunds.length > 0 ? (
          <div className="space-y-2.5">
            {refunds.slice(0, 3).map(rf => (
              <div key={rf._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {rf.patient_name || rf.patient || rf.patientName || rf.description || rf.reason || 'Refund'}
                  </p>
                  <p className="text-xs text-muted-foreground">{rf.reason || rf.description || 'Refund'}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-destructive">
                    ₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rf.status === 'Refunded' || rf.status === 'refunded'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {rf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No refunds yet</p>
          </div>
        )}
      </motion.div>
    </>
  );
}
