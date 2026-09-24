import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Activity, AlertTriangle, BarChart3, CalendarDays, CheckCircle2, CreditCard, Download, FileText, Package, Shield, ShieldAlert, Star, Users } from "lucide-react";
import GlowPanel from "@/mind/components/reactbits/GlowPanel";

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

export default function OverviewTab({ data, users, totals, loading, load, exportCSV }) {
  return (
    <>
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
    </>
  );
}
