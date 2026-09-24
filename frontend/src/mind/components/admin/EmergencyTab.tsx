import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { MessageCircle, Phone, ShieldAlert, ShieldCheck } from "lucide-react";

export default function EmergencyTab({ data, users }) {
  return (
    <>
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
    </>
  );
}
