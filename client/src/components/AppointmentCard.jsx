import { motion } from 'framer-motion';
import {
  CalendarDays, Clock, Phone, Mail, Hash, UserCheck,
  Activity, IndianRupee, FileText, ChevronRight, History, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateUtils';

/**
 * Convert a number to an ordinal string: 1 → "1st", 2 → "2nd", 3 → "3rd".
 */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Extended status colour/pill maps (shared between Doctor & Clinic)
export const statusColors = {
  Pending:    'bg-amber-50 text-amber-600 border border-amber-200',
  Confirmed:  'bg-success/10 text-success',
  Cancelled:  'bg-destructive/10 text-destructive',
  Completed:  'bg-info/10 text-info',
  'In Queue':  'bg-primary/10 text-primary border border-primary/20',
  Serving:    'bg-warning/10 text-warning border border-warning/20',
  Missed:     'bg-destructive/10 text-destructive border border-destructive/20',
};

export const statusDot = {
  Pending:    'bg-amber-500',
  Confirmed:  'bg-emerald-500',
  Cancelled:  'bg-red-500',
  Completed:  'bg-blue-500',
  'In Queue':  'bg-primary',
  Serving:    'bg-warning',
  Missed:     'bg-destructive',
};

// Priority → left accent border + badge
export const priorityAccent = {
  Emergency: 'border-l-4 border-destructive',
  Urgent:    'border-l-4 border-warning',
  Normal:    'border-l-4 border-transparent',
};

export const priorityBadge = {
  Emergency: 'bg-destructive/10 text-destructive',
  Urgent:    'bg-warning/10 text-warning',
};

/**
 * Shared appointment card used by both Doctor and Clinic dashboards.
 *
 * Display fields: priority accent, patient name + visit badge + priority badge,
 * status pill, token number, doctor name (Clinic only), type, department,
 * date/time, contact (phone/email from populated patientId), fees,
 * transaction/invoice id, symptoms/notes, last-visit preview (returning patients).
 *
 * Props:
 *  - apt:            appointment object
 *  - actionButtons:  ReactNode of page-specific action buttons
 *  - visitNumber:    number — this patient's visit sequence (1 = first visit)
 *  - pastVisitCount: number — count of completed past visits (0 = new patient)
 *  - lastVisit:      object|null — last completed visit summary { date, diagnosis, note }
 *  - onViewDetails:  fn(apt) — opens current appointment details (always visible)
 *  - onViewHistory:  fn(apt) — opens patient history modal (only for returning patients)
 *  - onViewIntake:   fn(apt) — opens pre-consultation intake form
 */
export default function AppointmentCard({
  apt,
  actionButtons,
  visitNumber = 1,
  pastVisitCount = 0,
  lastVisit = null,
  onViewDetails,
  onViewHistory,
  onViewIntake,
}) {
  const priority = apt?.priority || 'Normal';
  const status   = apt?.status   || 'Pending';
  const patient  = apt?.patientId;   // populate('patientId', 'name email phone')
  const isReturning = pastVisitCount > 0;
  const isFirstVisit = visitNumber === 1;

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
            <h3 className="font-heading font-semibold text-foreground">{apt?.patient || 'Unknown'}</h3>
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
          <span>{formatDisplayDate(apt?.date) || apt?.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{apt?.time}</span>
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
            <span>Doctor: {apt.doctor}</span>
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
              {formatDisplayDate(lastVisit.date) || lastVisit.date}
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
            aria-label={`View details for ${apt?.patient}`}
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
            aria-label={`View history for ${apt?.patient}`}
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
