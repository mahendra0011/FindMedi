import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Activity, ArrowRight, Stethoscope, UserRound, CalendarDays, FileText, CreditCard, Shield, Clock, HeartPulse, ChevronRight, Zap, BarChart3, FileUp, Download, Mail, Image, Users, Bell, Laptop, Database, Cloud, Star, Quote, Play, CheckCircle, Phone, Search, MapPin, Award, Heart, Baby, Brain, Bone, Eye, Microscope, Syringe, Ambulance, Check, Circle, Send, Droplets, TestTube, Thermometer, Sparkles, Building2, CalendarCheck, TrendingUp, BadgeCheck, Video, FileCheck, Wallet, Lock, CircleDollarSign, Truck, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { applyUserSettings, readStoredSettings } from "@/lib/settings";

const heroImage = "https://cdn.hms.hospital/123/01KNC4WSYHF1637VJ39K3KVJ2M.png";
const doctorImage = "https://alliedsoftech89.wordpress.com/wp-content/uploads/2013/06/medical-doctor-jobs-in-china-expat-jobs-in-china.jpg";
const doctorImage2 = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjPqcWATF_Dr7kcC-DSSbsfzCtcFZDdeI-pQ&s";

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
  { icon: Thermometer, name: "Blood Pressure Check", price: "Rs 100" },
  { icon: Droplets, name: "Blood Sugar Test", price: "Rs 150" },
  { icon: TestTube, name: "Full Blood Count", price: "Rs 300" },
  { icon: Image, name: "X-Ray Scan", price: "Rs 500" },
  { icon: HeartPulse, name: "ECG Test", price: "Rs 400" },
  { icon: Microscope, name: "Thyroid Panel", price: "Rs 500" },
  { icon: Video, name: "Teleconsultation", price: "Rs 300" },
  { icon: Syringe, name: "Vaccination", price: "Rs 250" },
];

const specialties = [
  { icon: Stethoscope, name: "General Physician", color: "from-emerald-500", count: "45+" },
  { icon: Baby, name: "Gynecologist", color: "from-pink-500", count: "32+" },
  { icon: Heart, name: "Dermatologist", color: "from-rose-500", count: "28+" },
  { icon: Brain, name: "Pediatricians", color: "from-violet-500", count: "25+" },
  { icon: Eye, name: "Neurologist", color: "from-blue-500", count: "20+" },
  { icon: Bone, name: "Gastroenterologist", color: "from-amber-500", count: "18+" },
];

