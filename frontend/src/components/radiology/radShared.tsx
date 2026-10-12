import React from 'react';
import { X } from 'lucide-react';

export const RAD_MODALITY_TYPES = ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Doppler', 'Mammography', 'OPG/CBCT', 'Fluoroscopy', 'Echo', 'DEXA', 'Nuclear Scan', 'PET Scan'];

export const RAD_DASH_TYPES: Record<string, string> = {
  MRI: '/radiology/mri',
  'X-Ray': '/radiology/xray',
  'CT Scan': '/radiology/ct',
  Ultrasound: '/radiology/ultrasound',
  Doppler: '/radiology/doppler',
  Mammography: '/radiology/mammography',
};

export const RAD_LINKS = [
  { label: 'Dashboard', path: '/radiology' },
  { label: 'Admin Dashboard', path: '/radiology/dashboard' },
  { label: 'Scheduling', path: '/radiology/scheduling' },
  { label: 'Reception', path: '/radiology/reception' },
  { label: 'Preparation Queue', path: '/radiology/preparation' },
  { label: 'Modality Master', path: '/radiology/modalities' },
  { label: 'PACS / DICOM', path: '/radiology/pacs' },
  { label: 'Critical Findings', path: '/radiology/critical' },
  { label: 'Report Center', path: '/radiology/reports' },
  { label: 'MIS Reports', path: '/radiology/mis' },
];

export const modalityColors: Record<string, string> = {
  'X-Ray': 'bg-blue-500/10 text-blue-600',
  MRI: 'bg-purple-500/10 text-purple-600',
  'CT Scan': 'bg-orange-500/10 text-orange-600',
  Ultrasound: 'bg-green-500/10 text-green-600',
  Doppler: 'bg-teal-500/10 text-teal-600',
  Mammography: 'bg-pink-500/10 text-pink-600',
  Echo: 'bg-red-500/10 text-red-600',
  ECG: 'bg-yellow-500/10 text-yellow-600',
};

export const statusColors: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Ordered: 'bg-primary/10 text-primary',
  'Authorization Pending': 'bg-amber-500/10 text-amber-600',
  'Payment Pending': 'bg-amber-500/10 text-amber-600',
  'Scheduling Pending': 'bg-amber-500/10 text-amber-600',
  Scheduled: 'bg-info/10 text-info',
  'Appointment Confirmed': 'bg-info/10 text-info',
  'Patient Arrived': 'bg-cyan-500/10 text-cyan-600',
  'Preparation Pending': 'bg-amber-500/10 text-amber-600',
  'Ready for Imaging': 'bg-emerald-500/10 text-emerald-600',
  'In Progress': 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'Study Completed': 'bg-success/10 text-success',
  'Reporting Pending': 'bg-purple-500/10 text-purple-600',
  Reported: 'bg-purple-500/10 text-purple-600',
  'Report Finalized': 'bg-purple-500/10 text-purple-600',
  'Report Released': 'bg-indigo-500/10 text-indigo-600',
  Delivered: 'bg-muted text-muted-foreground',
  Cancelled: 'bg-destructive/10 text-destructive',
  'On Hold': 'bg-slate-500/10 text-slate-600',
  Booked: 'bg-info/10 text-info',
  Confirmed: 'bg-info/10 text-info',
  Arrived: 'bg-cyan-500/10 text-cyan-600',
  'No Show': 'bg-destructive/10 text-destructive',
  Rescheduled: 'bg-amber-500/10 text-amber-600',
  Available: 'bg-emerald-500/10 text-emerald-600',
  'In Use': 'bg-info/10 text-info',
  'Under Maintenance': 'bg-amber-500/10 text-amber-600',
  'Out of Service': 'bg-destructive/10 text-destructive',
  Inactive: 'bg-muted text-muted-foreground',
  Regular: 'bg-info/10 text-info',
  Emergency: 'bg-destructive/10 text-destructive',
  'Maintenance Block': 'bg-amber-500/10 text-amber-600',
};

export const priorityColors: Record<string, string> = {
  Routine: 'bg-muted text-muted-foreground',
  Urgent: 'bg-warning/10 text-warning',
  STAT: 'bg-destructive/10 text-destructive',
};

export function errMessage(e: any, fallback = 'Request failed'): string {
  return e?.response?.data?.message || e?.message || fallback;
}

export function fmtDateTime(v: any): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(v: any): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

export function isToday(v: any): boolean {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function dayStart(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayEnd(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function toDateInput(d: Date): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${dd}`;
}

export function toDateTimeLocal(v: any): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const date = toDateInput(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date}T${hh}:${mm}`;
}

export function patientNameOf(o: any): string {
  if (!o) return '-';
  if (typeof o.patientId === 'object' && o.patientId?.name) return o.patientId.name;
  return o.patientName || (typeof o.patientId === 'string' ? o.patientId : 'Patient');
}

export function doctorNameOf(o: any): string {
  if (!o) return '-';
  if (typeof o.doctorId === 'object' && o.doctorId?.name) return o.doctorId.name;
  return o.doctorName || 'Unknown';
}

export function prepChecklistFor(modality: string): string[] {
  const m = String(modality || '').toLowerCase();
  if (m === 'mri') {
    return [
      'Safety questionnaire completed',
      'Implant / pacemaker screening done',
      'Metal objects & clothing removed',
      'Radiologist clearance documented',
    ];
  }
  if (m === 'ct scan' || m === 'ct') {
    return [
      'Contrast need confirmed',
      'Contrast allergy history checked',
      'Renal function (creatinine / eGFR) verified',
      'Pregnancy screening done',
      'Informed consent for contrast obtained',
    ];
  }
  if (m === 'x-ray') {
    return [
      'Correct patient verified (2 identifiers)',
      'Correct body part / projection confirmed',
      'Pregnancy screening done',
      'Attire & metal objects removed',
    ];
  }
  if (m === 'ultrasound' || m === 'doppler') {
    return [
      'Exam type & preparation instructions explained',
      'Fasting / full-bladder prep verified where required',
      'Gowning & privacy arranged',
      'Consent obtained if required',
    ];
  }
  if (m === 'mammography') {
    return [
      'Prior mammograms available',
      'Deodorant / powder removed',
      'Pregnancy / lactation status confirmed',
      'Consent & privacy maintained',
    ];
  }
  return [
    'Correct patient verified (2 identifiers)',
    'Correct study & side verified',
    'Preparation instructions followed',
    'Consent obtained if required',
  ];
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl border shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} type="button"><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ value }: { value?: string }) {
  const v = value || '-';
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[v] || 'bg-muted text-muted-foreground'}`}>{v}</span>;
}

export function ModalityBadge({ value }: { value?: string }) {
  const v = value || '-';
  return <span className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${modalityColors[v] || 'bg-muted text-muted-foreground'}`}>{v}</span>;
}

export function PriorityBadge({ value }: { value?: string }) {
  const v = value || 'Routine';
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[v] || 'bg-muted text-muted-foreground'}`}>{v}</span>;
}

export function StatCard({ label, value, tone = 'text-foreground', onClick }: { label: string; value: number | string; tone?: string; onClick?: () => void }) {
  return (
    <div className={`bg-card rounded-xl border p-4 ${onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`} onClick={onClick}>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export const inputCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm';
export const textareaCls = 'w-full min-h-[70px] rounded-lg border border-input bg-background px-3 py-2 text-sm';
export const selectCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm';

export function parseList(v: string): string[] {
  return String(v || '')
    .split(/[,\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean);
}

export function listToText(v: any): string {
  if (Array.isArray(v)) return v.join(', ');
  return v ? String(v) : '';
}
