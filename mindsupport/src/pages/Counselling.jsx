import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api, getStoredUser } from "@/lib/api";
import { fetchCounsellors, selectCounsellors, selectCounsellorsStatus } from "@/store/counsellorsSlice";
import { purchasePackage } from "@/store/packagesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Award,
  Baby,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  GraduationCap,
  Headphones,
  HeartHandshake,
  IndianRupee,
  Laptop,
  Languages,
  ListOrdered,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Video,
} from "lucide-react";

const fallbackPlans = [
  { id: "one-time", name: "One-Time Session", duration: "Single session", cadence: "One-time consultation", summary: "A single counselling session for immediate support", bestFor: ["Immediate support", "One-off guidance", "Quick check-in"], bookingPrice: 599, perSessionPrice: 599 },
  { id: "short-term", name: "Short-Term Support", duration: "4-8 sessions", cadence: "One session every two days", summary: "Quick emotional support and guidance", bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"], bookingPrice: 1499, perSessionPrice: 1499 },
  { id: "medium-term", name: "Medium-Term Support", duration: "8-15 sessions", cadence: "Weekly or bi-weekly", summary: "Emotional recovery and personal growth", bestFor: ["Mild depression", "Relationship issues", "Emotional healing"], bookingPrice: 2499, perSessionPrice: 2499 },
  { id: "long-term", name: "Long-Term Therapy", duration: "3-6+ months", cadence: "Weekly or bi-weekly sessions", summary: "Ongoing therapy and steady progress", bestFor: ["Trauma", "Severe anxiety", "Chronic depression"], bookingPrice: 3999, perSessionPrice: 3999 },
];

const activeStatuses = ["pending", "confirmed"];
const slots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

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
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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
    return null;
  }, [concernTags, concernToPlan]);

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
      if (concernTags.length > 0) {
        const cSpec = [c.specialization, ...(c.categories || []), ...plansFor(c).flatMap(p => p.bestFor || [])].filter(Boolean).map(s => s.toLowerCase());
        if (!concernTags.some(tag => cSpec.some(s => s.includes(tag.toLowerCase())))) return false;
      }
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
      if (locationSearch && !(c.clinicAddress || c.city || c.location || "").toLowerCase().includes(locationSearch.toLowerCase())) return false;
      if (priceMin || priceMax) {
        const lp = lowestPrice(c);
        if (priceMin && lp < Number(priceMin)) return false;
        if (priceMax && lp > Number(priceMax)) return false;
      }
      return true;
    });
    if (sortBy === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === "price-low") sorted.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    else if (sortBy === "price-high") sorted.sort((a, b) => lowestPrice(b) - lowestPrice(a));
    else if (sortBy === "popular") sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    return sorted;
  }, [category, counsellors, search, concernTags, genderFilter, languageFilter, consultMode, experienceFilter, ratingFilter, verifiedOnly, qualificationFilter, ageGroupFilter, packageTypeFilter, firstSessionFree, locationSearch, priceMin, priceMax, sortBy]);

  const selectedCounsellor = counsellors.find(c => c.id === counsellorId);
  useEffect(() => { if (!selectedCounsellor) return; setSelectedPlanId(c => plansFor(selectedCounsellor).some(p => p.id === c) ? c : plansFor(selectedCounsellor)[0]?.id); }, [selectedCounsellor]);

  if (counsellorId) {
    return (
      <CounsellorProfile
        counsellor={selectedCounsellor} loading={loading} selectedPlanId={selectedPlanId} setSelectedPlanId={setSelectedPlanId} recommendedPlanId={recommendedPlanId} concernTags={concernTags} setConcernTags={setConcernTags}
        booking={activeBookings.get(counsellorId)} onBack={() => navigate("/counselling")}
        onSchedule={(planId) => navigate(`/session-schedule?counsellorId=${counsellorId}&plan=${planId}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Navigation />
      <main className="pt-16">
        <section className="py-10 md:py-16 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
                <HeartHandshake className="h-3.5 w-3.5" />
                Verified professionals, confidential support
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                Find your{' '}
                <span className="text-transparent bg-gradient-to-r from-violet-400 via-emerald-300 to-cyan-400 bg-clip-text">perfect counsellor</span>
              </h1>
              <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                Browse verified mental wellness professionals ready to support you through stress, anxiety, relationships, and more.
              </p>
            </div>

            {/* Search + Filters */}
            <div className="max-w-6xl mx-auto mb-8 space-y-4">

              {/* Search row + Sort */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    className="h-12 rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, specialty, or concern..."
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">Sort by</span>
                  <div className="flex gap-1">
                    {[
                      { key: "popular", label: "Popular", icon: Users },
                      { key: "rating", label: "Top Rated", icon: Star },
                      { key: "price-low", label: "Price ↓", icon: IndianRupee },
                      { key: "price-high", label: "Price ↑", icon: TrendingUp },
                    ].map(s => (
                      <button key={s.key} onClick={() => setSortBy(s.key)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          sortBy === s.key
                            ? "bg-violet-500/20 text-violet-300 border-violet-400/30 shadow-sm"
                            : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                        }`}
                      >
                        <s.icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Basic Filters Card */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 backdrop-blur-sm space-y-4">
                {/* Concern / Issue */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HeartHandshake className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Concern / Issue</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Stress", "Anxiety", "Depression", "Trauma", "Relationship", "Loneliness", "Exam pressure", "Career", "Addiction", "Grief"].map(tag => {
                      const active = concernTags.includes(tag);
                      return (
                        <button key={tag} type="button" onClick={() => setConcernTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                            active
                              ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-400/30 shadow-sm"
                              : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:border-emerald-500/25 hover:text-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {active && <Check className="h-3 w-3 text-emerald-400" />}
                            {tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {recommendedPlanId && concernTags.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/5 border border-violet-500/15">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      <span className="text-xs text-violet-300">Recommended plan: <span className="font-semibold">{planList.find(p => p.id === recommendedPlanId)?.name || recommendedPlanId}</span></span>
                    </div>
                  )}
                </div>

                {/* Row 2: Mode · Availability · Language · Gender */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Consultation Mode */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      <Laptop className="h-3 w-3" /> Mode
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["", "online", "in-person", "chat"].map(m => (
                        <button key={m || "any"} onClick={() => setConsultMode(m === consultMode ? "" : m)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            (!consultMode && !m) || consultMode === m
                              ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                              : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                          }`}
                        >{m || "Any"}</button>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      <CalendarRange className="h-3 w-3" /> Availability
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["", "today", "this-week", "next"].map(a => (
                        <button key={a || "any"} onClick={() => setAvailability(a === availability ? "" : a)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            (!availability && !a) || availability === a
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                              : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                          }`}
                        >{a ? { "today": "Today", "this-week": "This Week", "next": "Next Slot" }[a] : "Any"}</button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      <Languages className="h-3 w-3" /> Language
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["", "English", "Hindi", "Tamil", "Bengali", "Marathi"].map(l => (
                        <button key={l || "any"} onClick={() => setLanguageFilter(l === languageFilter ? "" : l)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            (!languageFilter && !l) || languageFilter === l
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                              : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                          }`}
                        >{l || "Any"}</button>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      <User className="h-3 w-3" /> Gender
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["", "Male", "Female", "Non-binary"].map(g => (
                        <button key={g || "any"} onClick={() => setGenderFilter(g === genderFilter ? "" : g)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            (!genderFilter && !g) || genderFilter === g
                              ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                              : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                          }`}
                        >{g || "Any"}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                    <IndianRupee className="h-3 w-3" /> Price Range (per package)
                  </span>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Min ₹" className="h-9 rounded-lg bg-white/5 border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-violet-400/50 w-24" />
                    <span className="text-slate-600">&ndash;</span>
                    <Input type="number" min={0} value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Max ₹" className="h-9 rounded-lg bg-white/5 border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-violet-400/50 w-24" />
                    {(priceMin || priceMax) && (
                      <button onClick={() => { setPriceMin(""); setPriceMax(""); }} className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2">Clear</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-300 hover:border-white/[0.12] transition-all"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showAdvanced ? "Hide" : "More"} Filters
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {/* Advanced Filters Panel */}
              {showAdvanced && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 backdrop-blur-sm space-y-5 animate-in slide-in-from-top-2 duration-200">

                  {/* Row: Experience · Qualification · Specialization · Rating */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Experience */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <BriefcaseBusiness className="h-3 w-3" /> Experience
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "0-2", "3-5", "5-10", "10+"].map(e => (
                          <button key={e || "any"} onClick={() => setExperienceFilter(e === experienceFilter ? "" : e)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!experienceFilter && !e) || experienceFilter === e
                                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                            }`}
                          >{e || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Qualification */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Award className="h-3 w-3" /> Qualification
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "Clinical Psychologist", "Counsellor", "Psychiatrist", "Life Coach"].map(q => (
                          <button key={q || "any"} onClick={() => setQualificationFilter(q === qualificationFilter ? "" : q)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!qualificationFilter && !q) || qualificationFilter === q
                                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                            }`}
                          >{q || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Specialization */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Award className="h-3 w-3" /> Specialization
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "CBT", "EMDR", "Couples therapy", "Child psychology"].map(s => (
                          <button key={s || "any"} onClick={() => setSpecializationFilter(s === specializationFilter ? "" : s)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!specializationFilter && !s) || specializationFilter === s
                                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                            }`}
                          >{s || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Star className="h-3 w-3" /> Min. Rating
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "4", "4.5"].map(r => (
                          <button key={r || "any"} onClick={() => setRatingFilter(r === ratingFilter ? "" : r)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!ratingFilter && !r) || ratingFilter === r
                                ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
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
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <ShieldCheck className="h-3 w-3" /> Badge
                      </span>
                      <button onClick={() => setVerifiedOnly(!verifiedOnly)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all w-full ${
                          verifiedOnly
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                            : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06]"
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${verifiedOnly ? "opacity-100" : "opacity-0"}`} />
                        Verified only
                      </button>
                    </div>

                    {/* Age Group */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Baby className="h-3 w-3" /> Age Group
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "Teens", "Adults", "Elderly", "Couples"].map(a => (
                          <button key={a || "any"} onClick={() => setAgeGroupFilter(a === ageGroupFilter ? "" : a)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!ageGroupFilter && !a) || ageGroupFilter === a
                                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                            }`}
                          >{a || "Any"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Package Type */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Package className="h-3 w-3" /> Package Type
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["", "one-time", "short-term", "medium-term", "long-term"].map(p => (
                          <button key={p || "any"} onClick={() => setPackageTypeFilter(p === packageTypeFilter ? "" : p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              (!packageTypeFilter && !p) || packageTypeFilter === p
                                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                                : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
                            }`}
                          >{p === "" ? "Any" : p.replace("-", " ")}</button>
                        ))}
                      </div>
                    </div>

                    {/* First Session Free */}
                    <div>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        <Sparkles className="h-3 w-3" /> Offer
                      </span>
                      <button onClick={() => setFirstSessionFree(!firstSessionFree)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all w-full ${
                          firstSessionFree
                            ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                            : "bg-white/[0.02] text-slate-500 border-white/[0.05] hover:bg-white/[0.06]"
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${firstSessionFree ? "opacity-100" : "opacity-0"}`} />
                        First session free
                      </button>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      <MapPin className="h-3 w-3" /> Location (for in-person sessions)
                    </span>
                    <Input value={locationSearch} onChange={e => setLocationSearch(e.target.value)} placeholder="City, area, or clinic name..." className="h-9 rounded-lg bg-white/5 border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-violet-400/50 max-w-xs" />
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">
                    {filteredCounsellors.length} counsellor{filteredCounsellors.length !== 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-pulse">
                    <div className="h-56 bg-white/5" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                      <div className="h-3 bg-white/5 rounded w-full" />
                      <div className="h-10 bg-white/5 rounded-xl mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCounsellors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                  <Search className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-400">No counsellors match your search</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">Try adjusting your filters or using different keywords.</p>
                <Button variant="outline" size="sm" className="mt-4 text-slate-400 border-white/10" onClick={() => {
                  setSearch(""); setCategory("All"); setConcernTags([]); setGenderFilter(""); setLanguageFilter("");
                  setConsultMode(""); setAvailability(""); setPriceMin(""); setPriceMax(""); setExperienceFilter("");
                  setQualificationFilter(""); setSpecializationFilter(""); setRatingFilter(""); setVerifiedOnly(false);
                  setAgeGroupFilter(""); setPackageTypeFilter(""); setFirstSessionFree(false); setLocationSearch(""); setSortBy("popular");
                }}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCounsellors.map(c => (
                  <CounsellorCard key={c.id} counsellor={c} booking={activeBookings.get(c.id)} onView={() => navigate(`/counselling/${c.id}`)} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function CounsellorCard({ counsellor, booking, onView }) {
  const accepting = counsellor.bookingEnabled !== false;
  const languages = counsellor.languages?.length ? counsellor.languages : ["English"];
  const modes = counsellor.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "voice-call", "in-person"];
  const imgUrl = avatarUrl(counsellor.name, counsellor.profilePhotoUrl);
  const categories = (counsellor.categories || []).slice(0, 3);
  const isMentor = counsellor.counsellorType === "mentor";
  const badgeLabel = counsellor.badge || (isMentor ? "Community Mentor" : "Verified Professional");

  return (
    <div className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-violet-500/30 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5">
      {/* Photo */}
      <div className="relative h-56 bg-gradient-to-br from-violet-900/40 to-cyan-900/40 overflow-hidden">
        <img src={imgUrl} alt={counsellor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
            isMentor
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
          }`}>
            <ShieldCheck className="h-3 w-3" />
            {badgeLabel}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow-lg">{counsellor.name}</h3>
            <p className="text-sm text-slate-300 drop-shadow">{counsellor.specialization || "Mental wellness counsellor"}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${accepting ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
            <span className={`h-2 w-2 rounded-full ${accepting ? "bg-emerald-400" : "bg-rose-400"}`} />
            {accepting ? "Available" : "Paused"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Rating */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-amber-200">{Number(counsellor.rating || 4.8).toFixed(1)}</span>
          </div>
          <span className="text-slate-500">({counsellor.reviews || 0})</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 truncate">{counsellor.experience || "Verified"} exp</span>
        </div>

        {/* Bio */}
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{counsellor.bio || "Warm, practical support focused on emotional clarity and steady progress."}</p>

        {/* Tags */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map(t => (
              <span key={t} className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-500/20">{t}</span>
            ))}
          </div>
        )}

        {/* Details */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {/* Location - hide for Community Mentors */}
          {!isMentor && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{counsellor.clinicAddress ? `${counsellor.clinicAddress}${counsellor.city ? `, ${counsellor.city}` : ""}` : counsellor.location || "Online"}</span>
          )}
          {/* Clinic name - show only for professionals (Licensed Therapists) */}
          {!isMentor && counsellor.clinicName && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><Building2 className="h-3 w-3" />{counsellor.clinicName}</span>
          )}
          <span className="flex items-center gap-1"><Languages className="h-3 w-3" />{languages[0]}</span>
          {counsellor.gender && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {counsellor.gender}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">{modes.map(compactModeLabel).join(" / ")}</span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div>
            <p className="text-xs text-slate-500">Starts at</p>
            <p className="text-lg font-bold text-white">{formatRupees(lowestPrice(counsellor))}<span className="text-xs font-normal text-slate-500 ml-1">/ pkg</span></p>
          </div>
          <Button onClick={onView} className="bg-violet-500 hover:bg-violet-400 text-white rounded-xl px-5 h-10 font-medium shadow-lg shadow-violet-500/25 transition-all">
            View Profile
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CounsellorProfile({ counsellor, loading, selectedPlanId, setSelectedPlanId, recommendedPlanId, concernTags, setConcernTags, booking, onBack, onSchedule }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const selectedPlan = planFromList(counsellor, selectedPlanId);
  const planList = plansFor(counsellor);
  const languages = counsellor?.languages?.length ? counsellor.languages : ["English"];
  const categories = counsellor?.categories?.length ? counsellor.categories : selectedPlan?.bestFor || ["Stress", "Anxiety"];
  const consultationModes = counsellor?.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "voice-call", "in-person"];
  const imgUrl = avatarUrl(counsellor?.name, counsellor?.profilePhotoUrl);
  const storedUser = useMemo(() => getStoredUser(), []);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState("video-chat");
  const [availableModes, setAvailableModes] = useState(["video-chat", "chat-only", "google-meet", "voice-call", "in-person"]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", submitting: false });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Navigation />
      <main className="pt-16">
        <section className="py-10 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 via-transparent to-cyan-900/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to counsellors
            </button>

            {loading && !counsellor ? (
              <div className="text-center py-20 text-slate-500">Loading...</div>
            ) : !counsellor ? (
              <div className="text-center py-20 text-slate-500">Counsellor not found.</div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_380px] gap-8">
                <div className="space-y-6">
                  {/* Hero Card */}
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl overflow-hidden group">
                    <div className="relative h-64 md:h-80 overflow-hidden">
                      <img src={imgUrl} alt={counsellor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/40 to-transparent" />
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full backdrop-blur-sm">
                          <ShieldCheck className="h-3 w-3 mr-1" />{counsellor.badge || "Verified Professional"}
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full backdrop-blur-sm">
                          <Check className="h-3 w-3 mr-1" />Accepting bookings
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{counsellor.name}</h1>
                        <p className="text-lg text-slate-300 drop-shadow">{counsellor.specialization || "Mental wellness counsellor"}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm mb-4">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-amber-200">{avgRating.toFixed(1)}</span>
                          <span className="text-slate-500">({totalReviews})</span>
                        </span>
                        {/* Location - hide for Community Mentors */}
                        {counsellor.counsellorType !== "mentor" && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 rounded-full border border-violet-500/20">
                            <MapPin className="h-4 w-4 text-violet-400" />{counsellor.clinicAddress ? `${counsellor.clinicAddress}${counsellor.city ? `, ${counsellor.city}` : ""}` : counsellor.location || "Online"}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                          <Clock3 className="h-4 w-4 text-cyan-400" />{counsellor.responseTime || "Within 24 hours"}
                        </span>
                        {/* Clinic name - show only for professionals */}
                        {counsellor.counsellorType !== "mentor" && counsellor.clinicName && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                            <Building2 className="h-4 w-4 text-purple-400" />{counsellor.clinicName}
                          </span>
                        )}
                        {/* Clinic address - show only for professionals */}
                        {counsellor.counsellorType !== "mentor" && counsellor.clinicAddress && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <span>{counsellor.clinicAddress}{counsellor.city ? `, ${counsellor.city}` : ""}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.slice(0, 6).map(item => (
                          <span key={item} className="px-3 py-1 bg-violet-500/10 text-violet-300 rounded-full text-xs font-medium border border-violet-500/20 hover:bg-violet-500/20 transition-colors">{item}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <InfoTile icon={BriefcaseBusiness} label="Experience" value={counsellor.experience || "Verified"} gradient="from-violet-500/20 to-purple-500/20" iconColor="text-violet-300" />
                        <InfoTile icon={GraduationCap} label="Qualification" value={counsellor.education || "Verified"} gradient="from-cyan-500/20 to-blue-500/20" iconColor="text-cyan-300" />
                        <InfoTile icon={Languages} label="Languages" value={languages.join(", ")} gradient="from-emerald-500/20 to-green-500/20" iconColor="text-emerald-300" />
                      </div>
                    </div>
                  </div>

                  {/* About */}
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 items-center justify-center border border-violet-500/20">
                        <HeartHandshake className="h-5 w-5 text-violet-300" />
                      </div>
                      <h2 className="text-xl font-bold">About</h2>
                    </div>
                    <p className="text-slate-400 leading-relaxed">{counsellor.bio || "A warm, privacy-first counsellor focused on emotional support."}</p>
                  </div>

                  {/* Plans */}
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 items-center justify-center border border-cyan-500/20">
                        <CalendarDays className="h-5 w-5 text-cyan-300" />
                      </div>
                      <h2 className="text-xl font-bold">Therapy Plans</h2>
                    </div>
                    <p className="text-slate-500 text-sm mb-6">Choose a package, then schedule your sessions.</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {planList.map(plan => (
                        <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                          className={`relative text-left p-5 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 ${
                            selectedPlan?.id === plan.id ? "bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border-violet-400/40 shadow-lg shadow-violet-500/10" : "bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04]"
                          } ${recommendedPlanId === plan.id && selectedPlan?.id !== plan.id ? "ring-1 ring-emerald-400/40" : ""}`}
                        >
                          {recommendedPlanId === plan.id && selectedPlan?.id !== plan.id && (
                            <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                              <Sparkles className="h-3 w-3 text-white" />
                            </span>
                          )}
                          {selectedPlan?.id === plan.id && (
                            <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                              <Check className="h-3 w-3 text-white" />
                            </span>
                          )}
                          <h3 className="font-bold text-base mb-1">{plan.name}</h3>
                          <p className="text-xs text-slate-500 mb-3">{plan.summary}</p>
                          <p className="text-2xl font-bold mb-2">{formatRupees(planPrice(plan))}<span className="text-xs font-normal text-slate-500 ml-1">once</span></p>
                          <p className="text-xs text-slate-500">{plan.duration} • {plan.cadence}</p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {(plan.bestFor || []).slice(0, 2).map(item => (
                              <span key={item} className="px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded text-[10px]">{item}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consultation Modes */}
                  {consultationModes && (
                    <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 items-center justify-center border border-cyan-500/20">
                          <Video className="h-5 w-5 text-cyan-300" />
                        </div>
                        <h2 className="text-xl font-bold">Session Modes</h2>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {consultationModes.map(mode => (
                          <div key={mode} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center hover:border-violet-500/30 transition-all">
                            <div className="flex justify-center mb-2">
                              {mode === "google-meet" ? <Video className="h-5 w-5 text-cyan-400" /> : mode === "voice-call" ? <Phone className="h-5 w-5 text-violet-400" /> : <MapPin className="h-5 w-5 text-emerald-400" />}
                            </div>
                            <p className="text-sm font-medium text-white">{modeLabel(mode)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews */}
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 items-center justify-center border border-amber-500/20">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Reviews</h2>
                        <p className="text-sm text-slate-500">Based on {totalReviews} reviews</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-[1fr_1fr] gap-6 mb-8">
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map(star => (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-8 text-slate-400 text-right">{star}</span>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${breakdownPct[star]}%` }} />
                            </div>
                            <span className="w-8 text-slate-500 text-xs">{breakdownPct[star]}%</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                        <p className="text-5xl font-bold text-amber-200">{avgRating.toFixed(1)}</p>
                        <div className="flex gap-0.5 mt-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Overall rating</p>
                      </div>
                    </div>

                    {/* Review list */}
                    {reviewsLoading ? (
                      <p className="text-sm text-slate-500 text-center py-4">Loading reviews...</p>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-4 mb-8">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Written reviews</p>
                        {reviews.slice(0, 6).map((review) => (
                          <div key={review.id || review._id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 items-center justify-center text-xs font-bold text-violet-200">
                                  {initials(review.student?.name || review.studentName || "Anonymous")}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{review.student?.name || review.studentName || "Anonymous"}</p>
                                  <p className="text-xs text-slate-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                                </div>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(review.averageRating || review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                                ))}
                              </div>
                            </div>
                            {review.comment && <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Review form */}
                    {storedUser ? (
                      <div className="bg-gradient-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/10 rounded-xl p-5">
                        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-violet-300" />
                          Write a review
                        </p>
                        <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>
                              <Star className={`h-6 w-6 transition-all ${s <= reviewForm.rating ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-600 hover:text-slate-400"}`} />
                            </button>
                          ))}
                          <span className="text-xs text-slate-500 ml-2">{reviewForm.rating}/5</span>
                        </div>
                        <Textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                          placeholder="Share your experience with this counsellor..."
                          className="min-h-[80px] rounded-xl border-white/[0.06] bg-white/[0.02] text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 resize-none mb-3"
                        />
                        <Button
                          onClick={submitReview}
                          disabled={reviewForm.submitting || !reviewForm.comment.trim()}
                          className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-medium text-white hover:from-violet-400 hover:to-cyan-400 disabled:opacity-40 shadow-lg shadow-violet-500/20 transition-all"
                        >
                          {reviewForm.submitting ? "Submitting..." : "Submit review"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-3 border-t border-white/[0.06]">
                        <a href="/login" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Sign in</a> to leave a review
                      </p>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                    {/* Concern Tags */}
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">What brings you here?</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {["Stress", "Anxiety", "Depression", "Trauma", "Relationship", "Loneliness", "Exam pressure", "Career"].map((tag) => {
                        const active = concernTags.includes(tag);
                        return (
                          <button key={tag} type="button" onClick={() => setConcernTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                              active ? "bg-violet-500/20 text-violet-300 border-violet-400/40" : "bg-white/[0.03] text-slate-500 border-white/[0.06] hover:border-violet-500/30"
                            }`}>{tag}</button>
                        );
                      })}
                    </div>
                    {recommendedPlanId && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-300">Recommended: <span className="font-semibold">{planFromList(counsellor, recommendedPlanId)?.name}</span></p>
                      </div>
                    )}
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Selected Plan</p>
                    <h2 className="text-xl font-bold mb-1">{selectedPlan?.name}</h2>
                    <p className="text-sm text-slate-400 mb-4">{selectedPlan?.summary}</p>
                    <div className="bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 rounded-xl p-4 mb-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Package Total</p>
                      <p className="text-3xl font-bold mt-1 text-white">{formatRupees(planPrice(selectedPlan))}</p>
                      <p className="text-xs text-slate-500">one-time booking</p>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-slate-500">Duration</span><span className="font-medium">{selectedPlan?.duration || "Flexible"}</span></div>
                      <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-slate-500">Cadence</span><span className="font-medium">{selectedPlan?.cadence || "Flexible"}</span></div>
                      <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-slate-500">Mode</span><span className="font-medium">{consultationModes.map(modeLabel).join(", ")}</span></div>
                      <div className="flex justify-between py-1.5"><span className="text-slate-500">Response time</span><span className="font-medium text-emerald-400">{counsellor?.responseTime || "Within 24 hours"}</span></div>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Today's Slots</p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map(s => <span key={s} className="px-3 py-1.5 bg-white/5 rounded-full text-xs font-medium text-slate-300 hover:bg-violet-500/20 hover:text-violet-300 transition-all cursor-default">{s}</span>)}
                      </div>
                    </div>
                    {/* Consultation Mode Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Consultation Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "video-chat", label: "Video + Chat", icon: Video, desc: "Video calls + chat support between sessions" },
                          { value: "chat-only", label: "Chat Only", icon: MessageCircle, desc: "Text-based support only" },
                          { value: "google-meet", label: "Video Only", icon: Video, desc: "Video calls only" },
                          { value: "in-person", label: "Visit + Video", icon: MapPin, desc: "In-clinic + video calls" },
                          { value: "voice-call", label: "Audio Only", icon: Phone, desc: "Voice call sessions" },
                        ].map(m => (
                          <button
                            key={m.value}
                            onClick={() => setSelectedMode(m.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              selectedMode === m.value
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-200"
                                : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <m.icon className="h-4 w-4 text-purple-500" />
                              <span className="text-sm font-medium">{m.label}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (booking) { onSchedule(selectedPlan?.id); return; }
                        const { data: pkg } = await api.post("/api/packages/purchase", { counsellorId: counsellor.id, planId: selectedPlan?.id, mode: selectedMode });
                        toast({ title: "Package purchased", description: `${pkg.planName} with ${counsellor.name} is now yours!` });
                        navigate(`/session-schedule?packageId=${pkg.id}&counsellorId=${counsellor.id}&plan=${selectedPlan?.id}`);
                      }}
                      className="w-full h-12 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 transition-all"
                    >
                      {booking ? "Open schedule" : "Book counsellor"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-4 text-xs text-slate-500 leading-relaxed">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 mb-2" />
                    This platform provides emotional support and does not replace medical treatment. For emergencies, contact professional services.
                  </div>
                  {/* Report Counsellor */}
                  <div className="border-t border-white/[0.06] pt-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Report this counsellor
                    </button>
                  </div>
                </aside>
              </div>
            )}
          </div>

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">Report Counsellor</h3>
                <p className="text-sm text-slate-400 mb-4">Why are you reporting {counsellor?.name}? This will be reviewed by our admin team.</p>
                <div className="space-y-3">
                  {[
                    "Unprofessional behavior", "Inappropriate conduct", "Missed sessions",
                    "Privacy violation", "Fake credentials", "Harassment", "Other",
                  ].map(r => (
                    <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      reportReason === r ? "border-red-400/50 bg-red-500/10" : "border-white/10 hover:border-white/20"
                    }`}>
                      <input type="radio" name="reason" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-red-500" />
                      <span className="text-sm text-slate-300">{r}</span>
                    </label>
                  ))}
                  <textarea
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Additional details (optional)"
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400/50 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setShowReportModal(false); setReportReason(""); setReportDetails(""); }} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-all">
                      Cancel
                    </button>
                    <button onClick={submitReport} disabled={!reportReason || submitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 transition-all">
                      {submitting ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, gradient = "from-white/5 to-white/5", iconColor = "text-slate-400" }) {
  return (
    <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-xl p-4 hover:border-violet-500/30 transition-all duration-300">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-2">
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