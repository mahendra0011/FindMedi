import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Activity, AlertTriangle, BarChart3, CalendarDays, CheckCircle2, Users } from "lucide-react";
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

export default function AnalyticsTab({ data, users, totals }) {
  return (
    <>
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
    </>
  );
}
