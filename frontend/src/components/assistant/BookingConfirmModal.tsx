import React from 'react';
import { X, Calendar, Clock, MapPin, User, FileText, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SERVICE_CATEGORIES } from './ServiceCategorySelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  bookingDetails: {
    assistant?: any;
    hospital: string;
    serviceCategories: string[];
    isUrgent: boolean;
    scheduledDate?: string;
    startTime?: string;
    durationType: string;
    specialInstructions?: string;
    estimatedCost: number;
    hours: number;
    rate: number;
  };
}

const DURATION_LABELS: Record<string, string> = {
  '2hr': '2 Hours',
  '4hr': '4 Hours (Half Day)',
  'full_day': 'Full Day (8 Hours)',
  'overnight': 'Overnight Shift (12 Hours)',
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
    assistant,
    hospital,
    serviceCategories = [],
    isUrgent,
    scheduledDate,
    startTime,
    durationType,
    specialInstructions,
    estimatedCost,
    rate,
    hours,
  } = bookingDetails;

  const assistantUser = assistant?.userId || {};

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
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Confirm Hospital Assistant
            </h3>
            <p className="text-xs text-slate-500">Review your care booking summary</p>
          </div>
        </div>

        {/* Urgent Alert Banner */}
        {isUrgent ? (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 animate-bounce" />
            <span>
              <strong>Urgent Request:</strong> This booking broadcasts immediately to all available attendants near {hospital}. First to accept will report within 1 hour.
            </span>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 flex items-center gap-3">
            {assistantUser.avatar ? (
              <img
                src={assistantUser.avatar}
                alt={assistantUser.name}
                className="w-11 h-11 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold">
                {(assistantUser.name || 'A').charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {assistantUser.name || 'Selected Assistant'}
              </div>
              <div className="text-xs text-slate-500">
                ⭐ {assistant?.rating?.avg?.toFixed(1) || '5.0'} • ₹{rate}/hr • {assistant?.experienceYears || 1} yrs exp
              </div>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-teal-600" /> Hospital
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{hospital}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-teal-600" /> Date
            </span>
            <span className="font-medium">
              {isUrgent ? 'Today (Urgent)' : scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Today'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-teal-600" /> Time & Duration
            </span>
            <span className="font-medium">
              {startTime || 'Immediate'} • {DURATION_LABELS[durationType] || durationType}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block mb-1.5">Services Requested:</span>
            <div className="flex flex-wrap gap-1">
              {serviceCategories.map((c) => (
                <Badge key={c} variant="outline" className="text-[10px] bg-white dark:bg-slate-900">
                  {c.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {specialInstructions && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">Special Instructions:</span>
              <p className="italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border">
                "{specialInstructions}"
              </p>
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="mt-4 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Estimated Total</div>
            <div className="text-xl font-black text-teal-900 dark:text-teal-200">
              ₹{estimatedCost}
            </div>
            <div className="text-[10px] text-slate-400">
              Rate ₹{rate}/hr x {hours} hrs (Pay after completion)
            </div>
          </div>
          <div className="text-right">
            <Badge className="bg-emerald-600 text-white text-[10px]">DEMO PAYMENT</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl h-11"
          >
            Modify
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-11 shadow-md"
          >
            {loading ? 'Sending Request...' : 'Confirm & Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};