const whyChooseUs = [
  { icon: Shield, title: "Certified Specialists", desc: "All our doctors are board-certified with years of experience in their fields.", color: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600" },
  { icon: Clock, title: "24/7 Support", desc: "Round-the-clock medical assistance and emergency care when you need it most.", color: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-600" },
  { icon: HeartPulse, title: "Modern Facilities", desc: "State-of-the-art equipment and comfortable environment for your care.", color: "from-violet-500/10 to-violet-500/5", iconColor: "text-violet-600" },
  { icon: CreditCard, title: "Affordable Care", desc: "Quality healthcare at transparent pricing with flexible payment options.", color: "from-amber-500/10 to-amber-500/5", iconColor: "text-amber-600" },
  { icon: Users, title: "Patient-Centered", desc: "Your wellbeing is our priority. Personalized care plans for every individual.", color: "from-rose-500/10 to-rose-500/5", iconColor: "text-rose-600" },
  { icon: CheckCircle, title: "Privacy First", desc: "Your medical information is protected with bank-level security and confidentiality.", color: "from-cyan-500/10 to-cyan-500/5", iconColor: "text-cyan-600" },
];

const features = [
  { icon: CalendarCheck, title: "Easy Booking", desc: "Book appointments in seconds" },
  { icon: FileCheck, title: "Digital Records", desc: "Access your records anywhere" },
  { icon: Wallet, title: "Flexible Payments", desc: "Multiple payment options" },
  { icon: Bell, title: "Appointment Reminders", desc: "Never miss your appointment" },
  { icon: Lock, title: "Secure Data", desc: "Your privacy is protected" },
  { icon: HeartPulse, title: "Quality Care", desc: "Excellence in healthcare" },
];

const testimonials = [
  { name: "Sarah Johnson", role: "Patient", image: "https://i.pravatar.cc/100?img=5", content: "The care I received was exceptional. The doctors took time to explain everything and made me feel comfortable throughout my treatment.", rating: 5 },
  { name: "Mike Chen", role: "Patient", image: "https://i.pravatar.cc/100?img=11", content: "Outstanding service! The booking process was smooth and the doctor was incredibly knowledgeable. Highly recommend MediCore.", rating: 5 },
  { name: "Emily Williams", role: "Patient", image: "https://i.pravatar.cc/100?img=9", content: "From scheduling to follow-up, every step was handled with professionalism. The team truly cares about patient well-being.", rating: 5 },
];

const doctors = [
  { name: "Dr. Richard James", specialty: "General Physician", available: true, rating: 4.9, patients: 1200 },
  { name: "Dr. Emily Larson", specialty: "Gynecologist", available: true, rating: 4.8, patients: 980 },
  { name: "Dr. Sarah Patel", specialty: "Dermatologist", available: true, rating: 4.9, patients: 850 },
  { name: "Dr. Christopher Lee", specialty: "Pediatricians", available: true, rating: 4.7, patients: 720 },
  { name: "Dr. Jennifer Garcia", specialty: "Neurologist", available: true, rating: 4.8, patients: 640 },
  { name: "Dr. Andrew Williams", specialty: "Gastroenterologist", available: true, rating: 4.9, patients: 580 },
];

const isDocumentDark = () => (
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
);

const Home = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [doctorsList, setDoctorsList] = useState([]);
  const [counters, setCounters] = useState(statsData.map(() => 0));
  const [countersVisible, setCountersVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => isDocumentDark());
  const statsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getDoctors({ available: 'true' });
        setDoctorsList(data?.slice(0, 6) || doctors.slice(0, 6));
      } catch (e) {
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
  }, [countersVisible]);

  useEffect(() => {
    const syncThemeState = () => setIsDarkMode(isDocumentDark());
    syncThemeState();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if ((readStoredSettings().theme || 'system') === 'system') {
        applyUserSettings(readStoredSettings());
        syncThemeState();
      }
    };

    mediaQuery.addEventListener?.('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener?.('change', handleSystemThemeChange);
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const dashboardLabel = user?.role === 'admin'
    ? 'Admin Dashboard'
    : user?.role === 'doctor'
      ? 'Doctor Dashboard'
      : 'User Dashboard';
  const primaryActionLabel = user ? dashboardLabel : 'Book Appointment';
  const primaryActionPath = user ? '/dashboard' : '/signup';
  const themeToggleLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

  const toggleDarkMode = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    const nextSettings = applyUserSettings({ ...readStoredSettings(), theme: nextTheme });
    setIsDarkMode(isDocumentDark());
    if (user) {
      updateUser({ settings: { ...user.settings, ...nextSettings } });
    }
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

      {/* Navbar */}
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-b border-border/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-bold">MediCore</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#specialties" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Specialties</a>
              <a href="#doctors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Top Doctors</a>
              <a href="#why-choose-us" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why Choose Us</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleDarkMode}
                    aria-label={themeToggleLabel}
                    className="h-9 w-9 rounded-full border-border/70 bg-background/80 shadow-sm"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{themeToggleLabel}</TooltipContent>
              </Tooltip>
              {!user && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="hidden sm:flex">
                  Sign In
                </Button>
              )}
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/20" onClick={() => navigate(primaryActionPath)}>
                {primaryActionLabel} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

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
                 MediCore
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-violet-500">
                  Healthcare Solutions
                </span>
                At Your Fingertips
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mt-6 leading-relaxed max-w-xl">
                Experience world-class healthcare from the comfort of your home. 
                Book appointments with certified specialists, get instant consultations, 
                and manage your health records securely.
              </p>

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
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-14">
                  <Phone className="w-4 h-4" /> Emergency Call
                </Button>
              </div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }} className="relative">
              
              {/* Main Hero Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
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

      {/* Quick Actions */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 text-lg gap-3 py-4">
              <Search className="w-5 h-5" /> Find by Speciality
            </Button>
            <Button variant="outline" className="h-16 text-lg gap-3 py-4">
              <MapPin className="w-5 h-5" /> Find by Location
            </Button>
            <Button variant="outline" className="h-16 text-lg gap-3 py-4">
              <CalendarDays className="w-5 h-5" /> Book Appointment
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.08, y: -5 }}
                className="bg-card rounded-xl border border-border/60 p-4 text-center hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
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
                className="bg-card rounded-2xl border border-border/60 p-6 text-center cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${spec.color}/20 flex items-center justify-center mx-auto mb-4`}>
                  <spec.icon className={`w-7 h-7 text-${spec.color.split('-')[1]}-500`} />
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
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Why Choose Us
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">The MediCore Difference</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              We combine cutting-edge technology with compassionate care to deliver an exceptional healthcare experience
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
                    className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {doc.profile_photo
                        ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                        : <UserRound className="w-7 h-7 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{doc.name}</h3>
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
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{doc.patients || "500+"}+ patients</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Book
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <Button size="lg" variant="outline" className="gap-2">
                  View More Doctors <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" variants={fadeUp} className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Our Services</h2>
            <p className="text-muted-foreground mt-3">Comprehensive healthcare services for you and your family</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service, i) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                className="bg-card rounded-xl border border-border/60 p-5 hover:shadow-lg hover:border-primary/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <p className="text-sm text-primary font-medium">{service.price}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
