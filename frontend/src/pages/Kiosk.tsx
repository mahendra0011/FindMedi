import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * File 15 §15.3 — self-service kiosk (touch, isolated bundle via route).
 * Check-in (minimal fields → provisional record + token) and queue display
 * link. Idle 60s auto-reset with countdown; nothing PHI persists on device
 * beyond the current screen (state cleared on reset).
 */
const IDLE_SECS = 60;

export default function Kiosk() {
  const [hospitalId, setHospitalId] = useState(() => localStorage.getItem('kiosk_hospital') || '');
  const [step, setStep] = useState<'home' | 'checkin' | 'done'>(hospitalId ? 'home' : 'home');
  const [needsSetup, setNeedsSetup] = useState(!hospitalId);
  const [form, setForm] = useState({ name: '', phone: '', department: 'General' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [idle, setIdle] = useState(IDLE_SECS);
  const timer = useRef<number | null>(null);

  const reset = () => {
    setStep('home');
    setForm({ name: '', phone: '', department: 'General' });
    setResult(null);
    setError('');
    setIdle(IDLE_SECS);
  };

  useEffect(() => {
    const poke = () => setIdle(IDLE_SECS);
    window.addEventListener('pointerdown', poke);
    window.addEventListener('keydown', poke);
    timer.current = window.setInterval(() => {
      setIdle((s) => {
        if (s <= 1) { reset(); return IDLE_SECS; }
        return s - 1;
      });
    }, 1000);
    return () => {
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const saveSetup = () => {
    localStorage.setItem('kiosk_hospital', hospitalId);
    setNeedsSetup(false);
    reset();
  };

  const checkin = async () => {
    setError('');
    try {
      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, ...form }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.code === 'DUPLICATE_ROUTE_RECEPTION' ? 'Record mil sakta hai — please see reception.' : (body.message || 'Failed'));
        return;
      }
      setResult(body);
      setStep('done');
    } catch {
      setError('Network error — please see reception.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 select-none" data-motion-ignore>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>FindMedi Kiosk</span>
          <span>Auto-reset in {idle}s</span>
        </div>

        {needsSetup ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">Staff setup (one time)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Hospital ID" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} />
              <Button className="h-14 w-full text-lg" onClick={saveSetup} disabled={!hospitalId}>Save on this device</Button>
            </CardContent>
          </Card>
        ) : step === 'home' ? (
          <div className="grid gap-4 mt-8">
            <Button className="h-24 text-2xl" onClick={() => setStep('checkin')}>Check-in<br /></Button>
            <Link to="/display/queue"><Button variant="outline" className="h-24 text-2xl w-full">Token Display</Button></Link>
            <Button variant="ghost" className="text-slate-400" onClick={() => { localStorage.removeItem('kiosk_hospital'); setNeedsSetup(true); }}>Staff: re-setup</Button>
          </div>
        ) : step === 'checkin' ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">Check-in</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Mobile number" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              {error && <p className="text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="h-14 flex-1 text-lg" onClick={reset}>Back</Button>
                <Button className="h-14 flex-1 text-lg" onClick={checkin} disabled={!form.name || !form.phone}>Get token</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6 bg-slate-900 border-slate-700 text-center">
            <CardContent className="p-8 space-y-2">
              <p className="text-6xl font-black text-emerald-400">{result?.tokenNumber}</p>
              <p className="text-slate-300">Position {result?.queuePosition} · ~{result?.estimatedWaitTime} min</p>
              {result?.unifiedDisplay && <p className="text-slate-400 text-sm">Unified: {result.unifiedDisplay}</p>}
              <Button className="h-14 w-full text-lg mt-4" onClick={reset}>Done</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
