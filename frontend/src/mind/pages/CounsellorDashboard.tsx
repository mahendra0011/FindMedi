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
import ProviderSettingsMaster, { defaultProviderSettings } from "@/mind/components/ProviderSettingsMaster";
import { setCounsellorEarningsFromDashboard, selectCounsellorEarnings, selectRevenueTransactions, selectRevenueMonthlyTrends } from "@/mind/store/revenueSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";
import { CounsellorResources } from "@/mind/components/CounsellorResources";
import { ProviderSettingsTab } from "@/mind/components/dashboard/ProviderSettingsTab";
import { ProviderPackagesTab } from "@/mind/components/dashboard/ProviderPackagesTab";
import { ProviderPatientsTab } from "@/mind/components/dashboard/ProviderPatientsTab";
import { ProviderNotesTab } from "@/mind/components/dashboard/ProviderNotesTab";
import { ProviderSessionsTab } from "@/mind/components/dashboard/ProviderSessionsTab";
import { SessionCard, TimelineItem, WellnessMiniLine, PatientDetailLine, ProgressRow, SettingToggle, ProfileLine, TransactionRow, TransactionRowEmpty, ReviewStatCard, ReviewCard, ReviewMetricBar, AppointmentInfo, AvailabilityManager } from "@/mind/components/ProviderDashboardComponents";

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


// PS-5: shared helpers live in @/mind/lib/providerDashboardShared (single source).
import {
  noteTemplates,
  statusTone,
  defaultPrivacySettings,
  defaultNotificationSettings,
  dayOptions,
  packagePricePlans,
  defaultPackagePrices,
  newAvailabilityRow,
  parseAvailabilityRows,
  serializeAvailabilityRows,
  todayYMD,
  formatMoney,
  normalizePackagePrices,
  fallbackBaseSessionPrice,
  counsellorPayout,
  sessionStatusLabel,
  counsellingModeLabel,
  modeLabel,
  initials,
  normalizeNotification,
} from "@/mind/lib/providerDashboardShared";
const CounsellorDashboard = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const _rawTab = searchParams.get("tab") || "sessions";
  const activeTab = ["sessions","packages","patients","notes","resources","settings"].includes(_rawTab) ? _rawTab : "sessions";
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
  const [providerSettings, setProviderSettings] = useState(defaultProviderSettings);
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
      setProviderSettings({
        ...defaultProviderSettings,
        ...(next.profile?.providerSettings || {}),
        payoutBank: { ...defaultProviderSettings.payoutBank, ...(next.profile?.providerSettings?.payoutBank || {}) },
      });
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

  // B6-13: debounce socket-triggered reloads — burst of message:new events
  // must not fire a full 8-query dashboard load each time.
  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    let timer: number | undefined;
    let lastRun = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - lastRun < 5000) {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          lastRun = Date.now();
          void load();
        }, 5000);
        return;
      }
      lastRun = now;
      void load();
    };
    socket.on("message:new", refresh);
    return () => {
      socket.off("message:new", refresh);
      if (timer) window.clearTimeout(timer);
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
          providerSettings: {
            ...providerSettings,
            decompressionGapMin: Number(providerSettings.decompressionGapMin) || 0,
            payoutBank: { ...providerSettings.payoutBank },
          },
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
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>



              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <ProviderSessionsTab
                  toolkitContent={
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => setSearchParams({ tab: "notes" })}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-teal-500" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">Integrated</span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">PHQ-9/GAD-7</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Clinical Screenings</p>
                        </div>
                      </div>

                      <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => setSearchParams({ tab: "notes" })}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Templates</span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">SOAP Notes</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Session Documentation</p>
                        </div>
                      </div>

                      <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-violet-500" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">Active</span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">Comms Log</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Client Interactions</p>
                        </div>
                      </div>

                      <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">Insights</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Therapy Progress Tracker</p>
                        </div>
                      </div>
                    </div>
                  }
                  upcomingAppointments={upcomingAppointments}
                  getPackageBadgeLabel={getPackageBadgeLabel}
                  sessionDrafts={sessionDrafts}
                  updateDraft={updateDraft}
                  rescheduleAppointment={rescheduleAppointment}
                  createMeet={createMeet}
                  setActiveChatPeer={setActiveChatPeer}
                  setActiveChatPeerName={setActiveChatPeerName}
                  setSearchParams={setSearchParams}
                  pending={pending}
                  updateAppointment={updateAppointment}
                  sessionSearch={sessionSearch}
                  setSessionSearch={setSessionSearch}
                  sessionTypeFilter={sessionTypeFilter}
                  setSessionTypeFilter={setSessionTypeFilter}
                  sessionFilter={sessionFilter}
                  setSessionFilter={setSessionFilter}
                  filteredSessions={filteredSessions}
                  notes={notes}
                />
              </TabsContent>

              <TabsContent value="packages" className="dashboard-tab-motion space-y-6">
                <ProviderPackagesTab
                  packageSummary={packageSummary}
                  packageSearch={packageSearch}
                  setPackageSearch={setPackageSearch}
                  packageStatusFilter={packageStatusFilter}
                  setPackageStatusFilter={setPackageStatusFilter}
                  filteredPackages={filteredPackages}
                  selectedPackageForDetail={selectedPackageForDetail}
                  setSelectedPackageForDetail={setSelectedPackageForDetail}
                  setSearchParams={setSearchParams}
                  appointments={appointments}
                  patients={patients}
                  setSelectedPatientId={setSelectedPatientId}
                  data={data}
                />
              </TabsContent>

              <TabsContent value="patients" className="dashboard-tab-motion space-y-6">
                <ProviderPatientsTab
                  patients={patients}
                  patientRiskFilter={patientRiskFilter}
                  setPatientRiskFilter={setPatientRiskFilter}
                  selectedPatientId={selectedPatientId}
                  setSelectedPatientId={setSelectedPatientId}
                  selectedPatient={selectedPatient}
                  setActiveChatPeer={setActiveChatPeer}
                  setActiveChatPeerName={setActiveChatPeerName}
                  setSearchParams={setSearchParams}
                  selectedPatientSessions={selectedPatientSessions}
                  averageAttendance={averageAttendance}
                />
              </TabsContent>

              <TabsContent value="notes" className="dashboard-tab-motion space-y-6">
                <ProviderNotesTab
                  noteTemplates={noteTemplates}
                  activeSessions={activeSessions}
                  appointments={appointments}
                  notes={notes}
                  setNotes={setNotes}
                  updateAppointment={updateAppointment}
                  toast={toast}
                  statusTone={statusTone}
                  subtitle="Tap a template to fill it into every active session below, then edit per session."
                />

                {/* B6-12: therapy assignments (homework/exercises) for patients */}
                <CounsellorAssignments patients={patients} />
              </TabsContent>





              <TabsContent value="resources" className="dashboard-tab-motion space-y-6">
                <CounsellorResources />
              </TabsContent>

              <TabsContent value="settings" className="dashboard-tab-motion space-y-6">

                <ProviderSettingsTab
                  theme={theme} setTheme={setTheme}
                  data={data}
                  customPackages={customPackages}
                  addCustomPackage={addCustomPackage}
                  updateCustomPackage={updateCustomPackage}
                  deleteCustomPackage={deleteCustomPackage}
                  saveCustomPackages={saveCustomPackages}
                  profileDraft={profileDraft}
                  setProfileDraft={setProfileDraft}
                  uploadingPhoto={uploadingPhoto}
                  uploadProfilePhoto={uploadProfilePhoto}
                  meetLink={meetLink}
                  setMeetLink={setMeetLink}
                  bookingEnabled={bookingEnabled}
                  setBookingEnabled={setBookingEnabled}
                  availabilityRows={availabilityRows}
                  setAvailabilityRows={setAvailabilityRows}
                  unavailableDates={unavailableDates}
                  setUnavailableDates={setUnavailableDates}
                  unavailableDateDraft={unavailableDateDraft}
                  setUnavailableDateDraft={setUnavailableDateDraft}
                  saveProfileTools={saveProfileTools}
                  providerSettings={providerSettings}
                  setProviderSettings={setProviderSettings}
                  privacySettings={privacySettings}
                  setPrivacySettings={setPrivacySettings}
                  notificationSettings={notificationSettings}
                  setNotificationSettings={setNotificationSettings}
                  mode="counsellor"
                />

              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      {/* B6-10: single shared secure-chat dock — one SecureChatPanel instance for
          all tabs, keyed by activeChatPeer. Previously sessions + patients tabs
          each mounted their own panel off the same state. */}
      {activeChatPeer && (
        <div data-chat-dock className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem)]">
          <SecureChatPanel
            key={String(activeChatPeer)}
            peerId={String(activeChatPeer)}
            peerName={activeChatPeerName}
            onClose={() => setActiveChatPeer(null)}
          />
        </div>
      )}
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


