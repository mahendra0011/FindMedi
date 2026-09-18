'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  PatientModal,
  SupportTicketForm,
} from '@/components/patient';
import { usePatientDashboardData } from '@/features/patient-dashboard/hooks';

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [apptTab, setApptTab] = useState<'pending' | 'upcoming' | 'today' | 'complete'>('upcoming');

  const {
    payments,
    prescriptions,
    pendingAppts,
    upcomingAppts,
    todayAppts,
    completedAppts,
    pendingBills,
    activeRxCount,
    activeOrders,
    refunds,
    totalRefunded,
    pendingRefunds,
    recentTests,
    recentOrders,
    statValues,
    cancelAppointment,
  } = usePatientDashboardData(user);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    if (await cancelAppointment(id)) {
      showToast('Appointment cancelled');
    } else {
      showToast('Failed to cancel', 'error');
    }
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
          onCancelTarget={(id) => setCancelTarget(id)}
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
      <PatientRefundsSection refunds={refunds} totalRefunded={totalRefunded} pendingRefunds={pendingRefunds} />

      {/* Support Ticket Modal */}
      {showModal === 'support-ticket' && (
        <PatientModal title="Submit Support Ticket" onClose={() => setShowModal(null)}>
          <SupportTicketForm
            onClose={() => {
              setShowModal(null);
              showToast('Ticket submitted');
            }}
            showToast={showToast}
          />
        </PatientModal>
      )}

      {/* Add Payment Modal */}
      {showModal === 'add-payment' && (
        <PatientModal title="Make a Payment" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a bill to pay from your pending invoices.</p>
            {pendingBills.slice(0, 5).map((b) => (
              <div key={b._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{b.invoiceId}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.service} · ₹{((b.amount || 0) - (b.paid || 0)).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    router.push('/patient/history');
                    setShowModal(null);
                  }}
                >
                  Pay Now
                </Button>
              </div>
            ))}
            {pendingBills.length === 0 && <p className="text-center py-4 text-sm text-muted-foreground">No pending bills</p>}
          </div>
        </PatientModal>
      )}

      {/* Cancel Appointment Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this appointment? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep Appointment
            </Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancelAppointment}>
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
