import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Frown,
  Meh,
  Camera,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Clock3,
  Droplets,
  Dumbbell,
  EyeOff,
  File,
  FileText,
  Heart,
  HeartPulse,
  Image,
  LineChart as LineChartIcon,
  ListFilter,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  NotebookPen,
  Palette,
  Pencil,
  PlayCircle,
  Phone,
  Reply,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smile,
  Sparkles,
  Star,
  Sun,
  Timer,
  TrendingUp,
  Trash2,
  Users,
  Video,
  Wind,
  Zap,
  MoreVertical,
  Package,
  PackagePlus,
  RefreshCw,
  Pill,
  ClipboardList,
  CheckCircle,
  CalendarPlus,
  Stethoscope,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlowPanel from "@/mind/components/reactbits/GlowPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/mind/components/ui/avatar";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Label } from "@/mind/components/ui/label";
import { Progress } from "@/mind/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mind/components/ui/tabs";
import { Textarea } from "@/mind/components/ui/textarea";
import { useToast } from "@/mind/components/ui/use-toast";
import { Checkbox } from "@/mind/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/mind/components/ui/dialog";
import { api } from "@/mind/lib/api";
import { getRealtimeSocket } from "@/mind/lib/socket";
import { sanitizeInput } from "@/mind/lib/sanitize";

const themeOptions = [
  { id: "default", name: "Midnight Calm", color: "bg-indigo-500" },
  { id: "lavender", name: "Lavender", color: "bg-violet-300" },
  { id: "sky", name: "Sky Blue", color: "bg-sky-300" },
  { id: "mint", name: "Mint Green", color: "bg-emerald-300" },
  { id: "soft", name: "Soft White", color: "bg-zinc-100" },
];

const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse"];

const defaultNotificationPrefs = {
  session: true,
  mood: true,
  messages: true,
  payments: true,
  emergency: true,
};

const defaultPrivacyPrefs = {
  anonymousDefault: false,
  shareJournal: false,
  crisisAlerts: true,
};

const dashboardTabs = ["home", "wellness", "packages", "sessions", "schedule", "history", "prescriptions", "assignments", "journal", "settings"];

function readStoredPrefs(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function formatRupees(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function modeLabel(mode) {
  const labels = { "online": "Online", "in-person": "In-Person", "voice-call": "Voice Call", "video": "Video", "google-meet": "Google Meet", "video-chat": "Video + Chat", "chat-only": "Chat Only" };
  return labels[mode] || mode;
}

const modeOptions = [
  { id: "video-chat", label: "Video Call + Chat", icon: Video, desc: "Video sessions + chat support between sessions" },
  { id: "chat-only", label: "Chat Only", icon: MessageCircle, desc: "Text-based counselling only" },
  { id: "google-meet", label: "Video Call Only", icon: Video, desc: "Video call sessions only" },
  { id: "in-person", label: "Visit + Video Calls", icon: MapPin, desc: "In-person clinic visits + video sessions" },
  { id: "voice-call", label: "Audio Only", icon: Phone, desc: "Voice call sessions" },
];
const timeSlots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

function buildDateChoices(count = 14) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    };
  });
}

