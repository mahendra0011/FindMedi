import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ambulance as AmbulanceIcon, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function AmbulanceSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid link.'); setStep('setup'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.type !== 'ambulance_setup') { setError('Invalid setup token.'); setStep('setup'); return; }
      setEmail(payload.email);
      setStep('setup');
    } catch { setError('Invalid setup link.'); setStep('setup'); }
  }, [token]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/ambulance-setup', { token, password });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Setup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4">
            <AmbulanceIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Ambulance Account Setup</h1>
          <p className="text-muted-foreground mt-1">Password set karein, phir login karein</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          {step === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input value={email} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Create Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
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
