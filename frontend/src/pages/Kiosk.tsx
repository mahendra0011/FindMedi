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
  const [step, setStep] = useState<'home' | 'checkin' | 'register' | 'pay' | 'collect' | 'token' | 'done'>(hospitalId ? 'home' : 'home');
  const [needsSetup, setNeedsSetup] = useState(!hospitalId);
  const [form, setForm] = useState({ name: '', phone: '', department: 'General' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [idle, setIdle] = useState(IDLE_SECS);
  const timer = useRef<number | null>(null);
  // File 22 P1-25: extra modes share the idle reset + kiosk fetch helper.
  const [payForm, setPayForm] = useState({ invoiceId: '', phone: '' });
  const [collectForm, setCollectForm] = useState({ phone: '', dob: '' });
  const [reports, setReports] = useState<any[]>([]);
  const [tokenForm, setTokenForm] = useState({ token: '', department: 'General' });
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const reset = () => {
    setStep('home');
    setForm({ name: '', phone: '', department: 'General' });
    setPayForm({ invoiceId: '', phone: '' });
    setCollectForm({ phone: '', dob: '' });
    setReports([]);
    setTokenForm({ token: '', department: 'General' });
    setTokenInfo(null);
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

  const kioskPost = async (path: string, payload: any) => {
    const res = await fetch(`/api/kiosk/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId, ...payload }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.code === 'DUPLICATE_ROUTE_RECEPTION' ? 'Possible existing record — please see reception.' : (body.message || 'Failed'));
    return body;
  };

  const doRegister = async () => {
    setError('');
    try {
      const body = await kioskPost('register', { name: form.name, phone: form.phone });
      setResult({ registeredId: body.id });
      setStep('done');
    } catch (e: any) { setError(e.message); }
  };

  const doPay = async () => {
    setError('');
    try {
      const body = await kioskPost('pay', { ...payForm, gateway: 'mock' });
      setResult({ payOrder: body.gatewayOrderId, payAmount: body.amount, paySession: body.sessionId });
      setStep('done');
    } catch (e: any) { setError(e.message); }
  };

  const doCollect = async () => {
    setError('');
    try {
      const body = await kioskPost('report-collect', collectForm);
      setReports(body.ready || []);
    } catch (e: any) { setError(e.message); }
  };

  const doTokenStatus = async () => {
    setError('');
    try {
      const q = new URLSearchParams({ hospitalId, token: tokenForm.token, department: tokenForm.department });
      const res = await fetch(`/api/kiosk/token-status?${q}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Not found');
      setTokenInfo(body);
    } catch (e: any) { setError(e.message); }
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
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 text-xl" onClick={() => setStep('register')}>Register</Button>
              <Button variant="outline" className="h-20 text-xl" onClick={() => setStep('pay')}>Pay bill</Button>
              <Button variant="outline" className="h-20 text-xl" onClick={() => setStep('collect')}>Reports</Button>
              <Button variant="outline" className="h-20 text-xl" onClick={() => setStep('token')}>My token</Button>
            </div>
            <Link to="/display/queue"><Button variant="outline" className="h-24 text-2xl w-full">Token Display</Button></Link>
            <Button variant="ghost" className="text-slate-400" onClick={() => { localStorage.removeItem('kiosk_hospital'); setNeedsSetup(true); }}>Staff: re-setup</Button>
          </div>
        ) : step === 'register' ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">New registration (provisional)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Mobile number" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {error && <p className="text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="h-14 flex-1 text-lg" onClick={reset}>Back</Button>
                <Button className="h-14 flex-1 text-lg" onClick={doRegister} disabled={!form.name || !form.phone}>Register</Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 'pay' ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">Pay bill</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Invoice ID" value={payForm.invoiceId} onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Mobile number (on bill)" inputMode="numeric" value={payForm.phone} onChange={(e) => setPayForm({ ...payForm, phone: e.target.value })} />
              {error && <p className="text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="h-14 flex-1 text-lg" onClick={reset}>Back</Button>
                <Button className="h-14 flex-1 text-lg" onClick={doPay} disabled={!payForm.invoiceId || !payForm.phone}>Pay</Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 'collect' ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">Collect reports</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Mobile number" inputMode="numeric" value={collectForm.phone} onChange={(e) => setCollectForm({ ...collectForm, phone: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="DOB (YYYY-MM-DD)" value={collectForm.dob} onChange={(e) => setCollectForm({ ...collectForm, dob: e.target.value })} />
              {error && <p className="text-red-400">{error}</p>}
              <Button className="h-14 w-full text-lg" onClick={doCollect} disabled={!collectForm.phone || !collectForm.dob}>Find my reports</Button>
              {reports.map((r: any, i: number) => (
                <a key={i} href={r.reportUrl} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-700 p-3 text-emerald-300">
                  {r.orderId} — open report
                </a>
              ))}
              <Button variant="outline" className="h-14 w-full text-lg" onClick={reset}>Back</Button>
            </CardContent>
          </Card>
        ) : step === 'token' ? (
          <Card className="mt-6 bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">My token</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Token number" value={tokenForm.token} onChange={(e) => setTokenForm({ ...tokenForm, token: e.target.value })} />
              <Input className="h-14 text-lg bg-slate-800 border-slate-700 text-white" placeholder="Department" value={tokenForm.department} onChange={(e) => setTokenForm({ ...tokenForm, department: e.target.value })} />
              {error && <p className="text-red-400">{error}</p>}
              {tokenInfo ? (
                <div className="rounded-lg border border-slate-700 p-4 text-center">
                  <p className="text-4xl font-black text-emerald-400">{tokenInfo.tokenNumber}</p>
                  <p className="text-slate-300">{tokenInfo.status} · {tokenInfo.ahead} ahead · ~{tokenInfo.estimatedWaitTime} min</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" className="h-14 flex-1 text-lg" onClick={reset}>Back</Button>
                <Button className="h-14 flex-1 text-lg" onClick={doTokenStatus} disabled={!tokenForm.token}>Check</Button>
              </div>
            </CardContent>
          </Card>
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
              {result?.tokenNumber ? (
                <>
                  <p className="text-6xl font-black text-emerald-400">{result.tokenNumber}</p>
                  <p className="text-slate-300">Position {result?.queuePosition} · ~{result?.estimatedWaitTime} min</p>
                  {result?.unifiedDisplay && <p className="text-slate-400 text-sm">Unified: {result.unifiedDisplay}</p>}
                </>
              ) : null}
              {result?.registeredId ? (
                <p className="text-slate-300">Registered (provisional).<br />Please complete KYC at reception.</p>
              ) : null}
              {result?.payOrder ? (
                <>
                  <p className="text-4xl font-black text-emerald-400">₹{Number(result.payAmount).toLocaleString('en-IN')}</p>
                  <p className="text-slate-300 break-all">Order {result.payOrder}</p>
                  {result?.paySession ? <p className="text-slate-400 text-sm break-all">Session: {result.paySession}</p> : <p className="text-slate-400 text-sm">Show this order ID at the counter to pay.</p>}
                </>
              ) : null}
              <Button className="h-14 w-full text-lg mt-4" onClick={reset}>Done</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
