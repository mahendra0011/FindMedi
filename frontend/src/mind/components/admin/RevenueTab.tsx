import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Activity, BarChart3, CheckCircle2, CreditCard, ShieldAlert, Users } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function RevenueTab({ data }) {
  return (
    <>
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
    </>
  );
}
