import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

/**
 * Doc 11 P0 — command palette (Ctrl+K): global patient search by
 * UHID/name/phone/ABHA + quick actions. Doctor/admin roles only render it
 * (mounted conditionally by the caller).
 */
const ACTIONS = [
  { label: 'New prescription', to: '/doctor/prescriptions' },
  { label: 'Results inbox', to: '/doctor/results' },
  { label: 'My OPD queue', to: '/doctor/queue' },
  { label: 'Referrals', to: '/doctor/referrals' },
  { label: 'OT board', to: '/ot/board' },
  { label: 'IPD / ward rounds', to: '/ipd' },
  { label: 'Hospital overview', to: '/dashboard/v2' },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setPatients([]); return; }
    const t = setTimeout(async () => {
      try {
        const r: any = await (api as any).getPatients({ search: q.trim(), limit: 6 });
        setPatients(r?.data || r?.patients || []);
      } catch { setPatients([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  const go = async (p: any) => {
    try {
      const e: any = await (api as any).getLatestEncounter(p._id || p.id);
      if (e?.id) { navigate(`/doctor/workspace/${e.id}`); }
    } catch { /* patient without encounters: stay */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg h-fit bg-card rounded-2xl border shadow-xl p-3" onClick={(e) => e.stopPropagation()}>
        <Input autoFocus placeholder="Search patient (UHID / name / phone) or action…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-2 max-h-80 overflow-auto">
          {patients.map((p: any) => (
            <button key={p._id || p.id} onClick={() => go(p)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground"> · {p.uhid || p.phone || ''}</span>
            </button>
          ))}
          {ACTIONS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())).map((a) => (
            <button key={a.to} onClick={() => { navigate(a.to); setOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm text-primary">
              → {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
