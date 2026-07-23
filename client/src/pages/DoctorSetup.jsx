import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function DoctorSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState('loading'); // loading | setup | otp | done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing setup link. Please contact your administrator.');
      setStep('setup');
      return;
    }
    // Decode token to get email
    try {
      const base64 = token.split('.')[1];
      const payload = JSON.parse(atob(base64));
      if (payload.type !== 'doctor_setup') {
        setError('Invalid setup token.');
        setStep('setup');
        return;
      }
      setEmail(payload.email);
      setStep('setup');
    } catch {
      setError('Invalid setup link. Please contact your administrator.');
      setStep('setup');
    }
  }, [token]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Set password via API
      await api.setDoctorPassword({ token, password });
      // Send OTP for verification
      await api.resendOTP({ email });
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.verifyOTP({ email, otp });
      setStep('done');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    try {
      await api.resendOTP({ email });
      setError('');
      toast.success('OTP resent to your email');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Doctor Account Setup</h1>
          <p className="text-muted-foreground mt-1">Complete your account setup to get started</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          {step === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {step === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Create Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? 'Setting up...' : 'Set Password & Continue'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Password set successfully! Please verify your email.</p>
                <p className="text-xs text-muted-foreground mt-1">OTP sent to: <span className="font-medium text-foreground">{email}</span></p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Enter OTP</label>
                <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} required />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? 'Verifying...' : 'Verify & Login'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
              <button type="button" onClick={handleResendOTP} className="w-full text-sm text-primary hover:underline text-center" disabled={loading}>
                Resend OTP
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">Account Ready!</h2>
              <p className="text-muted-foreground mb-6">Your doctor account is set up. You can now log in.</p>
              <Button className="w-full gap-2" size="lg" onClick={() => navigate('/login')}>
                Go to Login <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}// 31
