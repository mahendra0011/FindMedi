import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Shield, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const roles = [
  { key: 'superadmin', label: 'SuperAdmin', desc: 'Platform management',         icon: Shield,      color: 'text-purple-600',  bg: 'bg-purple-500/10'  },
  { key: 'admin',   label: 'Admin',   desc: 'Full system access',              icon: Shield,      color: 'text-primary',     bg: 'bg-primary/10'     },
  { key: 'doctor',  label: 'Doctor',  desc: 'Patient & schedule management',   icon: Stethoscope, color: 'text-info',         bg: 'bg-info/10'        },
  { key: 'patient', label: 'Patient', desc: 'Book appointments & records',      icon: UserRound,   color: 'text-success',      bg: 'bg-success/10'     },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const pickRole = (r) => {
    setRole(r);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const googleUser = prompt('Paste Google ID token here (demo mode):');
      if (!googleUser) return;
      const data = await api.googleAuth({ idToken: googleUser });
      const g = data.googleUser || {};
      const mergedRole = role;
      const signupData = {
        role: mergedRole,
        name: g.name || email || '',
        email: g.email || email || '',
        isGoogle: true,
      };
      localStorage.setItem('google_signup', JSON.stringify(signupData));
      navigate('/signup', { state: signupData });
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, role);
      navigate('/dashboard');
    } catch (err) {
      if (err.requiresVerification || err.message?.toLowerCase().includes('verify your email')) {
        // Store credentials for auto-login after OTP verification
        localStorage.setItem('temp_password', password);
        localStorage.setItem('temp_role', role);
        const params = new URLSearchParams({ email });
        if (err.otpError || err.emailDeliveryFailed) params.set('delivery', 'failed');
        navigate(`/verify-otp?${params.toString()}`);
      } else if (err.approvalPending || err.approvalRejected) {
        navigate(`/pending-approval?email=${encodeURIComponent(email)}&status=${err.approvalRejected ? 'rejected' : 'pending'}`);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(174,62%,48%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(210,80%,55%) 0%, transparent 50%)' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-sidebar-primary flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-sidebar-primary/30">
            <Activity className="w-10 h-10 text-sidebar-primary-foreground" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-sidebar-primary-foreground mb-4">MediCore HMS</h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed mb-10">
            Complete hospital management solution. Manage patients, doctors, appointments, and billing — all in one place.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[['1,247', 'Patients'], ['48', 'Doctors'], ['99.9%', 'Uptime']].map(([val, lbl]) => (
              <div key={lbl} className="bg-sidebar-accent/50 rounded-xl p-3">
                <p className="font-heading text-xl font-bold text-sidebar-primary-foreground">{val}</p>
                <p className="text-xs text-sidebar-foreground/60">{lbl}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">MediCore HMS</h1>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Select your role and sign in to continue</p>

          {/* Role Selection */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {roles.map(({ key, label, desc, icon: Icon, color, bg }) => (
              <button key={key} onClick={() => pickRole(key)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${role === key ? 'border-primary bg-accent shadow-md' : 'border-border hover:border-primary/30 hover:bg-muted/50'}`}>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-sm font-semibold ${role === key ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>
            <div className="text-right -mt-2">
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">Forgot password?</Link>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">Create Account</Link>
          </p>

          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
          <Button type="button" variant="outline" className="w-full gap-2 mt-4" onClick={handleGoogleLogin} disabled={googleLoading}>
            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Demo Login:</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => { setRole('superadmin'); setEmail('mahendrapra0077@gmail.com'); setPassword('admin@123'); setError(''); }}
                className="text-[10px] text-center px-1.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                <span className="font-semibold text-purple-600 dark:text-purple-400">Super</span>
                <span className="block text-muted-foreground truncate">mahendrapra0077</span>
              </button>
              <button type="button" onClick={() => { setRole('admin'); setEmail('admin@mediCore.com'); setPassword('password'); setError(''); }}
                className="text-[10px] text-center px-1.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
                <span className="font-semibold text-primary">Admin</span>
                <span className="block text-muted-foreground truncate">admin</span>
              </button>
              <button type="button" onClick={() => { setRole('doctor'); setEmail('sarah.smith@mediCore.com'); setPassword('password'); setError(''); }}
                className="text-[10px] text-center px-1.5 py-1.5 rounded-lg bg-info/10 border border-info/20 hover:bg-info/20 transition-colors">
                <span className="font-semibold text-info">Doctor</span>
                <span className="block text-muted-foreground truncate">sarah.smith</span>
              </button>
              <button type="button" onClick={() => { setRole('patient'); setEmail('patient@mediCore.com'); setPassword('password'); setError(''); }}
                className="text-[10px] text-center px-1.5 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/20 transition-colors">
                <span className="font-semibold text-success">Patient</span>
                <span className="block text-muted-foreground truncate">patient</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
