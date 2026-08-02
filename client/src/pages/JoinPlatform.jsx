import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
   Building2, Stethoscope, Microscope, Pill, ArrowLeft, ArrowRight,
   Check, ChevronRight, User, Mail, Phone, MapPin, Clock, FileText,
   Plus, X, Users, Star, Award, CalendarDays, BadgeCheck, Loader2,
   Shield, Heart, Eye, EyeOff, Activity, Lock, Globe, Image, UserRound, BarChart3,
   Truck, FileImage, IndianRupee, Wifi, WifiOff, Calendar, MapPinned, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PLATFORM_TYPES = [
  { key: 'hospital', label: 'Hospital', icon: Building2, desc: 'Multi-speciality or nursing home', color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-600', gradient: 'from-blue-600 to-blue-700' },
  { key: 'clinic', label: 'Clinic', icon: Stethoscope, desc: 'Doctor clinic or polyclinic', color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-600', gradient: 'from-emerald-600 to-emerald-700' },
  { key: 'diagnostic', label: 'Diagnostic Center', icon: Microscope, desc: 'Pathology & imaging lab', color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-600', gradient: 'from-purple-600 to-purple-700' },
  { key: 'pharmacy', label: 'Pharmacy Store', icon: Pill, desc: 'Medicine & wellness store', color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-600', gradient: 'from-rose-600 to-rose-700' },
  { key: 'delivery', label: 'Delivery Partner', icon: Truck, desc: 'Deliver medicines, earn on your own time', color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-600', gradient: 'from-amber-600 to-amber-700' },
];

const SPECIALTIES = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology','General Medicine','ENT','Psychiatry','Gynecology','Urology','Ophthalmology','Dentistry','Ayurveda','Homeopathy','Physiotherapy'];

const emptyDoctor = () => ({ name: '', specialization: '', qualifications: '', experience: '', email: '', phone: '' });

const BASE_STEPS = [
  { num: 1, label: 'Facility Type', icon: Building2 },
  { num: 2, label: 'Admin Account', icon: User },
  { num: 3, label: 'Facility Info', icon: MapPin },
];
const DOCTORS_STEP = { num: 4, label: 'Doctors & Services', icon: Users };
const REVIEW_STEP = { num: 99, label: 'Review & Submit', icon: FileText };

const getSteps = (type) => {
  if (type === 'delivery') {
    return [
      { num: 1, label: 'Partner Type', icon: Truck },
      { num: 2, label: 'Personal Details', icon: User },
      { num: 3, label: 'Vehicle Details', icon: Truck },
      { num: 4, label: 'Identity & Bank', icon: FileImage },
      { num: 5, label: 'Work Preferences', icon: Clock },
      { num: 6, label: 'Review & Submit', icon: FileText },
    ];
  }
  const hasDoctors = type === 'hospital' || type === 'clinic';
   const hasSpecialist = type === 'diagnostic';
   const steps = [...BASE_STEPS];
   if (hasDoctors) steps.push(DOCTORS_STEP);
   if (hasSpecialist) steps.push({ num: 4.5, label: 'Specialist Details', icon: UserRound });
   steps.push({ ...REVIEW_STEP, num: steps.length + 1 });
   return steps.map((s, i) => ({ ...s, num: i + 1 }));
};

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
    specialties: [], timing: '', established: '', phone: '', email: '', website: '',
    logo: '', image: '',
    amenities: { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, inHousePharmacy: false, drinkingWater: false, wifi: false, homeVisit: false, homeDelivery: false, prescriptionUpload: false },
    insurance: [], accreditations: [], socialLinks: { facebook: '', instagram: '', youtube: '' },
    weekSchedule: {
      monday: '9:00 AM - 6:00 PM', tuesday: '9:00 AM - 6:00 PM', wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM', friday: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 2:00 PM', sunday: 'Closed',
    },
  });
  const [doctors, setDoctors] = useState([emptyDoctor()]);
  
  const [specialist, setSpecialist] = useState({
    pathologistName: '', pathologistQualification: '',
    radiologistName: '', radiologistQualification: '',
    cardiologistName: '', cardiologistQualification: '',
    technicianName: '', technicianRole: '', technicianQualification: '', technicianExperience: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [addingInsurance, setAddingInsurance] = useState(false);
  const [newInsurance, setNewInsurance] = useState('');
  const [addingAccreditation, setAddingAccreditation] = useState(false);
  const [newAccreditation, setNewAccreditation] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delivery Boy state
  const [delivery, setDelivery] = useState({
    name: '', phone: '', email: '', password: '', dateOfBirth: '', gender: '',
    address: '', city: '', pincode: '',
    vehicleType: '', vehicleNumber: '', drivingLicenseNumber: '',
    bankAccountNumber: '', bankIfsc: '', bankAccountHolderName: '', upiId: '',
    deliveryZone: [], availability: 'full-time', startTime: '', endTime: '',
    emergencyContactName: '', emergencyContactPhone: '', pharmacyId: '',
  });
  const [deliveryDocs, setDeliveryDocs] = useState({
    aadharFront: null, aadharBack: null, panCard: null, photo: null,
    drivingLicense: null, rc: null, addressProof: null,
  });
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryOtpSent, setDeliveryOtpSent] = useState(false);

  const passwordStrength = (() => {
    const pw = account.password;
    if (!pw) return { score: 0, label: '', color: 'bg-border' };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    return { score, label: labels[score], color: colors[score] };
  })();

  const updateAccount = (f) => (e) => setAccount(p => ({ ...p, [f]: e.target.value }));
  const updateFacility = (f) => (e) => setFacility(p => ({ ...p, [f]: e.target.value }));
  const toggleSpecialty = (s) => setFacility(p => ({
    ...p, specialties: p.specialties.includes(s) ? p.specialties.filter(x => x !== s) : [...p.specialties, s]
  }));
  const updateDoctor = (i, f) => (e) => setDoctors(p => { const d = [...p]; d[i] = { ...d[i], [f]: e.target.value }; return d; });
  const addDoctor = () => setDoctors(p => [...p, emptyDoctor()]);
  const removeDoctor = (i) => setDoctors(p => p.filter((_, idx) => idx !== i));
  const updateAmenity = (key) => (checked) => setFacility(p => ({ ...p, amenities: { ...p.amenities, [key]: checked } }));
  const addInsurance = () => { if (newInsurance.trim()) { setFacility(p => ({ ...p, insurance: [...p.insurance, newInsurance.trim()] })); setNewInsurance(''); setAddingInsurance(false); } };
  const addAccreditation = () => { if (newAccreditation.trim()) { setFacility(p => ({ ...p, accreditations: [...p.accreditations, newAccreditation.trim().toUpperCase()] })); setNewAccreditation(''); setAddingAccreditation(false); } };

  // Delivery Boy helpers
  const updateDelivery = (f) => (e) => setDelivery(p => ({ ...p, [f]: e.target.value }));
  const handleDeliveryDocChange = (field) => (e) => {
    const file = e.target.files?.[0];
    if (file) setDeliveryDocs(p => ({ ...p, [field]: file }));
  };
  const toggleDeliveryZone = (zone) => setDelivery(p => ({
    ...p, deliveryZone: p.deliveryZone.includes(zone) ? p.deliveryZone.filter(x => x !== zone) : [...p.deliveryZone, zone]
  }));
  const handleDeliveryOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.registerDeliveryBoy({ ...delivery, _verifyOtp: true });
      if (res.requiresVerification) {
        setDeliveryOtpSent(true);
      } else {
        setSuccess({ type: 'delivery', ...res });
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    }
    setLoading(false);
  };

  const steps = getSteps(type);
  const maxStep = steps.length;

  const canProceed = () => {
    if (type === 'delivery') {
      if (step === 1) return !!type;
      if (step === 2) return delivery.name?.length >= 2 && delivery.phone?.length >= 10 && delivery.dateOfBirth && delivery.gender && delivery.address && delivery.city && delivery.pincode && delivery.password?.length >= 8;
      if (step === 3) return delivery.vehicleType;
      if (step === 4) return deliveryDocs.aadharFront && deliveryDocs.photo && delivery.bankAccountNumber && delivery.bankIfsc && delivery.bankAccountHolderName;
      if (step === 5) return true;
      if (step === 6) return agreed;
      return true;
    }
    if (step === 1) return !!type;
    if (step === 2) return account.name?.length >= 2 && account.email?.includes('@') && account.phone?.length >= 10 && account.password?.length >= 8 && account.password === confirmPassword;
    if (step === 3) return facility.name && facility.address && facility.city;
    if (step === maxStep) return agreed;
    return true;
  };

   const handleSubmit = async () => {
     setLoading(true);
     setError('');
     try {
       if (type === 'delivery') {
         const payload = {
           name: delivery.name,
           phone: delivery.phone,
           email: delivery.email,
           password: delivery.password,
           dateOfBirth: delivery.dateOfBirth,
           gender: delivery.gender,
           address: delivery.address,
           city: delivery.city,
           pincode: delivery.pincode,
           vehicleType: delivery.vehicleType,
           vehicleNumber: delivery.vehicleNumber,
           drivingLicenseNumber: delivery.drivingLicenseNumber,
           bankAccountNumber: delivery.bankAccountNumber,
           bankIfsc: delivery.bankIfsc,
           bankAccountHolderName: delivery.bankAccountHolderName,
           upiId: delivery.upiId,
           deliveryZone: delivery.deliveryZone,
           availability: delivery.availability,
           startTime: delivery.startTime,
           endTime: delivery.endTime,
           emergencyContactName: delivery.emergencyContactName,
           emergencyContactPhone: delivery.emergencyContactPhone,
           pharmacyId: delivery.pharmacyId,
         };
         const res = await api.registerDeliveryBoy(payload);
         if (res.requiresVerification) {
           setDeliveryOtpSent(true);
           return;
         }
         setSuccess({ type: 'delivery', ...res });
         return;
       }
       const payload = {
        type, account,
        facility: {
          ...facility,
          established: facility.established ? Number(facility.established) : facility.established,
        },
        specialist: type === 'diagnostic' ? specialist : undefined,
      };
      if (type === 'hospital' || type === 'clinic') payload.doctors = doctors.filter(d => d.name && d.specialization);
      const res = await api.registerPlatform(payload);
      if (res.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`);
        return;
      }
      setSuccess(res);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const selectedType = PLATFORM_TYPES.find(p => p.key === type);

  if (success) {
    const isDelivery = success?.type === 'delivery';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Registration Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            {isDelivery
              ? 'Your delivery partner registration has been received. Our team will review your documents and approve your account shortly.'
              : `Your ${type} registration has been received. Our team will review and approve it shortly. You'll get a notification once approved.`}
          </p>
          <div className="bg-muted/30 rounded-xl p-4 border border-border/40 mb-6 text-left text-sm space-y-2">
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Confirmation sent to <strong>{isDelivery ? (delivery.email || 'your email') : account.email}</strong></span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Typical approval time: <strong>24-48 hours</strong></span></div>
            {isDelivery && (
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><span className="text-muted-foreground">Status: <strong>Pending Verification</strong></span></div>
            )}
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
      {steps.map((s, i) => (
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
          {i < steps.length - 1 && (
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
        <span>Step {step} of {maxStep}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[38%] items-center justify-center p-12 relative overflow-hidden" style={{ backgroundColor: '#259D91' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/10">
            {selectedType ? <selectedType.icon className="w-10 h-10 text-white" /> : <Building2 className="w-10 h-10 text-white" />}
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-4">Join FindMedi</h1>
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
               {stepHeader('Choose Your Facility Type', 'Select the type of healthcare facility you want to register on FindMedi')}
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

           {/* Delivery Step 1: Partner Type (same as step 1, handled above) */}

           {/* Delivery Step 2: Personal Details */}
           {step === 2 && type === 'delivery' && (
             <motion.div key="d-s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Personal Details', 'Tell us about yourself — name, contact, and address')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input value={delivery.name} onChange={updateDelivery('name')} placeholder="Enter your full name" className="pl-10" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">Phone <span className="text-red-500">*</span></label>
                     <div className="relative">
                       <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input type="tel" value={delivery.phone} onChange={updateDelivery('phone')} placeholder="+91 9876543210" className="pl-10" />
                     </div>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                     <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input type="email" value={delivery.email} onChange={updateDelivery('email')} placeholder="you@example.com" className="pl-10" />
                     </div>
                   </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Password <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input type={showPassword ? 'text' : 'password'} value={delivery.password} onChange={updateDelivery('password')} placeholder="Min 8 characters" className="pl-10 pr-10" />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                       {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">Use this password to login after approval</p>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">Date of Birth <span className="text-red-500">*</span></label>
                     <Input type="date" value={delivery.dateOfBirth} onChange={updateDelivery('dateOfBirth')} max={new Date().toISOString().split('T')[0]} />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">Gender <span className="text-red-500">*</span></label>
                     <select value={delivery.gender} onChange={e => updateDelivery('gender')({ target: { value: e.target.value } })}
                       className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                       <option value="">Select</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Current Address <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                     <Textarea value={delivery.address} onChange={updateDelivery('address')} placeholder="Full address" rows={2} className="pl-10" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">City <span className="text-red-500">*</span></label>
                     <Input value={delivery.city} onChange={updateDelivery('city')} placeholder="City" />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">Pincode <span className="text-red-500">*</span></label>
                     <Input value={delivery.pincode} onChange={updateDelivery('pincode')} placeholder="Pincode" />
                   </div>
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

           {/* Delivery Step 3: Vehicle Details */}
           {step === 3 && type === 'delivery' && (
             <motion.div key="d-s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Vehicle Details', 'What vehicle will you use for deliveries?')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Vehicle Type <span className="text-red-500">*</span></label>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[
                       { value: 'bike', label: 'Bike', icon: Truck },
                       { value: 'scooter', label: 'Scooter', icon: Truck },
                       { value: 'bicycle', label: 'Bicycle', icon: Truck },
                       { value: 'on-foot', label: 'On Foot', icon: User },
                     ].map(v => (
                       <button key={v.value} type="button" onClick={() => updateDelivery('vehicleType')({ target: { value: v.value } })}
                         className={cn(
                           'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                           delivery.vehicleType === v.value
                             ? 'border-primary bg-primary/5 text-primary'
                             : 'border-border/60 bg-muted/20 hover:border-primary/30'
                         )}>
                         <v.icon className="w-6 h-6" />
                         <span className="text-sm font-medium">{v.label}</span>
                       </button>
                     ))}
                   </div>
                 </div>
                 {delivery.vehicleType !== 'on-foot' && (
                   <>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Vehicle Number</label>
                       <Input value={delivery.vehicleNumber} onChange={updateDelivery('vehicleNumber')} placeholder="e.g. MH 12 AB 1234" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Driving License Number</label>
                       <Input value={delivery.drivingLicenseNumber} onChange={updateDelivery('drivingLicenseNumber')} placeholder="DL number" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">RC (Registration Certificate) Upload</label>
                       <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                         <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('rc')} className="hidden" />
                         <div className="text-center">
                           <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                           <span className="text-xs text-muted-foreground">Click to upload RC</span>
                         </div>
                       </label>
                       {deliveryDocs.rc && <p className="text-xs text-success mt-1">{deliveryDocs.rc.name}</p>}
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Driving License Upload</label>
                       <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                         <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('drivingLicense')} className="hidden" />
                         <div className="text-center">
                           <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                           <span className="text-xs text-muted-foreground">Click to upload DL</span>
                         </div>
                       </label>
                       {deliveryDocs.drivingLicense && <p className="text-xs text-success mt-1">{deliveryDocs.drivingLicense.name}</p>}
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Insurance Copy (optional)</label>
                       <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                         <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('addressProof')} className="hidden" />
                         <div className="text-center">
                           <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                           <span className="text-xs text-muted-foreground">Click to upload insurance</span>
                         </div>
                       </label>
                       {deliveryDocs.addressProof && <p className="text-xs text-success mt-1">{deliveryDocs.addressProof.name}</p>}
                     </div>
                   </>
                 )}
               </div>
               {navButtons()}
               <div className="flex justify-end mt-4">
                 <Button onClick={() => setStep(4)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                   Continue <ArrowRight className="w-4 h-4" />
                 </Button>
               </div>
             </motion.div>
           )}

           {/* Delivery Step 4: Identity & Bank Verification */}
           {step === 4 && type === 'delivery' && (
             <motion.div key="d-s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Identity & Bank Verification (KYC)', 'Upload your documents and provide bank details for payouts')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-5">
                 <div>
                   <p className="text-xs font-semibold text-muted-foreground mb-3">Aadhar Card</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                         <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('aadharFront')} className="hidden" />
                         <div className="text-center">
                           <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                           <span className="text-xs text-muted-foreground">Aadhar Front</span>
                         </div>
                       </label>
                       {deliveryDocs.aadharFront && <p className="text-xs text-success mt-1 text-center">{deliveryDocs.aadharFront.name}</p>}
                     </div>
                     <div>
                       <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                         <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('aadharBack')} className="hidden" />
                         <div className="text-center">
                           <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                           <span className="text-xs text-muted-foreground">Aadhar Back</span>
                         </div>
                       </label>
                       {deliveryDocs.aadharBack && <p className="text-xs text-success mt-1 text-center">{deliveryDocs.aadharBack.name}</p>}
                     </div>
                   </div>
                 </div>

                 <div>
                   <p className="text-xs font-semibold text-muted-foreground mb-3">Profile Photo</p>
                   <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                     <input type="file" accept="image/*" onChange={handleDeliveryDocChange('photo')} className="hidden" />
                     <div className="text-center">
                       <Image className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                       <span className="text-xs text-muted-foreground">Upload a clear selfie/photo</span>
                     </div>
                   </label>
                   {deliveryDocs.photo && <p className="text-xs text-success mt-1 text-center">{deliveryDocs.photo.name}</p>}
                 </div>

                 <div>
                   <p className="text-xs font-semibold text-muted-foreground mb-3">PAN Card</p>
                   <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                     <input type="file" accept="image/*,.pdf" onChange={handleDeliveryDocChange('panCard')} className="hidden" />
                     <div className="text-center">
                       <FileImage className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                       <span className="text-xs text-muted-foreground">Upload PAN card</span>
                     </div>
                   </label>
                   {deliveryDocs.panCard && <p className="text-xs text-success mt-1 text-center">{deliveryDocs.panCard.name}</p>}
                 </div>

                 <Separator />

                 <div>
                   <p className="text-xs font-semibold text-muted-foreground mb-3">Bank / Payout Details</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Account Number <span className="text-red-500">*</span></label>
                       <div className="relative">
                         <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input value={delivery.bankAccountNumber} onChange={updateDelivery('bankAccountNumber')} placeholder="Account number" className="pl-10" />
                       </div>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">IFSC Code <span className="text-red-500">*</span></label>
                       <Input value={delivery.bankIfsc} onChange={updateDelivery('bankIfsc')} placeholder="e.g. SBIN0001234" className="uppercase" />
                     </div>
                     <div className="sm:col-span-2">
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Account Holder Name <span className="text-red-500">*</span></label>
                       <Input value={delivery.bankAccountHolderName} onChange={updateDelivery('bankAccountHolderName')} placeholder="As per bank records" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">UPI ID (optional)</label>
                       <Input value={delivery.upiId} onChange={updateDelivery('upiId')} placeholder="name@upi" />
                     </div>
                   </div>
                 </div>
               </div>
               {navButtons()}
               <div className="flex justify-end mt-4">
                 <Button onClick={() => setStep(5)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                   Continue <ArrowRight className="w-4 h-4" />
                 </Button>
               </div>
             </motion.div>
           )}

           {/* Delivery Step 5: Work Preferences */}
           {step === 5 && type === 'delivery' && (
             <motion.div key="d-s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Work Preferences', 'Tell us about your availability and preferred work zones')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-5">
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Availability</label>
                   <div className="grid grid-cols-3 gap-3">
                     {[
                       { value: 'full-time', label: 'Full-time' },
                       { value: 'part-time', label: 'Part-time' },
                       { value: 'flexible', label: 'Flexible' },
                     ].map(v => (
                       <button key={v.value} type="button" onClick={() => updateDelivery('availability')({ target: { value: v.value } })}
                         className={cn(
                           'p-3 rounded-xl border-2 text-center transition-all',
                           delivery.availability === v.value
                             ? 'border-primary bg-primary/5 text-primary'
                             : 'border-border/60 bg-muted/20 hover:border-primary/30'
                         )}>
                         <Calendar className="w-5 h-5 mx-auto mb-1" />
                         <span className="text-sm font-medium">{v.label}</span>
                       </button>
                     ))}
                   </div>
                 </div>
                 {delivery.availability === 'part-time' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
                       <Input type="time" value={delivery.startTime} onChange={updateDelivery('startTime')} />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-foreground mb-1.5 block">End Time</label>
                       <Input type="time" value={delivery.endTime} onChange={updateDelivery('endTime')} />
                     </div>
                   </div>
                 )}
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Work Zone (Pincodes)</label>
                   <p className="text-xs text-muted-foreground mb-2">Select the areas/pincodes where you want to deliver</p>
                   <div className="flex flex-wrap gap-1.5 mb-2">
                     {delivery.deliveryZone.map(zone => (
                       <span key={zone} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                         <MapPinned className="w-2.5 h-2.5" /> {zone}
                         <button onClick={() => toggleDeliveryZone(zone)}><X className="w-2.5 h-2.5 ml-0.5 hover:text-destructive" /></button>
                       </span>
                     ))}
                   </div>
                   <Input value={delivery.pincode} onChange={e => { if (e.target.value && e.target.value.length >= 3) toggleDeliveryZone(e.target.value); }} placeholder="Enter pincode and press Enter" onKeyDown={e => { if (e.key === 'Enter' && e.target.value.length >= 3) { toggleDeliveryZone(e.target.value); e.target.value = ''; } }} />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">Emergency Contact</label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <Input value={delivery.emergencyContactName} onChange={updateDelivery('emergencyContactName')} placeholder="Contact name" />
                     </div>
                     <div>
                       <Input value={delivery.emergencyContactPhone} onChange={updateDelivery('emergencyContactPhone')} placeholder="Contact phone" />
                     </div>
                   </div>
                 </div>
               </div>
               {navButtons()}
               <div className="flex justify-end mt-4">
                 <Button onClick={() => setStep(6)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                   Review & Submit <ArrowRight className="w-4 h-4" />
                 </Button>
               </div>
             </motion.div>
           )}

           {/* Delivery Step 6: Review & Submit */}
           {step === 6 && type === 'delivery' && (
             <motion.div key="d-s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Review & Submit', 'Please verify all details before submitting')}
               <div className="space-y-3 mb-6">
                 <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                   <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/30">
                     <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                       <Truck className="w-5 h-5 text-amber-600" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-foreground">Delivery Partner</p>
                       <p className="text-xs text-muted-foreground">{delivery.name || 'Name not set'}</p>
                     </div>
                   </div>
                   <div className="p-4 space-y-3 text-sm">
                     <div>
                       <p className="text-xs font-semibold text-muted-foreground mb-2">Personal Details</p>
                       <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                         <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /><span>{delivery.name}</span></div>
                         <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span>{delivery.phone}</span></div>
                         {delivery.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /><span>{delivery.email}</span></div>}
                         <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /><span>{delivery.dateOfBirth} ({delivery.gender})</span></div>
                         <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /><span>{delivery.address}, {delivery.city} - {delivery.pincode}</span></div>
                       </div>
                     </div>
                     <div>
                       <p className="text-xs font-semibold text-muted-foreground mb-2">Vehicle</p>
                       <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                         <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-muted-foreground" /><span className="capitalize">{delivery.vehicleType || 'Not specified'}</span></div>
                          {delivery.vehicleNumber && <div className="flex items-center gap-2"><span className="w-3.5" />Vehicle: {delivery.vehicleNumber}</div>}
                       </div>
                     </div>
                     <div>
                       <p className="text-xs font-semibold text-muted-foreground mb-2">Bank Details</p>
                       <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                         <div className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 text-muted-foreground" /><span>A/c: {delivery.bankAccountNumber}</span></div>
                          <div className="flex items-center gap-2"><span className="w-3.5" />IFSC: {delivery.bankIfsc}</div>
                          {delivery.upiId && <div className="flex items-center gap-2"><span className="w-3.5" />UPI: {delivery.upiId}</div>}
                       </div>
                     </div>
                     <div>
                       <p className="text-xs font-semibold text-muted-foreground mb-2">Documents Uploaded</p>
                       <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                         {deliveryDocs.aadharFront && <div className="flex items-center gap-2"><FileImage className="w-3.5 h-3.5 text-success" /><span className="text-success">Aadhar Front</span></div>}
                         {deliveryDocs.aadharBack && <div className="flex items-center gap-2"><FileImage className="w-3.5 h-3.5 text-success" /><span className="text-success">Aadhar Back</span></div>}
                         {deliveryDocs.photo && <div className="flex items-center gap-2"><Image className="w-3.5 h-3.5 text-success" /><span className="text-success">Profile Photo</span></div>}
                         {deliveryDocs.panCard && <div className="flex items-center gap-2"><FileImage className="w-3.5 h-3.5 text-success" /><span className="text-success">PAN Card</span></div>}
                         {deliveryDocs.drivingLicense && <div className="flex items-center gap-2"><FileImage className="w-3.5 h-3.5 text-success" /><span className="text-success">Driving License</span></div>}
                         {deliveryDocs.rc && <div className="flex items-center gap-2"><FileImage className="w-3.5 h-3.5 text-success" /><span className="text-success">RC Certificate</span></div>}
                       </div>
                     </div>
                     <div>
                       <p className="text-xs font-semibold text-muted-foreground mb-2">Work Preferences</p>
                       <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                         <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="capitalize">{delivery.availability}</span></div>
                         {delivery.deliveryZone.length > 0 && (
                           <div className="flex items-start gap-2">
                             <MapPinned className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                             <div className="flex flex-wrap gap-1">
                               {delivery.deliveryZone.map(z => <Badge key={z} variant="secondary" className="text-[10px]">{z}</Badge>)}
                             </div>
                           </div>
                         )}
                         {delivery.emergencyContactName && (
                           <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /><span>Emergency: {delivery.emergencyContactName} ({delivery.emergencyContactPhone})</span></div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>

                 <label className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-border/40 cursor-pointer">
                   <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border accent-primary" />
                   <div>
                     <p className="text-sm font-medium text-foreground">I confirm that all provided information is accurate</p>
                     <p className="text-xs text-muted-foreground mt-0.5">By submitting, you agree to FindMedi's <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Your registration will be reviewed by our team.</p>
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

           {/* Delivery OTP Verification */}
           {deliveryOtpSent && (
             <motion.div key="d-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Verify Your Email', 'Enter the OTP sent to your email to complete registration')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                 <div>
                   <label className="text-sm font-medium text-foreground mb-1.5 block">OTP Code</label>
                   <Input value={deliveryOtp} onChange={e => setDeliveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" className="text-center text-lg tracking-widest" maxLength={6} />
                 </div>
                 {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                 <div className="flex gap-3">
                   <Button variant="outline" onClick={() => navigate('/login')} className="flex-1">
                     Skip for Now
                   </Button>
                   <Button onClick={handleDeliveryOtp} disabled={deliveryOtp.length !== 6 || loading} className="flex-1 gap-2">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
                   </Button>
                 </div>
                 <p className="text-xs text-muted-foreground text-center">
                   Didn't receive the OTP? Check your spam folder or <Link to="/login" className="text-primary hover:underline">login directly</Link>.
                 </p>
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
                    <Input type={showPassword ? 'text' : 'password'} value={account.password} onChange={updateAccount('password')} placeholder="Min 8 characters" className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {account.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passwordStrength.score ? passwordStrength.color : 'bg-border'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{passwordStrength.label}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Use this password to login to your dashboard after approval</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={`pl-10 ${confirmPassword && account.password !== confirmPassword ? 'border-destructive' : ''}`} />
                  </div>
                  {confirmPassword && account.password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
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

                <details className="group">
                  <summary className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer py-2 select-none">
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" /> Additional Details
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block"><Image className="w-3.5 h-3.5 inline mr-1" /> Logo URL</label>
                        <Input value={facility.logo} onChange={updateFacility('logo')} placeholder="https://..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block"><Image className="w-3.5 h-3.5 inline mr-1" /> Cover Image URL</label>
                        <Input value={facility.image} onChange={updateFacility('image')} placeholder="https://..." />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-muted-foreground">Weekly Schedule</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(facility.weekSchedule).map(([day, time]) => (
                        <div key={day}>
                          <label className="text-[10px] font-medium text-muted-foreground capitalize block mb-0.5">{day}</label>
                          <Input value={time} onChange={e => setFacility(p => ({ ...p, weekSchedule: { ...p.weekSchedule, [day]: e.target.value } }))} placeholder="9AM-6PM" className="h-8 text-xs" />
                        </div>
                      ))}
                    </div>

<p className="text-xs font-semibold text-muted-foreground">Amenities</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(type === 'pharmacy'
                         ? [
                             { key: 'parking', label: 'Parking' },
                             { key: 'acWaitingArea', label: 'AC Waiting Area' },
                             { key: 'wheelchairAccess', label: 'Wheelchair Access' },
                             { key: 'cardPayment', label: 'Card/UPI Payment' },
                             { key: 'homeDelivery', label: 'Home Delivery' },
                             { key: 'prescriptionUpload', label: 'Prescription Upload' },
                           ]
                         : [
                             { key: 'parking', label: 'Parking' },
                             { key: 'acWaitingArea', label: 'AC Waiting Area' },
                             { key: 'wheelchairAccess', label: 'Wheelchair Access' },
                             { key: 'cardPayment', label: 'Card Payment' },
                             { key: 'inHousePharmacy', label: 'In-House Pharmacy' },
                             { key: 'drinkingWater', label: 'Drinking Water' },
                             { key: 'wifi', label: 'Free Wi-Fi' },
                             { key: 'homeVisit', label: 'Home Visit' },
                           ]
                       ).map(({ key, label }) => (
                         <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                           <input type="checkbox" checked={facility.amenities[key]} onChange={e => updateAmenity(key)(e.target.checked)} className="w-3.5 h-3.5 rounded border-border accent-primary" />
                           {label}
                         </label>
                       ))}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Insurance Accepted</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {facility.insurance.map((ins, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Shield className="w-2.5 h-2.5" /> {ins}
                            <button onClick={() => setFacility(p => ({ ...p, insurance: p.insurance.filter((_, j) => j !== i) }))}><X className="w-2.5 h-2.5 ml-0.5 hover:text-destructive" /></button>
                          </span>
                        ))}
                      </div>
                      {addingInsurance ? (
                        <div className="flex items-center gap-2">
                          <Input value={newInsurance} onChange={e => setNewInsurance(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addInsurance(); if (e.key === 'Escape') { setAddingInsurance(false); setNewInsurance(''); } }} placeholder="Enter insurance provider name" className="h-8 text-xs flex-1" autoFocus />
                          <Button size="sm" onClick={addInsurance} className="h-8 text-xs"><Check className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setAddingInsurance(false); setNewInsurance(''); }} className="h-8 text-xs text-muted-foreground"><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setAddingInsurance(true)} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" /> Add Insurance</Button>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Accreditations</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {facility.accreditations.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Award className="w-2.5 h-2.5" /> {a}
                            <button onClick={() => setFacility(p => ({ ...p, accreditations: p.accreditations.filter((_, j) => j !== i) }))}><X className="w-2.5 h-2.5 ml-0.5 hover:text-destructive" /></button>
                          </span>
                        ))}
                      </div>
                      {addingAccreditation ? (
                        <div className="flex items-center gap-2">
                          <Input value={newAccreditation} onChange={e => setNewAccreditation(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addAccreditation(); if (e.key === 'Escape') { setAddingAccreditation(false); setNewAccreditation(''); } }} placeholder="Enter accreditation (e.g. NABH, NABL, ISO)" className="h-8 text-xs flex-1" autoFocus />
                          <Button size="sm" onClick={addAccreditation} className="h-8 text-xs"><Check className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setAddingAccreditation(false); setNewAccreditation(''); }} className="h-8 text-xs text-muted-foreground"><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setAddingAccreditation(true)} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" /> Add Accreditation</Button>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Social Links</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input value={facility.socialLinks.facebook} onChange={e => setFacility(p => ({ ...p, socialLinks: { ...p.socialLinks, facebook: e.target.value } }))} placeholder="Facebook URL" className="h-8 text-xs" />
                        <Input value={facility.socialLinks.instagram} onChange={e => setFacility(p => ({ ...p, socialLinks: { ...p.socialLinks, instagram: e.target.value } }))} placeholder="Instagram URL" className="h-8 text-xs" />
                        <Input value={facility.socialLinks.youtube} onChange={e => setFacility(p => ({ ...p, socialLinks: { ...p.socialLinks, youtube: e.target.value } }))} placeholder="YouTube URL" className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              {navButtons()}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(4)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Doctors & Services — only for hospital/clinic */}
          {step === 4 && (type === 'hospital' || type === 'clinic') && (
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
 <Button onClick={() => setStep(maxStep)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                   Continue <ArrowRight className="w-4 h-4" />
                 </Button>
               </div>
             </motion.div>
           )}

           {/* Step 4: Specialist Details — only for diagnostic */}
           {step === 4 && type === 'diagnostic' && (
             <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               {stepHeader('Specialist Details', 'Add key personnel for your diagnostic center')}
               <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Pathologist</p>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={specialist.pathologistName} onChange={e => setSpecialist(p => ({ ...p, pathologistName: e.target.value }))} placeholder="Dr. name" /></div>
                   <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={specialist.pathologistQualification} onChange={e => setSpecialist(p => ({ ...p, pathologistQualification: e.target.value }))} placeholder="MD Pathology, DNB" /></div>
                 </div>
                 <Separator />
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Radiologist</p>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={specialist.radiologistName} onChange={e => setSpecialist(p => ({ ...p, radiologistName: e.target.value }))} placeholder="Dr. name" /></div>
                   <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={specialist.radiologistQualification} onChange={e => setSpecialist(p => ({ ...p, radiologistQualification: e.target.value }))} placeholder="MD Radiology" /></div>
                 </div>
                 <Separator />
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Cardiologist</p>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={specialist.cardiologistName} onChange={e => setSpecialist(p => ({ ...p, cardiologistName: e.target.value }))} placeholder="Dr. name" /></div>
                   <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={specialist.cardiologistQualification} onChange={e => setSpecialist(p => ({ ...p, cardiologistQualification: e.target.value }))} placeholder="MD Cardiology" /></div>
                 </div>
                 <Separator />
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Technician</p>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={specialist.technicianName} onChange={e => setSpecialist(p => ({ ...p, technicianName: e.target.value }))} placeholder="Technician name" /></div>
                   <div className="space-y-1"><Label className="text-xs">Role</Label><Input value={specialist.technicianRole} onChange={e => setSpecialist(p => ({ ...p, technicianRole: e.target.value }))} placeholder="Lab Technician / Phlebotomist" /></div>
                   <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={specialist.technicianQualification} onChange={e => setSpecialist(p => ({ ...p, technicianQualification: e.target.value }))} placeholder="B.Sc, MLT" /></div>
                   <div className="space-y-1"><Label className="text-xs">Experience</Label><Input value={specialist.technicianExperience} onChange={e => setSpecialist(p => ({ ...p, technicianExperience: e.target.value }))} placeholder="e.g. 3 years" /></div>
                 </div>
               </div>
               {navButtons()}
               <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(maxStep)} disabled={!canProceed()} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  Review & Submit <ArrowRight className="w-4 h-4" />
                </Button>
               </div>
             </motion.div>
           )}

           {/* Step 5: Review & Submit */}
           {step === maxStep && (
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
                    <p className="text-xs text-muted-foreground mt-0.5">By submitting, you agree to FindMedi's <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Your registration will be reviewed by our team.</p>
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


