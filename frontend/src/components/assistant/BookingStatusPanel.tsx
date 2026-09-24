import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  XCircle,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Star,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TaskChecklistView } from './TaskChecklistView';
import { AssistantChatPanel } from './AssistantChatPanel';
import { api } from '../../lib/api';

interface Props {
  booking: any;
  currentUser: any;
  assistantProfile?: any;
  isAssistant?: boolean;
  onRefresh: () => void;
  onNewBooking?: () => void;
}

export const BookingStatusPanel: React.FC<Props> = ({
  booking,
  currentUser,
  assistantProfile,
  isAssistant = false,
  onRefresh,
  onNewBooking,
}) => {
  const [showChat, setShowChat] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'demo_wallet' | 'cash'>('demo_wallet');
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!booking) return null;

  const otherUser = isAssistant ? booking.patientId : booking.assistantId;
  const status = booking.status;
  const isPaid = booking.payment?.status === 'paid';
  const hasRated = isAssistant
    ? Boolean(booking.ratingByAssistant?.stars)
    : Boolean(booking.ratingByPatient?.stars);

  const handleToggleTask = async (taskId: string, isDone: boolean) => {
    try {
      await api.updateAssistantTask(booking._id, taskId, isDone);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleAddCustomTask = async (label: string, category: string) => {
    try {
      await api.addAssistantCustomTask(booking._id, label, category);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add custom task');
    }
  };

  const handleCancelBooking = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await api.cancelAssistantBooking(booking._id, reason);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessDemoPay = async () => {
    try {
      setPaying(true);
      await api.payDemoRide({
        bookingId: booking._id,
        bookingType: 'assistant',
        method: payMethod,
      });
      setPaySuccess(true);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed');
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRatingSubmitting(true);
      await api.rateAssistantBooking(booking._id, {
        stars: ratingStars,
        comment: ratingComment,
      });
      setShowRateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    api.downloadAssistantReceipt(
      booking._id,
      `Assistant-Receipt-${booking.bookingNumber || booking._id}.pdf`
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 1. REQUESTED STATE ──────────────────────────────────── */}
      {status === 'requested' && (
        <div className="p-6 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center animate-in fade-in">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-7 h-7 animate-spin duration-3000" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Waiting for Assistant Confirmation...
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            {booking.isUrgent
              ? `Urgent request broadcasting to attendants covering ${booking.hospital}.`
              : `Booking request sent for ${booking.hospital}. The attendant will confirm shortly.`}
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelBooking}
              disabled={actionLoading}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              Cancel Request
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. CONFIRMED STATE ──────────────────────────────────── */}
      {status === 'confirmed' && (
        <div className="p-6 rounded-3xl bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-teal-200 dark:border-teal-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 uppercase tracking-wider mb-0.5">
                  Confirmed
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAssistant
                    ? `Assisting ${otherUser?.name || 'Patient'} at ${booking.hospital}`
                    : `${otherUser?.name || 'Assistant'} will meet you at ${booking.hospital}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.startTime || 'Scheduled Time'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {otherUser?.phone && (
                <a href={`tel:${otherUser.phone}`}>
                  <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-teal-600" /> Call
                  </Button>
                </a>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="h-9 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                <MessageSquare className="w-3.5 h-3.5" /> {showChat ? 'Hide Chat' : 'Chat'}
              </Button>
            </div>
          </div>

          {/* Assistant Action: Check In button */}
          {isAssistant && (
            <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Have you reached the hospital?
                </div>
                <div className="text-[11px] text-slate-500">
                  Click below to notify the patient that you have arrived and started duty.
                </div>
              </div>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await api.checkInAssistantBooking(booking._id);
                    onRefresh();
                  } catch (e: any) {
                    alert(e.message || 'Check in failed');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Check In at Hospital
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 3. IN_PROGRESS STATE ────────────────────────────────── */}
      {status === 'in_progress' && (
        <div className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <span className="w-3.5 h-3.5 bg-white rounded-full animate-ping" />
              </div>
              <div>
                <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider mb-1">
                  🟢 Duty In Progress
                </Badge>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAssistant
                    ? `Assisting ${otherUser?.name || 'Patient'} at ${booking.hospital}`
                    : `${otherUser?.name || 'Assistant'} is active on duty at ${booking.hospital}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Checked in at{' '}
                  {booking.checkInAt ? new Date(booking.checkInAt).toLocaleTimeString() : 'Hospital'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="h-9 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                <MessageSquare className="w-3.5 h-3.5" /> {showChat ? 'Hide Chat' : 'In-Hospital Chat'}
              </Button>
            </div>
          </div>

          {/* Live Task Checklist */}
          <TaskChecklistView
            tasks={booking.taskChecklist || []}
            isAssistant={isAssistant}
            onToggleTask={handleToggleTask}
            onAddCustomTask={handleAddCustomTask}
          />

          {/* Assistant Action: Complete Assistance */}
          {isAssistant && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Finished your assistance shift?
                </div>
                <div className="text-[11px] text-slate-500">
                  Mark this session completed to submit your summary and trigger patient payment.
                </div>
              </div>
              <Button
                type="button"
                onClick={async () => {
                  const note = prompt('Enter a short summary note for the patient (e.g. All reports collected & medicines delivered):');
                  try {
                    await api.completeAssistantBooking(booking._id, note || 'All hospital tasks completed.');
                    onRefresh();
                  } catch (e: any) {
                    alert(e.message || 'Complete failed');
                  }
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                Mark Assistance Completed
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. COMPLETED STATE ──────────────────────────────────── */}
      {status === 'completed' && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <Badge className="bg-teal-700 text-white text-[10px]">COMPLETED</Badge>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Assistance Successfully Completed
              </h3>
              <p className="text-xs text-slate-500">
                Hospital: {booking.hospital} • Finished on{' '}
                {new Date(booking.completedAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {booking.completionSummary && (
            <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-teal-800 dark:text-teal-400 block mb-0.5">
                Assistant Summary Note:
              </span>
              "{booking.completionSummary}"
            </div>
          )}

          {/* Payment Status / Pay Now CTA */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Total Amount</div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                ₹{typeof booking.cost?.total === 'number' ? booking.cost.total : 0}
              </div>
              <div className="text-xs mt-0.5 flex items-center gap-1.5">
                Status:{' '}
                {isPaid ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAID (DEMO)
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold">PAYMENT PENDING</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isPaid && !isAssistant && (
                <Button
                  type="button"
                  onClick={() => setShowPayModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pay with Demo Wallet
                </Button>
              )}

              {isPaid && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReceipt}
                  className="text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Receipt
                </Button>
              )}

              {!hasRated && isPaid && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRateModal(true)}
                  className="text-xs gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate Experience
                </Button>
              )}

              {onNewBooking && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onNewBooking}
                  className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Book Another
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. CANCELLED / DECLINED STATE ──────────────────────── */}
      {['declined_by_assistant', 'cancelled_by_patient', 'cancelled_by_assistant'].includes(status) && (
        <div className="p-6 rounded-3xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-center animate-in fade-in">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {status === 'declined_by_assistant'
              ? 'Booking Declined by Assistant'
              : 'Booking Cancelled'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {status === 'declined_by_assistant'
              ? 'The assistant was not available for this shift. Please choose another verified assistant.'
              : 'This care session was cancelled.'}
          </p>

          {onNewBooking && (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                onClick={onNewBooking}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                Find Another Assistant
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Realtime Chat Collapsible Drawer ────────────────────────── */}
      {showChat && (
        <div className="mt-4">
          <AssistantChatPanel
            bookingId={booking._id}
            currentUser={currentUser}
            targetUser={otherUser}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* ── Demo Payment Sheet Modal ───────────────────────────────── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Demo Payment Settlement
                </h3>
              </div>
              <Badge className="bg-amber-500 text-white text-[10px]">SIMULATED</Badge>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border text-xs">
                <div className="text-slate-400">Total Payable</div>
                <div className="text-2xl font-black text-emerald-600">
                  ₹{typeof booking.cost?.total === 'number' ? booking.cost.total : 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Assistant: {otherUser?.name || 'Hospital Assistant'} • {booking.hospital}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Select Simulated Method:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('demo_wallet')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      payMethod === 'demo_wallet'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Demo Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      payMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Cash in Hand
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Note: This is 100% demo mode for prototype demonstration. No real bank charges will occur.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPayModal(false)}
                className="flex-1 text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleProcessDemoPay}
                disabled={paying}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {paying ? 'Processing...' : 'Confirm Demo Pay'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Experience Modal ──────────────────────────────────── */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleSubmitRating}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
          >
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
              Rate Your {isAssistant ? 'Patient' : 'Assistant'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your feedback helps maintain trust and safety across hospital attendants.
            </p>

            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= ratingStars
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="Share a short comment about your experience..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRateModal(false)}
                className="flex-1 text-xs"
              >
                Skip
              </Button>
              <Button
                type="submit"
                disabled={ratingSubmitting}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
