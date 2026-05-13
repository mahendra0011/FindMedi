import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck, MailCheck, TimerReset, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const OTP_LENGTH = 6;
const sanitizeOtp = (value) => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

export default function OTPVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, completeOtpLogin } = useAuth();
  const email = searchParams.get('email') || user?.email || '';
  const deliveryState = searchParams.get('delivery');
  const sentTo = searchParams.get('sentTo') || email;
  const otpInputRef = useRef(null);

  const [otp, setOtp] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryProblem, setDeliveryProblem] = useState(deliveryState === 'failed');
  const [notice, setNotice] = useState(deliveryState === 'failed'
    ? 'We could not confirm that the verification email was sent. Please resend the code.'
    : 'Enter the 6-digit code sent to your email.');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const handleOtpChange = (value) => {
    setOtp(sanitizeOtp(value));
    if (error) setError('');
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = sanitizeOtp(e.clipboardData.getData('text'));
    if (!pastedData) return;

    setOtp(pastedData);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP');
      otpInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      // Verify OTP on backend
      const data = await api.verifyOTP({ email, otp });
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
    <div data-motion-ignore className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted)/0.78)_48%,hsl(var(--accent)/0.7)_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(hsl(var(--foreground)/0.18)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="absolute left-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground sm:left-6 sm:top-6"
        aria-label="Back to sign in"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[440px]"
      >
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-2xl shadow-primary/15 backdrop-blur-xl">
          <div className="h-1.5 bg-gradient-to-r from-primary via-info to-success" />
          <div className="relative overflow-hidden border-b border-border/60 bg-muted/30 px-6 py-6 text-center">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="relative font-heading text-xl font-bold text-foreground">MediCore Verification</p>
            <p className="relative mt-1 text-xs font-medium uppercase tracking-[0.28em] text-primary">Secure email OTP</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-3xl font-bold text-foreground">Enter OTP</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{sentTo}</span>.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  <MailCheck className="h-3.5 w-3.5 text-primary" />
                  Email sent
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  <TimerReset className="h-3.5 w-3.5 text-primary" />
                  10 min
                </span>
              </div>
            </div>

            {(notice || deliveryProblem) && !error && (
              <div className={`mb-5 flex gap-3 rounded-2xl border px-4 py-3 text-sm ${
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
                <label htmlFor="otp-code" className="sr-only">
                  Enter 6-digit OTP
                </label>
                <div
                  className="relative"
                  onClick={() => otpInputRef.current?.focus()}
                >
                  <input
                    ref={otpInputRef}
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={OTP_LENGTH}
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    onPaste={handlePaste}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    className="absolute inset-0 z-10 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent outline-none"
                    aria-describedby="otp-help"
                    aria-label="Enter 6-digit verification code"
                    autoFocus
                  />
                  <div className="grid grid-cols-6 gap-2.5">
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                      const digit = otp[index] || '';
                      const activeSlot = Math.min(otp.length, OTP_LENGTH - 1);
                      const isActive = isOtpFocused && index === activeSlot && otp.length < OTP_LENGTH;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * index }}
                          className={`pointer-events-none flex aspect-square min-h-12 items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all sm:min-h-14 sm:text-2xl ${
                            digit
                              ? 'border-primary/60 bg-gradient-to-br from-primary/15 to-info/10 text-foreground shadow-lg shadow-primary/10'
                              : isActive
                                ? 'border-primary bg-background text-foreground ring-4 ring-primary/15'
                                : 'border-border bg-background/70 text-muted-foreground'
                          }`}
                        >
                          {digit || (isActive ? <span className="h-7 w-0.5 animate-pulse rounded-full bg-primary" /> : '')}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                <p id="otp-help" className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                  Type or paste the OTP in the six boxes.
                </p>
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
                className="h-12 w-full gap-2 rounded-xl shadow-lg shadow-primary/20"
                size="lg"
                disabled={loading || otp.length !== OTP_LENGTH}
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

            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/25 p-4 text-center">
              <p className="text-xs text-muted-foreground">Didn&apos;t receive the OTP?</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || resendLoading}
                className="mt-3 gap-2 rounded-full px-4"
              >
                <RefreshCw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
