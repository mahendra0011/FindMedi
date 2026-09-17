'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  PatientHeader,
  PatientStatsGrid,
  PatientTelehealthHub,
  PatientAppointmentsSection,
  PatientPaymentHistory,
  PatientServicesRow,
  PatientQuickActions,
  PatientRefundsSection,
  type DisplayAppointment,
  type PaymentItem,
  type RefundItem,
  type MedOrderItem,
  type PrescriptionRecord,
  type LabBookingItem,
} from '@/components/patient';

interface BillItem {
  _id: string;
  invoiceId?: string;
  service?: string;
  amount?: number;
  paid?: number;
  status?: string;
}

interface ReportItem {
  _id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  orderedBy: string;
  labName: string;
}

interface NotificationItem {
  _id: string;
  title?: string;
  message?: string;
  read?: boolean;
}

interface ReviewItem {
  _id: string;
}

const SupportTicketForm = ({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!subject || !message) return showToast('Please fill all fields', 'error');
    setSubmitting(true);
    try {
      await api.createSupportTicket({ subject, message });
      showToast('Support ticket submitted');
      onClose();
    } catch {
      showToast('Failed to submit ticket', 'error');
    }
    setSubmitting(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Subject</label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief title for your issue" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue in detail..."
          className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={submitting || !subject || !message}>
        {submitting ? 'Submitting...' : 'Submit Ticket'}
      </Button>
    </div>
  );
};

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold">{title}</h2>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [appointments, setAppointments] = useState<DisplayAppointment[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrderItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [testBookings, setTestBookings] = useState<LabBookingItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [apptTab, setApptTab] = useState<'pending' | 'upcoming' | 'today' | 'complete'>('upcoming');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      setAppointments(prev => prev.map(ap => ap._id === id ? { ...ap, status: 'Cancelled' } : ap));
      showToast('Appointment cancelled');
    } catch {
      showToast('Failed to cancel', 'error');
    }
  };

  useEffect(() => {
    const userId = user?._id || (user as { id?: string })?.id;
    if (!userId) return;

    const load = async () => {
      try {
        const [aRes, rRes, bRes] = await Promise.all([
          api.getAppointments().catch(() => ({ data: [] })),
          api.getRecords().catch(() => ({ data: [] })),
          api.getBilling().catch(() => ({ data: [] })),
        ]);

        const aRaw = aRes as unknown as { appointments?: DisplayAppointment[]; data?: DisplayAppointment[] } | DisplayAppointment[];
        setAppointments(Array.isArray(aRaw) ? aRaw : aRaw?.appointments || aRaw?.data || []);

        const bRaw = bRes as unknown as { bills?: BillItem[]; data?: BillItem[] } | BillItem[];
        const rawBills = Array.isArray(bRaw) ? bRaw : bRaw?.bills || bRaw?.data || [];

        const [pRes, rfRes] = await Promise.all([
          api.getPayments({ patient_id: userId } as Record<string, unknown>).catch(() => ({ data: [] })),
          api.getRefunds({ patient_id: userId } as Record<string, unknown>).catch(() => ({ payments: [] })),
        ]);

        const pRaw = pRes as unknown as { payments?: PaymentItem[]; data?: PaymentItem[] } | PaymentItem[];
        const rawPayments = Array.isArray(pRaw) ? pRaw : pRaw?.payments || pRaw?.data || [];
        setPayments(rawPayments);

        const rfRaw = rfRes as unknown as { payments?: RefundItem[]; data?: RefundItem[] } | RefundItem[];
        const rawRefunds = Array.isArray(rfRaw) ? rfRaw : rfRaw?.payments || rfRaw?.data || [];
        setRefunds(rawRefunds);

        const uid = String(userId || '');
        const paidRefs = new Set(rawPayments.map(pay => pay.invoice_id || pay.invoiceId || pay.referenceId));
        const paidSignatures = new Set(rawPayments.map(pay => `${String(pay.patient_id || pay.patientId || '')}:${pay.amount}`));
        setBills(rawBills.map(bill => {
          if (paidRefs.has(bill.invoiceId || bill._id)) return { ...bill, status: 'Paid' };
          if (bill.status !== 'Paid' && uid && paidSignatures.has(`${uid}:${bill.amount}`)) return { ...bill, status: 'Paid' };
          return bill;
        }));

        const [phOrders, rx, n, lb] = await Promise.all([
          api.getPharmacyOrders({} as Record<string, unknown>).catch(() => ({ orders: [] })),
          api.getPharmacyPrescriptions({} as Record<string, unknown>).catch(() => ({ prescriptions: [] })),
          api.getNotifications({} as Record<string, unknown>).catch(() => ({ data: [] })),
          api.getLabBookings({} as Record<string, unknown>).catch(() => ({ bookings: [] })),
        ]);

        const phRaw = phOrders as unknown as { orders?: MedOrderItem[] };
        if (phRaw?.orders?.length) setMedOrders(phRaw.orders);

        const rxRaw = rx as unknown as { prescriptions?: PrescriptionRecord[] } | PrescriptionRecord[];
        if (Array.isArray(rxRaw) && rxRaw.length) setPrescriptions(rxRaw);
        else if ((rxRaw as { prescriptions?: PrescriptionRecord[] })?.prescriptions?.length) {
          setPrescriptions((rxRaw as { prescriptions: PrescriptionRecord[] }).prescriptions);
        }

        const notifRaw = n as unknown as { notifications?: NotificationItem[]; data?: NotificationItem[] } | NotificationItem[];
        const notifList = Array.isArray(notifRaw) ? notifRaw : notifRaw?.notifications || notifRaw?.data || [];
        if (notifList.length) setNotifs(notifList);

        const revData = await api.getReviews({ patientId: userId } as Record<string, unknown>).catch(() => []);
        const revRaw = revData as unknown as { reviews?: ReviewItem[] } | ReviewItem[];
        if (Array.isArray(revRaw) && revRaw.length) setReviews(revRaw);
        else if ((revRaw as { reviews?: ReviewItem[] })?.reviews?.length) {
          setReviews((revRaw as { reviews: ReviewItem[] }).reviews);
        }

        const lbRaw = lb as unknown as { bookings?: Array<Record<string, unknown>> };
        if (lbRaw?.bookings?.length) {
          setTestBookings(lbRaw.bookings.map(b => ({
            _id: String(b._id || ''),
            bookingId: String(b.bookingId || `LB-${String(b._id || '').slice(-6)}`),
            tests: (b.tests as string[]) || [],
            labName: (b.facilityId as { name?: string })?.name || String(b.labName || 'Lab'),
            status: String(b.status || 'Pending'),
          })));
        }

        const rRaw = rRes as unknown as { data?: Array<Record<string, unknown>>; records?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
        const allRecs = Array.isArray(rRaw) ? rRaw : rRaw?.data || rRaw?.records || [];
        const reportRecs = allRecs.filter(rec => ['Lab Report', 'Imaging', 'lab_report', 'Cardiac'].includes(String(rec.type)));
        if (reportRecs.length) {
          setReports(reportRecs.map(rec => ({
            _id: String(rec._id || ''),
            name: String(rec.diagnosis || (rec.data as Record<string, unknown>)?.testName || rec.type),
            type: String(rec.type || ''),
            date: String(rec.date || ''),
            status: (rec.data as Record<string, unknown>)?.status === 'Completed' ? 'Ready' : String((rec.data as Record<string, unknown>)?.status || 'Ready'),
            orderedBy: String(rec.doctor || ''),
            labName: String((rec.data as Record<string, unknown>)?.labName || (rec.data as Record<string, unknown>)?.facilityName || ''),
          })));
        }
      } catch (e) {
        console.error(e);
        showToast('Failed to load dashboard data', 'error');
      }
    };
    load();
  }, [user]);

  const today = getISTDateString();
  const pendingAppts = appointments.filter(a => a.status === 'Pending' || a.status === 'pending');
  const upcomingAppts = appointments.filter(a => (a.status === 'Confirmed' || a.status === 'Approved' || a.status === 'confirmed') && a.date >= today);
  const todayAppts = appointments.filter(a => a.date === today && a.status !== 'Cancelled');
  const completedAppts = appointments.filter(a => a.status === 'Completed' || a.status === 'completed');
  const unreadNotifs = notifs.filter(n => !n.read).length;

  const isBillPaid = (bill: BillItem) => {
    if (bill.status === 'Paid') return true;
    const userId = user?._id || (user as { id?: string })?.id;
    const uid = String(userId || '');
    return payments.some(p =>
      p.invoice_id === bill.invoiceId ||
      p.invoiceId === bill.invoiceId ||
      (String(p.patient_id || p.patientId || '') === uid && p.amount === bill.amount)
    );
  };

  const pendingBills = bills.filter(b => !isBillPaid(b));
  const activeRxCount = prescriptions.filter(r => r.status === 'Active').length;
  const activeOrders = medOrders.filter(o => o.status !== 'Delivered').length;
  const readyReportsCount = reports.filter(r => r.status === 'Ready').length;
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;
  const recentTests = testBookings.slice(0, 3);
  const recentOrders = medOrders.filter(o => o.status !== 'Delivered').slice(0, 3);

  const statValues: Record<string, number> = {
    'Upcoming Appts': upcomingAppts.length,
    'Active Prescriptions': activeRxCount,
    'Active Orders': activeOrders,
    'Reports Ready': readyReportsCount,
    'Notifications': unreadNotifs,
    'Test Bookings': recentTests.length,
    'My Reviews': reviews.length,
  };

  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`fixed top-4 right-4 z-[60] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200/50 dark:bg-red-950 dark:text-red-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner */}
      <PatientHeader userName={user?.name} />

      {/* Stats Grid */}
      <PatientStatsGrid statValues={statValues} />

      {/* Telehealth & Communication Suite */}
      <PatientTelehealthHub />

      {/* Appointments & Payment History */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <PatientAppointmentsSection
          apptTab={apptTab}
          setApptTab={setApptTab}
          pendingAppts={pendingAppts}
          upcomingAppts={upcomingAppts}
          todayAppts={todayAppts}
          completedAppts={completedAppts}
          onCancelTarget={id => setCancelTarget(id)}
        />
        <PatientPaymentHistory payments={payments} />
      </div>

      {/* Lab Tests, Active Orders, Prescriptions */}
      <PatientServicesRow
        recentTests={recentTests}
        recentOrders={recentOrders}
        activeOrders={activeOrders}
        prescriptions={prescriptions}
        activeRxCount={activeRxCount}
      />

      {/* Quick Actions */}
      <PatientQuickActions />

      {/* Refund Section */}
      <PatientRefundsSection
        refunds={refunds}
        totalRefunded={totalRefunded}
        pendingRefunds={pendingRefunds}
      />

      {/* Support Ticket Modal */}
      {showModal === 'support-ticket' && (
        <Modal title="Submit Support Ticket" onClose={() => setShowModal(null)}>
          <SupportTicketForm onClose={() => { setShowModal(null); showToast('Ticket submitted'); }} showToast={showToast} />
        </Modal>
      )}

      {/* Add Payment Modal */}
      {showModal === 'add-payment' && (
        <Modal title="Make a Payment" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a bill to pay from your pending invoices.</p>
            {pendingBills.slice(0, 5).map(b => (
              <div key={b._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{b.invoiceId}</p>
                  <p className="text-xs text-muted-foreground">{b.service} · ₹{((b.amount || 0) - (b.paid || 0)).toLocaleString()}</p>
                </div>
                <Button size="sm" onClick={() => { router.push('/patient/history'); setShowModal(null); }}>Pay Now</Button>
              </div>
            ))}
            {pendingBills.length === 0 && <p className="text-center py-4 text-sm text-muted-foreground">No pending bills</p>}
          </div>
        </Modal>
      )}

      {/* Cancel Appointment Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(isOpen: boolean) => { if (!isOpen) setCancelTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this appointment? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep Appointment</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancelAppointment}>Cancel Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
