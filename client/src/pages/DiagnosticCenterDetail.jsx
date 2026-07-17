import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, ShieldCheck, Home, Clock, MapPin, Phone, Mail, ArrowLeft,
  BadgeCheck, FlaskConical, ShoppingCart, Camera, Upload, Share2,
  Navigation, Percent, Tag, AlertCircle, X, FileText, Zap, Info,
  Copy, CheckCircle2, CalendarDays, Award, Search, Plus, Minus, Lock,
  ChevronRight, Sparkles, Microscope, Clock4, Utensils, Heart,
  Droplets, Activity, Bone, Eye, Stethoscope, Pill, Calendar, Users, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const MOCK_CLINICS = [
  {
    _id:'c4', name:'Apollo Diagnostics', type:'Diagnostic Center', rating:4.7, reviewsCount:420,
    verified:true, open:true, tags:['NABL Accredited','Home Collection','Reports Online','24x7','Imaging Available'],
    testsAvailable:400, homeCollection:true, reportTime:'Within 4 hrs',
    distance:'3.0 km', phone:'9876543213', email:'care@apollodiagnostics.com',
    address:'Block D, Health City, Mumbai 400001',
    workingHours:'24x7', startingPrice:350, established:2010,
    nablNo:'NABL-CC-2020-01-00987', pathologist:'Dr. Sunita Reddy',
    imagingFields:'MRI, CT Scan, X-Ray, Ultrasound',
    cardiacFields:'ECG, 2D Echo, TMT',
    radiologist:'Dr. Arjun Mehta',
    cardiologist:'Dr. Neha Kapoor',
    equipment:{ mri:'1.5 Tesla MRI', ct:'128-Slice CT Scanner' },
    cover:'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&h=400&fit=crop',
    logo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=200&h=200&fit=crop',
    description:'Apollo Diagnostics is a premier diagnostic center offering comprehensive pathology, imaging, and cardiac services with state-of-the-art equipment and expert radiologists.',
    fasting:['Glucose (Fasting)','Lipid Profile','Iron Studies'],
    offers:[
      { title:'Flat 25% off on Full Body Checkup', code:'APOLLO25', desc:'Use code APOLLO25 to get 25% off on all full body checkup packages.' },
      { title:'Free Home Collection', code:'', desc:'Free home sample collection on orders above ₹599.' }
    ],
    policies:{
      report:'Reports are delivered via email and app within the specified turnaround time. Hard copies available on request.',
      cancel:'Tests can be cancelled within 2 hours of booking. Full refund processed within 5-7 business days.',
      refund:'Full refund before sample collection. 50% refund after sample collection. No refund once report is generated.',
      fasting:'Fasting of 8-12 hours recommended for glucose, lipid, and iron tests. Stay hydrated with water only.'
    }
  },
  {
    _id:'c5', name:'Thyrocare Technologies', type:'Diagnostic Center', rating:4.8, reviewsCount:350,
    verified:true, open:true, tags:['NABL Accredited','Home Collection','Reports Online','Imaging Available'],
    testsAvailable:500, homeCollection:true, reportTime:'Within 24 hrs',
    distance:'2.5 km', phone:'9876543211', email:'care@thyrocare.com',
    address:'456, Wellness Road, Sector 7, Los Angeles, CA 90012',
    workingHours:'6:00 AM - 10:00 PM', startingPrice:299, established:2012,
    nablNo:'NABL-CC-2020-01-00456', pathologist:'Dr. Priya Sharma',
    imagingFields:'MRI, CT, X-Ray',
    cardiacFields:'ECG, 2D Echo',
    equipment:{ mri:'1.5 Tesla MRI', ct:'64-Slice CT Scanner' },
    cover:'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=400&fit=crop',
    logo:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&h=200&fit=crop',
    description:'Thyrocare Technologies is a fully automated diagnostic center offering advanced pathology, imaging, and cardiac services with precise results and affordable pricing.',
    fasting:['Thyroid Panel (Fasting)','Vitamin D','Vitamin B12'],
    offers:[
      { title:'Buy 2 Packages Get 1 Free', code:'B2G1', desc:'On all preventive health checkup packages.' }
    ],
    policies:{
      report:'Digital reports available within 24 hours. Physical copies can be collected from the center.',
      cancel:'Free cancellation within 1 hour of booking.',
      refund:'Full refund before sample collection.',
      fasting:'Fasting required for thyroid and vitamin tests. Water is allowed.'
    }
  },
  {
    _id:'c6', name:'Vijaya Diagnostic Centre', type:'Diagnostic Center', rating:4.5, reviewsCount:310,
    verified:true, open:false, tags:['NABL Accredited','Home Collection','Imaging Available'],
    testsAvailable:350, homeCollection:true, reportTime:'Within 6 hrs',
    distance:'6.0 km', phone:'9876543215',
    address:'789, Market Street, Chicago, IL 60607',
    workingHours:'8:00 AM - 8:00 PM', startingPrice:180, established:2015,
    nablNo:'NABL-CC-2019-01-00789', pathologist:'Dr. Amit Patel',
    imagingFields:'X-Ray, Ultrasound',
    cardiacFields:'ECG',
    cover:'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&h=400&fit=crop',
    logo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=200&h=200&fit=crop',
    description:'Vijaya Diagnostic Centre is a trusted name in diagnostic services, offering quality pathology testing and basic imaging facilities at affordable rates.',
    fasting:['Liver Function (Fasting)','Kidney Function','HbA1c'],
    offers:[],
    policies:{
      report:'Reports delivered within 6 hours via email and WhatsApp.',
      cancel:'Cancellation accepted within 3 hours of booking.',
      refund:'75% refund before sample collection. No refund after.',
      fasting:'Fasting of 10-12 hours recommended for accurate results.'
    }
  }
];

