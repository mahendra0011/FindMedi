import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, CheckCircle, KeyRound, Mail, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: '', color: 'bg-border' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    return { score, label: labels[score], color: colors[score] };
  })();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    setMessage('');
    try {
      await api.forgotPassword({ email });
      setMessage('A fresh reset OTP has been sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
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
          <div className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
            <img src="/logo.png" alt="FindMedi Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">FindMedi</h1>
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
                <div className="flex gap-2">
                  <Input inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" required className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={handleResendOTP} disabled={resendCooldown > 0 || resendLoading} className="shrink-0">
                    <RefreshCw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {resendCooldown > 0 && <p className="text-xs text-muted-foreground mt-1">Resend in {resendCooldown}s</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a new password" required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passwordStrength.score ? passwordStrength.color : 'bg-border'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{passwordStrength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className="pr-10" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Update Password
              </Button>
              <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto">
                <ArrowLeft className="w-4 h-4" /> Back to email
              </button>
            </form>
          )}

          {message && <p className="mt-4 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          {step === 'done' ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground text-center">Your password has been reset successfully. Sign in with your new password.</p>
              <Button onClick={() => navigate('/login')} className="w-full gap-2" size="lg">
                <Activity className="w-4 h-4" /> Sign In Now
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-6">
              <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
