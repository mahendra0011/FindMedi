import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Stethoscope, Microscope, Pill, ArrowLeft, ArrowRight,
  Check, ChevronRight, User, Mail, Phone, MapPin, Clock, FileText,
  Plus, X, Users, Star, Award, CalendarDays, BadgeCheck, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PLATFORM_TYPES = [
  { key: 'hospital', label: 'List Hospital', icon: Building2, desc: 'Register your hospital with full departments & doctors', color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-600' },
  { key: 'clinic', label: 'List Clinic', icon: Stethoscope, desc: 'Register your clinic with doctor details & services', color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-600' },
  { key: 'diagnostic', label: 'List Diagnostic Center', icon: Microscope, desc: 'Register your diagnostic & pathology center', color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-600' },
  { key: 'medicine', label: 'List Medicine Store', icon: Pill, desc: 'Register your pharmacy or medicine store', color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-600' },
];

const SPECIALTIES = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology','General Medicine','ENT','Psychiatry','Gynecology','Urology','Ophthalmology','Dentistry','Ayurveda'];

const emptyDoctor = () => ({
  name: '', specialization: '', qualifications: '', experience: '', email: '', phone: '', rating: 4.5
});

export default function JoinPlatform() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '' });
  const [facility, setFacility] = useState({
    name: '', address: '', city: '', state: '', license: '', description: '', specialties: [],
    facilities: [], timing: '', established: '', phone: '', email: ''
  });
  const [doctors, setDoctors] = useState([emptyDoctor()]);

  const updateAccount = (f) => (e) => setAccount(p => ({ ...p, [f]: e.target.value }));
  const updateFacility = (f) => (e) => setFacility(p => ({ ...p, [f]: e.target.value }));
  const toggleSpecialty = (s) => setFacility(p => ({
    ...p, specialties: p.specialties.includes(s) ? p.specialties.filter(x => x !== s) : [...p.specialties, s]
  }));
  const updateDoctor = (i, f) => (e) => setDoctors(p => { const d = [...p]; d[i] = { ...d[i], [f]: e.target.value }; return d; });
  const addDoctor = () => setDoctors(p => [...p, emptyDoctor()]);
  const removeDoctor = (i) => setDoctors(p => p.filter((_, idx) => idx !== i));

  const canProceed = () => {
    if (step === 1) return !!type;
    if (step === 2) return account.name && account.email && account.phone && account.password?.length >= 6;
    if (step === 3) {
      if (!facility.name || !facility.address || !facility.city) return false;
      if (type === 'clinic' || type === 'hospital') {
        return doctors.some(d => d.name && d.specialization);
      }
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let payload = { type, account, facility };
      if (type === 'clinic' || type === 'hospital') payload.doctors = doctors.filter(d => d.name && d.specialization);
      const res = await api.registerPlatform(payload);
      setSuccess(res);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Registration Submitted!</h2>
          <p className="text-muted-foreground mb-6">Your {type} registration has been submitted for review. We'll notify you once approved.</p>
          <Button onClick={() => navigate('/login')} className="gap-2 rounded-xl">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[{ n: 1, l: 'Select Type' }, { n: 2, l: 'Account' }, { n: 3, l: type === 'clinic' || type === 'hospital' ? 'Facility & Doctors' : 'Facility Details' }].map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all', step >= s.n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold', step > s.n ? 'bg-white/20' : '')}>{step > s.n ? <Check className="w-3 h-3" /> : s.n}</span>
            {s.l}
          </div>
          {i < 2 && <div className={cn('w-8 h-0.5', step > s.n ? 'bg-primary' : 'bg-muted')} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-primary/90 to-primary/70 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 0%, transparent 50%), radial-gradient(circle at 70% 70%, white 0%, transparent 50%)' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-sm text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-4">Join MediCore Platform</h1>
          <p className="text-white/70 text-lg leading-relaxed mb-8">List your healthcare facility and reach thousands of patients in your area.</p>
          <div className="space-y-3 text-left">
            {['Reach more patients online', 'Easy appointment management', 'Digital prescription & records', 'Analytics & growth insights'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></div>
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-2xl">
          <button onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Back to Login' : 'Previous Step'}
          </button>

          {renderStepIndicator()}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Choose Your Facility Type</h2>
              <p className="text-muted-foreground mb-6">Select the type of healthcare facility you want to register</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLATFORM_TYPES.map(pt => {
                  const Icon = pt.icon;
                  return (
                    <button key={pt.key} onClick={() => setType(pt.key)}
                      className={cn('text-left p-5 rounded-2xl border-2 transition-all', type === pt.key ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border hover:border-primary/30 hover:shadow-sm')}>
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', pt.color)}>
                        <Icon className={cn('w-6 h-6', pt.textColor)} />
                      </div>
                      <h3 className={cn('font-heading font-semibold text-foreground', type === pt.key && 'text-primary')}>{pt.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{pt.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} disabled={!type} className="gap-2 rounded-xl">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Account Details</h2>
              <p className="text-muted-foreground mb-6">Create your admin account for {PLATFORM_TYPES.find(p => p.key === type)?.label}</p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                  <Input value={account.name} onChange={updateAccount('name')} placeholder="Enter your full name" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email <span className="text-red-500">*</span></label>
                    <Input type="email" value={account.email} onChange={updateAccount('email')} placeholder="Enter your email" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone <span className="text-red-500">*</span></label>
                    <Input type="tel" value={account.phone} onChange={updateAccount('phone')} placeholder="Enter phone number" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password <span className="text-red-500">*</span></label>
                  <Input type="password" value={account.password} onChange={updateAccount('password')} placeholder="Min 6 characters" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(3)} disabled={!canProceed()} className="gap-2 rounded-xl">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Facility Details</h2>
              <p className="text-muted-foreground mb-6">Fill in your {type} details</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Facility Name <span className="text-red-500">*</span></label>
                    <Input value={facility.name} onChange={updateFacility('name')} placeholder={`Your ${type} name`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Address <span className="text-red-500">*</span></label>
                    <Textarea value={facility.address} onChange={updateFacility('address')} placeholder="Full address" rows={2} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">City <span className="text-red-500">*</span></label>
                    <Input value={facility.city} onChange={updateFacility('city')} placeholder="City" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">State</label>
                    <Input value={facility.state} onChange={updateFacility('state')} placeholder="State" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">License Number</label>
                    <Input value={facility.license} onChange={updateFacility('license')} placeholder="Registration/License number" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Established Year</label>
                    <Input value={facility.established} onChange={updateFacility('established')} placeholder="e.g. 2015" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Phone</label>
                    <Input value={facility.phone} onChange={updateFacility('phone')} placeholder="Reception phone" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Email</label>
                    <Input type="email" value={facility.email} onChange={updateFacility('email')} placeholder="Facility email" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Timing</label>
                    <Input value={facility.timing} onChange={updateFacility('timing')} placeholder="e.g. Mon-Sat 9AM-8PM" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                    <Textarea value={facility.description} onChange={updateFacility('description')} placeholder="Brief description about your facility" rows={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Specialties</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIALTIES.map(s => (
                        <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                          className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', facility.specialties.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Doctors section for Hospital & Clinic */}
                {(type === 'clinic' || type === 'hospital') && (
                  <div className="mt-6">
                    <Separator className="mb-4" />
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Add Doctors
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={addDoctor} className="gap-1 text-xs rounded-lg">
                        <Plus className="w-3 h-3" /> Add Another Doctor
                      </Button>
                    </div>
                    <AnimatePresence>
                      {doctors.map((doc, i) => (
                        <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="bg-muted/20 rounded-xl border border-border/40 p-4 mb-3">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Doctor {i + 1}</span>
                            {doctors.length > 1 && (
                              <button onClick={() => removeDoctor(i)} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Name <span className="text-red-500">*</span></label>
                              <Input value={doc.name} onChange={updateDoctor(i, 'name')} placeholder="Dr. Full Name" className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Specialization <span className="text-red-500">*</span></label>
                              <select value={doc.specialization} onChange={updateDoctor(i, 'specialization')}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                                <option value="">Select</option>
                                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Qualifications</label>
                              <Input value={doc.qualifications} onChange={updateDoctor(i, 'qualifications')} placeholder="MBBS, MD" className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Experience</label>
                              <Input value={doc.experience} onChange={updateDoctor(i, 'experience')} placeholder="e.g. 5 years" className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                              <Input type="email" value={doc.email} onChange={updateDoctor(i, 'email')} placeholder="doctor@email.com" className="h-9 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                              <Input type="tel" value={doc.phone} onChange={updateDoctor(i, 'phone')} placeholder="Contact number" className="h-9 text-sm" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mt-4">{error}</p>}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2 rounded-xl"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={handleSubmit} disabled={!canProceed() || loading} className="flex-1 gap-2 rounded-xl">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Submitting...' : `Submit Registration`}
                  {!loading && <Check className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
