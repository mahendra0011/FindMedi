import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Star, Phone, Stethoscope, CalendarDays,
  IndianRupee, ArrowLeft, Search, Shield, Award, Clock, Users,
  BedDouble, Ambulance, Share2, ChevronRight, Home, BadgeCheck,
  Navigation, AlertCircle, HeartPulse, CheckCircle2,
  ChevronDown, ChevronUp, FlaskRound, Quote, Mail,
  Circle, Heart, Eye, Sparkles, TrendingUp, Brain, Bone, Baby, Activity,
  FlaskConical, ShoppingCart, Lock, Plus, Minus, Zap,
  ChevronLeft, Scissors, Syringe, Droplets, Pill, Microscope,
  Car, Wind, CreditCard, Bookmark,
  Globe, Printer, Info, HelpCircle, Accessibility, Loader2,
  Ambulance as AmbulanceIcon, Percent, Handshake, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };

const SectionTitle = ({ icon:Icon, label }) => (
  <h2 className="font-heading text-lg font-bold text-foreground mb-5 flex items-center gap-2">
    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </span>
    {label}
  </h2>
);

const SideCard = ({ children, className }) => (
  <div className={cn('bg-card rounded-2xl border border-border/50 shadow-sm p-5', className)}>{children}</div>
);

const ServiceItem = ({ name, price, index }) => {
  const icons = [Sparkles, Syringe, Droplets, Zap, Scissors, Pill, Microscope, FlaskConical];
  const colors = ['text-blue-500','text-purple-500','text-emerald-500','text-rose-500','text-amber-500','text-cyan-500','text-indigo-500','text-pink-500'];
  const Icon = icons[index % icons.length];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer">
      <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', colors[index % colors.length].replace('text-','from-').replace('-500','-500/20').replace('from', '') + ' to-transparent')}>
        <Icon className={cn('w-4 h-4', colors[index % colors.length])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{name}</p>
        <p className="text-[10px] text-muted-foreground">Starting from</p>
      </div>
      <span className="text-sm font-bold text-foreground whitespace-nowrap">₹{price}</span>
    </div>
  );
};

const FacilityItem = ({ label, icon:Icon, color, bg }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group cursor-default">
    <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', bg)}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
  </div>
);

const DayRow = ({ day, time }) => {
  const isToday = new Date().toLocaleDateString('en', { weekday:'long' }).toLowerCase().slice(0,3) === day;
  return (
    <div className={cn('flex items-center justify-between py-2.5 border-b border-border/20 last:border-0 px-3 rounded-xl transition-colors', isToday && 'bg-primary/5 -mx-3 px-6')}>
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', time === 'Closed' ? 'bg-red-500' : isToday ? 'bg-primary' : 'bg-muted-foreground/30')} />
        <span className={cn('text-sm capitalize font-medium', day === 'sun' ? 'text-red-500' : isToday ? 'text-primary font-semibold' : 'text-foreground')}>{day}</span>
        {isToday && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Today</span>}
      </div>
      <span className={cn('text-sm', time === 'Closed' ? 'text-red-500 font-medium' : 'text-muted-foreground')}>{time}</span>
    </div>
  );
};

