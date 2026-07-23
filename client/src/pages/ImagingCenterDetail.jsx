import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Monitor } from 'lucide-react';
import {
  Star, ShieldCheck, Home, Clock, MapPin, Phone, Mail, ArrowLeft,
  BadgeCheck, ShoppingCart, Camera, Upload, Share2,
  Navigation, Percent, Tag, AlertCircle, X, FileText, Zap, Info,
  Copy, CheckCircle2, CalendarDays, Award, Search, Plus, Minus, Lock,
  ChevronRight, Sparkles, Clock4, Utensils, Heart,
  Droplets, Activity, Bone, Eye, Stethoscope, Pill, Calendar, Users, Image,
  Radio, Scan, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Mammography'];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 200, damping: 22 } };

const SectionTitle = ({ icon: Icon, label }) => (
  <h2 className="font-heading text-lg font-bold text-foreground mb-5 flex items-center gap-2">
    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </span>
    {label}
  </h2>
);

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
    <div className="px-5 py-4 border-b border-border/30 bg-gradient-to-r from-blue-500/[0.04] to-transparent">
      <h3 className="font-heading font-bold text-foreground flex items-center gap-2.5 text-base">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
          <Icon className="w-4.5 h-4.5 text-blue-600" />
        </span>
        {title}
      </h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const SidebarCard = ({ icon: Icon, title, children }) => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
    <div className="px-5 py-4 border-b border-border/30">
      <h3 className="font-heading font-bold text-foreground flex items-center gap-2 text-sm">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
        </span>
        {title}
      </h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

function deriveCategory(f) {
  const s = (f?.specialties || []).map(x => x.toLowerCase());
  const hasImaging = s.some(x => x.includes('imaging') || x.includes('radiology') || x.includes('mri') || x.includes('ct') || x.includes('ultrasound'));
  return hasImaging ? 'Imaging Center' : 'Diagnostic Center';
}

export default function ImagingCenterDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const { entries, addItem, updateQty } = useCart();

  const [clinic, setClinic] = useState(null);
  const [allTests, setAllTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [reviewsData, setReviewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [medSearch, setMedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [fastingToggle, setFastingToggle] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.getFacility(clinicId);
        const fac = result?.facility || result;
        if (!fac) throw new Error('Not found');
        setClinic({
          _id: fac._id || clinicId,
          id: fac._id || clinicId,
          name: fac.name || 'Imaging Center',
          type: deriveCategory(fac) || 'Imaging Center',
          rating: fac.rating || 4.5,
          reviewsCount: fac.reviewsCount || 0,
          verified: fac.status === 'approved' || fac.verified,
          open: fac.open ?? true,
          workingHours: fac.workingHours || '8:00 AM - 8:00 PM',
          cover: fac.cover || fac.photo || '',
          logo: fac.logo || '',
          phone: fac.phone || '',
          email: fac.email || '',
          address: fac.address || '',
          description: fac.description || '',
          tags: fac.tags || ['MRI', 'CT Scan', 'X-Ray', 'Digital Reports'],
          imagingTypes: fac.imagingTypes || ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound'],
          reportTime: fac.reportTime || 'Within 6 hrs',
          distance: fac.distance ? `${fac.distance} km` : '1.2 km',
          aerbNo: fac.aerbNumber || fac.aerbNo || 'AERB-IM-2024-00789',
          radiologist: fac.radiologistName || fac.radiologist || 'Dr. Rajesh Kumar',
          established: fac.establishedYear || fac.established || 2015,
          equipment: fac.equipment || { mri: '3T MRI (Siemens)', ct: '128-Slice CT (GE)' },
          policies: fac.policies || { report: 'Reports are delivered within 24 hours via email and app.', cancel: 'Free cancellation up to 2 hours before appointment.', refund: 'Full refund if cancelled 24 hours in advance.', fasting: 'Fasting required for abdomen scans (6-8 hrs).' },
          prepInfo: fac.prepInfo || { fasting: 'Required for Abdomen USG', instructions: 'Remove all metal items before MRI' },
          offers: fac.offers || [],
          _raw: fac,
        });
        try {
          const [testsRes, pkgsRes, reviewsRes] = await Promise.all([
            api.getTests({ hospitalId: clinicId }).catch(() => []),
            api.getFacility(clinicId).then(r => {
              const f = r?.facility || r;
              return f?.packages || [];
            }).catch(() => []),
            api.getReviews({ hospitalId: clinicId }).catch(() => []),
          ]);
          const tests = (Array.isArray(testsRes) ? testsRes : testsRes?.tests || []).map(t => ({
            id: t._id || t.id,
            _id: t._id,
            name: t.name,
            price: t.price || t.sellingPrice || 0,
            mrp: t.mrp || t.price || 0,
            discount: t.discount || (t.mrp ? Math.round((1 - t.price / t.mrp) * 100) : 0),
            reportTime: t.reportTime || '24 hrs',
            popular: t.popular || false,
            rx: t.prescriptionReq || t.rx || false,
            category: t.category || t.department || 'All',
            clinicId,
          }));
          setAllTests(tests);
          setPackages(Array.isArray(pkgsRes) ? pkgsRes : pkgsRes?.packages || []);
          setReviewsData(Array.isArray(reviewsRes) ? reviewsRes : reviewsRes?.reviews || []);
        } catch (_e) { console.error(_e); }
      } catch (_e) {
        console.error(_e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clinicId]);

  const clinicTests = allTests;
  const clinicPackages = packages;
  const clinicEntries = entries.filter(e => e.item.clinicId === clinic?._id);
  const clinicCartCount = clinicEntries.reduce((s, e) => s + e.qty, 0);
  const clinicCartTotal = clinicEntries.reduce((s, e) => s + e.item.price * e.qty, 0);

  const displayReviews = reviewsData.length > 0 ? reviewsData : [];

  const renderStars = (r, size = 'w-3.5 h-3.5') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn(size, s <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
      ))}
    </div>
  );

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderTestCard = (test) => {
    const entry = clinicEntries.find(e => e.item.id === test.id);
    return (
      <div key={test.id} className="bg-background rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-blue-500/20 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Scan className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-heading font-semibold text-sm text-foreground">{test.name}</h4>
                  {test.popular && <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">Popular</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Report in {test.reportTime}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-foreground">₹{test.price}</span>
                  {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through">₹{test.mrp}</span>}
                </div>
                {test.discount > 0 && <span className="text-[10px] font-semibold text-emerald-600">{test.discount}% off</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md">
                <MapPin className="w-2.5 h-2.5" /> Visit Required
              </span>
              {test.rx ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" /> Rx Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Direct
                </span>
              )}
            </div>
            <div className="mt-3">
              {test.rx ? (
                <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowRx(true)}>
                  <Lock className="w-3 h-3" /> Upload Prescription
                </Button>
              ) : entry ? (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty - 1)} disabled={entry.qty <= 1}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-xs font-bold">{entry.qty}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(test, clinic?._id)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs" onClick={() => { addItem(test, clinic?._id); toast.success(`${test.name} added`); }}>
                  <ShoppingCart className="w-3 h-3" /> Book Scan
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { window.scrollTo(0, 0); }, [clinicId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading imaging center details...</p>
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Scan className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Imaging center not found</h2>
        <Button className="mt-4" onClick={() => navigate('/imaging')}>Back to Imaging Centers</Button>
      </div>
    );
  }

  const filteredTests = clinicTests.filter(t => {
    if (catFilter !== 'All' && t.category !== catFilter) return false;
    if (medSearch && !t.name.toLowerCase().includes(medSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/imaging')} className="hover:text-foreground transition-colors">Imaging Centers</button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium truncate">{clinic.name}</span>
        </motion.div>

        {/* ═══ 1. HERO HEADER ═══ */}
        <motion.div {...fadeUp(1)} className="relative bg-card rounded-2xl border border-border/50 overflow-hidden mb-8 shadow-sm group">
          <div className="relative h-56 sm:h-64 overflow-hidden">
            <img src={clinic.cover} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute top-4 right-4">
              <span className={cn('px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-lg', clinic.open ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400')}>
                {clinic.open ? '● Open' : '● Closed'} &bull; {clinic.workingHours}
              </span>
            </div>
          </div>
          <div className="px-6 sm:px-8 pb-5 -mt-16 relative z-10">
            <div className="flex items-end gap-5 mb-3">
              <div className="w-28 h-28 rounded-2xl border-[5px] border-card overflow-hidden shadow-2xl shrink-0 bg-card">
                {clinic.logo ? (
                  <img src={clinic.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                    <Radio className="w-10 h-10 text-blue-500/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-16">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground truncate">{clinic.name}</h1>
                  {clinic.verified && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px] font-semibold shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 border border-border/40">
                    <Radio className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-foreground">{clinic.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(clinic.rating)}
                    <span className="text-sm font-bold text-foreground">{clinic.rating}</span>
                    <span className="text-xs text-muted-foreground">({clinic.reviewsCount} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {clinic.tags.map(t => (
                <Badge key={t} className="text-[11px] px-3 py-1 bg-muted/50 border-border/40 hover:bg-muted/80 transition-colors">
                  {t.includes('MRI') && <Radio className="w-3 h-3 mr-1 text-blue-500" />}
                  {t.includes('CT') && <Scan className="w-3 h-3 mr-1 text-indigo-500" />}
                  {t.includes('Reports') && <Clock className="w-3 h-3 mr-1 text-emerald-500" />}
                  {t.includes('Emergency') && <Zap className="w-3 h-3 mr-1 text-amber-500" />}
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ═══ 4. SEARCH + CATEGORY TABS ═══ */}
            <motion.div {...fadeUp(2)}>
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border/30 bg-gradient-to-r from-blue-500/[0.04] to-transparent">
                  <h3 className="font-heading font-bold text-foreground flex items-center gap-2.5 text-base">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
                      <Scan className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    Scans Available
                    <span className="text-sm font-normal text-muted-foreground">({clinicTests.length} scans)</span>
                  </h3>
                </div>
                <div className="p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder="Search scans..." className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCatFilter(c)}
                        className={cn('px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border', catFilter === c ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-background text-muted-foreground hover:text-foreground border-border/50')}>
                        {c}
                      </button>
                    ))}
                  </div>
                  {filteredTests.length === 0 ? (
                    <div className="text-center py-12 bg-background rounded-xl border border-border/50">
                      <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No scans found</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3">
                        {filteredTests.map(test => renderTestCard(test))}
                      </div>
                      <div className="text-center mt-4">
                        <Button variant="outline" className="gap-2 rounded-xl px-6" onClick={() => setCatFilter('All')}>
                          View All {clinicTests.length} Scans <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ═══ 5. EQUIPMENT INFO ═══ */}
            <SectionCard icon={Monitor} title="Equipment & Technology">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/[0.02] rounded-xl p-5 border border-blue-500/15 hover:shadow-md hover:border-blue-500/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                    <Radio className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">MRI Machine</p>
                  <p className="text-sm font-bold text-foreground">{clinic.equipment.mri}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500/5 to-indigo-500/[0.02] rounded-xl p-5 border border-indigo-500/15 hover:shadow-md hover:border-indigo-500/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                    <Scan className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">CT Scanner</p>
                  <p className="text-sm font-bold text-foreground">{clinic.equipment.ct}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] rounded-xl p-5 border border-emerald-500/15 hover:shadow-md hover:border-emerald-500/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Radiologist</p>
                  <p className="text-sm font-bold text-foreground">Yes, on-site</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/[0.02] rounded-xl p-5 border border-amber-500/15 hover:shadow-md hover:border-amber-500/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">AERB Certified</p>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1">{clinic.aerbNo} <span className="text-emerald-500">✅</span></p>
                </div>
              </div>
            </SectionCard>

            {/* ═══ 6. HEALTH PACKAGES ═══ */}
            {clinicPackages.length > 0 && (
              <SectionCard icon={Sparkles} title={`Scan Packages (${clinicPackages.length})`}>
                <div className="space-y-4">
                  {clinicPackages.map((pkg, i) => (
                    <motion.div key={pkg.id} {...fadeUp(i)}
                      className="relative bg-gradient-to-br from-blue-500/5 via-blue-500/[0.02] to-transparent rounded-xl border border-blue-500/15 p-5 hover:shadow-lg hover:border-blue-500/30 transition-all">
                      {pkg.popular && (
                        <span className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                          BEST VALUE
                        </span>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/25 to-blue-500/10 flex items-center justify-center shrink-0 shadow-sm">
                          <Heart className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-heading font-bold text-foreground text-sm">{pkg.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pkg.includes.map((inc, j) => (
                              <span key={j} className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                                {inc}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-end justify-between mt-3">
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-foreground">₹{pkg.price}</span>
                                <span className="text-sm text-muted-foreground line-through">₹{pkg.mrp}</span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">{pkg.discount}% off</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="rounded-lg text-xs h-9">View Details</Button>
                              <Button size="sm" className="rounded-lg text-xs h-9 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => { addItem(pkg, clinic._id); toast.success(`${pkg.name} added to cart`); }}>
                                <ShoppingCart className="w-3.5 h-3.5" /> Book Package
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ═══ 7. PRESCRIPTION UPLOAD ═══ */}
            <SectionCard icon={FileText} title="Upload Prescription">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all cursor-pointer relative group"
                    onClick={() => document.getElementById('rx-upload')?.click()}>
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500/10 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground/50 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Upload your prescription</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB)</p>
                    <input id="rx-upload" type="file" accept="image/*,.pdf" className="hidden"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await api.uploadFile(f); toast.success('Prescription uploaded'); } catch { toast.error('Upload failed'); } }} />
                    </div>
                  <div className="flex gap-3 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg text-xs"
                      onClick={() => document.getElementById('rx-upload')?.click()}>
                      <Camera className="w-3.5 h-3.5" /> Camera
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg text-xs"
                      onClick={() => document.getElementById('rx-upload')?.click()}>
                      <FileText className="w-3.5 h-3.5" /> Gallery
                    </Button>
                  </div>
                  <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">Radiologist will verify your prescription before the scan. You will be notified once approved.</p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 w-full sm:w-48">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-blue-600" /> Saved Prescriptions
                    </h5>
                    <div className="space-y-1.5">
                      {['Prescription - 12 Jun 2026', 'Prescription - 28 May 2026'].map((item, i) => (
                        <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                          <input type="radio" name="saved-rx" className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="text-xs text-muted-foreground truncate">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ═══ 8. APPOINTMENT & PREP INFO ═══ */}
            <SectionCard icon={Clock4} title="Appointment & Prep Info">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Preferred Slot</label>
                  <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select date & time</option>
                    <option value="8-10">8:00 AM - 10:00 AM</option>
                    <option value="10-12">10:00 AM - 12:00 PM</option>
                    <option value="12-2">12:00 PM - 2:00 PM</option>
                    <option value="2-4">2:00 PM - 4:00 PM</option>
                    <option value="4-6">4:00 PM - 6:00 PM</option>
                    <option value="6-8">6:00 PM - 8:00 PM</option>
                  </select>
                </div>
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                    <Utensils className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Fasting Required</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setFastingToggle(!fastingToggle)}
                      className={cn('relative w-9 h-5 rounded-full transition-colors border', fastingToggle ? 'bg-blue-600 border-blue-600' : 'bg-muted border-border/50')}>
                      <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', fastingToggle && 'translate-x-4')} />
                    </button>
                    <span className="text-xs font-medium text-foreground">{fastingToggle ? 'Yes' : 'No'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{clinic.prepInfo?.fasting || 'Required for Abdomen USG'}</p>
                </div>
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Prep Instructions</p>
                  <p className="text-sm font-semibold text-foreground">Remove metal items</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{clinic.prepInfo?.instructions || 'Remove all metal items before MRI'}</p>
                </div>
              </div>
            </SectionCard>

            {/* ═══ 9. OFFERS ═══ */}
            {clinic.offers.length > 0 && (
              <SectionCard icon={Tag} title={`Offers & Deals (${clinic.offers.length})`}>
                <div className="space-y-3">
                  {clinic.offers.map((offer, i) => (
                    <motion.div key={i} {...fadeUp(i)}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/5 via-blue-500/[0.02] to-transparent border border-blue-500/10 hover:border-blue-500/20 hover:shadow-sm transition-all">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shrink-0 shadow-sm">
                        <Percent className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{offer.title}</p>
                        {offer.code && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <Tag className="w-3 h-3 text-blue-600" />
                              <span className="text-sm font-mono font-bold text-blue-600 tracking-wider">{offer.code}</span>
                            </div>
                            <button onClick={() => handleCopyCode(offer.code)}
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-600/80 transition-colors px-2.5 py-1 rounded-lg hover:bg-blue-500/5">
                              {copiedCode === offer.code ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                            </button>
                          </div>
                        )}
                        {offer.desc && <p className="text-xs text-muted-foreground mt-1.5">{offer.desc}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ═══ 10. ABOUT CENTER ═══ */}
            <SectionCard icon={Info} title="About">
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{clinic.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'AERB Reg No.', value: clinic.aerbNo, icon: ShieldCheck },
                    { label: 'Radiologist', value: clinic.radiologist, icon: Stethoscope },
                    { label: 'Established', value: clinic.established, icon: CalendarDays },
                    { label: 'Type', value: clinic.type, icon: Radio },
                  ].map((item, i) => (
                    <div key={i} className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40 hover:border-blue-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2.5">
                        <item.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* ═══ 11. REVIEWS ═══ */}
            <SectionCard icon={Star} title={`Reviews (${clinic.reviewsCount})`}>
              <div className="space-y-5">
                <div className="flex items-start gap-6 sm:gap-10">
                  <div className="text-center shrink-0">
                    <div className="text-4xl font-black text-foreground">{clinic.rating}</div>
                    <div className="flex mt-1.5 justify-center">{renderStars(clinic.rating, 'w-4 h-4')}</div>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">{clinic.reviewsCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5 pt-1">
                    {[5, 4, 3, 2, 1].map(s => {
                      const count = displayReviews.filter(r => Math.round(r.rating) === s).length;
                      const pct = displayReviews.length > 0 ? (count / displayReviews.length) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground font-medium">{s}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-5 text-muted-foreground text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  {displayReviews.length > 0 ? displayReviews.map((r, i) => (
                    <motion.div key={r._id || r.id || i} {...fadeUp(i)} className="pb-4 border-b border-border/20 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm">{(r.userName || r.user || 'A')[0]}</div>
                        <span className="text-sm font-semibold text-foreground">{r.userName || r.user || 'Anonymous'}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto bg-muted/50 px-2 py-0.5 rounded-full">{r.date || r.createdAt?.split('T')[0] || ''}</span>
                      </div>
                      <div className="flex mb-1.5 ml-11">{renderStars(r.rating || r.score || 0)}</div>
                      <p className="text-sm text-muted-foreground ml-11 leading-relaxed">{r.comment || r.text || ''}</p>
                    </motion.div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ═══ 12. POLICIES ═══ */}
            <SectionCard icon={ShieldCheck} title="Center Policies">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Clock, title: 'Report Delivery', desc: clinic.policies.report, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { icon: X, title: 'Cancellation', desc: clinic.policies.cancel, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { icon: ArrowLeft, title: 'Refund Policy', desc: clinic.policies.refund, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { icon: Utensils, title: 'Fasting Guidelines', desc: clinic.policies.fasting, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  ].map((item, i) => (
                    <motion.div key={i} {...fadeUp(i)}
                      className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-5 border border-border/40 hover:border-blue-500/20 hover:shadow-sm transition-all">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', item.bg)}>
                        <item.icon className={cn('w-5 h-5', item.color)} />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionCard>

          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <div className="space-y-6">

            {/* ═══ 2. QUICK INFO ═══ */}
            <SidebarCard icon={Info} title="Quick Info">
              <div className="space-y-3">
                {[
                  { icon: Scan, label: 'Imaging Types', value: clinic.imagingTypes.join(', ') },
                  { icon: Clock, label: 'Report Time', value: clinic.reportTime },
                  { icon: MapPin, label: 'Mode', value: 'Visit Required (mandatory)' },
                  { icon: MapPin, label: 'Distance', value: clinic.distance },
                  { icon: Phone, label: 'Phone', value: clinic.phone },
                  { icon: Clock4, label: 'Working Hours', value: clinic.workingHours },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SidebarCard>

            {/* ═══ 3. ADDRESS + ACTIONS ═══ */}
            <SidebarCard icon={MapPin} title="Address">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{clinic.address}</p>
              <div className="flex flex-col gap-2">
                <Button variant="default" className="gap-2 rounded-xl w-full shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700" onClick={() => window.open(`tel:${clinic.phone}`)}>
                  <Phone className="w-4 h-4" /> Call Center
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`)}>
                    <Navigation className="w-4 h-4" /> Directions
                  </Button>
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { if (navigator.share) navigator.share({ title: clinic.name, text: `${clinic.name}\n${clinic.address}` }); }}>
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </div>
              </div>
            </SidebarCard>

          </div>
        </div>
      </div>

      {/* ═══ 7b. PRESCRIPTION MODAL ═══ */}
      {showRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowRx(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-600" /> Upload Prescription
              </h3>
              <button onClick={() => setShowRx(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 sm:p-10 text-center mb-3 hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all cursor-pointer relative group" onClick={() => document.getElementById('rx-modal-upload')?.click()}>
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/10 transition-colors">
                <Upload className="w-7 h-7 text-muted-foreground/50 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Tap to upload prescription</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB)</p>
              <input id="rx-modal-upload" type="file" accept="image/*,.pdf" className="hidden"
                onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await api.uploadFile(f); toast.success('Prescription uploaded'); setShowRx(false); } catch { toast.error('Upload failed'); } }} />
              </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Button variant="outline" className="gap-2 rounded-xl py-6" onClick={() => document.getElementById('rx-modal-upload')?.click()}>
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl py-6" onClick={() => document.getElementById('rx-modal-upload')?.click()}>
                <Image className="w-4 h-4" /> Gallery
              </Button>
            </div>
            <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Radiologist will verify your prescription before the scan. You will be notified once approved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ 13. BOTTOM STICKY BAR ═══ */}
      {clinicCartCount > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                <Radio className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">🩻 {clinicCartCount} Scan{clinicCartCount > 1 ? 's' : ''} Selected</span>
                <span className="text-lg font-bold text-foreground block leading-tight">₹{clinicCartTotal}</span>
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-lg shadow-blue-500/30 px-6 h-11 bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/cart')}>
              Book Now <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
