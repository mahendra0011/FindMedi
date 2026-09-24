import React, { useState, useEffect } from 'react';
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
  Scale,
  Video,
  UserCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CaseNotesView } from './CaseNotesView';
import { LawyerChatPanel } from './LawyerChatPanel';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { toast } from 'sonner';

interface Props {
  booking: any;
  currentUser: any;
  isLawyer?: boolean;
  onRefresh: () => void;
  onNewBooking?: () => void;
  onBookFollowUp?: (caseThreadId: string) => void;
}

const MODE_ICON: Record<string, any> = {
  video: Video,
  phone: Phone,
  in_person: UserCheck,
  chat: MessageSquare,
};

export const BookingStatusPanel: React.FC<Props> = ({
  booking,
  currentUser,
  isLawyer = false,
  onRefresh,
  onNewBooking,
  onBookFollowUp,
}) => {
  const [showChat, setShowChat] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'demo_wallet' | 'cash'>('demo_wallet');
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Rating Modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Lawyer completion modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalSummary, setFinalSummary] = useState('');
  const [completing, setCompleting] = useState(false);

  // Lawyer cancel modal (replaces blocking window.prompt)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Action loadings
  const [actionLoading, setActionLoading] = useState(false);

  if (!booking) return null;

  const otherUser = isLawyer ? booking.userId : (booking.lawyerId?.userId || booking.lawyerId);
  const status = booking.status;
  const isPaid = booking.payment?.status === 'paid';
  const hasRated = Boolean(booking.ratingByUser?.stars);
  const ModeIcon = MODE_ICON[booking.consultationMode] || Scale;

  // Socket listener for live status and case note updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !booking._id) return;

    const handleStatusUpdate = (data: any) => {
      if (data.bookingId === booking._id) {
        onRefresh();
      }
    };

    const handleCaseNote = (data: any) => {
      if (data.bookingId === booking._id) {
        onRefresh();
      }
    };

    socket.on('booking_status_update', handleStatusUpdate);
    socket.on('case_note_update', handleCaseNote);

    return () => {
      socket.off('booking_status_update', handleStatusUpdate);
      socket.off('case_note_update', handleCaseNote);
    };
  }, [booking._id]);

  const handleCancelBooking = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const reason = cancelReason.trim() || 'Cancelled by advocate';
    try {
      setActionLoading(true);
      await api.cancelLawyerBooking(booking._id, reason);
      toast.success('Consultation cancelled');
      setShowCancelModal(false);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    try {
      setActionLoading(true);
      await api.startLawyerConsultation(booking._id);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start consultation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCaseNote = async (note: string) => {
    await api.addLawyerCaseNote(booking._id, note);
    onRefresh();
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalSummary.trim()) {
      toast.error('Please provide a final case summary and recommendations.');
      return;
    }
    try {
      setCompleting(true);
      const res: any = await api.completeLawyerConsultation(booking._id, finalSummary.trim());
      toast.success(res?.message || 'Consultation completed');
      setShowCompleteModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete consultation');
    } finally {
      setCompleting(false);
    }
  };

  const handleProcessDemoPay = async () => {
    try {
      setPaying(true);
      await api.payDemoRide({
        bookingId: booking._id,
        bookingType: 'lawyer',
        method: payMethod,
      });
      setPaySuccess(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Payment simulation failed');
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRatingSubmitting(true);
      await api.rateLawyerBooking(booking._id, {
        stars: ratingStars,
        comment: ratingComment,
      });
      setShowRateModal(false);
      toast.success('Rating submitted');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    api.downloadLawyerReceipt(
      booking._id,
      `Legal-Consultation-Receipt-${booking.bookingNumber || booking._id}.pdf`
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 1. REQUESTED STATE ──────────────────────────────────── */}
      {status === 'requested' && (
        <div className="p-6 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center animate-in fade-in">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <Clock className="w-7 h-7 animate-spin duration-3000" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            {booking.urgency === 'urgent'
              ? 'Broadcasting to Available Advocates...'
              : `Waiting for Adv. ${otherUser?.name || 'Advocate'} to confirm...`}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {booking.urgency === 'urgent'
              ? 'Urgent consultation request sent to verified advocates in this category. The first available advocate will accept and connect.'
              : 'The advocate is reviewing your matter details and scheduled time slot.'}
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => setShowCancelModal(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs"
            >
              Cancel Request
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. RESCHEDULE PROPOSED ──────────────────────────────── */}
      {status === 'reschedule_proposed' && (
        <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-white/10 border border-slate-200 dark:border-slate-700 text-center animate-in fade-in">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-900 dark:text-slate-100">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Advocate Proposed an Alternate Slot
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            New Proposed Time:{' '}
            <strong>
              {booking.proposedNewTime
                ? new Date(booking.proposedNewTime).toLocaleString()
                : 'Proposed Slot'}
            </strong>
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              size="sm"
              className="bg-slate-900 text-white rounded-xl text-xs"
              onClick={async () => {
                try {
                  await api.rescheduleLawyerBooking(
                    booking._id,
                    booking.proposedNewTime
                  );
                  toast.success('New time accepted');
                  onRefresh();
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            >
              Accept New Time
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-xl"
              onClick={() => setShowCancelModal(true)}
            >
              Decline & Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. CONFIRMED STATE ──────────────────────────────────── */}
      {status === 'confirmed' && (
        <div className="p-6 rounded-3xl bg-slate-100/60 dark:bg-white/10 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Consultation Confirmed
                </Badge>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isLawyer
                    ? `Client: ${otherUser?.name || 'Client'}`
                    : `Adv. ${otherUser?.name || 'Advocate'} will consult with you`}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <ModeIcon className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />
                    {booking.consultationMode?.replace('_', ' ')}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(booking.scheduledDate).toLocaleDateString()} at{' '}
                    {new Date(booking.scheduledDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowChat(!showChat)}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                <MessageSquare className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                {showChat ? 'Hide Chat' : 'Open Chat'}
              </Button>

              {isLawyer && (
                <Button
                  type="button"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleStartConsultation}
                  className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm"
                >
                  <Scale className="w-4 h-4" />
                  Start Consultation
                </Button>
              )}
            </div>
          </div>

          {/* Reveal Phone (if phone or in-person mode) */}
          {(booking.consultationMode === 'phone' ||
            booking.consultationMode === 'in_person') &&
            otherUser?.phone && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Direct Phone Contact:</span>
                <a
                  href={`tel:${otherUser.phone}`}
                  className="font-bold text-slate-900 dark:text-slate-100 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {otherUser.phone}
                </a>
              </div>
            )}

          {/* Chat Panel Collapse */}
          {showChat && (
            <LawyerChatPanel
              bookingId={booking._id}
              currentUser={currentUser}
              targetUser={otherUser}
              onClose={() => setShowChat(false)}
            />
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Need changes? You can cancel or reschedule up to 2 hours before scheduled slot.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. IN PROGRESS STATE ────────────────────────────────── */}
      {status === 'in_progress' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900/30 dark:border-white/30 shadow-xl space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md animate-pulse">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                    Consultation in Progress
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {isLawyer
                    ? `Client: ${otherUser?.name || 'Client'}`
                    : `Adv. ${otherUser?.name || 'Advocate'}`}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowChat(!showChat)}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                <MessageSquare className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                {showChat ? 'Hide Chat' : 'In-App Chat'}
              </Button>

              {isLawyer && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Completed
                </Button>
              )}
            </div>
          </div>

          {/* Chat Panel in Progress */}
          {showChat && (
            <LawyerChatPanel
              bookingId={booking._id}
              currentUser={currentUser}
              targetUser={otherUser}
              onClose={() => setShowChat(false)}
            />
          )}

          {/* Live Case Notes View */}
          <CaseNotesView
            notes={booking.caseNotes || []}
            isLawyer={isLawyer}
            onAddNote={handleAddCaseNote}
          />
        </div>
      )}

      {/* ── 5. COMPLETED STATE ──────────────────────────────────── */}
      {status === 'completed' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Consultation Concluded
                </Badge>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isLawyer
                    ? `Case Session with ${otherUser?.name || 'Client'}`
                    : `Adv. ${otherUser?.name || 'Advocate'} Legal Advisory`}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Session Fee: <strong>₹{booking.fee}</strong> •{' '}
                  <span
                    className={
                      isPaid
                        ? 'text-emerald-600 font-bold'
                        : 'text-amber-600 font-bold'
                    }
                  >
                    {isPaid ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownloadReceipt}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                Download Receipt
              </Button>

              {!isLawyer && onBookFollowUp && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onBookFollowUp(booking.caseThreadId || booking._id)}
                  className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Book Follow-Up
                </Button>
              )}
            </div>
          </div>

          {/* Case Notes & Summary */}
          <CaseNotesView
            notes={booking.caseNotes || []}
            finalSummary={booking.finalCaseSummary}
          />

          {/* Payment Prompt (Client side, if not paid) */}
          {!isLawyer && !isPaid && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Consultation Payment Due: ₹{booking.fee}
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400">
                  Pay with Demo Wallet or Cash to settle legal fees and unlock rating.
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setShowPayModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now (Demo)
              </Button>
            </div>
          )}

          {/* Rating Prompt (Client side, if paid and not rated) */}
          {!isLawyer && isPaid && !hasRated && (
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/10 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Rate Adv. {otherUser?.name || 'Advocate'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Help other hospital patients choose verified legal counsel.
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowRateModal(true)}
                className="bg-slate-900 hover:bg-black text-white text-xs rounded-xl font-bold gap-1"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                Rate Consultation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 6. DECLINED / CANCELLED STATES ──────────────────────── */}
      {(status === 'declined_by_lawyer' ||
        status === 'cancelled_by_user' ||
        status === 'cancelled_by_lawyer') && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center animate-in fade-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 capitalize">
            {status.replace(/_/g, ' ')}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            This consultation request was closed. You can search other verified advocates anytime.
          </p>
          {onNewBooking && (
            <Button
              type="button"
              size="sm"
              onClick={onNewBooking}
              className="mt-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
            >
              Find Another Lawyer
            </Button>
          )}
        </div>
      )}

      {/* ── LAWYER COMPLETE MODAL ───────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Conclude Legal Consultation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the final legal advice summary, court filing guidance, or follow-up recommendation for the client.
            </p>

            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <textarea
                rows={4}
                value={finalSummary}
                onChange={(e) => setFinalSummary(e.target.value)}
                placeholder="E.g., Advised filing complaint under Consumer Protection Act before District Commission. Gather treatment bills & discharge summary. Follow-up consultation recommended in 2 weeks..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 dark:focus:border-white dark:text-slate-100"
                required
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={completing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  {completing ? 'Completing...' : 'Submit & Close Consultation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DEMO PAYMENT MODAL ──────────────────────────────────── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Consultation Fee Payment
                </h3>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                  DEMO MODE SIMULATION
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Amount Due:</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                ₹{booking.fee}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Payment Method:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('demo_wallet')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    payMethod === 'demo_wallet'
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  💳 Demo Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('cash')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    payMethod === 'cash'
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  💵 Cash / Direct
                </button>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPayModal(false)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={paying}
                onClick={handleProcessDemoPay}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
              >
                {paying ? 'Processing...' : 'Confirm Demo Pay'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL (inline reason, no window.prompt) ─────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Cancel Consultation
            </h3>
            <form onSubmit={handleCancelBooking} className="space-y-4">
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (e.g. Court commitment)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 dark:focus:border-white dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                  className="rounded-xl text-xs"
                >
                  Keep Booking
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RATING MODAL ────────────────────────────────────────── */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Rate Your Legal Consultation
            </h3>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 text-2xl transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= ratingStars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your experience with Adv. guidance, clarity, and professionalism..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 dark:focus:border-white dark:text-slate-100"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRateModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={ratingSubmitting}
                  className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
                >
                  {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
