import { useEffect, useState } from 'react';
import { AlertTriangle, Flag, Skull } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * File 13 §13.6: patient flag banner. Renders above every clinical surface
 * that takes a patientId — deceased/blacklisted render as blocking red.
 */
const KIND_STYLE: Record<string, string> = {
  allergy: 'bg-amber-50 text-amber-900 border-amber-300',
  vip: 'bg-violet-50 text-violet-900 border-violet-300',
  'fall-risk': 'bg-orange-50 text-orange-900 border-orange-300',
  isolation: 'bg-sky-50 text-sky-900 border-sky-300',
  'difficult-vein': 'bg-teal-50 text-teal-900 border-teal-300',
  blacklisted: 'bg-red-100 text-red-900 border-red-500',
  deceased: 'bg-red-100 text-red-900 border-red-500',
  mlc: 'bg-slate-100 text-slate-900 border-slate-400',
  other: 'bg-muted text-foreground border-border',
};

export default function PatientBanner({ patientId }: { patientId: string }) {
  const [flags, setFlags] = useState<any[]>([]);
  useEffect(() => {
    if (!patientId || String(patientId).trim().length < 8) { setFlags([]); return; }
    api.patientFlags(patientId).then((r: any) => setFlags(r?.flags || [])).catch(() => {});
  }, [patientId]);
  if (!flags.length) return null;
  return (
    <div className="flex flex-wrap gap-2" role="alert" aria-label="Patient flags">
      {flags.map((f) => (
        <span
          key={f._id}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${KIND_STYLE[f.kind] || KIND_STYLE.other}`}
        >
          {f.kind === 'deceased' ? <Skull size={13} /> : f.severity === 'critical' ? <AlertTriangle size={13} /> : <Flag size={13} />}
          {f.kind}{f.note ? ` — ${f.note}` : ''}
        </span>
      ))}
    </div>
  );
}
