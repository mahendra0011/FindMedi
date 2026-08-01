import { useState, useMemo, useCallback } from 'react';
import {
  Clock, Phone, Mail, MapPin, Droplet, User, CalendarDays,
  ChevronDown, ChevronUp, FileText, Stethoscope, CheckCircle,
  ArrowLeft, Download, Receipt, RotateCcw, Search, Info, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api, downloadInvoicePdf } from '@/lib/api';
import {
  getHourSlots, getSubSlotsForHour, hourBoxFor, subSlotFor, parseTime,
} from '@/lib/timeSlots';
import PatientHistoryModal from '@/components/PatientHistoryModal';
import { formatDisplayDate } from '@/lib/dateUtils';

/**
 * Shared 3-column "Today Appointments" dashboard for Doctor & Clinic dashboards.
 *
 *   ┌──────────────┬─────────────────────┬──────────────────┐
 *   │ LEFT         │ MIDDLE              │ RIGHT            │
 *   │ Calendar     │ Hour slots (scroll) │ Completed slots  │
 *   │ Patient list │ Sub-slots (scroll)  │ Search           │
 *   │              │ Patient detail card │ Completed cards  │
 *   │              │ 4 buttons           │  3 buttons       │
 *   └──────────────┴─────────────────────┴──────────────────┘
 *
 * Props:
 *  - appointments:  all appointments for the doctor (today's are derived here)
 *  - selectedDate:  'YYYY-MM-DD'
 *  - calendar:      ReactNode rendered in the left panel (calendar widget)
 *  - onRefresh:     fn() to reload appointments after status changes
 *  - user:          auth user object
 */
