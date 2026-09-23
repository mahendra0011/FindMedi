import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/mind/components/Navigation";
import Footer from "@/mind/components/Footer";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Textarea } from "@/mind/components/ui/textarea";
import { Separator } from "@/mind/components/ui/separator";
import { useToast } from "@/mind/components/ui/use-toast";
import { api } from "@/mind/lib/api";
import { cn } from "@/lib/utils";
import { fetchCounsellors, selectCounsellors, selectCounsellorsStatus } from "@/mind/store/counsellorsSlice";
import { purchasePackage } from "@/mind/store/packagesSlice";
import BookingModal from "@/components/BookingModal";
import { api as mainApi } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Award,
  Baby,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Clock,
  Clock3,
  FileText,
  GraduationCap,
  Headphones,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  Image,
  IndianRupee,
  Languages,
  ListOrdered,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Pill,
  Plus,
  Minus,
  Quote,
  Search,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Stethoscope,
  Trophy,
  User,
  Users,
  Video,
  Wind,
  Car,
  Accessibility,
  FlaskConical,
  Ambulance,
  Bookmark,
  BookMarked,
  DoorOpen,
  CircleDot,
  Zap,
  Brain,
  X,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const fallbackPlans = [
  { id: "one-time", name: "One-Time Session", duration: "Single session", cadence: "One-time consultation", summary: "A single counselling session for immediate support", bestFor: ["Immediate support", "One-off guidance", "Quick check-in"], bookingPrice: 599, perSessionPrice: 599 },
  { id: "short-term", name: "Short-Term Support", duration: "4-8 sessions", cadence: "One session every two days", summary: "Quick emotional support and guidance", bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"], bookingPrice: 1499, perSessionPrice: 1499 },
  { id: "medium-term", name: "Medium-Term Support", duration: "8-15 sessions", cadence: "Weekly or bi-weekly", summary: "Emotional recovery and personal growth", bestFor: ["Mild depression", "Relationship issues", "Emotional healing"], bookingPrice: 2499, perSessionPrice: 2499 },
  { id: "long-term", name: "Long-Term Therapy", duration: "3-6+ months", cadence: "Weekly or bi-weekly sessions", summary: "Ongoing therapy and steady progress", bestFor: ["Trauma", "Severe anxiety", "Chronic depression"], bookingPrice: 3999, perSessionPrice: 3999 },
];

const activeStatuses = ["pending", "confirmed"];
const slots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

const CONCERN_CARDS = [
  { name: "Stress", icon: Zap, color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-500" },
  { name: "Anxiety", icon: Brain, color: "from-violet-500/20 to-violet-500/5", textColor: "text-violet-500" },
  { name: "Depression", icon: Heart, color: "from-rose-500/20 to-rose-500/5", textColor: "text-rose-500" },
  { name: "Trauma", icon: ShieldAlert, color: "from-orange-500/20 to-orange-500/5", textColor: "text-orange-500" },
  { name: "Relationship", icon: HeartHandshake, color: "from-pink-500/20 to-pink-500/5", textColor: "text-pink-500" },
  { name: "Loneliness", icon: Users, color: "from-blue-500/20 to-blue-500/5", textColor: "text-blue-500" },
  { name: "Exam pressure", icon: GraduationCap, color: "from-indigo-500/20 to-indigo-500/5", textColor: "text-indigo-500" },
  { name: "Career", icon: BriefcaseBusiness, color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-500" },
  { name: "Addiction", icon: Pill, color: "from-cyan-500/20 to-cyan-500/5", textColor: "text-cyan-500" },
  { name: "Grief", icon: Sparkles, color: "from-teal-500/20 to-teal-500/5", textColor: "text-teal-500" },
];

function formatRupees(value = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function plansFor(c) { return c?.supportPlans?.length ? c.supportPlans : fallbackPlans; }
function planPrice(p) { return Number(p?.bookingPrice || p?.perSessionPrice || 0); }
function lowestPrice(c) { return Math.min(...plansFor(c).map(p => planPrice(p) || 1499)); }
function planFromList(c, id) { const p = plansFor(c); return p.find(pl => pl.id === id) || p[0]; }
function modeLabel(v = "") { return ({ "google-meet": "Google Meet", "in-person": "In person", "voice-call": "Voice call", online: "Online", "video-chat": "Video + Chat", "chat-only": "Chat Only" })[v] || v || "Google Meet"; }
function compactModeLabel(v = "") { return ({ "google-meet": "Meet", "in-person": "In-person", "voice-call": "Voice", online: "Online", "video-chat": "Vid+Chat", "chat-only": "Chat" })[v] || v || "Meet"; }
function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "MS";
}

function avatarUrl(name = "", profilePhotoUrl = "") {
  if (profilePhotoUrl) return profilePhotoUrl;
  const encoded = encodeURIComponent(name || "User");
  const colors = ["7c3aed", "0891b2", "059669", "d97706", "dc2626", "db2777", "7c3aed", "2563eb"];
  const colorIndex = (name || "").length % colors.length;
  return `https://ui-avatars.com/api/?name=${encoded}&background=${colors[colorIndex]}&color=fff&size=400&bold=true&format=png`;
}

const Counselling = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { counsellorId } = useParams();
  const dispatch = useAppDispatch();
  const counsellors = useAppSelector(selectCounsellors);
  const counsellorsStatus = useAppSelector(selectCounsellorsStatus);
  const loading = counsellorsStatus === "idle" || counsellorsStatus === "loading";
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedPlanId, setSelectedPlanId] = useState("short-term");
  const [concernTags, setConcernTags] = useState([]);
  const [genderFilter, setGenderFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [consultMode, setConsultMode] = useState("");
  const [availability, setAvailability] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("");
  const [firstSessionFree, setFirstSessionFree] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllConcerns, setShowAllConcerns] = useState(false);
  const [feeRange, setFeeRange] = useState([0, 5000]);
  // Doctor-jaisa Book Appointment (BookingModal) — counsellor ke liye
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [resolvingDoctor, setResolvingDoctor] = useState(false);

  // Counsellor ka Doctor doc nikalo (booking/slots/payment sab Doctor model se chalta hai).
  // Seed (seed-mind-providers.mjs) same email se Doctor doc banata hai.
  const handleBookAppointment = async (counsellor) => {
    if (!counsellor || resolvingDoctor) return;
    setResolvingDoctor(true);
    try {
      let doc = null;
      if (counsellor.email) {
        try {
          const res = await mainApi.getDoctors({ search: counsellor.email, limit: 5 });
          const list = res?.data || res?.items || res || [];
          doc = (Array.isArray(list) ? list : []).find((d) =>
            (d.email || "").toLowerCase() === String(counsellor.email).toLowerCase()
          ) || null;
        } catch { doc = null; }
      }
      if (!doc) {
        // Fallback: counsellor object ko doctor-shape me map karo (BookingModal defensive hai)
        const baseFee = Number(counsellor.sessionPricing) || lowestPrice(counsellor) || 800;
        doc = {
          _id: counsellor.doctorId || counsellor.id,
          name: counsellor.name,
          specialization: "Counselling",
          consultation_fees: baseFee,
          appointmentFees: {
            video: baseFee,
            audio: Math.round(baseFee * 0.8),
            chat: Math.round(baseFee * 0.6),
            offline: baseFee,
            home_visit: Math.round(baseFee * 1.2),
          },
          supportPlanPrices: counsellor.supportPlanPrices || {},
          customPackages: counsellor.customPackages || [],
          languages: counsellor.languages || ["English"],
          location: counsellor.city || counsellor.location || "Online",
          available: counsellor.bookingEnabled !== false,
          appointmentModes: ["video", "audio", "chat"],
        };
      }
      setSelectedDoctor(doc);
      setShowBooking(true);
    } finally {
      setResolvingDoctor(false);
    }
  };

  const concernToPlan = useMemo(() => ({
    "Immediate support": "one-time", "One-off guidance": "one-time", "Quick check-in": "one-time",
    "Stress": "short-term", "Anxiety": "short-term", "Exam pressure": "short-term", "Loneliness": "short-term",
    "Mild depression": "medium-term", "Relationship issues": "medium-term", "Emotional healing": "medium-term",
    "Trauma": "long-term", "Severe anxiety": "long-term", "Chronic depression": "long-term",
  }), []);

  const recommendedPlanId = useMemo(() => {
    for (const tag of concernTags) {
      const mapped = concernToPlan[tag];
      if (mapped) return mapped;
    }
    if (category && category !== "All") return concernToPlan[category] || null;
    return null;
  }, [concernTags, category, concernToPlan]);

  useEffect(() => {
    if (recommendedPlanId && counsellorId) {
      setSelectedPlanId(recommendedPlanId);
    }
  }, [recommendedPlanId, counsellorId]);

  useEffect(() => {
    dispatch(fetchCounsellors());
    api.get("/api/appointments/my")
      .then(({ data }) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [dispatch]);

  const categories = useMemo(() => {
    const s = new Set(["All"]);
    counsellors.forEach(c => { (c.categories || []).forEach(i => s.add(i)); plansFor(c).forEach(p => (p.bestFor || []).forEach(i => s.add(i))); });
    return [...s];
  }, [counsellors]);

  const planList = useMemo(() => {
    for (const c of counsellors) { const p = plansFor(c); if (p.length) return p; }
    return fallbackPlans;
  }, [counsellors]);

  const activeBookings = useMemo(() => {
    const m = new Map();
    appointments.filter(a => activeStatuses.includes(a.status)).forEach(a => m.set(a.counsellorId, a));
    return m;
  }, [appointments]);

  const filteredCounsellors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = counsellors.filter(c => {
      const t = [c.name, c.specialization, c.location, c.education, c.bio, c.badge, ...(c.categories || []), ...plansFor(c).flatMap(p => p.bestFor || [])].filter(Boolean).join(" ").toLowerCase();
      if (q && !t.includes(q)) return false;
      if (category !== "All" && !t.includes(category.toLowerCase())) return false;
      if (genderFilter && c.gender !== genderFilter) return false;
      if (languageFilter && !(c.languages || []).some(l => l.toLowerCase().includes(languageFilter.toLowerCase()))) return false;
      if (consultMode && !(c.consultationModes || []).some(m => m.includes(consultMode))) return false;
      if (experienceFilter) {
        const yrs = parseInt(c.experience) || 0;
        if (experienceFilter === "0-2" && (yrs < 0 || yrs > 2)) return false;
        if (experienceFilter === "3-5" && (yrs < 3 || yrs > 5)) return false;
        if (experienceFilter === "5-10" && (yrs < 5 || yrs > 10)) return false;
        if (experienceFilter === "10+" && yrs < 10) return false;
      }
      if (ratingFilter) {
        const minRating = parseFloat(ratingFilter);
        if ((c.rating || 0) < minRating) return false;
      }
      if (verifiedOnly && !c.verified) return false;
      if (qualificationFilter && !(c.education || "").toLowerCase().includes(qualificationFilter.toLowerCase())) return false;
      if (ageGroupFilter && !(c.ageGroups || []).some(a => a.toLowerCase().includes(ageGroupFilter.toLowerCase()))) return false;
      if (packageTypeFilter) {
        const pTypes = plansFor(c).map(p => p.id);
        if (!pTypes.includes(packageTypeFilter)) return false;
      }
      if (firstSessionFree && !c.firstSessionFree) return false;
      if (locationSearch && !(c.city || c.location || "").toLowerCase().includes(locationSearch.toLowerCase())) return false;
      {
        const lp = lowestPrice(c);
        if (lp < feeRange[0] || lp > feeRange[1]) return false;
      }
      return true;
    });
    if (sortBy === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === "price-low") sorted.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    else if (sortBy === "price-high") sorted.sort((a, b) => lowestPrice(b) - lowestPrice(a));
    else if (sortBy === "popular") sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    return sorted;
  }, [category, counsellors, search, genderFilter, languageFilter, consultMode, experienceFilter, ratingFilter, verifiedOnly, qualificationFilter, ageGroupFilter, packageTypeFilter, firstSessionFree, locationSearch, feeRange, sortBy]);

  const selectedCounsellor = counsellors.find(c => c.id === counsellorId);
  useEffect(() => { if (!selectedCounsellor) return; setSelectedPlanId(c => plansFor(selectedCounsellor).some(p => p.id === c) ? c : plansFor(selectedCounsellor)[0]?.id); }, [selectedCounsellor]);

  if (counsellorId) {
    return (
      <CounsellorProfile
        counsellor={selectedCounsellor} loading={loading} selectedPlanId={selectedPlanId} setSelectedPlanId={setSelectedPlanId} recommendedPlanId={recommendedPlanId} concernTags={concernTags} setConcernTags={setConcernTags}
        booking={activeBookings.get(counsellorId)} onBack={() => navigate("/mind/counselling")}
        onSchedule={(planId) => navigate(`/mind/session-schedule?counsellorId=${counsellorId}&plan=${planId}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground theme-findmedi">
      <Navigation />
      <main className="pt-16">
        <section className="py-10 md:py-16 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold text-foreground">Find a Counsellor</h1>
              <p className="text-muted-foreground mt-1">Search counsellors by name, concern, or specialty</p>
            </div>

            {/* Search + Filters */}
            <div className="max-w-6xl mx-auto mb-8 space-y-4">

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  className="pl-12 h-12 text-base rounded-2xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, specialty, or concern..."
                />
              </div>

              {/* Browse by Concern - category cards */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-primary" />
                    Browse by Concern
                  </h2>
                  {CONCERN_CARDS.length > 7 && !showAllConcerns && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllConcerns(true)} className="gap-1 text-primary">
                      More <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {showAllConcerns && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllConcerns(false)} className="gap-1 text-primary">
                      Less <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {CONCERN_CARDS.slice(0, showAllConcerns ? undefined : 7).map((concern) => {
                    const Icon = concern.icon;
                    const isActive = category === concern.name;
                    const count = counsellors.filter(c => {
                      const t = [c.name, c.specialization, c.location, c.education, c.bio, c.badge, ...(c.categories || []), ...plansFor(c).flatMap(p => p.bestFor || [])].filter(Boolean).join(" ").toLowerCase();
                      return t.includes(concern.name.toLowerCase());
                    }).length;
                    return (
                      <button
                        key={concern.name}
                        onClick={() => setCategory(isActive ? "All" : concern.name)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                        }`}>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${concern.color} flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${concern.textColor}`} />
                        </div>
                        <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {concern.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {recommendedPlanId && category !== 'All' && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs text-primary">Recommended plan: <span className="font-semibold">{planList.find(p => p.id === recommendedPlanId)?.name || recommendedPlanId}</span></span>
                  </div>
                )}
              </div>

              {/* ═══════ FILTERS BAR ═══════ */}
              <div className="mb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select value={consultMode} onChange={e => setConsultMode(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="">Mode: Any</option>
                    <option value="online">Online</option>
                    <option value="chat">Chat</option>
                  </select>

                  <select value={availability} onChange={e => setAvailability(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="">Availability</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="next">Next Slot</option>
                  </select>

                  <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="">Language</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Marathi">Marathi</option>
                  </select>

                  <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>

                  <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="">Experience</option>
                    <option value="0-2">0–2 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="5-10">5–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>

                  {/* Fee range */}
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input type="range" min={0} max={5000} step={100} value={feeRange[0]}
                      onChange={e => setFeeRange([parseInt(e.target.value), feeRange[1]])}
                      className="w-16 h-1 accent-primary" />
                    <span className="text-xs text-muted-foreground w-12 text-right">{feeRange[0]}</span>
                    <span className="text-xs text-muted-foreground">-</span>
                    <input type="range" min={0} max={5000} step={100} value={feeRange[1]}
                      onChange={e => setFeeRange([feeRange[0], parseInt(e.target.value)])}
                      className="w-16 h-1 accent-primary" />
                    <span className="text-xs text-muted-foreground w-12">{feeRange[1]}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1">
                    {["4", "3"].map(r => (
                      <Button key={r} variant={ratingFilter === r ? 'default' : 'outline'} size="sm"
                        onClick={() => setRatingFilter(ratingFilter === r ? "" : r)}
                        className="h-9 text-xs px-3">
                        <Star className="w-3.5 h-3.5 mr-1" /> {r}★ & above
                      </Button>
                    ))}
                  </div>

                  {/* Sort */}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
                    <option value="popular">Sort: Popular</option>
                    <option value="rating">Top Rated</option>
                    <option value="price-low">Price (Low-High)</option>
                    <option value="price-high">Price (High-Low)</option>
                  </select>

                  {/* More Filters Toggle */}
                  <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}
                    className="h-9 gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    {showAdvanced ? 'Hide Advanced' : 'More Filters'}
                  </Button>

                  {/* Clear All */}
                  {(category !== 'All' || consultMode || availability || languageFilter || genderFilter || experienceFilter || feeRange[0] > 0 || feeRange[1] < 5000 || ratingFilter || sortBy !== 'popular' || qualificationFilter || specializationFilter || verifiedOnly || ageGroupFilter || packageTypeFilter || firstSessionFree || locationSearch || search) && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSearch(""); setCategory("All"); setConcernTags([]); setGenderFilter(""); setLanguageFilter("");
                      setConsultMode(""); setAvailability(""); setFeeRange([0, 5000]); setExperienceFilter("");
                      setQualificationFilter(""); setSpecializationFilter(""); setRatingFilter(""); setVerifiedOnly(false);
                      setAgeGroupFilter(""); setPackageTypeFilter(""); setFirstSessionFree(false); setLocationSearch(""); setSortBy("popular");
                    }} className="text-red-500 hover:text-red-600 h-9 text-xs">
                      <X className="w-3.5 h-3.5 mr-1" /> Clear All
                    </Button>
                  )}
                </div>

              {/* ═══════ ADVANCED FILTERS DRAWER ═══════ */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <Card className="p-4">
                      <div className="space-y-5">

                  {/* Row: Experience · Qualification · Specialization · Rating */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Experience */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <BriefcaseBusiness className="h-3 w-3" /> Experience
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "0-2", "3-5", "5-10", "10+"].map(e => (
                          <button key={e || "any"} onClick={() => setExperienceFilter(e === experienceFilter ? "" : e)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!experienceFilter && !e) || experienceFilter === e
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{e || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Qualification */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Award className="h-3 w-3" /> Qualification
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "Clinical Psychologist", "Counsellor", "Life Coach"].map(q => (
                          <button key={q || "any"} onClick={() => setQualificationFilter(q === qualificationFilter ? "" : q)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!qualificationFilter && !q) || qualificationFilter === q
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{q || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Specialization */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Award className="h-3 w-3" /> Specialization
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "CBT", "EMDR", "Couples therapy", "Child psychology"].map(s => (
                          <button key={s || "any"} onClick={() => setSpecializationFilter(s === specializationFilter ? "" : s)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!specializationFilter && !s) || specializationFilter === s
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{s || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Star className="h-3 w-3" /> Min. Rating
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "4", "4.5"].map(r => (
                          <button key={r || "any"} onClick={() => setRatingFilter(r === ratingFilter ? "" : r)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!ratingFilter && !r) || ratingFilter === r
                                ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{r || "Any"}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row: Verified · Age Group · Package Type · First Session Free */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Verified */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <ShieldCheck className="h-3 w-3" /> Badge
                      </span>
                      <button onClick={() => setVerifiedOnly(!verifiedOnly)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all w-full ${
                          verifiedOnly
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${verifiedOnly ? "opacity-100" : "opacity-0"}`} />
                        Verified only
                      </button>
                    </div>

                    {/* Age Group */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Baby className="h-3 w-3" /> Age Group
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "Teens", "Adults", "Elderly", "Couples"].map(a => (
                          <button key={a || "any"} onClick={() => setAgeGroupFilter(a === ageGroupFilter ? "" : a)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!ageGroupFilter && !a) || ageGroupFilter === a
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{a || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Package Type */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Package className="h-3 w-3" /> Package Type
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "one-time", "short-term", "medium-term", "long-term"].map(p => (
                          <button key={p || "any"} onClick={() => setPackageTypeFilter(p === packageTypeFilter ? "" : p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!packageTypeFilter && !p) || packageTypeFilter === p
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >{p === "" ? "Any" : p.replace("-", " ")}</button>
                        ))}
                      </div>
                    </div>

                    {/* First Session Free */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        <Sparkles className="h-3 w-3" /> Offer
                      </span>
                      <button onClick={() => setFirstSessionFree(!firstSessionFree)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all w-full ${
                          firstSessionFree
                            ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${firstSessionFree ? "opacity-100" : "opacity-0"}`} />
                        First session free
                      </button>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      <MapPin className="h-3 w-3" /> City
                    </span>
                    <Input value={locationSearch} onChange={e => setLocationSearch(e.target.value)} placeholder="City or area..." className="h-9 rounded-lg bg-muted/60 border-border text-foreground text-xs placeholder:text-muted-foreground focus:border-primary/50 max-w-xs" />
                  </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              {/* Results */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    {category !== 'All' ? `${category} Counsellors` : 'Available Counsellors'}
                    <span className="text-base font-normal text-muted-foreground ml-2">({filteredCounsellors.length})</span>
                  </h2>
                </div>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="rounded-2xl bg-muted/50 border border-border/70 overflow-hidden animate-pulse">
                    <div className="h-56 bg-muted/60" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted/60 rounded w-3/4" />
                      <div className="h-3 bg-muted/60 rounded w-1/2" />
                      <div className="h-3 bg-muted/60 rounded w-full" />
                      <div className="h-10 bg-muted/60 rounded-xl mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCounsellors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/70 mb-4">
                  <Search className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground">No counsellors match your search</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Try adjusting your filters or using different keywords.</p>
                <Button variant="outline" size="sm" className="mt-4 text-muted-foreground border-border" onClick={() => {
                  setSearch(""); setCategory("All"); setConcernTags([]); setGenderFilter(""); setLanguageFilter("");
                  setConsultMode(""); setAvailability(""); setFeeRange([0, 5000]); setExperienceFilter("");
                  setQualificationFilter(""); setSpecializationFilter(""); setRatingFilter(""); setVerifiedOnly(false);
                  setAgeGroupFilter(""); setPackageTypeFilter(""); setFirstSessionFree(false); setLocationSearch(""); setSortBy("popular");
                }}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCounsellors.map((c, i) => (
                  <CounsellorCard key={c.id} counsellor={c} booking={activeBookings.get(c.id)} index={i} onView={() => navigate(`/mind/counselling/${c.id}`)} onBook={() => handleBookAppointment(c)} bookingBusy={resolvingDoctor} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <BookingModal open={showBooking} onOpenChange={setShowBooking} doctor={selectedDoctor} facility={selectedDoctor?.facilityId} />
      <Footer />
    </div>
  );
};

function CounsellorCard({ counsellor, booking, onView, onBook, bookingBusy, index = 0 }) {
  const cleanName = (counsellor.name || "").replace(/^Dr\.?\s+/i, "");
  const accepting = counsellor.bookingEnabled !== false;
  const languages = counsellor.languages?.length ? counsellor.languages : ["English"];
  const onlineModes = (counsellor.consultationModes?.length ? counsellor.consultationModes.filter(m => m !== "in-person") : []);
  const modes = onlineModes.length ? onlineModes : ["google-meet", "voice-call"];
  const imgUrl = avatarUrl(cleanName, counsellor.profilePhotoUrl);
  const categories = (counsellor.categories || []).slice(0, 3);
  const isMentor = counsellor.counsellorType === "mentor";
  const badgeLabel = counsellor.badge || (isMentor ? "Community Mentor" : "Verified Professional");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onView}
      className="group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer relative"
    >
      {/* Corner badge — Available / Paused */}
      <div
        className={cn(
          "absolute top-0 right-0 z-10 px-3 py-1.5 rounded-bl-2xl text-[11px] font-semibold border-l border-b shadow-sm",
          accepting
            ? "bg-primary/5 text-primary border-primary/20 group-hover:bg-primary/10"
            : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 group-hover:bg-red-100"
        )}
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3" />
          {accepting ? "Available" : "Paused"}
        </span>
      </div>

      <div className="p-5">
        {/* Top: Photo + Name + Info */}
        <div className="flex items-start gap-4 mb-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/10 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
            <img src={imgUrl} alt={cleanName} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {cleanName}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                  isMentor
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                {badgeLabel}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary/80 transition-colors">
              {counsellor.specialization || "Mental wellness counsellor"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-foreground">{Number(counsellor.rating || 4.8).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({counsellor.reviews || 0})</span>
              <span className="text-xs text-muted-foreground ml-1">• {counsellor.experience || "Verified"} exp</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {counsellor.bio || "Warm, practical support focused on emotional clarity and steady progress."}
        </p>

        {/* Tags */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.map(t => (
              <span key={t} className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Details box — Find Clinic style */}
        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-3 mb-3 transition-all duration-300 group-hover:border-primary/20 group-hover:from-primary/5 group-hover:to-transparent">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" />
              Experience
            </span>
            <span className="font-semibold text-foreground">{counsellor.experience || "Verified"}</span>
          </div>
          <Separator className="bg-border/30 my-2.5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-primary" />
              Languages
            </span>
            <span className="font-semibold text-foreground truncate ml-2">{languages.join(", ")}</span>
          </div>
          <Separator className="bg-border/30 my-2.5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Location
            </span>
            <span className="font-semibold text-foreground truncate ml-2">{counsellor.city || counsellor.location || "Online"}</span>
          </div>
          <Separator className="bg-border/30 my-2.5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-primary" />
              Modes
            </span>
            <span className="font-semibold text-foreground text-xs">{modes.map(compactModeLabel).join(" / ")}</span>
          </div>
        </div>

        {/* Fee */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/0 border border-primary/10 mb-3 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
          <span className="text-sm text-muted-foreground">Starts at</span>
          <span className="font-bold text-lg text-primary">
            {formatRupees(lowestPrice(counsellor))}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ pkg</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full gap-1.5 rounded-xl h-10 shadow-lg shadow-primary/20 group/btn" disabled={!accepting || bookingBusy} onClick={(e) => { e.stopPropagation(); onBook && onBook(); }}>
            <CalendarDays className="w-4 h-4" /> {accepting ? "Book Appointment" : "Unavailable"}
          </Button>
          <Button variant="outline" className="w-full gap-1.5 rounded-xl h-10 group/btn" onClick={onView}>
            View Profile
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function CounsellorProfile({ counsellor, loading, selectedPlanId, setSelectedPlanId, recommendedPlanId, concernTags, setConcernTags, booking, onBack, onSchedule }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const cleanName = (counsellor?.name || "").replace(/^Dr\.?\s+/i, "");
  const selectedPlan = planFromList(counsellor, selectedPlanId);
  const planList = plansFor(counsellor);
  const languages = counsellor?.languages?.length ? counsellor.languages : ["English"];
  const categories = counsellor?.categories?.length ? counsellor.categories : selectedPlan?.bestFor || ["Stress", "Anxiety"];
  const onlineModesDetail = (counsellor?.consultationModes?.length ? counsellor.consultationModes.filter(m => m !== "in-person") : []);
  const consultationModes = onlineModesDetail.length ? onlineModesDetail : ["google-meet", "voice-call"];
  const imgUrl = avatarUrl(cleanName, counsellor?.profilePhotoUrl);
  const isMentor = counsellor?.counsellorType === "mentor";
  const badgeLabel = counsellor?.badge || (isMentor ? "Community Mentor" : "Verified Professional");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState("google-meet");
  const [showIntakeDetails, setShowIntakeDetails] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", submitting: false });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mode ratios for counselling: Meet=1, Audio=0.8, Chat=0.6
  const getAdjustedPlanPrice = (plan) => {
    const base = planPrice(plan);
    if (!base) return 0;
    const mult = selectedMode === "voice-call" || selectedMode === "audio" ? 0.8 : selectedMode === "chat-only" || selectedMode === "chat" ? 0.6 : 1;
    return Math.round(base * mult);
  };

  useEffect(() => {
    if (!counsellor?.id) return;
    setReviewsLoading(true);
    api.get(`/api/reviews/counsellor/${counsellor.id}`)
      .then(({ data }) => setReviews(data || []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [counsellor?.id]);

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + (r.averageRating || r.rating || 0), 0) / totalReviews) : Number(counsellor?.rating || 0);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.round(r.averageRating || r.rating || 0);
    if (star >= 1 && star <= 5) breakdown[star]++;
  });
  const breakdownPct = totalReviews > 0
    ? Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round((v / totalReviews) * 100)]))
    : { 5: 72, 4: 18, 3: 7, 2: 2, 1: 1 };

  const renderStars = (rating, size = "w-3.5 h-3.5") => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${size} ${s <= Math.round(rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  const ratingBreakdown = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[Math.round(r.rating)]++; });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).reverse().map(([star, count]) => (
      <div key={star} className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground w-6 text-right">{star}</span>
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
        </div>
        <span className="text-muted-foreground w-6">{count}</span>
      </div>
    ));
  };

  const toggleSaved = () => {
    setSaved(v => !v);
    toast({ title: saved ? "Removed from saved" : "Saved", description: saved ? "Removed from your saved counsellors" : "Added to your saved counsellors" });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: counsellor?.name || "Counsellor Profile", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const submitReview = async () => {
    if (!reviewForm.comment.trim()) {
      toast({ variant: "destructive", title: "Review incomplete", description: "Please write a comment." });
      return;
    }
    setReviewForm((f) => ({ ...f, submitting: true }));
    try {
      const { data: created } = await api.post("/api/reviews/submit", { counsellorId: counsellor.id, rating: reviewForm.rating, comment: reviewForm.comment.trim() });
      setReviews((prev) => [created, ...prev]);
      setReviewForm({ rating: 5, comment: "", submitting: false });
      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not submit review", description: error?.message || "" });
      setReviewForm((f) => ({ ...f, submitting: false }));
    }
  };

  const submitReport = async () => {
    if (!reportReason) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/reports/counsellor", { counsellorId: counsellor.id, reason: reportReason, details: reportDetails });
      if (data.success) {
        toast({ title: "Report submitted", description: "Admin will review this report." });
        setShowReportModal(false);
        setReportReason("");
        setReportDetails("");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground theme-findmedi">
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading counsellor…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!counsellor) {
    return (
      <div className="min-h-screen bg-background text-foreground theme-findmedi">
        <Navigation />
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold">Counsellor not found</h3>
          <Button variant="outline" className="mt-4" onClick={onBack}>Back to counsellors</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const WEEK_DAYS = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];
  const availabilityMap = {};
  (counsellor.availability || []).forEach(entry => {
    const day = entry.split(":")[0]?.trim().toLowerCase();
    if (day) availabilityMap[day] = entry;
  });

  return (
    <div className="min-h-screen bg-background text-foreground theme-findmedi">
      <Navigation />
      <motion.div initial="hidden" animate="visible" className="pt-16">
        {/* BREADCRUMB */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <Link to="/mind" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/mind/counselling" className="hover:text-primary transition-colors">Find Counsellor</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{cleanName}</span>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* MAIN CONTENT */}
            <div className="lg:col-span-2 space-y-8">
              {/* HERO */}
              <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-heading font-bold text-4xl overflow-hidden flex-shrink-0 border-2 border-border/40 ring-4 ring-background">
                      <img src={imgUrl} alt={cleanName} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-[3px] border-background flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5">
                      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{cleanName}</h1>
                      <Badge variant="outline" className={`w-fit text-xs ${isMentor ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400"}`}>
                        <ShieldCheck className="w-3 h-3 mr-1" /> {badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-primary font-semibold text-lg mb-1">{counsellor.specialization || "Mental wellness counsellor"}</p>
                    {counsellor.education && (
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />{counsellor.education}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400">
                        {isMentor ? "Online Support" : "Licensed Support"}
                      </Badge>
                      {languages.map(lang => (
                        <Badge key={lang} variant="outline" className="text-xs bg-muted/50">
                          <Languages className="w-3 h-3 mr-1" />{lang}
                        </Badge>
                      ))}
                      {counsellor.gender && (
                        <Badge variant="outline" className="text-xs bg-muted/50">{counsellor.gender}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                        <Award className="w-4 h-4 text-primary" /><span className="font-semibold text-foreground">{counsellor.experience || "Verified"}</span>
                      </span>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span><span className="text-muted-foreground">({totalReviews})</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />{counsellor.city || counsellor.location || "Online only"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-primary" />{counsellor.responseTime || "Within 24 hours"}</span>
                  <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4 text-primary" />{consultationModes.map(modeLabel).join(", ")}</span>
                  <span className="flex items-center gap-1.5"><IndianRupee className="w-4 h-4 text-success" /><span className="text-success font-semibold">₹{lowestPrice(counsellor)}</span><span className="text-xs">/ pkg</span></span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => setSaved(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm">
                      <Heart className={`w-4 h-4 ${saved ? "fill-current text-red-500" : ""}`} />{saved ? "Saved" : "Save"}
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm">
                      <Share2 className="w-4 h-4 text-primary" />Share
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* ABOUT */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><HeartHandshake className="w-4 h-4 text-primary" /></span>
                      About {counsellor.name?.split(" ")[0]}
                    </h2>
                    <div className={`${!showFullBio ? "line-clamp-3" : ""} text-muted-foreground leading-relaxed`}>
                      {counsellor.bio || "A warm, privacy-first counsellor focused on emotional support, coping skills, and steady progress."}
                    </div>
                    {counsellor.bio && counsellor.bio.length > 180 && (
                      <button onClick={() => setShowFullBio(!showFullBio)} className="mt-3 text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                        {showFullBio ? "Show less" : "Read more"}{showFullBio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {categories.length > 0 && (
                      <div className="mt-5">
                        <p className="text-sm font-semibold text-foreground mb-3">Focus Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(area => (
                            <Badge key={area} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary font-medium px-3 py-1">{area}</Badge>
                          ))}
                          {(counsellor.categories || []).length > 3 && counsellor.categories.slice(3, 6).map(a => (
                            <Badge key={a} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary px-3 py-1">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* EDUCATION & CAREER */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="w-4 h-4 text-primary" /></span>
                      Education & Credentials
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Education</p>
                        <div className="relative pl-6 border-l-2 border-primary/20">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-primary" /></div>
                          <p className="font-semibold text-foreground text-sm">{counsellor.education || "Verified professional training"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{isMentor ? "Peer support certification & lived experience" : "Licensed mental health professional"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Experience</p>
                        <div className="relative pl-6 border-l-2 border-muted-foreground/20">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-2 border-muted-foreground/40 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" /></div>
                          <p className="font-semibold text-foreground text-sm">{counsellor.experience || "Verified"} of experience</p>
                          <p className="text-xs text-muted-foreground">{isMentor ? "Highly educated mentor — guidance, coping strategies & emotional support (no medical degree)" : "Provides advice, coping tools & ongoing mental health support"}</p>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-6" />
                    <div className="grid sm:grid-cols-2 gap-6">
                      {counsellor.licenseNumber && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />License / Registration</p>
                          <div className="bg-muted/30 rounded-xl p-3 text-sm font-mono">{counsellor.licenseNumber}</div>
                        </div>
                      )}
                      {counsellor.certificateLinks?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">Certificates</p>
                          <div className="flex flex-wrap gap-2">
                            {counsellor.certificateLinks.map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">Certificate {i + 1}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {counsellor.linkedin && (
                      <div className="mt-4">
                        <a href={counsellor.linkedin} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5"><Award className="w-4 h-4" />LinkedIn Profile</a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* LOCATION & AVAILABILITY */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></span>
                      Location & Availability
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                      <div className="rounded-xl bg-muted/30 border border-border/60 p-4 text-center">
                        <MapPin className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-semibold text-sm">{counsellor.city || counsellor.location || "Online only"}</p>
                        <p className="text-xs text-muted-foreground mt-1">No clinic — online sessions</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 border border-border/60 p-4 text-center">
                        <Languages className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Languages</p>
                        <p className="font-semibold text-sm">{languages.join(", ")}</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 border border-border/60 p-4 text-center">
                        <Clock3 className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Response Time</p>
                        <p className="font-semibold text-sm">{counsellor.responseTime || "Within 24 hours"}</p>
                      </div>
                    </div>
                    {counsellor.availability?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Weekly Availability</p>
                        <div className="overflow-hidden rounded-xl border border-border/60">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/60 bg-muted/50">
                                <th className="text-left py-2.5 px-4 font-semibold">Day</th>
                                <th className="text-left py-2.5 px-4 font-semibold">Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {WEEK_DAYS.map(d => {
                                const entry = availabilityMap[d.key];
                                const isToday = new Date().toLocaleDateString("en", { weekday: "long" }).toLowerCase() === d.key;
                                return (
                                  <tr key={d.key} className={`border-b border-border/40 last:border-0 ${isToday ? "bg-primary/5" : ""}`}>
                                    <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${entry ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                                      {d.label}{isToday && <span className="text-xs text-primary font-semibold">(Today)</span>}
                                    </td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{entry ? entry.split(":").slice(1).join(":").trim() : "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* CONSULTATION OPTIONS */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Video className="w-4 h-4 text-primary" /></span>
                        How We Meet & Consultation Modes
                      </h2>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 capitalize font-medium w-fit">
                        Current: {modeLabel(selectedMode)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">Click a mode below to customize your session type and see mode-adjusted package rates.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {consultationModes.map(mode => {
                        const isModeActive = selectedMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSelectedMode(mode)}
                            className={cn(
                              "relative border rounded-xl p-4 text-center transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5",
                              isModeActive
                                ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                                : "bg-card border-border/70 hover:border-primary/40 hover:bg-muted/50"
                            )}
                          >
                            {isModeActive && (
                              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                            <div className="flex justify-center mb-2">
                              {mode === "google-meet" ? <Video className="h-5 w-5 text-cyan-600" /> : mode === "voice-call" ? <Phone className="h-5 w-5 text-primary" /> : <MessageCircle className="h-5 w-5 text-emerald-600" />}
                            </div>
                            <p className={cn("text-sm font-semibold", isModeActive ? "text-primary" : "text-foreground")}>{modeLabel(mode)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {mode === "google-meet" ? "100% standard (Video)" : mode === "voice-call" ? "20% off (Audio)" : "40% off (Chat only)"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* THERAPY PLANS */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="w-4 h-4 text-primary" /></span>
                        Support Packages
                      </h2>
                      <span className="text-xs text-muted-foreground">Prices tailored for <strong className="text-foreground">{modeLabel(selectedMode)}</strong></span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">Choose one plan for your journey. Rates reflect your chosen mode.</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {planList.map(plan => {
                        const originalPrice = planPrice(plan);
                        const adjustedPrice = getAdjustedPlanPrice(plan);
                        const isSelected = selectedPlan?.id === plan.id;
                        return (
                          <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                            className={`relative text-left p-5 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 ${
                              isSelected ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10" : "bg-muted/50 border-border/70 hover:border-primary/30 hover:bg-muted/60"
                            } ${recommendedPlanId === plan.id && !isSelected ? "ring-1 ring-emerald-500/40" : ""}`}
                          >
                            {recommendedPlanId === plan.id && !isSelected && (
                              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                                <Sparkles className="h-3 w-3 text-white" />
                              </span>
                            )}
                            {isSelected && (
                              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                            <h3 className="font-bold text-base mb-1">{plan.name}</h3>
                            <p className="text-xs text-muted-foreground mb-3">{plan.summary}</p>
                            <div className="mb-2">
                              <span className="text-2xl font-bold">{formatRupees(adjustedPrice)}</span>
                              {adjustedPrice !== originalPrice && (
                                <span className="text-xs text-muted-foreground line-through ml-2">{formatRupees(originalPrice)}</span>
                              )}
                              <span className="text-xs font-normal text-muted-foreground ml-1">total</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{plan.duration} • {plan.cadence}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(plan.bestFor || []).slice(0, 2).map(item => (
                                <span key={item} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px]">{item}</span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* INTAKE ASSESSMENT & REQUIREMENTS */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <h2 className="font-heading text-lg font-bold text-foreground">Intake Assessment & Form Details</h2>
                          <p className="text-xs text-muted-foreground">What you'll complete before your first session with {cleanName}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowIntakeDetails(prev => !prev)}
                        className="text-xs gap-1 text-primary"
                      >
                        {showIntakeDetails ? 'Hide details' : 'View requirements'}
                        {showIntakeDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>

                    <div className="mt-4 grid sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          Emotional Needs & Concerns
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Identify what brings you in (Stress, Grief, Relationships, Exams, Burnout) and key goals for therapy.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          Prior Support & Context
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Mention any previous counselling or coping strategies you have tried so {cleanName} can personalize guidance.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          Comfort & Preferred Mode
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Confirm audio, video, or chat format preference and share any emergency contact details privately.
                        </p>
                      </div>
                    </div>

                    {showIntakeDetails && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-border/60 space-y-3">
                        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-2">
                          <p className="font-semibold text-purple-700 dark:text-purple-300">Counselling Intake Steps:</p>
                          <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                            <li><strong className="text-foreground">Step 1:</strong> Select package and preferred consultation mode ({modeLabel(selectedMode)}).</li>
                            <li><strong className="text-foreground">Step 2:</strong> Purchase package and open your private onboarding portal.</li>
                            <li><strong className="text-foreground">Step 3:</strong> Fill out the brief intake assessment questionnaire to outline goals.</li>
                            <li><strong className="text-foreground">Step 4:</strong> Pick your live calendar dates/times for sessions seamlessly.</li>
                          </ol>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* REVIEWS */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 items-center justify-center border border-amber-500/20">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Reviews</h2>
                        <p className="text-sm text-muted-foreground">Based on {totalReviews} reviews</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-[1fr_1fr] gap-6 mb-8">
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map(star => (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-8 text-muted-foreground text-right">{star}</span>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${breakdownPct[star]}%` }} />
                            </div>
                            <span className="w-8 text-muted-foreground text-xs">{breakdownPct[star]}%</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                        <p className="text-5xl font-bold">{avgRating.toFixed(1)}</p>
                        <div className="flex gap-0.5 mt-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Overall rating</p>
                      </div>
                    </div>
                    {reviewsLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Loading reviews...</p>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-4 mb-8">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Written reviews</p>
                        {reviews.slice(0, showAllReviews ? reviews.length : 3).map((review) => (
                          <div key={review.id || review._id} className="bg-muted/50 border border-border/70 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 items-center justify-center text-xs font-bold text-violet-700">
                                  {initials(review.student?.name || review.studentName || "Anonymous")}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{review.student?.name || review.studentName || "Anonymous"}</p>
                                  <p className="text-xs text-muted-foreground">{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                                </div>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(review.averageRating || review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                                ))}
                              </div>
                            </div>
                            {review.comment && <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>}
                          </div>
                        ))}
                        {reviews.length > 3 && !showAllReviews && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAllReviews(true)}>Show all {totalReviews} reviews</Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No reviews yet — be the first to share your experience.</p>
                    )}
                    {/* Review form */}
                    <div className="bg-gradient-to-br from-primary/5 to-primary/5 border border-primary/15 rounded-xl p-5">
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" />Write a review</p>
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>
                            <Star className={`h-6 w-6 transition-all ${s <= reviewForm.rating ? "fill-amber-400 text-amber-400 scale-110" : "text-muted-foreground hover:text-muted-foreground"}`} />
                          </button>
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">{reviewForm.rating}/5</span>
                      </div>
                      <Textarea value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} placeholder="Share your experience with this counsellor..." className="min-h-[80px] rounded-xl border-border/70 bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none mb-3" />
                      <Button onClick={submitReview} disabled={reviewForm.submitting || !reviewForm.comment.trim()} className="h-10 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-lg shadow-primary/20 transition-all">
                        {reviewForm.submitting ? "Submitting..." : "Submit review"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ADDITIONAL INFO */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-4 h-4 text-primary" /></span>
                      Additional Information
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground">Counsellor Type</span>
                        <span className="text-sm font-semibold text-foreground">{isMentor ? "Community Mentor — highly educated, guidance & emotional support (no medical degree)" : "Professional — licensed therapy & counselling"}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground">Experience</span>
                        <span className="text-sm font-semibold text-foreground">{counsellor.experience || "Verified"}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground">Session Fee</span>
                        <span className="text-sm font-semibold text-success">₹{lowestPrice(counsellor)} / pkg</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground">Response Time</span>
                        <span className="text-sm font-semibold text-foreground">{counsellor.responseTime || "Within 24 hours"}</span>
                      </div>
                      {counsellor.languages?.length > 0 && (
                        <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                          <span className="text-sm text-muted-foreground block mb-2">Languages Spoken</span>
                          <div className="flex flex-wrap gap-1.5">
                            {counsellor.languages.map(lang => (
                              <Badge key={lang} variant="secondary" className="text-xs"><Languages className="w-3 h-3 mr-1" />{lang}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* SIDEBAR */}
            <motion.div variants={fadeUp} className="space-y-6">
              {/* Quick Info */}
              <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-primary" /></span>
                  Quick Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Experience</span><span className="font-semibold text-foreground">{counsellor.experience || "Verified"}</span></div>
                  <Separator />
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Rating</span><span className="font-semibold text-foreground">{avgRating.toFixed(1)} ★ ({totalReviews})</span></div>
                  <Separator />
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold text-foreground">{isMentor ? "Mentor" : "Professional"}</span></div>
                  <Separator />
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Location</span><span className="font-semibold text-foreground">{counsellor.city || "Online only"}</span></div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => setShowReviewForm(true)}>
                    <Star className="w-4 h-4" /> Write a Review
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={handleShare}>
                    <Share2 className="w-4 h-4" /> Share Profile
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11 text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-500/10" onClick={() => setShowReportModal(true)}>
                    <AlertTriangle className="w-4 h-4" /> Report
                  </Button>
                </div>
              </div>

              {/* Booking Card */}
              <div className="bg-card rounded-2xl border border-border/60 p-5 sticky top-24 shadow-sm">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4 text-primary" />Book Session
                </h2>
                {/* Concern Tags */}
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">What brings you here?</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {["Stress", "Anxiety", "Depression", "Trauma", "Relationship", "Loneliness", "Exam pressure", "Career"].map((tag) => {
                    const active = concernTags.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => setConcernTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${active ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border/70 hover:border-primary/30"}`}>{tag}</button>
                    );
                  })}
                </div>
                {recommendedPlanId && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700">Recommended: <span className="font-semibold">{planFromList(counsellor, recommendedPlanId)?.name}</span></p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected Plan</p>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 capitalize font-medium">
                    {modeLabel(selectedMode)}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-1">{selectedPlan?.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{selectedPlan?.summary}</p>
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Package Total ({modeLabel(selectedMode).split(' ')[0]})</p>
                    <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">Mode-adjusted</span>
                  </div>
                  <p className="text-3xl font-bold mt-1 text-foreground">{formatRupees(getAdjustedPlanPrice(selectedPlan))}</p>
                  {getAdjustedPlanPrice(selectedPlan) !== planPrice(selectedPlan) && (
                    <p className="text-xs text-muted-foreground mt-0.5">Original standard fee: <span className="line-through">{formatRupees(planPrice(selectedPlan))}</span></p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">one-time booking</p>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between py-1.5 border-b border-border/50"><span className="text-muted-foreground">Duration</span><span className="font-medium">{selectedPlan?.duration || "Flexible"}</span></div>
                  <div className="flex justify-between py-1.5 border-b border-border/50"><span className="text-muted-foreground">Cadence</span><span className="font-medium">{selectedPlan?.cadence || "Flexible"}</span></div>
                  <div className="flex justify-between py-1.5 border-b border-border/50"><span className="text-muted-foreground">Mode</span><span className="font-medium text-primary">{modeLabel(selectedMode)}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Response</span><span className="font-medium text-emerald-600">{counsellor?.responseTime || "Within 24 hours"}</span></div>
                </div>
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Today's Slots</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(s => <span key={s} className="px-3 py-1.5 bg-muted/60 rounded-full text-xs font-medium text-muted-foreground">{s}</span>)}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Consultation Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "google-meet", label: "Video", icon: Video },
                      { value: "voice-call", label: "Audio", icon: Phone },
                    ].map(m => (
                      <button key={m.value} onClick={() => setSelectedMode(m.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${selectedMode === m.value ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border/70 hover:border-primary/30"}`}>
                        <div className="flex items-center gap-2"><m.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{m.label}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={async () => {
                  if (booking) { onSchedule(selectedPlan?.id); return; }
                  const { data: pkg } = await api.post("/api/packages/purchase", { counsellorId: counsellor.id, planId: selectedPlan?.id, mode: selectedMode });
                  toast({ title: "Package purchased", description: `${pkg.planName} with ${counsellor.name} is now yours!` });
                  navigate(`/mind/session-schedule?packageId=${pkg.id}&counsellorId=${counsellor.id}&plan=${selectedPlan?.id}`);
                }} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/25 transition-all">
                  {booking ? "Open schedule" : "Book counsellor"}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="bg-card border border-border/60 rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed mt-4">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 mb-2" />This platform provides emotional support and does not replace medical treatment. For emergencies, contact professional services.
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      <Footer />
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-2">Report Counsellor</h3>
            <p className="text-sm text-muted-foreground mb-4">Why are you reporting {counsellor?.name}? This will be reviewed by our admin team.</p>
            <div className="space-y-3">
              {["Unprofessional behavior", "Inappropriate conduct", "Missed sessions", "Privacy violation", "Fake credentials", "Harassment", "Other"].map(r => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportReason === r ? "border-red-400/50 bg-red-500/10" : "border-border hover:border-primary/40"}`}>
                  <input type="radio" name="reason" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-red-500" />
                  <span className="text-sm text-foreground">{r}</span>
                </label>
              ))}
              <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Additional details (optional)" className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-400/50 resize-none" rows={3} />
              <div className="flex gap-3">
                <button onClick={() => { setShowReportModal(false); setReportReason(""); setReportDetails(""); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/60 transition-all">Cancel</button>
                <button onClick={submitReport} disabled={!reportReason || submitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 transition-all">{submitting ? "Submitting..." : "Submit Report"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, gradient = "from-muted/50 to-muted/30", iconColor = "text-muted-foreground" }) {
  return (
    <div className="bg-card border border-border/70 rounded-xl p-4 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        <div className={`flex h-6 w-6 rounded-lg bg-gradient-to-br ${gradient} items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        {label}
      </div>
      <div className="text-sm font-medium pl-8">{value}</div>
    </div>
  );
}

export default Counselling;