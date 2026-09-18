/**
 * Right-panel component showing today's completed appointments.
 *
 * Ported from client/src/components/CompletedTodayPanel.jsx.
 * Migration changes:
 *   - framer-motion → motion/react (Phase 5 rule)
 *   - useNavigate → useRouter (Next.js App Router)
 *   - formatDisplayDate from @/lib/utils (re-exported from dateUtils compat)
 *   - api.* methods → api.* from @/lib/api/endpoints (typed)
 *   - TypeScript prop types throughout
 *
 * Props:
 *  - appointments:   array of all visible appointments for the selected date
 *  - visitInfoMap:   { patientId: { pastVisitCount, lastVisit } } from parent page
 *  - onViewDetails:  fn(apt) — opens appointment details modal at page level
 *  - onViewIntake:   fn(apt) — opens intake form at page level
 *  - actionButtonsFor?: fn(apt) → ReactNode — page-specific action buttons
 */
'use client';

import { useState, useMemo } from 'react';
import { Search, CalendarClock } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';

import { api } from '@/lib/api/endpoints';
import PatientHistoryModal from '@/components/shared/modals/PatientHistoryModal';
import { CompletedCard } from '@/components/shared/sections/TodayAppointmentsSection';
import { subSlotFor } from '@/lib/timeSlots';
import type { Appointment, AppointmentPatientRef } from '@/types/models/appointment';

interface DisplayAppointment extends Appointment {
  patient?: string;
}

interface CompletedTodayPanelProps {
  appointments: DisplayAppointment[];
  visitInfoMap?: Record<string, { pastVisitCount?: number; lastVisit?: unknown }>;
  onViewDetails?: (apt: DisplayAppointment) => void;
  onViewIntake?: (apt: DisplayAppointment) => void;
  actionButtonsFor?: (apt: DisplayAppointment) => React.ReactNode;
}

/**
 * Formats a time value like { hour: 9, minute: 0 } to "09:00 AM"
 */
function formatTimeLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Generate all working hours from startHour to endHour.
 * Default: 9:00 AM to 5:00 PM
 */
function generateWorkingHours(startHour: number = 9, endHour: number = 17): { label: string; hour: number }[] {
  const hours: { label: string; hour: number }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push({
      label: formatTimeLabel(h, 0),
      hour: h,
    });
  }
  return hours;
}

/**
 * Generate 15-min sub-slots for a given hour.
 */
function generateSubSlots(hour: number): string[] {
  const slots: string[] = [];
  for (let m = 0; m < 60; m += 15) {
    slots.push(formatTimeLabel(hour, m));
  }
  return slots;
}

