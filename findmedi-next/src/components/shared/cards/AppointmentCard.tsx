/**
 * Shared appointment card — used by both Doctor and Clinic dashboards.
 *
 * Ported from client/src/components/AppointmentCard.jsx.
 * Key migration changes:
 *   - framer-motion → motion/react (Phase 5 rule: one animation library)
 *   - Added TypeScript prop types (Appointment + embedded patient/doctor objects)
 *   - Removed dependency on formatDisplayDate from dateUtils.js — uses formatDate from utils.ts instead
 */
'use client';

import {
  CalendarDays, Clock, Phone, Mail, Hash, UserCheck,
  Activity, IndianRupee, FileText, ChevronRight, History, Info,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import type { Appointment, AppointmentPatientRef, AppointmentDoctorRef, LastVisitRef } from '@/types/models/appointment';
import type { AppointmentStatus, AppointmentPriority } from '@/types/enums';
import { formatDate } from '@/lib/utils';

/** Convert a number to an ordinal string: 1 → "1st", 2 → "2nd", 3 → "3rd". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0] || 'th');
}

/** Extended status colour/pill map (shared between Doctor & Clinic). */
export const statusColors: Record<string, string> = {
  Pending:   'bg-amber-50 text-amber-600 border border-amber-200',
  Confirmed: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
  Completed: 'bg-info/10 text-info',
  'In Queue': 'bg-primary/10 text-primary border border-primary/20',
  Serving:   'bg-warning/10 text-warning border border-warning/20',
  Missed:    'bg-destructive/10 text-destructive border border-destructive-200',
};

export const statusDot: Record<string, string> = {
  Pending:   'bg-amber-500',
  Confirmed: 'bg-emerald-500',
  Cancelled: 'bg-red-500',
  Completed: 'bg-blue-500',
  'In Queue': 'bg-primary',
  Serving:   'bg-warning',
  Missed:    'bg-destructive',
};

/** Priority → left accent border + badge classes. */
export const priorityAccent: Record<string, string> = {
  Emergency: 'border-l-4 border-destructive',
  Urgent:    'border-l-4 border-warning',
  Normal:    'border-l-4 border-transparent',
};

export const priorityBadge: Record<string, string> = {
  Emergency: 'bg-destructive/10 text-destructive',
  Urgent:    'bg-warning/10 text-warning',
};

/**
 * Props for the AppointmentCard component.
 */
export interface AppointmentCardProps {
  /** The appointment object (may embed populated patientId). */
  apt: Appointment & {
    patient?: string; // legacy display name
  };
  /** Page-specific action buttons rendered at the bottom. */
  actionButtons?: React.ReactNode;
  /** This patient's visit sequence (1 = first visit). */
  visitNumber?: number;
  /** Count of completed past visits (0 = new patient). */
  pastVisitCount?: number;
  /** Last completed visit summary, if any. */
  lastVisit?: LastVisitRef | null;
  /** Opens current appointment details (always visible). */
  onViewDetails?: (apt: Appointment) => void;
  /** Opens patient history modal (only for returning patients). */
  onViewHistory?: (apt: Appointment) => void;
  /** Opens pre-consultation intake form. */
  onViewIntake?: (apt: Appointment) => void;
}

export default function AppointmentCard({
  apt,
  actionButtons,
  visitNumber = 1,
  pastVisitCount = 0,
  lastVisit = null,
  onViewDetails,
  onViewHistory,
  onViewIntake,
}: AppointmentCardProps) {
  const priority: string = apt?.priority || 'Normal';
  const status: string = apt?.status || 'Pending';
  const patient = apt?.patientId as AppointmentPatientRef | undefined;
  const isReturning = pastVisitCount > 0;
  const isFirstVisit = visitNumber === 1;

  // Resolve patient name: prefer populated patient object, fall back to legacy apt.patient string
  const patientName =
    (patient?.name) ||
    (typeof apt?.patient === 'string' ? apt.patient : '') ||
    'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: typeof apt?._delay === 'number' ? apt._delay : 0 }}
      className={`
        bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all
        ${priorityAccent[priority] || priorityAccent.Normal}
      `}
    >
      {/* ── Header: patient name + priority badges + status pill ── */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold text-foreground">{patientName}</h3>
            {priority !== 'Normal' && priorityBadge[priority] && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${priorityBadge[priority]}`}>
                {priority}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status] || statusColors.Pending}`}>
          {status}
        </span>
      </div>

      {/* ── Date & Time ── */}
      <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{apt?.date ? formatDate(apt.date) : apt?.date || ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{apt?.time || '—'}</span>
        </div>
      </div>

      {/* ── Token / Doctor / Type / Department ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
        {apt?.tokenNumber && (
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-primary/70" />
            <span>Token: <span className="font-medium text-foreground">{apt.tokenNumber}</span></span>
          </div>
        )}
        {apt?.doctor && (
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary/70" />
            <span>Doctor: {typeof apt.doctor === 'string' ? apt.doctor : (apt.doctor as AppointmentDoctorRef)?.name || (typeof apt.doctor === 'string' ? apt.doctor : '')}</span>
          </div>
        )}
        {apt?.type && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary/70" />
            <span>Type: {apt.type}</span>
          </div>
        )}
        {apt?.department && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary/70" />
            <span>Dept: {apt.department}</span>
          </div>
        )}
      </div>

      {/* ── Contact (phone / email from populated patientId) ── */}
      {patient && (
        <div className="flex gap-4 mb-3">
          {patient.phone && (
            <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Phone className="w-3.5 h-3.5" />
              {patient.phone}
            </a>
          )}
          {patient.email && (
            <a href={`mailto:${patient.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Mail className="w-3.5 h-3.5" />
              {patient.email}
            </a>
          )}
        </div>
      )}

      {/* ── Fees & transaction / invoice ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm mb-3">
        {apt?.fees > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <IndianRupee className="w-3.5 h-3.5" />
            <span className="font-medium">₹{apt.fees}</span>
          </div>
        )}
        {(apt?.transactionId || apt?.invoiceId) && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">
              {apt.invoiceId ? `Bill: ${apt.invoiceId}` : `Txn: ${apt.transactionId}`}
            </span>
          </div>
        )}
      </div>

      {/* ── Symptoms / Notes ── */}
      {(apt?.symptoms || apt?.notes) && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 mb-3 line-clamp-2">
          {apt.symptoms ? `Symptoms: ${apt.symptoms}` : `Notes: ${apt.notes}`}
        </p>
      )}

      {/* ── Last Visit Preview (returning patients only) ── */}
      {isReturning && lastVisit && (
        <div className="mb-3 bg-primary/5 border border-primary/15 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary flex items-center gap-1">
              <History className="w-3 h-3" /> Last Visit
            </span>
            <span className="text-xs text-muted-foreground">
              {lastVisit.date ? formatDate(lastVisit.date) : lastVisit.date || ''}
            </span>
          </div>
          {lastVisit.diagnosis && (
            <p className="text-xs text-foreground font-medium line-clamp-1">
              {lastVisit.diagnosis}
            </p>
          )}
          {lastVisit.note && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {lastVisit.note}
            </p>
          )}
        </div>
      )}

      {/* ── Intake Form Badge ── */}
      {apt?.preConsultationDetails?.filledAt && (
        <div className="mb-3">
          <button
            onClick={() => onViewIntake && onViewIntake(apt)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors border border-primary/20"
          >
            <FileText className="w-3.5 h-3.5" />
            Patient Intake Form Completed
          </button>
        </div>
      )}

      {/* ── Info buttons: View Details (always) + View History (returning only) ── */}
      <div className="flex gap-2 mb-2">
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => onViewDetails(apt)}
            aria-label={`View details for ${patientName}`}
          >
            <Info className="w-3.5 h-3.5" /> View Details
          </Button>
        )}
        {isReturning && onViewHistory && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onViewHistory(apt)}
            aria-label={`View history for ${patientName}`}
          >
            <History className="w-3.5 h-3.5" /> History ({pastVisitCount})
          </Button>
        )}
      </div>

      {/* ── Action buttons (page-specific) ── */}
      {actionButtons && (
        <div className="flex gap-2 pt-2">
          {actionButtons}
        </div>
      )}
    </motion.div>
  );
}
