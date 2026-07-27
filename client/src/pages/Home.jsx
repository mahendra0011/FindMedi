import { useNavigate } from "react-router-dom";
import { motion, useScroll } from "framer-motion";
import { Activity, ArrowRight, Stethoscope, UserRound, CalendarDays, FileText, CreditCard, Shield, Clock, HeartPulse, ChevronRight, Zap, BarChart3, FileUp, Download, Mail, Image, Users, Bell, Laptop, Database, Cloud, Star, Quote, Play, CheckCircle, Phone, Search, MapPin, Award, Heart, Baby, Brain, Bone, Eye, Microscope, Syringe, Ambulance, Check, Circle, Send, Droplets, TestTube, Thermometer, Sparkles, Building2, CalendarCheck, TrendingUp, BadgeCheck, Video, FileCheck, Wallet, Lock, CircleDollarSign, Truck, Moon, Sun, UtensilsCrossed, Scissors, Droplet, Dna, Smile, ClipboardList, Package, Sofa, PieChart, BedDouble, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import ElectricBorder from "@/components/reactbits/ElectricBorder";
import FlowingMenu from "@/components/reactbits/FlowingMenu";
import ScrollVelocity from "@/components/reactbits/ScrollVelocity";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import AIChatAssistant from "@/components/AIChatAssistant";

const heroImage = "https://cdn.hms.hospital/123/01KNC4WSYHF1637VJ39K3KVJ2M.png";
const doctorImage = "https://alliedsoftech89.wordpress.com/wp-content/uploads/2013/06/medical-doctor-jobs-in-china-expat-jobs-in-china.jpg";
const doctorImage2 = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjPqcWATF_Dr7kcC-DSSbsfzCtcFZDdeI-pQ&s";

const flowingMenuItems = [
  { link: "#modules", text: "Our Modules", image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=900&q=80" },
  { link: "#doctors", text: "Top Doctors", image: doctorImage },
  { link: "#specialties", text: "Specialties", image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80" },
  { link: "#testimonials", text: "Patient Stories", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80" },
  { link: "#services", text: "Lab Services", image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80" },
];

const velocityMessages = [
  "doctor consultation  staff management  inventory tracking  operation theatre  lab reports",
  "blood bank  diet kitchen  physiotherapy  mental health  housekeeping  radiology",
  "insurance claims  billing  pharmacy  ipd management  triage  emergency care",
];

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: i => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const statsData = [
  { label: "Expert Doctors", value: 50, suffix: "+", icon: Stethoscope },
  { label: "Happy Patients", value: 20000, suffix: "+", icon: Users },
  { label: "Appointments", value: 50000, suffix: "+", icon: CalendarDays },
  { label: "Years Experience", value: 15, suffix: "+", icon: Award }
];

const services = [
  { icon: Thermometer, name: "Blood Pressure Check", price: "₹100" },
  { icon: Droplets, name: "Blood Sugar Test", price: "₹150" },
  { icon: TestTube, name: "Full Blood Count", price: "₹300" },
  { icon: Image, name: "X-Ray Scan", price: "₹500" },
  { icon: HeartPulse, name: "ECG Test", price: "₹400" },
  { icon: Microscope, name: "Thyroid Panel", price: "₹500" },
  { icon: Video, name: "Teleconsultation", price: "₹300" },
  { icon: Syringe, name: "Vaccination", price: "₹250" },
];

const specialties = [
  { icon: Stethoscope, name: "General Physician", color: "bg-emerald-500/10 text-emerald-600", count: "45+" },
  { icon: Baby, name: "Gynecologist", color: "bg-pink-500/10 text-pink-600", count: "32+" },
  { icon: Smile, name: "Dermatologist", color: "bg-rose-500/10 text-rose-600", count: "28+" },
  { icon: Heart, name: "Pediatricians", color: "bg-violet-500/10 text-violet-600", count: "25+" },
  { icon: Brain, name: "Neurologist", color: "bg-blue-500/10 text-blue-600", count: "20+" },
  { icon: UtensilsCrossed, name: "Gastroenterologist", color: "bg-amber-500/10 text-amber-600", count: "18+" },
];

const whyChooseUs = [
  { icon: Building2, title: "All-in-One Connected Ecosystem", desc: "From instant OPD token registration to intensive IPD bedside charting and complex OT scheduling, manage every single clinical and administrative workflow within a single unified platform.", color: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600" },
  { icon: Zap, title: "Smart Front-Desk Automation", desc: "Eliminate long waiting lines and chaotic waiting rooms with automated UHID generation, dynamic department-wise token systems, live queue tracking, and real-time estimated wait-time algorithms.", color: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-600" },
  { icon: ClipboardList, title: "Integrated Diagnostics & Care", desc: "Seamlessly bridge the gap between doctors and support wings with connected 29+ Lab test catalogs, digital Radiology viewers, allergy-checked Pharmacy dispensing, and real-time Blood Bank registries.", color: "from-violet-500/10 to-violet-500/5", iconColor: "text-violet-600" },
  { icon: CircleDollarSign, title: "Automated Revenue Cycle", desc: "Streamline your hospital's cash flow with automated invoice generation (INV-0001), multi-mode payment tracking (UPI/Card/Cash), partial-payment workflows, and integrated insurance pre-authorization.", color: "from-amber-500/10 to-amber-500/5", iconColor: "text-amber-600" },
  { icon: TrendingUp, title: "Enterprise-Grade Operations", desc: "Optimize backend resources with bulk staff attendance tracking, automated shift payrolls, predictive inventory reorder alerts, and automated housekeeping tasks triggered instantly upon patient discharge.", color: "from-rose-500/10 to-rose-500/5", iconColor: "text-rose-600" },
  { icon: Lock, title: "Bank-Level Data Security", desc: "Protect sensitive health records with strict role-scoped access control (Superadmin, Admin, Doctor, Patient), secure Cloudinary-backed medical document storage, and 100% data confidentiality.", color: "from-cyan-500/10 to-cyan-500/5", iconColor: "text-cyan-600" },
];

const featureSections = [
  {
    id: "patient-journey", title: "Patient Journey", subtitle: "End-to-end digital experience from registration to discharge",
    color: "from-blue-500/10 to-cyan-500/5", borderColor: "border-blue-500/20",
    items: [
      { icon: Users, title: "Patient Registration", desc: "New patient onboarding, UHID generation, demographic capture, and insurance verification in seconds" },
      { icon: CalendarCheck, title: "OPD Registration", desc: "Outpatient registration with automated token generation, appointment scheduling, and live queue management" },
      { icon: HeartPulse, title: "Doctor Consultation", desc: "Comprehensive OPD & IPD consultations with certified specialists, e-prescriptions, and follow-up tracking" },
      { icon: FileText, title: "Medical Records", desc: "Unified digital health record with prescription history, lab results, discharge summaries, and document uploads" },
      { icon: BedDouble, title: "IPD Management", desc: "Bed allocation, ward management, nursing charts, diet orders, and discharge planning with auto-housekeeping" },
    ]
  },
  {
    id: "critical-care", title: "Emergency & Critical Care", subtitle: "Rapid response systems for life-saving decisions",
    color: "from-red-500/10 to-rose-500/5", borderColor: "border-red-500/20",
    items: [
      { icon: Activity, title: "Triage & Emergency", desc: "P1-P5 severity triage, MLC registration, real-time vitals tracking, and instant critical care alerts" },
      { icon: Scissors, title: "Operation Theatre", desc: "OT scheduling, pre-op checklists, instrument sterilization logs, surgeon assignment, and post-op recovery tracking" },
      { icon: Droplet, title: "Blood Bank", desc: "Donor management, blood unit screening, crossmatch validation, issue tracking, and transfusion reaction logging" },
      { icon: Dna, title: "Physiotherapy", desc: "Referral-based therapy with exercise library, session tracking, pain scale monitoring, and home exercise plans" },
    ]
  },
  {
    id: "diagnostics", title: "Diagnostics & Pharmacy", subtitle: "Integrated clinical workflows connecting labs, pharmacy, and nutrition",
    color: "from-amber-500/10 to-orange-500/5", borderColor: "border-amber-500/20",
    items: [
      { icon: TestTube, title: "Lab & Radiology", desc: "29+ test catalog with auto-abnormal flags, sample tracking, pathologist verification, and radiology image viewer" },
      { icon: Package, title: "Inventory & Pharmacy", desc: "Real-time stock tracking, expiry alerts, allergy-checked dispensing, drug interaction warnings, and vendor management" },
      { icon: UtensilsCrossed, title: "Diet & Kitchen", desc: "Patient-specific diet plans, allergy-safe meal rotation, kitchen task assignment, and meal delivery confirmation" },
    ]
  },
  {
    id: "support-services", title: "Support & Rehabilitation", subtitle: "Holistic care extending beyond treatment",
    color: "from-pink-500/10 to-purple-500/5", borderColor: "border-pink-500/20",
    items: [
      { icon: Smile, title: "Mental Health", desc: "Confidential assessments, risk scoring, therapy goal tracking, medication management, and family involvement logging" },
      { icon: Sofa, title: "Housekeeping", desc: "Auto-triggered cleaning on discharge, task assignment, infection control checklists, and bed status verification" },
      { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for appointments, lab results, billing reminders, emergency alerts, and prescription refills" },
    ]
  },
  {
    id: "workforce", title: "Workforce & Operations", subtitle: "Streamline staff management and administrative workflows",
    color: "from-violet-500/10 to-indigo-500/5", borderColor: "border-violet-500/20",
    items: [
      { icon: ClipboardList, title: "Staff & HR Management", desc: "Complete lifecycle from onboarding to payroll — attendance, shift scheduling, overtime, and performance reports" },
      { icon: Upload, title: "File Upload & Reports", desc: "Bulk import/export of patient data and lab reports, automated PDF generation for medical documents" },
    ]
  },
  {
    id: "finance", title: "Finance & Analytics", subtitle: "Revenue cycle management with data-driven insights",
    color: "from-emerald-500/10 to-teal-500/5", borderColor: "border-emerald-500/20",
    items: [
      { icon: Shield, title: "Insurance & Billing", desc: "Automated invoice generation (INV-0001), UPI/Card/Cash payments, partial payments, insurance pre-auth and claim filing" },
      { icon: PieChart, title: "Reports & Analytics", desc: "Exportable reports, revenue trends, department-wise performance metrics, demographic analysis, and compliance dashboards" },
    ]
  },
];

const testimonials = [
  { name: "Sarah Johnson", role: "Patient", image: "https://i.pravatar.cc/100?img=5", content: "The care I received was exceptional. The doctors took time to explain everything and made me feel comfortable throughout my treatment.", rating: 5 },
  { name: "Mike Chen", role: "Patient", image: "https://i.pravatar.cc/100?img=11", content: "Outstanding service! The booking process was smooth and the doctor was incredibly knowledgeable. Highly recommend MediCore.", rating: 5 },
  { name: "Emily Williams", role: "Patient", image: "https://i.pravatar.cc/100?img=9", content: "From scheduling to follow-up, every step was handled with professionalism. The team truly cares about patient well-being.", rating: 5 },
];

const doctors = [
  { name: "Dr. Richard James", specialty: "General Physician", available: true, rating: 4.9, patients: 1200, doctor_type: "hospital" },
  { name: "Dr. Emily Larson", specialty: "Gynecologist", available: true, rating: 4.8, patients: 980, doctor_type: "clinic" },
  { name: "Dr. Sarah Patel", specialty: "Dermatologist", available: true, rating: 4.9, patients: 850, doctor_type: "hospital" },
  { name: "Dr. Christopher Lee", specialty: "Pediatricians", available: true, rating: 4.7, patients: 720, doctor_type: "clinic" },
  { name: "Dr. Jennifer Garcia", specialty: "Neurologist", available: true, rating: 4.8, patients: 640, doctor_type: "hospital" },
  { name: "Dr. Andrew Williams", specialty: "Gastroenterologist", available: true, rating: 4.9, patients: 580, doctor_type: "clinic" },
];

const getSelectedCity = () => localStorage.getItem('mediCore_city') || '';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctorsList, setDoctorsList] = useState([]);
  const [counters, setCounters] = useState(statsData.map(() => 0));
  const [countersVisible, setCountersVisible] = useState(false);
  const [ctaPointer, setCtaPointer] = useState({ x: 50, y: 50 });
  const statsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getDoctors({ available: 'true' });
        const list = data?.doctors || data?.data || data || [];
        setDoctorsList(list.slice(0, 6));
      } catch {
        setDoctorsList(doctors.slice(0, 6));
      }
    };
    load();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !countersVisible) {
          setCountersVisible(true);
          counters.forEach((_, idx) => {
            const target = statsData[idx].value;
            const duration = 2500;
            const steps = 60;
            const increment = target / steps;
            let current = 0;
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              setCounters(prev => {
                const newCounters = [...prev];
                newCounters[idx] = Math.floor(current);
                return newCounters;
              });
            }, duration / steps);
          });
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [countersVisible, counters]);

  useScroll();
  const dashboardLabel = user?.role === 'hospital_admin'
    ? 'Admin Dashboard'
    : user?.role === 'doctor'
      ? 'Doctor Dashboard'
      : 'User Dashboard';
  const primaryActionPath = user ? '/dashboard' : '/signup';

  const handleCtaPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCtaPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Emergency Banner */}
      <div className="bg-red-600 text-white py-2 px-4 text-center text-sm">
        <span className="flex items-center justify-center gap-2">
          <Ambulance className="w-4 h-4" />
          <span className="font-semibold">Emergency:</span> Call +91 8299431275 for 24/7 medical assistance
        </span>
      </div>

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-blue-500/20 to-transparent blur-3xl" />
      </div>

      <PublicNavbar />

      {/* Hero Section with Image */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 text-primary text-sm font-medium mb-6 border border-primary/20">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Premium Healthcare at Your Fingertips</span>
              </motion.div>

              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
                <SplitText
                  tag="span"
                  text="MediCore"
                  className="block"
                  delay={34}
                  duration={0.72}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 46, rotateX: -80 }}
                  to={{ opacity: 1, y: 0, rotateX: 0 }}
                  threshold={0.2}
                  rootMargin="0px"
                  textAlign="left"
                />
                <SplitText
                  tag="span"
                  text="Healthcare Solutions"
                  className="block medicore-split-gradient"
                  delay={24}
                  duration={0.7}
                  ease="power3.out"
                  splitType="words,chars"
                  from={{ opacity: 0, y: 42 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.2}
                  rootMargin="0px"
                  textAlign="left"
                />
                <SplitText
                  tag="span"
                  text="At Your Fingertips"
                  className="block"
                  delay={26}
                  duration={0.7}
                  ease="power3.out"
                  splitType="words,chars"
                  from={{ opacity: 0, y: 42 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.2}
                  rootMargin="0px"
                  textAlign="left"
                />
              </h1>

              <BlurText
                text="Experience world-class healthcare from the comfort of your home. Book appointments with certified specialists, get instant consultations, and manage your health records securely."
                delay={55}
                animateBy="words"
                direction="bottom"
                threshold={0.2}
                rootMargin="0px"
                stepDuration={0.34}
                className="text-lg sm:text-xl text-muted-foreground mt-6 leading-relaxed max-w-xl"
              />

              {/* Features badges */}
              <div className="flex flex-wrap gap-3 mt-6">
                {[
                  { icon: Award, text: "Certified Specialists" },
                  { icon: Clock, text: "24/7 Availability" },
                  { icon: Shield, text: "Safe & Secure" },
                  { icon: Users, text: "500+ Doctors" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <item.icon className="w-4 h-4 text-primary" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mt-8">
                <Button size="lg" className="gap-2 text-base px-8 h-14 shadow-xl shadow-primary/25" onClick={() => navigate(primaryActionPath)}>
                  {user ? `Open ${dashboardLabel}` : 'Book Appointment Now'} <ArrowRight className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-14" onClick={() => window.location.href='tel:108'}>
                  <Phone className="w-4 h-4" /> Emergency Call
                </Button>
              </div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }} className="relative">
              
              {/* Main Hero Image */}
              <div className="relative overflow-hidden rounded-[28px] shadow-2xl">
                <img
                  src={heroImage}
                  alt="MediCore Healthcare"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white text-lg font-semibold">Excellence in Healthcare Since 2010</p>
                  <p className="text-white/80 text-sm">Trusted by 20,000+ patients</p>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-card rounded-2xl border border-border/60 p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Verified Doctors</p>
                    <p className="text-xs text-muted-foreground">100% Certified</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating stats badge */}
              <motion.div 
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -top-4 -right-4 bg-card rounded-2xl border border-border/60 p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">4.9</p>
                    <p className="text-xs text-muted-foreground">Patient Rating</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section ref={statsRef} className="py-20 px-4 sm:px-6 bg-gradient-to-r from-primary/10 via-blue-500/10 to-violet-500/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {statsData.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.05 }}
                className="text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/30 transition-colors">
                  <stat.icon className="w-10 h-10 text-primary" />
                </div>
                <motion.p
                  className="text-5xl lg:text-6xl font-bold text-foreground"
                  initial={{ opacity: 0 }}
                  animate={countersVisible ? { opacity: 1 } : {}}
                >
                  {counters[i].toLocaleString()}{stat.suffix}
                </motion.p>
                <p className="text-lg text-muted-foreground mt-2 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll Velocity Strip */}
      <section className="overflow-hidden bg-background py-8">
        <ScrollVelocity
          texts={velocityMessages}
          velocity={78}
          damping={48}
          stiffness={360}
          numCopies={7}
          className="medicore-velocity-text"
          parallaxClassName="medicore-velocity-row"
          scrollerClassName="medicore-velocity-scroller"
        />
      </section>

      {/* Quick Actions */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 text-lg gap-3 py-4" onClick={() => navigate(`/hospitals${getSelectedCity() ? `?city=${encodeURIComponent(getSelectedCity())}` : ''}`)}>
              <Search className="w-5 h-5" /> Find by Speciality
            </Button>
            <Button variant="outline" className="h-16 text-lg gap-3 py-4" onClick={() => navigate(`/hospitals${getSelectedCity() ? `?city=${encodeURIComponent(getSelectedCity())}` : ''}`)}>
              <MapPin className="w-5 h-5" /> {getSelectedCity() || 'Find by Location'}
            </Button>
            <Button variant="outline" className="h-16 text-lg gap-3 py-4" onClick={() => navigate(primaryActionPath)}>
              <CalendarDays className="w-5 h-5" /> Book Appointment
            </Button>
          </div>
        </div>
      </section>

      {/* Hospital Modules Section */}
      <section id="modules" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/20 via-background to-muted/10">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Building2 className="w-4 h-4" />
              <span>Complete Hospital Ecosystem</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">All-in-One Healthcare Platform</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              From consultation to discharge, every aspect of hospital management is covered with our 20+ integrated digital modules
            </p>
          </motion.div>

          <div className="space-y-12">
            {featureSections.map((section, sIdx) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.1 }}
                className={`bg-gradient-to-br ${section.color} rounded-3xl border ${section.borderColor} p-6 sm:p-8`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{section.title}</h3>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <p className="text-sm text-muted-foreground -mt-4 mb-6">{section.subtitle}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: (sIdx * 6 + i) * 0.04 }}
                      whileHover={{ scale: 1.02, y: -3 }}
                      className="group bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section id="specialties" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Find by Speciality</h2>
            <p className="text-muted-foreground mt-3">Browse through our extensive list of trusted doctors by specialty</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {specialties.map((spec, i) => (
              <motion.div
                key={spec.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="group bg-card rounded-2xl border border-border/60 p-6 text-center cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl ${spec.color} flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                  <spec.icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-foreground">{spec.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{spec.count} Doctors</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-choose-us" className="py-20 px-4 sm:px-6">
        <ElectricBorder
          color="#7df9ff"
          speed={0.9}
          chaos={0.1}
          thickness={2}
          borderRadius={32}
          className="mx-auto max-w-7xl"
          style={{ borderRadius: 32 }}
        >
          <div className="rounded-[32px] px-4 py-10 sm:px-8 lg:px-10">
            <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Why Choose Us
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">The MediCore Difference</h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                We combine cutting-edge automation with interconnected modules to deliver a secure, efficient, and next-generation healthcare management experience.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyChooseUs.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className={`bg-card rounded-2xl border border-border/60 p-6 hover:shadow-xl transition-all`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </ElectricBorder>
      </section>

      {/* Top Doctors Section with Image */}
      <section id="doctors" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Side */}
            <motion.div 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={doctorImage} 
                  alt="Our Doctors" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-6 -right-6 bg-card rounded-2xl border border-border/60 p-6 shadow-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-2xl text-foreground">50+</p>
                    <p className="text-sm text-muted-foreground">Expert Doctors</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Content Side */}
            <motion.div initial="hidden" whileInView="visible" variants={fadeUp}>
              <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="mb-10">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Top Doctors to Book</h2>
                <p className="text-muted-foreground mt-3">Simply browse through our extensive list of trusted doctors.</p>
              </motion.div>

              <div className="grid grid-cols-1 gap-4">
                {(doctorsList.length > 0 ? doctorsList : doctors).map((doc, i) => (
                  <motion.div
                    key={doc.name || i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group bg-card rounded-2xl border border-border/60 p-4 hover:shadow-lg hover:border-primary/30 transition-all flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {doc.profile_photo
                        ? <img src={doc.profile_photo} alt={doc.name || 'Doctor'} className="w-full h-full object-cover" />
                        : <UserRound className="w-7 h-7 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{doc.name}</h3>
                        {doc.doctor_type && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${doc.doctor_type === 'clinic' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                            {doc.doctor_type === 'clinic' ? 'Clinic' : 'Hospital'}
                          </span>
                        )}
                        {doc.available && (
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.specialty || "General Physician"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-medium">{doc.rating || "4.8"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">{doc.patients || "500+"}+ patients</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="group-hover:border-primary/50" onClick={() => navigate(primaryActionPath)}>
                      Book <ArrowRight className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/doctors')}>
                  View More Doctors <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <TestTube className="w-4 h-4" />
              Care Services
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Our Services</h2>
            <p className="text-muted-foreground mt-3">Comprehensive healthcare services for you and your family</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((service, i) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                className="group bg-card rounded-2xl border border-border/60 p-5 hover:shadow-xl hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary">
                    <service.icon className="w-6 h-6 text-primary transition-colors group-hover:text-primary-foreground" />
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{service.price}</span>
                </div>
                <h3 className="font-heading mt-5 font-bold text-foreground">{service.name}</h3>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Same-day slot</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flowing Menu Section */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/10 via-background to-muted/10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.75fr_1.25fr] gap-10 lg:gap-14 items-center">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Activity className="w-4 h-4" />
              Fast Navigation
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Move Through Care Faster</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Hover over each workflow to bring it alive, then jump straight to the right part of the home screen.
            </p>
            <Button className="mt-8 gap-2" onClick={() => navigate('/diagnostic-centers')}>
              View Lab Services <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 36 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="h-[460px] sm:h-[540px] overflow-hidden rounded-[28px] border border-border/60 shadow-2xl"
          >
            <FlowingMenu
              items={flowingMenuItems}
              speed={13}
              bgColor="hsl(var(--sidebar-background))"
              textColor="hsl(var(--sidebar-foreground))"
              marqueeBgColor="#7df9ff"
              marqueeTextColor="#0f172a"
              borderColor="rgba(255,255,255,0.16)"
            />
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              Testimonials
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">What Our Patients Say</h2>
            <p className="text-muted-foreground mt-3">Real stories from real patients about their experience with MediCore</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div 
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 hover:shadow-xl hover:border-primary/30 transition-all relative"
              >
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-primary/50" />
                </div>

                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${idx < testimonial.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/20'}`}
                    />
                  ))}
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/10"
                  />
                  <div>
                    <p className="font-heading font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Third Image */}
      <section
        className="py-16 px-4 sm:px-6 relative overflow-hidden"
        onMouseMove={handleCtaPointerMove}
        onMouseLeave={() => setCtaPointer({ x: 50, y: 50 })}
      >
        <div className="absolute inset-0">
          <img src={doctorImage2} alt="Background" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600" />
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${ctaPointer.x}% ${ctaPointer.y}%, rgba(255,255,255,0.34), rgba(255,255,255,0.1) 18%, transparent 42%)`,
            }}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.015 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto rounded-3xl border border-white/20 bg-white/10 p-8 sm:p-12 text-center relative z-10 overflow-hidden shadow-2xl backdrop-blur">
          <div
            className="pointer-events-none absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl transition-[left,top] duration-100"
            style={{ left: `${ctaPointer.x}%`, top: `${ctaPointer.y}%` }}
          />
          <div className="relative">
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Experience Modern Healthcare?
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
              Join 20,000+ patients who trust MediCore for their healthcare needs. Book appointments, manage records, and access 20+ integrated hospital modules — all in one place.
            </p>
            <Button size="lg" className="group gap-2 text-base px-10 h-12 bg-white text-primary hover:bg-white/90 shadow-xl"
              onClick={() => navigate(primaryActionPath)}>
              {user ? `Open ${dashboardLabel}` : 'Book Appointment'} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Phone, title: "Emergency Hotline", desc: "+91 8299431275", color: "bg-red-500/10 text-red-600" },
              { icon: Mail, title: "Email Support", desc: "hexagonsservices@gmail.com", color: "bg-blue-500/10 text-blue-600" },
              { icon: MapPin, title: "Visit Us", desc: "Lucknow, India", color: "bg-emerald-500/10 text-emerald-600" }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/60 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
      <AIChatAssistant />
    </div>
  );
};

export default Home;