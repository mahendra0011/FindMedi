/**
 * Shared 3-column "Today Appointments" dashboard for Doctor & Clinic dashboards.
 *
 * Ported from client/src/components/TodayAppointmentsSection.jsx.
 * Migration changes:
 *   - framer-motion → motion/react (Phase 5 rule: one animation library)
 *   - useNavigate → useRouter (Next.js App Router)
 *   - formatDisplayDate → formatDisplayDate from @/lib/utils
 *   - api.* methods → api.* from @/lib/api/endpoints (typed)
 *   - TypeScript prop types throughout
 *
 *   ┌──────────────┬─────────────────────┬──────────────────┐
 *   │ LEFT         │ MIDDLE              │ RIGHT            │
 *   │ Calendar     │ Hour slots (scroll) │ Completed slots  │
 *   │ Patient list │ Sub-slots (scroll)  │ Search           │
 *   │              │ Patient detail card │ Completed cards  │
 *   │              │ 4 buttons           │  3 buttons       │
 *   └──────────────┴─────────────────────┴──────────────────┘
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Phone, Mail, MapPin, Droplet, User, CalendarDays,
  ChevronDown, ChevronUp, FileText, Stethoscope, CheckCircle,
  ArrowLeft, Download, Receipt, RotateCcw, Search, Info, X,
  UserX, Ban, Loader2, ExternalLink, Video, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api/endpoints';
import { request } from '@/lib/api/client';
import { resolveFileUrl, isValidFileUrl, getFilePreviewUrl } from '@/lib/utils';
import {
  getHourSlots, getSubSlotsForHour, hourBoxFor, subSlotFor, parseTime,
} from '@/lib/timeSlots';
import { formatDisplayDate } from '@/lib/utils';
import PatientHistoryModal from '@/components/shared/modals/PatientHistoryModal';
import type { Appointment, AppointmentPatientRef } from '@/types/models/appointment';
import type { User as UserType } from '@/types/models/user';

/** Embedded patient fields available on the populated patientId object. */
interface EmbeddedPatient {
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bloodGroup?: string;
  age?: number;
  uhid?: string;
}

/** Appointment extended with a display-name override for cards. */
interface DisplayAppointment extends Appointment {
  patient?: string; // legacy display name
  doctorName?: string;
  chiefComplaints?: string;
}

interface TodayAppointmentsSectionProps {
  appointments: DisplayAppointment[];
  selectedDate: string;
  calendar: React.ReactNode;
  onRefresh: () => void;
  user?: UserType | null;
  onViewDetails?: (apt: DisplayAppointment) => void;
}

