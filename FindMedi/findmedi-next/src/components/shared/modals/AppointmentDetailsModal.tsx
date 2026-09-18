/**
 * Modal showing full details of a single appointment.
 * Always available (first visit or returning patient).
 *
 * Ported from client/src/components/AppointmentDetailsModal.jsx.
 * Migration changes:
 *   - framer-motion → motion/react
 *   - formatDisplayDate → formatDate from utils
 *   - statusColors import → from shared/cards/AppointmentCard
 *   - TypeScript prop types
 */
'use client';

import { motion } from 'motion/react';
import { X, CalendarDays, Clock, IndianRupee, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { statusColors } from '@/components/shared/cards/AppointmentCard';
import type { Appointment } from '@/types/models/appointment';

export interface AppointmentDetailsModalProps {
  apt: Appointment | null;
  onClose: () => void;
}

function DetailChip({ icon: Icon, label, value, valueClass }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/20 rounded-lg px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className={`text-sm font-medium ${valueClass || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function AppointmentDetailsModal({ apt, onClose }: AppointmentDetailsModalProps) {
  if (!apt) return null;

  const patient = apt.patientId as { name?: string; phone?: string; email?: string } | undefined;
  const status = apt.status || 'Pending';
  const priority = apt.priority || 'Normal';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              {apt.patient || (typeof patient === 'object' && patient?.name) || 'Unknown'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status] || statusColors.Pending}`}>
                {status}
              </span>
              {priority !== 'Normal' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priority === 'Emergency' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  {priority}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close details">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appointment info grid */}
        <div className="space-y-3 mb-5">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <CalendarDays className="w-3.5 h-3.5" /> Date
              </div>
              <p className="text-sm font-medium text-foreground">{apt.date ? formatDate(apt.date) : '—'}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" /> Time
              </div>
              <p className="text-sm font-medium text-foreground">{apt.time || '—'}</p>
            </div>
          </div>

          {/* Fees + Transaction + Invoice */}
          {(apt.fees > 0 || apt.transactionId || apt.invoiceId) && (
            <div className="flex flex-wrap gap-3">
              {apt.fees > 0 && (
                <DetailChip icon={IndianRupee} label="Fee" value={`₹${apt.fees}`} valueClass="text-emerald-600" />
              )}
              {apt.transactionId && (
                <DetailChip icon={FileText} label="Transaction" value={apt.transactionId} />
              )}
              {apt.invoiceId && (
                <DetailChip icon={FileText} label="Invoice" value={apt.invoiceId} />
              )}
            </div>
          )}

          {/* Contact */}
          {patient && (typeof patient === 'object') && (patient.phone || patient.email) && (
            <div className="bg-muted/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patient Contact</p>
              {patient.phone && (
                <a href={`tel:${patient.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                  <Phone className="w-3.5 h-3.5 text-primary/70" /> {patient.phone}
                </a>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                  <Mail className="w-3.5 h-3.5 text-primary/70" /> {patient.email}
                </a>
              )}
            </div>
          )}

          {/* Symptoms */}
          {apt.symptoms && (
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Symptoms</p>
              <p className="text-sm text-foreground">{apt.symptoms}</p>
            </div>
          )}

          {/* Notes */}
          {apt.notes && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Notes
              </p>
              <p className="text-sm text-foreground">{apt.notes}</p>
            </div>
          )}

          {/* Pre-consultation intake */}
          {apt.preConsultationDetails?.filledAt && (
            <div className="bg-info/5 border border-info/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-info uppercase tracking-wide mb-2">Patient Intake</p>
              {apt.preConsultationDetails.chiefComplaint && (
                <p className="text-sm text-foreground mb-1">
                  <span className="text-muted-foreground">Complaint:</span> {apt.preConsultationDetails.chiefComplaint}
                </p>
              )}
              {apt.preConsultationDetails.symptomsDuration && (
                <p className="text-sm text-foreground mb-1">
                  <span className="text-muted-foreground">Duration:</span> {apt.preConsultationDetails.symptomsDuration}
                </p>
              )}
              {apt.preConsultationDetails.allergies?.hasAllergies && (
                <p className="text-sm text-destructive">
                  <span className="font-medium">Allergies:</span> {apt.preConsultationDetails.allergies.details}
                </p>
              )}
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      </motion.div>
    </div>
  );
}
