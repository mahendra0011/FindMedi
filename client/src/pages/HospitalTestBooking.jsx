import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
   FlaskConical, Search, Clock, Home, Lock, ShoppingCart,
   ChevronRight, Heart, Sparkles, Plus, Minus, Activity,
   ArrowLeft, MapPin, Phone, Star, BadgeCheck,
   Building2, X, CreditCard, Wallet, CheckCircle,
   Calendar, Sun, Moon, MapPinHouse, ChevronLeft,
   Banknote, Shield, ShieldCheck, Camera
 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const DEPARTMENTS = [
  { id:'all', name:'All Departments', icon:FlaskConical, color:'from-primary/20 to-primary/5', textColor:'text-primary', hoverColor:'hover:border-primary/40' },
  { id:'Pathology', name:'Pathology', icon:FlaskConical, color:'from-blue-500/20 to-blue-500/5', textColor:'text-blue-500', hoverColor:'hover:border-blue-500/40' },
  { id:'Radiology', name:'Radiology', icon:Activity, color:'from-purple-500/20 to-purple-500/5', textColor:'text-purple-500', hoverColor:'hover:border-purple-500/40' },
  { id:'Cardiology', name:'Cardiology', icon:Heart, color:'from-red-500/20 to-red-500/5', textColor:'text-red-500', hoverColor:'hover:border-red-500/40' },
  { id:'Health Packages', name:'Health Packages', icon:Sparkles, color:'from-emerald-400/25 to-emerald-400/5', textColor:'text-emerald-500', hoverColor:'hover:border-emerald-500/40' },
];

const TIME_SLOTS = ['09:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00'];

const PAYMENT_METHODS = [
  { id:'cod', label:'Cash on Delivery', icon:Banknote },
  { id:'upi', label:'UPI / GPay / PhonePe', icon:Wallet },
  { id:'card', label:'Debit / Credit Card', icon:CreditCard },
];

const FASTING_TESTS = ['Blood Glucose (Fasting)', 'Lipid Profile'];

const STEP_LABELS = ['Prescription', 'Collection', 'Slot', 'Summary', 'Payment', 'Done'];

