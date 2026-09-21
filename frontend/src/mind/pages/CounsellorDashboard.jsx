import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Camera,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  File,
  FileText,
  Heart,
  History,
  Image,
  IndianRupee,
  Link as LinkIcon,
  Lock,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Package,
  Palette,
  Paperclip,
  Pencil,
  PieChart,
  Plus,
  PlusCircle,
  Power,
  Reply,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Headphones,
  Smile,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Video,
  Volume2,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlowPanel from "@/mind/components/reactbits/GlowPanel";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Progress } from "@/mind/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mind/components/ui/tabs";
import { Textarea } from "@/mind/components/ui/textarea";
import { useToast } from "@/mind/components/ui/use-toast";
import { api } from "@/mind/lib/api";
import { getRealtimeSocket } from "@/mind/lib/socket";
import { setCounsellorEarningsFromDashboard, selectCounsellorEarnings, selectRevenueTransactions, selectRevenueMonthlyTrends } from "@/mind/store/revenueSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";

const fallback = {
  profile: {},
  stats: {
    todaySessions: 0,
    pendingRequests: 0,
    activeClients: 0,
    googleMeetReady: false,
    earnings: 0,
    pendingPayouts: 0,
    rating: 0,
    unreadMessages: 0,
  },
  appointments: [],
  patients: [],
  progress: [],
  messages: [],
  earnings: { total: 0, sessionRevenue: 0, platformFees: 0, pendingPayouts: 0, platformCommissionRate: 2, monthly: [], transactions: [] },
  reviews: [],
  notifications: [],
  actions: [],
};

const NOTIFICATION_HTTP_POLL_MS = 30000;


const noteTemplates = [
  "Client appeared stable. Continued grounding practice and daily mood tracking recommended.",
  "Discussed stress triggers, sleep routine, and one small action before next session.",
  "Reviewed safety plan, support contacts, and escalation steps if risk increases.",
  "Created weekly wellness task: breathing practice, hydration, and journaling check-in.",
];

const statusTone = {
  upcoming: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  declined: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};


const defaultPrivacySettings = {
  showOnlineStatus: true,
  allowMessages: true,
  shareProgressWithCounsellor: true,
  anonymousDisplayName: "",
};

const defaultNotificationSettings = {
  session: true,
  messages: true,
  payments: true,
  platform: true,
  emergency: true,
};

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const packagePricePlans = [
  {
    key: "oneTime",
    title: "One-Time Session",
    detail: "Single counselling session",
    hint: "Immediate support, one-off guidance",
    fallback: 599,
  },
  {
    key: "shortTerm",
    title: "Short-Term Support",
    detail: "4-8 sessions, every two days",
    hint: "Stress, anxiety, exams, loneliness",
    fallback: 1499,
  },
  {
    key: "mediumTerm",
    title: "Medium-Term Support",
    detail: "8-15 sessions, weekly or bi-weekly",
    hint: "Mild depression, relationships, healing",
    fallback: 2499,
  },
  {
    key: "longTerm",
    title: "Long-Term Therapy",
    detail: "3-6+ months, weekly or bi-weekly",
    hint: "Trauma, severe anxiety, chronic depression",
    fallback: 3999,
  },
];

const defaultPackagePrices = packagePricePlans.reduce((acc, plan) => ({ ...acc, [plan.key]: String(plan.fallback) }), {});

function newAvailabilityRow(day = "Monday", start = "10:00", end = "16:00") {
  return { id: `${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`, day, start, end };
}

function parseAvailabilityRows(items = []) {
  if (!items.length) return [newAvailabilityRow("Monday", "10:00", "16:00")];
  return items.map((item, index) => {
    const text = String(item || "");
    const match = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*:?\s*(\d{1,2}:?\d{0,2})\s*(?:-|–|to)\s*(\d{1,2}:?\d{0,2})/i);
    const dayMap = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    const normalizeTime = (value, fallback) => {
      const raw = String(value || "").replace(/[^0-9:]/g, "");
      if (!raw) return fallback;
      if (raw.includes(":")) return raw.length === 4 ? `0${raw}` : raw;
      return `${raw.padStart(2, "0")}:00`;
    };
    if (!match) return newAvailabilityRow(dayOptions[index % dayOptions.length], "10:00", "16:00");
    const key = match[1].slice(0, 3).toLowerCase();
    return {
      id: `${index}-${text}`,
      day: dayMap[key] || match[1],
      start: normalizeTime(match[2], "10:00"),
      end: normalizeTime(match[3], "16:00"),
    };
  });
}

function serializeAvailabilityRows(rows = []) {
  return rows
    .filter((row) => row.day && row.start && row.end)
    .map((row) => `${row.day}: ${row.start}-${row.end}`);
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizePackagePrices(profile = {}) {
  const source = profile.supportPlanPrices || {};
  const basePrice = Number(profile.sessionPricing) || 0;
  return packagePricePlans.reduce((acc, plan) => {
    const saved = Number(source[plan.key]);
    const multiplier = plan.key === "oneTime" ? 1 : plan.key === "shortTerm" ? 3 : plan.key === "mediumTerm" ? 5 : 8;
    const fallback = saved || (basePrice ? Math.round((basePrice * multiplier) / 50) * 50 - 1 : plan.fallback);
    acc[plan.key] = String(saved > 0 ? saved : fallback || plan.fallback);
    return acc;
  }, {});
}

function fallbackBaseSessionPrice(profile = {}) {
  return Number(profile.sessionPricing) || (profile.counsellorType === "mentor" ? 299 : 599);
}

function counsellorPayout(value, commissionRate = 20) {
  return Math.max(0, Math.round(Number(value || 0) * ((100 - Number(commissionRate || 20)) / 100)));
}

function sessionStatusLabel(status = "") {
  if (["pending", "confirmed"].includes(status)) return "Upcoming";
  if (status === "completed") return "Completed";
  if (["cancelled", "declined"].includes(status)) return "Cancelled";
  return status || "Upcoming";
}

function counsellingModeLabel(mode = "") {
  const labels = {
    "google-meet": "Google Meet",
    "voice-call": "Voice Call",
    "in-person": "In-person",
    online: "Google Meet",
  };
  return labels[mode] || mode || "Google Meet";
}

const modeLabel = (v) => ({ "video-chat": "Video+Chat", "chat-only": "Chat Only", "google-meet": "Video", "in-person": "Visit+Video", "voice-call": "Voice" })[v] || v || "Meet";

function initials(name = "MS") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}



function normalizeNotification(item) {
  if (typeof item === "string") return { title: item.split(":")[0] || "Notice", message: item.split(":").slice(1).join(":").trim() || item };
  return item || { title: "Notice", message: "" };
}

const CounsellorDashboard = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const counsellorEarnings = useAppSelector(selectCounsellorEarnings);
  const revenueTransactions = useAppSelector(selectRevenueTransactions);
  const revenueMonthly = useAppSelector(selectRevenueMonthlyTrends);
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [availabilityRows, setAvailabilityRows] = useState(() => parseAvailabilityRows([]));
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [unavailableDateDraft, setUnavailableDateDraft] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [meetLink, setMeetLink] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [patientRiskFilter, setPatientRiskFilter] = useState("all");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    specialization: "",
    location: "",
    clinicName: "",
    clinicAddress: "",
    city: "",
    education: "",
    responseTime: "",
    bio: "",
    profilePhotoUrl: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [packagePrices, setPackagePrices] = useState(defaultPackagePrices);
  const [baseSessionPrice, setBaseSessionPrice] = useState("");
  const [privacySettings, setPrivacySettings] = useState(defaultPrivacySettings);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const [theme, setTheme] = useState(() => localStorage.getItem("mindsupport_counsellor_theme") || "default");
  const [customPackages, setCustomPackages] = useState([]);

