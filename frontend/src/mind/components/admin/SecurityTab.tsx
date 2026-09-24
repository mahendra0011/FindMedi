import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Textarea } from "@/mind/components/ui/textarea";
import { Activity, AlertTriangle, Bell, CheckCircle2, Megaphone, Shield, ShieldAlert, ShieldCheck, Star, UserCog } from "lucide-react";

export default function SecurityTab({ data, users, moderateReview, announcement, setAnnouncement, sendAnnouncement }) {
  return (
    <>
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
    </>
  );
}
