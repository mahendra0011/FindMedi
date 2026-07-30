import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, Truck, Phone, Mail, Clock, MapPin, ArrowLeft, BadgeCheck, Store,
  ShoppingCart, Pill, Camera, Upload, Shield, ChevronRight, Share2,
  Navigation, Percent, Tag, AlertCircle, X, Image, FileText, Zap, Info,
  Copy, CheckCircle2, Stethoscope, CalendarDays, Award, Search, Plus, Minus,
  Lock, Home, Users, Sparkles, Building2, ClipboardList, Heart, Bookmark,
  HelpCircle, CreditCard, ChevronLeft, ChevronDown, Globe, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import ServiceLocationMap from '@/components/maps/ServiceLocationMap';
import ReviewDialog from '@/components/ReviewDialog';
import PharmacyCard from '@/components/PharmacyCard';



const CATEGORIES = ['All', 'Prescription', 'OTC', 'Generic', 'Baby Care', 'Ayurvedic', 'Devices', 'Vitamins'];

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

function mapFacilityToStore(f) {
  return {
    id: f._id, name: f.name, photo: f.logo || '', cover: f.image || '',
    verified: f.status === 'approved', open: true, timing: f.workingHours || '8 AM - 10 PM',
    type: 'Pharmacy', rating: f.rating || 4.0, reviews: f.reviewsCount || 0,
    tags: ['Home Delivery', 'Generic Available'],
    deliveryTime: '30 mins', phone: f.phone || '', email: f.email || '',
    address: f.address || 'M.G. Road, Jabalpur, MP', distance: f.distance ? `${f.distance} km` : '0.8 km',
    workingHours: f.workingHours || '8:00 AM - 10:00 PM',
    deliveryCharges: 0, freeDeliveryAbove: 0, minOrder: 0,
    pickup: true, deliveryArea: 'Within 3 km',
    established: f.establishedYear || 2021,
    licenseNo: f.licenseNumber || '',
    pharmacist: '',
    description: f.description || '',
    deliveryAvailable: true,
    offers: f.offers || [],
    policies: f.policies || { return: '', cancel: '', rxValidity: '' },
    city: f.city || 'Jabalpur',
  };
}

// Adapter: mapFacilityToStore shape → PharmacyCard props shape
function storeToPharmacyCard(s) {
  return {
    _id: s.id,
    name: s.name,
    logo: s.photo || '',
    image: s.cover || s.photo || '',
    address: s.address,
    city: s.city || '',
    state: '',
    pincode: '',
    phone: s.phone,
    rating: s.rating || 0,
    reviewsCount: s.reviews || 0,
    workingHours: s.workingHours || s.timing || '',
    amenities: {
      homeDelivery: s.tags?.includes('Home Delivery') || s.deliveryAvailable,
      cardPayment: false,
      prescriptionUpload: false,
    },
    description: s.description || '',
    distance: (s.distance || '').replace?.(' km', '') || undefined,
  };
}

