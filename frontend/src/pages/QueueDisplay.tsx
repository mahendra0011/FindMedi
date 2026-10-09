import { useEffect, useRef, useState } from 'react';
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
  const [muted, setMuted] = useState(false);
  const [stale, setStale] = useState(false);
  const lastSpoken = useRef('');

  const speak = (text: string) => {
    if (muted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      setTimeout(() => { if (!muted) window.speechSynthesis.speak(u); }, 5000);
    } catch { /* voice unavailable — chime-only fallback */ }
  };

  useEffect(() => {
    let cancelled = false;
    let fails = 0;
    const load = async () => {
      try {
        const res: any = await (api as any).getQueueDisplay({
          ...(department ? { department } : {}),
          ...(doctorId ? { doctorId } : {}),
        });
        if (cancelled) return;
        fails = 0;
        setStale(false);
        const next = res?.tokens || [];
        const now = next.filter((t: any) => t.status === 'Called' || t.status === 'In Consultation');
        const key = now.map((t: any) => t.tokenNumber).join(',');
        if (key && key !== lastSpoken.current) {
          lastSpoken.current = key;
          const first = now[0];
          speak(`Token ${first.tokenNumber}, please proceed to ${first.roomNumber ? `Room ${first.roomNumber}` : (department || 'the counter')}`);
        }
        setTokens(next);
      } catch {
        fails += 1;
        if (fails >= 3) setStale(true);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, [department, doctorId, muted]);

  const nowServing = tokens.filter((t) => t.status === 'Called' || t.status === 'In Consultation');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6" data-motion-ignore>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold mr-auto">Now Serving{department ? ` — ${department}` : ''}</h1>
          {stale && <span className="text-amber-400 text-sm">Reconnecting…</span>}
          <button onClick={() => setMuted(!muted)} className="text-sm text-slate-300 underline">{muted ? 'Unmute' : 'Mute'}</button>
        </div>
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
