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
import ApplicationsTab from "@/mind/components/admin/ApplicationsTab";
import CounsellorsTab from "@/mind/components/admin/CounsellorsTab";
import ReportsTab from "@/mind/components/admin/ReportsTab";
import RefundsTab from "@/mind/components/admin/RefundsTab";
import EmergencyTab from "@/mind/components/admin/EmergencyTab";
import SecurityTab from "@/mind/components/admin/SecurityTab";
import OverviewTab from "@/mind/components/admin/OverviewTab";
import UsersTab from "@/mind/components/admin/UsersTab";
import RevenueTab from "@/mind/components/admin/RevenueTab";
import ExportsTab from "@/mind/components/admin/ExportsTab";
import AnalyticsTab from "@/mind/components/admin/AnalyticsTab";

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
                <OverviewTab data={data} users={users} totals={totals} loading={loading} load={load} exportCSV={exportCSV} />
              </TabsContent>

              <TabsContent value="users" className="dashboard-tab-motion space-y-6">
                <UsersTab users={users} newUser={newUser} setNewUser={setNewUser} createUser={createUser} updateUserStatus={updateUserStatus} updateUserDetails={updateUserDetails} deleteUser={deleteUser} />
              </TabsContent>

              <TabsContent value="applications" className="dashboard-tab-motion space-y-6">
                <ApplicationsTab data={data} users={users} reviewApplication={reviewApplication} />
              </TabsContent>

              <TabsContent value="counsellors" className="dashboard-tab-motion space-y-6">
                <CounsellorsTab data={data} users={users} updateUserStatus={updateUserStatus} updateUserDetails={updateUserDetails} />
              </TabsContent>

              <TabsContent value="reports" className="dashboard-tab-motion space-y-6">
                <ReportsTab data={data} users={users} updateReportStatus={updateReportStatus} />
              </TabsContent>

              <TabsContent value="revenue" className="dashboard-tab-motion space-y-6">
                <RevenueTab data={data} />
              </TabsContent>

              <TabsContent value="refunds" className="dashboard-tab-motion space-y-6">
                <RefundsTab data={data} users={users} packages={packages} />
              </TabsContent>

              <TabsContent value="exports" className="dashboard-tab-motion space-y-6">
                <ExportsTab data={data} users={users} totals={totals} exportCSV={exportCSV} />
              </TabsContent>

              <TabsContent value="analytics" className="dashboard-tab-motion space-y-6">
                <AnalyticsTab data={data} users={users} totals={totals} />
              </TabsContent>

              <TabsContent value="emergency" className="dashboard-tab-motion space-y-6">
                <EmergencyTab data={data} users={users} />
              </TabsContent>

              <TabsContent value="security" className="dashboard-tab-motion space-y-6">
                <SecurityTab data={data} users={users} moderateReview={moderateReview} announcement={announcement} setAnnouncement={setAnnouncement} sendAnnouncement={sendAnnouncement} />
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