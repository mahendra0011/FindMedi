import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, Shield, Eye, EyeOff, CheckCircle2, User, Phone, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { setAuthTokens } from '@/lib/axios';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, completeGoogleLogin } = useAuth();

  const [isGoogle, setIsGoogle] = useState(false);
  const [googleAvatar, setGoogleAvatar] = useState('');
  const [role, setRole] = useState('patient');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Load Google data from location state or localStorage
  useEffect(() => {
    const stateData = location.state;
    const stored = localStorage.getItem('google_signup');
    let data = stateData;

    if (!data && stored) {
      try {
        data = JSON.parse(stored);
      } catch { /* empty */ }
    }

    if (data && data.isGoogle) {
      setIsGoogle(true);
      if (data.name) setName(data.name);
      if (data.email) setEmail(data.email);
      if (data.avatar) setGoogleAvatar(data.avatar);
      if (data.role) setRole(data.role);
    }
  }, [location.state]);

  if (user) return <Navigate to="/dashboard" replace />;

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Handle Google Account selection
  const handleGoogleCredential = async (idToken, accessToken) => {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await api.googleAuth({ idToken, accessToken, role: 'patient' });
      if (data.exists && data.token && data.user) {
        setAuthTokens(data.token, data.refreshToken);
        completeGoogleLogin(data.user);
        navigate('/dashboard');
        return;
      }

      // New Google User -> Set Google mode and pre-fill details for Step 2
      const g = data.googleUser || {};
      setIsGoogle(true);
      setName(g.name || '');
      setEmail(g.email || '');
      setGoogleAvatar(g.picture || '');
      setRole('patient');

      const signupData = {
        role: 'patient',
        name: g.name || '',
        email: g.email || '',
        avatar: g.picture || '',
        isGoogle: true,
      };
      localStorage.setItem('google_signup', JSON.stringify(signupData));
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Contact the administrator.');
      return;
    }

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: (tokenResponse) => {
            if (tokenResponse?.access_token) {
              handleGoogleCredential(null, tokenResponse.access_token);
            }
          },
          error_callback: (err) => {
            console.error('Google OAuth error:', err);
            setError('Google sign-in was cancelled.');
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('initTokenClient fallback:', oauthErr);
      }
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleCredential(response.credential),
      });
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In script is loading. Please try again in a moment.');
    }
  };

  const handleResetGoogle = () => {
    setIsGoogle(false);
    setGoogleAvatar('');
    localStorage.removeItem('google_signup');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.trim().length < 7) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!gender || !dateOfBirth) {
      setError('Gender and date of birth are required');
      return;
    }

    setLoading(true);

    try {
      // Step 2 for Google Users: Direct account completion without password
      if (isGoogle) {
        const data = await api.googleRegister({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          gender,
          dateOfBirth,
          role: 'patient',
          avatar: googleAvatar,
        });

        localStorage.removeItem('google_signup');

        if (data.token && data.user) {
          setAuthTokens(data.token, data.refreshToken);
          completeGoogleLogin(data.user);
          navigate('/dashboard');
          return;
        }
      } else {
        // Standard Registration with Password
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }

        const data = await api.register({
          name,
          email,
          password,
          role: 'patient',
          phone,
          gender,
          dateOfBirth,
        });

        const params = new URLSearchParams({ email, role: 'patient' });
        if (data?.emailDeliveryFailed || data?.otpWarning) params.set('delivery', 'failed');
        if (data?.sentTo) params.set('sentTo', data.sentTo);
        navigate(`/verify-otp?${params.toString()}`);
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(174,62%,48%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(210,80%,55%) 0%, transparent 50%)' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-sidebar-primary flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-sidebar-primary/30">
            <Activity className="w-10 h-10 text-sidebar-primary-foreground" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-sidebar-primary-foreground mb-4">Join FindMedi</h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed mb-10">
            Fast, secure, and hassle-free healthcare platform. Manage appointments, digital records, and consultations in one place.
          </p>
          <div className="flex items-center justify-center gap-6 text-sidebar-foreground/60 text-sm">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Sign-in</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Google Verified</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Secure</span>
          </div>
        </motion.div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">FindMedi</h1>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {isGoogle ? 'Complete Your Profile' : 'Create Account'}
              </h2>
              {isGoogle && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Step 2 of 2
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isGoogle
                ? 'Google details fetched. Fill in your details below to finish setup.'
                : 'Fill in your details or continue with Google to get started.'}
            </p>
          </div>

          {/* Google Connected Banner (When in Google Mode) */}
          <AnimatePresence>
            {isGoogle && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {googleAvatar ? (
                    <img src={googleAvatar} alt="Google Avatar" className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                      G
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                      {name || 'Google User'}
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-medium">Verified</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGoogleLogin}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground shrink-0"
                  title="Switch Google Account"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Switch
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Continue with Google Button (When in Normal Mode) */}
          {!isGoogle && (
            <div className="mb-5">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 h-11 border-border/80 hover:bg-muted/60 font-medium"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or register manually</span></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="h-10"
              />
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground block">Email Address</label>
                {isGoogle && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Switch Email
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={isGoogle ? undefined : (e) => setEmail(e.target.value)}
                  readOnly={isGoogle}
                  disabled={isGoogle}
                  placeholder="Enter your email"
                  required
                  className={`h-10 ${
                    isGoogle
                      ? 'bg-muted/70 text-foreground/90 font-medium pr-28 cursor-not-allowed border-emerald-500/30 select-none'
                      : ''
                  }`}
                />
                {isGoogle && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full pointer-events-none border border-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Google Verified
                  </div>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Phone Number</label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                required
                className="h-10"
              />
            </div>

            {/* Gender & Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Date of Birth</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
            </div>

            {/* Password Fields — ONLY shown in manual mode, HIDDEN in Google mode */}
            {!isGoogle && (
              <>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      className="pr-10 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passwordStrength.score ? passwordStrength.color : 'bg-border'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{passwordStrength.label}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className="pr-10 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Terms of Service */}
            <label className="flex items-start gap-2.5 p-2.5 bg-muted/30 rounded-xl border border-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
              />
              <div className="text-xs font-medium text-foreground leading-snug">
                I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </div>
            </label>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

            <Button type="submit" className="w-full gap-2 h-11" size="lg" disabled={loading || !agreed}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading
                ? isGoogle ? 'Setting up Account...' : 'Creating Account...'
                : isGoogle ? 'Complete Registration & Go to Dashboard 🚀' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
            </span>
            {isGoogle && (
              <button
                type="button"
                onClick={handleResetGoogle}
                className="text-muted-foreground hover:text-destructive hover:underline"
              >
                Use regular email signup
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
