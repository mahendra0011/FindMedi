import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDays, Stethoscope, FileText, Pill, Clock, User, AlertCircle, FlaskConical, Activity, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateUtils';

/**
 * Modal showing a returning patient's past visit history.
 * Fetches records via api.getPatientRecords(patientId).
 *
 * Each record displays: date, type badge, diagnosis, doctor notes/advice,
 * and prescription summary.
 *
 * @param {object|null} patient - the patient object from appointment.patientId, or null to close
 * @param {string} patientName - fallback name when patient object is missing
 * @param {function} onClose - close handler
 */
export default function PatientHistoryModal({ patient, patientName, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patientId = patient?._id;
  const name = patient?.name || patientName || 'Patient';

  useEffect(() => {
    if (!patientId) { setRecords([]); return; }
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
  }, [patientId]);

  if (!patient && !patientName) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {name} — Visit History
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {records.length > 0 ? `${records.length} past record${records.length === 1 ? '' : 's'}` : 'Past medical records'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close history">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
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
            <p className="text-sm">No past records found for this patient.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec, idx) => (
              <HistoryRecordCard key={rec._id || idx} record={rec} />
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full mt-5" onClick={onClose}>Close</Button>
      </motion.div>
    </div>
  );
}

/**
 * Individual past-visit record card within the history modal.
 * Shows: date, type badge, diagnosis, notes/advice, prescription.
 */
function HistoryRecordCard({ record }) {
  const date = record.date || formatDisplayDate(record.createdAt?.slice(0, 10));
  const diagnosis = record.diagnosis || record.data?.diagnosis || '—';
  const notes = record.notes || record.data?.advice || '';
  const prescription = record.prescription || '';
  const meds = record.data?.medications;
  const doctorName = record.doctor || record.doctorId?.name || '';
  const type = record.type || 'diagnosis';
  const chiefComplaints = record.data?.chiefComplaints || '';
  const tests = record.data?.tests || [];
  const symptoms = record.data?.symptoms || '';
  const vitals = record.data?.vitals || record.vitals || null;

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

  // Format medications list for display
  const medList = Array.isArray(meds) && meds.length > 0
    ? meds.map(m => typeof m === 'string' ? m : `${m.name || ''}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`).filter(Boolean)
    : prescription ? prescription.split('\n').filter(Boolean) : [];

  return (
    <div className="bg-muted/20 rounded-xl border border-border/50 p-4">
      {/* Top row: date + type + doctor */}
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

      {/* Chief Complaints / Symptoms */}
      {(chiefComplaints || symptoms) && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> Chief Complaints
          </span>
          <p className="text-sm text-foreground font-medium">{chiefComplaints || symptoms}</p>
        </div>
      )}

      {/* Diagnosis */}
      <div className="mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnosis</span>
        <p className="text-sm text-foreground font-medium">{diagnosis}</p>
      </div>

      {/* Vital Signs */}
      {vitals && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Activity className="w-3 h-3" /> Vital Signs
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {vitals.bloodPressure && <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">BP: {vitals.bloodPressure}</span>}
            {vitals.heartRate && <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">HR: {vitals.heartRate} bpm</span>}
            {vitals.temperature && <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">Temp: {vitals.temperature}°F</span>}
            {vitals.spO2 && <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">SpO₂: {vitals.spO2}%</span>}
            {vitals.weight && <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">Wt: {vitals.weight} kg</span>}
          </div>
        </div>
      )}

      {/* Lab Tests (for lab_report type) */}
      {Array.isArray(tests) && tests.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <FlaskConical className="w-3 h-3" /> Lab Test Results
          </span>
          <div className="mt-1 space-y-1">
            {tests.slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                <span className="text-foreground font-medium">{t.name || t.testName || '—'}</span>
                <span className="text-muted-foreground">{t.result || t.value || '—'} {t.unit || ''}</span>
              </div>
            ))}
            {tests.length > 6 && (
              <p className="text-xs text-muted-foreground/70 pl-1">+{tests.length - 6} more tests</p>
            )}
          </div>
        </div>
      )}

      {/* Doctor notes / advice */}
      {notes && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doctor's Notes</span>
          <p className="text-sm text-muted-foreground line-clamp-3">{notes}</p>
        </div>
      )}

      {/* Prescription summary */}
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
