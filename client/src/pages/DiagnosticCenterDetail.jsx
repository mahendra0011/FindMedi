import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, ShieldCheck, Home, Clock, MapPin, Phone, Mail, ArrowLeft,
  BadgeCheck, FlaskConical, ShoppingCart, Camera, Upload, Share2,
  Navigation, Percent, Tag, AlertCircle, X, FileText, Zap, Info,
  Copy, CheckCircle2, CalendarDays, Award, Search, Plus, Minus, Lock,
  ChevronRight, Sparkles, Microscope, Clock4, Utensils, Heart,
  Droplets, Activity, Bone, Eye, Stethoscope, Pill, Calendar, Users, Image,
  Shield, Loader2, Building2, Bookmark, Handshake, ClipboardList,
  Globe, Car, Accessibility, Wind, Wifi, Coffee, Baby,
  GraduationCap, Briefcase, ExternalLink, Link, Quote
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
import ServiceLocationMap from '@/components/maps/ServiceLocationMap';
import DiagnosticCenterCard from '@/components/DiagnosticCenterCard';
import ReviewDialog from '@/components/ReviewDialog';

const CATEGORIES = ['All', 'Pathology Tests', 'Imaging Tests', 'Cardiac Tests', 'Health Packages'];

const SUGGESTED_LABS = [
  { _id:'dignolab-center', name:'DiagnoLab Center', slug:'dignolab-center', providerCategory:'Diagnostic Center', type:'lab', rating:4.4, reviewsCount:567, verified:true, open:true, tags:['NABL Accredited','Home Collection','Reports Online','Imaging Available'], testsAvailable:250, homeCollection:true, reportTime:'Within 6 hrs', distance:'1.2 km', phone:'0761-2345678', email:'info@dignolab.com', address:'Marhatal, Jabalpur, MP 482002', startingPrice:350, logo:'', workingHours:'8:00 AM - 8:00 PM' },
  { _id:'metropolis-labs', name:'Metropolis Labs', slug:'metropolis-labs', providerCategory:'Pathology Lab', type:'lab', rating:4.6, reviewsCount:823, verified:true, open:true, tags:['NABL Accredited','Home Collection','Reports Online'], testsAvailable:350, homeCollection:true, reportTime:'Within 12 hrs', distance:'2.5 km', phone:'0761-3456789', email:'contact@metropolisjabalpur.com', address:'Napier Town, Jabalpur, MP 482001', startingPrice:299, logo:'', workingHours:'7:00 AM - 9:00 PM' },
  { _id:'apollo-diagnostics', name:'Apollo Diagnostics', slug:'apollo-diagnostics', providerCategory:'Diagnostic Center', type:'lab', rating:4.5, reviewsCount:712, verified:true, open:true, tags:['NABL Accredited','Home Collection','Reports Online','Imaging Available','AERB Certified'], testsAvailable:190, homeCollection:true, reportTime:'Within 8 hrs', distance:'0.8 km', phone:'0761-4567890', email:'jabalpur@apollodiag.com', address:'Civil Lines, Jabalpur, MP 482001', startingPrice:499, logo:'', workingHours:'6:00 AM - 10:00 PM' }
];

