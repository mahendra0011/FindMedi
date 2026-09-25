import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  FileText,
  ClipboardCheck,
  BarChart3,
  Heart,
  Package,
  MessageCircle,
  Phone,
  Video,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WellnessMiniLine } from "@/mind/components/ProviderDashboardComponents";
import {
  initials,
  counsellingModeLabel,
  modeLabel,
} from "@/mind/lib/providerDashboardShared";

export function ProviderPatientsTab({
  patients,
  patientRiskFilter,
  setPatientRiskFilter,
  selectedPatientId,
  setSelectedPatientId,
  selectedPatient,
  setActiveChatPeer,
  setActiveChatPeerName,
  setSearchParams,
  selectedPatientSessions,
  averageAttendance,
}) {
  return (
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
                  {selectedPatient.progress == null ? (
                    <div className="h-36 flex items-center justify-center text-xs text-foreground/50 text-center px-4">
                      Not enough session data yet — progress appears after the first completed session or mood check-in.
                    </div>
                  ) : (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={[
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
                  )}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/60">Mood improvement</span>
                      <span className="font-semibold text-primary">{selectedPatient.progress != null ? `${selectedPatient.progress}%` : "—"}</span>
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
  );
}