// B6-12: therapy assignments (homework/exercises) — counsellor scope.
// Prescriptions stay psychiatrist-only (medical scope).
function CounsellorAssignments({ patients = [] }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: "", title: "", description: "", category: "other", dueDate: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/assignments");
      setAssignments(Array.isArray(data) ? data : []);
    } catch { setAssignments([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.userId || !form.title.trim()) {
      toast({ variant: "destructive", title: "Patient and title required" });
      return;
    }
    try {
      await api.post("/api/assignments", {
        userId: form.userId,
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        dueDate: form.dueDate || undefined,
      });
      toast({ title: "Assignment created" });
      setShowForm(false);
      setForm({ userId: "", title: "", description: "", category: "other", dueDate: "" });
      load();
    } catch (e) { toast({ variant: "destructive", title: "Failed to save assignment", description: e?.response?.data?.error || e.message }); }
  }

  return (
    <Card className="glass-card" data-assignments-card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            Therapy Assignments
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New Assignment"}
          </Button>
        </CardTitle>
        <CardDescription>Homework and exercises for your patients.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-glass-border/30 p-3">
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
              <label className="text-xs font-medium">Due date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Daily breathing exercise" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["other", "exercise", "journal", "reading", "meditation", "exposure"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium">Instructions</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={save} className="gap-2"><Plus className="h-4 w-4" /> Create Assignment</Button>
            </div>
          </div>
        )}
        {loading ? (
          <p className="text-xs text-foreground/50">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-xs text-foreground/50">No assignments yet. Create one for a patient.</p>
        ) : (
          <div className="grid gap-3">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-xl border border-glass-border/30 p-3">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-foreground/50">{a.userName || a.userEmail} · {a.category} · {a.status}{a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-IN")}` : ""}</p>
                {a.description && <p className="mt-1 text-xs text-foreground/60">{a.description}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CounsellorDashboard;
