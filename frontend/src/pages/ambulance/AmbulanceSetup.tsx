import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ambulance as AmbulanceIcon, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { userFacingError } from '@/lib/errorCopy';

export default function AmbulanceSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // FE-B-06: the invite carries an OPAQUE single-use `code`, not a JWT.
  const code = searchParams.get('code');

  const [step, setStep] = useState('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // FE-B-06: remove the code from the URL as soon as it is read.
  //
  // It stays in `location.hash` / history for the lifetime of the tab otherwise,
  // so it ends up in browser history, in any "copy link" the user makes, and in
  // a Referer header if the page ever loads a third-party resource. The SPA has
  // already captured it in `code` by this point, so replacing the entry is free.
  useEffect(() => {
    if (!code) {
      setError('This setup link is missing its code. Ask your hospital admin for a new invite.');
      setStep('error');
      return;
    }

    try {
      const clean = window.location.pathname + window.location.search;
      window.history.replaceState(null, document.title, clean);
    } catch {
      // history API unavailable — the code is already captured in memory.
    }

    // NOTE: there is deliberately no client-side JWT decode any more. The old page
    // did `JSON.parse(atob(token.split('.')[1]))` to prefill the email, which made
    // the setup credential a self-describing bearer token: anyone who saw the URL
    // (a shared screenshot, a proxy log, a Referer header) could decode the account
    // email without redeeming anything. The opaque code carries no claims, so there
    // is nothing to decode — and the email was never needed here.
    setStep('setup');
  }, [code]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/ambulance-setup', { code, password });
      setStep('done');
    } catch (err: any) {
      // FE-B-05: never render a raw backend message.
      setError(userFacingError(err));
      // An invalid/used/expired code cannot succeed on a retry — move to a terminal
      // state so the driver is not invited to keep trying.
      if (err?.response?.status === 400) {
        setStep('error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="bg-card rounded-2xl border border-border p-8 space-y-4">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">This link can no longer be used</h2>
            <p className="text-sm text-muted-foreground">
              {error || 'Setup links are valid for 15 minutes and work only once.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
              Go to login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4">
            <AmbulanceIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Ambulance Account Setup</h1>
          <p className="text-muted-foreground mt-1">Password set karein, phir login karein</p>
          {/* FE-B-06: state the one-time / short-lived nature up front. A driver who
              knows the link dies in 15 minutes will not forward it to someone else. */}
          <p className="text-xs text-muted-foreground mt-2">
            This link works once and expires after 15 minutes.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          {step === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Create Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? 'Setting up...' : 'Set Password & Continue'} {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          )}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Account Ready!</h2>
              <Button className="w-full gap-2" size="lg" onClick={() => navigate('/login')}>Go to Login <ArrowRight className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