<p className="text-muted-foreground mt-3">Real stories from real patients 
about their experience with MediCore</p>
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
      <section className="py-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={doctorImage2} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600" />
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-12 text-center relative z-10">
          
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              With 100+ Trusted Doctors
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
              Our network of certified healthcare professionals is here to provide you with the best care possible.
            </p>
            <Button size="lg" className="gap-2 text-base px-10 h-12 bg-white text-primary hover:bg-white/90 shadow-xl"
              onClick={() => navigate(primaryActionPath)}>
              {user ? `Open ${dashboardLabel}` : 'Book Appointment'} <ArrowRight className="w-5 h-5" />
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

      {/* Footer */}
      <footer className="bg-gradient-to-b from-background to-muted/30 border-t border-border/50 pt-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand & About */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-heading text-2xl font-bold">MediCore</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Your trusted partner in healthcare innovation. We're committed to providing exceptional medical care with cutting-edge technology and compassionate service.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>+91 8299431275</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>hexagonsservices@gmail.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Lucknow, India</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                {["Home", "Doctors", "Services", "Contact", "Appointments", "Medical Records", "Billing", "Emergency"].map((link, i) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" /> {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Our Services */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Our Services</h4>
              <ul className="space-y-3">
                {services.slice(0, 5).map((service, i) => (
                  <li key={service.name}>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><service.icon className="w-3 h-3 text-primary" /> {service.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-primary font-medium">{services[1].price}</div>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Stay Connected</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Subscribe for health tips, medical updates, and wellness insights delivered to your inbox.
              </p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter your email" 
                  className="bg-background"
                />
                <Button size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4 mt-6">
                {['FB', 'TW', 'IG', 'LI'].map((social, i) => (
                  <a 
                    key={i}
                    href="#" 
                    className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-white flex items-center justify-center transition-all text-xs font-bold"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-border/50 mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">© 2026 MediCore Healthcare. All rights reserved.</p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
