import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Shield, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const roles = [
  { key: 'admin',   label: 'Admin',   desc: 'Full system access',            icon: Shield,      color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'doctor',  label: 'Doctor',  desc: 'Manage patients & schedule',    icon: Stethoscope, color: 'text-info',    bg: 'bg-info/10'    },
  { key: 'patient', label: 'Patient', desc: 'Book appointments & view records', icon: UserRound, color: 'text-success', bg: 'bg-success/10' },
];

export default function Signup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (role === 'admin' && secretKey !== 'medicore2580') {
      setError('Invalid secret key for admin registration');
      return;
    }
    if (!phone || !gender || !dateOfBirth) {
      setError('Phone number, gender and date of birth are required');
      return;
    }
    if (role === 'doctor' && (!specialization || !experience || !qualification || !licenseNumber || !consultationFee)) {
      setError('Please complete all doctor registration details');
      return;
    }
    setLoading(true);
    try {
      // Register using API directly (do not set auth state yet)
      const data = await api.register({
        name,
        email,
        password,
        role,
        secretKey,
        phone,
        gender,
        dateOfBirth,
        specialization,
        experience,
        qualification,
        licenseNumber,
        consultationFee: Number(consultationFee) || 0,
      });
      // Store credentials for auto-login after OTP
      localStorage.setItem('temp_password', password);
      localStorage.setItem('temp_role', role);
      // Navigate to OTP verification page
      const params = new URLSearchParams({ email });
      if (data?.emailDeliveryFailed || data?.otpWarning) params.set('delivery', 'failed');
      if (data?.sentTo) params.set('sentTo', data.sentTo);
      navigate(`/verify-otp?${params.toString()}`);
    } catch (err) {
      setError(err.message || 'Signup failed');
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
          <h1 className="font-heading text-4xl font-bold text-sidebar-primary-foreground mb-4">Join MediCore HMS</h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed mb-10">
            Create your account and start managing healthcare efficiently. Choose your role to get started.
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

          <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Create Account</h2>
          <p className="text-muted-foreground mb-8">Select your role and fill in your details</p>

          {/* Role Selection */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {roles.map(({ key, label, desc, icon: Icon, color, bg }) => (
              <button key={key} onClick={() => setRole(key)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${role === key ? 'border-primary bg-accent shadow-md' : 'border-border hover:border-primary/30 hover:bg-muted/50'}`}>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-sm font-semibold ${role === key ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
              <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your phone number" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Date of Birth</label>
                <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
            </div>
            {role === 'doctor' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                  <Input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Cardiology" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Experience</label>
                    <Input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 8 years" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Consultation Fee</label>
                    <Input type="number" min="0" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} placeholder="500" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Qualification</label>
                  <Input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. MBBS, MD" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">License Number</label>
                  <Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Medical license number" required />
                </div>
              </div>
            )}
            {role === 'admin' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Secret Key</label>
                <Input type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Enter admin secret key" required />
              </div>
            )}
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
