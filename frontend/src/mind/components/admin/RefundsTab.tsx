import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { AlertTriangle, CheckCircle2, CreditCard, Download, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { api } from "@/mind/lib/api";

export default function RefundsTab({ data, users, packages }) {
  return (
    <>
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
    </>
  );
}
