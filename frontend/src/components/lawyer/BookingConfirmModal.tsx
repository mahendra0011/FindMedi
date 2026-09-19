import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  Phone,
  UserCheck,
  MessageSquare,
  FileText,
  ShieldCheck,
  Zap,
  IndianRupee,
  Scale,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LEGAL_CATEGORIES } from './LegalCategorySelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  bookingDetails: {
    lawyer?: any;
    category: string;
    urgency: 'normal' | 'urgent';
    consultationMode: 'video' | 'phone' | 'in_person' | 'chat';
    scheduledDate?: string;
    startTime?: string;
    caseDescription: string;
    documents?: string[];
    fee: number;
    budgetMin?: number;
    budgetMax?: number;
  };
}

const MODE_LABELS: Record<string, { label: string; icon: any }> = {
  video: { label: 'Online Video Call', icon: Video },
  phone: { label: 'Phone Consultation', icon: Phone },
  in_person: { label: 'In-Person Chamber Visit', icon: UserCheck },
  chat: { label: 'In-App Text Consultation', icon: MessageSquare },
};

export const BookingConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  bookingDetails,
}) => {
  if (!isOpen) return null;

  const {
    lawyer,
    category,
    urgency,
    consultationMode,
    scheduledDate,
    startTime,
    caseDescription,
    documents = [],
    fee,
  } = bookingDetails;

  const lawyerUser = lawyer?.userId || {};
  const catObj = LEGAL_CATEGORIES.find((c) => c.code === category);
  const modeObj = MODE_LABELS[consultationMode] || {
    label: consultationMode,
    icon: Scale,
  };
  const ModeIcon = modeObj.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Confirm Legal Consultation
            </h3>
            <p className="text-xs text-slate-500">
              Review your consultation booking summary
            </p>
          </div>
        </div>

        {/* Urgent Alert Banner */}
        {urgency === 'urgent' ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <Zap className="w-4 h-4 text-rose-600 flex-shrink-0 animate-bounce" />
            <span>
              <strong>Urgent Request:</strong> Broadcasts immediately to all available advocates in {catObj?.name || category}. First available advocate will connect within 1 hour.
            </span>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-center gap-3">
            {lawyerUser.avatar ? (
              <img
                src={lawyerUser.avatar}
                alt={lawyerUser.name}
                className="w-12 h-12 rounded-xl object-cover border shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-black text-lg shrink-0">
                {(lawyerUser.name || 'Advocate').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Adv. {lawyerUser.name || 'Advocate'}
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-xs text-slate-500 truncate">
                Bar Reg: {lawyer?.barCouncilNumber || 'Verified'} • {lawyer?.yearsOfPractice || 3}+ yrs exp
              </div>
            </div>
          </div>
        )}

        {/* Booking Details Grid */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Category</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {catObj?.name || category}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Mode</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <ModeIcon className="w-3.5 h-3.5 text-indigo-600" />
              {modeObj.label}
            </span>
          </div>

          {urgency === 'normal' && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Scheduled Time</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {scheduledDate} at {startTime} ({lawyer?.sessionDuration || 30} min)
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium block mb-1">
              Issue Summary:
            </span>
            <p className="text-slate-700 dark:text-slate-300 italic line-clamp-2">
              "{caseDescription}"
            </p>
          </div>

          {documents.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Attached Documents</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {documents.length} file(s) attached
              </span>
            </div>
          )}
        </div>

        {/* Fee Breakdown */}
        <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Consultation Fee
            </div>
            <div className="text-[11px] text-slate-500">
              Paid upon consultation completion (Demo Wallet / Cash)
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            ₹{fee}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md gap-1.5 px-6"
          >
            {loading ? 'Sending Request...' : 'Confirm & Send Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};