const StatCard = ({ icon:Icon, value, label, color }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', color.replace('text-','from-').replace('-500','-500/20') + ' to-transparent')}>
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div>
      <p className="font-heading text-xl font-bold text-foreground leading-none mb-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const cp = doctor?.clinicProfile || {};
  const clinic = doctor ? {
    _id: doctor._id,
    name: cp.clinic_name || (doctor.name?.replace('Dr. ','') + ' Clinic'),
    category: doctor.specialization + ' Clinic',
    type: 'Clinic',
    rating: doctor.rating || 4.5,
    reviewsCount: doctor.reviews_count || 0,
    verified: doctor.approved || false,
    address: cp.clinic_address || doctor.location || '',
    city: (cp.clinic_address || doctor.location || '')?.split(',').pop()?.trim() || '',
    phone: doctor.phone || '',
    email: doctor.email || '',
    open: doctor.available,
    closingTime: doctor.time_slots?.slice(-1)?.[0] || '',
    established: cp.established_year || null,
    totalDoctors: 1,
    totalSpecialties: 1,
    totalPatients: doctor.patients || 0,
    description: doctor.bio || '',
    specialties: doctor.specialization ? [doctor.specialization] : [],
    treatments: cp.clinic_treatments || [],
    facilities: cp.clinic_facilities || [],
    timing: cp.clinic_timing || {},
    branches: [],
    license: cp.clinic_license || '',
    insurance: cp.clinic_insurance || [],
    paymentModes: ['Cash', 'UPI', 'Card'],
    faqs: cp.clinic_faqs || [],
    photos: cp.clinic_photos?.length ? cp.clinic_photos : [doctor.profile_photo || 'https://placehold.co/800x400/2563eb/ffffff?text=Clinic+Photo'],
    social: cp.social || {},
  } : null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doc = await api.getDoctor(clinicId);
        setDoctor(doc);
        const r = await api.getReviews({ doctorId: clinicId });
        setReviews(Array.isArray(r) ? r : r?.reviews || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [clinicId]);

  const doctors = doctor ? [doctor] : [];

  useEffect(() => { window.scrollTo(0, 0); }, [clinicId]);
  useEffect(() => {
    if (clinic?.photos?.length > 0) {
      const timer = setInterval(() => setActivePhoto(p => (p + 1) % clinic.photos.length), 4000);
      return () => clearInterval(timer);
    }
  }, [clinic?.photos?.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clinic details...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Clinic not found</h3>
          <Button variant="outline" onClick={() => navigate('/doctors')}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/doctors')} className="hover:text-foreground transition-colors flex items-center gap-1.5 group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> Find Clinic
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium truncate">{clinic.name}</span>
        </motion.div>

        {/* ════════ 1. HERO SECTION ════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Gallery */}
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-card border border-border/50 h-[300px] sm:h-[420px] group">
              {clinic.photos?.map((p, i) => (
                <div key={i} className={cn('absolute inset-0 transition-all duration-700', i === activePhoto ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}>
                  <img src={p} alt={`${clinic.name} photo ${i+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {clinic.photos?.map((_, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={cn('h-1.5 rounded-full transition-all duration-300', i === activePhoto ? 'bg-white w-8' : 'bg-white/40 w-1.5 hover:bg-white/70')} />
                ))}
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Bookmarked')}>
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Link copied!')}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-primary/90 text-white border-0 text-xs px-3 py-1.5 rounded-full shadow-lg">{clinic.category}</Badge>
              </div>
              <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
                <Badge variant="secondary" className="bg-black/40 text-white border-0 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {activePhoto + 1} / {clinic.photos?.length} Photos
                </Badge>
              </div>
            </div>

            {/* Info Card */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 flex flex-col shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-heading font-bold text-xl text-foreground leading-tight">{clinic.name}</h1>
                    {clinic.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-primary/80">{clinic.type}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-3.5 h-3.5', i <= Math.round(clinic.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                    </div>
                    <span className="text-sm font-bold text-foreground">{clinic.rating}</span>
                    <span className="text-xs text-muted-foreground">({clinic.reviewsCount} reviews)</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>{clinic.address}</span>
                </div>
                <a href={`tel:${clinic.phone}`} className="flex items-center gap-2.5 text-primary font-medium hover:underline group">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {clinic.phone}
                </a>
                {clinic.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    {clinic.email}
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className={cn('px-4 py-2.5 rounded-xl border text-sm text-center font-semibold flex items-center justify-center gap-2', clinic.open ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10')}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', clinic.open ? 'bg-emerald-500' : 'bg-red-500')} />
                {clinic.open ? `Open Now — Closes at ${clinic.closingTime}` : 'Closed'}
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={() => toast.success('Booking coming soon')}>
                  <CalendarDays className="w-4 h-4" /> Book Appointment
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => toast.success('Opening directions...')}>
                  <Navigation className="w-4 h-4" />
                </Button>
                <a href={`tel:${clinic.phone}`}>
                  <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════ 2. QUICK STATS STRIP ════════ */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon:Building2, label:'Established', value:clinic.established, color:'text-primary', desc:`Since ${clinic.established}` },
            { icon:Stethoscope, label:'Total Doctors', value:clinic.totalDoctors, color:'text-blue-500', desc:'Qualified professionals' },
            { icon:Sparkles, label:'Specialties', value:clinic.totalSpecialties, color:'text-purple-500', desc:'Treatment areas' },
            { icon:Users, label:'Patients Treated', value:`${(clinic.totalPatients/1000).toFixed(0)}K+`, color:'text-emerald-500', desc:'Happy patients' },
          ].map(stat => (
            <motion.div key={stat.label} variants={fadeUp}
              className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', stat.color.replace('text-','from-').replace('-500','-500/20') + ' to-transparent')}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-foreground leading-none mb-0.5">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ════════ 3. MAIN CONTENT + STICKY SIDEBAR ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left Column — About → Additional Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label={`About ${clinic.name}`} />
                  <div className={cn('text-sm text-muted-foreground leading-relaxed', !showFullDesc && 'line-clamp-4')}>
                    {clinic.description}
                  </div>
                  {clinic.description?.length > 150 && (
                    <Button variant="ghost" size="sm" className="mt-1 text-primary h-8 px-2" onClick={() => setShowFullDesc(!showFullDesc)}>
                      {showFullDesc ? 'Show less' : 'Read more'}
                      <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', showFullDesc && 'rotate-180')} />
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/30">
                    {clinic.specialties?.map(s => (
                      <Badge key={s} variant="secondary" className="text-[11px] px-3 py-1 rounded-full bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Doctors */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle icon={Stethoscope} label={`Doctors at this Clinic (${doctors.length})`} />
                    <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 rounded-lg">
                      View All <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {doctors.map((doc, idx) => {
                      const initials = doc.name.split(' ').map(n=>n[0]).join('').slice(0,2);
                      const gradColors = ['from-primary/20','from-blue-500/20','from-purple-500/20','from-emerald-500/20'];
                      return (
                        <div key={doc._id} className="group bg-card rounded-xl border border-border/40 p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-primary shrink-0 shadow-sm', gradColors[idx % gradColors.length], 'to-primary/5')}>
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{doc.name}</h4>
                                <span className={cn('w-2 h-2 rounded-full', doc.available ? 'bg-emerald-500' : 'bg-red-400')} title={doc.available ? 'Available' : 'Unavailable'} />
                              </div>
                              <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{doc.rating}</span>
                                <span className="flex items-center gap-1"><Award className="w-3 h-3 text-primary" />{doc.experience}</span>
                              </div>
                            </div>
                          </div>
                          {doc.qualifications && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {doc.qualifications.split(',').map(q => q.trim()).map(q => (
                                <span key={q} className="text-[9px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">{q}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20">
                            <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{doc.timing}</span>
                            <Badge className={cn('text-[9px] h-5 px-2 rounded-full', doc.available ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200')}>
                              {doc.available ? 'Available Today' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Services */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle icon={Scissors} label="Services & Treatments" />
                    <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">{clinic.treatments?.length} Treatments</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clinic.treatments?.map((t, i) => (
                      <ServiceItem key={t} name={t} price={500 + i * 300} index={i} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Shield} label="Facilities & Amenities" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label:'In-house Pharmacy', icon:Pill, color:'text-blue-500', bg:'from-blue-500/20 to-blue-500/5' },
                      { label:'In-house Lab', icon:Microscope, color:'text-purple-500', bg:'from-purple-500/20 to-purple-500/5' },
                      { label:'Parking', icon:Car, color:'text-emerald-500', bg:'from-emerald-500/20 to-emerald-500/5' },
                      { label:'Wheelchair Access', icon:Accessibility, color:'text-amber-500', bg:'from-amber-500/20 to-amber-500/5' },
                      { label:'AC Waiting Area', icon:Wind, color:'text-cyan-500', bg:'from-cyan-500/20 to-cyan-500/5' },
                      { label:'Card/UPI Accepted', icon:CreditCard, color:'text-rose-500', bg:'from-rose-500/20 to-rose-500/5' },
                    ].map(f => <FacilityItem key={f.label} {...f} />)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timing */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle icon={Clock} label="Timing & Schedule" />
                    <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">
                      {Object.values(clinic.timing || {}).filter(t => t !== 'Closed').length} Days Open
                    </Badge>
                  </div>
                  <div className="max-w-md">
                    {Object.entries(clinic.timing || {}).map(([day, time]) => (
                      <DayRow key={day} day={day} time={time} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Location */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={MapPin} label="Location & Contact" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl h-52 flex items-center justify-center border border-border/40 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <MapPin className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-2">Get Directions</p>
                        <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => toast.success('Opening directions...')}>
                          <Navigation className="w-3.5 h-3.5" /> Open in Maps
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Address</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{clinic.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Phone</p>
                          <a href={`tel:${clinic.phone}`} className="text-xs text-primary hover:underline mt-0.5 block">{clinic.phone}</a>
                        </div>
                      </div>
                      {clinic.email && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{clinic.email}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground mr-1">Follow us:</span>
                        <a href={clinic.social?.facebook} className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"><Globe className="w-4 h-4 text-blue-600" /></a>
                        <a href={clinic.social?.instagram} className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center hover:bg-pink-200 dark:hover:bg-pink-500/30 transition-colors"><Globe className="w-4 h-4 text-pink-600" /></a>
                        <a href={clinic.social?.youtube} className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"><Globe className="w-4 h-4 text-red-600" /></a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <SectionTitle icon={Star} label={`Patient Reviews (${clinic.reviewsCount})`} />
                    <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => toast.success('Review form coming soon')}>
                      <Star className="w-3.5 h-3.5" /> Write a Review
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-6 mb-6 p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/40">
                    <div className="text-center min-w-[100px]">
                      <div className="text-4xl font-bold text-foreground">{clinic.rating}</div>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-4 h-4', i <= Math.round(clinic.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{clinic.reviewsCount} total reviews</p>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {[5,4,3,2,1].map(r => (
                        <div key={r} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground font-medium">{r}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500', r === 5 ? 'w-3/5' : r === 4 ? 'w-1/4' : r === 3 ? 'w-1/10' : 'w-[5%]')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(reviews.length > 0 ? reviews : []).map((rev, i) => (
                      <div key={i} className="group p-4 rounded-xl border border-border/30 hover:border-border/60 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0 border-2 border-primary/10">
                            {(rev.patientName || '?')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{rev.patientName || 'Anonymous'}</span>
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', s <= rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20')} />)}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{rev.date || ''}</p>
                            <p className="text-xs text-foreground mt-2 leading-relaxed">{rev.comment || rev.text || ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label="Additional Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" /> License Number</p>
                      <p className="text-sm font-semibold text-foreground">{clinic.license}</p>
                    </div>
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Modes</p>
                      <p className="text-sm font-semibold text-foreground">{clinic.paymentModes?.join(' | ')}</p>
                    </div>
                  </div>
                  {clinic.insurance?.length > 0 && (
                    <div className="mb-5 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Insurance Accepted</p>
                      <div className="flex flex-wrap gap-2">
                        {clinic.insurance.map(i => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-2.5 py-1 rounded-lg border border-border/40 bg-white dark:bg-background">{i}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions</p>
                    <div className="space-y-2">
                      {clinic.faqs?.map((faq, i) => (
                        <div key={i} className="border border-border/40 rounded-xl overflow-hidden transition-all">
                          <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                            className="w-full flex items-center justify-between p-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                            <span className="pr-4">{faq.q}</span>
                            <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300', expandedFaq === i && 'rotate-180')} />
                          </button>
                          {expandedFaq === i && (
                            <div className="px-3.5 pb-3.5 text-xs text-muted-foreground leading-relaxed animate-in slide-in-from-top-1 duration-200">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* Right Column — Sticky Sidebar (follows until Other Branches) */}
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-4 sticky top-24 self-start">

            {/* Quick Info */}
            <SideCard>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Quick Info
              </h3>
              <div className="space-y-2">
                <StatCard icon={CalendarDays} value={clinic.established} label="Established" color="text-primary" />
                <StatCard icon={Stethoscope} value={clinic.totalDoctors} label="Qualified Doctors" color="text-blue-500" />
                <StatCard icon={Sparkles} value={clinic.totalSpecialties} label="Specialties" color="text-purple-500" />
                <StatCard icon={Users} value={`${(clinic.totalPatients/1000).toFixed(0)}K+`} label="Patients Treated" color="text-emerald-500" />
                <StatCard icon={Clock} value="10 AM - 8 PM" label="Working Hours" color="text-amber-500" />
              </div>
            </SideCard>

            {/* Quick Trust */}
            <SideCard>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Quick Trust
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Verified Clinic</p>
                    <p className="text-[10px] text-muted-foreground">Identity & credentials verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">License: {clinic.license}</p>
                    <p className="text-[10px] text-muted-foreground">Registered medical facility</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{clinic.totalPatients / 100}K+ Happy Patients</p>
                    <p className="text-[10px] text-muted-foreground">Trusted by the community</p>
                  </div>
                </div>
              </div>
              {clinic.insurance?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground mb-2">Insurance Accepted</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.insurance.map(i => (
                      <span key={i} className="text-[9px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/20">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </SideCard>

            {/* Quick Actions */}
            <SideCard>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Quick Actions
              </h3>
              <div className="space-y-2">
                <Button className="w-full justify-start gap-3 rounded-xl h-11 shadow-sm" onClick={() => toast.success('Booking coming soon')}>
                  <CalendarDays className="w-4 h-4" /> Book Appointment
                </Button>
                <a href={`tel:${clinic.phone}`}>
                  <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-11">
                    <Phone className="w-4 h-4" /> Call Now
                  </Button>
                </a>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-11" onClick={() => toast.success('Opening directions...')}>
                  <Navigation className="w-4 h-4" /> Get Directions
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-11" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                  <Share2 className="w-4 h-4" /> Share Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-muted-foreground" onClick={() => toast.success('Review form coming soon')}>
                  <Star className="w-4 h-4" /> Write a Review
                </Button>
              </div>
            </SideCard>

          </motion.div>
        </div>

        {/* ════════ 4. OTHER BRANCHES (full width after grid) ════════ */}
        {clinic.branches?.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-8">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <SectionTitle icon={Building2} label="Other Branches" />
                  <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">{clinic.branches.length} Branches</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clinic.branches?.slice(0, 3).map((b, idx) => {
                    const colors = ['from-primary/10 border-primary/20','from-blue-500/10 border-blue-500/20','from-purple-500/10 border-purple-500/20'];
                    return (
                      <div key={b.name} className={cn('bg-gradient-to-br rounded-xl p-4 border cursor-pointer hover:shadow-md transition-all group', colors[idx % colors.length])}>
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', colors[idx % colors.length])}>
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{b.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{b.address}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timing}</span>
                              {b.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}