export default function TodayAppointmentsSection({
  appointments,
  selectedDate,
  calendar,
  onRefresh,
  user,
  onViewDetails,
}) {
  const hourSlots = useMemo(() => getHourSlots(), []);

  // Sort by actual clock time so cards/list follow the day's time-slot sequence
  const sortByTime = (a, b) => {
    const ta = parseTime(a.time);
    const tb = parseTime(b.time);
    if (ta.hour == null || tb.hour == null) return 0;
    return (ta.hour * 60 + (ta.minute || 0)) - (tb.hour * 60 + (tb.minute || 0));
  };

  // Today's appointments split into "active" (confirmed/queued/serving) and "completed"
  const todays = useMemo(
    () => appointments.filter(a => a.date === selectedDate).sort(sortByTime),
    [appointments, selectedDate]
  );
  // Today's appointments split into "active" (confirmed/queued/serving) and "completed".
  // Pending is intentionally EXCLUDED here — pending appointments belong to the Approve view.
  const activeAppointments = useMemo(
    () => todays.filter(a => {
      const s = (a.status || '').toLowerCase();
      return s === 'confirmed' || s === 'in queue' || s === 'serving';
    }),
    [todays]
  );
  const completedAppointments = useMemo(
    () => todays.filter(a => (a.status || '').toLowerCase() === 'completed'),
    [todays]
  );

  // Hour filter (null = show all hours of the day). Sub-slot filter (null = all sub-slots).
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedSubSlot, setSelectedSubSlot] = useState(null);

  // Sub-slot row: when an hour is filtered show its sub-slots, otherwise all sub-slots present today
  const subSlots = useMemo(() => {
    if (selectedHour) return getSubSlotsForHour(selectedHour);
    const present = [...new Set(activeAppointments.map(a => subSlotFor(a.time)).filter(Boolean))];
    return present.length ? present : getSubSlotsForHour(hourBoxFor(activeAppointments[0]?.time) || hourSlots[0]);
  }, [selectedHour, activeAppointments, hourSlots]);

  // Cards shown in the middle panel: no filter → all of today's active appointments in time order
  const hourAppointments = useMemo(
    () => selectedHour
      ? activeAppointments.filter(a => hourBoxFor(a.time) === selectedHour)
      : activeAppointments,
    [activeAppointments, selectedHour]
  );
  const slotAppointments = useMemo(() => {
    if (!selectedSubSlot) return hourAppointments;
    return hourAppointments.filter(a => subSlotFor(a.time) === selectedSubSlot);
  }, [hourAppointments, selectedSubSlot]);

  // Highlighted patient in the left panel list (cards are always all visible in the middle)
  const [selectedAptId, setSelectedAptId] = useState(null);
  const selectedApt = useMemo(
    () => selectedAptId ? slotAppointments.find(a => a._id === selectedAptId) || null : null,
    [selectedAptId, slotAppointments]
  );

  // History modal
  const [historyPatient, setHistoryPatient] = useState(null);
  // File viewer popup
  const [fileViewerUrl, setFileViewerUrl] = useState(null);

  // Completed-section search
  const [completedSearch, setCompletedSearch] = useState('');

  // Visit-number for history button visibility (2nd+ visit)
  const pastVisitCountFor = useCallback((apt) => {
    const pid = apt.patientId?._id || apt.patientId;
    if (!pid) return 0;
    return appointments.filter(a =>
      a.status === 'Completed' &&
      a.date < selectedDate &&
      String(a.patientId?._id || a.patientId) === String(pid)
    ).length;
  }, [appointments, selectedDate]);

  const filteredCompleted = useMemo(() => {
    if (!completedSearch.trim()) return completedAppointments;
    const q = completedSearch.toLowerCase();
    return completedAppointments.filter(a =>
      (a.patient || '').toLowerCase().includes(q) ||
      (a.patientId?.name || '').toLowerCase().includes(q) ||
      (a.patientId?.phone || '').toLowerCase().includes(q)
    );
  }, [completedAppointments, completedSearch]);

  // ── Handlers ──────────────────────────────────────────────
  const handleHourClick = (h) => {
    setSelectedHour(selectedHour === h ? null : h); // toggle = filter on/off
    setSelectedSubSlot(null);
    setSelectedAptId(null);
  };

  const handleSubSlotClick = (s) => {
    setSelectedSubSlot(s === selectedSubSlot ? null : s);
    setSelectedAptId(null);
  };

  const openHistory = (apt) => {
    const pid = apt.patientId?._id || apt.patientId;
    if (!pid) {
      toast.info('Patient ID not available.');
      return;
    }
    // Open history popup — it will fetch records from the API
    // If no records exist, the modal will show "No past records found"
    setHistoryPatient({ patient: apt.patientId, patientName: apt.patient });
  };

  const handleConfirmComplete = async (apt, note) => {
    if (!apt) return false;
    try {
      // Always mark completed first — this is the critical action
      await api.updateAppointment(apt._id, { status: 'Completed' });

      // Save quick note as a record if provided (non-blocking — failure won't prevent completion)
      if (note && note.trim()) {
        const pid = apt.patientId?._id || apt.patientId;
        try {
          await api.createRecord({
            patient: apt.patient,
            patientId: pid,
            doctor: user?.name,
            diagnosis: 'Quick Note',
            type: 'Diagnosis',
            notes: note.trim(),
            data: { date: selectedDate, note: note.trim() },
          });
        } catch (noteErr) {
          console.error('Quick note save failed:', noteErr);
        }
      }

      toast.success('Appointment completed');
      setSelectedAptId(null);
      onRefresh();
      return true;
    } catch (e) {
      console.error(e);
      toast.error('Failed to complete appointment');
      return false;
    }
  };

  const handleRevert = async (apt) => {
    try {
      await api.updateAppointment(apt._id, { status: 'Confirmed' });
      toast.success('Appointment reverted to Confirmed');
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to revert appointment');
    }
  };

  const handleWritePrescription = (apt) => {
    // Delegate to parent via custom event so each page can open its own modal
    window.dispatchEvent(new CustomEvent('open-prescription', { detail: apt }));
  };

  const handleDownloadPrescription = async (apt) => {
    try {
      const pid = apt.patientId?._id || apt.patientId;
      const res = await api.getPatientRecords(pid);
      const recs = res?.records || res?.data || res || [];
      const rx = recs.find(r => r.type === 'prescription');
      if (!rx) { toast.info('No prescription record found'); return; }
      toast.success('Opening prescription…');
      // Open any attachment if present, else show a toast with details
      if (rx.attachments && rx.attachments[0]) {
        window.open(rx.attachments[0].url || rx.attachments[0], '_blank');
      } else {
        toast.message(`Prescription: ${rx.diagnosis || 'N/A'}`, {
          description: (rx.prescription || '').slice(0, 120),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load prescription');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:flex-1 md:min-h-0 md:grid-rows-1">
      {/* ════════════ LEFT PANEL: Calendar (fixed) + Patient list (scrolls) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {calendar}
        {/* Patient list for the selected date — fills remaining height, scrolls internally */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex-1 min-h-0 flex flex-col">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2 shrink-0">
            <User className="w-4 h-4 text-primary" />
            Patients on {formatDisplayDate(selectedDate) || selectedDate}
          </h4>
          <div className="space-y-2 min-h-0 flex-1 overflow-y-auto">
            {activeAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No active appointments for this date.
              </p>
            ) : (
              activeAppointments.map(a => {
                const isActive = selectedApt?._id === a._id;
                return (
                  <button
                    key={a._id}
                    onClick={() => {
                      const h = hourBoxFor(a.time);
                      setSelectedHour(h);
                      setSelectedSubSlot(subSlotFor(a.time));
                      setSelectedAptId(a._id);
                      document.getElementById(`apt-card-${a._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(a.patient || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.patient}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {a.time} · {subSlotFor(a.time)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      (a.status || '').toLowerCase() === 'confirmed'
                        ? 'bg-success/10 text-success'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {a.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ════════════ MIDDLE PANEL: Time slots + Patient card ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {/* Hour slot boxes — horizontal scroll (sticky filters) */}
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
                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${
                      selectedHour === h ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                    }`}>{count}</span>
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
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[7px] font-bold flex items-center justify-center bg-success text-white">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Patient detail cards — stacked, fill panel height, scroll inside the section */}
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
                    onViewFile={setFileViewerUrl}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ RIGHT PANEL: Completed Today ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Completed Today
              {completedAppointments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success">
                  {completedAppointments.length}
                </span>
              )}
            </h4>
          </div>

          {/* Compact hour boxes (smaller) */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {hourSlots.map(h => {
              const count = completedAppointments.filter(a => hourBoxFor(a.time) === h).length;
              return (
                <button
                  key={h}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                    count > 0 ? 'bg-success/15 text-success' : 'bg-muted/40 text-muted-foreground/60'
                  }`}
                  title={`${h} — ${count} completed`}
                >
                  {h.replace(/ (AM|PM)/, '')}
                </button>
              );
            })}
          </div>

          {/* Sub-slots row — show all unique sub-slots from completed appointments */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mt-1 scrollbar-thin">
            {(() => {
              const completedSubSlots = [...new Set(completedAppointments.map(a => subSlotFor(a.time)).filter(Boolean))];
              if (completedSubSlots.length === 0) {
                return <span className="text-[10px] text-muted-foreground/50 px-1">No slots</span>;
              }
              return completedSubSlots.map(s => (
                <span key={s} className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground">
                  {s}
                </span>
              ));
            })()}
          </div>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search completed…"
              value={completedSearch}
              onChange={e => setCompletedSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full md:w-1/4 min-w-[140px]"
            />
          </div>
        </div>

        {/* Completed cards — fill panel height, scroll inside the section */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {filteredCompleted.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-6 text-center flex-1 flex flex-col items-center justify-center">
              <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {completedAppointments.length === 0
                  ? 'No completed appointments today.'
                  : 'No results match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col min-h-full">
              {filteredCompleted.map(apt => (
                <div key={apt._id} className="flex-1 flex flex-col">
                  <CompletedCard
                    apt={apt}
                    onRevert={handleRevert}
                    onDownloadPrescription={handleDownloadPrescription}
                    onDownloadInvoice={(a) => a.invoiceId && downloadInvoicePdf(a.invoiceId, `invoice-${a.patient}.pdf`)}
                    onViewDetails={onViewDetails}
                    subSlotFor={subSlotFor}
                    onViewFile={setFileViewerUrl}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ════════════ Patient History Modal (popup) ════════════ */}
      {historyPatient && (
        <PatientHistoryModal
          patient={historyPatient?.patient}
          patientName={historyPatient?.patientName}
          onClose={() => setHistoryPatient(null)}
        />
      )}
      {/* File Viewer Popup */}
      {fileViewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setFileViewerUrl(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border/40">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Uploaded File
              </h3>
              <button onClick={() => setFileViewerUrl(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10">
              {fileViewerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={fileViewerUrl} alt="Uploaded file" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
              ) : fileViewerUrl.match(/\.pdf$/i) ? (
                <iframe src={fileViewerUrl} className="w-full h-[70vh] rounded-lg border-0" title="PDF Viewer" />
              ) : (
                <a href={fileViewerUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open file in new tab</a>
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
function PatientDetailCard({
  apt, pastVisitCount,
  onConfirmComplete, onOpenHistory, onWritePrescription, onViewFile,
}) {
  const patient = apt.patientId;
  const intake = apt.preConsultationDetails;

  // "View Details" expand toggle
  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(true);

  // "Complete" flow state
  const [completing, setCompleting] = useState(false);
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
          Remember Your Patient's Next Appointment
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add quick notes here so you don't forget important details about your patient's upcoming visit.
        </p>
        <Textarea
          placeholder="Type quick notes for the next visit…"
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          className="min-h-[120px] mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setCompleting(false)}>Back</Button>
          <Button className="flex-1 gap-2" onClick={handleConfirmComplete}>
            <CheckCircle className="w-4 h-4" /> Confirm
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
            <img src={patient.avatar} alt={apt.patient} className="w-full h-full object-cover" />
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
          <Detail icon={User} label="Age" value={`${Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000)} yrs`} />
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

      {/* 4 action buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
          onClick={() => setShowDetails(!showDetails)}
        >
          <FileText className="w-3 h-3" /> Details
        </Button>
        {pastVisitCount > 0 ? (
          <Button
            variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
            onClick={() => onOpenHistory(apt)}
          >
            <CalendarDays className="w-3 h-3" /> Previous
          </Button>
        ) : <div />}
        <Button
          variant="outline" size="sm" className="gap-1 text-[10px] px-2 py-1 h-7"
          onClick={() => onWritePrescription(apt)}
        >
          <Stethoscope className="w-3 h-3" /> Prescription
        </Button>
        <Button
          size="sm" className="gap-1 text-[10px] px-2 py-1 h-7 bg-success hover:bg-success/90"
          onClick={() => setCompleting(true)}
        >
          <CheckCircle className="w-3 h-3" /> Complete
        </Button>
      </div>

      <Button
        variant="outline" size="sm" className="w-full gap-1 text-[10px] px-2 py-1 h-7 border-dashed border-border/80 hover:bg-muted/30"
        onClick={() => setShowIntake(!showIntake)}
      >
        <FileText className="w-3 h-3 text-muted-foreground" /> Intake Details
      </Button>

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
              {/* 1. Chief Complaint & Duration */}
              <IntakeRow label="Chief Complaint" value={
                intake.chiefComplaint === 'Other' ? intake.chiefComplaintOther : intake.chiefComplaint
              } />
              {intake.symptomsDuration && <IntakeRow label="Duration" value={intake.symptomsDuration} />}

              {/* 2. Past Medical History */}
              <IntakeRow label="Past Medical History" value={
                intake.pastMedicalHistory?.hasHistory === false ? 'No' :
                intake.pastMedicalHistory?.hasHistory === true ? (intake.pastMedicalHistory?.details || 'Yes') : '—'
              } />

              {/* 3. Current / Past Treatment */}
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
                  <button onClick={() => onViewFile(intake.currentTreatment.prescriptionFile)} className="text-primary underline hover:text-primary/80">View File</button>
                } />
              )}
              {intake.currentTreatment?.hasPastTreatment && (
                <IntakeRow label="Taking Medicines" value={
                  intake.currentTreatment?.takingMedicines === true ? 'Yes' : intake.currentTreatment?.takingMedicines === false ? 'No' : '—'
                } />
              )}

              {/* 4. Recent Test Reports */}
              <IntakeRow label="Test Reports" value={
                intake.testReports?.hasReports === false ? 'No' :
                intake.testReports?.hasReports === true ? (
                  intake.testReports?.reportFile ?
                    <button onClick={() => onViewFile(intake.testReports.reportFile)} className="text-primary underline hover:text-primary/80">View File</button>
                    : 'Yes'
                ) : '—'
              } />

              {/* 5. Current General Medicines */}
              <IntakeRow label="Current Medicines" value={
                intake.currentMedications?.hasMedications === false ? 'No' :
                intake.currentMedications?.hasMedications === true ? (intake.currentMedications?.details || 'Yes') : '—'
              } />

              {/* 6. Allergies */}
              <IntakeRow label="Allergies" value={
                intake.allergies?.hasAllergies === false ? 'No' :
                intake.allergies?.hasAllergies === true ? (intake.allergies?.details || 'Yes') : '—'
              } danger={intake.allergies?.hasAllergies === true} />

              {/* 7. Family History */}
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
export function CompletedCard({ apt, subSlotFor, onRevert, onDownloadPrescription, onDownloadInvoice, onViewDetails, onViewFile }) {
  const patient = apt.patientId;
  const intake = apt.preConsultationDetails;

  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(true);

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex-1 flex flex-col mb-3">
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
            <img src={patient.avatar} alt={apt.patient} className="w-full h-full object-cover" />
          ) : (
            (apt.patient || '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-foreground truncate">{apt.patient}</h3>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success text-[10px]">
            <CheckCircle className="w-3 h-3" />
            Completed {apt.consultationEndTime ? new Date(apt.consultationEndTime).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : ''}
          </div>
        </div>
      </div>

      {/* Personal details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {patient?.dateOfBirth && (
          <Detail icon={User} label="Age" value={`${Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000)} yrs`} />
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
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7" onClick={() => onDownloadPrescription(apt)}>
          <Download className="w-3 h-3" /> Rx
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7" onClick={() => onDownloadInvoice(apt)} disabled={!apt.invoiceId}>
          <Receipt className="w-3 h-3" /> Invoice
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7 text-warning hover:text-warning" onClick={() => onRevert(apt)}>
          <RotateCcw className="w-3 h-3" /> Revert
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-[10px] px-1 h-7 text-primary hover:text-primary" onClick={() => setShowDetails(!showDetails)}>
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
                 {apt.consultationEndTime ? new Date(apt.consultationEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Completed'}
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
                  <button onClick={() => onViewFile && onViewFile(intake.currentTreatment.prescriptionFile)} className="text-primary underline hover:text-primary/80">View File</button>
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
                    <button onClick={() => onViewFile && onViewFile(intake.testReports.reportFile)} className="text-primary underline hover:text-primary/80">View File</button>
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

/* ── Small helpers ── */
function Detail({ icon: Icon, label, value }) {
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

function IntakeRow({ label, value, danger }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold text-foreground shrink-0 min-w-[110px]">{label}:</span>
      <span className={`text-xs font-medium ${danger ? 'text-destructive' : 'text-primary'}`}>{value || '—'}</span>
    </div>
  );
}
