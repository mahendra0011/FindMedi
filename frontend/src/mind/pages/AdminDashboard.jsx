import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Lightbulb,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCog,
  Users,
  Video,
  X,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/mind/components/ui/dialog";
import { Input } from "@/mind/components/ui/input";
import { Label } from "@/mind/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Textarea } from "@/mind/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mind/components/ui/tabs";
import { useToast } from "@/mind/components/ui/use-toast";
import { api } from "@/mind/lib/api";
import { setAdminRevenueFromDashboard, selectAdminRevenue, selectRevenueMonthlyTrends } from "@/mind/store/revenueSlice";
import { fetchSupportPackages, createSupportPackage, updateSupportPackage, deleteSupportPackage, selectSupportPackages, selectPackagesStatus } from "@/mind/store/packagesSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";

const themeOptions = [
  { id: "default", name: "Midnight Calm", color: "bg-indigo-500" },
  { id: "lavender", name: "Lavender", color: "bg-violet-300" },
  { id: "sky", name: "Sky Blue", color: "bg-sky-300" },
  { id: "mint", name: "Mint Green", color: "bg-emerald-300" },
  { id: "soft", name: "Soft White", color: "bg-zinc-100" },
];

const emptyData = {
  stats: {
    usersByRole: {},
    usersByStatus: {},
    appointmentsByStatus: {},
    appointmentsByMode: {},
    openReports: 0,
    resources: 0,
    totalUsers: 0,
    activeCounsellors: 0,
    totalSessions: 0,
    revenue: 0,
    emergencyAlerts: 0,
    reviewModeration: 0,
    lowRatedCounsellors: 0,
  },
  analytics: { userGrowth: [], sessionTrends: [], revenueTrends: [], demand: [] },
  revenue: { platformRevenue: 0, counsellorPayouts: 0, planRevenue: 0, refundRequests: 0 },
  emergency: [],
  reviews: [],
  activityLogs: [],
  recentUsers: [],
  counsellors: [],
  counsellorApplications: [],
  lowRatedCounsellors: [],
  notifications: [],
  insights: [],
  reports: [],
};

const NOTIFICATION_HTTP_POLL_MS = 30000;