export default function TodayAppointmentsSection({
  appointments,
  selectedDate,
  calendar,
  onRefresh,
  user,
  onViewDetails,
}: TodayAppointmentsSectionProps) {
  const navigate = useRouter();
  const hourSlots = useMemo(() => getHourSlots(), []);

  // Sort by actual clock time so cards/list follow the day's time-slot sequence
  const sortByTime = (a: DisplayAppointment, b: DisplayAppointment): number => {
    const ta = parseTime(a.time);
    const tb = parseTime(b.time);
    if (ta.hour == null || tb.hour == null) return 0;
    return (ta.hour * 60 + (ta.minute || 0)) - (tb.hour * 60 + (tb.minute || 0));
  };

  // Today's appointments split into "active" (confirmed/queued/serving) and "completed"
  const todays = useMemo(
    () => appointments.filter(a => a.date === selectedDate).sort(sortByTime),
    [appointments, selectedDate],
  );
  const activeAppointments = useMemo(
    () => todays.filter(a => {
      const s = (a.status || '').toLowerCase();
      return s === 'confirmed' || s === 'in queue' || s === 'serving';
    }),
    [todays],
  );
  const completedAppointments = useMemo(
    () => todays.filter(a => (a.status || '').toLowerCase() === 'completed'),
    [todays],
  );
  const absentAppointments = useMemo(
    () => todays.filter(a => (a.status || '').toLowerCase() === 'missed'),
    [todays],
  );

  const [rightTab, setRightTab] = useState<'completed' | 'absent'>('completed');
  const [completedSearch, setCompletedSearch] = useState('');
  const shownRightAppointments = rightTab === 'completed' ? completedAppointments : absentAppointments;
  const filteredCompleted = useMemo(() => {
    if (!completedSearch.trim()) return shownRightAppointments;
    const q = completedSearch.toLowerCase();
    return shownRightAppointments.filter(a =>
      (a.patient || '').toLowerCase().includes(q) ||
      (a.patientId && typeof a.patientId === 'object' && (a.patientId.name || '').toLowerCase().includes(q)) ||
      (a.patientId && typeof a.patientId === 'object' && (a.patientId.phone || '').toLowerCase().includes(q)),
    );
  }, [shownRightAppointments, completedSearch]);

  // Hour filter (null = show all hours of the day). Sub-slot filter (null = all sub-slots).
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [selectedSubSlot, setSelectedSubSlot] = useState<string | null>(null);

  const subSlots = useMemo(() => {
    if (selectedHour) return getSubSlotsForHour(selectedHour);
    const present = [...new Set(activeAppointments.map(a => subSlotFor(a.time)).filter((s): s is string => s !== null))];
    if (present.length > 0) return present;
    const fallbackHour = hourBoxFor(activeAppointments[0]?.time) || hourSlots[0];
    return fallbackHour ? getSubSlotsForHour(fallbackHour) : [];
  }, [selectedHour, activeAppointments, hourSlots]);

  const hourAppointments = useMemo(
    () => selectedHour
      ? activeAppointments.filter(a => hourBoxFor(a.time) === selectedHour)
      : activeAppointments,
    [activeAppointments, selectedHour],
  );
  const slotAppointments = useMemo(() => {
    if (!selectedSubSlot) return hourAppointments;
    return hourAppointments.filter(a => subSlotFor(a.time) === selectedSubSlot);
  }, [hourAppointments, selectedSubSlot]);

  // History modal
  const [historyPatient, setHistoryPatient] = useState<{ patient: AppointmentPatientRef | null; patientName: string } | null>(null);
  // File viewer popup
  const [fileViewerUrl, setFileViewerUrl] = useState<string | null>(null);
  const [fileViewerRawUrl, setFileViewerRawUrl] = useState<string | null>(null);
  const [fileViewerType, setFileViewerType] = useState<'image' | 'pdf' | 'other' | null>(null);
  const [fileViewerLoading, setFileViewerLoading] = useState(false);
  const [fileViewerError, setFileViewerError] = useState(false);

  const openFileViewer = useCallback(async (url: string) => {
    if (!url) return;
    if (!isValidFileUrl(url)) {
      toast.error('File unavailable — upload was not completed. Please ask the patient to re-upload it.');
      return;
    }
    setFileViewerLoading(true);
    setFileViewerError(false);
    setFileViewerUrl('loading');
    setFileViewerRawUrl(url);

    try {
      const preview = await getFilePreviewUrl(url);
      if (!preview || !preview.url) {
        toast.error('Unable to load file preview. Opening fallback.');
        setFileViewerUrl(resolveFileUrl(url));
        setFileViewerType('other');
        return;
      }
      setFileViewerUrl(preview.url);
      setFileViewerRawUrl(preview.rawUrl || url);
      setFileViewerType(preview.type);
    } catch (err) {
      console.error('File preview error:', err);
      setFileViewerUrl(resolveFileUrl(url));
      setFileViewerType('other');
      toast.error('Failed to load file preview.');
    } finally {
      setFileViewerLoading(false);
    }
  }, []);

  const closeFileViewer = useCallback(() => {
    if (fileViewerUrl && fileViewerUrl.startsWith('blob:')) URL.revokeObjectURL(fileViewerUrl);
    setFileViewerUrl(null);
    setFileViewerRawUrl(null);
    setFileViewerType(null);
    setFileViewerLoading(false);
    setFileViewerError(false);
  }, [fileViewerUrl]);

  // Visit-number for history button visibility (2nd+ visit)
  const pastVisitCountFor = useCallback((apt: DisplayAppointment): number => {
    const pid = (apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId;
    if (!pid) return 0;
    return appointments.filter(a =>
      a.status === 'Completed' &&
      a.date < selectedDate &&
      String((a.patientId && typeof a.patientId === 'object' && a.patientId._id) || a.patientId) === String(pid),
    ).length;
  }, [appointments, selectedDate]);

  const handleHourClick = (h: string) => {
    setSelectedHour(selectedHour === h ? null : h);
    setSelectedSubSlot(null);
  };

  const handleSubSlotClick = (s: string) => {
    setSelectedSubSlot(s === selectedSubSlot ? null : s);
  };

  const openHistory = (apt: DisplayAppointment) => {
    const pid = (apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId;
    if (!pid) {
      toast.info('Patient ID not available.');
      return;
    }
    setHistoryPatient({
      patient: apt.patientId && typeof apt.patientId === 'object' ? apt.patientId as AppointmentPatientRef : null,
      patientName: apt.patient || '',
    });
  };

  const handleConfirmComplete = async (apt: DisplayAppointment, note: string): Promise<boolean> => {
    if (!apt) return false;
    try {
      await api.appointments.update(apt._id, { status: 'Completed' });

      if (note && note.trim()) {
        const pid = (apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId;
        try {
          await request('/records', {
            method: 'POST',
            body: JSON.stringify({
              patient: apt.patient || '',
              patientId: typeof pid === 'string' ? pid : '',
              doctor: user?.name || '',
              diagnosis: 'Quick Note',
              type: 'Diagnosis',
              notes: note.trim(),
              data: { date: selectedDate, note: note.trim() },
            }),
          });
        } catch (noteErr) {
          console.error('Quick note save failed:', noteErr);
        }
      }

      toast.success('Appointment completed');
      onRefresh();
      return true;
    } catch (e) {
      console.error(e);
      toast.error('Failed to complete appointment');
      return false;
    }
  };

  const handleRevert = async (apt: DisplayAppointment) => {
    try {
      await api.appointments.update(apt._id, { status: 'Confirmed' });
      toast.success('Appointment reverted to Confirmed');
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to revert appointment');
    }
  };

  const handleWritePrescription = (apt: DisplayAppointment) => {
    window.dispatchEvent(new CustomEvent('open-prescription', { detail: apt }));
  };

  const handleDownloadPrescription = async (apt: DisplayAppointment) => {
    try {
      const pid = (apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId;
      if (!pid) { toast.info('No patient ID'); return; }
      const res = await request<Record<string, unknown>[]>(`/records/patient/${String(pid)}`);
      const recs = Array.isArray(res) ? res : [];
      const rx = recs.find(r => (r.type as string) === 'prescription');
      if (!rx) { toast.info('No prescription record found'); return; }
      toast.success('Opening prescription…');
      const att = (rx as { attachments?: { url?: string }[] }).attachments?.[0];
      if (att?.url) {
        window.open(resolveFileUrl(att.url), '_blank');
      } else {
        toast.message(`Prescription: ${(rx as Record<string, unknown>).diagnosis || 'N/A'}`, {
          description: String((rx as Record<string, unknown>).prescription || '').slice(0, 120),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load prescription');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:flex-1 md:min-h-0 md:grid-rows-1">
      {/* ════════════ LEFT PANEL: Calendar + Select Time / Slot filters ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {calendar}

        {/* Hour slot boxes + sub-slots — under the calendar */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Time</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {hourSlots.map(h => {
              const count = activeAppointments.filter(a => hourBoxFor(a.time) === h).length;
              return (
                <button
                  key={h}
                  onClick={() => handleHourClick(h)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors relative ${
                    selectedHour === h
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {h}
                  {count > 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${selectedHour === h ? 'text-primary-foreground/90' : 'text-primary'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-slots — horizontal scroll */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1.5">Select Slot</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {subSlots.map(s => {
              const count = hourAppointments.filter(a => subSlotFor(a.time) === s).length;
              return (
                <button
                  key={s}
                  onClick={() => handleSubSlotClick(s)}
                  className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors relative ${
                    selectedSubSlot === s
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                  {count > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-success">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════ MIDDLE PANEL: Patient cards ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {slotAppointments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {activeAppointments.length === 0
                  ? 'No appointments in this slot.'
                  : 'No appointments match the selected time filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col min-h-full">
              {slotAppointments.map(apt => (
                <div key={apt._id} id={`apt-card-${apt._id}`} className="scroll-mt-4 flex-1 flex flex-col">
                  <PatientDetailCard
                    apt={apt}
                    pastVisitCount={pastVisitCountFor(apt)}
                    onConfirmComplete={handleConfirmComplete}
                    onOpenHistory={openHistory}
                    onWritePrescription={handleWritePrescription}
                    onViewFile={openFileViewer}
                    onRefresh={onRefresh}
                    user={user || undefined}
                    selectedDate={selectedDate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ RIGHT PANEL: Completed / Absent ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-3">
            {/* Completed / Absent Toggle — LEFT side */}
            <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setRightTab('completed')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${rightTab === 'completed' ? 'bg-card shadow-sm text-success' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Completed
              </button>
              <button
                onClick={() => setRightTab('absent')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${rightTab === 'absent' ? 'bg-card shadow-sm text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Absent
              </button>
            </div>

            {/* Title — CENTERED, no wrap */}
            <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5 flex-1 justify-center whitespace-nowrap">
              {rightTab === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <UserX className="w-4 h-4 text-destructive" />
              )}
              {rightTab === 'completed' ? 'Completed Today' : 'Absent Today'}
              {shownRightAppointments.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${rightTab === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {shownRightAppointments.length}
                </span>
              )}
            </h4>

            {/* Spacer to balance the layout */}
            <div className="w-[100px]" />
          </div>

          {/* Compact hour boxes (smaller) */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {hourSlots.map(h => {
              const count = shownRightAppointments.filter(a => hourBoxFor(a.time) === h).length;
              return (
                <button
                  key={h}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                    count > 0 ? (rightTab === 'completed' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive') : 'bg-muted/40 text-muted-foreground/60'
                  }`}
                  title={`${h} — ${count} ${rightTab}`}
                >
                  {h.replace(/ (AM|PM)/, '')}
                </button>
              );
            })}
          </div>

          {/* Sub-slots row — show all unique sub-slots from shown appointments */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mt-1 scrollbar-thin">
            {(() => {
              const subSlotsList = [...new Set(shownRightAppointments.map(a => subSlotFor(a.time)).filter((s): s is string => s !== null))];
              if (subSlotsList.length === 0) {
                return <span className="text-[10px] text-muted-foreground/50 px-1">No slots</span>;
              }
              return subSlotsList.map(s => (
                <span key={s} className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground">
                  {s}
                </span>
              ));
            })()}
          </div>

          {/* Search */}
          <div className="relative mt-2 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={rightTab === 'completed' ? 'Search completed…' : 'Search absent…'}
              value={completedSearch}
              onChange={e => setCompletedSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
        </div>

        {/* Cards — fill panel height, scroll inside the section */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {filteredCompleted.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-6 text-center flex-1 flex flex-col items-center justify-center">
              {rightTab === 'completed' ? (
                <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              ) : (
                <UserX className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              )}
              <p className="text-sm text-muted-foreground">
                {shownRightAppointments.length === 0
                  ? (rightTab === 'completed' ? 'No completed appointments today.' : 'No absent patients today.')
                  : 'No results match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col min-h-full">
              {filteredCompleted.map(apt => (
                <div key={apt._id} className="flex-1 flex flex-col">
                  {rightTab === 'completed' ? (
                    <CompletedCard
                      apt={apt}
                      onRevert={handleRevert}
                      onDownloadPrescription={handleDownloadPrescription}
                      onDownloadInvoice={(a) => a.invoiceId && api.billing.downloadInvoice(a.invoiceId, `invoice-${a.patient || 'patient'}.pdf`)}
                      onViewDetails={onViewDetails}
                      onViewFile={openFileViewer}
                      subSlotFor={subSlotFor}
                    />
                  ) : (
                    <AbsentCard apt={apt} subSlotFor={subSlotFor} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ Patient History Modal (popup) ════════════ */}
      {historyPatient && (
        <PatientHistoryModal
          patient={historyPatient.patient}
          patientName={historyPatient.patientName}
          onClose={() => setHistoryPatient(null)}
        />
      )}
      {/* File Viewer Popup */}
      {fileViewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closeFileViewer}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-muted/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Uploaded Document
              </h3>
              <div className="flex items-center gap-2">
                {fileViewerRawUrl && (
                  <a
                    href={fileViewerUrl !== 'loading' ? fileViewerUrl : resolveFileUrl(fileViewerRawUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open / Download
                  </a>
                )}
                <button onClick={closeFileViewer} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10 min-h-[320px]">
              {fileViewerLoading || fileViewerUrl === 'loading' ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs">Loading document preview...</span>
                </div>
              ) : fileViewerError ? (
                <div className="text-center p-6 space-y-3">
                  <p className="text-sm text-foreground font-medium">Preview cannot be rendered directly in viewer.</p>
                  <a
                    href={fileViewerUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Document in New Tab
                  </a>
                </div>
              ) : fileViewerType === 'image' ? (
                <img
                  src={fileViewerUrl}
                  alt="Uploaded prescription or test report"
                  className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-sm"
                  onError={() => setFileViewerError(true)}
                />
              ) : fileViewerType === 'pdf' ? (
                <iframe src={fileViewerUrl} className="w-full h-[70vh] rounded-lg border-0 bg-white" title="PDF Viewer" />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <p className="text-sm text-foreground font-medium">Document ready to view.</p>
                  <a
                    href={fileViewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Open / Download Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Patient detail card (middle panel)
 * ════════════════════════════════════════════════════════════ */

interface PatientDetailCardProps {
  apt: DisplayAppointment;
  pastVisitCount: number;
  onConfirmComplete: (apt: DisplayAppointment, note: string) => Promise<boolean>;
  onOpenHistory: (apt: DisplayAppointment) => void;
  onWritePrescription: (apt: DisplayAppointment) => void;
  onViewFile: (url: string) => void;
  onRefresh: () => void;
  user?: UserType;
  selectedDate: string;
}

function PatientDetailCard({
  apt, pastVisitCount,
  onConfirmComplete, onOpenHistory, onWritePrescription, onViewFile,
  onRefresh, user, selectedDate,
}: PatientDetailCardProps) {
  const navigate = useRouter();
  const patient = apt.patientId && typeof apt.patientId === 'object' ? apt.patientId as EmbeddedPatient : undefined;
  const intake = apt.preConsultationDetails;

  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState(false);
  const [absentNote, setAbsentNote] = useState('');
  const [quickNote, setQuickNote] = useState('');

  const handleConfirmComplete = async () => {
    const ok = await onConfirmComplete(apt, quickNote);
    if (ok) {
      setCompleting(false);
      setQuickNote('');
      setShowDetails(true);
    }
  };

  if (completing) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex-1 flex flex-col">
        <button
          onClick={() => setCompleting(false)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="font-heading text-base font-bold text-foreground mb-1">
          Remember Your Patient&apos;s Next Appointment
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add quick notes here so you don&apos;t forget important details about your patient&apos;s upcoming visit.
        </p>
        <Textarea
          placeholder="Type quick notes for the next visit…"
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          className="min-h-[120px] mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setCompleting(false)}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleConfirmComplete}>
            <CheckCircle className="w-4 h-4" /> Confirm
          </Button>
        </div>
      </div>
    );
  }

  if (markingAbsent) {
    return (
      <div className="bg-card rounded-2xl border border-destructive/30 p-5 shadow-sm flex-1 flex flex-col">
        <button
          onClick={() => setMarkingAbsent(false)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="font-heading text-base font-bold text-foreground mb-1 flex items-center gap-2">
          <UserX className="w-5 h-5 text-destructive" /> Mark Patient as Absent
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add a note about why the patient was absent (optional). This will help track no-shows.
        </p>
        <Textarea
          placeholder="Type reason for absence…"
          value={absentNote}
          onChange={e => setAbsentNote(e.target.value)}
          className="min-h-[120px] mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setMarkingAbsent(false)}>Cancel</Button>
          <Button
            className="flex-1 gap-2 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
            onClick={async () => {
              try {
                await api.appointments.update(apt._id, { status: 'Missed' });
                if (absentNote.trim()) {
                  const pid = (apt.patientId && typeof apt.patientId === 'object' && apt.patientId._id) || apt.patientId;
                  try {
                    await request('/records', {
                      method: 'POST',
                      body: JSON.stringify({
                        patient: apt.patient || '',
                        patientId: typeof pid === 'string' ? pid : '',
                        doctor: user?.name || '',
                        diagnosis: 'Absent Note',
                        type: 'Diagnosis',
                        notes: absentNote.trim(),
                        data: { date: selectedDate, note: absentNote.trim(), reason: 'absent' },
                      }),
                    });
                  } catch (noteErr) {
                    console.error('Absent note save failed:', noteErr);
                  }
                }
                toast.success('Patient marked as absent');
                setMarkingAbsent(false);
                setAbsentNote('');
                onRefresh();
              } catch (e: unknown) {
                const err = e as Error;
                toast.error(err.message || 'Failed to mark absent');
              }
            }}
          >
            <UserX className="w-4 h-4" /> Confirm Absent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex-1 flex flex-col">
      {/* Time + slot highlight banner — on top */}
      <div className="mb-3 rounded-xl bg-gradient-to-r from-success via-emerald-500 to-success px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide">
          {apt.time} · {subSlotFor(apt.time)}
        </span>
      </div>
      {/* Header: photo + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 overflow-hidden">
          {patient?.avatar ? (
            <img src={patient.avatar} alt={apt.patient || '?'} className="w-full h-full object-cover" />
          ) : (
            (apt.patient || '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-foreground truncate">{apt.patient}</h3>
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success">
            {apt.status}
          </span>
        </div>
      </div>

      {/* Personal details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {patient?.dateOfBirth && (
          <Detail icon={User} label="Age" value={`${Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31557600000)} yrs`} />
        )}
        {patient?.phone && (
          <Detail icon={Phone} label="Phone" value={patient.phone} />
        )}
        {patient?.email && (
          <Detail icon={Mail} label="Email" value={patient.email} />
        )}
        {patient?.gender && (
          <Detail icon={User} label="Gender" value={patient.gender} />
        )}
        {patient?.address && (
          <div className="col-span-2">
            <Detail icon={MapPin} label="Address" value={patient.address} />
          </div>
        )}
        {patient?.bloodGroup && (
          <Detail icon={Droplet} label="Blood" value={patient.bloodGroup} />
        )}
      </div>

      {/* Disease / symptoms from intake */}
      {apt.symptoms && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 mb-0.5">Symptoms / Disease</p>
          <p className="text-xs text-foreground">{apt.symptoms}</p>
        </div>
      )}

      {/* Row 1: Previous · Prescription · Intake Details · Details — one line */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        {pastVisitCount > 0 ? (
          <Button
            variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
            onClick={() => onOpenHistory(apt)}
          >
            <CalendarDays className="w-3 h-3" /> Previous
          </Button>
        ) : (
          <Button
            variant="outline" size="sm" disabled
            className="gap-1 text-[10px] px-2 py-1 h-7 border-destructive/30 text-destructive/40 cursor-not-allowed opacity-60"
            title="No previous visit history"
          >
            <Ban className="w-3 h-3" /> Previous
          </Button>
        )}
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
          onClick={() => onWritePrescription(apt)}
        >
          <Stethoscope className="w-3 h-3" /> Prescription
        </Button>
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
          onClick={() => setShowIntake(!showIntake)}
        >
          <FileText className="w-3 h-3" /> Intake
        </Button>
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
          onClick={() => setShowDetails(!showDetails)}
        >
          <FileText className="w-3 h-3" /> Details
        </Button>
      </div>

      {/* Row 2: Mark as Absent | Mark as Complete — side by side */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          size="sm" className="gap-1 text-[10px] px-2 py-1 h-7 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
          onClick={() => setMarkingAbsent(true)}
        >
          <UserX className="w-3 h-3" /> Mark Absent
        </Button>
        <Button
          size="sm" className="gap-1 text-[10px] px-2 py-1 h-7 bg-success hover:bg-success/90"
          onClick={() => setCompleting(true)}
        >
          <CheckCircle className="w-3 h-3" /> Mark Complete
        </Button>
      </div>

      {/* Online Consultation Action Button */}
      {(() => {
        const mode = (apt.appointmentMode || '').toLowerCase();
        const type = (apt.type || '').toLowerCase();
        const isOnline = mode === 'voice' || mode === 'audio' || mode === 'video' || mode === 'chat' ||
          type.includes('voice') || type.includes('audio') || type.includes('video') || type.includes('chat') || type.includes('online');
        if (!isOnline) return null;

        const isVideo = mode === 'video' || type.includes('video');
        const routePrefix = user?.role === 'clinic_doctor' ? '/clinic' : '/doctor';

        return (
          <div className="mt-3 p-3 bg-muted/20 border border-border/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Consultation Mode:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isVideo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {isVideo ? 'Video Call' : 'Voice Call'}
              </span>
            </div>
            {isVideo ? (
              <Button
                size="sm"
                className="w-full gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                onClick={() => navigate.push(`${routePrefix}/video-call/${apt._id}`)}
              >
                <Video className="w-3.5 h-3.5" /> Start Video Consultation
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold"
                onClick={() => navigate.push(`${routePrefix}/call/${apt._id}`)}
              >
                <Phone className="w-3.5 h-3.5" /> Start Voice Consultation
              </Button>
            )}
          </div>
        );
      })()}

      {/* View Details dropdown — appears below the buttons */}
      {showDetails && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Appointment Details
          </h4>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-sm font-bold">{apt.patient}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{apt.status}</span>
            </div>
            <IntakeRow label="Date" value={formatDisplayDate(apt.date) || apt.date} />
            <IntakeRow label="Time" value={apt.time} />
            <IntakeRow label="Fee" value={`₹${apt.fees || 0}`} />
            {apt.transactionId && <IntakeRow label="Transaction" value={apt.transactionId} />}
            {apt.invoiceId && <IntakeRow label="Invoice" value={apt.invoiceId} />}

            <div className="pt-2 border-t border-border/50 mt-2">
              <h5 className="text-xs font-bold text-foreground mb-2">Patient Contact</h5>
              <IntakeRow label="Phone" value={patient?.phone || 'N/A'} />
              <IntakeRow label="Email" value={patient?.email || 'N/A'} />
            </div>
          </div>
        </div>
      )}

      {/* Intake Form dropdown */}
      {showIntake && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Quick Intake Form
          </h4>
          {intake ? (
            <div className="space-y-2.5">
              {(() => {
                const mode = (apt.appointmentMode || '').toLowerCase();
                const type = (apt.type || '').toLowerCase();
                if (mode === 'chat' || type.includes('chat')) return <IntakeRow label="Consultation Mode" value="Chat" />;
                if (mode === 'video' || type.includes('video')) return <IntakeRow label="Consultation Mode" value="Video Call" />;
                if (mode === 'voice' || mode === 'audio' || type.includes('voice') || type.includes('audio')) return <IntakeRow label="Consultation Mode" value="Voice Call" />;
                return null;
              })()}
              <IntakeRow label="Chief Complaint" value={
                intake.chiefComplaint === 'Other' ? intake.chiefComplaintOther : intake.chiefComplaint
              } />
              {intake.symptomsDuration && <IntakeRow label="Duration" value={intake.symptomsDuration} />}

              <IntakeRow label="Past Medical History" value={
                intake.pastMedicalHistory?.hasHistory === false ? 'No' :
                intake.pastMedicalHistory?.hasHistory === true ? (intake.pastMedicalHistory?.details || 'Yes') : '—'
              } />

              <IntakeRow label="Past Treatment" value={
                intake.currentTreatment?.hasPastTreatment === false ? 'No' :
                intake.currentTreatment?.hasPastTreatment === true ? [
                  intake.currentTreatment?.doctorName,
                  intake.currentTreatment?.cityState,
                  intake.currentTreatment?.when,
                ].filter(Boolean).join(', ') || 'Yes' : '—'
              } />
              {intake.currentTreatment?.hasPastTreatment && intake.currentTreatment?.prescriptionFile && (
                <IntakeRow label="Prescription" value={
                  <button onClick={() => onViewFile(intake.currentTreatment!.prescriptionFile)} className="text-primary underline hover:text-primary/80">View File</button>
                } />
              )}
              {intake.currentTreatment?.hasPastTreatment && (
                <IntakeRow label="Taking Medicines" value={
                  intake.currentTreatment?.takingMedicines === true ? 'Yes' : intake.currentTreatment?.takingMedicines === false ? 'No' : '—'
                } />
              )}

              <IntakeRow label="Test Reports" value={
                intake.testReports?.hasReports === false ? 'No' :
                intake.testReports?.hasReports === true ? (
                  intake.testReports?.reportFile ?
                    <button onClick={() => onViewFile(intake.testReports!.reportFile)} className="text-primary underline hover:text-primary/80">View File</button>
                    : 'Yes'
                ) : '—'
              } />

              <IntakeRow label="Current Medicines" value={
                intake.currentMedications?.hasMedications === false ? 'No' :
                intake.currentMedications?.hasMedications === true ? (intake.currentMedications?.details || 'Yes') : '—'
              } />

              <IntakeRow label="Allergies" value={
                intake.allergies?.hasAllergies === false ? 'No' :
                intake.allergies?.hasAllergies === true ? (intake.allergies?.details || 'Yes') : '—'
              } danger={intake.allergies?.hasAllergies === true} />

              <IntakeRow label="Family History" value={
                intake.familyHistory?.hasHistory === false ? 'No' :
                intake.familyHistory?.hasHistory === true ? (intake.familyHistory?.details || 'Yes') : '—'
              } />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pre-consultation details available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Completed appointment card (right panel)
 * Shows patient info, intake details, and small action buttons.
 * ════════════════════════════════════════════════════════════ */

interface CompletedCardProps {
  apt: DisplayAppointment;
  subSlotFor?: (time: string | null | undefined) => string | null;
  onRevert?: (apt: DisplayAppointment) => void;
  onDownloadPrescription?: (apt: DisplayAppointment) => void;
  onDownloadInvoice?: (apt: DisplayAppointment) => void;
  onViewDetails?: (apt: DisplayAppointment) => void;
  onViewFile?: (url: string) => void;
  stats?: { visits: number; records: number };
}

export function CompletedCard({ apt, subSlotFor, onRevert, onDownloadPrescription, onDownloadInvoice, onViewDetails, onViewFile, stats }: CompletedCardProps) {
  const patient = apt.patientId && typeof apt.patientId === 'object' ? apt.patientId as EmbeddedPatient : undefined;
  const intake = apt.preConsultationDetails;

  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(true);

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex-1 flex flex-col mb-3">
      {/* Optional stats (Visits / Records) — shown inside the card for My Patients section */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-foreground">{stats.visits}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Visits</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-primary">{stats.records}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Records</p>
          </div>
        </div>
      )}
      {/* Time + slot highlight banner — on top */}
      <div className="mb-3 rounded-xl bg-gradient-to-r from-success via-emerald-500 to-success px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide">
          {apt.time} {subSlotFor && `· ${subSlotFor(apt.time)}`}
        </span>
      </div>

      {/* Header: photo + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 overflow-hidden">
          {patient?.avatar ? (
            <img src={patient.avatar} alt={apt.patient || '?'} className="w-full h-full object-cover" />
          ) : (
            (apt.patient || '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-foreground truncate">{apt.patient}</h3>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success text-[10px]">
            <CheckCircle className="w-3 h-3" />
            Completed {apt.consultationEndTime ? new Date(apt.consultationEndTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      </div>

      {/* Personal details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {patient?.dateOfBirth && (
          <Detail icon={User} label="Age" value={`${Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31557600000)} yrs`} />
        )}
        {patient?.phone && (
          <Detail icon={Phone} label="Phone" value={patient.phone} />
        )}
        {patient?.email && (
          <Detail icon={Mail} label="Email" value={patient.email} />
        )}
        {patient?.gender && (
          <Detail icon={User} label="Gender" value={patient.gender} />
        )}
        {patient?.address && (
          <div className="col-span-2">
            <Detail icon={MapPin} label="Address" value={patient.address} />
          </div>
        )}
        {patient?.bloodGroup && (
          <Detail icon={Droplet} label="Blood" value={patient.bloodGroup} />
        )}
      </div>

      {/* Disease / symptoms from intake */}
      {apt.symptoms && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 mb-0.5">Symptoms / Disease</p>
          <p className="text-xs text-foreground">{apt.symptoms}</p>
        </div>
      )}

      {/* Normal mode: 4 action buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7" onClick={() => onDownloadPrescription && onDownloadPrescription(apt)}>
          <Download className="w-3 h-3" /> Rx
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7" onClick={() => onDownloadInvoice && onDownloadInvoice(apt)} disabled={!apt.invoiceId}>
          <Receipt className="w-3 h-3" /> Invoice
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7 text-warning hover:text-warning" onClick={() => onRevert && onRevert(apt)}>
          <RotateCcw className="w-3 h-3" /> Revert
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7 text-primary hover:text-primary" onClick={() => onViewDetails && onViewDetails(apt)}>
          <Info className="w-3 h-3" /> Details
        </Button>
      </div>

      <Button
        variant="outline" size="sm" className="w-full gap-1 text-[10px] px-2 py-1 h-7 border-dashed border-border/80 hover:bg-muted/30"
        onClick={() => setShowIntake(!showIntake)}
      >
        <FileText className="w-3 h-3 text-muted-foreground" /> Intake Details
      </Button>

      {/* View Details dropdown */}
      {showDetails && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Appointment Details
          </h4>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-sm font-bold">{apt.patient}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {apt.consultationEndTime ? new Date(apt.consultationEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed'}
              </span>
            </div>
            <IntakeRow label="Date" value={formatDisplayDate(apt.date)} />
            <IntakeRow label="Time" value={apt.time} />
            <IntakeRow label="Fee" value={`₹${apt.fees || 0}`} />
            {apt.transactionId && <IntakeRow label="Transaction" value={apt.transactionId} />}
            {apt.invoiceId && <IntakeRow label="Invoice" value={apt.invoiceId} />}

            <div className="pt-2 border-t border-border/50 mt-2">
              <h5 className="text-xs font-bold text-foreground mb-2">Patient Contact</h5>
              <IntakeRow label="Phone" value={patient?.phone || 'N/A'} />
              <IntakeRow label="Email" value={patient?.email || 'N/A'} />
              <IntakeRow label="Completed At" value={
                apt.consultationEndTime ? new Date(apt.consultationEndTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'
              } />
            </div>
          </div>
        </div>
      )}

      {/* Intake Form dropdown */}
      {showIntake && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Quick Intake Form
          </h4>
          {intake ? (
            <div className="space-y-2.5">
              {(() => {
                const mode = (apt.appointmentMode || '').toLowerCase();
                const type = (apt.type || '').toLowerCase();
                if (mode === 'chat' || type.includes('chat')) return <IntakeRow label="Consultation Mode" value="Chat" />;
                if (mode === 'video' || type.includes('video')) return <IntakeRow label="Consultation Mode" value="Video Call" />;
                if (mode === 'voice' || mode === 'audio' || type.includes('voice') || type.includes('audio')) return <IntakeRow label="Consultation Mode" value="Voice Call" />;
                return null;
              })()}
              <IntakeRow label="Chief Complaint" value={
                intake.chiefComplaint === 'Other' ? intake.chiefComplaintOther : intake.chiefComplaint
              } />
              {intake.symptomsDuration && <IntakeRow label="Duration" value={intake.symptomsDuration} />}
              <IntakeRow label="Past Medical History" value={
                intake.pastMedicalHistory?.hasHistory === false ? 'No' :
                intake.pastMedicalHistory?.hasHistory === true ? (intake.pastMedicalHistory?.details || 'Yes') : '—'
              } />
              <IntakeRow label="Past Treatment" value={
                intake.currentTreatment?.hasPastTreatment === false ? 'No' :
                intake.currentTreatment?.hasPastTreatment === true ? [
                  intake.currentTreatment?.doctorName,
                  intake.currentTreatment?.cityState,
                  intake.currentTreatment?.when,
                ].filter(Boolean).join(', ') || 'Yes' : '—'
              } />
              {intake.currentTreatment?.hasPastTreatment && intake.currentTreatment?.prescriptionFile && (
                <IntakeRow label="Prescription" value={
                  <button onClick={() => onViewFile && onViewFile(intake.currentTreatment!.prescriptionFile)} className="text-primary underline hover:text-primary/80">View File</button>
                } />
              )}
              {intake.currentTreatment?.hasPastTreatment && (
                <IntakeRow label="Taking Medicines" value={
                  intake.currentTreatment?.takingMedicines === true ? 'Yes' : intake.currentTreatment?.takingMedicines === false ? 'No' : '—'
                } />
              )}
              <IntakeRow label="Test Reports" value={
                intake.testReports?.hasReports === false ? 'No' :
                intake.testReports?.hasReports === true ? (
                  intake.testReports?.reportFile ?
                    <button onClick={() => onViewFile && onViewFile(intake.testReports!.reportFile)} className="text-primary underline hover:text-primary/80">View File</button>
                    : 'Yes'
                ) : '—'
              } />
              <IntakeRow label="Current Medicines" value={
                intake.currentMedications?.hasMedications === false ? 'No' :
                intake.currentMedications?.hasMedications === true ? (intake.currentMedications?.details || 'Yes') : '—'
              } />
              <IntakeRow label="Allergies" value={
                intake.allergies?.hasAllergies === false ? 'No' :
                intake.allergies?.hasAllergies === true ? (intake.allergies?.details || 'Yes') : '—'
              } danger={intake.allergies?.hasAllergies === true} />
              <IntakeRow label="Family History" value={
                intake.familyHistory?.hasHistory === false ? 'No' :
                intake.familyHistory?.hasHistory === true ? (intake.familyHistory?.details || 'Yes') : '—'
              } />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pre-consultation details available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Absent appointment card (right panel - absent tab)
 * Shows patient info with red "Missed" badge and revert button.
 * ════════════════════════════════════════════════════════════ */

interface AbsentCardProps {
  apt: DisplayAppointment;
  subSlotFor?: (time: string | null | undefined) => string | null;
}

function AbsentCard({ apt, subSlotFor }: AbsentCardProps) {
  const patient = apt.patientId && typeof apt.patientId === 'object' ? apt.patientId as EmbeddedPatient : undefined;
  const intake = apt.preConsultationDetails;
  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-destructive/30 p-5 shadow-sm flex-1 flex flex-col mb-3">
      {/* Time + slot highlight banner — red for absent */}
      <div className="mb-3 rounded-xl bg-gradient-to-r from-destructive via-red-500 to-destructive px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide">
          {apt.time} {subSlotFor && `· ${subSlotFor(apt.time)}`}
        </span>
      </div>

      {/* Header: photo + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-lg font-bold text-destructive shrink-0 overflow-hidden">
          {patient?.avatar ? (
            <img src={patient.avatar} alt={apt.patient || '?'} className="w-full h-full object-cover" />
          ) : (
            (apt.patient || '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-foreground truncate">{apt.patient}</h3>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive text-[10px]">
            <UserX className="w-3 h-3" />
            Absent / Missed
          </div>
        </div>
      </div>

      {/* Personal details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {patient?.dateOfBirth && (
          <Detail icon={User} label="Age" value={`${Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31557600000)} yrs`} />
        )}
        {patient?.phone && (
          <Detail icon={Phone} label="Phone" value={patient.phone} />
        )}
        {patient?.email && (
          <Detail icon={Mail} label="Email" value={patient.email} />
        )}
        {patient?.gender && (
          <Detail icon={User} label="Gender" value={patient.gender} />
        )}
        {patient?.address && (
          <div className="col-span-2">
            <Detail icon={MapPin} label="Address" value={patient.address} />
          </div>
        )}
        {patient?.bloodGroup && (
          <Detail icon={Droplet} label="Blood" value={patient.bloodGroup} />
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7 text-warning hover:text-warning"
          onClick={async () => {
            try {
              await api.appointments.update(apt._id, { status: 'Confirmed' });
              toast.success('Appointment reverted to Confirmed');
            } catch {
              toast.error('Failed to revert appointment');
            }
          }}
        >
          <RotateCcw className="w-3 h-3" /> Revert
        </Button>
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7 text-primary hover:text-primary"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info className="w-3 h-3" /> Details
        </Button>
      </div>

      <Button
        variant="outline" size="sm" className="w-full gap-1 text-[10px] px-2 py-1 h-7 border-dashed border-border/80 hover:bg-muted/30"
        onClick={() => setShowIntake(!showIntake)}
      >
        <FileText className="w-3 h-3 text-muted-foreground" /> Intake Details
      </Button>

      {/* View Details dropdown */}
      {showDetails && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Appointment Details
          </h4>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-sm font-bold">{apt.patient}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                <UserX className="w-3 h-3" /> Missed
              </span>
            </div>
            <IntakeRow label="Date" value={formatDisplayDate(apt.date)} />
            <IntakeRow label="Time" value={apt.time} />
            <IntakeRow label="Fee" value={`₹${apt.fees || 0}`} />
            {apt.transactionId && <IntakeRow label="Transaction" value={apt.transactionId} />}
            {apt.invoiceId && <IntakeRow label="Invoice" value={apt.invoiceId} />}
            <div className="pt-2 border-t border-border/50 mt-2">
              <h5 className="text-xs font-bold text-foreground mb-2">Patient Contact</h5>
              <IntakeRow label="Phone" value={patient?.phone || 'N/A'} />
              <IntakeRow label="Email" value={patient?.email || 'N/A'} />
            </div>
          </div>
        </div>
      )}

      {/* Intake Form dropdown */}
      {showIntake && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Quick Intake Form
          </h4>
          {intake ? (
            <div className="space-y-2.5">
              {(() => {
                const mode = (apt.appointmentMode || '').toLowerCase();
                const type = (apt.type || '').toLowerCase();
                if (mode === 'chat' || type.includes('chat')) return <IntakeRow label="Consultation Mode" value="Chat" />;
                if (mode === 'video' || type.includes('video')) return <IntakeRow label="Consultation Mode" value="Video Call" />;
                if (mode === 'voice' || mode === 'audio' || type.includes('voice') || type.includes('audio')) return <IntakeRow label="Consultation Mode" value="Voice Call" />;
                return null;
              })()}
              <IntakeRow label="Chief Complaint" value={
                intake.chiefComplaint === 'Other' ? intake.chiefComplaintOther : intake.chiefComplaint
              } />
              {intake.symptomsDuration && <IntakeRow label="Duration" value={intake.symptomsDuration} />}
              <IntakeRow label="Past Medical History" value={
                intake.pastMedicalHistory?.hasHistory === false ? 'No' :
                intake.pastMedicalHistory?.hasHistory === true ? (intake.pastMedicalHistory?.details || 'Yes') : '—'
              } />
              <IntakeRow label="Allergies" value={
                intake.allergies?.hasAllergies === false ? 'No' :
                intake.allergies?.hasAllergies === true ? (intake.allergies?.details || 'Yes') : '—'
              } danger={intake.allergies?.hasAllergies === true} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pre-consultation details available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ── */

interface DetailProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | React.ReactNode;
}

function Detail({ icon: Icon, label, value }: DetailProps) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

interface IntakeRowProps {
  label: string;
  value: string | React.ReactNode;
  danger?: boolean;
}

function IntakeRow({ label, value, danger = false }: IntakeRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold text-foreground shrink-0 min-w-[110px]">{label}:</span>
      <span className={`text-xs font-medium ${danger ? 'text-destructive' : 'text-primary'}`}>{value || '—'}</span>
    </div>
  );
}