const CATEGORIES = ['All', 'Pathology Tests', 'Imaging Tests', 'Cardiac Tests', 'Health Packages'];

const ALL_TESTS = [
  { id:'dc1', name:'Complete Blood Count (CBC)', detailCategory:'Pathology Tests', mrp:399, price:249, discount:38, reportTime:'6 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c4' },
  { id:'dc2', name:'Thyroid Profile (T3,T4,TSH)', detailCategory:'Pathology Tests', mrp:699, price:449, discount:36, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc3', name:'Lipid Profile', detailCategory:'Pathology Tests', mrp:599, price:349, discount:42, reportTime:'8 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c4' },
  { id:'dc4', name:'Blood Glucose (Fasting)', detailCategory:'Pathology Tests', mrp:150, price:99, discount:34, reportTime:'4 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc5', name:'Liver Function Test', detailCategory:'Pathology Tests', mrp:799, price:499, discount:38, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc6', name:'Kidney Function Test', detailCategory:'Pathology Tests', mrp:699, price:449, discount:36, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc7', name:'HbA1c', detailCategory:'Pathology Tests', mrp:499, price:299, discount:40, reportTime:'8 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc8', name:'Vitamin D Total', detailCategory:'Pathology Tests', mrp:1299, price:799, discount:38, reportTime:'24 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c4' },
  { id:'dc9', name:'Urine Routine', detailCategory:'Pathology Tests', mrp:199, price:129, discount:35, reportTime:'6 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c4' },
  { id:'dc10', name:'MRI Brain', detailCategory:'Imaging Tests', mrp:4999, price:3499, discount:30, reportTime:'1 hr', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc11', name:'MRI Spine', detailCategory:'Imaging Tests', mrp:5999, price:4499, discount:25, reportTime:'1 hr', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc12', name:'CT Scan Chest', detailCategory:'Imaging Tests', mrp:3999, price:2999, discount:25, reportTime:'45 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc13', name:'CT Scan Abdomen', detailCategory:'Imaging Tests', mrp:4499, price:3299, discount:27, reportTime:'45 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc14', name:'X-Ray Chest', detailCategory:'Imaging Tests', mrp:499, price:349, discount:30, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc15', name:'X-Ray Knee', detailCategory:'Imaging Tests', mrp:599, price:399, discount:33, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc16', name:'Ultrasound Abdomen', detailCategory:'Imaging Tests', mrp:1499, price:999, discount:33, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc17', name:'Ultrasound Pelvis', detailCategory:'Imaging Tests', mrp:1299, price:899, discount:31, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc18', name:'ECG', detailCategory:'Cardiac Tests', mrp:399, price:249, discount:38, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc19', name:'2D Echo', detailCategory:'Cardiac Tests', mrp:2499, price:1799, discount:28, reportTime:'1 hr', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc20', name:'TMT (Stress Test)', detailCategory:'Cardiac Tests', mrp:1999, price:1499, discount:25, reportTime:'2 hrs', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc21', name:'Holter Monitoring', detailCategory:'Cardiac Tests', mrp:3499, price:2499, discount:29, reportTime:'48 hrs', homeCollection:false, rx:true, popular:false, clinicId:'c4' },
  { id:'dc22', name:'Complete Blood Count (CBC)', detailCategory:'Pathology Tests', mrp:349, price:199, discount:43, reportTime:'8 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c5' },
  { id:'dc23', name:'Thyroid Profile', detailCategory:'Pathology Tests', mrp:599, price:399, discount:33, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c5' },
  { id:'dc24', name:'Lipid Profile', detailCategory:'Pathology Tests', mrp:499, price:299, discount:40, reportTime:'8 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c5' },
  { id:'dc25', name:'Vitamin D Total', detailCategory:'Pathology Tests', mrp:999, price:649, discount:35, reportTime:'24 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c5' },
  { id:'dc26', name:'MRI Brain', detailCategory:'Imaging Tests', mrp:4499, price:3299, discount:27, reportTime:'1 hr', homeCollection:false, rx:true, popular:false, clinicId:'c5' },
  { id:'dc27', name:'CT Scan Chest', detailCategory:'Imaging Tests', mrp:3499, price:2699, discount:23, reportTime:'45 mins', homeCollection:false, rx:true, popular:false, clinicId:'c5' },
  { id:'dc28', name:'X-Ray Chest', detailCategory:'Imaging Tests', mrp:449, price:299, discount:33, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c5' },
  { id:'dc29', name:'ECG', detailCategory:'Cardiac Tests', mrp:349, price:199, discount:43, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c5' },
  { id:'dc30', name:'2D Echo', detailCategory:'Cardiac Tests', mrp:2199, price:1599, discount:27, reportTime:'1 hr', homeCollection:false, rx:true, popular:false, clinicId:'c5' },
  { id:'dc31', name:'Complete Blood Count (CBC)', detailCategory:'Pathology Tests', mrp:299, price:179, discount:40, reportTime:'6 hrs', homeCollection:true, rx:false, popular:true, clinicId:'c6' },
  { id:'dc32', name:'Blood Glucose (Fasting)', detailCategory:'Pathology Tests', mrp:120, price:79, discount:34, reportTime:'4 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c6' },
  { id:'dc33', name:'Liver Function Test', detailCategory:'Pathology Tests', mrp:699, price:399, discount:43, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c6' },
  { id:'dc34', name:'Kidney Function Test', detailCategory:'Pathology Tests', mrp:599, price:349, discount:42, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c6' },
  { id:'dc35', name:'HbA1c', detailCategory:'Pathology Tests', mrp:449, price:249, discount:45, reportTime:'8 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c6' },
  { id:'dc36', name:'Urine Routine', detailCategory:'Pathology Tests', mrp:149, price:99, discount:34, reportTime:'6 hrs', homeCollection:true, rx:false, popular:false, clinicId:'c6' },
  { id:'dc37', name:'X-Ray Chest', detailCategory:'Imaging Tests', mrp:399, price:249, discount:38, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c6' },
  { id:'dc38', name:'Ultrasound Abdomen', detailCategory:'Imaging Tests', mrp:1299, price:899, discount:31, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c6' },
  { id:'dc39', name:'ECG', detailCategory:'Cardiac Tests', mrp:299, price:179, discount:40, reportTime:'30 mins', homeCollection:false, rx:true, popular:false, clinicId:'c6' },
];

const PACKAGES = [
  { id:'dp1', name:'Full Body Checkup (70 parameters)', detailCategory:'Health Packages', price:999, mrp:1999, discount:50, includes:['CBC','Blood Sugar','Lipid Profile','Liver Function','Kidney Function','Thyroid','Vitamin D','Urine Routine'], popular:true, clinicId:'c4' },
  { id:'dp2', name:'Cardiac Risk Assessment', detailCategory:'Health Packages', price:1499, mrp:2999, discount:50, includes:['Lipid Profile','ECG','2D Echo','CRP','Troponin I'], popular:true, clinicId:'c4' },
  { id:'dp3', name:'Diabetes Package', detailCategory:'Health Packages', price:699, mrp:1249, discount:44, includes:['Fasting Blood Sugar','HbA1c','Urine Routine','Lipid Profile'], popular:false, clinicId:'c4' },
  { id:'dp4', name:'Women Wellness Package', detailCategory:'Health Packages', price:1799, mrp:3499, discount:49, includes:['CBC','Thyroid','Vitamin D','Iron Studies','Pap Smear'], popular:false, clinicId:'c5' },
  { id:'dp5', name:'Full Body Checkup (50 parameters)', detailCategory:'Health Packages', price:799, mrp:1599, discount:50, includes:['CBC','Blood Sugar','Lipid Profile','Liver Function','Kidney Function','Urine Routine'], popular:true, clinicId:'c5' },
  { id:'dp6', name:'Full Body Checkup (40 parameters)', detailCategory:'Health Packages', price:649, mrp:1299, discount:50, includes:['CBC','Blood Sugar','Liver Function','Kidney Function'], popular:true, clinicId:'c6' },
];

const REVIEWS_DATA = [
  { id:'r1', user:'Rahul M.', rating:5, comment:'Very accurate reports and quick turnaround. Home collection was convenient.', date:'2 days ago' },
  { id:'r2', user:'Priya S.', rating:4, comment:'Good diagnostic center. Reports were delivered on time.', date:'1 week ago' },
  { id:'r3', user:'Amit K.', rating:5, comment:'Excellent service. The radiologist explained everything clearly.', date:'2 weeks ago' },
  { id:'r4', user:'Neha G.', rating:3, comment:'Reports were slightly delayed but quality was good.', date:'3 weeks ago' },
  { id:'r5', user:'Vikram J.', rating:4, comment:'Clean facility and professional staff. Highly recommended.', date:'1 month ago' },
];

function getClinicById(id) { return MOCK_CLINICS.find(c => c.id === id || c._id === id) || MOCK_CLINICS[0]; }

function fadeUp(i) {
  return { initial:{ opacity:0, y:20 }, animate:{ opacity:1, y:0 }, transition:{ delay:i * 0.06, duration:0.4 } };
}

function SectionCard({ icon:Icon, title, children, className }) {
  return (
    <motion.div {...fadeUp(0)} className={cn('bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2.5 text-base">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          {title}
        </h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function SidebarCard({ icon:Icon, title, children }) {
  return (
    <motion.div {...fadeUp(0)} className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border/30 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {title}
        </h4>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

export default function DiagnosticCenterDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const clinic = getClinicById(clinicId);
  const { entries, addItem, updateQty } = useCart();

  const [showRx, setShowRx] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [medSearch, setMedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [selectedSlot, setSelectedSlot] = useState('');

  const clinicTests = ALL_TESTS.filter(t => t.clinicId === clinic._id);
  const clinicPackages = PACKAGES.filter(p => p.clinicId === clinic._id);
  const clinicEntries = entries.filter(e => e.item.clinicId === clinic._id);
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
      <div key={test.id} className="bg-background rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-primary/20 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-heading font-semibold text-sm text-foreground">{test.name}</h4>
                  {test.popular && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Popular</span>}
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
              {test.homeCollection && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  <Home className="w-2.5 h-2.5" /> Home Collection
                </span>
              )}
              {!test.homeCollection && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-md">
                  <MapPin className="w-2.5 h-2.5" /> Visit Required
                </span>
              )}
              {test.rx && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" /> Rx Required
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
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(test, clinic._id)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs" onClick={() => { addItem(test, clinic._id); toast.success(`${test.name} added`); }}>
                  <ShoppingCart className="w-3 h-3" /> Add to Cart
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { window.scrollTo(0, 0); }, [clinicId]);

  if (!clinic) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Microscope className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Center not found</h2>
        <Button className="mt-4" onClick={() => navigate('/book-test')}>Back to Centers</Button>
      </div>
    );
  }

  const showPackages = catFilter === 'All' || catFilter === 'Health Packages';
  const filteredTests = clinicTests.filter(t => {
    if (catFilter !== 'All' && catFilter !== 'Health Packages' && t.detailCategory !== catFilter) return false;
    if (medSearch && !t.name.toLowerCase().includes(medSearch.toLowerCase())) return false;
    return true;
  });

  const testCount = clinicTests.filter(t => catFilter === 'All' || t.detailCategory === catFilter).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/book-test')} className="hover:text-foreground transition-colors">Book Test</button>
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
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Microscope className="w-10 h-10 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-16">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground truncate">{clinic.name}</h1>
                  {clinic.verified && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 border border-border/40">
                    <Microscope className="w-3.5 h-3.5 text-primary" />
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
                  {t.includes('24x7') && <Zap className="w-3 h-3 mr-1 text-amber-500" />}
                  {t.includes('Home') && <Home className="w-3 h-3 mr-1 text-primary" />}
                  {t.includes('NABL') && <ShieldCheck className="w-3 h-3 mr-1 text-blue-500" />}
                  {t.includes('Reports') && <Clock className="w-3 h-3 mr-1 text-emerald-500" />}
                  {t.includes('Imaging') && <Camera className="w-3 h-3 mr-1 text-purple-500" />}
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

            {/* ═══ TESTS + PACKAGES SECTION ═══ */}
            <motion.div {...fadeUp(2)}>
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border/30 bg-gradient-to-r from-primary/[0.04] to-transparent">
                  <h3 className="font-heading font-bold text-foreground flex items-center gap-2.5 text-base">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                      <FlaskConical className="w-4.5 h-4.5 text-primary" />
                    </div>
                    {catFilter === 'Health Packages' ? 'Health Packages' : catFilter === 'All' ? 'All Tests & Packages' : catFilter}
                    <span className="text-sm font-normal text-muted-foreground">
                      {catFilter === 'Health Packages' ? `(${clinicPackages.length} packages)` : `(${testCount} tests)`}
                    </span>
                  </h3>
                </div>
                <div className="p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder="Search tests..." className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCatFilter(c)}
                        className={cn('px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border', catFilter === c ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-background text-muted-foreground hover:text-foreground border-border/50')}>
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Test Cards (show unless Health Packages tab) */}
                  {catFilter !== 'Health Packages' && (
                    <>
                      {filteredTests.length === 0 ? (
                        <div className="text-center py-12 bg-background rounded-xl border border-border/50">
                          <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No tests found</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-3">
                            {filteredTests.map(test => renderTestCard(test))}
                          </div>
                          {catFilter !== 'All' && (
                            <div className="text-center mt-4">
                              <Button variant="outline" className="gap-2 rounded-xl px-6" onClick={() => setCatFilter('All')}>
                                View All {clinicTests.length} Tests <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Health Package Cards (show when All or Health Packages) */}
                  {showPackages && clinicPackages.length > 0 && (
                    <div className={catFilter !== 'Health Packages' ? 'mt-6 pt-6 border-t border-border/30' : ''}>
                      {catFilter !== 'Health Packages' && (
                        <h4 className="font-heading font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" /> Featured Packages
                        </h4>
                      )}
                      <div className="space-y-4">
                        {clinicPackages.map((pkg, i) => (
                          <motion.div key={pkg.id} {...fadeUp(i)}
                            className="relative bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent rounded-xl border border-primary/15 p-5 hover:shadow-lg hover:border-primary/30 transition-all">
                            {pkg.popular && (
                              <span className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                                BEST VALUE
                              </span>
                            )}
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                                <Heart className="w-6 h-6 text-primary" />
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
                                    <Button size="sm" className="rounded-lg text-xs h-9 gap-1"
                                      onClick={() => { toast.success(`${pkg.name} added to cart`); }}>
                                      <ShoppingCart className="w-3.5 h-3.5" /> Book Package
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ═══ EQUIPMENT & FACILITY INFO ═══ */}
            <SectionCard icon={Activity} title="Equipment & Facility Info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">MRI Scanner</p>
                  <p className="text-sm font-semibold text-foreground">{clinic.equipment?.mri || 'Not Available'}</p>
                </div>
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">CT Scanner</p>
                  <p className="text-sm font-semibold text-foreground">{clinic.equipment?.ct || 'Not Available'}</p>
                </div>
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Radiologist</p>
                  <p className="text-sm font-semibold text-foreground">{clinic.radiologist || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Cardiologist</p>
                  <p className="text-sm font-semibold text-foreground">{clinic.cardiologist || 'N/A'}</p>
                </div>
              </div>
            </SectionCard>

            {/* ═══ PRESCRIPTION UPLOAD ═══ */}
            <SectionCard icon={FileText} title="Upload Prescription">
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
                      <p className="text-xs text-amber-700 dark:text-amber-400">Center will verify your prescription before processing. You will be notified once approved.</p>
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
            </SectionCard>

            {/* ═══ SAMPLE COLLECTION INFO ═══ */}
            <SectionCard icon={Clock4} title="Sample Collection Info">
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
                  <p className="text-sm font-semibold text-foreground">For imaging &amp; cardiac tests</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Please visit the center for scans and cardiac diagnostics</p>
                </div>
              </div>
            </SectionCard>

            {/* ═══ OFFERS ═══ */}
            {clinic.offers.length > 0 && (
              <SectionCard icon={Tag} title={`Offers & Deals (${clinic.offers.length})`}>
                <div className="space-y-3">
                  {clinic.offers.map((offer, i) => (
                    <motion.div key={i} {...fadeUp(i)}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/10 hover:border-primary/20 hover:shadow-sm transition-all">
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
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ═══ ABOUT CENTER ═══ */}
            <SectionCard icon={Info} title="About Center">
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{clinic.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label:'NABL No.', value:clinic.nablNo, icon:Award },
                    { label:'Pathologist', value:clinic.pathologist, icon:Stethoscope },
                    { label:'Radiologist', value:clinic.radiologist || 'N/A', icon:Eye },
                    { label:'Cardiologist', value:clinic.cardiologist || 'N/A', icon:Heart },
                    { label:'Established', value:clinic.established, icon:CalendarDays },
                    { label:'Type', value:clinic.type, icon:Microscope },
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
              </div>
            </SectionCard>

            {/* ═══ REVIEWS ═══ */}
            <SectionCard icon={Star} title={`Reviews (${clinic.reviewsCount})`}>
              <div className="space-y-5">
                <div className="flex items-start gap-6 sm:gap-10">
                  <div className="text-center shrink-0">
                    <div className="text-4xl font-black text-foreground">{clinic.rating}</div>
                    <div className="flex mt-1.5 justify-center">{renderStars(clinic.rating, 'w-4 h-4')}</div>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">{clinic.reviewsCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5 pt-1">
                    {[5,4,3,2,1].map(s => {
                      const count = REVIEWS_DATA.filter(r => Math.round(r.rating) === s).length;
                      const pct = REVIEWS_DATA.length > 0 ? (count / REVIEWS_DATA.length) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground font-medium">{s}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width:`${pct}%` }} />
                          </div>
                          <span className="w-5 text-muted-foreground text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  {REVIEWS_DATA.map((r, i) => (
                    <motion.div key={r.id} {...fadeUp(i)} className="pb-4 border-b border-border/20 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary shadow-sm">{r.user[0]}</div>
                        <span className="text-sm font-semibold text-foreground">{r.user}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto bg-muted/50 px-2 py-0.5 rounded-full">{r.date}</span>
                      </div>
                      <div className="flex mb-1.5 ml-11">{renderStars(r.rating)}</div>
                      <p className="text-sm text-muted-foreground ml-11 leading-relaxed">{r.comment}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* ═══ POLICIES ═══ */}
            <SectionCard icon={ShieldCheck} title="Center Policies">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon:Clock, title:'Report Delivery', desc:clinic.policies.report, color:'text-blue-500', bg:'bg-blue-500/10' },
                    { icon:X, title:'Cancellation', desc:clinic.policies.cancel, color:'text-red-500', bg:'bg-red-500/10' },
                    { icon:ArrowLeft, title:'Refund Policy', desc:clinic.policies.refund, color:'text-emerald-500', bg:'bg-emerald-500/10' },
                    { icon:Utensils, title:'Fasting Guidelines', desc:clinic.policies.fasting, color:'text-amber-500', bg:'bg-amber-500/10' },
                  ].map((item, i) => (
                    <motion.div key={i} {...fadeUp(i)}
                      className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-5 border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all">
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

            {/* ═══ QUICK INFO ═══ */}
            <SidebarCard icon={Info} title="Quick Info">
              <div className="space-y-3">
                {[
                  { icon:FlaskConical, label:'Total Tests', value:`${clinic.testsAvailable}+` },
                  { icon:Camera, label:'Imaging Equipment', value:clinic.imagingFields },
                  { icon:Heart, label:'Cardiac Equipment', value:clinic.cardiacFields },
                  { icon:Home, label:'Home Collection', value:'Available (blood tests only)' },
                  { icon:Clock, label:'Report Time', value:clinic.reportTime },
                  { icon:MapPin, label:'Distance', value:clinic.distance },
                  { icon:Phone, label:'Phone', value:clinic.phone },
                  { icon:Clock4, label:'Working Hours', value:clinic.workingHours },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SidebarCard>

            {/* ═══ ADDRESS + ACTIONS ═══ */}
            <SidebarCard icon={MapPin} title="Address">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{clinic.address}</p>
              <div className="flex flex-col gap-2">
                <Button variant="default" className="gap-2 rounded-xl w-full shadow-md shadow-primary/20" onClick={() => window.open(`tel:${clinic.phone}`)}>
                  <Phone className="w-4 h-4" /> Call Clinic
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`)}>
                    <Navigation className="w-4 h-4" /> Directions
                  </Button>
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { if (navigator.share) navigator.share({ title:clinic.name, text:`${clinic.name}\n${clinic.address}` }); }}>
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </div>
              </div>
            </SidebarCard>

          </div>
        </div>
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
                  Center will verify your prescription before processing. You will be notified once approved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ BOTTOM STICKY BAR ═══ */}
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
                <span className="text-lg font-bold text-foreground block leading-tight">₹{clinicCartTotal}</span>
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-lg shadow-primary/30 px-6 h-11" onClick={() => navigate('/cart')}>
              Book Now <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