function ScheduleCard({ pkg, counsellor, toast, loadDashboard, navigate }) {
  const [booking, setBooking] = useState({ mode: "google-meet", date: "", time: "" });
  const [concern, setConcern] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dateChoices = useMemo(() => buildDateChoices(14), []);

  const lastDate = pkg.lastSessionDate ? new Date(pkg.lastSessionDate) : null;
  const minCadenceDays = pkg.minCadenceDays || 0;
  const now = new Date();
  const msSinceLast = lastDate ? now.getTime() - lastDate.getTime() : Infinity;
  const daysSinceLast = Math.floor(msSinceLast / (1000 * 60 * 60 * 24));
  const canBook = !lastDate || daysSinceLast >= minCadenceDays;
  const daysUntilNext = lastDate ? Math.max(0, minCadenceDays - daysSinceLast) : 0;
  const nextAvailable = lastDate ? new Date(lastDate.getTime() + minCadenceDays * 24 * 60 * 60 * 1000) : now;

  const initials = (name) => name?.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "MS";

  return (
    <div className="dashboard-card-motion space-y-5">
      {/* Premium header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-violet-600/10 to-cyan-600/20 border border-violet-500/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl blur-md opacity-40" />
            <Avatar className="h-16 w-16 rounded-xl ring-2 ring-violet-400/30 relative">
              <AvatarImage src={counsellor?.profilePhotoUrl} alt={pkg.counsellorName} />
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 text-lg font-bold text-white">
                {initials(pkg.counsellorName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-violet-300/70 uppercase tracking-wider font-medium mb-0.5">
              <Package className="h-3 w-3" />
              {pkg.planName}
            </div>
            <h3 className="text-xl font-bold text-white">{pkg.counsellorName}</h3>
            {counsellor?.specialization && (
              <p className="text-sm text-foreground/60 mt-0.5">{counsellor.specialization}</p>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5">
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" className="opacity-10" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#progressGrad)" strokeWidth="2" strokeDasharray={`${pkg.progress} ${100 - pkg.progress}`} strokeLinecap="round" className="transition-all duration-700" />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-300">{pkg.progress}%</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {pkg.sessionsRemaining} left
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sessions Used", value: pkg.sessionsUsed, icon: CheckCircle2, color: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5 border-blue-500/20" },
          { label: "Remaining", value: pkg.sessionsRemaining, icon: CalendarCheck, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" },
          { label: "Cadence", value: minCadenceDays > 0 ? `Every ${minCadenceDays}d` : "Flexible", icon: Clock3, color: "text-amber-400", bg: "from-amber-500/10 to-amber-500/5 border-amber-500/20" },
          { label: "Next", value: canBook ? "Available Now" : `${daysUntilNext}d left`, icon: canBook ? Sparkles : Timer, color: canBook ? "text-emerald-400" : "text-rose-400", bg: canBook ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" : "from-rose-500/10 to-rose-500/5 border-rose-500/20" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl bg-gradient-to-br ${stat.bg} border p-3.5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[11px] text-foreground/60 font-medium">{stat.label}</span>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Cadence wait banner */}
      {!canBook && lastDate && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/20 p-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 shrink-0">
              <Timer className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Cooldown Period Active</p>
              <p className="text-xs text-amber-400/70 mt-1">
                Next session unlocks in <strong className="text-amber-300">{daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}</strong>
              </p>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-amber-400/60">
                <span>Last session: {lastDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                <span className="text-amber-400/30">|</span>
                <span>Unlocks: {nextAvailable.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking form */}
      {canBook && (
        <div className="rounded-2xl border border-glass-border/20 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.01] p-5 space-y-5">
          {/* Mode selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
              <p className="text-sm font-semibold text-foreground/80">Counselling Mode</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {modeOptions.map((mode) => {
                const Icon = mode.icon;
                const active = booking.mode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBooking(prev => ({ ...prev, mode: mode.id }))}
                    className={`group relative rounded-xl border p-3 text-center transition-all duration-200 ${
                      active
                        ? "border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 shadow-lg shadow-violet-500/10 scale-105"
                        : "border-glass-border/30 bg-foreground/5 hover:border-violet-500/30 hover:bg-foreground/10 hover:-translate-y-0.5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-lg shadow-violet-500/40">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <Icon className={`h-5 w-5 mx-auto mb-1.5 transition-colors ${active ? "text-violet-300" : "text-foreground/50 group-hover:text-foreground/70"}`} />
                    <span className={`text-[11px] font-medium leading-tight block ${active ? "text-violet-200" : "text-foreground/60"}`}>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
                <p className="text-sm font-semibold text-foreground/80">Pick a Date</p>
              </div>
              <span className="text-[10px] text-foreground/40 bg-foreground/5 px-2 py-1 rounded-lg border border-glass-border/20">
                {dateChoices.length > 0 && new Date(dateChoices[0].value).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {dateChoices.map((date) => {
                const isWeekend = date.weekday === "SAT" || date.weekday === "SUN";
                const isToday = new Date().toISOString().slice(0, 10) === date.value;
                return (
                  <button
                    key={date.value}
                    type="button"
                    onClick={() => setBooking(prev => ({ ...prev, date: date.value }))}
                    className={`relative rounded-xl border py-2.5 text-center transition-all duration-200 ${
                      booking.date === date.value
                        ? "border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 shadow-lg shadow-violet-500/10 scale-105 z-10"
                        : isWeekend
                          ? "border-amber-500/15 bg-amber-500/5 hover:border-amber-400/30 text-amber-200/70"
                          : "border-glass-border/20 bg-foreground/5 hover:border-violet-500/30 hover:bg-foreground/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-50">{date.weekday}</div>
                    <div className="text-lg font-bold mt-0.5">{date.day}</div>
                    {isToday && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white shadow-lg shadow-emerald-500/30">
                        Today
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
              <p className="text-sm font-semibold text-foreground/80">Available Time</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((slot) => {
                const active = booking.time === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setBooking(prev => ({ ...prev, time: slot }))}
                    className={`relative rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "border-violet-500/50 bg-gradient-to-r from-violet-500/15 to-cyan-500/10 text-white shadow-lg shadow-violet-500/10 scale-105"
                        : "border-glass-border/20 bg-foreground/5 text-foreground/70 hover:border-violet-500/30 hover:bg-foreground/10 hover:-translate-y-0.5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <Clock3 className={`h-3.5 w-3.5 inline mr-1.5 ${active ? "text-violet-300" : "opacity-50"}`} />
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concern */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
              <p className="text-sm font-semibold text-foreground/80">Concern <span className="text-foreground/40 font-normal">(optional)</span></p>
            </div>
            <textarea
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder="e.g., Feeling anxious about exams, need help with stress management..."
              rows={2}
              className="w-full rounded-xl border border-glass-border/20 bg-foreground/5 p-3.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 resize-none transition-all duration-200"
            />
          </div>

          {/* Booking button */}
          <Button
            onClick={async () => {
              if (!booking.date || !booking.time) {
                toast({ variant: "destructive", title: "Incomplete", description: "Pick a date and time." });
                return;
              }
              setSubmitting(true);
              try {
                await api.post("/api/appointments", {
                  counsellorId: pkg.counsellorId,
                  supportPlanId: pkg.planId || pkg.planName?.toLowerCase().replace(/\s+/g, "-"),
                  mode: booking.mode,
                  date: booking.date,
                  time: booking.time,
                  concern: sanitizeInput(concern),
                  isAnonymous: false,
                  autoConfirm: true,
                  packageId: pkg.id,
                });
                setBooking({ mode: "google-meet", date: "", time: "" });
                setConcern("");
                toast({ title: "Session booked", description: `Session scheduled with ${pkg.counsellorName}. ${pkg.sessionsRemaining - 1} session${pkg.sessionsRemaining - 1 !== 1 ? "s" : ""} remaining.` });
                loadDashboard();
              } catch (error) {
                toast({ variant: "destructive", title: "Booking failed", description: error?.message || "" });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !booking.date || !booking.time}
            className="relative w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-bold text-white hover:from-violet-400 hover:to-cyan-400 disabled:opacity-40 shadow-lg shadow-violet-500/25 transition-all duration-300 overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Booking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2"><CalendarCheck className="h-5 w-5" /> Book Session <ArrowRight className="h-5 w-5" /></span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

const defaultHabits = [
  { name: "Sleep", progress: 0 },
  { name: "Meditation", progress: 0 },
  { name: "Exercise", progress: 0 },
  { name: "Hydration", progress: 0 },
];

const emptyData = {
  stats: {
    upcomingSessions: 0,
    completedSessions: 0,
    moodEntries: 0,
    latestRiskLevel: "not-started",
    moodScore: 4,
    wellnessStreak: 0,
    unreadMessages: 0,
    dailyTip: "Take a slow breath before your next task.",
  },
  appointments: [],
  moodEntries: [],
  recommendedResources: [],
  therapists: [],
  analytics: { weeklyMood: [], emotionalStability: 0, therapyProgress: 0, sleepQuality: 0 },
  journal: [],
  habits: [],
  messages: [],
  notifications: [],
  payments: { summary: "Session payments only", invoices: [] },
  packages: [],
  emergency: { sosReady: true, helpline: "1800-599-0019", contact: "Not added" },
};

const NOTIFICATION_HTTP_POLL_MS = 30000;


const UserDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const user = null;
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("mindsupport_theme") || "default");
  const [journalText, setJournalText] = useState("");
  const [journalTitle, setJournalTitle] = useState("");
  const [journalMood, setJournalMood] = useState("");
  const [journalGratitude, setJournalGratitude] = useState("");
  const [journalTrigger, setJournalTrigger] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return dashboardTabs.includes(tab) ? tab : "home";
  });
  const [sessionFilter, setSessionFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [selectedPkgId, setSelectedPkgId] = useState(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState(() => readStoredPrefs("mindsupport_notification_prefs", defaultNotificationPrefs));
  const [privacyPrefs, setPrivacyPrefs] = useState(() => readStoredPrefs("mindsupport_privacy_prefs", defaultPrivacyPrefs));
  const [quickMood, setQuickMood] = useState(3);
  const [quickMoodNote, setQuickMoodNote] = useState("");
  const [currentAffirmationIdx, setCurrentAffirmationIdx] = useState(0);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [intakeSubmitted, setIntakeSubmitted] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [assignmentFilter, setAssignmentFilter] = useState("this-week");



  const loadDashboard = useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get("/api/user/dashboard"),
      api.get("/api/assignments/my")
    ])
      .then(([{ data: dashboardData }, { data: assignmentsData }]) => {
        if (active) {
          setData({ ...emptyData, ...dashboardData });
          setAssignments(assignmentsData || []);
          setUsernameDraft((current) => current || dashboardData.profile?.username || "");
          setPhoneDraft(dashboardData.profile?.phone || "");
          setEmergencyContactName(dashboardData.profile?.emergencyContactName || "");
          setEmergencyContactPhone(dashboardData.profile?.emergencyContactPhone || "");
          setEmergencyContactRelation(dashboardData.profile?.emergencyContactRelation || "");
          setNotificationPrefs((current) => ({ ...defaultNotificationPrefs, ...current, ...(dashboardData.profile?.notificationSettings || {}) }));
        }
      })
      .catch(() => {
        if (active) setData(emptyData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadDashboard(), [loadDashboard]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const pollNotifications = async () => {
      try {
        const { data: list } = await api.get("/api/notifications/my");
        if (active && Array.isArray(list)) {
          setData((current) => ({ ...current, notifications: list }));
        }
      } catch {
        // Keep the last dashboard notifications if a background poll fails.
      }
    };
    const timer = window.setInterval(pollNotifications, NOTIFICATION_HTTP_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (dashboardTabs.includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const refresh = () => loadDashboard();
    socket.on("message:new", refresh);
    return () => {
      socket.off("message:new", refresh);
    };
  }, [loadDashboard]);

  useEffect(() => {
    api.get("/api/consent/status").then(({ data }) => setConsentAccepted(data.accepted)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.get("/api/assignments/my")
      .then(({ data }) => { if (active) setAssignments(data || []); })
      .catch(() => { if (active) setAssignments([]); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (data.packages?.length > 0) {
      data.packages.forEach(pkg => {
        api.get(`/api/intake/${pkg.id}`).then(({ data }) => {
          if (data.submitted) setIntakeSubmitted(prev => ({ ...prev, [pkg.id]: true }));
        }).catch(() => {});
      });
    }
  }, [data.packages]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mindsupport_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("mindsupport_notification_prefs", JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  useEffect(() => {
    localStorage.setItem("mindsupport_privacy_prefs", JSON.stringify(privacyPrefs));
  }, [privacyPrefs]);

  const upcoming = data.appointments.filter((item) => !["cancelled", "completed", "declined"].includes(item.status)).slice(0, 4);
  const sessionStats = useMemo(() => {
    const total = data.appointments.length;
    const upcomingCount = data.appointments.filter((a) => !["cancelled", "completed", "declined"].includes(a.status)).length;
    const completedCount = data.appointments.filter((a) => a.status === "completed").length;
    const cancelledCount = data.appointments.filter((a) => a.status === "cancelled" || a.status === "declined").length;
    return { total, upcoming: upcomingCount, completed: completedCount, cancelled: cancelledCount };
  }, [data.appointments]);
  const filteredAppointments = useMemo(() => {
    if (sessionFilter === "all") return data.appointments;
    if (sessionFilter === "upcoming") return data.appointments.filter((a) => !["cancelled", "completed", "declined"].includes(a.status));
    if (sessionFilter === "completed") return data.appointments.filter((a) => a.status === "completed");
    if (sessionFilter === "cancelled") return data.appointments.filter((a) => a.status === "cancelled" || a.status === "declined");
    return data.appointments;
  }, [data.appointments, sessionFilter]);
  const bookedCounsellorIds = useMemo(
    () =>
      new Set(
        (data.appointments || [])
          .filter((appointment) => !["cancelled", "declined"].includes(appointment.status))
          .map((appointment) => appointment.counsellorId)
          .filter(Boolean)
      ),
    [data.appointments]
  );
  const bookedTherapists = useMemo(
    () => (data.therapists || []).filter((therapist) => bookedCounsellorIds.has(therapist.id)),
    [bookedCounsellorIds, data.therapists]
  );
  const latestMood = data.moodEntries?.[0]?.mood || data.stats.moodScore || 4;
  const currentRisk = data.latestAssessment?.level || data.stats.latestRiskLevel || "not-started";
  const moodDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const labels = { 1: "Very Low", 2: "Low", 3: "Neutral", 4: "Good", 5: "Excellent" };
    const colors = { 1: "#ef4444", 2: "#f97316", 3: "#a1a1aa", 4: "#22c55e", 5: "#8b5cf6" };
    (data.moodEntries || []).forEach((entry) => {
      const mood = entry.mood || 3;
      counts[mood] = (counts[mood] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, value]) => ({ name: labels[key], value, color: colors[key] }))
      .filter((d) => d.value > 0);
  }, [data.moodEntries]);
  const radarData = useMemo(
    () => [
      { category: "Emotional", value: data.analytics.emotionalStability || 0 },
      { category: "Therapy", value: data.analytics.therapyProgress || 0 },
      { category: "Sleep", value: data.analytics.sleepQuality || 0 },
      { category: "Stress Mgmt", value: Math.max(0, 100 - (data.analytics.emotionalStability || 0)) },
    ],
    [data.analytics],
  );



  const submitJournal = async (sharedWithCounsellor = false) => {
    if (!journalText.trim()) {
      toast({ variant: "destructive", title: "Journal is empty", description: "Write a thought, trigger, or gratitude note first." });
      return;
    }
    try {
      await api.post("/api/journals", {
        title: sanitizeInput(journalTitle.trim()) || (sharedWithCounsellor ? "Shared reflection" : "Private reflection"),
        content: sanitizeInput(journalText),
        mood: journalMood || undefined,
        gratitude: sanitizeInput(journalGratitude) || undefined,
        trigger: sanitizeInput(journalTrigger) || undefined,
        sharedWithCounsellor,
      });
      toast({
        title: sharedWithCounsellor ? "Journal shared" : "Journal saved",
        description: sharedWithCounsellor ? "Your selected entry is available for counsellor review." : "Your private entry is saved securely.",
      });
      setJournalText("");
      setJournalTitle("");
      setJournalMood("");
      setJournalGratitude("");
      setJournalTrigger("");
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Journal save failed", description: error?.message || "" });
    }
  };

  const triggerSOS = async () => {
    try {
      await api.post("/api/wellness/emergency", { type: "sos", source: "user-dashboard", message: "User dashboard SOS support requested" });
      toast({
        title: "Emergency support sent",
        description: "Your booked counsellor and platform admin were notified. Call helplines if this is urgent.",
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Emergency request failed", description: error?.message || "" });
    }
  };












  const saveSecurityPreferences = async () => {
    setAccountSaving(true);
    try {
      await api.put("/api/users/me", {
        username: sanitizeInput(usernameDraft),
        phone: sanitizeInput(phoneDraft),
        emergencyContactName: sanitizeInput(emergencyContactName),
        emergencyContactPhone: sanitizeInput(emergencyContactPhone),
        emergencyContactRelation: sanitizeInput(emergencyContactRelation),
        privacySettings: {
          showOnlineStatus: !privacyPrefs.anonymousDefault,
          allowMessages: true,
          shareProgressWithCounsellor: privacyPrefs.shareJournal,
          anonymousDisplayName: privacyPrefs.anonymousDefault ? "Anonymous MindSupport user" : "",
        },
        notificationSettings: {
          session: notificationPrefs.session,
          messages: notificationPrefs.messages,
          payments: notificationPrefs.payments,
          platform: true,
          emergency: notificationPrefs.emergency,
        },
      });
      toast({ title: "Security settings saved", description: "Username, privacy, and notifications are updated." });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed", description: error?.message || "" });
    } finally {
      setAccountSaving(false);
    }
  };

  const dailyAffirmations = [
    "You are strong enough to face whatever comes your way today.",
    "Every small step forward is still progress. Be proud of yourself.",
    "Your feelings are valid. Take a moment to breathe and be kind to yourself.",
    "You have survived everything life has thrown at you so far.",
    "It's okay to not be okay. Healing is not linear.",
    "You are worthy of love, peace, and happiness.",
    "Today, choose to focus on what you can control and let go of the rest.",
  ];

  const nextAffirmation = () => {
    setCurrentAffirmationIdx((prev) => (prev + 1) % dailyAffirmations.length);
  };

  const submitQuickMood = async () => {
    try {
      await api.post("/api/wellness/mood", { mood: quickMood, note: quickMoodNote });
      toast({ title: "Mood saved", description: "Your check-in helps track your wellness journey." });
      setQuickMoodNote("");
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Mood save failed", description: error?.message || "" });
    }
  };

  const handleRefund = async (pkg) => {
    if (!confirm(`Request refund for ${pkg.planName}?\n\n${pkg.sessionsUsed}/${pkg.sessionsTotal} sessions used.\nRefund within 7 days of purchase.`)) return;
    try {
      const { data: res } = await api.post(`/api/packages/${pkg.id}/refund`);
      if (res.success) {
        toast({ title: "Refund processed", description: `₹${res.refundAmount} refunded for ${pkg.planName}` });
        loadDashboard();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Refund failed", description: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-2">
        <section className="dashboard-motion py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>

              <TabsContent value="home" className="dashboard-tab-motion space-y-6">
            <GlowPanel className="dashboard-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <Badge className="bg-primary/15 text-primary border border-primary/25">User dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3">Hi, {user?.name || "there"}</h1>
                  <p className="text-foreground/70 mt-2 max-w-2xl">
                    Book therapy, track your emotions, journal privately, and keep support close.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/mind/counselling")} className="gap-2">
                    <Video className="h-4 w-4" />
                    Find Counsellor
                  </Button>
                </div>
              </div>
            </GlowPanel>

            {!consentAccepted && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Consent Required</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Please review and accept our Privacy Policy to continue using MindSupport.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowConsent(true)}>
                      Review Privacy Policy
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="dashboard-stagger grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Metric title="Upcoming sessions" value={data.stats.upcomingSessions} icon={CalendarDays} />
              <Metric title="Mood score" value={`${data.stats.moodScore}/5`} icon={Smile} />
              <Metric title="Wellness streak" value={`${data.stats.wellnessStreak} days`} icon={HeartPulse} />
              <Metric title="Unread messages" value={data.stats.unreadMessages} icon={MessageCircle} />
              <Metric title="Daily tip" value={data.stats.dailyTip} icon={Sparkles} compact />
            </div>
                <div className="dashboard-stagger grid lg:grid-cols-3 gap-6">
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border-primary/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-primary" />
                        Wellness Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <div className="relative w-28 h-28">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--foreground))" strokeWidth="6" opacity={0.08} />
                            <circle
                              cx="60" cy="60" r="52" fill="none"
                              stroke="url(#scoreGrad)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={`${(Math.round(
                                ((data.analytics.emotionalStability || 0) +
                                  (data.analytics.therapyProgress || 0) +
                                  (data.analytics.sleepQuality || 0)) / 3
                              ) / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                              className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" />
                                <stop offset="100%" stopColor="hsl(var(--secondary))" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                {Math.round(
                                  ((data.analytics.emotionalStability || 0) +
                                    (data.analytics.therapyProgress || 0) +
                                    (data.analytics.sleepQuality || 0)) / 3
                                )}
                              </div>
                              <div className="text-[10px] text-foreground/50 font-medium">%</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-foreground/70">Overall wellness</div>
                          <div className="flex items-center gap-2 text-sm text-emerald-500">
                            <TrendingUp className="h-4 w-4" />
                            <span>Based on your recent activity</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border-primary/15 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Smile className="h-5 w-5 text-primary" />
                        Mood Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of your mood entries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        {moodDistribution.every((d) => d.value === 0) ? (
                          <div className="flex items-center justify-center h-full text-sm text-foreground/50">No mood data yet</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                {moodDistribution.map((entry, idx) => (
                                  <radialGradient key={idx} id={`moodGrad${idx}`} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                                    <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                                  </radialGradient>
                                ))}
                              </defs>
                              <Pie
                                data={moodDistribution}
                                cx="50%" cy="50%"
                                innerRadius={38}
                                outerRadius={72}
                                paddingAngle={4}
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={1200}
                                animationEasing="ease-out"
                              >
                                {moodDistribution.map((entry, idx) => (
                                  <Cell key={idx} fill={`url(#moodGrad${idx})`} stroke={entry.color} strokeWidth={1} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                                formatter={(value, name) => [`${value} entries`, name]}
                              />
                              <Legend
                                iconType="circle"
                                formatter={(value, entry) => {
                                  const item = moodDistribution.find(d => d.name === value);
                                  return <span className="text-xs text-foreground/70">{value} {item ? `(${Math.round(item.value / moodDistribution.reduce((a,b) => a + b.value, 0) * 100)}%)` : ''}</span>;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-secondary/[0.04] to-secondary/[0.01] border-secondary/15 overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl -ml-8 -mb-8 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-secondary" />
                        Weekly Mood Trend
                      </CardTitle>
                      <CardDescription>Your mood, sleep & anxiety this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={data.analytics.weeklyMood?.slice(-7) || []} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barGap={4} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={{ opacity: 0.3 }} />
                            <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={{ opacity: 0.3 }} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              cursor={{ fill: "hsl(var(--foreground))", opacity: 0.05 }}
                            />
                            <Legend iconType="circle" formatter={(value) => <span className="text-xs text-foreground/70">{value}</span>} />
                            <defs>
                              <linearGradient id="moodBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              </linearGradient>
                              <linearGradient id="sleepBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                              </linearGradient>
                              <linearGradient id="anxietyBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                              </linearGradient>
                            </defs>
                            <Bar dataKey="mood" name="Mood" radius={[4, 4, 0, 0]} fill="url(#moodBarGrad)" animationDuration={1000} animationEasing="ease-out" />
                            <Bar dataKey="sleep" name="Sleep" radius={[4, 4, 0, 0]} fill="url(#sleepBarGrad)" animationDuration={1200} animationEasing="ease-out" />
                            <Bar dataKey="anxiety" name="Anxiety" radius={[4, 4, 0, 0]} fill="url(#anxietyBarGrad)" animationDuration={1400} animationEasing="ease-out" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border-primary/15 overflow-hidden relative">
                    <div className="absolute bottom-0 right-0 w-36 h-36 bg-primary/5 rounded-full blur-3xl -mr-12 -mb-12 pointer-events-none" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Therapy Booking Overview
                      </CardTitle>
                      <CardDescription>{loading ? "Loading your care plan..." : "Upcoming, reschedule-ready, and Meet-enabled sessions"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {upcoming.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <CalendarDays className="h-12 w-12 text-foreground/20 mb-3" />
                          <PanelText>No upcoming sessions yet. Book a confidential online or offline appointment.</PanelText>
                          <Button size="sm" className="mt-4" onClick={() => navigate("/mind/counselling")}>Browse Counsellors</Button>
                        </div>
                      ) : (
                        upcoming.map((appointment) => (
                          <div key={appointment.id} className="dashboard-card-motion rounded-xl border border-glass-border/40 bg-background/60 p-4 hover:bg-background/80 hover:border-primary/20 transition-all duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                                  <Video className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-semibold">{appointment.counsellorName}{appointment.counsellor?.clinicName && <span className="text-xs text-slate-400"> at {appointment.counsellor.clinicName}</span>}</div>
                                  <div className="text-sm text-foreground/70 flex items-center gap-1.5 mt-0.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {appointment.date} at {appointment.time}
                                  </div>
                                  <div className="text-xs text-foreground/50 mt-1 capitalize flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${appointment.mode === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {appointment.mode}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:shrink-0">
                                <Badge variant="secondary" className="capitalize">{appointment.status}</Badge>
                                {appointment.meetingLink && (
                                  <Button asChild size="sm" variant="outline" className="gap-1.5 border-primary/25 hover:bg-primary/10">
                                    <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                                      <Video className="h-3.5 w-3.5" />
                                      Join
                                    </a>
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/mind/counselling")}>
                                  Reschedule
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-secondary/[0.04] to-accent/[0.03] border-secondary/15 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-secondary" />
                        Personal Analytics
                      </CardTitle>
                      <CardDescription>Mood, stability, therapy progress, and sleep</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-foreground/80 font-medium">Emotional stability</span>
                            <span className="font-semibold text-primary">{data.analytics.emotionalStability || 0}%</span>
                          </div>
                          <div className="h-2.5 bg-foreground/8 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000 ease-out"
                              style={{ width: `${data.analytics.emotionalStability || 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-foreground/80 font-medium">Therapy progress</span>
                            <span className="font-semibold text-secondary">{data.analytics.therapyProgress || 0}%</span>
                          </div>
                          <div className="h-2.5 bg-foreground/8 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-secondary/60 to-secondary transition-all duration-1000 ease-out"
                              style={{ width: `${data.analytics.therapyProgress || 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-foreground/80 font-medium">Sleep quality</span>
                            <span className="font-semibold text-emerald-500">{data.analytics.sleepQuality || 0}%</span>
                          </div>
                          <div className="h-2.5 bg-foreground/8 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-500 transition-all duration-1000 ease-out"
                              style={{ width: `${data.analytics.sleepQuality || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="h-52 rounded-2xl bg-background/40 border border-glass-border/30 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="hsl(var(--border))" opacity={0.25} />
                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                            <Radar name="Wellness" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#radarFill)" fillOpacity={0.3} animationDuration={1200} animationEasing="ease-out" />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              formatter={(value) => [`${value}%`, "Score"]}
                            />
                            <defs>
                              <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.15} />
                              </linearGradient>
                            </defs>
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid lg:grid-cols-2 gap-6">
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.03] border-amber-500/15 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <NotebookPen className="h-5 w-5 text-amber-500" />
                        Recent Journal Entries
                      </CardTitle>
                      <CardDescription>Your latest thoughts and reflections</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.journal.length === 0 ? (
                        <PanelText>No journal entries yet. Start writing your thoughts.</PanelText>
                      ) : (
                        data.journal.slice(0, 3).map((entry, idx) => (
                          <div key={entry.id || idx} className="dashboard-card-motion rounded-xl border border-glass-border/40 bg-background/60 p-4 hover:bg-background/80 transition-all duration-200">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium truncate flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                {entry.title || "Journal entry"}
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0 bg-amber-500/10 border-amber-500/20 text-amber-600">{entry.mood ? `${entry.mood}/5` : ""}</Badge>
                            </div>
                            <p className="text-sm text-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">{entry.text || entry.content || ""}</p>
                            <div className="text-xs text-foreground/40 mt-2 flex items-center gap-2">
                              <CalendarDays className="h-3 w-3" />
                              {entry.date || entry.createdAt || ""}
                            </div>
                          </div>
                        ))
                      )}
                      {data.journal.length > 3 && (
                        <Button variant="ghost" size="sm" className="w-full text-amber-600 hover:text-amber-500 hover:bg-amber-500/10" onClick={() => setActiveTab("journal")}>
                          View all {data.journal.length} entries &rarr;
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/20 overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Daily Wellness Boost
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-5 rounded-xl bg-background/60 border border-glass-border/40 text-center">
                        <p className="text-base font-medium italic text-foreground/80 leading-relaxed">
                          &ldquo;{dailyAffirmations[currentAffirmationIdx]}&rdquo;
                        </p>
                        <Button variant="ghost" size="sm" onClick={nextAffirmation} className="mt-3 text-xs text-foreground/50">
                          <Sparkles className="h-3 w-3 mr-1" />
                          New affirmation
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setActiveTab("wellness")} variant="outline" className="flex-1 gap-2">
                          <Activity className="h-4 w-4" />
                          Full Dashboard
                        </Button>
                        <Button onClick={() => navigate("/mind/counselling")} variant="default" className="flex-1 gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Book Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </TabsContent>

              <TabsContent value="wellness" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card className="dashboard-card-motion glass-card md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border-primary/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <HeartPulse className="h-5 w-5 text-primary" />
                        Wellness Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-4">
                        <div className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {Math.round(
                            ((data.analytics.emotionalStability || 0) +
                              (data.analytics.therapyProgress || 0) +
                              (data.analytics.sleepQuality || 0)) /
                              3,
                          )}
                          %
                        </div>
                        <div className="text-sm text-foreground/70 mb-2">Overall wellness</div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500">
                        <TrendingUp className="h-4 w-4" />
                        <span>Based on your recent activity</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid lg:grid-cols-4 gap-6">
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Smile className="h-4 w-4 text-primary" />
                        Mood Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of your mood entries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        {moodDistribution.every((d) => d.value === 0) ? (
                          <div className="flex items-center justify-center h-full text-sm text-foreground/50">No mood data yet</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={moodDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                                {moodDistribution.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                              <Legend iconType="circle" formatter={(value) => <span className="text-xs text-foreground/70">{value}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Brain className="h-4 w-4 text-primary" />
                        Wellness Balance
                      </CardTitle>
                      <CardDescription>Multi-dimensional wellness view</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="hsl(var(--border))" opacity={0.4} />
                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                            <Radar name="Wellness" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-secondary/[0.04] to-emerald-500/[0.03] border-secondary/15 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-secondary" />
                        Habit Progress
                      </CardTitle>
                      <CardDescription>Daily habit completion rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(data.habits.length > 0 ? data.habits : defaultHabits).map((habit, idx) => {
                          const colors = [
                            { bg: "from-violet-500/60 to-violet-500", track: "bg-violet-500/10", text: "text-violet-500", icon: "🌙" },
                            { bg: "from-blue-500/60 to-blue-500", track: "bg-blue-500/10", text: "text-blue-500", icon: "🧘" },
                            { bg: "from-emerald-500/60 to-emerald-500", track: "bg-emerald-500/10", text: "text-emerald-500", icon: "🏃" },
                            { bg: "from-cyan-500/60 to-cyan-500", track: "bg-cyan-500/10", text: "text-cyan-500", icon: "💧" },
                          ];
                          const c = colors[idx % colors.length];
                          return (
                            <div key={habit.name} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{c.icon}</span>
                                  <span className="font-medium text-foreground/80">{habit.name}</span>
                                </div>
                                <span className={`text-xs font-semibold ${c.text}`}>{habit.progress || 0}%</span>
                              </div>
                              <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}>
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${c.bg} transition-all duration-1000 ease-out`}
                                  style={{ width: `${habit.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-5 rounded-xl bg-background/50 border border-glass-border/30 p-3">
                        <div className="flex items-center justify-between text-xs text-foreground/60">
                          <span>Average completion</span>
                          <span className="font-semibold text-foreground/80">
                            {Math.round(
                              ((data.habits.length > 0 ? data.habits : defaultHabits).reduce((sum, h) => sum + (h.progress || 0), 0)) /
                                ((data.habits.length > 0 ? data.habits : defaultHabits).length || 1)
                            )}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-foreground/8 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-emerald-500 transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.round(
                                ((data.habits.length > 0 ? data.habits : defaultHabits).reduce((sum, h) => sum + (h.progress || 0), 0)) /
                                  ((data.habits.length > 0 ? data.habits : defaultHabits).length || 1)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="h-4 w-4 text-violet-500" />
                        Assignments
                      </CardTitle>
                      <CardDescription>Counsellor tasks & progress</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AssignmentStats assignments={assignments} filter={assignmentFilter} onFilterChange={setAssignmentFilter} />
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid lg:grid-cols-2 gap-6">
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Sun className="h-4 w-4 text-amber-500" />
                        How are you feeling right now?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setQuickMood(level)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                              quickMood === level
                                ? "bg-primary/20 scale-110 ring-2 ring-primary/30"
                                : "hover:bg-muted/50 hover:scale-105"
                            }`}
                          >
                            {level <= 1 ? (
                              <Frown className={`h-7 w-7 ${quickMood === level ? "text-destructive" : "text-muted-foreground"}`} />
                            ) : level === 2 ? (
                              <Meh className={`h-7 w-7 ${quickMood === level ? "text-orange-400" : "text-muted-foreground"}`} />
                            ) : level === 3 ? (
                              <Meh className={`h-7 w-7 ${quickMood === level ? "text-yellow-400" : "text-muted-foreground"}`} />
                            ) : level === 4 ? (
                              <Smile className={`h-7 w-7 ${quickMood === level ? "text-emerald-400" : "text-muted-foreground"}`} />
                            ) : (
                              <Heart className={`h-7 w-7 ${quickMood === level ? "text-primary" : "text-muted-foreground"}`} />
                            )}
                            <span className={`text-[10px] font-medium ${quickMood === level ? "text-foreground" : "text-foreground/50"}`}>
                              {["Awful", "Low", "Okay", "Good", "Great"][level - 1]}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a quick note..."
                          value={quickMoodNote}
                          onChange={(e) => setQuickMoodNote(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={submitQuickMood} className="shrink-0">
                          Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/20 overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Daily Wellness Boost
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-5 rounded-xl bg-background/60 border border-glass-border/40 text-center">
                        <p className="text-base font-medium italic text-foreground/80 leading-relaxed">
                          &ldquo;{dailyAffirmations[currentAffirmationIdx]}&rdquo;
                        </p>
                        <Button variant="ghost" size="sm" onClick={nextAffirmation} className="mt-3 text-xs text-foreground/50">
                          <Sparkles className="h-3 w-3 mr-1" />
                          New affirmation
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => navigate("/mind/wellness")} variant="outline" className="flex-1 gap-2">
                          <Activity className="h-4 w-4" />
                          Full Dashboard
                        </Button>
                        <Button onClick={() => navigate("/mind/wellness?tab=dashboard")} variant="default" className="flex-1 gap-2">
                          <Wind className="h-4 w-4" />
                          Breathing Exercise
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="dashboard-tab-motion space-y-6">
                {data.packages?.length > 0 ? (
                  <div className="dashboard-motion space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        My Packages
                      </h2>
                      <Button variant="outline" size="sm" onClick={() => navigate("/mind/counselling")} className="gap-1.5">
                        <PackagePlus className="h-4 w-4" /> New Package
                      </Button>
                    </div>
                    <div className="dashboard-stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {(data.packages || []).filter(p => p.status === "active" && p.sessionsRemaining > 0).map((pkg) => (
                        <Card key={pkg.id} className="dashboard-card-motion glass-card bg-gradient-to-br from-violet-500/5 via-violet-500/3 to-cyan-500/5 border-violet-500/20 overflow-hidden relative group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-sm font-semibold">{pkg.planName} {pkg.mode && pkg.mode !== "google-meet" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                                    {modeLabel(pkg.mode)}
                                  </span>
                                )}</CardTitle>
                                <CardDescription className="text-xs">{pkg.counsellorName}</CardDescription>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                {pkg.sessionsUsed}/{pkg.sessionsTotal} used
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-foreground/60">
                                <span>Progress</span>
                                <span>{pkg.progress}%</span>
                              </div>
                              <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pkg.progress}%` }} />
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-foreground/60">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {pkg.sessionsRemaining} session{pkg.sessionsRemaining !== 1 ? "s" : ""} left
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {pkg.expiryDate ? new Date(pkg.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Cancellations within 24hr of session: session consumed. Refund available for unused sessions within 7 days of purchase.
                            </p>
                            <Button
                              size="sm"
                              className="w-full gap-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white shadow-lg shadow-violet-500/20"
                              onClick={() => {
                                if (!intakeSubmitted[pkg.id]) navigate(`/mind/intake/${pkg.id}`);
                                else navigate(`/mind/session-schedule?packageId=${pkg.id}&counsellorId=${pkg.counsellorId}&plan=${pkg.planId}`);
                              }}
                            >
                              <CalendarCheck className="h-4 w-4" />
                              {intakeSubmitted[pkg.id] ? "Book Session" : "Complete Intake First"}
                            </Button>
                            {pkg.sessionsRemaining > 0 && (
                              <Button size="sm" variant="outline" className="mt-2 w-full text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" onClick={() => handleRefund(pkg)}>
                                Request Refund
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {(data.packages || []).filter(p => p.status === "completed" || p.status === "expired" || p.sessionsRemaining <= 0).length > 0 && (
                      <div className="dashboard-motion space-y-2 pt-2">
                        <h3 className="text-sm font-medium text-foreground/60 flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Past Packages
                        </h3>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {(data.packages || []).filter(p => p.status === "completed" || p.status === "expired" || p.sessionsRemaining <= 0).map((pkg) => (
                            <Card key={pkg.id} className="glass-card bg-background/40 border-glass-border/30 opacity-70 hover:opacity-100 transition-opacity">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-sm font-semibold">{pkg.planName}</p>
                                    <p className="text-[11px] text-foreground/50">{pkg.counsellorName}</p>
                                  </div>
                                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                                    pkg.status === "completed" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                    "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}>{pkg.status}</Badge>
                                </div>
                                <p className="text-xs text-foreground/50 mb-3">{pkg.sessionsUsed}/{pkg.sessionsTotal} sessions completed</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => navigate(`/mind/counselling/${pkg.counsellorId}`)}>
                                    <RefreshCw className="h-3 w-3" /> Renew
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => navigate("/mind/counselling")}>
                                    <TrendingUp className="h-3 w-3" /> Upgrade
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="dashboard-motion text-center py-12">
                    <Package className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground/60">No Packages Yet</h3>
                    <p className="text-sm text-foreground/40 mt-1 mb-4">Purchase a counselling package to get started</p>
                    <Button onClick={() => navigate("/mind/counselling")} className="gap-2">
                      <PackagePlus className="h-4 w-4" /> Browse Packages
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid md:grid-cols-4 gap-4">
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardContent className="p-4 text-center">
                      <CalendarDays className="h-6 w-6 text-primary mx-auto mb-1" />
                      <div className="text-2xl font-bold">{sessionStats.upcoming}</div>
                      <div className="text-xs text-foreground/60">Upcoming</div>
                    </CardContent>
                  </Card>
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold">{sessionStats.completed}</div>
                      <div className="text-xs text-foreground/60">Completed</div>
                    </CardContent>
                  </Card>
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold">{sessionStats.total}</div>
                      <div className="text-xs text-foreground/60">Total</div>
                    </CardContent>
                  </Card>
                  <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-pink-500/10 border-rose-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <CardContent className="p-4 text-center">
                      <CalendarX className="h-6 w-6 text-rose-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold">{sessionStats.cancelled}</div>
                      <div className="text-xs text-foreground/60">Cancelled</div>
                    </CardContent>
                  </Card>
                </div>

                {/* === UPCOMING BOOKINGS === */}
                <Card className="dashboard-card-motion glass-card bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border-primary/15 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      Upcoming Bookings
                    </CardTitle>
                    <CardDescription>Scheduled sessions — join, reschedule, or cancel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredAppointments.filter(a => !["cancelled", "completed", "declined", "no-show"].includes(a.status)).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <CalendarDays className="h-10 w-10 text-foreground/20 mb-3" />
                        <p className="text-foreground/60 font-medium">No upcoming bookings</p>
                        <p className="text-sm text-foreground/40 mt-1">Purchase a package or book a session.</p>
                        <Button size="sm" className="mt-4 gap-2" onClick={() => navigate("/mind/counselling")}>
                          <CalendarDays className="h-4 w-4" /> Book a Session
                        </Button>
                      </div>
                    ) : (
                      filteredAppointments.filter(a => !["cancelled", "completed", "declined", "no-show"].includes(a.status)).map((appointment) => {
                        const modeIcons = { "online": Video, "google-meet": Video, "voice-call": Phone, "in-person": MapPin };
                        const ModeIcon = modeIcons[appointment.mode] || Video;
                        return (
                          <div key={appointment.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4 hover:bg-background/80 hover:border-primary/20 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                                <ModeIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm">{appointment.counsellorName}{appointment.counsellor?.clinicName && <span className="text-xs text-slate-400"> at {appointment.counsellor.clinicName}</span>}</span>
                                  <Badge className={`text-[10px] capitalize border ${
                                    appointment.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" :
                                    "bg-amber-500/15 text-amber-600 border-amber-500/20"
                                  }`}>{appointment.status}</Badge>
                                  {appointment.packageId && (
                                    <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-400 border-violet-500/30">Pkg</Badge>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/70">
                                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{appointment.date}</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{appointment.time}</span>
                                  <span className="flex items-center gap-1 capitalize text-xs">{appointment.mode === "google-meet" ? "Online" : appointment.mode}</span>
                                </div>
                                {appointment.concern && (
                                  <p className="mt-1 text-xs text-foreground/55 line-clamp-1">{appointment.concern}</p>
                                )}
                                {appointment.crisisFlag && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-500/80 bg-rose-500/10 rounded-lg px-2 py-1">
                                    <Siren className="h-3 w-3" />
                                    <span>Crisis keywords detected — support resources shared</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0">
                                {appointment.meetingLink && (
                                  <Button asChild size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/20">
                                    <a href={appointment.meetingLink} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5" /> Join</a>
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="gap-1 border-primary/25" onClick={() => navigate(`/mind/session-schedule?counsellorId=${appointment.counsellorId}&packageId=${appointment.packageId || ""}&plan=${appointment.supportPlanId || "short-term"}`)}>
                                  <CalendarDays className="h-3.5 w-3.5" /> Reschedule
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

              </TabsContent>

              <TabsContent value="schedule" className="dashboard-tab-motion space-y-6">
                {(() => {
                  const activePackages = (data.packages || []).filter(p => p.status === "active" && p.sessionsRemaining > 0);
                  if (activePackages.length === 0) {
                    return (
                      <div className="dashboard-motion text-center py-12">
                        <CalendarClock className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-foreground/60">No Active Packages</h3>
                        <p className="text-sm text-foreground/40 mt-1 mb-4">Purchase a package to start scheduling sessions</p>
                        <Button onClick={() => navigate("/mind/counselling")} className="gap-2">
                          <CalendarDays className="h-4 w-4" /> Browse Packages
                        </Button>
                      </div>
                    );
                  }
                  const selected = selectedPkgId ? activePackages.find(p => p.id === selectedPkgId) : activePackages[0];
                  return (
                    <>
                      <div className="dashboard-motion">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-primary" />
                            Schedule Session
                          </h2>
                          <span className="text-xs text-foreground/50">{activePackages.length} active package{activePackages.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                          {activePackages.map((pkg) => {
                            const isSelected = (selected?.id === pkg.id);
                            const counsellor = (data.therapists || []).find(t => t.id === pkg.counsellorId);
                            return (
                              <button
                                key={pkg.id}
                                type="button"
                                onClick={() => setSelectedPkgId(pkg.id)}
                                className={`relative shrink-0 rounded-2xl border p-4 text-left transition-all duration-300 min-w-[220px] ${
                                  isSelected
                                    ? "border-violet-500/50 bg-gradient-to-br from-violet-500/15 via-violet-500/8 to-cyan-500/10 shadow-lg shadow-violet-500/15 scale-[1.02]"
                                    : "border-glass-border/20 bg-foreground/5 hover:border-violet-500/30 hover:bg-foreground/10"
                                }`}
                              >
                                {isSelected && (
                                  <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-lg shadow-violet-500/40">
                                    <Check className="h-3 w-3 text-white" />
                                  </span>
                                )}
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 rounded-lg ring-2 ring-violet-500/20">
                                    <AvatarImage src={counsellor?.profilePhotoUrl} alt={pkg.counsellorName} />
                                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-xs font-bold text-violet-200">
                                      {(pkg.counsellorName || "MS").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "MS"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{pkg.planName}</p>
                                    <p className="text-xs text-foreground/60 truncate">{pkg.counsellorName}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs">
                                  <span className="text-emerald-400 font-medium">{pkg.sessionsRemaining} left</span>
                                  <span className="text-foreground/50">{pkg.sessionsUsed}/{pkg.sessionsTotal}</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pkg.progress}%` }} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {selected && (
                        <ScheduleCard key={selected.id} pkg={selected} counsellor={(data.therapists || []).find(t => t.id === selected.counsellorId)} toast={toast} loadDashboard={loadDashboard} navigate={navigate} />
                      )}
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="history" className="dashboard-tab-motion space-y-6">
                {(() => {
                  const historyStatuses = ["completed", "cancelled", "declined", "no-show"];
                  const allHistory = data.appointments.filter(a => historyStatuses.includes(a.status));
                  const completed = data.appointments.filter(a => a.status === "completed");
                  const cancelled = data.appointments.filter(a => a.status === "cancelled" || a.status === "declined");
                  const noShow = data.appointments.filter(a => a.status === "no-show");
                  const filteredHistory = historyFilter === "all" ? allHistory
                    : historyFilter === "cancelled" ? cancelled
                    : historyFilter === "noshow" ? noShow
                    : completed;
                  return (<Card className="dashboard-card-motion glass-card bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.01] border-glass-border/30 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-foreground/3 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    {/* Filter stat buttons */}
                    <div className="grid grid-cols-4 gap-0.5 mx-px mt-px rounded-t-2xl overflow-hidden border-b border-glass-border/20">
                      {[
                        { key: "all", label: "Total", count: allHistory.length, color: "from-primary/10 to-primary/5 text-primary", icon: Archive },
                        { key: "completed", label: "Completed", count: completed.length, color: "from-emerald-500/15 to-emerald-500/5 text-emerald-500", icon: CheckCircle2 },
                        { key: "cancelled", label: "Cancelled", count: cancelled.length, color: "from-rose-500/15 to-rose-500/5 text-rose-500", icon: CalendarX },
                        { key: "noshow", label: "No Show", count: noShow.length, color: "from-amber-500/15 to-amber-500/5 text-amber-500", icon: Clock },
                      ].map((s) => (
                        <button key={s.key} type="button" onClick={() => setHistoryFilter(s.key)}
                          className={`flex flex-col items-center gap-0.5 py-3 px-1 transition-all duration-200 ${
                            historyFilter === s.key ? "bg-gradient-to-b " + s.color + " shadow-inner" : "bg-background/40 hover:bg-background/60"
                          }`}>
                          <s.icon className="h-3.5 w-3.5" />
                          <span className="text-xs font-bold">{s.count}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-60 whitespace-nowrap">{s.label}</span>
                        </button>
                      ))}
                    </div>

                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Archive className="h-4 w-4 text-foreground/60" />
                          Session History
                        </CardTitle>
                        <CardDescription className="text-xs">{filteredHistory.length} session{filteredHistory.length !== 1 ? "s" : ""}</CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 max-h-[380px] overflow-y-auto pr-1 chat-scrollbar">
                      {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
                            {historyFilter === "completed" ? <CheckCircle2 className="h-7 w-7 text-foreground/25" />
                              : historyFilter === "noshow" ? <Clock className="h-7 w-7 text-foreground/25" />
                              : <CalendarX className="h-7 w-7 text-foreground/25" />}
                          </div>
                          <p className="text-foreground/50 font-semibold">
                            {historyFilter === "all" ? "No past sessions yet"
                              : historyFilter === "completed" ? "No completed sessions"
                              : historyFilter === "noshow" ? "No no-show sessions"
                              : "No cancelled sessions"}
                          </p>
                          <p className="text-sm text-foreground/40 mt-1 max-w-xs">
                            {historyFilter === "all"
                              ? "Book a session with a counsellor to get started."
                              : `You have no ${historyFilter === "noshow" ? "no-show" : historyFilter} sessions recorded.`}
                          </p>
                        </div>
                      ) : (
                        filteredHistory.map((appointment) => {
                          const modeIcons = { "online": Video, "google-meet": Video, "voice-call": Phone, "in-person": MapPin };
                          const ModeIcon = modeIcons[appointment.mode] || Video;
                          const statusConfig = {
                            completed: { icon: CheckCircle2, color: "emerald", gradient: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/25", badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
                            cancelled: { icon: CalendarX, color: "rose", gradient: "from-rose-500/20 to-rose-500/5 border-rose-500/25", badge: "bg-rose-500/15 text-rose-600 border-rose-500/20" },
                            declined: { icon: CalendarX, color: "rose", gradient: "from-rose-500/20 to-rose-500/5 border-rose-500/25", badge: "bg-rose-500/15 text-rose-600 border-rose-500/20" },
                            "no-show": { icon: Clock, color: "amber", gradient: "from-amber-500/20 to-amber-500/5 border-amber-500/25", badge: "bg-amber-500/15 text-amber-600 border-amber-500/20" },
                          };
                          const cfg = statusConfig[appointment.status] || statusConfig.completed;
                          const StatusIcon = cfg.icon;
                          const iconWrapClass = appointment.status === "completed" ? "bg-emerald-500/20" : appointment.status === "no-show" ? "bg-amber-500/20" : "bg-rose-500/20";
                          const iconColorClass = appointment.status === "completed" ? "text-emerald-500" : appointment.status === "no-show" ? "text-amber-500" : "text-rose-500";
                          return (<div key={appointment.id} className={`group rounded-2xl border bg-gradient-to-br ${cfg.gradient} p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
                              <div className="flex items-start gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>
                                  <ModeIcon className={`h-4 w-4 ${iconColorClass}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold leading-tight">{appointment.counsellorName}{appointment.counsellor?.clinicName && <span className="text-xs text-foreground/50"> &middot; {appointment.counsellor.clinicName}</span>}</span>
                                    <Badge className={`text-[10px] capitalize border ${cfg.badge}`}>
                                      <StatusIcon className="h-3 w-3 mr-0.5" />
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground/50">
                                    <CalendarDays className="h-3 w-3" />
                                    <span>{appointment.date} at {appointment.time}</span>
                                    <span className="text-foreground/30">&middot;</span>
                                    <span className="capitalize">{appointment.mode === "google-meet" ? "Online" : appointment.mode}</span>
                                  </div>
                                </div>
                              </div>
                            </div>);
                        })
                      )}
                    </CardContent>
                  </Card>);
                })()}
              </TabsContent>


              <TabsContent value="journal" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/[0.03]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
                    <CardHeader className="relative">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 ring-1 ring-primary/20">
                          <NotebookPen className="h-5 w-5 text-primary" />
                        </span>
                        <div>
                          <CardTitle className="text-xl">Private Journal</CardTitle>
                          <CardDescription>Write daily thoughts, gratitude notes, and emotional triggers without clutter.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-5">
                      <div className="grid md:grid-cols-[1fr_200px] gap-3">
                        <div className="relative">
                          <Pencil className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input 
                            value={journalTitle} 
                            onChange={(event) => setJournalTitle(event.target.value)} 
                            placeholder="Give your entry a title..." 
                            className="pl-9 border-primary/20 bg-background/60 focus:border-primary/50 transition-all"
                          />
                        </div>
                        <Select value={journalMood} onValueChange={setJournalMood}>
                          <SelectTrigger className="border-primary/20 bg-background/60 focus:border-primary/50">
                            <SelectValue placeholder="How are you?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Calm">
                              <span className="flex items-center gap-2">😌 Calm</span>
                            </SelectItem>
                            <SelectItem value="Hopeful">
                              <span className="flex items-center gap-2">🌟 Hopeful</span>
                            </SelectItem>
                            <SelectItem value="Stressed">
                              <span className="flex items-center gap-2">😰 Stressed</span>
                            </SelectItem>
                            <SelectItem value="Low">
                              <span className="flex items-center gap-2">😔 Low</span>
                            </SelectItem>
                            <SelectItem value="Grateful">
                              <span className="flex items-center gap-2">🙏 Grateful</span>
                            </SelectItem>
                            <SelectItem value="Anxious">
                              <span className="flex items-center gap-2">😟 Anxious</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="relative">
                        <div className="absolute top-3 left-3 text-foreground/30 text-lg leading-none pointer-events-none select-none">✍️</div>
                        <Textarea 
                          rows={7} 
                          value={journalText} 
                          onChange={(event) => setJournalText(event.target.value)} 
                          placeholder="What happened today? What's on your mind? Let it flow..."
                          className="pl-10 border-primary/20 bg-background/60 focus:border-primary/50 transition-all resize-none"
                        />
                      </div>

                      <div className="dashboard-stagger grid md:grid-cols-2 gap-3">
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">🙏</span>
                          <Input 
                            value={journalGratitude} 
                            onChange={(event) => setJournalGratitude(event.target.value)} 
                            placeholder="One thing you're grateful for..." 
                            className="pl-10 border-primary/20 bg-background/60 focus:border-primary/50 transition-all group-focus-within:border-primary/50"
                          />
                        </div>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">🔍</span>
                          <Input 
                            value={journalTrigger} 
                            onChange={(event) => setJournalTrigger(event.target.value)} 
                            placeholder="Any trigger or pattern noticed?" 
                            className="pl-10 border-primary/20 bg-background/60 focus:border-primary/50 transition-all group-focus-within:border-primary/50"
                          />
                        </div>
                      </div>

                      {privacyPrefs.crisisAlerts && emergencyKeywords.some((keyword) => `${journalText} ${journalTrigger}`.toLowerCase().includes(keyword)) && (
                        <div className="rounded-xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 p-4 text-sm text-red-400 animate-pulse">
                          <div className="flex items-center gap-2 font-semibold mb-1">
                            <Siren className="h-4 w-4" />
                            Support is available
                          </div>
                          Call 1800-599-0019, 988 where available, or local emergency services.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button 
                          onClick={() => submitJournal(false)} 
                          className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/20"
                        >
                          <Lock className="h-4 w-4" />
                          Save Private Entry
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => submitJournal(true)}
                          className="gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Share with Counsellor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/95 to-secondary/[0.03]">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none" />
                    <CardHeader className="relative">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/20 to-accent/20 ring-1 ring-secondary/20">
                          <BookOpen className="h-5 w-5 text-secondary" />
                        </span>
                        <div>
                          <CardTitle className="text-xl">Recent Entries</CardTitle>
                          <CardDescription>Your latest private and shared reflections.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-3">
                      {data.journal.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
                            <NotebookPen className="h-8 w-8 text-primary/40" />
                          </div>
                          <p className="text-foreground/60 font-medium">No entries yet</p>
                          <p className="text-sm text-foreground/40 mt-1 max-w-xs">Start with one honest sentence. Your thoughts are safe here.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 chat-scrollbar">
                          {data.journal.map((entry, idx) => {
                            const moodEmojis = { Calm: "😌", Hopeful: "🌟", Stressed: "😰", Low: "😔", Grateful: "🙏", Anxious: "😟" };
                            const moodColors = { Calm: "bg-blue-500/20 text-blue-400", Hopeful: "bg-amber-500/20 text-amber-400", Stressed: "bg-red-500/20 text-red-400", Low: "bg-purple-500/20 text-purple-400", Grateful: "bg-emerald-500/20 text-emerald-400", Anxious: "bg-orange-500/20 text-orange-400" };
                            return (
                              <div 
                                key={entry.id} 
                                className="group relative rounded-xl border border-glass-border/30 bg-background/40 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-background/60 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                                style={{ animationDelay: `${idx * 60}ms` }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm truncate">{entry.title || "Untitled Reflection"}</span>
                                      {entry.mood && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${moodColors[entry.mood] || "bg-foreground/10 text-foreground/60"}`}>
                                          {moodEmojis[entry.mood] || ""} {entry.mood}
                                        </span>
                                      )}
                                    </div>
                                    {entry.createdAt && (
                                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-foreground/40">
                                        <CalendarDays className="h-3 w-3" />
                                        {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        <span className="text-foreground/20">•</span>
                                        {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    )}
                                  </div>
                                  <Badge 
                                    variant="secondary" 
                                    className={`shrink-0 text-[10px] border ${
                                      entry.shared 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : "bg-foreground/5 text-foreground/50 border-foreground/10"
                                    }`}
                                  >
                                    {entry.shared ? (
                                      <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Shared</span>
                                    ) : (
                                      <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                                    )}
                                  </Badge>
                                </div>
                                {entry.excerpt && (
                                  <p className="text-sm text-foreground/60 mt-2 line-clamp-2 leading-relaxed">{entry.excerpt}</p>
                                )}
                                {entry.gratitude && (
                                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/70">
                                    <span>🙏</span>
                                    <span className="truncate">{entry.gratitude}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="dashboard-tab-motion space-y-6">

                <div className="dashboard-stagger grid lg:grid-cols-[1fr_0.8fr] gap-6">
                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Palette className="h-4 w-4 text-primary" />
                        </span>
                        <span>Theme Settings</span>
                      </CardTitle>
                      <CardDescription>Choose a calm, safe, emotionally comforting dashboard theme.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {themeOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setTheme(option.id)}
                            className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-300 ${
                              theme === option.id
                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                                : "border-glass-border/40 bg-background/60 hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            {theme === option.id && (
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                                ✓
                              </span>
                            )}
                            <div className={`mx-auto mb-3 h-10 w-10 rounded-full ${option.color} border-2 border-white/20 shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                              <div className={`h-full w-full rounded-full ${option.color} opacity-60 blur-sm`} />
                            </div>
                            <span className={`block text-center text-xs font-medium transition-colors ${theme === option.id ? "text-primary" : "text-foreground/80"}`}>
                              {option.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Lock className="h-4 w-4 text-primary" />
                      </span>
                      <span>Account Security & Username</span>
                    </CardTitle>
                    <CardDescription>Use a username for safer login and keep your counselling identity private when needed.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs text-primary">@</span>
                          Secure username
                        </div>
                        <Input
                          id="secure-username"
                          value={usernameDraft}
                          onChange={(event) => setUsernameDraft(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="mindsupport_user"
                          className="mt-2"
                        />
                        <p className="text-xs text-foreground/60">3-24 lowercase letters, numbers, or underscores. Sign in with email or username.</p>
                      </div>
                      <div className="space-y-2 rounded-xl border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs text-primary">📱</span>
                          Account phone
                        </div>
                        <Input id="account-phone" value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} placeholder="+91 90000 00000" className="mt-2" />
                        <p className="text-xs text-foreground/60">Used for OTP and urgent support follow-up.</p>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          Privacy status
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm">
                            <span className="text-foreground/70">Anonymous default</span>
                            <span className={`font-medium ${privacyPrefs.anonymousDefault ? "text-emerald-500" : "text-foreground/50"}`}>{privacyPrefs.anonymousDefault ? "On" : "Off"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm">
                            <span className="text-foreground/70">Journal sharing</span>
                            <span className={`font-medium ${privacyPrefs.shareJournal ? "text-emerald-500" : "text-foreground/50"}`}>{privacyPrefs.shareJournal ? "Share allowed" : "Private"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm">
                            <span className="text-foreground/70">Emergency keyword support</span>
                            <span className={`font-medium ${privacyPrefs.crisisAlerts ? "text-emerald-500" : "text-foreground/50"}`}>{privacyPrefs.crisisAlerts ? "On" : "Off"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-emergency/25 bg-emergency/5 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emergency/10 text-xs">
                            <Siren className="h-3.5 w-3.5 text-emergency" />
                          </span>
                          Emergency contact
                        </div>
                        <div className="grid gap-3">
                          <Input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} placeholder="Contact name" />
                          <Input value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} placeholder="Contact phone" />
                          <Input value={emergencyContactRelation} onChange={(event) => setEmergencyContactRelation(event.target.value)} placeholder="Relation, e.g. Parent, Friend" />
                        </div>
                      </div>
                    </div>

                    <Button className="w-full lg:w-auto gap-2" onClick={saveSecurityPreferences} disabled={accountSaving}>
                      {accountSaving ? (
                        <>Saving...</>
                      ) : (
                        <><ShieldCheck className="h-4 w-4" /> Save security preferences</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="dashboard-stagger grid lg:grid-cols-2 gap-6">
                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Bell className="h-4 w-4 text-primary" />
                        </span>
                        <span>Notification Preferences</span>
                      </CardTitle>
                      <CardDescription>Control reminders without leaving the dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PreferenceToggle icon={CalendarClock} title="Session reminders" text="Appointment reminders and Google Meet alerts." checked={notificationPrefs.session} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, session: !prev.session }))} />
                      <PreferenceToggle icon={HeartPulse} title="Mood check-ins" text="Daily wellness tracking prompts." checked={notificationPrefs.mood} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, mood: !prev.mood }))} />
                      <PreferenceToggle icon={MessageCircle} title="Counsellor messages" text="Replies and follow-up chat notifications." checked={notificationPrefs.messages} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, messages: !prev.messages }))} />
                      <PreferenceToggle icon={Siren} title="Emergency SOS alerts" text="SOS confirmations and urgent support updates." checked={notificationPrefs.emergency} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, emergency: !prev.emergency }))} />
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion relative overflow-hidden border-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Settings className="h-4 w-4 text-primary" />
                        </span>
                        <span>Privacy & Safety</span>
                      </CardTitle>
                      <CardDescription>Choose how your support experience behaves by default.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PreferenceToggle icon={EyeOff} title="Anonymous session default" text="Use nickname-first identity when booking sessions." checked={privacyPrefs.anonymousDefault} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, anonymousDefault: !prev.anonymousDefault }))} />
                      <PreferenceToggle icon={NotebookPen} title="Share journal with counsellor" text="Make sharing explicit before entries are visible." checked={privacyPrefs.shareJournal} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, shareJournal: !prev.shareJournal }))} />
                      <PreferenceToggle icon={ShieldCheck} title="Emergency keyword alerts" text="Show urgent support options when crisis words appear." checked={privacyPrefs.crisisAlerts} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, crisisAlerts: !prev.crisisAlerts }))} />
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid md:grid-cols-3 gap-4">
                  <FeatureTile icon={Lock} title="Security" text="JWT authentication, role-based access, and login tracking are enabled." />
                  <FeatureTile icon={Bell} title="Notifications" text="Session reminders, mood checks, and counsellor messages." />
                  <FeatureTile icon={Shield} title="Privacy" text="Journal and session data remain private unless you choose to share." />
                </div>
              </TabsContent>

              <TabsContent value="prescriptions" className="dashboard-tab-motion space-y-6">
                <PrescriptionsTab />
              </TabsContent>

              <TabsContent value="assignments" className="dashboard-tab-motion space-y-6">
                <AssignmentsTab />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <ConsentDialog open={showConsent} onOpenChange={setShowConsent} onAccept={() => setConsentAccepted(true)} />
    </div>
  );
};

function Metric({ title, value, icon: Icon, compact = false }) {
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="dashboard-icon-float h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={compact ? "text-sm font-medium leading-snug" : "text-2xl font-bold capitalize"}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-foreground/75">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} className="dashboard-progress" />
    </div>
  );
}

function PanelText({ children }) {
  return <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function FeatureTile({ icon: Icon, title, text }) {
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardContent className="p-4">
        <Icon className="dashboard-icon-float h-5 w-5 text-primary mb-3" />
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-foreground/70 mt-1">{text}</p>
      </CardContent>
    </Card>
  );
}

function ResourceTile({ icon: Icon, title, text }) {
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="dashboard-icon-float h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/70">{text}</CardContent>
    </Card>
  );
}

function ActionCard({ title, text, action, onClick }) {
  return (
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-foreground/70 mt-1 min-h-10">{text}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function Tracker({ label, value, icon: Icon }) {
  return (
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4 text-center">
      {Icon && (
        <span className="flex justify-center mb-2">
          <Icon className="h-5 w-5 text-primary" />
        </span>
      )}
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

function SessionCard({ appointment, onBook, onChat }) {
  const isOnline = ["online", "google-meet"].includes(appointment.mode);

  return (
    <div className="dashboard-card-motion rounded-xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">{appointment.counsellorName || "Counsellor"}</div>
            <Badge variant="secondary" className="capitalize">{appointment.status}</Badge>
            {isOnline && <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/20">Google Meet</Badge>}
          </div>
          <div className="mt-2 text-sm text-foreground/70">
            {appointment.date} at {appointment.time} - {appointment.mode || "online"} session
          </div>
          {appointment.reason && <div className="mt-1 text-xs text-foreground/55">{appointment.reason}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {appointment.meetingLink && (
            <Button asChild size="sm" className="gap-2">
              <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                <Video className="h-4 w-4" />
                Join same Meet
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onBook}>
            Reschedule
          </Button>
          <Button size="sm" variant="outline" onClick={onChat}>
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniHabit({ icon: Icon, label }) {
  return (
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-3 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-foreground/60">Track daily</div>
      </div>
    </div>
  );
}











function PreferenceToggle({ icon: Icon, title, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="dashboard-card-motion flex w-full items-center justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40 hover:bg-primary/[0.02] group"
    >
      <span className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4 text-foreground/60 group-hover:text-primary transition-colors" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-foreground/60">{text}</span>
        </span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ${checked ? "bg-primary shadow-sm shadow-primary/30" : "bg-foreground/20"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function ConsentDialog({ open, onOpenChange, onAccept }) {
  const { toast } = useToast();
  const [accepted, setAccepted] = useState({ dataPrivacy: false, terms: false, confidentiality: false, emergency: false });
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!accepted.dataPrivacy || !accepted.terms) {
      toast({ title: "Required", description: "You must accept the Privacy Policy and Terms", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: res } = await api.post("/api/consent/submit", {
        dataPrivacyAccepted: accepted.dataPrivacy, termsAccepted: accepted.terms, confidentialityAccepted: accepted.confidentiality, emergencyProtocolAccepted: accepted.emergency,
      });
      if (res.success) {
        toast({ title: "Consent recorded", description: "Thank you for accepting our policies" });
        onAccept();
        onOpenChange(false);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit consent", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-purple-500" /> Data Privacy & Consent</DialogTitle>
          <DialogDescription>
            Please review and accept the following to continue using MindSupport. Your privacy is protected under the DPDP Act, 2023.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { key: "dataPrivacy", label: "I agree to the Privacy Policy and data handling practices as per DPDP Act, 2023" },
            { key: "terms", label: "I agree to the Terms of Service and code of conduct" },
            { key: "confidentiality", label: "I understand that session notes are encrypted and confidential between me and my counsellor" },
            { key: "emergency", label: "I understand that in case of crisis detection, emergency protocols may be activated" },
          ].map(item => (
            <label key={item.key} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <Checkbox
                checked={accepted[item.key]}
                onCheckedChange={(v) => setAccepted(prev => ({ ...prev, [item.key]: !!v }))}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAccept} disabled={submitting}>
            {submitting ? "Submitting..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/api/prescriptions/my")
      .then(({ data }) => { if (active) setPrescriptions(data || []); })
      .catch(() => { if (active) setPrescriptions([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="text-center py-12 text-foreground/60">Loading prescriptions...</div>;

  if (prescriptions.length === 0) {
    return (
      <Card className="dashboard-card-motion glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Stethoscope className="h-16 w-16 text-foreground/20" />
          <h3 className="text-lg font-semibold">No Prescriptions Yet</h3>
          <p className="text-sm text-foreground/60 text-center max-w-md">
            Your counsellor will share prescriptions here after your sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dashboard-stagger space-y-4">
      {prescriptions.map((p) => (
        <Card key={p.id} className="dashboard-card-motion glass-card overflow-hidden border-primary/10">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Pill className="h-5 w-5 text-primary" />
                  Prescription
                </CardTitle>
                <CardDescription>
                  {p.counsellorName ? `Dr. ${p.counsellorName}` : "Counsellor"}
                  {p.clinicName ? ` — ${p.clinicName}` : ""}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {new Date(p.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {p.diagnosis && (
              <div>
                <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Diagnosis</span>
                <p className="text-sm mt-1">{p.diagnosis}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Medicines</span>
              <div className="mt-2 divide-y divide-border/50 rounded-xl border border-border/50 overflow-hidden">
                {p.medicines.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-background/40">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Pill className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60">
                        {m.dosage && <span>Dosage: {m.dosage}</span>}
                        {m.frequency && <span>Frequency: {m.frequency}</span>}
                        {m.duration && <span>Duration: {m.duration}</span>}
                      </div>
                      {m.notes && <p className="mt-1 text-xs text-foreground/50 italic">{m.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {p.notes && (
              <div>
                <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Notes</span>
                <p className="text-sm mt-1 text-foreground/70">{p.notes}</p>
              </div>
            )}
            {p.followUpDate && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <CalendarPlus className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Follow-up: {new Date(p.followUpDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/api/assignments/my")
      .then(({ data }) => { if (active) setAssignments(data || []); })
      .catch(() => { if (active) setAssignments([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.patch(`/api/assignments/${id}/complete`);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "completed", completedAt: new Date().toISOString() } : a
        )
      );
    } catch {
      // ignore
    }
  };

  if (loading) return <div className="text-center py-12 text-foreground/60">Loading assignments...</div>;

  if (assignments.length === 0) {
    return (
      <Card className="dashboard-card-motion glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <ClipboardList className="h-16 w-16 text-foreground/20" />
          <h3 className="text-lg font-semibold">No Assignments Yet</h3>
          <p className="text-sm text-foreground/60 text-center max-w-md">
            Your counsellor will assign tasks and exercises here to help between sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dashboard-stagger space-y-3">
      {assignments.map((a) => (
        <Card key={a.id} className={`dashboard-card-motion glass-card overflow-hidden transition-all duration-300 ${
          a.status === "completed" ? "border-emerald-500/20 opacity-70" : "border-primary/10"
        }`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => a.status === "pending" && handleComplete(a.id)}
                disabled={a.status === "completed"}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  a.status === "completed"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-foreground/30 hover:border-primary hover:bg-primary/10 cursor-pointer"
                }`}
              >
                {a.status === "completed" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className={`text-sm font-semibold ${a.status === "completed" ? "line-through text-foreground/50" : ""}`}>
                    {a.title}
                  </h4>
                  <Badge variant="outline" className={`text-[10px] ${
                    a.category === "exercise" ? "border-orange-300 text-orange-600" :
                    a.category === "journal" ? "border-purple-300 text-purple-600" :
                    a.category === "reading" ? "border-blue-300 text-blue-600" :
                    a.category === "practice" ? "border-green-300 text-green-600" :
                    "border-gray-300 text-gray-600"
                  }`}>
                    {a.category}
                  </Badge>
                </div>
                {a.description && (
                  <p className={`mt-1 text-sm ${a.status === "completed" ? "text-foreground/40" : "text-foreground/70"}`}>
                    {a.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                  {a.counsellorName && <span>by {a.counsellorName}</span>}
                  {a.dueDate && (
                    <span className={`flex items-center gap-1 ${
                      new Date(a.dueDate) < new Date() && a.status === "pending"
                        ? "text-red-400"
                        : ""
                    }`}>
                      <CalendarDays className="h-3 w-3" />
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {a.completedAt && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle className="h-3 w-3" />
                      Done: {new Date(a.completedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-foreground/30">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssignmentStats({ assignments, filter, onFilterChange }) {
  const filterOptions = [
    { id: "today", label: "Today" },
    { id: "this-week", label: "This Week" },
    { id: "this-month", label: "This Month" },
  ];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getFilterStart = () => {
    if (filter === "today") return startOfDay;
    if (filter === "this-week") return startOfWeek;
    return startOfMonth;
  };

  const filtered = assignments.filter((a) => {
    const d = new Date(a.createdAt);
    return d >= getFilterStart();
  });

  const total = filtered.length;
  const completed = filtered.filter((a) => a.status === "completed").length;
  const pending = total - completed;
  const pctDone = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onFilterChange(opt.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === opt.id
                ? "bg-violet-500/20 text-violet-500 border border-violet-500/30"
                : "text-foreground/60 hover:text-foreground/80 hover:bg-background/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-4 text-sm text-foreground/50">No assignments this {filter.replace("this-", "")}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-3">
              <div className="text-2xl font-bold text-violet-500">{total}</div>
              <div className="text-[10px] text-foreground/60 mt-0.5">Total</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-3">
              <div className="text-2xl font-bold text-emerald-500">{completed}</div>
              <div className="text-[10px] text-foreground/60 mt-0.5">Done</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-3">
              <div className="text-2xl font-bold text-amber-500">{pending}</div>
              <div className="text-[10px] text-foreground/60 mt-0.5">Pending</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground/60">Progress</span>
              <span className="font-semibold text-violet-500">{pctDone}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-violet-500/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-violet-500 transition-all duration-1000 ease-out"
                style={{ width: `${pctDone}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {filtered.filter((a) => a.status === "pending").slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-background/40 border border-glass-border/20 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs font-medium truncate">{a.title}</span>
                {a.dueDate && <span className="ml-auto text-[10px] text-foreground/40 shrink-0">{new Date(a.dueDate).toLocaleDateString()}</span>}
              </div>
            ))}
            {filtered.filter((a) => a.status === "pending").length > 3 && (
              <div className="text-center text-[10px] text-foreground/40">
                +{filtered.filter((a) => a.status === "pending").length - 3} more pending
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default UserDashboard;
