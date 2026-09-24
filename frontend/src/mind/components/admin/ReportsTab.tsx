import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function ReportsTab({ data, users, updateReportStatus }) {
  return (
    <>
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
    </>
  );
}
