import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Progress } from "@/mind/components/ui/progress";
import { MessageCircle, Phone, Link as LinkIcon, Video, CalendarX, Power, Trash2, PlusCircle, CreditCard, History, Star, BadgeCheck, Heart, CheckCircle2 } from "lucide-react";
import { dayOptions, sessionStatusLabel, statusTone, counsellingModeLabel, formatMoney, initials } from "@/mind/lib/providerDashboardShared";

export function AppointmentInfo({ label, value }: any) {
  return (
    <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/45">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value || "Not available"}</div>
    </div>
  );
}

export function AvailabilityManager({
  bookingEnabled,
  setBookingEnabled,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  unavailableDates,
  unavailableDateDraft,
  setUnavailableDateDraft,
  onAddUnavailableDate,
  onRemoveUnavailableDate,
  onSave,
}: any) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-secondary" />
          Availability Management
        </CardTitle>
        <CardDescription>Set available days, add time slots, mark unavailable dates, and enable or disable bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setBookingEnabled(!bookingEnabled)}
          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
            bookingEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"
          }`}
        >
          <span>
            <span className="block font-semibold">{bookingEnabled ? "Booking availability enabled" : "Booking availability paused"}</span>
            <span className="mt-1 block text-xs text-foreground/60">Users can book only when this is enabled.</span>
          </span>
          <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
        </button>

        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-glass-border/40 bg-background/60 p-3 sm:grid-cols-[1fr_90px_90px_36px]">
              <Select value={row.day} onValueChange={(value) => onRowChange(row.id, "day", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" value={row.start} onChange={(event) => onRowChange(row.id, "start", event.target.value)} />
              <Input type="time" value={row.end} onChange={(event) => onRowChange(row.id, "end", event.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => onRemoveRow(row.id)} aria-label="Remove availability slot">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={onAddRow}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add available time slot
          </Button>
        </div>

        <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3">
          <div className="text-sm font-semibold">Unavailable dates</div>
          <div className="mt-3 flex gap-2">
            <Input type="date" value={unavailableDateDraft} onChange={(event) => setUnavailableDateDraft(event.target.value)} />
            <Button type="button" variant="outline" onClick={onAddUnavailableDate}>
              Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unavailableDates.length ? (
              unavailableDates.map((date: any) => (
                <button
                  type="button"
                  key={date}
                  onClick={() => onRemoveUnavailableDate(date)}
                  className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-500"
                >
                  {date} x
                </button>
              ))
            ) : (
              <span className="text-xs text-foreground/55">No unavailable dates marked.</span>
            )}
          </div>
        </div>

        <Button onClick={onSave} className="w-full">
          Save availability
        </Button>
      </CardContent>
    </Card>
  );
}

export function SessionCard({ appointment, packageBadge, draft, onDraft, onReschedule, onComplete, onCancel, onMeet, onChat }: any) {
  const displayStatus = sessionStatusLabel(appointment.status);
  const mode = String(appointment.mode || "google-meet");
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{appointment.studentName || appointment.studentEmail}</h3>
            <Badge className={(statusTone as any)[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
            <Badge className="bg-foreground/10 text-foreground">{counsellingModeLabel(appointment.mode)}</Badge>
            <Badge variant="secondary">{appointment.supportPlanName || "Counselling package"}</Badge>
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
          <p className="mt-1 text-sm text-foreground/60">{appointment.date} at {appointment.time}</p>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
          {appointment.notes && <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-foreground/70">Note: {appointment.notes}</p>}
        </div>

        <div className="w-full space-y-3 xl:w-[360px]">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.date || ""} onChange={(event) => onDraft("date", event.target.value)} />
            <Input type="time" value={draft.time || ""} onChange={(event) => onDraft("time", event.target.value)} />
          </div>
          {mode === "chat-only" ? (
            <Button size="sm" className="w-full gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
              <MessageCircle className="mr-1 h-4 w-4" /> Open Chat
            </Button>
          ) : mode === "voice-call" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                const tel = appointment.studentPhone || "";
                if (tel) window.open(`tel:${tel}`, "_self");
              }}>
                <Phone className="mr-1 h-4 w-4" /> Voice Call
              </Button>
              <Badge variant="outline" className="h-8 px-2 grid place-items-center text-[10px]">No meet link</Badge>
            </div>
          ) : mode === "in-person" ? (
            <Badge variant="outline" className="w-full h-8 grid place-items-center border-amber-500/30 text-amber-500 text-xs">In-person — check clinic address in profile</Badge>
          ) : (
            <>
              {!appointment.meetingLink && (
                <Input
                  value={draft.meetingLink || ""}
                  onChange={(event) => onDraft("meetingLink", event.target.value)}
                  placeholder="Paste shared Google Meet room link"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
                {appointment.meetingLink ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                      <LinkIcon className="mr-1 h-4 w-4" />
                      Open same Meet
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onMeet}>
                    <Video className="mr-1 h-4 w-4" />
                    Save Meet
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onChat?.(appointment.studentId || appointment.studentEmail, appointment.studentName)}>
                  <MessageCircle className="mr-1 h-3 w-3" /> Chat
                </Button>
                {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
                {!["cancelled", "completed"].includes(appointment.status) && (
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
          {(mode === "chat-only" || mode === "voice-call" || mode === "in-person") && (
            <div className="flex flex-wrap gap-2">
              {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
              {!["cancelled", "completed"].includes(appointment.status) && (
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TimelineItem({ appointment }: any) {
  return (
    <div className="flex gap-3 rounded-lg bg-foreground/5 p-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{appointment.date} at {appointment.time}</div>
        <div className="text-xs text-foreground/60">{appointment.status} - {counsellingModeLabel(appointment.mode)}</div>
        {appointment.supportPlanName && <div className="mt-1 text-xs text-foreground/60">Plan: {appointment.supportPlanName}</div>}
        {appointment.concern && <div className="mt-1 line-clamp-2 text-xs text-foreground/70">{appointment.concern}</div>}
      </div>
    </div>
  );
}

export function WellnessMiniLine({ label, value, color = "text-foreground/70" }: any) {
  return (
    <div className="flex items-center justify-between border-b border-glass-border/20 pb-2 last:border-0">
      <span className="text-[11px] text-foreground/50 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-medium ${color} text-right max-w-[55%] truncate`}>{value}</span>
    </div>
  );
}

