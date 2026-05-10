import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await api.forgotPassword({ email });
      setMessage(data.message || 'Password reset OTP sent to your email.');
      setStep('reset');
    } catch (err) {
      setError(err.message || 'Unable to send password reset OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (otp.length !== 6) {
      setError('Enter the 6-digit reset OTP');
      return;
    }
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
      const data = await api.resetPassword({ email, otp, password });
      setMessage(data.message || 'Password updated successfully.');
      setStep('done');
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">MediCore HMS</h1>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            {step === 'done' ? <CheckCircle className="w-7 h-7 text-success" /> : <KeyRound className="w-7 h-7 text-primary" />}
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
            {step === 'done' ? 'Password Updated' : 'Forgot Password'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 'email'
              ? 'Enter your account email to receive a reset OTP.'
              : step === 'reset'
                ? 'Enter the OTP from your email and choose a new password.'
                : 'Your new password is ready to use.'}
          </p>

          {step === 'email' && (
            <form onSubmit={requestReset} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Reset OTP
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Reset OTP</label>
                <Input inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a new password" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Update Password
              </Button>
            </form>
          )}

          {message && <p className="mt-4 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          <p className="text-sm text-muted-foreground text-center mt-6">
            <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
