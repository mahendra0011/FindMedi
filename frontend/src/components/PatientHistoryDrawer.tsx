import { useState, useEffect } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { X, CalendarDays, Stethoscope, Pill, User, AlertCircle, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateUtils';

/**
 * Bottom-sliding popup showing a returning patient's past visit history.
 * Used by the "Previous Appointment" button on appointment cards.
 *
 * Past visits show: diagnosis, doctor's note/advice, prescription summary,
 * and visit date. Only shown for patients on their 2nd+ visit.
 *
 * Props:
 *  - open:        boolean (controls visibility)
 *  - patient:     object|null  (appointment.patientId)
 *  - patientName: string       (fallback name)
 *  - onOpenChange: fn(open)    (closes the drawer)
 */
export default function PatientHistoryDrawer({ open, patient, patientName, onOpenChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patientId = patient?._id;
  const name = patient?.name || patientName || 'Patient';

  useEffect(() => {
    if (!open || !patientId) { setRecords([]); return; }
    setLoading(true);
    setError('');
    api.getPatientRecords(patientId)
      .then(res => {
        const list = res?.records || res?.data || res || [];
        setRecords(list);
      })
      .catch(err => {
        console.error('Failed to fetch patient history:', err);
        setError('Could not load patient history. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [open, patientId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <DrawerTitle className="flex items-center gap-2 text-left">
              <User className="w-5 h-5 text-primary" />
              {name} — Previous Appointments
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {records.length > 0
                ? `${records.length} past visit${records.length === 1 ? '' : 's'} — diagnosis, notes & prescriptions`
                : 'Past visit history'}
            </DrawerDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close history"
          >
            <X className="w-5 h-5" />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-full mb-1.5" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm">No previous records found for this patient.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((rec, idx) => (
                <PastVisitCard key={rec._id || idx} record={rec} />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * One past visit: date, type, doctor, diagnosis, notes, prescription.
 */
function PastVisitCard({ record }) {
  const date = record.date || (record.createdAt ? formatDisplayDate(record.createdAt.slice(0, 10)) : '—');
  const diagnosis = record.diagnosis || record.data?.diagnosis || '—';
  const notes = record.notes || record.data?.advice || '';
  const prescription = record.prescription || '';
  const meds = record.data?.medications;
  const doctorName = record.doctor || record.doctorId?.name || '';
  const type = record.type || 'diagnosis';

  const typeLabels = {
    prescription: 'Prescription',
    lab_report: 'Lab Report',
    diagnosis: 'Diagnosis',
    discharge_summary: 'Discharge Summary',
    imaging: 'Imaging',
    bill_invoice: 'Bill',
    payment_invoice: 'Invoice',
  };
  const typeColors = {
    prescription: 'bg-success/10 text-success',
    lab_report: 'bg-info/10 text-info',
    diagnosis: 'bg-primary/10 text-primary',
    discharge_summary: 'bg-warning/10 text-warning',
    imaging: 'bg-info/10 text-info',
    bill_invoice: 'bg-muted text-muted-foreground',
    payment_invoice: 'bg-muted text-muted-foreground',
  };

  const medList = Array.isArray(meds) && meds.length > 0
    ? meds.map(m => typeof m === 'string' ? m : `${m.name || ''}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`).filter(Boolean)
    : prescription ? prescription.split('\n').filter(Boolean) : [];

  return (
    <div className="bg-muted/20 rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-3.5 h-3.5 text-primary/70" />
          <span className="font-medium text-foreground">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColors[type] || typeColors.diagnosis}`}>
            {typeLabels[type] || type}
          </span>
          {doctorName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Dr. {doctorName}
            </span>
          )}
        </div>
      </div>

      <div className="mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnosis</span>
        <p className="text-sm text-foreground font-medium">{diagnosis}</p>
      </div>

      {notes && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doctor's Notes</span>
          <p className="text-sm text-muted-foreground line-clamp-3">{notes}</p>
        </div>
      )}

      {medList.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Pill className="w-3 h-3" /> Prescription
          </span>
          <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
            {medList.slice(0, 5).map((m, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-primary/50 mt-1">•</span>
                <span>{m}</span>
              </li>
            ))}
            {medList.length > 5 && (
              <li className="text-xs text-muted-foreground/70 pl-3">+{medList.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
