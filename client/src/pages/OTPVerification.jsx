import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_82%_78%,hsl(var(--info)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]" />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="absolute left-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:left-6 sm:top-6"
        aria-label="Back to sign in"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl shadow-primary/10">
          <div className="border-b border-border/60 bg-muted/30 px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="font-heading text-lg font-bold text-foreground">MediCore Verification</p>
            <p className="mt-1 text-xs text-muted-foreground">Secure OTP check</p>
          </div>

          <div className="p-6 sm:p-7">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-2xl font-bold text-foreground">Enter OTP</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{sentTo}</span>.
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
                  <div className="grid grid-cols-6 gap-2">
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
                          className={`pointer-events-none flex aspect-square min-h-12 items-center justify-center rounded-xl border-2 bg-muted/40 text-xl font-bold transition-all sm:min-h-14 sm:text-2xl ${
                            digit
                              ? 'border-primary/60 bg-primary/10 text-foreground shadow-sm shadow-primary/10'
                              : isActive
                                ? 'border-primary bg-background ring-4 ring-primary/15'
                                : 'border-border text-muted-foreground'
                          }`}
                        >
                          {digit || (isActive ? <span className="h-7 w-0.5 animate-pulse rounded-full bg-primary" /> : '')}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                <p id="otp-help" className="mt-3 text-center text-xs text-muted-foreground">
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
                className="h-12 w-full gap-2"
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

            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-xs text-muted-foreground">Didn&apos;t receive the OTP?</p>
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
        </div>
      </motion.div>
    </div>
  );
}