const AdminDashboard = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const adminRevenue = useAppSelector(selectAdminRevenue);
  const revenueMonthlyTrends = useAppSelector(selectRevenueMonthlyTrends);
  const [data, setData] = useState(emptyData);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const packages = useAppSelector(selectSupportPackages);
  const packagesLoading = useAppSelector(selectPackagesStatus) === "loading";
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "user",
    specialization: "",
  });

  const loadPackages = useCallback(() => {
    dispatch(fetchSupportPackages());
  }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, userList, appts, reportsRes] = await Promise.all([
        api.get("/api/admin/dashboard").then(r => r.data),
        api.get("/api/admin/users").then(r => r.data),
        api.get("/api/admin/appointments").then(r => r.data),
        api.get("/api/reports/counsellor").then(r => r.data).catch(() => []),
      ]);
      setData({ ...emptyData, ...dashboard, reports: reportsRes });
      dispatch(setAdminRevenueFromDashboard({ revenue: dashboard.revenue, analytics: dashboard.analytics }));
      setUsers(userList);
      setAppointments(appts);
    } catch (error) {
      toast({ variant: "destructive", title: "Admin data unavailable", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [dispatch, toast]);

  useEffect(() => {
    void load();
    void loadPackages();
  }, [load, loadPackages]);

  useEffect(() => {
    let active = true;
    const pollNotifications = async () => {
      try {
        const { data: list } = await api.get("/api/notifications/my");
        if (active && Array.isArray(list)) {
          setData((current) => ({ ...current, notifications: list }));
        }
      } catch {
        // Keep the latest admin notifications if a background poll fails.
      }
    };
    const timer = window.setInterval(pollNotifications, NOTIFICATION_HTTP_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const totals = useMemo(() => {
    const userCount = data.stats.totalUsers || Object.values(data.stats.usersByRole).reduce((sum, value) => sum + value, 0);
    const appointmentCount = data.stats.totalSessions || Object.values(data.stats.appointmentsByStatus).reduce((sum, value) => sum + value, 0);
    return { userCount, appointmentCount };
  }, [data]);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/users", newUser);
      toast({ title: "Account created", description: `${newUser.role} account is ready.` });
      setNewUser({ name: "", email: "", password: "password123", role: "user", specialization: "" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Create failed", description: error?.message || "" });
    }
  };

  const updateUserStatus = async (user, status) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, { status });
      toast({ title: "Account updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const updateUserDetails = async (user, payload, success = "Account updated") => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, payload);
      toast({ title: success });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const updateReportStatus = async (report, status) => {
    try {
      await api.patch(`/api/reports/counsellor/${report.id}`, { status });
      setData((prev) => ({
        ...prev,
        reports: (prev.reports || []).map((r) => (r.id === report.id ? { ...r, status } : r)),
      }));
      toast({ title: `Report marked as ${status}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update report", description: error?.message || "" });
    }
  };

  const deleteUser = async (user) => {
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      toast({ title: "Account deleted", description: `${user.email} was removed from the platform.` });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error?.message || "" });
    }
  };

  const reviewApplication = async (application, status) => {
    try {
      const { data: result } = await api.patch(`/api/admin/counsellor-applications/${application.id}`, { status });
      toast({
        title: status === "approved" ? "Counsellor approved" : status === "rejected" ? "Application rejected" : "Application updated",
        description: status === "approved" ? `${result.fullName} now has counsellor access.` : undefined,
      });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Review failed", description: error?.message || "" });
    }
  };

  const moderateReview = async (review, status, action) => {
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { status, action });
      toast({
        title: action === "suspend-counsellor" ? "Counsellor suspended" : "Review updated",
        description: `${review.counsellor || "Counsellor"} rating moderation saved.`,
      });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Moderation failed", description: error?.message || "" });
    }
  };

  const exportCSV = (kind = "users") => {
    const rows =
      kind === "sessions"
        ? [["Student", "Counsellor", "Date", "Time", "Status", "Mode"], ...appointments.map((item) => [item.studentEmail, item.counsellorName, item.date, item.time, item.status, item.mode])]
        : kind === "revenue"
          ? [
              ["Metric", "Amount"],
              ["Platform revenue", data.revenue.platformRevenue],
              ["Counsellor payouts", data.revenue.counsellorPayouts],
              ["Plan revenue", data.revenue.planRevenue],
              ["Refund requests", data.revenue.refundRequests],
            ]
          : kind === "counsellors"
            ? [
                ["Name", "Email", "Status", "Badge", "Rating", "Reviews", "Availability"],
                ...data.counsellors.map((item) => [item.name, item.email, item.status, item.verificationBadge || "", item.rating || 0, item.reviews || 0, (item.availability || []).join("; ")]),
              ]
            : [["Name", "Email", "Role", "Status", "OTP Verified"], ...users.map((user) => [user.name, user.email, user.role, user.status || "active", user.otpVerified ? "yes" : "no"])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mindsupport-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

const sendAnnouncement = async () => {
    if (!announcement.trim()) {
      toast({ variant: "destructive", title: "Announcement is empty" });
      return;
    }
    try {
      await api.post("/api/admin/notifications", { audienceRole: "all", title: "MindSupport announcement", message: announcement });
      toast({ title: "Announcement sent", description: "Platform notification is available to all dashboards." });
      setAnnouncement("");
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Announcement failed", description: error?.message || "" });
    }
  };

  const handleAddPackage = async (pkg) => {
    const result = await dispatch(createSupportPackage(pkg));
    if (result.meta.requestStatus === "fulfilled") {
      toast({ title: "Package added", description: `${pkg.name} has been created.` });
      setShowPackageForm(false);
      setEditingPackage(null);
    } else {
      toast({ variant: "destructive", title: "Failed to add package", description: result.payload || "" });
    }
  };

  const handleEditPackage = async (pkg) => {
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleUpdatePackage = async (pkg) => {
    const result = await dispatch(updateSupportPackage(pkg));
    if (result.meta.requestStatus === "fulfilled") {
      toast({ title: "Package updated", description: `${pkg.name} has been updated.` });
      setShowPackageForm(false);
      setEditingPackage(null);
    } else {
      toast({ variant: "destructive", title: "Failed to update package", description: result.payload || "" });
    }
  };

  const handleDeletePackage = async (pkgId) => {
    if (!confirm("Are you sure you want to delete this package? This cannot be undone.")) return;
    const result = await dispatch(deleteSupportPackage(pkgId));
    if (result.meta.requestStatus === "fulfilled") {
      toast({ title: "Package deleted", description: "Package has been removed." });
    } else {
      toast({ variant: "destructive", title: "Failed to delete package", description: result.payload || "" });
    }
  };

  const [newPackage, setNewPackage] = useState({
    id: "",
    name: "",
    summary: "",
    duration: "",
    cadence: "",
    bestFor: [],
    defaultPrice: 0,
    multiplier: 1,
    sessionCount: 1,
    isActive: true,
    theme: "default",
  });

  const savePackage = (e) => {
    e.preventDefault();
    if (editingPackage) {
      handleUpdatePackage(newPackage);
    } else {
      handleAddPackage(newPackage);
    }
  };

  const resetPackageForm = () => {
    setNewPackage({
      id: "",
      name: "",
      summary: "",
      duration: "",
      cadence: "",
      bestFor: [],
      defaultPrice: 0,
      multiplier: 1,
      sessionCount: 1,
      isActive: true,
      theme: "default",
    });
    setEditingPackage(null);
    setShowPackageForm(false);
  };

  useEffect(() => {
    if (editingPackage) {
      setNewPackage({ ...editingPackage });
    }
  }, [editingPackage]);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-2">
        <section className="dashboard-motion py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <GlowPanel className="dashboard-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <Badge className="bg-primary/15 text-primary border border-primary/25">Admin dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    Platform Control Center
                  </h1>
                  <p className="text-foreground/70 mt-2 max-w-2xl">
                    Control users, counsellors, sessions, revenue, emergency reports, reviews, notifications, and security.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => exportCSV("users")} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Users
                  </Button>
                  <Button onClick={load} disabled={loading}>
                    Refresh
                  </Button>
                </div>
              </div>
            </GlowPanel>

            <div className="dashboard-stagger grid md:grid-cols-2 xl:grid-cols-6 gap-4">
              <Metric title="Total users" value={totals.userCount} icon={Users} />
              <Metric title="Active counsellors" value={data.stats.activeCounsellors} icon={UserCog} />
              <Metric title="Total sessions" value={totals.appointmentCount} icon={CalendarDays} />
              <Metric title="Revenue" value={`Rs. ${data.stats.revenue}`} icon={CreditCard} />
              <Metric title="Applications" value={data.stats.pendingApplications || 0} icon={FileText} />
              <Metric title="Review queue" value={data.stats.reviewModeration || 0} icon={Star} />
            </div>

<Tabs defaultValue="overview">
              <TabsList className="dashboard-panel flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="counsellors">Counsellors</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="refunds">Refunds</TabsTrigger>
                <TabsTrigger value="exports">Reports & Export</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="dashboard-tab-motion space-y-6">
                {/* Overview Hero Stats */}
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Users</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{totals.userCount}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">{data.stats.activeCounsellors} active counsellors</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CalendarDays className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Sessions</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{totals.appointmentCount}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">{data.stats.appointmentsByStatus?.completed || 0} completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-background p-5 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                          <CreditCard className="h-5 w-5 text-violet-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">Revenue</span>
                      </div>
                      <div className="text-2xl font-bold text-violet-400">Rs. {data.stats.revenue}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs text-violet-400/60">Platform earnings</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Alerts</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{data.emergency.length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Emergency alerts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Row */}
                <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
                  {/* Platform Snapshot */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-blue-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400/30 to-blue-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10">
                          <BarChart3 className="h-4 w-4 text-blue-500" />
                        </div>
                        Platform Snapshot
                      </CardTitle>
                      <CardDescription>Role distribution, appointment status, and operational insights</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Roles
                          </h3>
                          <div className="space-y-2">
                            {Object.entries(data.stats.usersByRole || {}).length > 0 ? (
                              Object.entries(data.stats.usersByRole).map(([name, count]) => {
                                const total = Object.values(data.stats.usersByRole).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                const colors = {
                                  user: { bar: "from-blue-500 to-blue-400", dot: "bg-blue-500" },
                                  counsellor: { bar: "from-emerald-500 to-emerald-400", dot: "bg-emerald-500" },
                                  admin: { bar: "from-violet-500 to-violet-400", dot: "bg-violet-500" },
                                };
                                const c = colors[name] || { bar: "from-amber-500 to-amber-400", dot: "bg-amber-500" };
                                return (
                                  <div key={name} className="group rounded-lg border border-glass-border/30 bg-background/60 p-2.5 hover:bg-foreground/5 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                                        <span className="text-xs capitalize font-medium">{name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">{count}</span>
                                        <span className="text-[10px] text-foreground/50">{percentage}%</span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                      <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-foreground/50 italic py-3 text-center">No role data yet</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-emerald-500" />
                            Session Status
                          </h3>
                          <div className="space-y-2">
                            {Object.entries(data.stats.appointmentsByStatus || {}).length > 0 ? (
                              Object.entries(data.stats.appointmentsByStatus).map(([name, count]) => {
                                const total = Object.values(data.stats.appointmentsByStatus).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                const colors = {
                                  completed: { bar: "from-emerald-500 to-emerald-400", dot: "bg-emerald-500" },
                                  pending: { bar: "from-amber-500 to-amber-400", dot: "bg-amber-500" },
                                  cancelled: { bar: "from-rose-500 to-rose-400", dot: "bg-rose-500" },
                                  "no-show": { bar: "from-red-500 to-red-400", dot: "bg-red-500" },
                                };
                                const c = colors[name] || { bar: "from-blue-500 to-blue-400", dot: "bg-blue-500" };
                                return (
                                  <div key={name} className="group rounded-lg border border-glass-border/30 bg-background/60 p-2.5 hover:bg-foreground/5 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                                        <span className="text-xs capitalize font-medium">{name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">{count}</span>
                                        <span className="text-[10px] text-foreground/50">{percentage}%</span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                      <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-foreground/50 italic py-3 text-center">No session data yet</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Admin Insights */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-amber-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-amber-400/30 to-amber-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10">
                          <Activity className="h-4 w-4 text-amber-500" />
                        </div>
                        Admin Insights
                      </CardTitle>
                      <CardDescription>Platform intelligence and recommendations</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {data.insights.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mb-3">
                            <Activity className="h-6 w-6 text-amber-500/50" />
                          </div>
                          <p className="text-sm font-medium text-foreground/60">No insights yet</p>
                          <p className="text-xs text-foreground/50 mt-1">Insights will appear here as platform data grows.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {data.insights.map((insight, i) => {
                            const icons = [Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, BarChart3];
                            const colors = [
                              "bg-amber-500/15 text-amber-600 border-amber-500/20",
                              "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
                              "bg-blue-500/15 text-blue-600 border-blue-500/20",
                              "bg-violet-500/15 text-violet-600 border-violet-500/20",
                              "bg-rose-500/15 text-rose-600 border-rose-500/20",
                            ];
                            const Icon = icons[i % icons.length];
                            const color = colors[i % colors.length];
                            return (
                              <div key={i} className="group rounded-xl border border-glass-border/30 bg-background/60 p-3.5 hover:shadow-sm transition-all duration-200 hover:border-amber-500/20">
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <p className="text-sm text-foreground/75 leading-relaxed">{insight}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity + Quick Stats Row */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Recent Users */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-indigo-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/40 via-indigo-400/30 to-indigo-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-500/10">
                          <Users className="h-4 w-4 text-indigo-500" />
                        </div>
                        Recent Users
                      </CardTitle>
                      <CardDescription>Recently registered platform users</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {data.recentUsers.length === 0 ? (
                        <div className="text-xs text-foreground/50 italic py-6 text-center">No recent users</div>
                      ) : (
                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                          {data.recentUsers.slice(0, 5).map((u, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border border-glass-border/30 bg-background/60 p-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-indigo-500/10 text-xs font-bold text-indigo-500">
                                {(u.name || u.email || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{u.name || u.email}</p>
                                {u.email && u.name && <p className="text-[10px] text-foreground/50 truncate">{u.email}</p>}
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{u.role || "user"}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-emerald-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                          <BarChart3 className="h-4 w-4 text-emerald-500" />
                        </div>
                        Quick Stats
                      </CardTitle>
                      <CardDescription>Platform metrics at a glance</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-blue-500/5 to-background p-3 text-center">
                          <FileText className="mx-auto h-5 w-5 text-blue-400" />
                          <p className="text-lg font-bold mt-1">{data.stats.pendingApplications || 0}</p>
                          <p className="text-[10px] text-foreground/50">Applications</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-amber-500/5 to-background p-3 text-center">
                          <Star className="mx-auto h-5 w-5 text-amber-400" />
                          <p className="text-lg font-bold mt-1">{data.stats.reviewModeration || 0}</p>
                          <p className="text-[10px] text-foreground/50">Reviews</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-rose-500/5 to-background p-3 text-center">
                          <ShieldAlert className="mx-auto h-5 w-5 text-rose-400" />
                          <p className="text-lg font-bold mt-1">{data.stats.openReports || 0}</p>
                          <p className="text-[10px] text-foreground/50">Reports</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-violet-500/5 to-background p-3 text-center">
                          <Package className="mx-auto h-5 w-5 text-violet-400" />
                          <p className="text-lg font-bold mt-1">{data.stats.resources || 0}</p>
                          <p className="text-[10px] text-foreground/50">Resources</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Health */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-rose-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/40 via-rose-400/30 to-rose-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/30 to-rose-500/10">
                          <Activity className="h-4 w-4 text-rose-500" />
                        </div>
                        System Health
                      </CardTitle>
                      <CardDescription>Platform status and health indicators</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm">API Status</span>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">Operational</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm">Database</span>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm">Authentication</span>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">Secure</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <span className="text-sm">Last Backup</span>
                          </div>
                          <span className="text-xs text-foreground/50">Today, 02:00 AM</span>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-emerald-600">All Systems Normal</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="dashboard-tab-motion space-y-6">
                {/* User Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{users.length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">Registered users</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Active</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{users.filter(u => u.status === "active" || !u.status).length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Active accounts</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Suspended</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{users.filter(u => u.status === "suspended").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Suspended accounts</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-background p-5 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                          <ShieldCheck className="h-5 w-5 text-violet-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">Verified</span>
                      </div>
                      <div className="text-2xl font-bold text-violet-400">{users.filter(u => u.otpVerified).length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs text-violet-400/60">OTP verified</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create User Form */}
                <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-primary/5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/30 to-primary/40" />
                  <CardHeader className="border-b border-glass-border/30">
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10">
                        <UserCog className="h-4 w-4 text-primary" />
                      </div>
                      Create New Account
                    </CardTitle>
                    <CardDescription>Create a new user or counsellor account with default password</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={createUser} className="grid lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground/70">Full Name</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} className="pl-9" placeholder="John Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground/70">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input type="email" value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} className="pl-9" placeholder="john@example.com" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground/70">Account Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="counsellor">Counsellor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground/70">Specialization</Label>
                        <Input value={newUser.specialization} onChange={(event) => setNewUser((prev) => ({ ...prev, specialization: event.target.value }))} placeholder="e.g., Anxiety, Stress" />
                      </div>
                      <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Account
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Users List */}
                <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-blue-500/5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400/30 to-blue-500/40" />
                  <CardHeader className="border-b border-glass-border/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10">
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                          All Accounts
                        </CardTitle>
                        <CardDescription>{users.length} total users on the platform</CardDescription>
                      </div>
                      <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/20 text-[10px]">
                        {users.filter(u => u.role === "user").length} Users · {users.filter(u => u.role === "counsellor").length} Counsellors
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {users.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-3">
                          <Users className="h-7 w-7 text-foreground/25" />
                        </div>
                        <p className="font-semibold text-foreground/60">No users yet</p>
                        <p className="text-sm text-foreground/50 mt-1">Users will appear here once they register on the platform.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users.map((user) => {
                          const isActive = user.status === "active" || !user.status;
                          const isSuspended = user.status === "suspended";
                          const isCounsellor = user.role === "counsellor";
                          const isVerified = user.otpVerified;
                          
                          return (
                            <div key={user.id} className="group relative overflow-hidden rounded-xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                              <div className="p-4">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                                      isCounsellor ? 'from-emerald-500/30 to-emerald-500/10 border-emerald-500/20' : 
                                      'from-blue-500/30 to-blue-500/10 border-blue-500/20'
                                    } border`}>
                                      <span className="text-sm font-bold text-foreground/80">{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{user.name}</span>
                                        {isVerified && (
                                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-foreground/60">
                                        <span className="truncate">{user.email}</span>
                                        <span className="text-foreground/30">·</span>
                                        <span className="capitalize">{user.role}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Status Badge */}
                                    <Badge className={`text-[10px] capitalize border ${
                                      isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' :
                                      isSuspended ? 'bg-rose-500/15 text-rose-600 border-rose-500/20' :
                                      'bg-amber-500/15 text-amber-600 border-amber-500/20'
                                    }`}>
                                      {isActive ? 'Active' : isSuspended ? 'Suspended' : user.status}
                                    </Badge>

                                    {/* Role Badge */}
                                    <Badge variant="secondary" className="text-[10px] capitalize">
                                      {user.role}
                                    </Badge>

                                    {/* OTP Badge */}
                                    {isVerified && (
                                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Verified
                                      </Badge>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-1.5 ml-2">
                                      {!isActive && (
                                        <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "active")} className="h-7 text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                                          <CheckCircle2 className="h-3 w-3" /> Unblock
                                        </Button>
                                      )}
                                      {!isVerified && (
                                        <Button size="sm" variant="outline" onClick={() => updateUserDetails(user, { status: "active", otpVerified: true, verificationStatus: "approved" }, "Identity verified")} className="h-7 text-[10px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                                          <ShieldCheck className="h-3 w-3" /> Verify
                                        </Button>
                                      )}
                                      {!isSuspended && (
                                        <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "suspended")} className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                                          <ShieldAlert className="h-3 w-3" /> Block
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline" onClick={() => deleteUser(user)} className="h-7 text-[10px] gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                                        <X className="h-3 w-3" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="applications" className="dashboard-tab-motion space-y-6">
                {/* Application Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{data.counsellorApplications.length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">Total applications</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Pending</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{data.counsellorApplications.filter(a => a.status === "pending" || a.status === "reviewing").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Awaiting review</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Approved</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{data.counsellorApplications.filter(a => a.status === "approved").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Approved applications</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-background p-5 group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-500/10 border border-rose-500/20">
                          <X className="h-5 w-5 text-rose-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-rose-400/60 font-medium">Rejected</span>
                      </div>
                      <div className="text-2xl font-bold text-rose-400">{data.counsellorApplications.filter(a => a.status === "rejected").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-rose-400/60">Rejected applications</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application Cards */}
                <div className="space-y-4">
                  {data.counsellorApplications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-glass-border/40 bg-background/40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
                        <FileText className="h-8 w-8 text-foreground/25" />
                      </div>
                      <p className="font-semibold text-foreground/60">No applications yet</p>
                      <p className="text-sm text-foreground/50 mt-1">Counsellor applications will appear here when users submit them.</p>
                    </div>
                  ) : (
                    data.counsellorApplications.map((application) => {
                      const isApproved = application.status === "approved";
                      const isRejected = application.status === "rejected";
                      const isReviewing = application.status === "reviewing";
                      const isPending = application.status === "pending" || !application.status;
                      const isProfessional = application.requestedType === "professional";
                      
                      const statusColor = isApproved ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : 
                                         isRejected ? "bg-rose-500/15 text-rose-600 border-rose-500/20" :
                                         isReviewing ? "bg-blue-500/15 text-blue-600 border-blue-500/20" :
                                         "bg-amber-500/15 text-amber-600 border-amber-500/20";
                      const statusLabel = isApproved ? "Approved" : isRejected ? "Rejected" : isReviewing ? "Reviewing" : "Pending";
                      const accentGradient = isApproved ? "from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" :
                                            isRejected ? "from-rose-500/40 via-rose-400/30 to-rose-500/40" :
                                            isReviewing ? "from-blue-500/40 via-blue-400/30 to-blue-500/40" :
                                            "from-amber-500/40 via-amber-400/30 to-amber-500/40";
                      const avatarGradient = isApproved ? "from-emerald-500/30 to-emerald-500/10 border-emerald-500/20" :
                                            isRejected ? "from-rose-500/30 to-rose-500/10 border-rose-500/20" :
                                            isReviewing ? "from-blue-500/30 to-blue-500/10 border-blue-500/20" :
                                            "from-amber-500/30 to-amber-500/10 border-amber-500/20";
                      
                      return (
                        <div key={application.id} className="group relative overflow-hidden rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />
                          
                          <div className="p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient} border`}>
                                  <span className="text-lg font-bold text-foreground/80">{application.fullName?.charAt(0)?.toUpperCase() || "A"}</span>
                                </div>
                                <div>
                                  <div className="font-semibold text-sm leading-tight">{application.fullName}</div>
                                  <div className="text-xs text-foreground/60 mt-0.5">{application.userEmail}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[10px] capitalize border ${statusColor}`}>{statusLabel}</Badge>
                                <Badge className={isProfessional ? "bg-blue-500/15 text-blue-600 border-blue-500/20 text-[10px]" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]"}>
                                  {isProfessional ? "Verified Professional" : "Community Mentor"}
                                </Badge>
                              </div>
                            </div>

                            {/* Specialization & Bio */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <UserCog className="h-3.5 w-3.5 text-foreground/50" />
                                <span className="text-sm font-medium">{application.specialization}</span>
                              </div>
                              {application.bio && (
                                <p className="text-xs text-foreground/70 leading-relaxed bg-foreground/5 rounded-lg p-3">{application.bio}</p>
                              )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid md:grid-cols-3 gap-3 mb-4">
                              <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Briefcase className="h-3 w-3 text-foreground/50" />
                                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Experience</span>
                                </div>
                                <p className="text-sm font-medium">{application.experience || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <CreditCard className="h-3 w-3 text-foreground/50" />
                                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Pricing</span>
                                </div>
                                <p className="text-sm font-medium">Rs. {application.sessionPricing || 0}/session</p>
                              </div>
                              <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Globe className="h-3 w-3 text-foreground/50" />
                                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Languages</span>
                                </div>
                                <p className="text-sm font-medium">{(application.languages || []).join(", ") || "—"}</p>
                              </div>
                            </div>

                            {/* Documents & Verification */}
                            <div className="grid md:grid-cols-2 gap-3 mb-4">
                              <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <ShieldCheck className="h-3.5 w-3.5 text-foreground/50" />
                                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Identity</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-foreground/70">{application.idDocumentType || "Not specified"}</span>
                                  <Badge className={application.idDocumentNumber ? "bg-emerald-500/15 text-emerald-600 text-[10px]" : "bg-amber-500/15 text-amber-600 text-[10px]"}>
                                    {application.idDocumentNumber ? "Provided" : "Missing"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield className="h-3.5 w-3.5 text-foreground/50" />
                                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">License</span>
                                </div>
                                <p className="text-xs text-foreground/70">{application.licenseNumber || "Not provided"}</p>
                              </div>
                            </div>

                            {/* LinkedIn & Notes */}
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                              {application.linkedin && (
                                <a href={application.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
                                  <ExternalLink className="h-3 w-3" />
                                  LinkedIn Profile
                                </a>
                              )}
                              {application.verificationNotes && (
                                <div className="w-full rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 mt-2">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-amber-600/80">{application.verificationNotes}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-glass-border/30">
                              <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "reviewing")} className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                                <Search className="h-3.5 w-3.5" /> Review
                              </Button>
                              <Button size="sm" onClick={() => reviewApplication(application, "approved")} className="h-8 text-xs gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25 border">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "rejected")} className="h-8 text-xs gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="counsellors" className="dashboard-tab-motion space-y-6">
                {/* Counsellor Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{data.counsellors.length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">Registered counsellors</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Approved</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{data.counsellors.filter(c => c.status === "approved" || c.status === "active").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Verified counsellors</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Pending</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{data.counsellors.filter(c => c.status === "pending" || !c.status).length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Awaiting approval</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-background p-5 group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-500/10 border border-rose-500/20">
                          <ShieldAlert className="h-5 w-5 text-rose-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-rose-400/60 font-medium">Suspended</span>
                      </div>
                      <div className="text-2xl font-bold text-rose-400">{data.counsellors.filter(c => c.status === "suspended").length}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-rose-400/60">Suspended accounts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counsellor Cards Grid */}
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.counsellors.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
                        <UserCog className="h-8 w-8 text-foreground/25" />
                      </div>
                      <p className="font-semibold text-foreground/60">No counsellors yet</p>
                      <p className="text-sm text-foreground/50 mt-1">Counsellors will appear here once they register and submit applications.</p>
                    </div>
                  ) : (
                    data.counsellors.map((counsellor) => {
                      const rating = counsellor.rating || 0;
                      const isApproved = counsellor.status === "approved" || counsellor.status === "active";
                      const isSuspended = counsellor.status === "suspended";
                      const hasMeetLink = !!counsellor.meetLink;
                      const statusColor = isApproved ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : 
                                         isSuspended ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : 
                                         "bg-amber-500/15 text-amber-600 border-amber-500/20";
                      const statusLabel = isApproved ? "Active" : isSuspended ? "Suspended" : "Pending";
                      
                      return (
                        <div key={counsellor.id} className="group relative overflow-hidden rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                          {/* Top gradient accent */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isApproved ? 'from-emerald-500/40 via-emerald-400/30 to-emerald-500/40' : isSuspended ? 'from-rose-500/40 via-rose-400/30 to-rose-500/40' : 'from-amber-500/40 via-amber-400/30 to-amber-500/40'}`} />
                          
                          <div className="p-5">
                            {/* Header: Avatar + Status */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${isApproved ? 'from-emerald-500/30 to-emerald-500/10 border-emerald-500/20' : isSuspended ? 'from-rose-500/30 to-rose-500/10 border-rose-500/20' : 'from-amber-500/30 to-amber-500/10 border-amber-500/20'} border`}>
                                  <span className="text-lg font-bold text-foreground/80">{counsellor.name?.charAt(0)?.toUpperCase() || "C"}</span>
                                </div>
                                <div>
                                  <div className="font-semibold text-sm leading-tight">{counsellor.name}</div>
                                  <div className="text-xs text-foreground/60 mt-0.5">{counsellor.specialization || "General counselling"}</div>
                                </div>
                              </div>
                              <Badge className={`text-[10px] capitalize border ${statusColor}`}>{statusLabel}</Badge>
                            </div>

                            {/* Rating Stars */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex">
                                {[1,2,3,4,5].map((s) => (
                                  <svg key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-foreground/20"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-foreground/50">({counsellor.reviews || 0} reviews)</span>
                              {hasMeetLink && (
                                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px] ml-auto">
                                  <Video className="h-3 w-3 mr-1" />
                                  Meet ready
                                </Badge>
                              )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <div className="rounded-lg bg-foreground/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">License</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{counsellor.licenseNumber || "—"}</p>
                              </div>
                              <div className="rounded-lg bg-foreground/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Type</p>
                                <p className="text-xs font-medium mt-0.5 capitalize">{counsellor.counsellorType || "Professional"}</p>
                              </div>
                              <div className="rounded-lg bg-foreground/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Badge</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{counsellor.verificationBadge || "Pending"}</p>
                              </div>
                              <div className="rounded-lg bg-foreground/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Email</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{counsellor.email || "—"}</p>
                              </div>
                              <div className="rounded-lg bg-foreground/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Clinic</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{counsellor.clinicName || counsellor.clinicAddress || "—"}</p>
                              </div>
                            </div>

                            {/* Availability */}
                            <div className="mb-4">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <CalendarDays className="h-3 w-3 text-foreground/50" />
                                <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Availability</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(counsellor.availability || []).length > 0 ? (
                                  counsellor.availability.map((slot, i) => (
                                    <span key={i} className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded-md text-foreground/70">{slot}</span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-foreground/40 italic">Not set</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-glass-border/30">
                              <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "approved")} className="h-7 text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                                verificationStatus: "approved",
                                verificationBadge: counsellor.counsellorType === "mentor" ? "Community Mentor" : "Verified Professional",
                                status: "approved",
                              }, "License verified")} className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                                <ShieldCheck className="h-3 w-3" /> Verify
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                                availability: counsellor.availability?.length ? counsellor.availability : ["Mon 10:00-13:00", "Wed 14:00-17:00"],
                              }, "Availability updated")} className="h-7 text-xs gap-1 border-violet-500/30 text-violet-600 hover:bg-violet-500/10">
                                <CalendarDays className="h-3 w-3" /> Slot
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "suspended")} className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                                <ShieldAlert className="h-3 w-3" /> Suspend
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reports" className="dashboard-tab-motion space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Reports", value: (data.reports || []).length, color: "text-primary", icon: ShieldAlert },
                    { label: "Pending", value: (data.reports || []).filter(r => r.status === "pending").length, color: "text-amber-500", icon: AlertTriangle },
                    { label: "Reviewed", value: (data.reports || []).filter(r => r.status === "reviewed").length, color: "text-blue-500", icon: CheckCircle2 },
                    { label: "Dismissed", value: (data.reports || []).filter(r => r.status === "dismissed" || r.status === "resolved").length, color: "text-emerald-500", icon: Shield },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">{s.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                      </div>
                      <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
                    </div>
                  ))}
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Counsellor Reports
                    </CardTitle>
                    <CardDescription>Reports submitted by users against counsellors. Review, take action, or dismiss.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!data.reports || data.reports.length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-3">
                          <ShieldCheck className="h-7 w-7 text-foreground/25" />
                        </div>
                        <p className="font-semibold text-foreground/60">No reports yet</p>
                        <p className="text-sm text-foreground/50 mt-1">User-submitted reports against counsellors will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.reports.map((r) => {
                          const statusColors = {
                            pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
                            reviewed: "bg-blue-500/15 text-blue-600 border-blue-500/20",
                            dismissed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
                            resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
                          };
                          return (
                            <div key={r.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4 hover:bg-background/80 transition-all">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold">{r.reason || "No reason provided"}</span>
                                    <Badge className={`text-[10px] capitalize border ${statusColors[r.status] || "bg-foreground/10 text-foreground/60"}`}>
                                      {r.status || "pending"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                                    <span><span className="text-foreground/40">From:</span> {r.reporterName || "Anonymous"}</span>
                                    <span className="text-foreground/30">&rarr;</span>
                                    <span><span className="text-foreground/40">Against:</span> {r.counsellorName || "Unknown"}</span>
                                  </div>
                                  {r.details && <p className="text-sm text-foreground/70 bg-foreground/5 rounded-lg p-2.5 leading-relaxed">{r.details}</p>}
                                  {r.createdAt && <p className="text-[10px] text-foreground/40">{new Date(r.createdAt).toLocaleString()}</p>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => updateReportStatus(r, "reviewed")}>Mark Reviewed</Button>
                                  <Button size="sm" variant="outline" className="text-xs h-8 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => updateReportStatus(r, "dismissed")}>Dismiss</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="revenue" className="dashboard-tab-motion space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CreditCard className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Net Revenue</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">Rs. {Number(data.revenue.platformRevenue || 0).toLocaleString("en-IN")}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Platform revenue</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Payouts</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">Rs. {Number(data.revenue.counsellorPayouts || 0).toLocaleString("en-IN")}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">Counsellor payouts</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-background p-5 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                          <CheckCircle2 className="h-5 w-5 text-violet-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">Plans</span>
                      </div>
                      <div className="text-2xl font-bold text-violet-400">Rs. {Number(data.revenue.planRevenue || 0).toLocaleString("en-IN")}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs text-violet-400/60">Plan revenue</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Refunds</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{data.revenue.refundRequests}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Refund requests</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-emerald-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                              <BarChart3 className="h-4 w-4 text-emerald-500" />
                            </div>
                            Revenue Trend
                          </CardTitle>
                          <CardDescription>Monthly gross revenue with platform fee breakdown</CardDescription>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-foreground/60">Gross revenue</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30" />
                            <span className="text-foreground/60">Platform fee</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-80 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 p-4 border border-glass-border/30">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={data.analytics.revenueTrends || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={(value) => `Rs.${Math.round(value / 1000)}k`} />
                            <Tooltip
                              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              formatter={(value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`}
                            />
                            <Bar dataKey="value" name="Gross revenue" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" maxBarSize={40} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-blue-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400/30 to-blue-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10">
                          <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        Revenue Summary
                      </CardTitle>
                      <CardDescription>Key financial metrics at a glance</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-center mb-4">
                        <div className="relative h-32 w-32">
                          <svg className="h-full w-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.3" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#revenueGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(100, ((data.revenue.platformRevenue || 0) / Math.max(1, (data.revenue.platformRevenue || 0) + (data.revenue.counsellorPayouts || 0))) * 264)} 264`} transform="rotate(-90 50 50)" />
                            <defs>
                              <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="hsl(var(--primary))" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs text-foreground/50">Total</span>
                            <span className="text-lg font-bold">Rs. {Number((data.revenue.platformRevenue || 0) + (data.revenue.counsellorPayouts || 0)).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3.5 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              <span className="text-sm font-medium">Platform Revenue</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-500">Rs. {Number(data.revenue.platformRevenue || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${((data.revenue.platformRevenue || 0) / Math.max(1, (data.revenue.platformRevenue || 0) + (data.revenue.counsellorPayouts || 0))) * 100}%` }} />
                          </div>
                        </div>

                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3.5 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                              <span className="text-sm font-medium">Counsellor Payouts</span>
                            </div>
                            <span className="text-sm font-bold text-blue-500">Rs. {Number(data.revenue.counsellorPayouts || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${((data.revenue.counsellorPayouts || 0) / Math.max(1, (data.revenue.platformRevenue || 0) + (data.revenue.counsellorPayouts || 0))) * 100}%` }} />
                          </div>
                        </div>

                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3.5 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                              <span className="text-sm font-medium">Plan Revenue</span>
                            </div>
                            <span className="text-sm font-bold text-violet-500">Rs. {Number(data.revenue.planRevenue || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500" style={{ width: `${((data.revenue.planRevenue || 0) / Math.max(1, (data.revenue.platformRevenue || 0) + (data.revenue.counsellorPayouts || 0) + (data.revenue.planRevenue || 0))) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground/70">Platform Commission Rate</span>
                          <span className="text-lg font-bold text-emerald-500">{data.revenue.platformCommissionRate || 2}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="relative overflow-hidden rounded-xl border border-glass-border/30 bg-gradient-to-br from-emerald-500/5 via-background to-background p-4 group hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-emerald-500/5 blur-xl" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Platform Revenue</p>
                        <p className="text-lg font-bold mt-0.5">Rs. {Number(data.revenue.platformRevenue || 0).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-foreground/50 mt-1">After {data.revenue.platformCommissionRate || 2}% commission</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-glass-border/30 bg-gradient-to-br from-blue-500/5 via-background to-background p-4 group hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-blue-500/5 blur-xl" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                        <Users className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Counsellor Payouts</p>
                        <p className="text-lg font-bold mt-0.5">Rs. {Number(data.revenue.counsellorPayouts || 0).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-foreground/50 mt-1">Total paid to counsellors</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-glass-border/30 bg-gradient-to-br from-amber-500/5 via-background to-background p-4 group hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-amber-500/5 blur-xl" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Refund Requests</p>
                        <p className="text-lg font-bold mt-0.5">{data.revenue.refundRequests}</p>
                        <p className="text-xs text-foreground/50 mt-1">Pending refund requests</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="refunds" className="dashboard-tab-motion space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Pending</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{data.revenue.refundRequests}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs text-amber-400/60">Refund requests</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Approved</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">0</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Approved refunds</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-background p-5 group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-500/10 border border-rose-500/20">
                          <X className="h-5 w-5 text-rose-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-rose-400/60 font-medium">Rejected</span>
                      </div>
                      <div className="text-2xl font-bold text-rose-400">0</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-rose-400/60">Rejected refunds</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <RotateCcw className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{data.revenue.refundRequests}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">All time refunds</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-amber-500/5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-amber-400/30 to-amber-500/40" />
                  <CardHeader className="border-b border-glass-border/30">
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                      </div>
                      Refund Management
                    </CardTitle>
                    <CardDescription>Manage refund requests and policy settings</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-glass-border/30 bg-amber-500/5">
                      <div>
                        <p className="text-sm font-medium">Pending refund requests</p>
                        <p className="text-3xl font-bold text-amber-500 mt-1">{data.revenue?.refundRequests || 0}</p>
                      </div>
                      <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Process Refunds
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-glass-border/30 bg-background/60 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-foreground/50" />
                          <span className="text-sm font-medium">Refund Policy</span>
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed">
                          Packages can be refunded within 7 days of purchase. Refunds are processed within 5-7 business days. 
                          The platform commission is non-refundable after the session is booked.
                        </p>
                      </div>
                      <div className="rounded-xl border border-glass-border/30 bg-background/60 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-foreground/50" />
                          <span className="text-sm font-medium">Quick Actions</span>
                        </div>
                        <div className="space-y-2 mt-2">
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled>
                            <RotateCcw className="h-3 w-3 mr-2" />
                            Auto-refund all pending
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled>
                            <Download className="h-3 w-3 mr-2" />
                            Export refund report
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">API Reference</p>
                          <p className="text-xs text-foreground/60 mt-1">
                            Use <code className="bg-foreground/10 px-1.5 py-0.5 rounded text-[10px]">POST /api/packages/:id/refund</code> to process a refund programmatically. 
                            Refund requests are created automatically when users request a refund from their dashboard.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exports" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-indigo-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/40 via-indigo-400/30 to-indigo-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-500/10">
                          <Download className="h-4 w-4 text-indigo-500" />
                        </div>
                        Reports & Export
                      </CardTitle>
                      <CardDescription>Download platform reports, user data, revenue reports, session analytics, and counsellor performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-3">
                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("users")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                                <Users className="h-5 w-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium">User Report</p>
                                <p className="text-xs text-foreground/50">Export all registered users data</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 gap-2">
                              <Download className="h-3.5 w-3.5" />
                              Export
                            </Button>
                          </div>
                        </div>

                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("revenue")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                                <CreditCard className="h-5 w-5 text-emerald-400" />
                              </div>
                              <div>
                                <p className="font-medium">Revenue Report</p>
                                <p className="text-xs text-foreground/50">Platform revenue, counsellor payouts, and plan revenue</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 gap-2">
                              <Download className="h-3.5 w-3.5" />
                              Export
                            </Button>
                          </div>
                        </div>

                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("sessions")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                                <CalendarDays className="h-5 w-5 text-violet-400" />
                              </div>
                              <div>
                                <p className="font-medium">Session Report</p>
                                <p className="text-xs text-foreground/50">All counselling sessions with details</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 gap-2">
                              <Download className="h-3.5 w-3.5" />
                              Export
                            </Button>
                          </div>
                        </div>

                        <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("counsellors")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                                <UserCog className="h-5 w-5 text-amber-400" />
                              </div>
                              <div>
                                <p className="font-medium">Counsellor Performance</p>
                                <p className="text-xs text-foreground/50">Ratings, reviews, availability, and verification status</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 gap-2">
                              <Download className="h-3.5 w-3.5" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-emerald-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                          <BarChart3 className="h-4 w-4 text-emerald-500" />
                        </div>
                        Platform Summary
                      </CardTitle>
                      <CardDescription>Quick overview of platform statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-blue-500/5 to-background p-3.5 text-center">
                          <Users className="mx-auto h-5 w-5 text-blue-400" />
                          <p className="text-lg font-bold mt-1">{totals.userCount}</p>
                          <p className="text-xs text-foreground/50">Total Users</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-emerald-500/5 to-background p-3.5 text-center">
                          <UserCog className="mx-auto h-5 w-5 text-emerald-400" />
                          <p className="text-lg font-bold mt-1">{data.stats.activeCounsellors}</p>
                          <p className="text-xs text-foreground/50">Counsellors</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-violet-500/5 to-background p-3.5 text-center">
                          <CalendarDays className="mx-auto h-5 w-5 text-violet-400" />
                          <p className="text-lg font-bold mt-1">{totals.appointmentCount}</p>
                          <p className="text-xs text-foreground/50">Sessions</p>
                        </div>
                        <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-amber-500/5 to-background p-3.5 text-center">
                          <CreditCard className="mx-auto h-5 w-5 text-amber-400" />
                          <p className="text-lg font-bold mt-1">Rs. {data.stats.revenue}</p>
                          <p className="text-xs text-foreground/50">Revenue</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-glass-border/30 bg-background/60 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Download className="h-4 w-4 text-foreground/50" />
                          <span className="text-sm font-medium">Last Export</span>
                        </div>
                        <p className="text-xs text-foreground/50">No exports have been made yet. Click any export button above to generate a CSV report.</p>
                      </div>

                      <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          <span className="text-sm font-medium text-indigo-400">Pro Tip</span>
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed">
                          Export reports are generated in CSV format and can be opened in Excel, Google Sheets, or any spreadsheet application. 
                          Data is filtered based on the current date.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="dashboard-tab-motion space-y-6">
                {/* Analytics Hero Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Users</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{totals.userCount}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-400/60">Total registered users</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                          <CalendarDays className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Sessions</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{totals.appointmentCount}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400/60">Total sessions</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-background p-5 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                          <CheckCircle2 className="h-5 w-5 text-violet-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">Completion</span>
                      </div>
                      <div className="text-2xl font-bold text-violet-400">{Math.round((data.stats.appointmentsByStatus?.completed || 0) / Math.max(1, data.stats.totalSessions) * 100)}%</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs text-violet-400/60">Session completion rate</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-background p-5 group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-500/10 border border-rose-500/20">
                          <AlertTriangle className="h-5 w-5 text-rose-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-rose-400/60 font-medium">No-Show</span>
                      </div>
                      <div className="text-2xl font-bold text-rose-400">{Math.round((data.stats.appointmentsByStatus?.["no-show"] || 0) / Math.max(1, data.stats.totalSessions) * 100)}%</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-rose-400/60">No-show rate</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* User Growth Chart */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-blue-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400/30 to-blue-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10">
                              <Users className="h-4 w-4 text-blue-500" />
                            </div>
                            User Growth
                          </CardTitle>
                          <CardDescription>Monthly user registration trends</CardDescription>
                        </div>
                        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/20 text-[10px]">
                          +{data.analytics.userGrowth?.length > 1 ? ((data.analytics.userGrowth[data.analytics.userGrowth.length - 1]?.value || 0) - (data.analytics.userGrowth[data.analytics.userGrowth.length - 2]?.value || 0)) : 0} this month
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-72 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 p-4 border border-glass-border/30">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={data.analytics.userGrowth || []} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              formatter={(value) => [`${value} users`, "New Users"]}
                            />
                            <Line type="monotone" dataKey="value" name="Users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Session Trends Chart */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-emerald-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                              <CalendarDays className="h-4 w-4 text-emerald-500" />
                            </div>
                            Session Trends
                          </CardTitle>
                          <CardDescription>Monthly counselling session trends</CardDescription>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px]">
                          {data.analytics.sessionTrends?.length || 0} months
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-72 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 p-4 border border-glass-border/30">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={data.analytics.sessionTrends || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <Tooltip
                              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              formatter={(value) => [`${value} sessions`, "Sessions"]}
                            />
                            <Bar dataKey="value" name="Sessions" radius={[6, 6, 0, 0]} fill="#10b981" maxBarSize={40} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Row: Demand + Session Metrics */}
                <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
                  {/* Mental Health Demand */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-violet-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/40 via-violet-400/30 to-violet-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-500/10">
                          <BarChart3 className="h-4 w-4 text-violet-500" />
                        </div>
                        Mental Health Demand
                      </CardTitle>
                      <CardDescription>Most sought-after counselling categories</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-72 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 p-4 border border-glass-border/30">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={data.analytics.demand || []} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={100} />
                            <Tooltip
                              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                              formatter={(value) => [`${value} requests`, "Demand"]}
                            />
                            <Bar dataKey="value" name="Demand" radius={[0, 6, 6, 0]} fill="#8b5cf6" maxBarSize={24} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Session Metrics Grid */}
                  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-rose-500/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/40 via-rose-400/30 to-rose-500/40" />
                    <CardHeader className="border-b border-glass-border/30">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/30 to-rose-500/10">
                          <Activity className="h-4 w-4 text-rose-500" />
                        </div>
                        Session Metrics
                      </CardTitle>
                      <CardDescription>Key performance indicators at a glance</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Total Sessions - Circular Progress */}
                        <div className="flex justify-center mb-2">
                          <div className="relative h-28 w-28">
                            <svg className="h-full w-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.3" />
                              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#sessionGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(251.2, ((data.stats.appointmentsByStatus?.completed || 0) / Math.max(1, data.stats.totalSessions)) * 251.2)} 251.2`} transform="rotate(-90 50 50)" />
                              <defs>
                                <linearGradient id="sessionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xs text-foreground/50">Total</span>
                              <span className="text-lg font-bold">{data.stats.totalSessions}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metrics List */}
                        <div className="space-y-2.5">
                          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                <span className="text-sm">Completed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-emerald-500">{data.stats.appointmentsByStatus?.completed || 0}</span>
                                <span className="text-xs text-foreground/50">({Math.round((data.stats.appointmentsByStatus?.completed || 0) / Math.max(1, data.stats.totalSessions) * 100)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mt-1.5">
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${((data.stats.appointmentsByStatus?.completed || 0) / Math.max(1, data.stats.totalSessions)) * 100}%` }} />
                            </div>
                          </div>

                          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                <span className="text-sm">Pending</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-amber-500">{data.stats.appointmentsByStatus?.pending || 0}</span>
                                <span className="text-xs text-foreground/50">({Math.round((data.stats.appointmentsByStatus?.pending || 0) / Math.max(1, data.stats.totalSessions) * 100)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mt-1.5">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500" style={{ width: `${((data.stats.appointmentsByStatus?.pending || 0) / Math.max(1, data.stats.totalSessions)) * 100}%` }} />
                            </div>
                          </div>

                          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3 hover:bg-rose-500/5 hover:border-rose-500/20 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                <span className="text-sm">No-Show</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-rose-500">{data.stats.appointmentsByStatus?.["no-show"] || 0}</span>
                                <span className="text-xs text-foreground/50">({Math.round((data.stats.appointmentsByStatus?.["no-show"] || 0) / Math.max(1, data.stats.totalSessions) * 100)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mt-1.5">
                              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500" style={{ width: `${((data.stats.appointmentsByStatus?.["no-show"] || 0) / Math.max(1, data.stats.totalSessions)) * 100}%` }} />
                            </div>
                          </div>

                          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-3 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                <span className="text-sm">Cancelled</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-500">{data.stats.appointmentsByStatus?.cancelled || 0}</span>
                                <span className="text-xs text-foreground/50">({Math.round((data.stats.appointmentsByStatus?.cancelled || 0) / Math.max(1, data.stats.totalSessions) * 100)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mt-1.5">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${((data.stats.appointmentsByStatus?.cancelled || 0) / Math.max(1, data.stats.totalSessions)) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="dashboard-tab-motion space-y-6">
                <div className="grid md:grid-cols-5 gap-4">
                  {[
                    { label: "Total Alerts", value: data.emergency.length, color: "text-rose-500", icon: ShieldAlert },
                    { label: "Open", value: data.emergency.filter(a => a.status === "open").length, color: "text-amber-500", icon: AlertTriangle },
                    { label: "Reviewed", value: data.emergency.filter(a => a.status === "reviewed").length, color: "text-emerald-500", icon: CheckCircle2 },
                    { label: "Peer Support", value: data.emergency.filter(a => a.source === "peer-support").length, color: "text-violet-500", icon: MessageCircle },
                    { label: "Wellness SOS", value: data.emergency.filter(a => a.source === "wellness").length, color: "text-blue-500", icon: Activity },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-background/80 to-background/60 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">{s.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                      </div>
                      <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
                    </div>
                  ))}
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-rose-500" />
                      Emergency Triggers
                    </CardTitle>
                    <CardDescription>User-triggered emergency alerts with contact details for immediate outreach.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.emergency.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-3">
                          <ShieldCheck className="h-7 w-7 text-foreground/25" />
                        </div>
                        <p className="font-semibold text-foreground/60">No emergency alerts</p>
                        <p className="text-sm text-foreground/50 mt-1">All clear. Alerts will appear here when users trigger emergency support.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.emergency.map((alert) => {
                          const sourceConfig = {
                            wellness: { label: "Wellness SOS", color: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
                            "peer-support": { label: "Peer Support", color: "bg-violet-500/15 text-violet-600 border-violet-500/20" },
                          };
                          const src = sourceConfig[alert.source] || sourceConfig.wellness;
                          const statusColor = alert.status === "open" ? "bg-amber-500/15 text-amber-600 border-amber-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
                          return (
                            <div key={alert.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4 hover:bg-background/80 transition-all">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 font-bold text-sm">
                                      {(alert.userName || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-sm">{alert.userName || "Unknown"}</span>
                                      {alert.userEmail && <div className="text-[11px] text-foreground/50">{alert.userEmail}</div>}
                                    </div>
                                    <Badge className={`text-[10px] capitalize border ml-auto lg:ml-2 ${src.color}`}>{src.label}</Badge>
                                    <Badge className={`text-[10px] capitalize border ${statusColor}`}>{alert.status}</Badge>
                                  </div>

                                  {alert.contact && (
                                    <div className="flex items-center gap-3">
                                      <a href={`tel:${alert.contact.replace(/\D/g, "")}`} className="flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400 hover:underline">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{alert.contact}</span>
                                      </a>
                                      {alert.contact.includes("whatsapp") || alert.contact.match(/^\+?\d{10,}/) && (
                                        <a href={`https://wa.me/${alert.contact.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                                          <MessageCircle className="h-3 w-3" />
                                          WhatsApp
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {alert.message && (
                                    <p className="text-sm text-foreground/70 bg-foreground/5 rounded-lg p-2.5 leading-relaxed">{alert.message}</p>
                                  )}

                                  <p className="text-[10px] text-foreground/40">{alert.time}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-500/10">
                          <Shield className="h-4 w-4 text-indigo-500" />
                        </div>
                        Security Features
                      </CardTitle>
                      <CardDescription>Role-based access, activity logs, JWT auth & login tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-glass-border/40 bg-gradient-to-br from-emerald-500/10 to-background p-3 text-center">
                          <ShieldCheck className="mx-auto h-5 w-5 text-emerald-500" />
                          <div className="mt-1 text-lg font-bold">{data.activityLogs.length}</div>
                          <div className="text-xs text-foreground/55">Security Events</div>
                        </div>
                        <div className="rounded-xl border border-glass-border/40 bg-gradient-to-br from-primary/10 to-background p-3 text-center">
                          <Activity className="mx-auto h-5 w-5 text-primary" />
                          <div className="mt-1 text-lg font-bold">{data.activityLogs.length}</div>
                          <div className="text-xs text-foreground/55">Activity Logs</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(data.activityLogs || []).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-glass-border/40 bg-background/40 p-4 text-center">
                            <Shield className="mx-auto h-6 w-6 text-foreground/30" />
                            <p className="mt-1 text-sm text-foreground/50">No activity logs yet</p>
                          </div>
                        ) : (
                          data.activityLogs.map((log, i) => (
                            <div key={i} className="group flex items-start gap-3 rounded-xl border border-glass-border/30 bg-background/60 p-3 transition hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:shadow-sm">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
                                <Activity className="h-4 w-4 text-indigo-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-foreground/80">{log}</p>
                                <p className="text-xs text-foreground/45">Just now</p>
                              </div>
                              <div className="h-2 w-2 rounded-full bg-emerald-500 opacity-0 transition group-hover:opacity-100" />
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10">
                          <Megaphone className="h-4 w-4 text-amber-500" />
                        </div>
                        Platform Notifications
                      </CardTitle>
                      <CardDescription>System announcements, campaigns & maintenance alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <div className="relative overflow-hidden rounded-xl border border-glass-border/40 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
                        <Textarea
                          rows={4}
                          value={announcement}
                          onChange={(event) => setAnnouncement(event.target.value)}
                          placeholder="Write a wellness campaign or maintenance alert..."
                          className="resize-none border-0 bg-transparent p-0 text-sm placeholder:text-foreground/40 focus-visible:ring-0"
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-foreground/40">{announcement.length}/500</span>
                          <Button onClick={sendAnnouncement} size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
                            <Bell className="h-3.5 w-3.5" />
                            Send
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">Recent Notifications</span>
                          <span className="text-xs text-foreground/40">{(data.notifications || []).length} total</span>
                        </div>
                        {(data.notifications || []).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-glass-border/40 bg-background/40 p-4 text-center">
                            <Bell className="mx-auto h-6 w-6 text-foreground/30" />
                            <p className="mt-1 text-sm text-foreground/50">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {data.notifications.slice(0, 8).map((notification) => (
                              <div key={notification.id} className="group rounded-xl border border-glass-border/30 bg-background/60 p-3 transition hover:border-amber-500/30 hover:bg-amber-500/5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${notification.type === "emergency" ? "bg-red-500" : "bg-amber-500"}`} />
                                    <span className="text-sm font-medium">{notification.title}</span>
                                  </div>
                                  <span className="shrink-0 text-xs text-foreground/40">{notification.time}</span>
                                </div>
                                <p className="mt-1 text-xs text-foreground/65 pl-4">{notification.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-card overflow-hidden">
                  <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-rose-500/20">
                            <Star className="h-4 w-4 text-amber-500" />
                          </div>
                          Review Moderation
                        </CardTitle>
                        <CardDescription>Moderate reviews, handle reports, and manage content quality</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-500">{data.reviews.filter((r) => r.status === "approved").length}</div>
                          <div className="text-xs text-foreground/55">Approved</div>
                        </div>
                        <div className="h-8 w-px bg-glass-border/40" />
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-500">{data.reviews.filter((r) => r.status === "flagged").length}</div>
                          <div className="text-xs text-foreground/55">Flagged</div>
                        </div>
                        <div className="h-8 w-px bg-glass-border/40" />
                        <div className="text-center">
                          <div className="text-lg font-bold text-rose-500">{data.reviews.filter((r) => r.status === "removed").length}</div>
                          <div className="text-xs text-foreground/55">Removed</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {data.reviews.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border/40 bg-background/40 p-8">
                        <Star className="mb-2 h-8 w-8 text-foreground/30" />
                        <p className="text-sm font-medium text-foreground/60">No reviews yet</p>
                        <p className="mt-1 text-xs text-foreground/40">Reviews submitted by users will appear here for moderation.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {data.reviews.map((review) => {
                          const stars = Math.round(review.rating || 0);
                          return (
                            <div key={review.id} className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 transition hover:border-amber-500/20 hover:shadow-sm">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-rose-500/10 text-xs font-bold text-amber-600">
                                      {review.counsellor?.charAt(0) || "C"}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">{review.counsellor || "Counsellor"}</span>
                                        <span className="text-xs text-foreground/45">— {review.studentName || "Anonymous"}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex">
                                          {[1,2,3,4,5].map((s) => (
                                            <svg key={s} className={`h-3.5 w-3.5 ${s <= stars ? "text-amber-400" : "text-foreground/20"}`} fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                          ))}
                                        </div>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                          review.status === "approved" ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10" :
                                          review.status === "flagged" ? "border-amber-500/30 text-amber-500 bg-amber-500/10" :
                                          "border-rose-500/30 text-rose-500 bg-rose-500/10"
                                        }`}>{review.status}</Badge>
                                        {review.needsModeration && (
                                          <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px] px-1.5 py-0">Needs moderation</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {review.comment && (
                                    <p className="ml-12 text-sm text-foreground/70 italic">&ldquo;{review.comment}&rdquo;</p>
                                  )}
                                  <div className="ml-12 flex flex-wrap gap-3 text-xs text-foreground/50">
                                    <span>Professionalism: {review.professionalism || "—"}/5</span>
                                    <span>Helpfulness: {review.helpfulness || "—"}/5</span>
                                    <span>Communication: {review.communication || "—"}/5</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 lg:flex-col">
                                  <Button size="sm" onClick={() => moderateReview(review, "approved")} className="h-7 gap-1 bg-emerald-500/15 text-emerald-600 text-xs hover:bg-emerald-500/25">
                                    <CheckCircle2 className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => moderateReview(review, "flagged")} className="h-7 gap-1 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                                    <AlertTriangle className="h-3 w-3" /> Flag
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => moderateReview(review, "removed")} className="h-7 gap-1 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/50">
                                    <ShieldAlert className="h-3 w-3" /> Remove
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => moderateReview(review, "removed", "suspend-counsellor")} className="h-7 gap-1 text-xs border-red-500/30 text-red-600 hover:bg-red-500/10">
                                    <UserCog className="h-3 w-3" /> Suspend
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <Dialog open={showPackageForm} onOpenChange={setShowPackageForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPackage ? "Edit Package" : "Add New Package"}</DialogTitle>
                    <DialogDescription>
                      {editingPackage
                        ? "Update the support package details. Changes will affect new bookings only."
                        : "Create a new support package template. Counsellors can set their own prices based on this template."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={savePackage} className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Package ID</Label>
                        <Input
                          value={newPackage.id}
                          onChange={(e) => setNewPackage({ ...newPackage, id: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                          placeholder="e.g., short-term-support"
                          disabled={!!editingPackage}
                        />
                        <p className="text-xs text-foreground/50">Unique identifier (cannot be changed after creation)</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Package Name</Label>
                        <Input
                          value={newPackage.name}
                          onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                          placeholder="e.g., Short-Term Support"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <Textarea
                        value={newPackage.summary}
                        onChange={(e) => setNewPackage({ ...newPackage, summary: e.target.value })}
                        placeholder="Brief description shown to users"
                        rows={2}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          value={newPackage.duration}
                          onChange={(e) => setNewPackage({ ...newPackage, duration: e.target.value })}
                          placeholder="e.g., 4-8 sessions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cadence</Label>
                        <Input
                          value={newPackage.cadence}
                          onChange={(e) => setNewPackage({ ...newPackage, cadence: e.target.value })}
                          placeholder="e.g., Every two days"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Session Count</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newPackage.sessionCount}
                          onChange={(e) => setNewPackage({ ...newPackage, sessionCount: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Best For (comma-separated)</Label>
                      <Input
                        value={newPackage.bestFor.join(", ")}
                        onChange={(e) => setNewPackage({ ...newPackage, bestFor: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        placeholder="Stress, Anxiety, Exam pressure, Loneliness"
                      />
                      <p className="text-xs text-foreground/50">Enter tags separated by commas</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Default Price (Rs.)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newPackage.defaultPrice}
                          onChange={(e) => setNewPackage({ ...newPackage, defaultPrice: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Multiplier</Label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={newPackage.multiplier}
                          onChange={(e) => setNewPackage({ ...newPackage, multiplier: Number(e.target.value) || 1 })}
                        />
                        <p className="text-xs text-foreground/50">Used for auto-pricing based on counsellor's base rate</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select value={newPackage.theme} onValueChange={(value) => setNewPackage({ ...newPackage, theme: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {themeOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 w-3 rounded-full ${option.color}`} />
                                  <span>{option.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={newPackage.isActive}
                        onChange={(e) => setNewPackage({ ...newPackage, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="isActive" className="mb-0">Active (visible to counsellors)</Label>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetPackageForm}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingPackage ? "Update Package" : "Create Package"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
};

function Metric({ title, value, icon: Icon }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return <PanelText>No {title.toLowerCase()} data yet.</PanelText>;
  return (
    <div>
      <h3 className="font-medium mb-2">{title}</h3>
      <div className="space-y-2">
        {entries.map(([name, count]) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2">
            <span className="capitalize">{name}</span>
            <span className="font-semibold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function AnalyticsCard({ title, data, labelKey = "month" }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 rounded-2xl border border-glass-border/40 bg-background/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data || []} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} />
              <XAxis dataKey={labelKey} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Line type="monotone" dataKey="value" name={title} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;