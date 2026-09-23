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
  Phone,
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
import { useSearchParams } from "react-router-dom";
import { api } from "@/mind/lib/api";
import { getRealtimeSocket } from "@/mind/lib/socket";
import SecureChatPanel from "@/mind/components/SecureChatPanel";
import { setCounsellorEarningsFromDashboard, selectCounsellorEarnings, selectRevenueTransactions, selectRevenueMonthlyTrends } from "@/mind/store/revenueSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";

const fallback = {
  profile: {} as Record<string, any>,
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
  allPackages: [],
  packageSummary: {
    activeCount: 0,
    expiringSoonCount: 0,
    sessionsRemainingTotal: 0,
    packageRevenueThisMonth: 0,
    oneTimeRevenueThisMonth: 0,
    totalRevenueThisMonth: 0,
    totalPackagesCount: 0,
  },
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

function normalizePackagePrices(profile: any = {}) {
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

function fallbackBaseSessionPrice(profile: any = {}) {
  return Number(profile.sessionPricing) || (profile.counsellorType === "mentor" ? 299 : 599);
}

function counsellorPayout(value, commissionRate = 2) {
  return Math.max(0, Math.round(Number(value || 0) * ((100 - Number(commissionRate || 2)) / 100)));
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

const PsychiatristDashboard = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const _rawTab = searchParams.get("tab") || "sessions";
  const activeTab = ["sessions","packages","patients","notes","prescriptions","resources","settings"].includes(_rawTab) ? _rawTab : "sessions";
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
  const [sessionTypeFilter, setSessionTypeFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [patientRiskFilter, setPatientRiskFilter] = useState("all");
  const [packageSearch, setPackageSearch] = useState("");
  const [packageStatusFilter, setPackageStatusFilter] = useState("all");
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState(null);
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
  const [activeChatPeer, setActiveChatPeer] = useState<string | null>(null);
  const [activeChatPeerName, setActiveChatPeerName] = useState<string>("");

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

  const allPackages = useMemo(() => data.allPackages || [], [data.allPackages]);
  const packageSummary = useMemo(() => data.packageSummary || {
    activeCount: 0,
    expiringSoonCount: 0,
    sessionsRemainingTotal: 0,
    packageRevenueThisMonth: 0,
    oneTimeRevenueThisMonth: 0,
    totalRevenueThisMonth: 0,
    totalPackagesCount: 0,
  }, [data.packageSummary]);

  // Helper: get display label for package session badge e.g. "📦 Package Session 3/8"
  const getPackageBadgeLabel = useCallback((appointment) => {
    if (!appointment?.packageId) return null;
    const pkg = allPackages.find((p) => String(p.id) === String(appointment.packageId));
    if (!pkg) return "📦 Package Session";
    // Position among sessions of same package (sorted chronologically)
    const related = appointments
      .filter((a) => String(a.packageId) === String(appointment.packageId))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const idx = related.findIndex((a) => String(a.id) === String(appointment.id));
    if (idx >= 0 && pkg.sessionsTotal) {
      return `📦 Package ${idx + 1}/${pkg.sessionsTotal}`;
    }
    return `📦 Package ${pkg.sessionsUsed}/${pkg.sessionsTotal}`;
  }, [allPackages, appointments]);

  const filteredPackages = useMemo(() => {
    const q = packageSearch.trim().toLowerCase();
    const nowTime = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return allPackages.filter((pkg) => {
      let statusMatches = true;
      if (packageStatusFilter === "active") statusMatches = pkg.status === "active";
      else if (packageStatusFilter === "completed") statusMatches = pkg.status === "completed";
      else if (packageStatusFilter === "cancelled") statusMatches = ["cancelled", "refunded"].includes(pkg.status);
      else if (packageStatusFilter === "expiring") {
        if (pkg.status !== "active" || !pkg.expiryDate) statusMatches = false;
        else {
          const diff = new Date(pkg.expiryDate).getTime() - nowTime;
          statusMatches = diff > 0 && diff <= sevenDaysMs;
        }
      }
      const text = `${pkg.userName} ${pkg.userEmail} ${pkg.planName} ${pkg.status}`.toLowerCase();
      return statusMatches && (!q || text.includes(q));
    });
  }, [allPackages, packageStatusFilter, packageSearch]);

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const statusOk = sessionFilter === "all" || appointment.status === sessionFilter;
      const typeOk =
        sessionTypeFilter === "all" ||
        (sessionTypeFilter === "package" && Boolean(appointment.packageId)) ||
        (sessionTypeFilter === "onetime" && !appointment.packageId);
      const text = `${appointment.studentName} ${appointment.studentEmail} ${appointment.concern} ${appointment.date} ${appointment.time}`.toLowerCase();
      return statusOk && typeOk && (!query || text.includes(query));
    });
  }, [appointments, sessionFilter, sessionTypeFilter, sessionSearch]);

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
            <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-5">
              <TabsList className="hidden">
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="packages">Packages</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>



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
                          packageBadge={getPackageBadgeLabel(appointment)}
                          draft={sessionDrafts[appointment.id] || {}}
                          onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                          onReschedule={() => rescheduleAppointment(appointment)}
                          onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                          onChat={(peerId, name) => { setActiveChatPeer(String(peerId)); setActiveChatPeerName(name || appointment.studentName || ""); setSearchParams({ tab: "sessions" }); }}
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
                      <CardDescription>Accept or reject requests. Add Meet for video, Chat for chat modes. Reschedule from Session Schedule below.</CardDescription>
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
                            onChat={(peerId, name) => { setActiveChatPeer(String(peerId)); setActiveChatPeerName(name || appointment.studentName || ""); }}
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
                          <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                            <SelectTrigger className="w-full sm:w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="package">Package Only</SelectItem>
                              <SelectItem value="onetime">One-Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={sessionFilter} onValueChange={setSessionFilter}>
                            <SelectTrigger className="w-full sm:w-36">
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
                    {activeChatPeer && (
                      <div className="mb-4">
                        <SecureChatPanel peerId={activeChatPeer} peerName={activeChatPeerName} onClose={() => setActiveChatPeer(null)} />
                      </div>
                    )}
                    <CardContent className="space-y-3">
                      {filteredSessions.length ? (
                        filteredSessions.map((appointment) => (
                          <SessionCard
                            key={appointment.id}
                            appointment={appointment}
                            packageBadge={getPackageBadgeLabel(appointment)}
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
                            onChat={(peerId, name) => { setActiveChatPeer(String(peerId)); setActiveChatPeerName(name || appointment.studentName || ""); }}
                          />
                        ))
                      ) : (
                        <EmptyState icon={CalendarCheck} title="No sessions found" text="Try another status or search term." />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="dashboard-tab-motion space-y-6">
                {/* 1. Summary Strip */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <Card className="glass-card dashboard-card-motion border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                        <Package className="h-4 w-4 text-primary" />
                        Active Packages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-extrabold text-foreground tracking-tight">
                        {packageSummary.activeCount}
                      </div>
                      <p className="mt-1 text-xs text-foreground/50">
                        {packageSummary.totalPackagesCount} all-time purchased
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card dashboard-card-motion border-cyan-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        Sessions Remaining
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-extrabold text-cyan-400 tracking-tight">
                        {packageSummary.sessionsRemainingTotal}
                      </div>
                      <p className="mt-1 text-xs text-foreground/50">Across all active packages</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card dashboard-card-motion border-amber-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                        <Clock className="h-4 w-4 text-amber-400" />
                        Expiring Soon
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
                          {packageSummary.expiringSoonCount}
                        </span>
                        {packageSummary.expiringSoonCount > 0 && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-foreground/50">Within the next 7 days</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card dashboard-card-motion border-emerald-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                        <IndianRupee className="h-4 w-4 text-emerald-400" />
                        Revenue Split
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const pkgRev = Number(packageSummary.packageRevenueThisMonth || 0);
                        const oneRev = Number(packageSummary.oneTimeRevenueThisMonth || 0);
                        const total = pkgRev + oneRev;
                        const pkgPct = total > 0 ? Math.round((pkgRev / total) * 100) : 0;
                        const onePct = 100 - pkgPct;
                        return (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-extrabold text-emerald-400 tracking-tight">{formatMoney(total)}</span>
                              <span className="text-[10px] text-foreground/40">this month</span>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-foreground/10 overflow-hidden flex">
                              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pkgPct}%` }} />
                              <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${onePct}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Package {formatMoney(pkgRev)} ({pkgPct}%)
                              </span>
                              <span className="flex items-center gap-1.5 font-medium text-sky-400">
                                <span className="h-2 w-2 rounded-full bg-sky-500" /> One-Time {formatMoney(oneRev)} ({onePct}%)
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Package List with Search & Filters */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          Consultation Packages
                        </CardTitle>
                        <CardDescription>
                          Track purchased plans, session consumption, cadence rules, and client progress.
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                          <Input
                            className="pl-9 w-full sm:w-56"
                            value={packageSearch}
                            onChange={(e) => setPackageSearch(e.target.value)}
                            placeholder="Search client or plan..."
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { key: "all", label: "All" },
                            { key: "active", label: "Active" },
                            { key: "expiring", label: "Expiring Soon" },
                            { key: "completed", label: "Completed" },
                            { key: "cancelled", label: "Cancelled" },
                          ].map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setPackageStatusFilter(f.key)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                packageStatusFilter === f.key
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {filteredPackages.length ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredPackages.map((pkg) => {
                          const nowTime = Date.now();
                          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                          const isExpiringSoon =
                            pkg.status === "active" &&
                            pkg.expiryDate &&
                            new Date(pkg.expiryDate).getTime() - nowTime > 0 &&
                            new Date(pkg.expiryDate).getTime() - nowTime <= sevenDaysMs;

                          return (
                            <div
                              key={pkg.id}
                              className="dashboard-card-motion group relative flex flex-col justify-between rounded-2xl border border-glass-border/40 bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-lg"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="font-semibold text-sm truncate">{pkg.userName}</h4>
                                      {pkg.mode && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                          {counsellingModeLabel(pkg.mode)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-foreground/50 truncate mt-0.5">{pkg.userEmail}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] capitalize px-2 py-0.5 font-medium ${
                                        pkg.status === "active"
                                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                          : pkg.status === "completed"
                                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                      }`}
                                    >
                                      {pkg.status}
                                    </Badge>
                                    {isExpiringSoon && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                        Expiring Soon
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-3 rounded-xl bg-foreground/5 p-2.5">
                                  <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="font-semibold text-foreground/90">{pkg.planName}</span>
                                    <span className="font-medium text-foreground/60">{formatMoney(pkg.price)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-foreground/65 mb-1.5">
                                    <span>
                                      Progress: {pkg.sessionsUsed}/{pkg.sessionsTotal} sessions
                                    </span>
                                    <span className="font-semibold text-primary">
                                      {pkg.sessionsRemaining} left
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-primary to-cyan-400 transition-all duration-500 ease-out"
                                      style={{ width: `${Math.min(100, pkg.progress || 0)}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 space-y-1.5 text-xs text-foreground/60">
                                  {pkg.expiryDate && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Valid Until</span>
                                      <span className="font-medium">
                                        {new Date(pkg.expiryDate).toLocaleDateString("en-IN", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {pkg.minCadenceDays > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Cadence Rule</span>
                                      <span className="font-medium">Min {pkg.minCadenceDays}d between sessions</span>
                                    </div>
                                  )}
                                  {pkg.lastSessionDate && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Last Session</span>
                                      <span className="font-medium">
                                        {new Date(pkg.lastSessionDate).toLocaleDateString("en-IN", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-glass-border/25 flex items-center justify-between gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs gap-1.5"
                                  onClick={() => setSelectedPackageForDetail(pkg)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Package Details
                                </Button>
                                {pkg.status === "active" && pkg.sessionsRemaining > 0 && (
                                  <Button
                                    size="sm"
                                    className="w-full text-xs gap-1.5"
                                    onClick={() => setSearchParams({ tab: "sessions" })}
                                  >
                                    <CalendarCheck className="h-3.5 w-3.5" />
                                    Sessions
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Package}
                        title="No packages found"
                        text={packageSearch || packageStatusFilter !== "all" ? "Try adjusting your filter or search query." : "When clients buy packages from your profile, they will appear here."}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* 3. Package Detail Modal / Drawer */}
                {selectedPackageForDetail && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
                    onClick={() => setSelectedPackageForDetail(null)}
                  >
                    <div
                      className="glass-card relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-glass-border/50 bg-background/95 p-6 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between border-b border-glass-border/30 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Package className="h-6 w-6" />
                          </span>
                          <div>
                            <h3 className="text-lg font-bold">{selectedPackageForDetail.planName}</h3>
                            <p className="text-xs text-foreground/50">
                              Client: {selectedPackageForDetail.userName} ({selectedPackageForDetail.userEmail})
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0"
                          onClick={() => setSelectedPackageForDetail(null)}
                        >
                          ✕
                        </Button>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-foreground/50">Status</div>
                            <div className="mt-1 font-bold capitalize text-primary">
                              {selectedPackageForDetail.status}
                            </div>
                          </div>
                          <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-foreground/50">Total Sessions</div>
                            <div className="mt-1 font-bold">{selectedPackageForDetail.sessionsTotal}</div>
                          </div>
                          <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-foreground/50">Remaining</div>
                            <div className="mt-1 font-bold text-emerald-400">
                              {selectedPackageForDetail.sessionsRemaining}
                            </div>
                          </div>
                          <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-foreground/50">Price</div>
                            <div className="mt-1 font-bold">{formatMoney(selectedPackageForDetail.price)}</div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-glass-border/30 bg-background/60 p-4 space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                            Cadence & Booking Rules
                          </h4>
                          <p className="text-xs text-foreground/75">
                            • Cadence interval: {selectedPackageForDetail.minCadenceDays > 0 ? `Minimum ${selectedPackageForDetail.minCadenceDays} days between consecutive bookings` : "No cooldown constraint"}.
                          </p>
                          <p className="text-xs text-foreground/75">
                            • Auto-Confirmation: All package bookings automatically reserve confirmed slots without 409 multi-booking restrictions.
                          </p>
                          {selectedPackageForDetail.expiryDate && (
                            <p className="text-xs text-foreground/75">
                              • Expiry date: {new Date(selectedPackageForDetail.expiryDate).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}.
                            </p>
                          )}
                        </div>

                        {/* Linked Sessions for this package */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                            Linked Sessions In This Package
                          </h4>
                          {(() => {
                            const linkedSessions = appointments.filter(
                              (a) =>
                                a.packageId === selectedPackageForDetail.id ||
                                (a.studentEmail === selectedPackageForDetail.userEmail && a.supportPlanName === selectedPackageForDetail.planName)
                            );
                            if (!linkedSessions.length) {
                              return (
                                <p className="text-xs text-foreground/50 italic py-2">
                                  No session bookings recorded under this package yet.
                                </p>
                              );
                            }
                            return (
                              <div className="space-y-2 max-h-48 overflow-y-auto chat-scrollbar pr-1">
                                {linkedSessions.map((session, sIdx) => (
                                  <div
                                    key={session.id || sIdx}
                                    className="flex items-center justify-between rounded-xl border border-glass-border/20 bg-background/60 p-2.5 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-primary">#{sIdx + 1}</span>
                                      <span>{session.date} at {session.time}</span>
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                        {counsellingModeLabel(session.mode)}
                                      </Badge>
                                    </div>
                                    <Badge className={statusTone[session.status] || statusTone.upcoming}>
                                      {session.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-glass-border/30 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPackageForDetail(null)}
                        >
                          Close
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPackageForDetail(null);
                            const pt = patients.find(p => p.email === selectedPackageForDetail.userEmail || p.id === selectedPackageForDetail.userId);
                            if (pt) setSelectedPatientId(pt.id);
                            setSearchParams({ tab: "patients" });
                          }}
                        >
                          View Patient Care Profile →
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Package Notifications — grouped by package lifecycle */}
                {(() => {
                  const packageNotifs = (data.notifications || []).filter(
                    (n) =>
                      n.metadata?.packageId ||
                      /package/i.test(n.title || "") ||
                      /package/i.test(n.message || "")
                  );
                  if (!packageNotifs.length) return null;
                  return (
                    <Card className="glass-card border-violet-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Bell className="h-4 w-4 text-violet-400" />
                          Package Notifications
                          <Badge variant="secondary" className="ml-auto text-xs">{packageNotifs.length}</Badge>
                        </CardTitle>
                        <CardDescription>Purchase, session booked, refund & expiry alerts — package-specific</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {packageNotifs.slice(0, 6).map((n, idx) => (
                          <div key={n._id || idx} className="flex items-start gap-3 rounded-xl border border-glass-border/30 bg-background/60 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                              <Package className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate">{n.title}</span>
                                {n.type === "payment" && (
                                  <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">payment</Badge>
                                )}
                                {n.type === "booking" && (
                                  <Badge variant="outline" className="text-[9px] h-4 border-sky-500/30 bg-sky-500/10 text-sky-400">booking</Badge>
                                )}
                              </div>
                              <p className="text-xs text-foreground/60 line-clamp-2 mt-0.5">{n.message}</p>
                              <p className="text-[10px] text-foreground/40 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })()}
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
                                setPatientRiskFilter(filter);
                                if (filter === "all") setSelectedPatientId(patients[0]?.id || "");
                                else {
                                  const found = patients.filter((p) => (p.risk || "low") === filter);
                                  if (found.length) setSelectedPatientId(found[0].id);
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-medium capitalize transition ${
                                patientRiskFilter === filter ? "bg-primary/15 text-primary" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                              }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto chat-scrollbar">
                      {(patientRiskFilter === "all" ? patients : patients.filter((p) => (p.risk || "low") === patientRiskFilter)).map((patient, idx) => {
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
                                  {(() => {
                                    const activeCount = patient.packages?.filter((p) => p.status === "active").length || 0;
                                    if (!activeCount) return null;
                                    return (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shrink-0 font-medium">
                                        📦 {activeCount > 1 ? `${activeCount} pkgs` : "1 pkg"}
                                      </Badge>
                                    );
                                  })()}
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
                                    {pkg.status === "active" && pkg.sessionsRemaining > 0 && (
                                      <div className="mt-3 pt-2 border-t border-glass-border/20 flex items-center justify-between">
                                        {(() => {
                                          if (pkg.lastSessionDate && pkg.minCadenceDays > 0) {
                                            const lastDate = new Date(pkg.lastSessionDate).getTime();
                                            const nextAvail = lastDate + pkg.minCadenceDays * 24 * 60 * 60 * 1000;
                                            const diffDays = Math.ceil((nextAvail - Date.now()) / (24 * 60 * 60 * 1000));
                                            if (diffDays > 0) {
                                              return (
                                                <span className="text-[10px] text-amber-500 font-medium">
                                                  Next available in {diffDays} {diffDays === 1 ? "day" : "days"}
                                                </span>
                                              );
                                            }
                                          }
                                          return (
                                            <span className="text-[10px] text-emerald-500 font-medium">
                                              Ready to book next session
                                            </span>
                                          );
                                        })()}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-2 text-[10px] text-primary hover:text-primary"
                                          onClick={() => setSearchParams({ tab: "sessions" })}
                                        >
                                          View Sessions →
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                            {/* Contact Actions — Chat / Voice / Video */}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="gap-1.5" onClick={() => { setActiveChatPeer(String(selectedPatient.id)); setActiveChatPeerName(selectedPatient.name); }}>
                              <MessageCircle className="h-4 w-4" /> Secure Chat
                            </Button>
                            {selectedPatient.phone ? (
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`tel:${selectedPatient.phone}`, "_self")}>
                                <Phone className="h-4 w-4" /> Voice Call
                              </Button>
                            ) : (
                              <Badge variant="outline" className="h-8 px-3 grid place-items-center text-[11px] border-foreground/20 text-foreground/50">No phone on file</Badge>
                            )}
                            {(() => {
                              const nextVideo = (selectedPatient.sessions || []).filter((s) => ["pending", "confirmed"].includes(s.status) && s.meetingLink).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]
                                || (selectedPatientSessions || []).filter((s) => ["pending", "confirmed"].includes(s.status) && s.meetingLink)[0];
                              return nextVideo?.meetingLink ? (
                                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                  <a href={nextVideo.meetingLink} target="_blank" rel="noreferrer">
                                    <Video className="h-4 w-4" /> Join Video
                                  </a>
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSearchParams({ tab: "sessions" })}>
                                  <Video className="h-4 w-4" /> Video in Sessions
                                </Button>
                              );
                            })()}
                            {selectedPatient.email && (
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`mailto:${selectedPatient.email}`)}>
                                <FileText className="h-4 w-4" /> Email
                              </Button>
                            )}
                          </div>
                          {activeChatPeer && String(activeChatPeer) === String(selectedPatient.id) && (
                            <SecureChatPanel peerId={String(activeChatPeer)} peerName={activeChatPeerName} onClose={() => setActiveChatPeer(null)} />
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
                                        <div className="text-[11px] text-foreground/50">{appointment.time} &middot; {counsellingModeLabel(appointment.mode)}</div>
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
                    <p className="text-xs text-foreground/50">Tap a template to fill it into every active session below, then edit per session. Add diagnosis in the note for medical records.</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      {noteTemplates.map((template) => (
                        <button
                          type="button"
                          key={template}
                          title="Fill into all active sessions"
                          onClick={() => {
                            const targets = activeSessions.length ? activeSessions : appointments.slice(0, 3);
                            if (!targets.length) return;
                            setNotes((current) => {
                              const next = { ...current };
                              targets.forEach((t) => { if (!next[t.id]) next[t.id] = template; });
                              return next;
                            });
                            toast({ title: `Template added to ${targets.length} session(s)` });
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





              <TabsContent value="prescriptions" className="dashboard-tab-motion space-y-6">
                <PsychiatristPrescriptions patients={patients} />
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
                                <span className="text-foreground/50">Your payout (after 2% platform fee)</span>
                                <span className="font-semibold text-emerald-500">{formatMoney(counsellorPayout(pkg.price, 2))}</span>
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
                      <CardDescription>Your public psychiatrist card, meeting link, and booking settings.</CardDescription>
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

                      <AvailabilityManager
                        bookingEnabled={bookingEnabled}
                        setBookingEnabled={setBookingEnabled}
                        rows={availabilityRows}
                        onRowChange={(id, key, value) => setAvailabilityRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)))}
                        onAddRow={() => setAvailabilityRows((current) => [...current, newAvailabilityRow(dayOptions[current.length % dayOptions.length], "10:00", "16:00")])}
                        onRemoveRow={(id) => setAvailabilityRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))}
                        unavailableDates={unavailableDates}
                        unavailableDateDraft={unavailableDateDraft}
                        setUnavailableDateDraft={setUnavailableDateDraft}
                        onAddUnavailableDate={() => {
                          if (!unavailableDateDraft || unavailableDates.includes(unavailableDateDraft)) return;
                          setUnavailableDates((current) => [...current, unavailableDateDraft].sort());
                          setUnavailableDateDraft("");
                        }}
                        onRemoveUnavailableDate={(date) => setUnavailableDates((current) => current.filter((item) => item !== date))}
                        onSave={saveProfileTools}
                      />

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
                          <Input className="mt-1.5" value={privacySettings.anonymousDisplayName || ""} onChange={(event) => setPrivacySettings((current) => ({ ...current, anonymousDisplayName: event.target.value }))} placeholder="MindSupport Psychiatrist" />
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

function RequestRow({ appointment, onConfirm, onDecline, onMeet, onChat }) {
  const isVoice = appointment.mode === "voice-call";
  const isChat = appointment.mode === "chat-only" || appointment.mode === "video-chat";
  const isInPerson = appointment.mode === "in-person";
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
          <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time} · {counsellingModeLabel(appointment.mode)}</div>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
        </div>
        <Badge className={statusTone[appointment.status] || statusTone.pending}>{appointment.status}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Accept
        </Button>
        {!isInPerson && !isVoice && !isChat ? (
          <Button size="sm" variant="outline" onClick={onMeet}>
            <Video className="mr-1 h-4 w-4" />
            Add Meet
          </Button>
        ) : isVoice ? (
          <Badge variant="outline" className="h-8 px-3 grid place-items-center border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Voice — no meet needed</Badge>
        ) : isChat ? (
          <Button size="sm" variant="outline" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
            <MessageCircle className="mr-1 h-4 w-4" /> Chat
          </Button>
        ) : (
          <Badge variant="outline" className="h-8 px-3 grid place-items-center">In-person</Badge>
        )}
        <Button size="sm" variant="outline" onClick={onDecline}>Reject</Button>
      </div>
    </div>
  );
}

function UpcomingAppointmentCard({ appointment, packageBadge, draft, onDraft, onReschedule, onMeet, onChat }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  const mode = String(appointment.mode || "google-meet");
  return (
    <div className="dashboard-card-motion rounded-2xl border border-glass-border/40 bg-background/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{appointment.studentName || appointment.studentEmail || "User"}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
            {packageBadge ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                {packageBadge}
              </Badge>
            ) : appointment.packageId ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                📦 Package Session
              </Badge>
            ) : null}
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
          {mode === "chat-only" ? (
            <Button size="sm" className="w-full gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
              <MessageCircle className="mr-1 h-4 w-4" /> Open Chat
            </Button>
          ) : mode === "voice-call" ? (
            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => {
              const tel = appointment.studentPhone || "";
              if (tel) window.open(`tel:${tel}`, "_self");
            }}>
              <Phone className="mr-1 h-4 w-4" /> Voice Call
            </Button>
          ) : mode === "in-person" ? (
            <Badge variant="outline" className="w-full h-9 grid place-items-center border-amber-500/30 text-amber-500">In-person — check clinic address</Badge>
          ) : appointment.meetingLink ? (
            <Button size="sm" className="w-full" asChild>
              <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                <LinkIcon className="mr-1 h-4 w-4" />
                Open Meet
              </a>
            </Button>
          ) : (
            <Button size="sm" className="w-full" onClick={onMeet}>
              <Video className="mr-1 h-4 w-4" />
              Save Meet
            </Button>
          )}
          {(mode === "video-chat" || mode === "google-meet") && (
            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
              <MessageCircle className="mr-1 h-3 w-3" /> Chat
            </Button>
          )}
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

function SessionCard({ appointment, packageBadge, draft, onDraft, onReschedule, onComplete, onCancel, onMeet, onChat }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  const mode = String(appointment.mode || "google-meet");
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{appointment.studentName || appointment.studentEmail}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
            <Badge className="bg-foreground/10 text-foreground">{counsellingModeLabel(appointment.mode)}</Badge>
            <Badge variant="secondary">{appointment.supportPlanName || "Counselling package"}</Badge>
            {packageBadge ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                {packageBadge}
              </Badge>
            ) : appointment.packageId ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                📦 Package Session
              </Badge>
            ) : null}
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
          {mode === "chat-only" ? (
            <Button size="sm" className="w-full gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
              <MessageCircle className="mr-1 h-4 w-4" /> Open Chat
            </Button>
          ) : mode === "voice-call" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                const tel = appointment.studentPhone || "";
                if (tel) window.open(`tel:${tel}`, "_self");
              }}>
                <Phone className="mr-1 h-4 w-4" /> Voice Call
              </Button>
              <Badge variant="outline" className="h-8 px-2 grid place-items-center text-[10px]">No meet link</Badge>
            </div>
          ) : mode === "in-person" ? (
            <Badge variant="outline" className="w-full h-8 grid place-items-center border-amber-500/30 text-amber-500 text-xs">In-person — check clinic address in profile</Badge>
          ) : (
            <>
              {!appointment.meetingLink && (
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
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
                  <MessageCircle className="mr-1 h-3 w-3" /> Chat
                </Button>
                {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
                {!["cancelled", "completed"].includes(appointment.status) && (
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
          {(mode === "chat-only" || mode === "voice-call" || mode === "in-person") && (
            <div className="flex flex-wrap gap-2">
              {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
              {!["cancelled", "completed"].includes(appointment.status) && (
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
            </div>
          )}
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
        <div className="text-xs text-foreground/60">{appointment.status} - {counsellingModeLabel(appointment.mode)}</div>
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









function SettingToggle({ icon: Icon = undefined, title, text, checked, onToggle }: { icon?: any; title: any; text: any; checked: any; onToggle: any }) {
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

function PsychiatristPrescriptions({ patients = [] }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: "", diagnosis: "", clinicName: "", notes: "", followUpDate: "", medicinesText: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/prescriptions");
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.userId || !form.medicinesText.trim()) {
      toast({ variant: "destructive", title: "Patient and medicines required" });
      return;
    }
    const medicines = form.medicinesText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      return { name: parts[0] || line, dosage: parts[1] || "", frequency: parts[2] || "", duration: parts[3] || "", notes: parts[4] || "" };
    });
    try {
      await api.post("/api/prescriptions", {
        userId: form.userId,
        diagnosis: form.diagnosis,
        clinicName: form.clinicName,
        notes: form.notes,
        followUpDate: form.followUpDate || undefined,
        medicines,
      });
      toast({ title: "Prescription created" });
      setShowForm(false);
      setForm({ userId: "", diagnosis: "", clinicName: "", notes: "", followUpDate: "", medicinesText: "" });
      load();
    } catch (e) { toast({ variant: "destructive", title: "Failed to save", description: e?.response?.data?.error || e.message }); }
  }

  if (loading) return <div className="p-8 text-center text-foreground/50">Loading prescriptions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Prescriptions
          </h3>
          <p className="text-sm text-foreground/60">Diagnosis + medicines for your patients (medical scope)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">{showForm ? "Cancel" : <><Plus className="h-4 w-4" /> New Prescription</>}</Button>
      </div>
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Prescription</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Patient *</label>
                <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Follow-up date</label>
                <Input type="date" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Diagnosis</label>
                <Input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Moderate anxiety" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Clinic</label>
                <Input value={form.clinicName} onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))} placeholder="Clinic name" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Medicines * (one per line: Name | Dosage | Frequency | Duration | Notes)</label>
                <Textarea value={form.medicinesText} onChange={(e) => setForm((f) => ({ ...f, medicinesText: e.target.value }))} rows={3} placeholder={"Ativan 1mg | 1mg | Once daily | 14 days | After food"} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Clinical notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <Button onClick={save} className="gap-2"><Plus className="h-4 w-4" /> Create Prescription</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3">
        {items.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-foreground/50">No prescriptions yet. Create one for a patient.</CardContent></Card>
        ) : items.map((r) => (
          <Card key={r.id} className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">{r.diagnosis || "Prescription"} — {r.medicines?.length || 0} medicine(s)</p>
              <p className="text-xs text-foreground/50">{r.clinicName} {r.followUpDate ? `· Follow-up ${new Date(r.followUpDate).toLocaleDateString("en-IN")}` : ""}</p>
              <div className="mt-2 space-y-1">
                {(r.medicines || []).map((m, i) => (
                  <p key={i} className="text-xs text-foreground/70">{m.name} {m.dosage ? `· ${m.dosage}` : ""} {m.frequency ? `· ${m.frequency}` : ""} {m.duration ? `· ${m.duration}` : ""}</p>
                ))}
              </div>
              {r.notes && <p className="mt-2 text-xs text-foreground/60">Notes: {r.notes}</p>}
            </CardContent>
          </Card>
        ))}
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

export default PsychiatristDashboard;
