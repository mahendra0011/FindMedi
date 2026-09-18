/**
 * Patient dashboard feature — data hooks.
 * Aggregates appointments, billing, pharmacy, records, notifications,
 * reviews and lab bookings for the patient dashboard screen.
 *
 * NOTE: display-list types (DisplayAppointment, PaymentItem, …) are imported
 * as types only from the patient components that own them.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import type {
  DisplayAppointment,
  PaymentItem,
  RefundItem,
  MedOrderItem,
  PrescriptionRecord,
  LabBookingItem,
} from '@/components/patient';
import type {
  BillItem,
  ReportItem,
  DashboardNotificationItem,
  DashboardReviewItem,
  PatientDashboardUser,
} from './types';

export function usePatientDashboardData(user: PatientDashboardUser | null) {
  const [appointments, setAppointments] = useState<DisplayAppointment[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrderItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [testBookings, setTestBookings] = useState<LabBookingItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [notifs, setNotifs] = useState<DashboardNotificationItem[]>([]);
  const [reviews, setReviews] = useState<DashboardReviewItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;

    const load = async () => {
      try {
        const [aRes, rRes, bRes] = await Promise.all([
          api.getAppointments().catch(() => ({ data: [] })),
          api.getRecords().catch(() => ({ data: [] })),
          api.getBilling().catch(() => ({ data: [] })),
        ]);

        const aRaw = aRes as unknown as { appointments?: DisplayAppointment[]; data?: DisplayAppointment[] } | DisplayAppointment[];
        setAppointments(Array.isArray(aRaw) ? aRaw : (aRaw?.appointments || aRaw?.data || []));

        const bRaw = bRes as unknown as { bills?: BillItem[]; data?: BillItem[] } | BillItem[];
        const rawBills = Array.isArray(bRaw) ? bRaw : (bRaw?.bills || bRaw?.data || []);

        const [pRes, rfRes] = await Promise.all([
          api.getPayments({ patient_id: userId }).catch(() => ({ data: [] })),
          api.getRefunds({ patient_id: userId }).catch(() => ({ payments: [] })),
        ]);

        const pRaw = pRes as unknown as { payments?: PaymentItem[]; data?: PaymentItem[] } | PaymentItem[];
        const rawPayments = Array.isArray(pRaw) ? pRaw : (pRaw?.payments || pRaw?.data || []);
        setPayments(rawPayments);

        const rfRaw = rfRes as unknown as { payments?: RefundItem[]; data?: RefundItem[] } | RefundItem[];
        const rawRefunds = Array.isArray(rfRaw) ? rfRaw : (rfRaw?.payments || rfRaw?.data || []);
        setRefunds(rawRefunds);

        const uid = String(userId || '');
        const paidRefs = new Set(rawPayments.map((pay) => pay.invoice_id || pay.invoiceId || pay.referenceId));
        const paidSignatures = new Set(rawPayments.map((pay) => `${String(pay.patient_id || pay.patientId || '')}:${pay.amount}`));
        setBills(
          rawBills.map((bill) => {
            if (paidRefs.has(bill.invoiceId || bill._id)) return { ...bill, status: 'Paid' };
            if (bill.status !== 'Paid' && uid && paidSignatures.has(`${uid}:${bill.amount}`)) return { ...bill, status: 'Paid' };
            return bill;
          }),
        );

        const [phOrders, rx, n, lb] = await Promise.all([
          api.getPharmacyOrders({}).catch(() => ({ orders: [] })),
          api.getPharmacyPrescriptions({}).catch(() => ({ prescriptions: [] })),
          api.getNotifications({}).catch(() => ({ data: [] })),
          api.getLabBookings({}).catch(() => ({ bookings: [] })),
        ]);

        const phRaw = phOrders as unknown as { orders?: MedOrderItem[] };
        if (phRaw?.orders?.length) setMedOrders(phRaw.orders);

        const rxRaw = rx as unknown as { prescriptions?: PrescriptionRecord[] } | PrescriptionRecord[];
        if (Array.isArray(rxRaw) && rxRaw.length) setPrescriptions(rxRaw);
        else if ((rxRaw as { prescriptions?: PrescriptionRecord[] })?.prescriptions?.length) {
          setPrescriptions((rxRaw as { prescriptions: PrescriptionRecord[] }).prescriptions);
        }

        const notifRaw = n as unknown as { notifications?: DashboardNotificationItem[]; data?: DashboardNotificationItem[] } | DashboardNotificationItem[];
        const notifList = Array.isArray(notifRaw) ? notifRaw : (notifRaw?.notifications || notifRaw?.data || []);
        if (notifList.length) setNotifs(notifList);

        const revData = await api.getReviews({ patientId: userId }).catch(() => []);
        const revRaw = revData as unknown as { reviews?: DashboardReviewItem[] } | DashboardReviewItem[];
        if (Array.isArray(revRaw) && revRaw.length) setReviews(revRaw);
        else if ((revRaw as { reviews?: DashboardReviewItem[] })?.reviews?.length) {
          setReviews((revRaw as { reviews: DashboardReviewItem[] }).reviews);
        }

        const lbRaw = lb as unknown as { bookings?: Array<Record<string, unknown>> };
        if (lbRaw?.bookings?.length) {
          setTestBookings(
            lbRaw.bookings.map((b) => ({
              _id: String(b._id || ''),
              bookingId: String(b.bookingId || `LB-${String(b._id || '').slice(-6)}`),
              tests: (b.tests as string[]) || [],
              labName: (b.facilityId as { name?: string })?.name || String(b.labName || 'Lab'),
              status: String(b.status || 'Pending'),
            })),
          );
        }

        const rRaw = rRes as unknown as
          | { data?: Array<Record<string, unknown>>; records?: Array<Record<string, unknown>> }
          | Array<Record<string, unknown>>;
        const allRecs = Array.isArray(rRaw) ? rRaw : (rRaw?.data || rRaw?.records || []);
        const reportRecs = allRecs.filter((rec) =>
          ['Lab Report', 'Imaging', 'lab_report', 'Cardiac'].includes(String(rec.type)),
        );
        if (reportRecs.length) {
          setReports(
            reportRecs.map((rec) => ({
              _id: String(rec._id || ''),
              name: String(rec.diagnosis || (rec.data as Record<string, unknown>)?.testName || rec.type),
              type: String(rec.type || ''),
              date: String(rec.date || ''),
              status:
                (rec.data as Record<string, unknown>)?.status === 'Completed'
                  ? 'Ready'
                  : String((rec.data as Record<string, unknown>)?.status || 'Ready'),
              orderedBy: String(rec.doctor || ''),
              labName: String(
                (rec.data as Record<string, unknown>)?.labName ||
                  (rec.data as Record<string, unknown>)?.facilityName ||
                  '',
              ),
            })),
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user]);

  const today = getISTDateString();
  const pendingAppts = appointments.filter((a) => a.status === 'Pending' || a.status === 'pending');
  const upcomingAppts = appointments.filter(
    (a) => (a.status === 'Confirmed' || a.status === 'Approved' || a.status === 'confirmed') && a.date >= today,
  );
  const todayAppts = appointments.filter((a) => a.date === today && a.status !== 'Cancelled');
  const completedAppts = appointments.filter((a) => a.status === 'Completed' || a.status === 'completed');
  const unreadNotifs = notifs.filter((n) => !n.read).length;

  const cancelAppointment = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      setAppointments((prev) => prev.map((ap) => (ap._id === id ? { ...ap, status: 'Cancelled' } : ap)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const isBillPaid = useCallback(
    (bill: BillItem) => {
      if (bill.status === 'Paid') return true;
      const userId = user?._id || user?.id;
      const uid = String(userId || '');
      return payments.some(
        (p) =>
          p.invoice_id === bill.invoiceId ||
          p.invoiceId === bill.invoiceId ||
          (String(p.patient_id || p.patientId || '') === uid && p.amount === bill.amount),
      );
    },
    [payments, user],
  );

  const pendingBills = bills.filter((b) => !isBillPaid(b));
  const activeRxCount = prescriptions.filter((r) => r.status === 'Active').length;
  const activeOrders = medOrders.filter((o) => o.status !== 'Delivered').length;
  const readyReportsCount = reports.filter((r) => r.status === 'Ready').length;
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter((r) => r.status === 'Pending' || r.status === 'pending').length;
  const recentTests = testBookings.slice(0, 3);
  const recentOrders = medOrders.filter((o) => o.status !== 'Delivered').slice(0, 3);

  const statValues: Record<string, number> = {
    'Upcoming Appts': upcomingAppts.length,
    'Active Prescriptions': activeRxCount,
    'Active Orders': activeOrders,
    'Reports Ready': readyReportsCount,
    Notifications: unreadNotifs,
    'Test Bookings': recentTests.length,
    'My Reviews': reviews.length,
  };

  return {
    appointments,
    bills,
    medOrders,
    prescriptions,
    testBookings,
    reports,
    notifs,
    reviews,
    refunds,
    payments,
    pendingAppts,
    upcomingAppts,
    todayAppts,
    completedAppts,
    pendingBills,
    activeRxCount,
    activeOrders,
    readyReportsCount,
    totalRefunded,
    pendingRefunds,
    recentTests,
    recentOrders,
    statValues,
    cancelAppointment,
  };
}