export default function HospitalTestBooking() {
  const { entityId, hospitalId } = useParams();
  const activeId = entityId || hospitalId;
  const navigate = useNavigate();
  const [testSearch, setTestSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [rxFilter, setRxFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('popularity');
  const [testCart, setTestCart] = useState({});
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [collectionMode, setCollectionMode] = useState('lab');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [hospital, setHospital] = useState(null);
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      try {
        let entityData = null;
        let entityType = 'hospital';
        const [hospitalRes, facilityRes] = await Promise.allSettled([
          api.getHospital(activeId),
          api.getFacility(activeId),
        ]);
        if (hospitalRes.status === 'fulfilled') {
          entityData = hospitalRes.value?.hospital || hospitalRes.value;
          entityType = 'hospital';
        } else if (facilityRes.status === 'fulfilled') {
          const f = facilityRes.value?.facility || facilityRes.value;
          if (f) {
            entityData = f;
            entityType = f.type || 'facility';
          }
        }
        setHospital(entityData);

        const entityTestId = entityData?._id || activeId;
        const params = entityType === 'hospital' ? { hospitalId: entityTestId } : {};
        const testsRes = await api.getTests(params).catch(() => []);
        const list = Array.isArray(testsRes) ? testsRes : testsRes?.tests || [];
        const mapped = list.map(t => ({
          id: t._id,
          _id: t._id,
          name: t.name,
          dept: t.category || t.department || 'Pathology',
          category: t.category,
          department: t.department,
          price: t.price,
          mrp: t.mrp || t.price,
          reportTime: t.reportTime || '24 hrs',
          homeCollection: t.homeCollection || false,
          rx: t.prescriptionReq || false,
          prescriptionReq: t.prescriptionReq || false,
          popular: t.popular || false,
        }));
        setTests(mapped);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [activeId]);

  const addToCart = (testId) => setTestCart(p => ({ ...p, [testId]: (p[testId] || 0) + 1 }));
  const removeFromCart = (testId) => setTestCart(p => {
    const next = { ...p };
    if (next[testId] <= 1) delete next[testId];
    else next[testId]--;
    return next;
  });

  let filtered = tests.filter(t => {
    if (deptFilter !== 'all' && t.dept !== deptFilter) return false;
    if (testSearch && !t.name.toLowerCase().includes(testSearch.toLowerCase())) return false;
    if (priceFilter !== 'all') {
      if (priceFilter === '0-500' && t.price >= 500) return false;
      if (priceFilter === '500-2000' && (t.price < 500 || t.price > 2000)) return false;
      if (priceFilter === '2000+' && t.price <= 2000) return false;
    }
    if (rxFilter !== 'all') {
      if (rxFilter === 'direct' && t.rx) return false;
      if (rxFilter === 'rx' && !t.rx) return false;
    }
    if (collectionFilter !== 'all') {
      if (collectionFilter === 'home' && !t.homeCollection) return false;
      if (collectionFilter === 'lab' && t.homeCollection) return false; 
    }
    return true;
  });

  if (sortFilter === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortFilter === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortFilter === 'popularity') {
    filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  }

  const cartItems = Object.entries(testCart).map(([tid, qty]) => {
    const test = tests.find(t => t.id === tid);
    return { ...test, qty };
  }).filter(Boolean);

  const cartTotal = cartItems.reduce((s, t) => s + t.price * t.qty, 0);
  const cartCount = cartItems.reduce((s, t) => s + t.qty, 0);
  const hasRx = cartItems.some(t => t.rx);
  const hasFasting = cartItems.some(t => FASTING_TESTS.some(f => t.name.includes(f)));

  const openBooking = () => { setBookingStep(1); setShowBooking(true); setBookingConfirmed(false); };
  const closeBooking = () => setShowBooking(false);
  const nextStep = () => setBookingStep(p => Math.min(p + 1, 6));
  const prevStep = () => setBookingStep(p => Math.max(p - 1, 1));

  const confirmBooking = async () => {
    if (!user) { toast.error('Please login to book'); navigate('/login'); return; }
    setBookingLoading(true);
    try {
      const res = await api.createLabBooking({
        facilityId: activeId,
        patientId: user._id,
        patientName: user.name,
        email: user.email,
        phone: user.phone || '',
        tests: cartItems.map(t => ({ testId: t.id, testName: t.name, price: t.price, qty: t.qty })),
        total: cartTotal,
        collectionMode,
        date: selectedDate,
        slot: selectedSlot,
        paymentMethod,
        status: 'Confirmed',
      });
      const newId = res?.booking?._id || res?._id || 'MED' + Date.now().toString(36).toUpperCase();
      setBookingId(newId);
      setBookingConfirmed(true);
      setBookingStep(6);
      toast.success('Booking confirmed!');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to confirm booking');
    }
    setBookingLoading(false);
  };

  const closeComplete = () => {
    setShowBooking(false);
    setTestCart({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayHospital = hospital || { _id: activeId, name: hospital?.name || 'Healthcare Provider', rating: 0, address: '', verified: false };

  const StepContent = ({ step }) => {
    switch (step) {
      case 1:
        return (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="font-heading font-bold text-lg text-foreground">Prescription Check</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Verify if prescription is needed for selected tests</p>
            </div>
            {hasRx ? (
              <>
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Prescription Required</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">Upload your prescription to proceed with Rx tests</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Camera / Gallery</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG</p>
                    </div>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Upload PDF</p>
                      <p className="text-[10px] text-muted-foreground">Max 5MB</p>
                    </div>
                  </button>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  Your documents are encrypted and secure
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-xl p-6 text-center border border-emerald-200 dark:border-emerald-500/20">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">No Prescription Required</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">All selected tests are Direct — you're good to go!</p>
              </div>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="font-heading font-bold text-lg text-foreground">Collection Mode</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to provide samples</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id:'lab', icon:MapPinHouse, label:'Visit Lab', desc:'No extra charge', sub:'Sample at our center' },
                { id:'home', icon:Home, label:'Home Collection', desc:'+₹50 fee', sub:'We come to your door' },
              ].map(opt => {
                const Icon = opt.icon;
                const active = collectionMode === opt.id;
                return (
                  <button key={opt.id} onClick={() => setCollectionMode(opt.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center',
                      active
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                    )}>
                    {active && (
                      <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-all', active ? 'bg-gradient-to-br from-primary/20 to-primary/5' : 'bg-muted/50')}>
                      <Icon className={cn('w-7 h-7', active ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className={cn('text-sm font-bold', active ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                      <p className={cn('text-[11px] mt-0.5', active ? 'text-primary/70' : 'text-muted-foreground')}>{opt.desc}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">{opt.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="font-heading font-bold text-lg text-foreground">Select Date & Time</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pick your preferred slot</p>
            </div>
            {hasFasting && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Fasting Required</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">12 hrs fasting needed. Morning slots recommended for: <strong>Blood Sugar (Fasting), Lipid Profile</strong></p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Select Date</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {['Mon 21','Tue 22','Wed 23','Thu 24','Fri 25','Sat 26'].map(d => (
                  <button key={d} onClick={() => setSelectedDate(d)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all shrink-0 min-w-[72px]',
                      selectedDate === d
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/60 bg-card hover:border-primary/30'
                    )}>
                    <span className={cn('text-[11px] font-bold', selectedDate === d ? 'text-primary' : 'text-foreground')}>{d.split(' ')[0]}</span>
                    <span className={cn('text-lg font-bold', selectedDate === d ? 'text-primary' : 'text-foreground')}>{d.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Select Time Slot</p>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map(s => {
                  const isMorning = s.startsWith('09') || s.startsWith('10') || s.startsWith('11');
                  return (
                    <button key={s} onClick={() => setSelectedSlot(s)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                        selectedSlot === s
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/60 bg-card hover:border-primary/30'
                      )}>
                      {isMorning ? <Sun className={cn('w-4 h-4', selectedSlot === s ? 'text-primary' : 'text-muted-foreground')} /> : <Moon className={cn('w-4 h-4', selectedSlot === s ? 'text-primary' : 'text-muted-foreground')} />}
                      <span className={cn('text-xs font-semibold flex-1', selectedSlot === s ? 'text-primary' : 'text-foreground')}>{s}</span>
                      {selectedSlot === s && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="font-heading font-bold text-lg text-foreground">Bill Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review your order details</p>
            </div>
            <div className="bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl border border-border/40 p-5 space-y-3">
              {cartItems.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-[9px] text-muted-foreground">Qty: {t.qty}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">₹{t.price * t.qty}</span>
                </div>
              ))}
              <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Home Collection Fee</span>
                </div>
                <span className={cn('text-xs font-semibold', collectionMode === 'home' ? 'text-foreground' : 'text-muted-foreground')}>
                  {collectionMode === 'home' ? '+₹50' : '—'}
                </span>
              </div>
              <div className="border-t-2 border-border/60 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total Amount</span>
                <span className="text-lg font-bold text-primary">₹{cartTotal + (collectionMode === 'home' ? 50 : 0)}</span>
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
              <Shield className="w-4 h-4 shrink-0" />
              Secure payment • You can cancel before sample collection
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="font-heading font-bold text-lg text-foreground">Payment Method</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Choose how you'd like to pay</p>
            </div>
            <div className="space-y-2.5">
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                const active = paymentMethod === pm.id;
                return (
                  <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                    className={cn(
                      'relative flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all',
                      active
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                    )}>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', active ? 'bg-gradient-to-br from-primary/20 to-primary/5' : 'bg-muted/50')}>
                      <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('text-sm font-semibold flex-1 text-left', active ? 'text-primary' : 'text-foreground')}>{pm.label}</span>
                    {active && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3 inline mr-1" />
              Your payment info is encrypted
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div key="s6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
            <div className="text-center pt-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-400/5 flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}>
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </motion.div>
              </div>
              <h3 className="font-heading font-bold text-xl text-foreground">Booking Confirmed!</h3>
              <div className="mt-2 inline-block bg-muted/50 rounded-full px-4 py-1.5 border border-border/40">
                <span className="text-[11px] text-muted-foreground">Booking ID: </span>
                <span className="text-xs font-bold font-mono text-foreground tracking-wider">{bookingId}</span>
              </div>
            </div>
            <div className="bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="text-sm font-semibold text-foreground">{selectedDate} at {selectedSlot}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {collectionMode === 'home' ? <Home className="w-4 h-4 text-primary" /> : <MapPinHouse className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collection</p>
                  <p className="text-sm font-semibold text-foreground">{collectionMode === 'home' ? 'Home Collection' : 'Visit Lab'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tests</p>
                  <p className="text-sm font-semibold text-foreground">{cartCount} test{cartCount > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="text-sm font-semibold text-foreground">₹{cartTotal + (collectionMode === 'home' ? 50 : 0)}</p>
                </div>
              </div>
            </div>
            {hasFasting && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300"><strong>Remember:</strong> 12 hrs fasting required before your slot</p>
                </div>
              </div>
            )}
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate(-1)} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        {/* Hospital Info Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/50 p-4 mb-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-foreground text-base truncate">{displayHospital.name}</h1>
              {displayHospital.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{displayHospital.address || displayHospital.city || 'Address not available'}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{displayHospital.rating || '—'}</span>
            </div>
          </div>
            <Link to={`/book-test/${activeId}`}>
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
              <Building2 className="w-3.5 h-3.5" /> View Profile
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">
          {tests.length} Tests Available at {displayHospital.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Select tests to book</p>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={testSearch} onChange={e => setTestSearch(e.target.value)}
            placeholder="Search tests..." className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
        </div>

        {/* Department Filter Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-5">
          {DEPARTMENTS.map(dept => {
            const Icon = dept.icon;
            const isActive = deptFilter === dept.id;
            const count = dept.id === 'all' ? tests.length : tests.filter(t => t.dept === dept.id).length;
            return (
              <motion.button key={dept.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setDeptFilter(dept.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all',
                  isActive ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-border/60 bg-card hover:shadow-sm',
                  dept.hoverColor
                )}>
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center', dept.color)}>
                  <Icon className={cn('w-5 h-5', dept.textColor)} />
                </div>
                <span className={cn('text-[11px] font-semibold text-center leading-tight', isActive ? 'text-primary' : 'text-foreground')}>{dept.name}</span>
                <span className="text-[9px] text-muted-foreground">{count}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Extra Filters Row */}
        <div className="flex flex-wrap gap-2 mb-6">
          <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className="h-8 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">Price: All</option>
            <option value="0-500">Under ₹500</option>
            <option value="500-2000">₹500 - ₹2000</option>
            <option value="2000+">₹2000+</option>
          </select>
          <select value={rxFilter} onChange={e => setRxFilter(e.target.value)} className="h-8 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Tests</option>
            <option value="direct">Direct Only</option>
            <option value="rx">Prescription Required</option>
          </select>
          <select value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)} className="h-8 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">Any Collection</option>
            <option value="home">Home Collection</option>
            <option value="lab">Lab Visit Only</option>
          </select>
          <select value={sortFilter} onChange={e => setSortFilter(e.target.value)} className="h-8 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="popularity">Sort: Popularity</option>
            <option value="price-low">Sort: Price (Low)</option>
            <option value="price-high">Sort: Price (High)</option>
          </select>
        </div>

        {/* Test Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tests found</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setTestSearch(''); setDeptFilter('all'); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((test, i) => (
              <motion.div key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col"
              >
                {test.package ? (
                  <div className="p-4 pb-3 flex flex-col flex-1 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-400/5 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-heading font-semibold text-sm text-foreground leading-tight">{test.name}</h4>
                        <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-500/12 px-2 py-0.5 rounded-full mt-1.5">Health Package</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {test.includes?.map((inc, j) => (
                        <span key={j} className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/30">{inc}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold text-foreground">₹{test.price}</span>
                          {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through">₹{test.mrp}</span>}
                          {test.mrp > test.price && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/12 px-1.5 py-0.5 rounded-full">{Math.round((1 - test.price/test.mrp) * 100)}% off</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Reports in {test.reportTime}</p>
                      </div>
                      {testCart[test.id] ? (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => removeFromCart(test.id)}>
                             <Minus className="w-3 h-3" />
                           </Button>
                           <span className="w-5 text-center text-[11px] font-bold">{testCart[test.id]}</span>
                           <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addToCart(test.id)}>
                             <Plus className="w-3 h-3" />
                           </Button>
                         </div>
                       ) : (
                         <Button size="sm" className="rounded-lg text-[10px] h-8" onClick={() => addToCart(test.id)}>Add</Button>
                       )}
                     </div>
                   </div>
                 ) : (
                   <div className="p-4 pb-3 flex-1 flex flex-col">
                     <div className="flex items-start justify-between gap-2 mb-1">
                       <h4 className="font-heading font-semibold text-sm text-foreground leading-tight">{test.name}</h4>
                       {test.rx ? (
                         <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0"><Lock className="w-2 h-2" /> Rx</span>
                       ) : (
                         <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Direct</span>
                       )}
                     </div>
                     <p className="text-[10px] text-muted-foreground mb-1">{test.dept}</p>
                     <div className="flex items-center gap-2 mb-2">
                       <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                         <Clock className="w-2.5 h-2.5" /> {test.reportTime}
                       </span>
                       {test.homeCollection && (
                         <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                           <Home className="w-2 h-2" /> Home
                         </span>
                       )}
                     </div>
                     <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/30">
                       <div>
                         <span className="text-base font-bold text-foreground">₹{test.price}</span>
                         {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through ml-1">₹{test.mrp}</span>}
                       </div>
                       {test.rx ? (
                         <Button size="sm" className="rounded-lg text-[10px] h-8 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { addToCart(test.id); toast.success(`${test.name} added`); }}>
                           <Lock className="w-3 h-3" /> Add
                         </Button>
                       ) : testCart[test.id] ? (
                         <div className="flex items-center gap-1">
                           <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => removeFromCart(test.id)}>
                             <Minus className="w-3 h-3" />
                           </Button>
                           <span className="w-5 text-center text-[11px] font-bold">{testCart[test.id]}</span>
                           <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addToCart(test.id)}>
                             <Plus className="w-3 h-3" />
                           </Button>
                         </div>
                      ) : (
                        <Button size="sm" className="rounded-lg text-[10px] h-8" onClick={() => addToCart(test.id)}>Add</Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Bar */}
      {cartCount > 0 && !showBooking && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{cartCount} test{cartCount > 1 ? 's' : ''} selected</span>
                <span className="text-lg font-bold text-foreground block leading-tight">₹{cartTotal}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setTestCart({}); toast.success('Cart cleared'); }}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button className="gap-2 rounded-xl shadow-lg shadow-primary/30 px-6 h-11" onClick={openBooking}>
                Proceed <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeBooking(); }}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={cn(
                'w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden',
                'max-h-[92vh] flex flex-col'
              )}>
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border/30 shrink-0">
                <div className="min-w-[60px]">
                  {bookingStep > 1 && bookingStep < 6 && (
                    <button onClick={prevStep} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-foreground">{bookingStep <= 6 ? STEP_LABELS[bookingStep - 1] : ''}</h4>
                </div>
                <div className="min-w-[60px] flex justify-end">
                  <button onClick={closeBooking} className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="px-5 pt-4 pb-2 shrink-0">
                <div className="flex items-center justify-center gap-1">
                  {STEP_LABELS.map((label, i) => {
                    const idx = i + 1;
                    const isDone = bookingStep > idx;
                    const isCurrent = bookingStep === idx;
                    return (
                      <div key={idx} className="flex items-center gap-1">
                        {i > 0 && (
                          <div className={cn('w-5 sm:w-8 h-0.5 rounded-full transition-colors', isDone ? 'bg-primary' : 'bg-border')} />
                        )}
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all shrink-0',
                          isDone ? 'bg-primary text-white' : isCurrent ? 'bg-primary/10 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground border-2 border-transparent'
                        )}>
                          {isDone ? <CheckCircle className="w-3 h-3" /> : idx}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <StepContent step={bookingStep} />
              </div>

              {/* Footer Buttons */}
              <div className="px-5 py-4 border-t border-border/30 shrink-0 bg-muted/10">
                {bookingStep === 1 && (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl h-11 text-sm" onClick={closeBooking}>Cancel</Button>
                    <Button className="flex-1 rounded-xl h-11 text-sm gap-1.5 shadow-lg shadow-primary/20" onClick={nextStep}>
                      {hasRx ? 'Skip Prescription' : 'Continue'} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {bookingStep === 2 && (
                  <Button className="w-full rounded-xl h-11 text-sm gap-1.5 shadow-lg shadow-primary/20" onClick={nextStep}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {bookingStep === 3 && (
                  <Button className="w-full rounded-xl h-11 text-sm gap-1.5 shadow-lg shadow-primary/20" onClick={nextStep}
                    disabled={!selectedDate || !selectedSlot}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {bookingStep === 4 && (
                  <Button className="w-full rounded-xl h-11 text-sm gap-1.5 shadow-lg shadow-primary/20" onClick={nextStep}>
                    Proceed to Pay <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {bookingStep === 5 && (
                  <Button className="w-full rounded-xl h-11 text-sm gap-1.5 shadow-lg shadow-primary/20" onClick={confirmBooking}>
                    Pay ₹{cartTotal + (collectionMode === 'home' ? 50 : 0)} <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {bookingStep === 6 && (
                  <Button className="w-full rounded-xl h-11 text-sm gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20" onClick={closeComplete}>
                    Done <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