const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result } = await api.get("/api/counsellor/dashboard");
      const next = { ...fallback, ...result };
      setData(next);
      dispatch(setCounsellorEarningsFromDashboard({ earnings: result.earnings, stats: result.stats }));
      setAvailabilityRows(parseAvailabilityRows(next.profile?.availability || []));
      setUnavailableDates(next.profile?.unavailableDates || []);
      setBookingEnabled(next.profile?.bookingEnabled !== false);
      setMeetLink(next.profile?.meetLink || "");
      setUsernameDraft(next.profile?.username || "");
      setProfileDraft({
        specialization: next.profile?.specialization || "",
        location: next.profile?.location || "",
        clinicName: next.profile?.clinicName || "",
        clinicAddress: next.profile?.clinicAddress || "",
        city: next.profile?.city || "",
        education: next.profile?.education || "",
        responseTime: next.profile?.responseTime || "",
        bio: next.profile?.bio || "",
        profilePhotoUrl: next.profile?.profilePhotoUrl || "",
      });
      setBaseSessionPrice(String(fallbackBaseSessionPrice(next.profile)));
      setPackagePrices(normalizePackagePrices(next.profile));
      setCustomPackages(next.profile?.customPackages || []);
      setPrivacySettings({ ...defaultPrivacySettings, ...(next.profile?.privacySettings || {}) });
      setNotificationSettings({ ...defaultNotificationSettings, ...(next.profile?.notificationSettings || {}) });
      setSelectedPatientId((current) => current || next.patients?.[0]?.id || "");
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load dashboard", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [dispatch, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const pollNotifications = async () => {
      try {
        const { data: list } = await api.get("/api/notifications/my");
        if (active && Array.isArray(list)) {
          setData((current) => ({ ...current, notifications: list }));
        }
      } catch {
        // Keep the latest dashboard notifications if a background poll fails.
      }
    };
    const timer = window.setInterval(pollNotifications, NOTIFICATION_HTTP_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const refresh = () => {
      void load();
    };
    socket.on("message:new", refresh);
    return () => {
      socket.off("message:new", refresh);
    };
  }, [load]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mindsupport_counsellor_theme", theme);
  }, [theme]);

  const appointments = useMemo(() => data.appointments || [], [data.appointments]);
  const patients = useMemo(() => data.patients || [], [data.patients]);
  const today = todayYMD();

  const pending = appointments.filter((item) => item.status === "pending");
  const activeSessions = appointments.filter((item) => ["pending", "confirmed"].includes(item.status));
  const completedSessions = appointments.filter((item) => item.status === "completed");
  const todaySessions = appointments.filter((item) => item.date === today && ["pending", "confirmed"].includes(item.status));
  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((item) => ["pending", "confirmed"].includes(item.status))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [appointments]
  );
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || patients[0];

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const statusOk = sessionFilter === "all" || appointment.status === sessionFilter;
      const text = `${appointment.studentName} ${appointment.studentEmail} ${appointment.concern} ${appointment.date} ${appointment.time}`.toLowerCase();
      return statusOk && (!query || text.includes(query));
    });
  }, [appointments, sessionFilter, sessionSearch]);

  const selectedPatientSessions = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter(
      (appointment) =>
        appointment.studentEmail === selectedPatient.email ||
        appointment.studentName === selectedPatient.name ||
        appointment.studentId === selectedPatient.id
    );
  }, [appointments, selectedPatient]);



  const averageAttendance = appointments.length ? Math.round((completedSessions.length / appointments.length) * 100) : 0;
  const reviewScore = Number(data.stats.rating || 0).toFixed(1);

  const updateAppointment = async (appointmentId, payload, successTitle = "Session updated") => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, payload);
      toast({ title: successTitle });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const createMeet = async (appointmentId, sharedLink = "") => {
    try {
      await api.post("/api/meet/create", { appointmentId, meetingLink: sharedLink });
      toast({ title: "Shared Google Meet ready", description: "User Join and counsellor Open Meet now use the same room." });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Meet link failed", description: error?.message || "" });
    }
  };

  const uploadProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be 5 MB or smaller." });
      return;
    }
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const { data: result } = await api.post("/api/upload/image", { image: dataUrl, folder: "profiles" });
      const url = result?.url || result?.secureUrl || "";
      if (!url) throw new Error("Upload returned no URL");
      setProfileDraft((prev) => ({ ...prev, profilePhotoUrl: url }));
      toast({ title: "Photo uploaded", description: "Save your profile to apply the change." });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: error?.message || "Could not upload photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfileTools = async () => {
    const cleanedBasePrice = Number(baseSessionPrice);
    try {
      await Promise.all([
        api.put("/api/users/me", {
          username: usernameDraft.trim(),
          ...profileDraft,
          ...(Number.isFinite(cleanedBasePrice) && cleanedBasePrice > 0 ? { sessionPricing: cleanedBasePrice, supportPlanPrices: packagePricePlans.reduce((acc, plan) => ({ ...acc, [plan.key]: Number(packagePrices[plan.key]) }), {}) } : {}),
          privacySettings,
          notificationSettings,
        }),
        api.put("/api/counsellor/availability", {
          availability: serializeAvailabilityRows(availabilityRows),
          unavailableDates,
          bookingEnabled,
          meetLink: meetLink.trim(),
          privacySettings,
          notificationSettings,
        }),
      ]);
      toast({ title: "Profile tools updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };






  const updateDraft = (appointmentId, key, value) => {
    setSessionDrafts((current) => ({
      ...current,
      [appointmentId]: {
        ...current[appointmentId],
        [key]: value,
      },
    }));
  };


  const updateAvailabilityRow = (id, key, value) => {
    setAvailabilityRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addAvailabilityRow = () => {
    setAvailabilityRows((current) => [...current, newAvailabilityRow(dayOptions[current.length % dayOptions.length], "10:00", "16:00")]);
  };

  const removeAvailabilityRow = (id) => {
    setAvailabilityRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const addUnavailableDate = () => {
    if (!unavailableDateDraft || unavailableDates.includes(unavailableDateDraft)) return;
    setUnavailableDates((current) => [...current, unavailableDateDraft].sort());
    setUnavailableDateDraft("");
  };

  const removeUnavailableDate = (date) => {
    setUnavailableDates((current) => current.filter((item) => item !== date));
  };

  const addCustomPackage = () => {
    setCustomPackages((current) => [
      ...current,
      {
        id: `pkg-${Date.now()}`,
        name: "",
        summary: "",
        duration: "",
        cadence: "",
        bestFor: [],
        price: 0,
        sessionCount: 1,
        theme: "default",
        isActive: true,
      },
    ]);
  };

  const updateCustomPackage = (id, key, value) => {
    setCustomPackages((current) => current.map((pkg) => (pkg.id === id ? { ...pkg, [key]: value } : pkg)));
  };

  const deleteCustomPackage = (id) => {
    setCustomPackages((current) => current.filter((pkg) => pkg.id !== id));
  };

  const saveCustomPackages = async () => {
    try {
      const cleaned = customPackages.map((pkg) => ({
        ...pkg,
        name: pkg.name.trim(),
        price: Number(pkg.price) || 0,
        sessionCount: Math.max(1, Number(pkg.sessionCount) || 1),
      }));
      await api.put("/api/counsellor/packages", { packages: cleaned });
      toast({ title: "Packages saved", description: "Your custom packages are live on your profile." });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to save packages", description: error?.message || "" });
    }
  };

  const rescheduleAppointment = async (appointment) => {
    const draft = sessionDrafts[appointment.id] || {};
    if (!draft.date && !draft.time) {
      toast({ variant: "destructive", title: "Choose a new date or time" });
      return;
    }
    await updateAppointment(
      appointment.id,
      {
        date: draft.date || appointment.date,
        time: draft.time || appointment.time,
        status: appointment.status === "pending" ? "confirmed" : appointment.status,
      },
      "Session rescheduled"
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-2">
        <section className="dashboard-motion bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5 py-6 md:py-10">
          <div className="dashboard-shell mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <GlowPanel className="dashboard-panel overflow-hidden p-0">
              <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {data.profile?.profilePhotoUrl ? (
                      <img src={data.profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(data.profile?.name || "Counsellor")
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-secondary/25 bg-secondary/15 text-secondary">Counsellor dashboard</Badge>
                      <Badge className="border-emerald-500/20 bg-emerald-500/15 text-emerald-600">
                        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                        {data.profile?.verificationBadge || "Approved"}
                      </Badge>
                    </div>
                    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{data.profile?.name || "Counsellor workspace"}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-foreground/70 sm:text-base">
                      {data.profile?.specialization || "Manage care sessions, patient progress, notes, chat, earnings, reviews, and Google Meet consultations."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/65">
                      {(data.profile?.languages || []).slice(0, 4).map((language) => (
                        <span key={language} className="rounded-full bg-foreground/5 px-3 py-1">{language}</span>
                      ))}
                      {data.profile?.experience && <span className="rounded-full bg-foreground/5 px-3 py-1">{data.profile.experience}</span>}
                      {data.profile?.responseTime && <span className="rounded-full bg-foreground/5 px-3 py-1">{data.profile.responseTime}</span>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-glass-border/50 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/55">Today</p>
                      <p className="mt-1 text-2xl font-bold">{todaySessions.length} sessions</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <QuickStat label="Pending" value={pending.length} />
                    <QuickStat label="Rating" value={reviewScore} />
                  </div>
                </div>
              </div>
            </GlowPanel>

            <div className="dashboard-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Metric title="Today's sessions" value={data.stats.todaySessions} icon={Clock} tone="text-blue-500" />
              <Metric title="Active patients" value={data.stats.activeClients} icon={Users} tone="text-emerald-500" />
              <Metric title="Session revenue" value={formatMoney(data.stats.earnings)} icon={IndianRupee} tone="text-primary" />
              <Metric title="Pending requests" value={data.stats.pendingRequests} icon={ClipboardList} tone="text-amber-500" />
              <Metric title="Average rating" value={reviewScore} icon={Star} tone="text-amber-500" />
            </div>

            <Tabs defaultValue="overview" className="space-y-5">
              <TabsList className="dashboard-panel flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                        Care Command Center
                      </CardTitle>
                      <CardDescription>Requests, reminders, follow-ups, and care tasks in one place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <StatusTile label="Pending requests" value={pending.length} icon={ClipboardList} />
                        <StatusTile label="Confirmed schedule" value={activeSessions.filter((item) => item.status === "confirmed").length} icon={CheckCircle2} />
                        <StatusTile label="Attendance" value={`${averageAttendance}%`} icon={Activity} />
                      </div>
                      <div className="space-y-3">
                        {pending.slice(0, 3).map((appointment) => (
                          <RequestRow
                            key={appointment.id}
                            appointment={appointment}
                            onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" }, "Request accepted")}
                            onDecline={() => updateAppointment(appointment.id, { status: "declined" }, "Request declined")}
                            onMeet={() => createMeet(appointment.id)}
                          />
                        ))}
                        {pending.length === 0 && <EmptyState icon={ClipboardCheck} title="No pending requests" text="Your booking queue is clear." />}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-secondary" />
                          Notifications
                        </CardTitle>
                        <CardDescription>Recent alerts and platform updates.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        {(data.notifications || []).slice(0, 5).length > 0 ? (
                          (data.notifications || []).slice(0, 5).map((item, index) => {
                            const notification = normalizeNotification(item);
                            const typeColors = {
                              session: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                              message: "bg-violet-500/10 text-violet-500 border-violet-500/20",
                              payment: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              emergency: "bg-rose-500/10 text-rose-500 border-rose-500/20",
                            };
                            const typeIcons = {
                              session: CalendarCheck,
                              message: MessageCircle,
                              payment: CreditCard,
                              emergency: AlertTriangle,
                            };
                            const type = notification.type || "general";
                            const IconComponent = typeIcons[type] || Bell;
                            const colorClass = typeColors[type] || "bg-primary/10 text-primary border-primary/20";
                            return (
                              <div key={`${notification.title}-${index}`} className="group flex items-start gap-3 rounded-xl border border-glass-border/40 bg-background/60 p-3.5 transition hover:border-glass-border/60 hover:bg-background/80">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                                  <IconComponent className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-medium text-foreground">{notification.title}</span>
                                    {notification.time && <span className="shrink-0 text-[11px] text-foreground/45">{notification.time}</span>}
                                  </div>
                                  <p className="mt-0.5 text-sm leading-snug text-foreground/65 line-clamp-2">{notification.message}</p>
                                </div>
                                {index === 0 && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />}
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="h-10 w-10 text-foreground/15 mb-2" />
                            <p className="text-sm font-medium text-foreground/60">No notifications</p>
                            <p className="text-xs text-foreground/50 mt-1">New alerts will appear here.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          Safety Workflow
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(data.actions || []).map((action) => (
                          <PanelText key={action}>
                            <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500" />
                            {action}
                          </PanelText>
                        ))}
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          For emergencies, direct users to professional services immediately.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="dashboard-tab-motion space-y-6">

                {/* Hero Status */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Status</p>
                        <p className={`mt-1 text-lg font-bold ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`}>{bookingEnabled ? "Active" : "Paused"}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bookingEnabled ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                        <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wide text-foreground/50">Slots</p>
                    <p className="mt-1 text-lg font-bold text-blue-500">{availabilityRows.length}</p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">Weekly time slots</p>
                  </div>
                  <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wide text-foreground/50">Blocked</p>
                    <p className="mt-1 text-lg font-bold text-amber-500">{unavailableDates.length}</p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">Unavailable dates</p>
                  </div>
                  <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wide text-foreground/50">Meet</p>
                    <p className={`mt-1 text-lg font-bold ${meetLink ? "text-emerald-500" : "text-rose-500"}`}>{meetLink ? "Ready" : "Needed"}</p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">Google Meet link</p>
                  </div>
                </div>

                {/* Main Schedule Card */}
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <CalendarDays className="h-4 w-4 text-primary" />
                        </span>
                        <div>
                          <CardTitle>Weekly Schedule</CardTitle>
                          <CardDescription>Set your available days, time slots, and block dates off.</CardDescription>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingEnabled(!bookingEnabled)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                          bookingEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-rose-500/30 bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        <Power className="h-4 w-4" />
                        {bookingEnabled ? "Bookings On" : "Bookings Off"}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">

                    {/* Weekly Visual Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Time Slots
                        </h3>
                        <Button onClick={addAvailabilityRow} size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          Add Slot
                        </Button>
                      </div>

                      {/* Day headers */}
                      <div className="hidden md:grid grid-cols-7 gap-2 mb-2">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <div key={day} className="text-center text-[11px] font-medium text-foreground/50 uppercase tracking-wide py-1">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Slots rendered as visual cards */}
                      {availabilityRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-glass-border/40 bg-background/40">
                          <CalendarDays className="h-10 w-10 text-foreground/20 mb-2" />
                          <p className="text-sm text-foreground/60 font-medium">No time slots set</p>
                          <p className="text-xs text-foreground/50 mt-1 mb-3">Add your available hours for each day.</p>
                          <Button onClick={addAvailabilityRow} size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Add First Slot
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {availabilityRows.map((row) => {
                            const dayColors = {
                              Monday: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/25",
                              Tuesday: "from-blue-500/20 to-blue-500/5 border-blue-500/25",
                              Wednesday: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/25",
                              Thursday: "from-teal-500/20 to-teal-500/5 border-teal-500/25",
                              Friday: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/25",
                              Saturday: "from-amber-500/20 to-amber-500/5 border-amber-500/25",
                              Sunday: "from-rose-500/20 to-rose-500/5 border-rose-500/25",
                            };
                            const dayIcons = {
                              Monday: "M",
                              Tuesday: "T",
                              Wednesday: "W",
                              Thursday: "T",
                              Friday: "F",
                              Saturday: "S",
                              Sunday: "S",
                            };
                            const colorClass = dayColors[row.day] || dayColors.Monday;
                            return (
                              <div key={row.id} className={`group relative rounded-2xl border bg-gradient-to-br ${colorClass} p-3 transition-all hover:shadow-md`}>
                                <button
                                  type="button"
                                  onClick={() => removeAvailabilityRow(row.id)}
                                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/60 text-xs font-bold text-foreground">
                                      {dayIcons[row.day] || row.day[0]}
                                    </span>
                                    <span className="text-sm font-semibold">{row.day}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    value={row.start}
                                    onChange={(e) => updateAvailabilityRow(row.id, "start", e.target.value)}
                                    className="w-full rounded-lg border border-glass-border/30 bg-background/60 px-2 py-1.5 text-xs font-medium focus:border-primary/40 focus:outline-none"
                                  />
                                  <span className="text-xs text-foreground/40">&mdash;</span>
                                  <input
                                    type="time"
                                    value={row.end}
                                    onChange={(e) => updateAvailabilityRow(row.id, "end", e.target.value)}
                                    className="w-full rounded-lg border border-glass-border/30 bg-background/60 px-2 py-1.5 text-xs font-medium focus:border-primary/40 focus:outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Google Meet Link */}
                    <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                          <Video className="h-4 w-4 text-blue-500" />
                        </span>
                        <div className="flex-1">
                          <label className="text-sm font-medium">Google Meet Room</label>
                          <Input className="mt-1.5" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                          <p className="mt-1 text-xs text-foreground/50">Paste a reusable room link. Both you and users join the same room.</p>
                        </div>
                      </div>
                    </div>

                    {/* Unavailable Dates */}
                    <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                          <CalendarX className="h-4 w-4 text-rose-500" />
                        </span>
                        <div className="flex-1">
                          <label className="text-sm font-medium">Unavailable Dates</label>
                          <p className="text-xs text-foreground/50 mt-0.5 mb-3">Block specific dates when you are not available.</p>
                          <div className="flex gap-2">
                            <Input type="date" value={unavailableDateDraft} onChange={(e) => setUnavailableDateDraft(e.target.value)} className="max-w-48" />
                            <Button type="button" variant="outline" size="sm" onClick={addUnavailableDate}>Add</Button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {unavailableDates.length ? (
                              unavailableDates.map((date) => (
                                <button
                                  key={date}
                                  type="button"
                                  onClick={() => removeUnavailableDate(date)}
                                  className="group flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-500 hover:bg-rose-500/20 transition"
                                >
                                  <span>{date}</span>
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">&times;</span>
                                </button>
                              ))
                            ) : (
                              <span className="text-xs text-foreground/50 italic">No blocked dates.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save */}
                    <Button onClick={saveProfileTools} className="w-full gap-2 h-11 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      Save Schedule
                    </Button>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      Upcoming Appointments
                    </CardTitle>
                    <CardDescription>User name, session type, date/time, mode, status, and rescheduling controls.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 xl:grid-cols-2">
                    {upcomingAppointments.length ? (
                      upcomingAppointments.map((appointment) => (
                        <UpcomingAppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          draft={sessionDrafts[appointment.id] || {}}
                          onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                          onReschedule={() => rescheduleAppointment(appointment)}
                          onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                        />
                      ))
                    ) : (
                      <EmptyState icon={CalendarCheck} title="No upcoming appointments" text="Confirmed and pending bookings appear here." />
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Booking Requests
                      </CardTitle>
                      <CardDescription>Accept, reject, add Google Meet, or reschedule requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pending.length ? (
                        pending.map((appointment) => (
                          <RequestRow
                            key={appointment.id}
                            appointment={appointment}
                            onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" }, "Request accepted")}
                            onDecline={() => updateAppointment(appointment.id, { status: "declined" }, "Request declined")}
                            onMeet={() => createMeet(appointment.id)}
                          />
                        ))
                      ) : (
                        <EmptyState icon={ClipboardCheck} title="No pending requests" text="New booking requests will appear here." />
                      )}
                    </CardContent>
                  </Card>
                  </div>

                  <Card className="glass-card">
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5 text-secondary" />
                            Session Schedule
                          </CardTitle>
                          <CardDescription>Manage confirmed, pending, completed, and cancelled sessions.</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                            <Input className="pl-9" value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Search sessions" />
                          </div>
                          <Select value={sessionFilter} onValueChange={setSessionFilter}>
                            <SelectTrigger className="w-full sm:w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredSessions.length ? (
                        filteredSessions.map((appointment) => (
                          <SessionCard
                            key={appointment.id}
                            appointment={appointment}
                            draft={sessionDrafts[appointment.id] || {}}
                            onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                            onReschedule={() => rescheduleAppointment(appointment)}
                            onComplete={() =>
                              updateAppointment(
                                appointment.id,
                                { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                                "Session completed"
                              )
                            }
                            onCancel={() => updateAppointment(appointment.id, { status: "cancelled" }, "Session cancelled")}
                            onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                          />
                        ))
                      ) : (
                        <EmptyState icon={CalendarCheck} title="No sessions found" text="Try another status or search term." />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="patients" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
                  {/* Patient List - Modern Cards */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </span>
                          <div>
                            <CardTitle className="text-base">My Patients</CardTitle>
                            <CardDescription>{patients.length} active</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {["all", "high", "moderate", "low"].map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => {
                                if (filter === "all") setSelectedPatientId(patients[0]?.id || "");
                                else {
                                  const found = patients.find((p) => p.risk === filter);
                                  if (found) setSelectedPatientId(found.id);
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-medium capitalize transition ${
                                filter === "all" ? "bg-primary/15 text-primary" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                              }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto chat-scrollbar">
                      {patients.map((patient, idx) => {
                        const progressColors = [
                          "from-emerald-500 to-green-400",
                          "from-blue-500 to-cyan-400",
                          "from-violet-500 to-purple-400",
                          "from-amber-500 to-orange-400",
                        ];
                        const pc = progressColors[idx % progressColors.length];
                        const riskColors = {
                          low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
                          moderate: "border-amber-500/30 bg-amber-500/10 text-amber-600",
                          high: "border-rose-500/30 bg-rose-500/10 text-rose-600",
                        };
                        return (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`group relative w-full rounded-2xl border-2 p-3 text-left transition-all duration-200 hover:shadow-lg ${
                              selectedPatient?.id === patient.id
                                ? "border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-primary/10"
                                : "border-glass-border/30 bg-background/50 hover:border-primary/30 hover:bg-primary/[0.03]"
                            }`}
                          >
                            {selectedPatient?.id === patient.id && (
                              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-secondary" />
                            )}
                            <div className="flex items-start gap-3">
                              <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${pc} text-sm font-bold text-white shadow-md`}>
                                {initials(patient.name)}
                                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${patient.risk === "high" ? "bg-rose-500 animate-pulse" : patient.risk === "moderate" ? "bg-amber-400" : "bg-emerald-400"}`} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-sm truncate">{patient.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${riskColors[patient.risk] || riskColors.low}`}>
                                    {patient.risk || "low"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-foreground/50 truncate">{patient.activePlanName || "Counselling sessions"}</span>
                                  {patient.packages?.filter(p => p.status === "active").length > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                                      Pkg
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-2 flex items-center gap-3 text-[10px] text-foreground/60">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    {patient.completedSessions || 0}/{patient.totalSessions || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    {patient.pendingSessions || 0} pending
                                  </span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${pc} transition-all duration-500`} style={{ width: `${patient.progress || 0}%` }} />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {!patients.length && (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Users className="h-10 w-10 text-foreground/20 mb-3" />
                          <p className="text-foreground/60 font-medium text-sm">No patients yet</p>
                          <p className="text-xs text-foreground/50 mt-1">Patients appear after sessions are booked.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Patient Overview - Modern Layout */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                          <UserCheck className="h-4 w-4 text-secondary" />
                        </span>
                        <div>
                          <CardTitle className="text-base">Patient Overview</CardTitle>
                          <CardDescription>Therapy history, mood, risk & care progress</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 max-h-[600px] overflow-y-auto chat-scrollbar">
                      {selectedPatient ? (
                        <div className="space-y-5">

                          {/* Quick Stats Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: "Total Sessions", value: selectedPatient.totalSessions || 0, icon: FileText, color: "from-blue-500/20 to-blue-500/5 text-blue-500" },
                              { label: "Completed", value: selectedPatient.completedSessions || 0, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-500/5 text-emerald-500" },
                              { label: "Plan", value: selectedPatient.activePlanName?.split(" ")[0] || "Support", icon: ClipboardCheck, color: "from-violet-500/20 to-violet-500/5 text-violet-500" },
                              { label: "Attendance", value: `${selectedPatient.attendance || 0}%`, icon: BarChart3, color: "from-amber-500/20 to-amber-500/5 text-amber-500" },
                            ].map((stat) => (
                              <div key={stat.label} className="rounded-xl bg-gradient-to-br p-3 text-center border border-glass-border/30" style={{ backgroundImage: `linear-gradient(to bottom right, ${stat.color.split(" ")[0].replace("from-", "")}, ${stat.color.split(" ")[1].replace("via-", "").replace("to-", "")})` }}>
                                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color.split(" ")[2]}`} />
                                <div className={`text-lg font-bold ${stat.color.split(" ")[2]}`}>{stat.value}</div>
                                <div className="text-[10px] text-foreground/55 mt-0.5">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Plan & Wellness split */}
                          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                            {/* Plan & Session */}
                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                                  <FileText className="h-3 w-3 text-primary" />
                                </span>
                                Plan & Session
                              </h3>
                              <div className="grid gap-3">
                                {[
                                  { label: "Current plan", value: selectedPatient.activePlanName || "Counselling sessions" },
                                  { label: "Duration", value: selectedPatient.activePlanDuration || "Not specified" },
                                  { label: "Interval", value: selectedPatient.activePlanCadence || "Not specified" },
                                  { label: "Progress", value: selectedPatient.therapyHistory },
                                ].map((item) => (
                                  <div key={item.label} className="flex items-center justify-between border-b border-glass-border/20 pb-2 last:border-0">
                                    <span className="text-[11px] text-foreground/50 uppercase tracking-wide">{item.label}</span>
                                    <span className="text-xs font-medium text-right max-w-[60%]">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                              {selectedPatient.activePlanBestFor?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {selectedPatient.activePlanBestFor.map((item) => (
                                    <Badge key={item} variant="secondary" className="text-[10px]">{item}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Wellness */}
                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                                  <Heart className="h-3 w-3 text-emerald-500" />
                                </span>
                                Wellness
                              </h3>
                              <div className="grid gap-3">
                                <WellnessMiniLine label="Mood" value={selectedPatient.moodReport || "Not tracked"} color="text-amber-500" />
                                <WellnessMiniLine
                                  label="Assessment"
                                  value={selectedPatient.latestAssessmentLevel ? `${selectedPatient.latestAssessmentLevel} (${selectedPatient.latestAssessmentScore || 0})` : selectedPatient.risk}
                                  color={selectedPatient.latestAssessmentLevel === "high" || selectedPatient.risk === "high" ? "text-rose-500" : "text-emerald-500"}
                                />
                                <WellnessMiniLine label="Journal Entries" value={`${selectedPatient.sharedJournalCount || 0} shared`} color="text-blue-500" />
                                <WellnessMiniLine label="Contact" value={selectedPatient.phone || selectedPatient.email || "N/A"} color="text-foreground/70" />
                              </div>
                              {selectedPatient.latestJournalExcerpt ? (
                                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                  <p className="text-xs font-medium text-primary mb-1">{selectedPatient.latestJournalTitle || "Latest shared journal"}</p>
                                  <p className="text-xs text-foreground/65 line-clamp-2">{selectedPatient.latestJournalExcerpt}</p>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-foreground/50 italic">No shared journal entries yet.</p>
                              )}
                            </div>
                          </div>

                          {/* Package Details */}
                          {selectedPatient.packages?.length > 0 && (
                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                                  <Package className="h-3 w-3 text-violet-500" />
                                </span>
                                Packages ({selectedPatient.packages.length})
                              </h3>
                              <div className="grid gap-3 md:grid-cols-2">
                                {selectedPatient.packages.map((pkg) => (
                                  <div key={pkg.id} className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold">{pkg.planName}</span>
                                        {pkg.mode && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">
                                            {modeLabel(pkg.mode)}
                                          </span>
                                        )}
                                      </div>
                                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                                        pkg.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                        pkg.status === "completed" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                        "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                      }`}>{pkg.status}</Badge>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-foreground/60 mb-2">
                                      <span>{pkg.sessionsUsed}/{pkg.sessionsTotal} sessions</span>
                                      <span>{pkg.sessionsRemaining} remaining</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${pkg.progress}%` }} />
                                    </div>
                                    {pkg.expiryDate && (
                                      <p className="text-[10px] text-foreground/50 mt-2">
                                        Expires {new Date(pkg.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Session Timeline + Care Plan */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
                                  <Clock className="h-3 w-3 text-blue-500" />
                                </span>
                                Session Timeline
                              </h3>
                              <div className="space-y-2 max-h-44 overflow-y-auto chat-scrollbar pr-1">
                                {(selectedPatient.sessions?.length ? selectedPatient.sessions : selectedPatientSessions).length > 0 ? (
                                  (selectedPatient.sessions?.length ? selectedPatient.sessions : selectedPatientSessions).slice(0, 6).map((appointment, i) => (
                                    <div key={appointment.id} className="flex gap-3 items-start">
                                      <div className="flex flex-col items-center">
                                        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${appointment.status === "completed" ? "bg-emerald-500" : appointment.status === "cancelled" || appointment.status === "declined" ? "bg-rose-400" : "bg-primary"}`} />
                                        {i < Math.min((selectedPatient.sessions?.length || selectedPatientSessions.length), 6) - 1 && <div className="w-px flex-1 bg-glass-border/30 my-0.5" />}
                                      </div>
                                      <div className="flex-1 min-w-0 pb-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-medium">{appointment.date}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                                            appointment.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                                            appointment.status === "cancelled" || appointment.status === "declined" ? "bg-rose-500/10 text-rose-600" :
                                            "bg-primary/10 text-primary"
                                          }`}>{appointment.status}</span>
                                        </div>
                                        <div className="text-[11px] text-foreground/50">{appointment.time} &middot; {appointment.mode}</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-foreground/50 italic py-4 text-center">No sessions yet</p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                                  <TrendingUp className="h-3 w-3 text-violet-500" />
                                </span>
                                Care Progress
                              </h3>
                              <div className="h-36">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsLineChart
                                    data={[
                                      { label: "Start", progress: Math.max(15, (selectedPatient.progress || 0) - 30) },
                                      { label: "Week 2", progress: Math.max(25, (selectedPatient.progress || 0) - 18) },
                                      { label: "Week 4", progress: Math.max(35, (selectedPatient.progress || 0) - 8) },
                                      { label: "Now", progress: selectedPatient.progress || 0 },
                                    ]}
                                    margin={{ top: 5, right: 5, left: -18, bottom: 0 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v) => [`${v}%`, "Progress"]} />
                                    <defs>
                                      <linearGradient id="progressLine" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                                        <stop offset="100%" stopColor="hsl(var(--secondary))" />
                                      </linearGradient>
                                    </defs>
                                    <Line type="monotone" dataKey="progress" stroke="url(#progressLine)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                                  </RechartsLineChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-foreground/60">Mood improvement</span>
                                  <span className="font-semibold text-primary">{selectedPatient.progress || 0}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${selectedPatient.progress || 0}%` }} />
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-foreground/60">Attendance</span>
                                  <span className="font-semibold text-emerald-500">{averageAttendance}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500" style={{ width: `${averageAttendance}%` }} />
                                </div>
                              </div>
                              <div className="mt-3 rounded-xl border border-glass-border/20 bg-background/50 p-2.5">
                                <p className="text-xs text-foreground/60 flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-amber-500" />
                                  Confirm follow-up and send a wellness task.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Mode Breakdown */}
                          {(selectedPatient.modeBreakdown || []).length > 0 && (
                            <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4">
                              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10">
                                  <Video className="h-3 w-3 text-sky-500" />
                                </span>
                                Session Modes
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedPatient.modeBreakdown.map((item) => (
                                  <div key={item.mode} className="flex items-center gap-2 rounded-xl border border-glass-border/30 bg-background/60 px-3 py-2">
                                    <span className="text-xs capitalize text-foreground/70">{String(item.mode || "").replace("-", " ")}</span>
                                    <span className="text-sm font-bold text-primary">{item.count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                            <UserCheck className="h-7 w-7 text-primary/60" />
                          </div>
                          <p className="text-foreground/60 font-medium">Select a patient</p>
                          <p className="text-xs text-foreground/50 mt-1">Choose a patient from the list to view their details.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <NotebookPen className="h-5 w-5 text-primary" />
                      Confidential Session Notes
                    </CardTitle>
                    <CardDescription>Save recommendations, treatment plans, and post-session notes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 md:grid-cols-4">
                      {noteTemplates.map((template) => (
                        <button
                          type="button"
                          key={template}
                          onClick={() => {
                            const target = activeSessions[0] || appointments[0];
                            if (target) setNotes((current) => ({ ...current, [target.id]: template }));
                          }}
                          className="rounded-xl border border-glass-border/40 bg-background/60 p-3 text-left text-xs text-foreground/70 transition hover:border-primary/40 hover:bg-primary/5"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {(activeSessions.length ? activeSessions : appointments).map((appointment) => (
                        <div key={appointment.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
                              <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time}</div>
                            </div>
                            <Badge className={statusTone[appointment.status] || "bg-foreground/10 text-foreground"}>{appointment.status}</Badge>
                          </div>
                          <Textarea
                            rows={4}
                            className="mt-3"
                            value={notes[appointment.id] ?? appointment.notes ?? ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [appointment.id]: event.target.value }))}
                            placeholder="Write confidential notes, recommendations, and treatment plan..."
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button onClick={() => updateAppointment(appointment.id, { notes: notes[appointment.id] || "" }, "Notes saved")}>
                              Save notes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                updateAppointment(
                                  appointment.id,
                                  { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                                  "Session completed"
                                )
                              }
                            >
                              Mark completed
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>


                <TabsContent value="earnings" className="dashboard-tab-motion space-y-6">
                  {/* Premium Earnings Header Cards */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-primary/20 via-primary/5 to-background p-5 transition-all duration-500 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-primary/5 blur-xl" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-primary/60">Total Earnings</p>
                          <p className="mt-1.5 text-2xl font-bold tracking-tight">{formatMoney(data.earnings.total)}</p>
                          <p className="mt-1 text-xs text-emerald-500">
                            {data.earnings.total > 0 ? "+12% this month" : "No earnings yet"}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-sm">
                          <IndianRupee className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700" />
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-background p-5 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
                      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-emerald-500/5 blur-xl" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500/60">Session Revenue</p>
                          <p className="mt-1.5 text-2xl font-bold tracking-tight">{formatMoney(data.earnings.sessionRevenue)}</p>
                          <p className="mt-1 text-xs text-emerald-500">
                            {data.earnings.sessionRevenue > 0 ? "+8% from sessions" : "No sessions yet"}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 shadow-sm">
                          <CalendarCheck className="h-5 w-5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-500/10">
                        <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500/60 transition-all duration-700" />
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-background p-5 transition-all duration-500 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
                      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-amber-500/5 blur-xl" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-amber-500/60">Pending Payout</p>
                          <p className="mt-1.5 text-2xl font-bold tracking-tight">{formatMoney(data.earnings.pendingPayouts)}</p>
                          <p className="mt-1 text-xs text-amber-500">
                            {data.earnings.pendingPayouts > 0 ? "Processing" : "Up to date"}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 shadow-sm">
                          <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-500/10">
                        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-amber-500 to-amber-500/60 transition-all duration-700" />
                      </div>
                    </div>
                  </div>

                  {/* Monthly Chart + Fee Summary */}
                  <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
                    <Card className="glass-card overflow-hidden">
                      <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-primary" />
                              Monthly Earnings Trend
                            </CardTitle>
                            <CardDescription>Revenue trend and platform commission (2%)</CardDescription>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-3 w-3 rounded-sm bg-primary" />
                              <span className="text-foreground/60">Payout</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-3 w-3 rounded-sm bg-secondary" />
                              <span className="text-foreground/60">Platform fee</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 rounded-2xl border border-glass-border/40 bg-background/60 p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={data.earnings.monthly || []} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(value) => `Rs.${Math.round(value / 1000)}k`} />
                              <Tooltip
                                cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 10 }}
                                formatter={(value) => formatMoney(value)}
                              />
                              <Bar dataKey="payout" name="Counsellor payout" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                              <Bar dataKey="platformFee" name="Platform fee (2%)" radius={[6, 6, 0, 0]} fill="hsl(var(--secondary))" />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-indigo-500/10 to-background p-4 transition-all duration-500 hover:border-indigo-500/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-indigo-500/10">
                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Platform fee rate</p>
                            <p className="text-lg font-bold">{data.earnings.platformCommissionRate || 2}%</p>
                            <p className="text-xs text-emerald-500">Lowest in industry</p>
                          </div>
                        </div>
                      </div>
                      <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-emerald-500/10 to-background p-4 transition-all duration-500 hover:border-emerald-500/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                            <IndianRupee className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Your payout</p>
                            <p className="text-lg font-bold">{formatMoney(data.earnings.total)}</p>
                            <p className="text-xs text-emerald-500">After 2% fee deduction</p>
                          </div>
                        </div>
                      </div>
                      <div className="group relative overflow-hidden rounded-2xl border border-glass-border/40 bg-gradient-to-br from-amber-500/10 to-background p-4 transition-all duration-500 hover:border-amber-500/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10">
                            <RefreshCw className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Pending queue</p>
                            <p className="text-lg font-bold">{formatMoney(data.earnings.pendingPayouts)}</p>
                            <p className="text-xs text-amber-500">Processing</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown + Recent */}
                  <div className="grid gap-6 lg:grid-cols-[0.6fr_1.4fr]">
                    <Card className="glass-card overflow-hidden">
                      <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 to-transparent">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <PieChart className="h-5 w-5 text-secondary" />
                          Earnings Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <div className="relative h-44 w-44">
                          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.3" />
                            {data.earnings.monthly && data.earnings.monthly.length > 0 && (
                              data.earnings.monthly.slice(0, 4).map((month, index) => {
                                const total = data.earnings.monthly.reduce((sum, m) => sum + (m.payout || 0), 0);
                                const percentage = total > 0 ? ((month.payout || 0) / total) * 100 : 0;
                                const circumference = 2 * Math.PI * 42;
                                const dashLength = (percentage / 100) * circumference;
                                const gapLength = circumference - dashLength;
                                const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8b5cf6"];
                                return (
                                  <circle
                                    key={index}
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    fill="none"
                                    stroke={colors[index % colors.length]}
                                    strokeWidth="6"
                                    strokeDasharray={`${dashLength} ${gapLength}`}
                                    strokeDashoffset={-(index * (circumference / 4))}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                  />
                                );
                              })
                            )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-xl font-bold">{formatMoney(data.earnings.total)}</div>
                            <div className="text-xs text-foreground/55">Total earned</div>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                          {(data.earnings.monthly || []).slice(0, 4).map((month, index) => {
                            const total = data.earnings.monthly.reduce((sum, m) => sum + (m.payout || 0), 0);
                            const pct = total > 0 ? Math.round(((month.payout || 0) / total) * 100) : 0;
                            const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8b5cf6"];
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % 4] }} />
                                <div>
                                  <span className="text-xs text-foreground/60">{month.month || "—"}</span>
                                  <span className="ml-1.5 text-xs font-medium text-foreground/80">{pct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden">
                      <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <History className="h-5 w-5 text-primary" />
                          Recent Transactions
                        </CardTitle>
                        <CardDescription>Latest completed sessions with earnings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {data.earnings.transactions && data.earnings.transactions.length > 0 ? (
                          <div className="space-y-2">
                            {data.earnings.transactions.slice(0, 5).map((txn, index) => (
                              <TransactionRow key={index} txn={txn} />
                            ))}
                          </div>
                        ) : (
                          <TransactionRowEmpty />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                 </TabsContent>

                <TabsContent value="history" className="dashboard-tab-motion space-y-6">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Session & Payment History
                          </CardTitle>
                          <CardDescription>All completed sessions and transactions</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.earnings.transactions && data.earnings.transactions.length > 0 ? (
                        <div className="divide-y divide-glass-border/20">
                          {data.earnings.transactions.map((txn, i) => {
                            const date = txn.date ? new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
                            return (
                              <div key={i} className="flex items-center justify-between p-4 transition hover:bg-background/40">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                                    {txn.patientAvatar ? (
                                      <img src={txn.patientAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                        {txn.patientName?.charAt(0) || "?"}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{txn.patientName}</span>
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{txn.plan || "Session"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-foreground/55">
                                      <span>{date}</span>
                                      <span>•</span>
                                      <span className="text-emerald-500 font-medium">{formatMoney(txn.amount)}</span>
                                      <span>•</span>
                                      <span className="text-foreground/45">{txn.invoiceNumber}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    txn.status === "paid" ? "bg-emerald-500/15 text-emerald-500" :
                                    txn.status === "pending" ? "bg-amber-500/15 text-amber-500" :
                                    "bg-red-500/15 text-red-500"
                                  }`}>
                                    {txn.status === "paid" ? "Paid" : txn.status === "pending" ? "Pending" : "Refunded"}
                                  </span>
                                  <div className="text-right">
                                    <div className="text-xs text-foreground/45">Fee: {formatMoney(txn.platformFee)}</div>
                                    <div className="text-xs font-medium text-emerald-500">+{formatMoney(txn.counsellorPayout)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12">
                          <History className="mb-3 h-12 w-12 text-primary/30" />
                          <p className="text-base font-medium text-foreground/60">No history yet</p>
                          <p className="mt-1 text-sm text-foreground/40">Completed sessions and payments will appear here.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="dashboard-tab-motion space-y-6">
                 {/* Reviews Overview Stats */}
                 <div className="grid gap-4 md:grid-cols-4">
                   <ReviewStatCard 
                     label="Average rating" 
                     value={reviewScore} 
                     icon={Star}
                     color="text-amber-500"
                   />
                   <ReviewStatCard 
                     label="Total reviews" 
                     value={data.reviews.length} 
                     icon={MessageSquareText}
                     color="text-primary"
                   />
                   <ReviewStatCard 
                     label="Completion rate" 
                     value={`${averageAttendance}%`} 
                     icon={CheckCircle2}
                     color="text-emerald-500"
                   />
                   <ReviewStatCard 
                     label="Helpfulness" 
                     value={data.reviews.length > 0 ? `${Math.round(data.reviews.reduce((sum, r) => sum + (r.helpfulness || 0), 0) / data.reviews.length * 20)}%` : "—"} 
                     icon={Heart}
                     color="text-pink-500"
                   />
                 </div>

                 {/* Premium Review Cards Grid */}
                 <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                   <div className="space-y-4">
                     {data.reviews.length ? (
                       data.reviews.map((review, index) => (
                         <ReviewCard key={review.id} review={review} index={index} />
                       ))
                     ) : (
                       <EmptyState 
                         icon={Star} 
                         title="No reviews yet" 
                         text="Reviews appear after users rate completed sessions." 
                       />
                     )}
                   </div>

                   {/* Rating Distribution Sidebar */}
                   <Card className="glass-card h-fit overflow-hidden">
                     <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent">
                       <CardTitle className="flex items-center gap-2 text-base">
                         <BarChart3 className="h-5 w-5 text-amber-500" />
                         Rating Distribution
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4">
                       {data.reviews.length > 0 ? (
                         <div className="space-y-3">
                           {[5, 4, 3, 2, 1].map((rating) => {
                             const count = data.reviews.filter(r => Math.floor(r.rating || 0) === rating).length;
                             const percentage = data.reviews.length > 0 ? Math.round((count / data.reviews.length) * 100) : 0;
                             return (
                               <div key={rating} className="flex items-center gap-2">
                                 <div className="flex items-center gap-1 w-14">
                                   <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                   <span className="text-xs font-medium">{rating}</span>
                                 </div>
                                 <div className="flex-1 h-6 rounded-full bg-glass-border/30 overflow-hidden">
                                   <div 
                                     className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                                     style={{ width: `${percentage}%` }}
                                   />
                                 </div>
                                 <span className="text-xs text-foreground/60 w-8">{count}</span>
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <PanelText>No rating data available yet.</PanelText>
                       )}
                     </CardContent>
                   </Card>
                 </div>

                 {/* Review Metrics Summary */}
                 <Card className="glass-card overflow-hidden">
                   <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/5 to-transparent">
                     <CardTitle className="flex items-center gap-2 text-base">
                       <TrendingUp className="h-5 w-5 text-primary" />
                       Performance Metrics
                     </CardTitle>
                     <CardDescription>Average scores across key performance indicators.</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="grid gap-4 md:grid-cols-3">
                       <ReviewMetricBar 
                         label="Professionalism" 
                         value={data.reviews.length > 0 ? data.reviews.reduce((sum, r) => sum + (r.professionalism || 0), 0) / data.reviews.length : 0} 
                         icon={BadgeCheck}
                       />
                       <ReviewMetricBar 
                         label="Helpfulness" 
                         value={data.reviews.length > 0 ? data.reviews.reduce((sum, r) => sum + (r.helpfulness || 0), 0) / data.reviews.length : 0} 
                         icon={Heart}
                       />
                       <ReviewMetricBar 
                         label="Communication" 
                         value={data.reviews.length > 0 ? data.reviews.reduce((sum, r) => sum + (r.communication || 0), 0) / data.reviews.length : 0} 
                         icon={MessageCircle}
                       />
                     </div>
                   </CardContent>
                 </Card>
                </TabsContent>

              <TabsContent value="resources" className="dashboard-tab-motion space-y-6">
                <CounsellorResources />
              </TabsContent>

              <TabsContent value="settings" className="dashboard-tab-motion space-y-6">

                {/* Theme Selection + Quick Profile */}
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Palette className="h-4 w-4 text-primary" />
                        </span>
                        <span>Dashboard Theme</span>
                      </CardTitle>
                      <CardDescription>Choose a calm, comfortable theme for your dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                          { id: "default", name: "Midnight Calm", color: "bg-indigo-500" },
                          { id: "lavender", name: "Lavender", color: "bg-violet-300" },
                          { id: "sky", name: "Sky Blue", color: "bg-sky-300" },
                          { id: "mint", name: "Mint Green", color: "bg-emerald-300" },
                          { id: "soft", name: "Soft White", color: "bg-zinc-100" },
                        ].map((option) => (
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
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">✓</span>
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

                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                          <Sparkles className="h-4 w-4 text-secondary" />
                        </span>
                        <span>Profile at a Glance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="grid gap-2">
                        <ProfileLine label="Status" value={data.profile?.verificationBadge || "Verified Professional"} />
                        <ProfileLine label="Type" value={data.profile?.counsellorType || "professional"} />
                        <ProfileLine label="Packages" value={`${customPackages.filter((p) => p.name).length || packagePricePlans.length} active + One-Time`} />
                        <ProfileLine label="Meet" value={data.stats.googleMeetReady ? "Ready" : "Link needed"} />
                        <ProfileLine label="Rating" value={`${data.stats.rating || 4.8}/5`} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Package Pricing - Dynamic Add/Delete */}
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/15 via-secondary/10 to-sky-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                          <Package className="h-4 w-4 text-secondary" />
                        </span>
                        <div>
                          <CardTitle>Package Pricing</CardTitle>
                          <CardDescription>Create, edit, or remove packages. Users see these when booking. Platform fee is automatic.</CardDescription>
                        </div>
                      </div>
                      <Button onClick={addCustomPackage} size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add Package
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {customPackages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Package className="h-12 w-12 text-foreground/20 mb-3" />
                        <p className="text-foreground/60 font-medium">No custom packages yet</p>
                        <p className="text-sm text-foreground/50 mt-1 mb-4">Add your first package to show pricing options to users.</p>
                        <Button onClick={addCustomPackage} variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Create Your First Package
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {customPackages.map((pkg, idx) => (
                          <div key={pkg.id} className="group relative rounded-2xl border border-glass-border/40 bg-background/65 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  const id = pkg.id;
                                  const name = prompt("Package name", pkg.name);
                                  if (name !== null) updateCustomPackage(id, "name", name || "");
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 text-xs"
                                title="Edit name"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCustomPackage(pkg.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600 text-xs"
                                title="Delete package"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <input
                                  value={pkg.name}
                                  onChange={(e) => updateCustomPackage(pkg.id, "name", e.target.value)}
                                  className="w-full bg-transparent font-semibold text-foreground border-b border-transparent focus:border-primary/40 focus:outline-none pb-0.5"
                                  placeholder="Package name"
                                />
                              </div>
                              <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={pkg.isActive}
                                  onChange={(e) => updateCustomPackage(pkg.id, "isActive", e.target.checked)}
                                  className="peer sr-only"
                                />
                                <span className="absolute inset-0 rounded-full bg-foreground/20 transition peer-checked:bg-primary" />
                                <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white transition-all ${pkg.isActive ? "translate-x-4" : "translate-x-0"}`} />
                              </label>
                            </div>

                            <textarea
                              value={pkg.summary}
                              onChange={(e) => updateCustomPackage(pkg.id, "summary", e.target.value)}
                              className="w-full bg-transparent text-sm text-foreground/70 resize-none border-b border-glass-border/20 focus:border-primary/30 focus:outline-none pb-1 mb-2"
                              placeholder="Brief description..."
                              rows={1}
                            />

                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div>
                                <label className="text-[10px] uppercase tracking-wide text-foreground/45">Duration</label>
                                <input
                                  value={pkg.duration}
                                  onChange={(e) => updateCustomPackage(pkg.id, "duration", e.target.value)}
                                  className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                                  placeholder="e.g. 4-8 sessions"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wide text-foreground/45">Cadence</label>
                                <input
                                  value={pkg.cadence}
                                  onChange={(e) => updateCustomPackage(pkg.id, "cadence", e.target.value)}
                                  className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                                  placeholder="e.g. Weekly"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div>
                                <label className="text-[10px] uppercase tracking-wide text-foreground/45">Price (Rs.)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pkg.price}
                                  onChange={(e) => updateCustomPackage(pkg.id, "price", Number(e.target.value))}
                                  className="w-full bg-transparent text-sm font-semibold border-b border-transparent focus:border-primary/30 focus:outline-none"
                                  placeholder="1499"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wide text-foreground/45">Sessions</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={pkg.sessionCount}
                                  onChange={(e) => updateCustomPackage(pkg.id, "sessionCount", Number(e.target.value))}
                                  className="w-full bg-transparent text-sm font-semibold border-b border-transparent focus:border-primary/30 focus:outline-none"
                                  placeholder="6"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-wide text-foreground/45">Best for</label>
                              <input
                                value={Array.isArray(pkg.bestFor) ? pkg.bestFor.join(", ") : ""}
                                onChange={(e) => updateCustomPackage(pkg.id, "bestFor", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                                className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                                placeholder="Stress, Anxiety, Exams"
                              />
                            </div>

                            <div className="mt-3 pt-3 border-t border-glass-border/20">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-foreground/50">Your payout (after ~20% fee)</span>
                                <span className="font-semibold text-emerald-500">{formatMoney(counsellorPayout(pkg.price))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button onClick={saveCustomPackages} className="w-full gap-2" disabled={!customPackages.some((p) => p.name.trim())}>
                      <Package className="h-4 w-4" />
                      Save All Packages
                    </Button>
                  </CardContent>
                </Card>

                {/* Profile & Availability + Privacy & Notifications */}
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/8 via-secondary/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-primary" />
                        Profile & Availability
                      </CardTitle>
                      <CardDescription>Your public counsellor card, meeting link, and booking settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Specialization</label>
                          <Input className="mt-1.5" value={profileDraft.specialization} onChange={(event) => setProfileDraft((current) => ({ ...current, specialization: event.target.value }))} placeholder="Relationship Therapist" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <Input className="mt-1.5" value={profileDraft.location} onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Mumbai, IN" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Clinic / Practice Name</label>
                          <Input
                            className="mt-1.5"
                            value={profileDraft.clinicName || ""}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, clinicName: event.target.value }))}
                            placeholder="e.g. MindCare Clinic, Delhi"
                          />
                          <p className="text-xs text-slate-400 mt-1">This will appear on your profile and package bookings</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Clinic Address</label>
                          <Input
                            className="mt-1.5"
                            value={profileDraft.clinicAddress || ""}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, clinicAddress: event.target.value }))}
                            placeholder="e.g. 123, Park Street, Colaba"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">City</label>
                          <Input
                            className="mt-1.5"
                            value={profileDraft.city || ""}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, city: event.target.value }))}
                            placeholder="e.g. Mumbai, Delhi, Bangalore"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Education</label>
                          <Input className="mt-1.5" value={profileDraft.education} onChange={(event) => setProfileDraft((current) => ({ ...current, education: event.target.value }))} placeholder="MA Clinical Psychology" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Response time</label>
                          <Input className="mt-1.5" value={profileDraft.responseTime} onChange={(event) => setProfileDraft((current) => ({ ...current, responseTime: event.target.value }))} placeholder="Within 24 hours" />
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          {data.profile?.verificationStatus === "approved" ? (
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                          ) : (
                            <Shield className="h-5 w-5 text-amber-500" />
                          )}
                          <span className="font-medium text-sm">
                            Verification: {data.profile?.verificationStatus || "none"}
                          </span>
                        </div>
                        {data.profile?.verificationBadge && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            {data.profile.verificationBadge}
                          </span>
                        )}
                        {data.profile?.verificationStatus !== "approved" && (
                          <p className="text-xs text-slate-500 mt-2">
                            Your profile is pending verification. Admin will review your license and credentials.
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          License: {data.profile?.licenseNumber || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">About / bio</label>
                        <Textarea className="mt-1.5 min-h-24" value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Describe your care style, approach, and the users you support." />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/20 text-2xl font-bold text-primary shadow-lg">
                          {profileDraft.profilePhotoUrl ? (
                            <img src={profileDraft.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{initials(data.profile?.name || "C")}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <input type="file" accept="image/*" id="profile-photo-upload" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProfilePhoto(file); e.target.value = ""; }} />
                          <label htmlFor="profile-photo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border/40 bg-background/60 px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-foreground/10">
                            <Camera className="h-4 w-4" />
                            {uploadingPhoto ? "Uploading..." : "Upload photo"}
                          </label>
                        </div>
                      </div>

                      <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium">Google Meet link</label>
                          <Input className="mt-1.5" value={meetLink} onChange={(event) => setMeetLink(event.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                          <p className="mt-1 text-xs text-foreground/50">Paste a reusable room link. Do not use meet.google.com/new.</p>
                        </div>
                        <button type="button" onClick={() => setBookingEnabled(!bookingEnabled)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${bookingEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"}`}>
                          <span>
                            <span className="block text-sm font-semibold">{bookingEnabled ? "Bookings enabled" : "Bookings paused"}</span>
                            <span className="block text-xs text-foreground/60">Users can book only when enabled.</span>
                          </span>
                          <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
                        </button>
                      </div>

                      <Button onClick={saveProfileTools} className="gap-2">
                        <BadgeCheck className="h-4 w-4" />
                        Save Profile & Availability
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-secondary" />
                        Privacy & Notifications
                      </CardTitle>
                      <CardDescription>Control visibility, messaging, and alert preferences.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-5">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-foreground/45 font-medium">Privacy</p>
                        <SettingToggle title="Show online status" text="Active indicator in secure chat." checked={privacySettings.showOnlineStatus} onToggle={() => setPrivacySettings((current) => ({ ...current, showOnlineStatus: !current.showOnlineStatus }))} />
                        <SettingToggle title="Allow patient messages" text="Let approved patients send follow-ups." checked={privacySettings.allowMessages} onToggle={() => setPrivacySettings((current) => ({ ...current, allowMessages: !current.allowMessages }))} />
                        <SettingToggle title="Share progress insights" text="Use patient progress in care planning cards." checked={privacySettings.shareProgressWithCounsellor} onToggle={() => setPrivacySettings((current) => ({ ...current, shareProgressWithCounsellor: !current.shareProgressWithCounsellor }))} />
                        <div>
                          <label className="text-sm font-medium">Anonymous alias</label>
                          <Input className="mt-1.5" value={privacySettings.anonymousDisplayName || ""} onChange={(event) => setPrivacySettings((current) => ({ ...current, anonymousDisplayName: event.target.value }))} placeholder="MindSupport Counsellor" />
                        </div>
                      </div>
                      <div className="pt-2 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-foreground/45 font-medium">Notifications</p>
                        <SettingToggle icon={CalendarCheck} title="Session reminders" text="Bookings, reschedules, cancellations." checked={notificationSettings.session} onToggle={() => setNotificationSettings((current) => ({ ...current, session: !current.session }))} />
                        <SettingToggle icon={MessageCircle} title="Chat messages" text="New patient messages and replies." checked={notificationSettings.messages} onToggle={() => setNotificationSettings((current) => ({ ...current, messages: !current.messages }))} />
                        <SettingToggle icon={CreditCard} title="Payment updates" text="Payout and platform fee notices." checked={notificationSettings.payments} onToggle={() => setNotificationSettings((current) => ({ ...current, payments: !current.payments }))} />
                        <SettingToggle icon={AlertTriangle} title="Emergency alerts" text="SOS and safety escalation notices." checked={notificationSettings.emergency} onToggle={() => setNotificationSettings((current) => ({ ...current, emergency: !current.emergency }))} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
};

function Metric({ title, value, icon: Icon, tone = "text-primary" }) {
  return (
    <Card className="glass-card dashboard-card-motion">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`h-4 w-4 ${tone}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-xl bg-foreground/5 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-foreground/55">{label}</div>
    </div>
  );
}

function StatusTile({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-lg font-bold capitalize">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-glass-border/60 bg-background/45 p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-sm text-foreground/60">{text}</p>
    </div>
  );
}

function RequestRow({ appointment, onConfirm, onDecline, onMeet }) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
          <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time}</div>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
        </div>
        <Badge className={statusTone[appointment.status] || statusTone.pending}>{appointment.status}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onMeet}>
          <Video className="mr-1 h-4 w-4" />
          Add Meet
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>Reject</Button>
      </div>
    </div>
  );
}

function UpcomingAppointmentCard({ appointment, draft, onDraft, onReschedule, onMeet }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  return (
    <div className="dashboard-card-motion rounded-2xl border border-glass-border/40 bg-background/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{appointment.studentName || appointment.studentEmail || "User"}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AppointmentInfo label="User name" value={appointment.studentName || appointment.studentEmail || "Hidden user"} />
            <AppointmentInfo label="Session type" value={appointment.supportPlanName || "Counselling package"} />
            <AppointmentInfo label="Date & time" value={`${appointment.date} at ${appointment.time}`} />
            <AppointmentInfo label="Counselling mode" value={counsellingModeLabel(appointment.mode)} />
          </div>
        </div>
        <div className="w-full space-y-2 lg:w-56">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.date || ""} onChange={(event) => onDraft("date", event.target.value)} />
            <Input type="time" value={draft.time || ""} onChange={(event) => onDraft("time", event.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={onReschedule}>
            Reschedule
          </Button>
          {appointment.meetingLink ? (
            <Button size="sm" className="w-full" asChild>
              <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                <LinkIcon className="mr-1 h-4 w-4" />
                Open Meet
              </a>
            </Button>
          ) : appointment.mode === "google-meet" || appointment.mode === "online" ? (
            <Button size="sm" className="w-full" onClick={onMeet}>
              <Video className="mr-1 h-4 w-4" />
              Save Meet
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AppointmentInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/45">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value || "Not available"}</div>
    </div>
  );
}

function AvailabilityManager({
  bookingEnabled,
  setBookingEnabled,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  unavailableDates,
  unavailableDateDraft,
  setUnavailableDateDraft,
  onAddUnavailableDate,
  onRemoveUnavailableDate,
  onSave,
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-secondary" />
          Availability Management
        </CardTitle>
        <CardDescription>Set available days, add time slots, mark unavailable dates, and enable or disable bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setBookingEnabled(!bookingEnabled)}
          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
            bookingEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"
          }`}
        >
          <span>
            <span className="block font-semibold">{bookingEnabled ? "Booking availability enabled" : "Booking availability paused"}</span>
            <span className="mt-1 block text-xs text-foreground/60">Users can book only when this is enabled.</span>
          </span>
          <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
        </button>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-glass-border/40 bg-background/60 p-3 sm:grid-cols-[1fr_90px_90px_36px]">
              <Select value={row.day} onValueChange={(value) => onRowChange(row.id, "day", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" value={row.start} onChange={(event) => onRowChange(row.id, "start", event.target.value)} />
              <Input type="time" value={row.end} onChange={(event) => onRowChange(row.id, "end", event.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => onRemoveRow(row.id)} aria-label="Remove availability slot">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={onAddRow}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add available time slot
          </Button>
        </div>

        <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3">
          <div className="text-sm font-semibold">Unavailable dates</div>
          <div className="mt-3 flex gap-2">
            <Input type="date" value={unavailableDateDraft} onChange={(event) => setUnavailableDateDraft(event.target.value)} />
            <Button type="button" variant="outline" onClick={onAddUnavailableDate}>
              Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unavailableDates.length ? (
              unavailableDates.map((date) => (
                <button
                  type="button"
                  key={date}
                  onClick={() => onRemoveUnavailableDate(date)}
                  className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-500"
                >
                  {date} x
                </button>
              ))
            ) : (
              <span className="text-xs text-foreground/55">No unavailable dates marked.</span>
            )}
          </div>
        </div>

        <Button onClick={onSave} className="w-full">
          Save availability
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionCard({ appointment, draft, onDraft, onReschedule, onComplete, onCancel, onMeet }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{appointment.studentName || appointment.studentEmail}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
            <Badge className="bg-foreground/10 text-foreground">{counsellingModeLabel(appointment.mode)}</Badge>
            <Badge variant="secondary">{appointment.supportPlanName || "Counselling package"}</Badge>
          </div>
          <p className="mt-1 text-sm text-foreground/60">{appointment.date} at {appointment.time}</p>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
          {appointment.notes && <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-foreground/70">Note: {appointment.notes}</p>}
        </div>

        <div className="w-full space-y-3 xl:w-[360px]">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.date || ""} onChange={(event) => onDraft("date", event.target.value)} />
            <Input type="time" value={draft.time || ""} onChange={(event) => onDraft("time", event.target.value)} />
          </div>
          {!appointment.meetingLink && appointment.mode !== "in-person" && (
            <Input
              value={draft.meetingLink || ""}
              onChange={(event) => onDraft("meetingLink", event.target.value)}
              placeholder="Paste shared Google Meet room link"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
            {appointment.meetingLink ? (
              <Button size="sm" variant="outline" asChild>
                <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                  <LinkIcon className="mr-1 h-4 w-4" />
                  Open same Meet
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onMeet}>
                <Video className="mr-1 h-4 w-4" />
                Save Meet
              </Button>
            )}
            {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
            {!["cancelled", "completed"].includes(appointment.status) && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ appointment }) {
  return (
    <div className="flex gap-3 rounded-lg bg-foreground/5 p-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{appointment.date} at {appointment.time}</div>
        <div className="text-xs text-foreground/60">{appointment.status} - {appointment.mode}</div>
        {appointment.supportPlanName && <div className="mt-1 text-xs text-foreground/60">Plan: {appointment.supportPlanName}</div>}
        {appointment.concern && <div className="mt-1 line-clamp-2 text-xs text-foreground/70">{appointment.concern}</div>}
      </div>
    </div>
  );
}

function WellnessMiniLine({ label, value, color = "text-foreground/70" }) {
  return (
    <div className="flex items-center justify-between border-b border-glass-border/20 pb-2 last:border-0">
      <span className="text-[11px] text-foreground/50 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-medium ${color} text-right max-w-[55%] truncate`}>{value}</span>
    </div>
  );
}

function PatientDetailLine({ label, value }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/70 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "Not available"}</div>
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground/75">{label}</span>
        <span className="font-semibold">{Math.round(value || 0)}%</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, Number(value) || 0))} />
    </div>
  );
}









function SettingToggle({ icon: Icon, title, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40"
    >
      <span className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
            checked ? "border-primary/30 bg-primary/10 text-primary" : "border-glass-border/30 bg-background/40 text-foreground/50"
          }`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span>
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-sm text-foreground/65">{text}</span>
        </span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-foreground/20"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function ProfileLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-3 text-sm">
      <span className="text-foreground/60">{label}</span>
      <span className="max-w-[65%] text-right font-medium capitalize">{value || "Not set"}</span>
    </div>
  );
}

function TransactionRow({ txn }) {
  const date = txn.date ? new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  return (
    <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3 transition hover:bg-background/80">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
          {txn.patientAvatar ? (
            <img src={txn.patientAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <CreditCard className="h-4 w-4 text-emerald-500" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">{txn.patientName || "Anonymous"}</div>
          <div className="text-xs text-foreground/55">{date} • {txn.plan || "Session"}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-emerald-500">{formatMoney(txn.amount)}</div>
        <div className="text-xs text-foreground/50">{txn.status === "paid" ? "Completed" : txn.status}</div>
      </div>
    </div>
  );
}

function TransactionRowEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-glass-border/40 bg-background/40 p-6 text-center">
      <History className="mx-auto h-8 w-8 text-primary/50" />
      <div className="mt-2 text-sm font-medium">No transactions yet</div>
      <p className="mt-1 text-xs text-foreground/55">Complete sessions will show earnings here.</p>
    </div>
  );
}

// Reviews Section Components
function ReviewStatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4 text-center">
      <Icon className={`mx-auto h-6 w-6 ${color}`} />
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-xs text-foreground/55">{label}</div>
    </div>
  );
}

function ReviewCard({ review, index }) {
  const delay = index * 100;
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4 transition-all duration-300 hover:border-glass-border/60 hover:shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white">
              {initials(review.studentName || "U")}
            </div>
            <div>
              <div className="font-semibold">{review.studentName || "Anonymous user"}</div>
              <div className="text-xs text-foreground/55">{review.date ? new Date(review.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}</div>
            </div>
          </div>
          {review.comment && <p className="mt-3 text-sm text-foreground/70">{review.comment}</p>}
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < Math.floor(review.rating || 0) ? "fill-amber-500 text-amber-500" : "text-foreground/20"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ReviewMetricBar label="Professionalism" value={review.professionalism || 0} icon={BadgeCheck} />
        <ReviewMetricBar label="Helpfulness" value={review.helpfulness || 0} icon={Heart} />
        <ReviewMetricBar label="Communication" value={review.communication || 0} icon={MessageCircle} />
      </div>
    </div>
  );
}

function ReviewMetricBar({ label, value, icon: Icon }) {
  const percentage = Math.round((value || 0) * 20);
  const getColor = () => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 60) return "text-amber-500";
    return "text-rose-500";
  };
  
  return (
    <div className="rounded-xl border border-glass-border/30 bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${getColor()}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${getColor()}`}>{percentage}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-glass-border/30 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 80 ? "bg-emerald-500" : percentage >= 60 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CounsellorResources() {
  const { toast } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/resources/mine");
      setResources(data);
    } catch { toast({ variant: "destructive", title: "Failed to load resources" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ variant: "destructive", title: "Title and URL are required" }); return;
    }
    const payload = { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
    try {
      if (editing) {
        await api.patch(`/api/resources/${editing}`, payload);
        toast({ title: "Resource updated" });
      } else {
        await api.post("/api/resources", payload);
        toast({ title: "Resource created" });
      }
      setShowForm(false); setEditing(null); setForm({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" });
      load();
    } catch (e) { toast({ variant: "destructive", title: "Failed to save", description: e?.response?.data?.error || e.message }); }
  }

  async function remove(id) {
    try {
      await api.delete(`/api/resources/${id}`);
      toast({ title: "Resource deleted" });
      load();
    } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
  }

  const typeIcon = (t) => ({ video: Video, article: FileText, audiobook: Headphones, audio: Volume2, pdf: File, blog: FileText }[t] || FileText);

  if (loading) return <div className="p-8 text-center text-foreground/50">Loading resources...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            My Resources
          </h3>
          <p className="text-sm text-foreground/60">Manage videos, audiobooks, PDFs, and articles you share with users</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" }); }} className="gap-2">
          {showForm ? "Cancel" : <><Upload className="h-4 w-4" /> Add Resource</>}
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing ? "Edit" : "New"} Resource</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Title *</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Resource title" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["article", "blog", "video", "audiobook", "audio", "pdf"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category</label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Anxiety, Sleep" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Language</label>
                <Input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="English" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">URL *</label>
                <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Thumbnail URL</label>
                <Input value={form.thumbnail} onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Duration (min)</label>
                <Input type="number" min={1} value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) || 5 }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Tags (comma-separated)</label>
                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="meditation, stress, sleep" />
              </div>
            </div>
            <Button onClick={save} className="gap-2"><Plus className="h-4 w-4" /> {editing ? "Update" : "Create"} Resource</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {resources.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-foreground/50">No resources yet. Click "Add Resource" to create one.</CardContent></Card>
        ) : resources.map((r) => {
          const Icon = typeIcon(r.type);
          return (
            <Card key={r._id} className="glass-card">
              <CardContent className="p-4 flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-foreground/50 flex items-center gap-2">
                    <span className="capitalize">{r.type}</span>
                    <span>·</span>
                    <span>{r.category}</span>
                    {r.language && <><span>·</span><span>{r.language}</span></>}
                    {r.durationMin > 0 && <><span>·</span><span>{r.durationMin} min</span></>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditing(r._id);
                    setForm({ title: r.title, type: r.type, category: r.category, language: r.language, url: r.url, thumbnail: r.thumbnail || "", description: r.description || "", durationMin: r.durationMin || 5, tags: (r.tags || []).join(", ") });
                    setShowForm(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default CounsellorDashboard;