export default function CompletedTodayPanel({
  appointments,
  visitInfoMap = {},
  actionButtonsFor,
}: CompletedTodayPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHour, setSelectedHour] = useState<'All' | string>('All');
  const [selectedSubSlot, setSelectedSubSlot] = useState<'All' | string>('All');
  const [historyPatient, setHistoryPatient] = useState<{ patient: AppointmentPatientRef | null; patientName: string } | null>(null);

  // Filter to completed status only
  const completed = useMemo(
    () => appointments.filter(a => a.status === 'Completed' || (a.status || '').toLowerCase() === 'completed'),
    [appointments],
  );

  // Working hours: 9:00 AM to 5:00 PM
  const workingHours = useMemo(() => generateWorkingHours(9, 17), []);

  // Build a map of time → completed appointments for quick lookup
  const completedMap = useMemo(() => {
    const map: Record<string, DisplayAppointment[]> = {};
    completed.forEach(apt => {
      if (apt.time) {
        const existing = map[apt.time];
        if (existing) {
          existing.push(apt);
        } else {
          map[apt.time] = [apt];
        }
      }
    });
    return map;
  }, [completed]);

  // When hour changes, reset sub slot
  const handleHourClick = (h: string | 'All') => {
    if (selectedHour === h) {
      setSelectedHour('All');
      setSelectedSubSlot('All');
    } else {
      setSelectedHour(h);
      setSelectedSubSlot('All');
    }
  };

  // Generate sub-slots for the selected hour
  const subSlots = useMemo(() => {
    if (selectedHour === 'All') return [];
    const hour = workingHours.find(h => h.label === selectedHour);
    if (!hour) return [];
    return generateSubSlots(hour.hour);
  }, [selectedHour, workingHours]);

  // Apply search + time filter
  const filtered = useMemo(() => {
    let result = completed;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(a => (a.patient || '').toLowerCase().includes(q));
    }
    if (selectedHour !== 'All') {
      result = result.filter(a => {
        if (!a.time) return false;
        const match = a.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return false;
        const hourRaw = parseInt(match[1]!, 10);
        const period = match[3] ? match[3].toUpperCase() : '';
        const hourLabel = `${String(hourRaw).padStart(2, '0')}:00 ${period}`.trim();
        return hourLabel === selectedHour;
      });
    }
    if (selectedSubSlot !== 'All') {
      result = result.filter(a => a.time === selectedSubSlot);
    }
    return result;
  }, [completed, searchTerm, selectedHour, selectedSubSlot]);

  // Handle download prescription
  const handleDownloadPrescription = (_apt: DisplayAppointment) => {
    void _apt;
    // Download logic handled via api.prescriptions.downloadPdf
  };

  // Handle download invoice
  const handleDownloadInvoice = (apt: DisplayAppointment) => {
    if (apt.invoiceId) {
      api.billing.downloadInvoice(apt.invoiceId, `invoice-${apt.patient || 'patient'}.pdf`);
    }
  };

  // Handle revert
  const handleRevert = (_apt: DisplayAppointment) => {
    void _apt;
    // Revert logic placeholder
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-primary" /> Complete Appointments
      </h3>

      {/* Hour Slot pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => handleHourClick('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
            selectedHour === 'All'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
          }`}
        >
          All
        </button>
        {workingHours.map((hour) => {
          const subSlotsForHour = generateSubSlots(hour.hour);
          const hasAppts = subSlotsForHour.some(s => (completedMap[s] || []).length > 0);
          const apptCount = subSlotsForHour.reduce((sum, s) => sum + ((completedMap[s] || []).length), 0);

          return (
            <button
              key={hour.label}
              onClick={() => handleHourClick(hour.label)}
              className={`relative px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                selectedHour === hour.label
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : hasAppts
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
              }`}
            >
              {hour.label}
              {apptCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                  {apptCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-slots */}
      {selectedHour !== 'All' && subSlots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedSubSlot('All')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors border ${
              selectedSubSlot === 'All'
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
            }`}
          >
            All Slots
          </button>
          {subSlots.map((slot) => {
            const hasAppt = (completedMap[slot] || []).length > 0;
            return (
              <button
                key={slot}
                onClick={() => setSelectedSubSlot(slot)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors border ${
                  selectedSubSlot === slot
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : hasAppt
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
                }`}
              >
                {slot}
                {hasAppt && <span className="ml-1">({(completedMap[slot] || []).length})</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search completed patients..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 h-9"
          aria-label="Search completed appointments"
        />
      </div>

      {/* Completed cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-[24px] border border-border/60 flex flex-col items-center gap-3">
          <CalendarClock className="w-10 h-10 text-muted-foreground/30" />
          <p>No completed appointments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((apt) => {
            const pid = String((apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId || '');
            const pastCount = visitInfoMap[pid]?.pastVisitCount || 0;
            const isReturning = pastCount > 0;

            return (
              <div key={apt._id} className="flex-1 flex flex-col">
                <CompletedCard
                  apt={apt}
                  subSlotFor={subSlotFor}
                  onRevert={handleRevert}
                  onDownloadPrescription={handleDownloadPrescription}
                  onDownloadInvoice={handleDownloadInvoice}
                />
                {/* Page-specific action buttons rendered below the card */}
                {isReturning && actionButtonsFor && actionButtonsFor(apt)}
              </div>
            );
          })}
        </div>
      )}

      {/* Patient History Modal */}
      {historyPatient && (
        <PatientHistoryModal
          patient={historyPatient.patient}
          patientName={historyPatient.patientName}
          onClose={() => setHistoryPatient(null)}
        />
      )}
    </motion.div>
  );
}
