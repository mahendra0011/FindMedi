import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Stethoscope, Microscope, Pill, ArrowLeft, ArrowRight,
  Check, ChevronRight, User, Mail, Phone, MapPin, Clock, FileText,
  Plus, X, Users, Star, Award, CalendarDays, BadgeCheck, Loader2,
  Shield, Heart, Eye, Activity, Lock, Globe, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PLATFORM_TYPES = [
  { key: 'hospital', label: 'Hospital', icon: Building2, desc: 'Multi-speciality or nursing home', color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-600', gradient: 'from-blue-600 to-blue-700' },
  { key: 'clinic', label: 'Clinic', icon: Stethoscope, desc: 'Doctor clinic or polyclinic', color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-600', gradient: 'from-emerald-600 to-emerald-700' },
  { key: 'diagnostic', label: 'Diagnostic Center', icon: Microscope, desc: 'Pathology & imaging lab', color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-600', gradient: 'from-purple-600 to-purple-700' },
  { key: 'pharmacy', label: 'Pharmacy Store', icon: Pill, desc: 'Medicine & wellness store', color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-600', gradient: 'from-rose-600 to-rose-700' },
];

const SPECIALTIES = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology','General Medicine','ENT','Psychiatry','Gynecology','Urology','Ophthalmology','Dentistry','Ayurveda','Homeopathy','Physiotherapy'];

const emptyDoctor = () => ({ name: '', specialization: '', qualifications: '', experience: '', email: '', phone: '' });

const STEPS = [
  { num: 1, label: 'Facility Type', icon: Building2 },
  { num: 2, label: 'Admin Account', icon: User },
  { num: 3, label: 'Facility Info', icon: MapPin },
  { num: 4, label: 'Doctors & Services', icon: Users },
  { num: 5, label: 'Review & Submit', icon: FileText },
];

export default function JoinPlatform() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '' });
  const [facility, setFacility] = useState({
    name: '', address: '', city: '', state: '', pincode: '', license: '', description: '',
    specialties: [], timing: '', established: '', phone: '', email: '', website: '', logo: null,
  });
  const [doctors, setDoctors] = useState([emptyDoctor()]);
  const [services, setServices] = useState([]);
  const [agreed, setAgreed] = useState(false);

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
    if (step === 2) return account.name?.length >= 2 && account.email?.includes('@') && account.phone?.length >= 10 && account.password?.length >= 6;
    if (step === 3) return facility.name && facility.address && facility.city;
    if (step === 4) {
      if (type === 'hospital' || type === 'clinic') return doctors.some(d => d.name && d.specialization);
      return true;
    }
    if (step === 5) return agreed;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let payload = { type, account, facility, services };
      if (type === 'hospital' || type === 'clinic') payload.doctors = doctors.filter(d => d.name && d.specialization);
      const res = await api.registerPlatform(payload);
      setSuccess(res);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const selectedType = PLATFORM_TYPES.find(p => p.key === type);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Registration Submitted!</h2>
          <p className="text-muted-foreground mb-6">Your {type} registration has been received. Our team will review and approve it shortly. You'll get a notification once approved.</p>
          <div className="bg-muted/30 rounded-xl p-4 border border-border/40 mb-6 text-left text-sm space-y-2">
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Confirmation sent to <strong>{account.email}</strong></span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Typical approval time: <strong>24-48 hours</strong></span></div>
          </div>
          <Button onClick={() => navigate('/login')} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
            step >= s.num
              ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
              : 'bg-card text-muted-foreground border-border/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              step > s.num ? 'bg-white/20' : step === s.num ? 'bg-white/20' : 'bg-muted-foreground/10'
            )}>
              {step > s.num ? <Check className="w-3 h-3" /> : s.num}
            </div>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-6 sm:w-10 h-0.5 mx-0.5 rounded-full', step > s.num ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );

  const stepHeader = (title, desc) => (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-1">{desc}</p>
    </div>
  );

  const navButtons = (showBack = true) => (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
      <div>
        {showBack && (
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Step {step} of {STEPS.length}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[38%] items-center justify-center p-12 relative overflow-hidden" style={{ backgroundColor: '#259D91' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/10">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-4">Join MediCore</h1>
          <p className="text-white/60 text-lg leading-relaxed mb-8">List your healthcare facility and reach patients in your area.</p>
          <div className="space-y-3 text-left">
            {[
              { icon: Globe, text: 'Get discovered by patients nearby' },
              { icon: CalendarDays, text: 'Manage appointments seamlessly' },
              { icon: FileText, text: 'Digital records & e-prescriptions' },
              { icon: BarChart3, text: 'Analytics & growth insights' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-white/90">{text}</span>
              </div>
            ))}
          </div>
          {selectedType && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
              <p className="text-xs text-white/50 mb-2">Selected</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <selectedType.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">{selectedType.label}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 pt-12 overflow-y-auto min-h-screen">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-2xl">
          <button onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Back to Login' : 'Previous Step'}
          </button>

          {renderStepIndicator()}

          {/* Step 1: Select Facility Type */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {stepHeader('Choose Your Facility Type', 'Select the type of healthcare facility you want to register on MediCore')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLATFORM_TYPES.map(pt => {
                  const Icon = pt.icon;
                  const active = type === pt.key;
                  return (
                    <button key={pt.key} onClick={() => setType(pt.key)}
                      className={cn(
                        'relative text-left p-5 rounded-2xl border-2 transition-all overflow-hidden group',
                        active
                          ? 'border-primary bg-gradient-to-br from-primary/10 to-transparent shadow-lg shadow-primary/15'
                          : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
                      )}>
                      {active && <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30"><Check className="w-4 h-4 text-white" /></div>}
                      <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform group-hover:scale-105', pt.color)}>
                        <Icon className={cn('w-7 h-7', pt.textColor)} />
                      </div>
                      <h3 className={cn('font-heading font-semibold text-lg', active && 'text-primary')}>{pt.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{pt.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(2)} disabled={!type} size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20 px-8">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {stepHeader('Create Admin Account', 'This will be the admin login for your ' + (selectedType?.label || '') + ' dashboard')}
              <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={account.name} onChange={updateAccount('name')} placeholder="Enter admin full name" className="pl-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={account.email} onChange={updateAccount('email')} placeholder="admin@example.com" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="tel" value={account.phone} onChange={updateAccount('phone')} placeholder="+91 9876543210" className="pl-10" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={account.password} onChange={updateAccount('password')} placeholder="Min 6 characters" className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Use this password to login to your dashboard after approval</p>
                </div>
              </div>
              {navButtons(false)}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(3)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Facility Info */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {stepHeader('Facility Details', 'Tell us about your ' + (selectedType?.label || '') + ' — address, contact, and more')}
              <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{selectedType?.label} Name <span className="text-red-500">*</span></label>
                  <Input value={facility.name} onChange={updateFacility('name')} placeholder={`Your ${selectedType?.label || 'facility'} name`} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea value={facility.address} onChange={updateFacility('address')} placeholder="Full address" rows={2} className="pl-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">City <span className="text-red-500">*</span></label>
                    <Input value={facility.city} onChange={updateFacility('city')} placeholder="City" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">State</label>
                    <Input value={facility.state} onChange={updateFacility('state')} placeholder="State" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Pincode</label>
                    <Input value={facility.pincode} onChange={updateFacility('pincode')} placeholder="Pincode" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={facility.phone} onChange={updateFacility('phone')} placeholder="Reception number" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={facility.email} onChange={updateFacility('email')} placeholder="Facility email" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">License / Registration No.</label>
                    <Input value={facility.license} onChange={updateFacility('license')} placeholder="License number" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Established Year</label>
                    <Input value={facility.established} onChange={updateFacility('established')} placeholder="e.g. 2015" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Timing</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={facility.timing} onChange={updateFacility('timing')} placeholder="e.g. Mon-Sat 9AM-8PM" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Website (optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={facility.website} onChange={updateFacility('website')} placeholder="https://" className="pl-10" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <Textarea value={facility.description} onChange={updateFacility('description')} placeholder="Brief description about your facility and services" rows={2} />
                </div>
              </div>
              {navButtons()}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(4)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Doctors & Services */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {stepHeader('Doctors & Specialties', 'Add your doctors and the specialties your ' + (selectedType?.label || '') + ' offers')}

              <div className="bg-card rounded-2xl border border-border/50 p-5 mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Specialties Offered</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={cn('text-xs px-3 py-1.5 rounded-full border transition-all', facility.specialties.includes(s) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background text-muted-foreground border-border/60 hover:border-primary/30')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {(type === 'hospital' || type === 'clinic') && (
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Doctors
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addDoctor} className="gap-1 text-xs rounded-lg">
                      <Plus className="w-3 h-3" /> Add Doctor
                    </Button>
                  </div>
                  <AnimatePresence>
                    {doctors.map((doc, i) => (
                      <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="bg-muted/20 rounded-xl border border-border/40 p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" /> Doctor {i + 1}
                          </span>
                          {doctors.length > 1 && (
                            <button onClick={() => removeDoctor(i)} className="text-red-500 hover:text-red-600 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
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

              {navButtons()}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(5)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  Review & Submit <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {stepHeader('Review & Submit', 'Please verify all details before submitting')}

              <div className="space-y-3 mb-6">
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/30">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', selectedType?.color)}>
                      {selectedType && <selectedType.icon className={cn('w-5 h-5', selectedType.textColor)} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{selectedType?.label}</p>
                      <p className="text-xs text-muted-foreground">{facility.name || 'Name not set'}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Admin Account</p>
                      <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /><span>{account.name}</span></div>
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /><span>{account.email}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span>{account.phone}</span></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Facility</p>
                      <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /><span>{facility.address}, {facility.city}{facility.state ? ', ' + facility.state : ''}</span></div>
                        {facility.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span>{facility.phone}</span></div>}
                        {facility.timing && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span>{facility.timing}</span></div>}
                        {facility.specialties.length > 0 && (
                          <div className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-muted-foreground mt-0.5" /><div className="flex flex-wrap gap-1">{facility.specialties.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div></div>
                        )}
                      </div>
                    </div>

                    {(type === 'hospital' || type === 'clinic') && doctors.filter(d => d.name).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Doctors ({doctors.filter(d => d.name).length})</p>
                        <div className="space-y-1.5">
                          {doctors.filter(d => d.name).map((d, i) => (
                            <div key={i} className="bg-muted/20 rounded-lg p-2.5 flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-xs"><strong>{d.name}</strong>{d.specialization ? ' — ' + d.specialization : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-border/40 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">I confirm that all provided information is accurate</p>
                    <p className="text-xs text-muted-foreground mt-0.5">By submitting, you agree to MediCore's terms of service and privacy policy. Your registration will be reviewed by our team.</p>
                  </div>
                </label>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>}

              {navButtons()}
              <div className="flex justify-end mt-4">
                <Button onClick={handleSubmit} disabled={!canProceed() || loading} className="flex-1 sm:flex-none gap-2 rounded-xl shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function BarChart3(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