export default function MedicineStoreDetail() {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { entries, addItem, updateQty } = useCart();
  const [store, setStore] = useState(null);
  const [suggestedStores, setSuggestedStores] = useState([]);
  const [allMeds, setAllMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRx, setShowRx] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const medicinesRef = useRef(null);
  const fileInputRef = useRef(null);
  const [medSearch, setMedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [reviewsData, setReviewsData] = useState([]);
  const [isFavorited, setIsFavorited] = useState(() => localStorage.getItem(`fav_store_${storeId}`) === 'true');
  const toggleFavorite = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      if (next) {
        await api.dispatch(() => Promise.resolve({}), '/patient/favorites', { method: 'POST', body: JSON.stringify({ targetId: storeId, targetType: 'pharmacy', name: store?.name }) });
      } else {
        await api.dispatch(() => Promise.resolve({}), `/patient/favorites/${storeId}`, { method: 'DELETE' });
      }
      toast.success(next ? 'Saved' : 'Removed from Saved');
    } catch {
      setIsFavorited(!next);
      toast.error('Failed to update favorite');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.getFacility(storeId);
        const f = result?.facility || result;
        if (!f) throw new Error('Not found');
        setStore(mapFacilityToStore(f));
        try {
          const meds = await api.getPharmacyMedicines({ facilityId: storeId });
          setAllMeds(Array.isArray(meds) ? meds.map(m => ({
            id: m._id, name: m.name, image: m.image || '',
            brand: m.manufacturer || '', mrp: m.sellingPrice || m.mrp || 0,
            price: m.sellingPrice || 0,
            discount: m.discount || Math.round((1 - (m.sellingPrice || 0) / (m.mrp || m.sellingPrice || 1)) * 100) || 0,
            inStock: m.currentStock > 0, rx: m.prescriptionReq || false,
            pack: m.form || '', category: m.category || 'Other', storeId,
          })) : []);
        } catch { /* empty */ }
        try {
          const pharm = await api.getPharmacies();
          const pList = Array.isArray(pharm) ? pharm : (pharm.pharmacies || []);
          setSuggestedStores(pList.map(mapFacilityToStore));
        } catch { /* empty */ }
      } catch {
        setStore(null);
      }
      setLoading(false);
    };
    load();
  }, [storeId]);
  const storeEntries = entries.filter(e => e.storeId === storeId);

  const storeCartCount = storeEntries.reduce((s, e) => s + e.qty, 0);
  const storeCartTotal = storeEntries.reduce((s, e) => s + e.item.price * e.qty, 0);

  const renderMedCard = (med) => {
    const entry = storeEntries.find(e => e.item.id === med.id);
    return (
      <div key={med.id} className="bg-background rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group/card flex flex-col">
        <div className="relative h-28 sm:h-32 bg-gradient-to-br from-muted/50 to-muted/10 overflow-hidden">
          <img src={med.image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105" />
          {med.discount > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">{med.discount}% OFF</span>
          )}
          {med.rx && (
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> Rx
            </span>
          )}
        </div>
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
          <h4 className="font-heading font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-1">{med.name}</h4>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{med.brand} | {med.pack}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-sm sm:text-base font-bold text-foreground">₹{med.price}</span>
            {med.mrp > med.price && <span className="text-[10px] sm:text-xs text-muted-foreground line-through">₹{med.mrp}</span>}
          </div>
          <span className={cn('text-[10px] font-medium mt-1', med.inStock ? 'text-emerald-600' : 'text-red-500')}>
            {med.inStock ? '✓ In Stock' : '✕ Out of Stock'}
          </span>
          <div className="mt-auto pt-2">
            {med.rx ? (
              <Button size="sm" className="w-full gap-1 rounded-lg text-[10px] h-7 sm:h-8 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowRx(true)}>
                <Lock className="w-3 h-3" /> Upload Rx
              </Button>
            ) : entry ? (
              <div className="flex items-center justify-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty - 1)} disabled={entry.qty <= 1}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-xs font-bold">{entry.qty}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(med, storeId)} disabled={!med.inStock}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full gap-1 rounded-lg text-[10px] h-7 sm:h-8" disabled={!med.inStock} onClick={() => { addItem(med, storeId); toast.success(`${med.name} added to cart`); }}>
                <ShoppingCart className="w-3 h-3" /> Add
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (searchParams.get('section') === 'medicines') {
      setTimeout(() => medicinesRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 300);
    } else {
      window.scrollTo(0, 0);
    }
  }, [storeId, searchParams]);

  const renderStars = (r, size = 'w-3.5 h-3.5') => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn(size, s <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
      ))}
    </div>
  );

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Store not found</h3>
          <Button variant="outline" onClick={() => navigate('/buy-medicine')}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/buy-medicine')} className="hover:text-foreground transition-colors flex items-center gap-1.5 group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> Find Medicine
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium truncate">{store.name}</span>
        </motion.div>

        {/* ════════ 1. HERO SECTION ════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Gallery */}
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-card border border-border/50 h-[300px] sm:h-[420px] group">
              <img src={store.cover} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-primary/90 text-white border-0 text-xs px-3 py-1.5 rounded-full shadow-lg">{store.type}</Badge>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={toggleFavorite}>
                  <Bookmark className={cn('w-4 h-4', isFavorited && 'fill-current')} />
                </button>
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="bg-black/40 text-white border-0 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {store.deliveryAvailable && <Truck className="w-3 h-3 inline mr-1" />} Delivery Available
                </Badge>
              </div>
            </div>

            {/* Info Card */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 flex flex-col shadow-sm w-full">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-heading font-bold text-xl text-foreground leading-tight">{store.name}</h1>
                    {store.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-primary/80">{store.type}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {renderStars(store.rating)}
                    <span className="text-sm font-bold text-foreground">{store.rating}</span>
                    <span className="text-xs text-muted-foreground">({store.reviews} reviews)</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <span>{store.address}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Navigation className="w-3 h-3" />{store.distance} away</p>
                  </div>
                </div>
                <a href={`tel:${store.phone}`} className="flex items-center gap-2.5 text-primary font-medium hover:underline group">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {store.phone}
                </a>
                {store.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    {store.email}
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className={cn('px-4 py-2.5 rounded-xl border text-sm text-center font-semibold flex items-center justify-center gap-2', store.open ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10')}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', store.open ? 'bg-emerald-500' : 'bg-red-500')} />
                {store.open ? `Open Now — ${store.timing}` : 'Closed'}
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={() => navigate('/buy-medicine/' + storeId + '/medicines')}>
                  <Pill className="w-4 h-4" /> Browse Medicines
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`)}>
                  <Navigation className="w-4 h-4" />
                </Button>
                <a href={`tel:${store.phone}`}>
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
            { icon:CalendarDays, label:'Established', value:store.established, color:'text-primary', desc:`Since ${store.established}` },
            { icon:Pill, label:'Medicines Available', value:allMeds.filter(m => m.inStock).length, color:'text-blue-500', desc:'In stock items' },
            { icon:Truck, label:'Delivery Time', value:store.deliveryTime, color:'text-purple-500', desc:store.deliveryCharges === 0 ? 'Free delivery' : `₹${store.deliveryCharges} per order` },
            { icon:Star, label:'Rating', value:store.rating, color:'text-emerald-500', desc:`${store.reviews} reviews` },
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

        {/* ════════ 3. MAIN CONTENT + SIDEBAR ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <ServiceLocationMap entityType="pharmacy" entity={store} />
            </motion.div>

            {/* About */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label="About" />
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{store.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:'License No.', value:store.licenseNo, icon:FileText },
                      { label:'Pharmacist', value:store.pharmacist, icon:Shield },
                      { label:'Established', value:store.established, icon:CalendarDays },
                      { label:'Type', value:store.type, icon:Store },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40 hover:border-primary/20 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{item.label}</p>
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upload Prescription CTA */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={FileText} label="Upload Prescription" />
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                      <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer relative group"
                        onClick={() => fileInputRef.current?.click()}>
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">Upload your prescription</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB)</p>
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
                          onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await api.uploadFile(f); toast.success('Prescription uploaded'); } catch { toast.error('Upload failed'); } }} />
                      </div>
                      <div className="flex gap-3 mt-3">
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg text-xs"
                          onClick={() => fileInputRef.current?.click()}>
                          <Camera className="w-3.5 h-3.5" /> Camera
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg text-xs"
                          onClick={() => fileInputRef.current?.click()}>
                          <Image className="w-3.5 h-3.5" /> Gallery
                        </Button>
                      </div>
                      <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mt-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">Pharmacist will verify your prescription before dispatch. You will be notified once approved.</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 w-full sm:w-48">
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                        <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-primary" /> Saved Prescriptions
                        </h5>
                        <div className="space-y-1.5">
                          {['Prescription - 12 Jun 2026', 'Prescription - 28 May 2026'].map((item, i) => (
                            <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                              <input type="radio" name="saved-rx" className="w-3.5 h-3.5 accent-primary" />
                              <span className="text-xs text-muted-foreground truncate">{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Browse Medicines */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} ref={medicinesRef}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Pill className="w-4 h-4 text-primary" /></span>
                      Medicines <span className="text-base font-normal text-muted-foreground">({allMeds.length} items)</span>
                    </h2>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary font-semibold shrink-0" onClick={() => navigate(`/buy-medicine/${storeId}/medicines`)}>
                      View All <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 pt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder={`Search in ${store.name}...`} className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCatFilter(c)}
                        className={cn('px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border', catFilter === c ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-background text-muted-foreground hover:text-foreground border-border/50')}>
                        {c}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const filtered = allMeds.filter(m => {
                      if (catFilter !== 'All' && m.category !== catFilter) return false;
                      if (medSearch && !m.name.toLowerCase().includes(medSearch.toLowerCase()) && !m.brand.toLowerCase().includes(medSearch.toLowerCase())) return false;
                      return true;
                    });
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                          <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No medicines found</p>
                        </div>
                      );
                    }
                    return (
                      <>
                        <div className="grid grid-cols-4 gap-3">
                          {filtered.slice(0, 4).map(med => renderMedCard(med))}
                        </div>
                        {filtered.length > 4 && (
                          <div className="mt-4 text-center">
                            <Button variant="outline" className="gap-2 rounded-xl px-6" onClick={() => navigate(`/buy-medicine/${storeId}/medicines`)}>
                              <Pill className="w-4 h-4" /> View More Medicines <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>

            {/* About */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label="About" />
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{store.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:'License No.', value:store.licenseNo, icon:FileText },
                      { label:'Pharmacist', value:store.pharmacist, icon:Shield },
                      { label:'Established', value:store.established, icon:CalendarDays },
                      { label:'Type', value:store.type, icon:Store },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40 hover:border-primary/20 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{item.label}</p>
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Information */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label="Additional Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" /> License Number</p>
                      <p className="text-sm font-semibold text-foreground">{store.licenseNo}</p>
                    </div>
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Modes</p>
                      <p className="text-sm font-semibold text-foreground">{['Cash', 'UPI', 'Card', 'Net Banking'].join(' | ')}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions</p>
                    <div className="space-y-2">
                      {[
                        { q: 'How long does delivery take?', a: 'Delivery usually takes 25-40 minutes depending on your location and the time of order.' },
                        { q: 'Do I need a prescription for all medicines?', a: 'No, only prescription (Rx) marked medicines require a valid prescription. OTC medicines can be purchased directly.' },
                        { q: 'Can I return medicines?', a: 'Unopened and unused medicines in original packaging can be returned within 7 days. Prescription medicines cannot be returned once dispensed.' },
                      ].map((faq, i) => (
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

            {/* Location & Contact */}
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
                        <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`)}>
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
                          <p className="text-xs text-muted-foreground mt-0.5">{store.address}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Navigation className="w-3 h-3" />{store.distance || '0.8 km'} away</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Phone</p>
                          <a href={`tel:${store.phone}`} className="text-xs text-primary hover:underline mt-0.5 block">{store.phone}</a>
                        </div>
                      </div>
                      {store.email && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{store.email}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground mr-1">Follow us:</span>
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center"><Globe className="w-4 h-4 text-blue-600" /></span>
                        <span className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center"><Globe className="w-4 h-4 text-pink-600" /></span>
                        <span className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center"><Globe className="w-4 h-4 text-red-600" /></span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Offers */}
            {store.offers.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <SectionTitle icon={Tag} label={`Offers & Deals (${store.offers.length})`} />
                    <div className="space-y-3">
                      {store.offers.map((offer, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/10 hover:border-primary/20 hover:shadow-sm transition-all">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
                            <Percent className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">{offer.title}</p>
                            {offer.code && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                                  <Tag className="w-3 h-3 text-primary" />
                                  <span className="text-sm font-mono font-bold text-primary tracking-wider">{offer.code}</span>
                                </div>
                                <button onClick={() => handleCopyCode(offer.code)}
                                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2.5 py-1 rounded-lg hover:bg-primary/5">
                                  {copiedCode === offer.code ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                </button>
                              </div>
                            )}
                            {offer.desc && <p className="text-xs text-muted-foreground mt-1.5">{offer.desc}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <SectionTitle icon={Star} label={`Reviews (${store.reviews})`} />
                    <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => setShowReviewDialog(true)}>
                      <Star className="w-3.5 h-3.5" /> Write a Review
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-6 mb-6 p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/40">
                    <div className="text-center min-w-[100px]">
                      <div className="text-4xl font-bold text-foreground">{store.rating}</div>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">{renderStars(store.rating, 'w-4 h-4')}</div>
                      <p className="text-[10px] text-muted-foreground mt-1">{store.reviews} total</p>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {[5,4,3,2,1].map(s => {
                        const count = reviewsData.filter(r => Math.round(r.rating) === s).length;
                        const pct = reviewsData.length > 0 ? (count / reviewsData.length) * 100 : 0;
                        return (
                          <div key={s} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-muted-foreground font-medium">{s}</span>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {reviewsData.map((r) => (
                      <div key={r.id} className="group p-4 rounded-xl border border-border/30 hover:border-border/60 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0 border-2 border-primary/10">
                            {r.user[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{r.user}</span>
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20')} />)}
                              </div>
                              <span className="text-[10px] text-muted-foreground ml-auto bg-muted/50 px-2 py-0.5 rounded-full">{r.date}</span>
                            </div>
                            <p className="text-xs text-foreground mt-2 leading-relaxed">{r.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Policies */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Shield} label="Store Policies" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon:ArrowLeft, title:'Return / Refund', desc:store.policies.return, color:'text-blue-500', bg:'bg-blue-500/10' },
                      { icon:X, title:'Cancellation', desc:store.policies.cancel, color:'text-red-500', bg:'bg-red-500/10' },
                      { icon:FileText, title:'Prescription Validity', desc:store.policies.rxValidity, color:'text-amber-500', bg:'bg-amber-500/10' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-5 border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', item.bg)}>
                          <item.icon className={cn('w-5 h-5', item.color)} />
                        </div>
                        <h4 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* ──── RIGHT SIDEBAR ──── */}
          <div className="space-y-6">

            {/* Trust & Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="w-3.5 h-3.5 text-primary" /></span>
                    Quick Info
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {[
                        ['Delivery Time', store.deliveryTime],
                        ['Distance', store.distance || '0.8 km'],
                        ['Working Hours', store.workingHours],
                        ['Delivery', store.deliveryCharges === 0 ? 'Free' : `₹${store.deliveryCharges}`],
                        ['Delivery Area', store.deliveryArea],
                        ['Min. Order', store.minOrder > 0 ? `₹${store.minOrder}` : 'No minimum'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground">{val}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-foreground">Licensed Pharmacy</span>
                      </div>
                      {store.pickup && (
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">In-store Pickup Available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Trust & Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="w-3.5 h-3.5 text-primary" /></span>
                    Trust & Info
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label:'License', value:store.licenseNo, icon:FileText },
                      { label:'Pharmacist', value:store.pharmacist, icon:Stethoscope },
                      { label:'Established', value:store.established, icon:CalendarDays },
                      { label:'Delivery Area', value:store.deliveryArea, icon:MapPin },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Community Trust */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Heart className="w-3.5 h-3.5 text-primary" /></span>
                    Community Trust
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10">
                      <BadgeCheck className="w-3.5 h-3.5" /> {store.verified ? 'Verified' : 'Registered'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10">
                      <Truck className="w-3.5 h-3.5" /> Fast Delivery
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10">
                      <Users className="w-3.5 h-3.5" /> {store.reviews}+ Reviews
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sticky Actions Container */}
            <div className="space-y-6 lg:sticky lg:top-24 w-full self-start">

            {/* Quick Actions */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></span>
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button className="w-full gap-2.5 rounded-xl h-11 font-semibold shadow-md" onClick={() => navigate(`/buy-medicine/${storeId}/medicines`)}>
                      <Pill className="w-4 h-4" /> Browse Medicines
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`tel:${store.phone}`}><Phone className="w-4 h-4" /> Call Now</a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`mailto:${store.email || ''}`}><Mail className="w-4 h-4" /> Email Now</a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={toggleFavorite}>
                      <Bookmark className={cn('w-4 h-4', isFavorited && 'fill-current text-primary')} /> {isFavorited ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                      <Share2 className="w-4 h-4" /> Share Profile
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => setShowReviewDialog(true)}>
                      <Star className="w-4 h-4" /> Write a Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Address Card */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></span>
                    Address
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{store.address}</p>
                  <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl h-10" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`)}>
                    <Navigation className="w-4 h-4" /> Get Directions
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SUGGESTED STORES ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-20">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></span>
            <h2 className="font-heading text-xl font-bold text-foreground">Nearby Stores</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedStores.filter(s => s.id !== storeId).slice(0, 4).map((s, _i) => (
              <PharmacyCard key={s.id} pharmacy={storeToPharmacyCard(s)} index={_i} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══ PRESCRIPTION MODAL ═══ */}
      {showRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowRx(false)}>
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" /> Upload Prescription
              </h3>
              <button onClick={() => setShowRx(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 sm:p-10 text-center mb-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                <Upload className="w-7 h-7 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Tap to upload your prescription</p>
              <p className="text-xs text-muted-foreground">Supports JPG, PNG, PDF (max 5MB)</p>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try { await api.uploadFile(file); toast.success(`Uploaded: ${file.name}`); } catch { toast.error('Upload failed'); }
                }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Button variant="outline" className="gap-2 rounded-xl py-6" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl py-6" onClick={() => fileInputRef.current?.click()}>
                <Image className="w-4 h-4" /> Gallery
              </Button>
            </div>
            <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Pharmacist will verify your prescription before dispatch. You will be notified once approved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ BOTTOM STICKY BAR ═══ */}
      {storeCartCount > 0 && (
        <motion.div initial={{ y:100 }} animate={{ y:0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{storeCartCount} item{storeCartCount > 1 ? 's' : ''}</span>
                <span className="text-lg font-bold text-foreground block leading-tight">₹{storeCartTotal}</span>
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-lg shadow-primary/30 px-6 h-11" onClick={() => navigate('/cart')}>
              View Cart <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    
      <ReviewDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog}
        entityType="pharmacy"
        entityId={storeId}
        entityName={store?.name}
        onReviewSubmitted={(review) => {
          setReviewsData(prev => [review, ...(Array.isArray(prev) ? prev : [])]);
        }}
      />
    </div>
  );
}
