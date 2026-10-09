import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

/**
 * File 09 §9.4 — queue display screen (TV mode). Public, no login, no PHI:
 * token numbers + status only (`GET /tokens/display`). Auto-refresh 10s.
 */
export default function QueueDisplay() {
  const [params] = useSearchParams();
  const department = params.get('department') || '';
  const doctorId = params.get('doctorId') || '';
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res: any = await (api as any).getQueueDisplay({
          ...(department ? { department } : {}),
          ...(doctorId ? { doctorId } : {}),
        });
        if (!cancelled) setTokens(res?.tokens || []);
      } catch { /* keep last frame on failure */ }
    };
    load();
    const t = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, [department, doctorId]);

  const nowServing = tokens.filter((t) => t.status === 'Called' || t.status === 'In Consultation');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">Now Serving{department ? ` — ${department}` : ''}</h1>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {nowServing.slice(0, 3).map((t) => (
            <div key={t._id || t.tokenNumber} className="rounded-2xl bg-emerald-600 p-6 text-center">
              <p className="text-5xl font-black tracking-tight">{t.tokenNumber}</p>
              <p className="mt-1 text-sm opacity-90">{t.status}{t.roomNumber ? ` · Room ${t.roomNumber}` : ''}</p>
            </div>
          ))}
          {nowServing.length === 0 && (
            <p className="text-slate-400">No token in service right now.</p>
          )}
        </div>
        <h2 className="text-xl font-bold mt-8 mb-3">Waiting ({tokens.length})</h2>
        <div className="flex flex-wrap gap-2">
          {tokens.filter((t) => t.status === 'Waiting').slice(0, 20).map((t) => (
            <span key={t._id || t.tokenNumber} className="rounded-lg bg-slate-800 px-4 py-2 text-lg font-bold">
              {t.tokenNumber}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
