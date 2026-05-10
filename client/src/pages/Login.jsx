import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Shield, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const roles = [
  { key: 'admin',   label: 'Admin',   desc: 'Full system access',              icon: Shield,      color: 'text-primary',     bg: 'bg-primary/10'     },
  { key: 'doctor',  label: 'Doctor',  desc: 'Patient & schedule management',   icon: Stethoscope, color: 'text-info',         bg: 'bg-info/10'        },
  { key: 'patient', label: 'Patient', desc: 'Book appointments & records',      icon: UserRound,   color: 'text-success',      bg: 'bg-success/10'     },
];

const demos = {
  admin:   { email: 'admin@mediCore.com',       password: 'password' },
  doctor:  { email: 'sarah.smith@mediCore.com', password: 'password' },
  patient: { email: 'patient@mediCore.com',     password: 'password' },
};

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState(demos.admin.email);
  const [password, setPassword] = useState('password');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const pickRole = (r) => {
    setRole(r);
    setEmail(demos[r].email);
    setPassword('password');
    setSecretKey('');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (role === 'admin' && secretKey !== 'medicore2580') {
        setError('Invalid secret key for admin access');
        setLoading(false);
        return;
      }
      await login(email, password, role, secretKey);
      navigate('/dashboard');
    } catch (err) {
      if (err.requiresVerification || err.message?.toLowerCase().includes('verify your email')) {
        // Store credentials for auto-login after OTP verification
        localStorage.setItem('temp_password', password);
        localStorage.setItem('temp_role', role);
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
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
      <div className="flex-1 flex items-center justify-center p-8">
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
            {role === 'admin' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Secret Key</label>
                <Input type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Enter secret key" required />
              </div>
            )}
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo credentials auto-filled per role:</p>
            <p className="text-xs text-muted-foreground">Password: <span className="font-mono text-foreground">password</span></p>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">Create Account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