export function PatientDetailLine({ label, value }: any) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/70 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "Not available"}</div>
    </div>
  );
}

export function ProgressRow({ label, value }: any) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground/75">{label}</span>
        <span className="font-semibold">{Math.round(value || 0)}%</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, Number(value) || 0))} />
    </div>
  );
}

export function SettingToggle({ icon: Icon = undefined, title, text, checked, onToggle }: { icon?: any; title: any; text: any; checked: any; onToggle: any }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40"
    >
      <span className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
            checked ? "border-primary/30 bg-primary/10 text-primary" : "border-glass-border/30 bg-background/40 text-foreground/50"
          }`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span>
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-sm text-foreground/65">{text}</span>
        </span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-foreground/20"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function ProfileLine({ label, value }: any) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-3 text-sm">
      <span className="text-foreground/60">{label}</span>
      <span className="max-w-[65%] text-right font-medium capitalize">{value || "Not set"}</span>
    </div>
  );
}

export function TransactionRow({ txn }: any) {
  const date = txn.date ? new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  return (
    <div className="flex items-center justify-between rounded-xl border border-glass-border/30 bg-background/60 p-3 transition hover:bg-background/80">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
          {txn.patientAvatar ? (
            <img src={txn.patientAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <CreditCard className="h-4 w-4 text-emerald-500" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">{txn.patientName || "Anonymous"}</div>
          <div className="text-xs text-foreground/55">{date} • {txn.plan || "Session"}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-emerald-500">{formatMoney(txn.amount)}</div>
        <div className="text-xs text-foreground/50">{txn.status === "paid" ? "Completed" : txn.status}</div>
      </div>
    </div>
  );
}

export function TransactionRowEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-glass-border/40 bg-background/40 p-6 text-center">
      <History className="mx-auto h-8 w-8 text-primary/50" />
      <div className="mt-2 text-sm font-medium">No transactions yet</div>
      <p className="mt-1 text-xs text-foreground/55">Complete sessions will show earnings here.</p>
    </div>
  );
}

export function ReviewStatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4 text-center">
      <Icon className={`mx-auto h-6 w-6 ${color}`} />
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-xs text-foreground/55">{label}</div>
    </div>
  );
}

export function ReviewCard({ review, index }: any) {
  const delay = index * 100;
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4 transition-all duration-300 hover:border-glass-border/60 hover:shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white">
              {initials(review.studentName || "U")}
            </div>
            <div>
              <div className="font-semibold">{review.studentName || "Anonymous user"}</div>
              <div className="text-xs text-foreground/55">{review.date ? new Date(review.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}</div>
            </div>
          </div>
          {review.comment && <p className="mt-3 text-sm text-foreground/70">{review.comment}</p>}
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < Math.floor(review.rating || 0) ? "fill-amber-500 text-amber-500" : "text-foreground/20"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ReviewMetricBar label="Professionalism" value={review.professionalism || 0} icon={BadgeCheck} />
        <ReviewMetricBar label="Helpfulness" value={review.helpfulness || 0} icon={Heart} />
        <ReviewMetricBar label="Communication" value={review.communication || 0} icon={MessageCircle} />
      </div>
    </div>
  );
}

export function ReviewMetricBar({ label, value, icon: Icon }: any) {
  const percentage = Math.round((value || 0) * 20);
  const getColor = () => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 60) return "text-amber-500";
    return "text-rose-500";
  };
  
  return (
    <div className="rounded-xl border border-glass-border/30 bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${getColor()}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${getColor()}`}>{percentage}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-glass-border/30 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 80 ? "bg-emerald-500" : percentage >= 60 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: any) {
  return (
    <div className="rounded-2xl border border-dashed border-glass-border/60 bg-background/45 p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-sm text-foreground/60">{text}</p>
    </div>
  );
}

export function RequestRow({ appointment, onConfirm, onDecline, onMeet, onChat }: any) {
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

export function UpcomingAppointmentCard({ appointment, packageBadge, draft, onDraft, onReschedule, onMeet, onChat }: any) {
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
            <Input type="date" value={draft?.date || ""} onChange={(event) => onDraft?.("date", event.target.value)} />
            <Input type="time" value={draft?.time || ""} onChange={(event) => onDraft?.("time", event.target.value)} />
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