const ALL_TESTS = [
  { id:'dc1', name:'Complete Blood Count (CBC)', detailCategory:'Pathology Tests', mrp:399, price:249, discount:38, reportTime:'6 hrs', homeCollection:true, rx:false, popular:true },
  { id:'dc2', name:'Thyroid Profile (T3,T4,TSH)', detailCategory:'Pathology Tests', mrp:699, price:449, discount:36, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc3', name:'Lipid Profile', detailCategory:'Pathology Tests', mrp:599, price:349, discount:42, reportTime:'8 hrs', homeCollection:true, rx:false, popular:true },
  { id:'dc4', name:'Blood Glucose (Fasting)', detailCategory:'Pathology Tests', mrp:150, price:99, discount:34, reportTime:'4 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc5', name:'Liver Function Test', detailCategory:'Pathology Tests', mrp:799, price:499, discount:38, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc6', name:'Kidney Function Test', detailCategory:'Pathology Tests', mrp:699, price:449, discount:36, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc7', name:'HbA1c', detailCategory:'Pathology Tests', mrp:499, price:299, discount:40, reportTime:'8 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc8', name:'Vitamin D Total', detailCategory:'Pathology Tests', mrp:1299, price:799, discount:38, reportTime:'24 hrs', homeCollection:true, rx:false, popular:true },
  { id:'dc9', name:'Urine Routine', detailCategory:'Pathology Tests', mrp:199, price:129, discount:35, reportTime:'6 hrs', homeCollection:true, rx:false, popular:false },
  { id:'dc10', name:'MRI Brain', detailCategory:'Imaging Tests', mrp:4999, price:3499, discount:30, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
  { id:'dc11', name:'MRI Spine', detailCategory:'Imaging Tests', mrp:5999, price:4499, discount:25, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
  { id:'dc12', name:'CT Scan Chest', detailCategory:'Imaging Tests', mrp:3999, price:2999, discount:25, reportTime:'45 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc13', name:'CT Scan Abdomen', detailCategory:'Imaging Tests', mrp:4499, price:3299, discount:27, reportTime:'45 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc14', name:'X-Ray Chest', detailCategory:'Imaging Tests', mrp:499, price:349, discount:30, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc15', name:'X-Ray Knee', detailCategory:'Imaging Tests', mrp:599, price:399, discount:33, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc16', name:'Ultrasound Abdomen', detailCategory:'Imaging Tests', mrp:1499, price:999, discount:33, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc17', name:'Ultrasound Pelvis', detailCategory:'Imaging Tests', mrp:1299, price:899, discount:31, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc18', name:'ECG', detailCategory:'Cardiac Tests', mrp:399, price:249, discount:38, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
  { id:'dc19', name:'2D Echo', detailCategory:'Cardiac Tests', mrp:2499, price:1799, discount:28, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
  { id:'dc20', name:'TMT (Stress Test)', detailCategory:'Cardiac Tests', mrp:1999, price:1499, discount:25, reportTime:'2 hrs', homeCollection:false, rx:true, popular:false },
  { id:'dc21', name:'Holter Monitoring', detailCategory:'Cardiac Tests', mrp:3499, price:2499, discount:29, reportTime:'48 hrs', homeCollection:false, rx:true, popular:false },
];

const PACKAGES = [
  { id:'dp1', name:'Full Body Checkup (70 parameters)', detailCategory:'Health Packages', price:999, mrp:1999, discount:50, includes:['CBC','Blood Sugar','Lipid Profile','Liver Function','Kidney Function','Thyroid','Vitamin D','Urine Routine'], popular:true },
  { id:'dp2', name:'Cardiac Risk Assessment', detailCategory:'Health Packages', price:1499, mrp:2999, discount:50, includes:['Lipid Profile','ECG','2D Echo','CRP','Troponin I'], popular:true },
  { id:'dp3', name:'Diabetes Package', detailCategory:'Health Packages', price:699, mrp:1249, discount:44, includes:['Fasting Blood Sugar','HbA1c','Urine Routine','Lipid Profile'], popular:false },
  { id:'dp4', name:'Women Wellness Package', detailCategory:'Health Packages', price:1799, mrp:3499, discount:49, includes:['CBC','Thyroid','Vitamin D','Iron Studies','Pap Smear'], popular:false },
  { id:'dp5', name:'Full Body Checkup (50 parameters)', detailCategory:'Health Packages', price:799, mrp:1599, discount:50, includes:['CBC','Blood Sugar','Lipid Profile','Liver Function','Kidney Function','Urine Routine'], popular:true },
  { id:'dp6', name:'Full Body Checkup (40 parameters)', detailCategory:'Health Packages', price:649, mrp:1299, discount:50, includes:['CBC','Blood Sugar','Liver Function','Kidney Function'], popular:true },
];

const REVIEWS_DATA = [
  { id:'r1', user:'Rahul M.', rating:5, comment:'Very accurate reports and quick turnaround. Home collection was convenient.', date:'2 days ago' },
  { id:'r2', user:'Priya S.', rating:4, comment:'Good diagnostic center. Reports were delivered on time.', date:'1 week ago' },
  { id:'r3', user:'Amit K.', rating:5, comment:'Excellent service. The radiologist explained everything clearly.', date:'2 weeks ago' },
  { id:'r4', user:'Neha G.', rating:3, comment:'Reports were slightly delayed but quality was good.', date:'3 weeks ago' },
  { id:'r5', user:'Vikram J.', rating:4, comment:'Clean facility and professional staff. Highly recommended.', date:'1 month ago' },
];

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

const AMENITIES_LIST = [
  { key:'parking', label:'Parking', icon:Car },
  { key:'wheelchair', label:'Wheelchair Access', icon:Accessibility },
  { key:'airConditioning', label:'Air Conditioning', icon:Wind },
  { key:'wifi', label:'Free Wi-Fi', icon:Wifi },
  { key:'teaCoffee', label:'Tea & Coffee', icon:Coffee },
  { key:'childFriendly', label:'Child Friendly', icon:Baby },
];

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

function deriveCategory(f) {
  const s = (f.specialties || []).map(x => x.toLowerCase());
  const hasPathology = s.some(x => x.includes('pathology') || x.includes('biochem') || x.includes('hematology') || x.includes('immunology') || x.includes('molecular') || x.includes('microbiology'));
  const hasImaging = s.some(x => x.includes('imaging') || x.includes('radiology') || x.includes('mri') || x.includes('cardiology') || x.includes('neurology'));
  if (hasImaging && !hasPathology) return 'Imaging Center';
  if (hasPathology && !hasImaging) return 'Pathology Lab';
  if (s.includes('imaging')) return 'Imaging Center';
  return 'Diagnostic Center';
}

export default function DiagnosticCenterDetail() {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const { entries, addItem, updateQty } = useCart();

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [labSectionTab, setLabSectionTab] = useState('tests');
  const [medSearch, setMedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [testSort, setTestSort] = useState('popularity');
  const [testRxFilter, setTestRxFilter] = useState('all');
  const [testHomeFilter, setTestHomeFilter] = useState('all');
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgCatFilter, setPkgCatFilter] = useState('All');
  const [pkgSort, setPkgSort] = useState('popularity');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [testsData, setTestsData] = useState([]);
  const [packagesData, setPackagesData] = useState([]);
  const [reviewsData, setReviewsData] = useState([]);
  const [nearbyLabs, setNearbyLabs] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.getFacility(clinicId);
        const fac = result?.facility || result;
        if (!fac || fac.type !== 'lab') throw new Error('Not found');
        setFacility(fac);
        try {
          const [tests, pkgs, reviews, nearby] = await Promise.all([
            api.getTests({ hospitalId: clinicId }),
            api.getLabPackages({ hospitalId: clinicId }).catch(() => []),
            api.getReviews({ hospitalId: clinicId }).catch(() => []),
            api.getFacilities({ type: 'lab', limit: 4 }).catch(() => [])
          ]);
          setTestsData(tests || []);
          setPackagesData(pkgs || []);
          setReviewsData(reviews || []);
          setNearbyLabs(Array.isArray(nearby) ? nearby : nearby?.facilities || []);
        } catch {}
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clinicId]);

  const displayReviews = reviewsData.length > 0 ? reviewsData : REVIEWS_DATA;
  const displayNearbyLabs = nearbyLabs.length > 0 ? nearbyLabs : SUGGESTED_LABS;

  const clinic = facility ? {
    _id: facility._id || clinicId,
    name: facility.name || 'Diagnostic Center',
    type: deriveCategory(facility),
    rating: facility.rating || 4.5,
    reviewsCount: facility.reviewsCount || 0,
    verified: facility.status === 'approved',
    open: true,
    tags: ['NABL Accredited', 'Home Collection', 'Reports Online', 'Imaging Available', facility.specialties?.includes('Radiology') ? 'AERB Certified' : ''].filter(Boolean),
    testsAvailable: 350,
    homeCollection: true,
    reportTime: 'Within 6 hrs',
    distance: facility.distance ? `${facility.distance} km` : '1.2 km',
    phone: facility.phone || '',
    email: facility.email || '',
    address: facility.address || '',
    workingHours: facility.workingHours || '8:00 AM - 8:00 PM',
    startingPrice: 350,
    established: facility.establishedYear || 2020,
    qualifiedStaff: 1,
    treatmentAreas: 1,
    happyPatients: '2K+',
    nablNo: facility.nablNumber || 'NABL-CC-2020-01-00987',
    aerbNo: facility.aerbNumber || '',
    pathologist: facility.pathologistName || 'Dr. Sunita Reddy',
    pathologistQualification: facility.pathologistQualification || 'MD Pathology, DNB',
    radiologist: facility.radiologistName || '',
    radiologistQualification: facility.radiologistQualification || '',
    cardiologist: facility.cardiologistName || '',
    cardiologistQualification: facility.cardiologistQualification || '',
    technicianName: facility.technicianName || '',
    technicianRole: facility.technicianRole || '',
    technicianQualification: facility.technicianQualification || '',
    technicianExperience: facility.technicianExperience || '',
    timing: facility.timing || null,
    amenities: facility.amenities || null,
    socialLinks: facility.socialLinks || null,
    imagingFields: 'MRI, CT Scan, X-Ray, Ultrasound',
    cardiacFields: 'ECG, 2D Echo, TMT',
    equipment: { mri: '1.5 Tesla MRI', ct: '128-Slice CT Scanner' },
    cover: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&h=400&fit=crop',
    logo: facility.logo || facility.image || '',
    description: facility.description || 'Comprehensive diagnostic center offering pathology, imaging, and cardiac services.',
    offers: [
      { title: 'Flat 25% off on Full Body Checkup', code: 'LAB25', desc: 'Use code LAB25 to get 25% off on all full body checkup packages.' },
      { title: 'Free Home Collection', code: '', desc: 'Free home sample collection on orders above â‚¹599.' }
    ],
    policies: {
      report: 'Reports are delivered via email and app within the specified turnaround time. Hard copies available on request.',
      cancel: 'Tests can be cancelled within 2 hours of booking. Full refund processed within 5-7 business days.',
      refund: 'Full refund before sample collection. 50% refund after sample collection. No refund once report is generated.',
      fasting: 'Fasting of 8-12 hours recommended for glucose, lipid, and iron tests. Stay hydrated with water only.'
    }
  } : null;

  const clinicTests = testsData.length > 0 ? testsData.map(t => ({
    id: t._id,
    name: t.name,
    detailCategory: t.category,
    mrp: t.mrp,
    price: t.price,
    discount: t.discount || Math.round((1 - t.price / t.mrp) * 100),
    reportTime: t.reportTime || '24 hrs',
    homeCollection: t.homeCollection || false,
    rx: t.prescriptionReq || false,
    popular: t.popular || false,
  })) : ALL_TESTS;

  const clinicPackages = packagesData.length > 0 ? packagesData.map(p => ({
    id: p._id,
    name: p.name,
    detailCategory: 'Health Packages',
    price: p.price,
    mrp: p.mrp,
    discount: p.discount || Math.round((1 - p.price / p.mrp) * 100),
    includes: p.includes || [],
    popular: p.popular || false,
  })) : PACKAGES;
  const clinicEntries = entries.filter(e => e.item._id === clinicId);
  const clinicCartCount = clinicEntries.reduce((s, e) => s + e.qty, 0);
  const clinicCartTotal = clinicEntries.reduce((s, e) => s + e.item.price * e.qty, 0);

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

  const getTestIcon = (test) => {
    if (test.detailCategory === 'Imaging Tests') return Camera;
    if (test.detailCategory === 'Cardiac Tests') return Heart;
    return FlaskConical;
  };

  const renderTestCard = (test) => {
    const Icon = getTestIcon(test);
    const entry = clinicEntries.find(e => e.item.id === test.id);
    return (
      <motion.div key={test.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col"
      >
        <div className="p-4 pb-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-heading font-semibold text-sm text-foreground leading-tight">{test.name}</h4>
            {test.rx ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0"><Lock className="w-2 h-2" /> Rx</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Direct</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Icon className="w-3 h-3 text-primary" /> {test.detailCategory}
            {test.popular && <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">Popular</span>}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" /> {test.reportTime}
            </span>
            {test.homeCollection ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                <Home className="w-2 h-2" /> Home
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                <MapPin className="w-2 h-2" /> Visit
              </span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/30">
            <div>
              <span className="text-base font-bold text-foreground">â‚¹{test.price}</span>
              {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through ml-1">â‚¹{test.mrp}</span>}
              {test.discount > 0 && <span className="text-[9px] font-bold text-emerald-600 ml-1">{test.discount}% off</span>}
            </div>
            {test.rx ? (
              <Button size="sm" className="rounded-lg text-[10px] h-8 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowRx(true)}>
                <Lock className="w-3 h-3" /> Add
              </Button>
            ) : entry ? (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty - 1)} disabled={entry.qty <= 1}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-5 text-center text-[11px] font-bold">{entry.qty}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(test, clinic._id)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button size="sm" className="rounded-lg text-[10px] h-8" onClick={() => { addItem(test, clinic._id); toast.success(`${test.name} added`); }}>
                <ShoppingCart className="w-3 h-3" /> Add
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  useEffect(() => { window.scrollTo(0, 0); }, [clinicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lab details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Microscope className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Lab not found</h3>
          <Button variant="outline" onClick={() => navigate('/diagnostic-centers')}>Back to Labs</Button>
        </div>
      </div>
    );
  }

  const showPackages = catFilter === 'All' || catFilter === 'Health Packages';
  const testDepts = [...new Set(clinicTests.map(t => t.detailCategory))];
  const filteredTests = clinicTests.filter(t => {
    if (catFilter !== 'All' && t.detailCategory !== catFilter) return false;
    if (medSearch && !t.name.toLowerCase().includes(medSearch.toLowerCase())) return false;
    if (testRxFilter === 'rx' && !t.rx) return false;
    if (testHomeFilter === 'yes' && !t.homeCollection) return false;
    if (testHomeFilter === 'no' && t.homeCollection) return false;
    return true;
  });
  const sortedTests = [...filteredTests].sort((a, b) => {
    if (testSort === 'price-low') return a.price - b.price;
    if (testSort === 'price-high') return b.price - a.price;
    if (testSort === 'name') return a.name.localeCompare(b.name);
    return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
  });

  const pkgCategories = [...new Set(clinicPackages.map(p => {
    if (p.name.toLowerCase().includes('full body')) return 'Full Body';
    if (p.name.toLowerCase().includes('cardiac')) return 'Cardiac';
    if (p.name.toLowerCase().includes('diabetes')) return 'Diabetes';
    if (p.name.toLowerCase().includes('women') || p.name.toLowerCase().includes('wellness')) return 'Wellness';
    if (p.name.toLowerCase().includes('senior')) return 'Senior';
    return 'Other';
  }))];
  const filteredPackages = clinicPackages.filter(p => {
    if (pkgCatFilter !== 'All') {
      const cat = p.name.toLowerCase().includes('full body') ? 'Full Body'
        : p.name.toLowerCase().includes('cardiac') ? 'Cardiac'
        : p.name.toLowerCase().includes('diabetes') ? 'Diabetes'
        : (p.name.toLowerCase().includes('women') || p.name.toLowerCase().includes('wellness')) ? 'Wellness'
        : p.name.toLowerCase().includes('senior') ? 'Senior' : 'Other';
      if (cat !== pkgCatFilter) return false;
    }
    if (pkgSearch && !p.name.toLowerCase().includes(pkgSearch.toLowerCase())) return false;
    return true;
  });
  const sortedPackages = [...filteredPackages].sort((a, b) => {
    if (pkgSort === 'price-low') return a.price - b.price;
    if (pkgSort === 'price-high') return b.price - a.price;
    if (pkgSort === 'name') return a.name.localeCompare(b.name);
    return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
  });

  const testCount = clinicTests.filter(t => catFilter === 'All' || t.detailCategory === catFilter).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/diagnostic-centers')} className="hover:text-foreground transition-colors flex items-center gap-1.5 group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> Find Labs
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium truncate">{clinic.name}</span>
        </motion.div>

        {/* â•â•â•â•â•â•â•â• 1. HERO SECTION â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Gallery */}
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-card border border-border/50 h-[300px] sm:h-[420px] group">
              <img src={clinic.cover} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-primary/90 text-white border-0 text-xs px-3 py-1.5 rounded-full shadow-lg">{clinic.type}</Badge>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Bookmarked')}>
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 flex flex-col shadow-sm w-full">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10">
                  {clinic.logo ? (
                    <img src={clinic.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Microscope className="w-7 h-7 text-primary" />
                  )}
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
                  <div>
                    <span>{clinic.address}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Navigation className="w-3 h-3" />{clinic.distance} away</p>
                  </div>
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
                {clinic.open ? `Open Now â€” ${clinic.workingHours}` : 'Closed'}
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={() => navigate('/book-test/' + clinicId)}>
                  <CalendarDays className="w-4 h-4" /> Book Tests
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`)}>
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

        {/* â•â•â•â•â•â•â•â• STATUS CARDS â•â•â•â•â•â•â•â• */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon:CalendarDays, value:clinic.established, label:'Since', color:'text-blue-500', bg:'bg-blue-500/10' },
              { icon:Users, value:clinic.qualifiedStaff, label:'Qualified professionals', color:'text-emerald-500', bg:'bg-emerald-500/10' },
              { icon:FlaskConical, value:clinic.treatmentAreas, label:'Treatment areas', color:'text-violet-500', bg:'bg-violet-500/10' },
              { icon:Heart, value:clinic.happyPatients, label:'Happy patients', color:'text-rose-500', bg:'bg-rose-500/10' },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', item.bg)}>
                  <item.icon className={cn('w-5 h-5', item.color)} />
                </div>
                <p className="text-2xl font-bold text-foreground font-heading">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* â•â•â•â•â•â•â•â• MAIN CONTENT + SIDEBAR â•â•â•â•â•â•â•â• */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <ServiceLocationMap entityType="lab" entity={clinic} />
            </motion.div>

            {/* Tests & Packages */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted/50 p-0.5 rounded-lg border border-border/40 flex">
                        <button onClick={() => setLabSectionTab('tests')}
                          className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', labSectionTab === 'tests' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          Tests
                        </button>
                        <button onClick={() => setLabSectionTab('packages')}
                          className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', labSectionTab === 'packages' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          Packages
                        </button>
                        <button onClick={() => setLabSectionTab('specialists')}
                          className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', labSectionTab === 'specialists' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          Specialists
                        </button>
                      </div>
                      <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><FlaskConical className="w-4 h-4 text-primary" /></span>
                        {labSectionTab === 'tests' ? <>Tests <span className="text-base font-normal text-muted-foreground">({clinicTests.length})</span></> : labSectionTab === 'packages' ? `Packages (${clinicPackages.length})` : 'Specialists'}
                      </h2>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 pt-4">
                  {/* Tests Tab */}
                  <div className={labSectionTab !== 'tests' ? 'hidden' : ''}>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {CATEGORIES.filter(c => c !== 'Health Packages').map(c => (
                        <button key={c} onClick={() => setCatFilter(c)}
                          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', catFilter === c ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                          {c === 'All' ? `All (${clinicTests.length})` : c}
                        </button>
                      ))}
                    </div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={medSearch} onChange={e => setMedSearch(e.target.value)}
                        placeholder="Search tests..." className="pl-10 h-10 text-sm rounded-xl bg-background border-border/50" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <select value={testSort} onChange={e => setTestSort(e.target.value)}
                        className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="popularity">Popular</option>
                        <option value="price-low">Price: Low</option>
                        <option value="price-high">Price: High</option>
                        <option value="name">Name</option>
                      </select>
                      <button onClick={() => setTestRxFilter(testRxFilter === 'rx' ? 'all' : 'rx')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1', testRxFilter === 'rx' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                        <Lock className="w-3 h-3" /> Rx
                      </button>
                      <button onClick={() => setTestHomeFilter(testHomeFilter === 'yes' ? 'all' : 'yes')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1', testHomeFilter === 'yes' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                        <Home className="w-3 h-3" /> Home Collection
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{sortedTests.length} test{sortedTests.length !== 1 ? 's' : ''} found</p>
                    {sortedTests.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                        <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No tests match your filters</p>
                      </div>
                    ) : (
                      <div className="max-h-[460px] overflow-y-auto pr-1"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sortedTests.map(test => renderTestCard(test))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Packages Tab */}
                  <div className={labSectionTab !== 'packages' ? 'hidden' : ''}>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {['All', ...pkgCategories].map(c => (
                        <button key={c} onClick={() => setPkgCatFilter(c)}
                          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', pkgCatFilter === c ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                          {c === 'All' ? `All (${clinicPackages.length})` : c}
                        </button>
                      ))}
                    </div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={pkgSearch} onChange={e => setPkgSearch(e.target.value)}
                        placeholder="Search packages..." className="pl-10 h-10 text-sm rounded-xl bg-background border-border/50" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <select value={pkgSort} onChange={e => setPkgSort(e.target.value)}
                        className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="popularity">Popular</option>
                        <option value="price-low">Price: Low</option>
                        <option value="price-high">Price: High</option>
                        <option value="name">Name</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{sortedPackages.length} package{sortedPackages.length !== 1 ? 's' : ''} found</p>
                    {sortedPackages.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                        <Sparkles className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No packages match your filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedPackages.map((pkg, i) => {
                          const pkgEntry = clinicEntries.find(e => e.item.id === pkg.id);
                          return (
                            <motion.div key={pkg.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col relative"
                            >
                              {pkg.popular && (
                                <span className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-xl text-[8px] font-bold bg-emerald-500 text-white shadow-md z-10">
                                  BEST VALUE
                                </span>
                              )}
                              <div className="p-4 pb-3 flex flex-col flex-1">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-bl-full pointer-events-none" />
                                <div className="flex items-start gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-400/5 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
                                    <Sparkles className="w-5 h-5 text-emerald-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-heading font-semibold text-sm text-foreground leading-tight">{pkg.name}</h4>
                                    <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-500/12 px-2 py-0.5 rounded-full mt-1.5">Health Package</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {pkg.includes.map((inc, j) => (
                                    <span key={j} className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/30">{inc}</span>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                                  <div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-base font-bold text-foreground">â‚¹{pkg.price}</span>
                                      {pkg.mrp > pkg.price && <span className="text-[10px] text-muted-foreground line-through">â‚¹{pkg.mrp}</span>}
                                      {pkg.mrp > pkg.price && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/12 px-1.5 py-0.5 rounded-full">{pkg.discount}% off</span>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-500" /> Full body checkup</p>
                                  </div>
                                  {pkgEntry ? (
                                    <div className="flex items-center gap-1">
                                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(pkgEntry.key, pkgEntry.qty - 1)} disabled={pkgEntry.qty <= 1}>
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="w-5 text-center text-[11px] font-bold">{pkgEntry.qty}</span>
                                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(pkg, clinic._id)}>
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" className="rounded-lg text-[10px] h-8 gap-1" onClick={() => { addItem(pkg, clinic._id); toast.success(`${pkg.name} added`); }}>
                                      <ShoppingCart className="w-3 h-3" /> Add
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Specialists Tab */}
                  <div className={labSectionTab !== 'specialists' ? 'hidden' : ''}>
                    <p className="text-xs text-muted-foreground mb-4">Qualified specialists at this lab</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        clinic.pathologist && {
                          name: clinic.pathologist,
                          qualification: clinic.pathologistQualification,
                          role: 'Pathologist', icon:Microscope, color:'text-blue-500', bg:'bg-blue-500/10'
                        },
                        clinic.radiologist && {
                          name: clinic.radiologist,
                          qualification: clinic.radiologistQualification,
                          role: 'Radiologist', icon:Eye, color:'text-violet-500', bg:'bg-violet-500/10'
                        },
                        clinic.cardiologist && {
                          name: clinic.cardiologist,
                          qualification: clinic.cardiologistQualification,
                          role: 'Cardiologist', icon:Heart, color:'text-rose-500', bg:'bg-rose-500/10'
                        },
                      ].filter(Boolean).map((doc, i) => (
                        <div key={i} className="bg-card rounded-2xl border border-border/50 p-5 hover:shadow-md hover:border-primary/20 transition-all flex items-start gap-4">
                          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-border/30', doc.bg)}>
                            <doc.icon className={cn('w-7 h-7', doc.color)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-sm">{doc.name}</p>
                            <p className="text-xs text-primary font-medium">{doc.role}</p>
                            {doc.qualification && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3 shrink-0" />
                                {doc.qualification}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {clinic.technicianName && (
                        <div className="bg-card rounded-2xl border border-border/50 p-5 hover:shadow-md hover:border-primary/20 transition-all flex items-start gap-4 cursor-pointer group" onClick={() => navigate(`/technician/${clinic._id}`)}>
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border-2 border-border/30">
                            <Briefcase className="w-7 h-7 text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{clinic.technicianName}</p>
                              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <p className="text-xs text-primary font-medium">{clinic.technicianRole || 'Lab Technician'}</p>
                            {clinic.technicianQualification && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3 shrink-0" />
                                {clinic.technicianQualification}
                              </p>
                            )}
                            {clinic.technicianExperience && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Briefcase className="w-3 h-3 shrink-0" />
                                {clinic.technicianExperience}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Equipment & Facility Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Activity} label="Equipment & Facility Info" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon:Activity, label:'MRI Scanner', value:clinic.equipment?.mri || 'Not Available' },
                      { icon:Activity, label:'CT Scanner', value:clinic.equipment?.ct || 'Not Available' },
                      { icon:Microscope, label:'Pathology Lab', value:'Fully Equipped' },
                      { icon:Heart, label:'Cardiac Lab', value:'ECG, 2D Echo, TMT' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{item.label}</p>
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upload Prescription */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={FileText} label="Upload Prescription" />
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                      <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer relative group"
                        onClick={() => document.getElementById('rx-upload')?.click()}>
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">Upload your prescription</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB)</p>
                        <input id="rx-upload" type="file" accept="image/*,.pdf" className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) toast.success('Prescription uploaded'); }} />
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
                          <p className="text-xs text-amber-700 dark:text-amber-400">Lab will verify your prescription before processing. You will be notified once approved.</p>
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

            {/* Sample Collection Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Clock4} label="Sample Collection Info" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Preferred Time Slot</label>
                      <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
                        className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Select a slot</option>
                        <option value="7-9">7:00 AM - 9:00 AM</option>
                        <option value="9-12">9:00 AM - 12:00 PM</option>
                        <option value="12-3">12:00 PM - 3:00 PM</option>
                        <option value="3-6">3:00 PM - 6:00 PM</option>
                        <option value="6-8">6:00 PM - 8:00 PM</option>
                      </select>
                    </div>
                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <Home className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Home Collection</p>
                      <p className="text-sm font-semibold text-foreground">Available for pathology tests only</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Blood and urine samples collected from home</p>
                    </div>
                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Visit Required</p>
                      <p className="text-sm font-semibold text-foreground">For imaging & cardiac tests</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Please visit the center for scans and cardiac diagnostics</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Weekly Schedule */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={CalendarDays} label="Weekly Schedule" />
                  {clinic.timing ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Day</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Timings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DAY_ORDER.map(day => {
                            const slot = clinic.timing?.[day];
                            const active = slot && slot !== 'Closed';
                            const label = DAY_LABELS[day];
                            const isToday = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase() === day;
                            return (
                              <tr key={day} className={cn(
                                'border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors',
                                isToday && 'bg-primary/5'
                              )}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className={cn('w-2 h-2 rounded-full', active ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                                    <span className={cn('font-medium', isToday ? 'text-primary' : 'text-foreground')}>
                                      {label}
                                      {isToday && <span className="ml-2 text-xs text-primary font-semibold">(Today)</span>}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={cn(
                                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                                    active
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                      : 'bg-muted text-muted-foreground'
                                  )}>
                                    {active ? 'Open' : 'Closed'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {active ? slot : 'â€”'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/30 border border-border/60 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span>Working Hours: <span className="font-medium text-foreground">{clinic.workingHours}</span></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities & Amenities */}
            {clinic.amenities && (
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <SectionTitle icon={Building2} label="Facilities & Amenities" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {AMENITIES_LIST.map(({ key, label, icon:Icon }) => {
                        const available = clinic.amenities?.[key] === true;
                        return (
                          <div key={key} className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                            available
                              ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-800'
                              : 'bg-muted/20 border-border/30 opacity-50'
                          )}>
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', available ? 'bg-emerald-500/10' : 'bg-muted/30')}>
                              <Icon className={cn('w-4.5 h-4.5', available ? 'text-emerald-500' : 'text-muted-foreground')} />
                            </div>
                            <span className={cn('text-[10px] font-semibold text-center leading-tight', available ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
                              {label}
                            </span>
                            <span className={cn('text-[8px] font-bold', available ? 'text-emerald-600' : 'text-muted-foreground')}>
                              {available ? 'Available' : 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Location & Contact */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={MapPin} label="Location & Contact" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-5 border border-border/40">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <MapPin className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">Address</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{clinic.address}</p>
                      <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-lg text-xs h-8"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`)}>
                        <Navigation className="w-3 h-3" /> Get Directions
                      </Button>
                    </div>
                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-5 border border-border/40">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Phone className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">Contact</p>
                      <a href={`tel:${clinic.phone}`} className="text-xs text-primary font-medium hover:underline block mb-1">
                        {clinic.phone || 'N/A'}
                      </a>
                      {clinic.email && (
                        <p className="text-xs text-muted-foreground">{clinic.email}</p>
                      )}
                      {clinic.socialLinks && (
                        <div className="flex items-center gap-2 mt-3">
                          {clinic.socialLinks.facebook && (
                            <a href={clinic.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                              <Globe className="w-4 h-4 text-blue-600" />
                            </a>
                          )}
                          {clinic.socialLinks.instagram && (
                            <a href={clinic.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center hover:bg-pink-500/20 transition-colors">
                              <Globe className="w-4 h-4 text-pink-600" />
                            </a>
                          )}
                          {clinic.socialLinks.youtube && (
                            <a href={clinic.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                              <Globe className="w-4 h-4 text-red-600" />
                            </a>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs h-8" asChild>
                          <a href={`tel:${clinic.phone}`}><Phone className="w-3 h-3" /> Call</a>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs h-8" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                          <Link className="w-3 h-3" /> Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Offers */}
            {clinic.offers.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <SectionTitle icon={Tag} label={`Offers & Deals (${clinic.offers.length})`} />
                    <div className="space-y-3">
                      {clinic.offers.map((offer, i) => (
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

            {/* About */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label={`About ${clinic.name}`} />
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{clinic.description}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label:'NABL No.', value:clinic.nablNo, icon:Award },
                      { label:'AERB No.', value:clinic.aerbNo || 'N/A', icon:Shield },
                      { label:'Pathologist', value:clinic.pathologist, icon:Stethoscope },
                      { label:'Radiologist', value:clinic.radiologist || 'N/A', icon:Eye },
                      { label:'Cardiologist', value:clinic.cardiologist || 'N/A', icon:Heart },
                      { label:'Established', value:clinic.established, icon:CalendarDays },
                      clinic.technicianName ? { label:'Lab Technician', value:clinic.technicianName, icon:Users, link:true } : null,
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} onClick={() => item.link ? navigate(`/technician/${clinic._id}`) : null}
                        className={cn(
                          'bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40 hover:border-primary/20 transition-all',
                          item.link && 'cursor-pointer hover:bg-primary/[0.02]'
                        )}>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{item.label}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-bold text-foreground">{item.value}</p>
                          {item.link && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                      </div>
                    ))}
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
                    <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => setShowReviewDialog(true)}>
                      <Star className="w-3.5 h-3.5" /> Write a Review
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-6 mb-6 p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/40">
                    <div className="text-center min-w-[100px]">
                      <div className="text-4xl font-bold text-foreground">{clinic.rating}</div>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-4 h-4', i <= Math.round(clinic.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{clinic.reviewsCount} total</p>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {[5,4,3,2,1].map(s => {
                        const count = displayReviews.filter(r => Math.round(r.rating) === s).length;
                        const pct = displayReviews.length > 0 ? (count / displayReviews.length) * 100 : 0;
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
                    {displayReviews.map((r, i) => (
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
                  <SectionTitle icon={ShieldCheck} label="Lab Policies" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon:Clock, title:'Report Delivery', desc:clinic.policies.report, color:'text-blue-500', bg:'bg-blue-500/10' },
                      { icon:X, title:'Cancellation', desc:clinic.policies.cancel, color:'text-red-500', bg:'bg-red-500/10' },
                      { icon:ArrowLeft, title:'Refund Policy', desc:clinic.policies.refund, color:'text-emerald-500', bg:'bg-emerald-500/10' },
                      { icon:Utensils, title:'Fasting Guidelines', desc:clinic.policies.fasting, color:'text-amber-500', bg:'bg-amber-500/10' },
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

          {/* â”€â”€â”€â”€ RIGHT SIDEBAR â”€â”€â”€â”€ */}
          <div className="space-y-6">

            {/* Trust & Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="w-3.5 h-3.5 text-primary" /></span>
                    Trust & Info
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {[
                        ['Tests Available', `${clinic.testsAvailable}+`],
                        ['Imaging', clinic.imagingFields],
                        ['Cardiac', clinic.cardiacFields],
                        ['Home Collection', 'Available (blood tests only)'],
                        ['Report Time', clinic.reportTime],
                        ['Distance', clinic.distance],
                        ['Working Hours', clinic.workingHours],
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
                        <span className="text-xs font-semibold text-foreground">NABL Accredited</span>
                      </div>
                      {clinic.aerbNo !== 'N/A' && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-semibold text-foreground">AERB Certified</span>
                        </div>
                      )}
                    </div>
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
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified Lab
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10">
                      <Award className="w-3.5 h-3.5" /> NABL Accredited
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10">
                      <Users className="w-3.5 h-3.5" /> 1K+ Tests Done
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions + Address */}
            <div className="space-y-6 self-start w-full lg:sticky lg:top-24">
            {/* Quick Actions */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></span>
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button className="w-full gap-2.5 rounded-xl h-11 font-semibold shadow-md" onClick={() => navigate('/book-test/' + clinicId)}>
                      <FlaskConical className="w-4 h-4" /> Book Tests
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`tel:${clinic.phone}`}><Phone className="w-4 h-4" /> Call Now</a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`mailto:${clinic.email || ''}`}><Mail className="w-4 h-4" /> Email Now</a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Saved to favorites')}>
                      <Heart className="w-4 h-4" /> Save
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Sharing...')}>
                      <Share2 className="w-4 h-4" /> Share Lab
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => setShowReviewDialog(true)}>
                      <Star className="w-4 h-4" /> Write a Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Address */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></span>
                    Address
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{clinic.address}</p>
                  <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl h-10" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`)}>
                    <Navigation className="w-4 h-4" /> View in G Map
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            </div>

          </div>
        </div>

        {/* â•â•â•â•â•â•â•â• SUGGESTED LABS â•â•â•â•â•â•â•â• */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-8 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Suggested Labs Nearby
            </h2>
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => navigate('/lab')}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayNearbyLabs.map((lab, i) => (
              <DiagnosticCenterCard key={lab._id} clinic={lab} index={i} />
            ))}
          </div>
        </motion.div>

      </div>

      {/* â•â•â• PRESCRIPTION MODAL â•â•â• */}
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
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 sm:p-10 text-center mb-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer relative group" onClick={() => document.getElementById('rx-modal-upload')?.click()}>
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                <Upload className="w-7 h-7 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Tap to upload prescription</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB)</p>
              <input id="rx-modal-upload" type="file" accept="image/*,.pdf" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { toast.success('Prescription uploaded'); setShowRx(false); } }} />
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
                  Lab will verify your prescription before processing. You will be notified once approved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* â•â•â• BOTTOM STICKY BAR â•â•â• */}
      {clinicCartCount > 0 && (
        <motion.div initial={{ y:100 }} animate={{ y:0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{clinicCartCount} test{clinicCartCount > 1 ? 's' : ''} selected</span>
                <span className="text-lg font-bold text-foreground block leading-tight">â‚¹{clinicCartTotal}</span>
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-lg shadow-primary/30 px-6 h-11" onClick={() => navigate('/cart')}>
              Book Now <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    
      <ReviewDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog}
        entityType="lab"
        entityId={clinicId}
        entityName={clinic?.name}
        onReviewSubmitted={(review) => {
          setReviewsData(prev => [review, ...(Array.isArray(prev) ? prev : [])]);
        }}
      />
    </div>
  );
}
