import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, ArrowRight, RefreshCw, CheckCircle, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function OTPVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, completeOtpLogin } = useAuth();
  const email = searchParams.get('email') || user?.email || '';
  const deliveryState = searchParams.get('delivery');
  const sentTo = searchParams.get('sentTo') || email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryProblem, setDeliveryProblem] = useState(deliveryState === 'failed');
  const [notice, setNotice] = useState(deliveryState === 'failed'
    ? 'We could not confirm that the verification email was sent. Please resend the code.'
    : 'Enter the 6-digit code sent to your email.');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpValue = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // If already logged in and verified, redirect
  if (user?.isVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      if (!digits) return;
      const nextOtp = Array.from({ length: 6 }, (_, i) => digits[i] || '');
      setOtp(nextOtp);
      const focusIndex = Math.min(digits.length, 5);
      document.getElementById(`otp-${focusIndex}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    setOtp(Array.from({ length: 6 }, (_, i) => pastedData[i] || ''));
    document.getElementById(`otp-${Math.min(pastedData.length, 5)}`)?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      // Verify OTP on backend
      const data = await api.verifyOTP({ email, otp: otpValue });
      if (data?.approvalPending) {
        localStorage.removeItem('temp_password');
        localStorage.removeItem('temp_role');
        navigate(`/pending-approval?email=${encodeURIComponent(email)}&status=pending`);
        return;
      }

      if (data?.token && data?.user) {
        completeOtpLogin({ token: data.token, user: data.user });
      }

      // Clean up temp login data from previous flow
      localStorage.removeItem('temp_password');
      localStorage.removeItem('temp_role');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await api.resendOTP({ email });
      setDeliveryProblem(false);
      setNotice(data?.simulated
        ? 'Email simulation is enabled on this server. Configure Brevo to send real emails.'
        : `A fresh verification code was sent to ${data?.sentTo || email}.`);
      setResendCooldown(60);
    } catch (err) {
      setDeliveryProblem(true);
      if (err.waitSeconds) setResendCooldown(err.waitSeconds);
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_80%_30%,hsl(var(--info)/0.10),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-5xl"
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        <div className="grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--sidebar-primary)),transparent_34%),radial-gradient(circle_at_80%_80%,hsl(var(--info)),transparent_28%)]" />
            <div className="relative">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-xl font-bold">MediCore</p>
                  <p className="text-xs text-sidebar-foreground/60">Secure email verification</p>
                </div>
              </div>
              <h1 className="font-heading text-3xl font-bold leading-tight">
                One quick check before opening your dashboard.
              </h1>
              <p className="mt-4 text-sm leading-6 text-sidebar-foreground/70">
                Your account is created. Verify your email address to activate protected MediCore access.
              </p>
            </div>

            <div className="relative grid gap-3 text-sm">
              <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4">
                <Mail className="h-5 w-5 text-sidebar-primary" />
                <div>
                  <p className="font-medium">Code destination</p>
                  <p className="text-xs text-sidebar-foreground/60">{sentTo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4">
                <Clock className="h-5 w-5 text-sidebar-primary" />
                <div>
                  <p className="font-medium">Code expires in 10 minutes</p>
                  <p className="text-xs text-sidebar-foreground/60">Use the newest OTP after every resend.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 lg:mx-0">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Verify your email</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter the 6-digit OTP sent to <span className="font-semibold text-foreground">{email}</span>.
              </p>
            </div>

            {(notice || deliveryProblem) && !error && (
              <div className={`mb-5 flex gap-3 rounded-2xl border p-4 text-sm ${
                deliveryProblem
                  ? 'border-warning/25 bg-warning/10 text-warning'
                  : 'border-primary/20 bg-primary/10 text-primary'
              }`}>
                {deliveryProblem ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                <p>{notice}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">Verification code</label>
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <Input
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="h-14 w-full rounded-xl border-2 bg-muted/40 text-center text-xl font-bold tracking-wider focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-16 sm:text-2xl"
                        autoFocus={index === 0}
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                className="h-12 w-full gap-2"
                size="lg"
                disabled={loading || otpValue.length !== 6}
              >
                {loading ? (
                  <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {loading ? 'Verifying...' : 'Verify Email'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Didn&apos;t receive the email?</p>
                  <p className="text-xs text-muted-foreground">Check spam, promotions, or request a fresh code.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || resendLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              Still no email? Confirm that your email address is correct and ask the admin to verify Brevo sender configuration.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Shield className="h-4 w-4" />
          <span>Secure verification for MediCore accounts</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
