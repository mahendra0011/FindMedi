import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { AlertTriangle, CalendarDays, CheckCircle2, ShieldAlert, ShieldCheck, UserCog, Users, Video } from "lucide-react";

export default function CounsellorsTab({ data, users, updateUserStatus, updateUserDetails }) {
  return (
    <>
  {/* Counsellor Stats */}
  <div className="grid md:grid-cols-4 gap-4">
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
        </div>
        <div className="text-2xl font-bold text-blue-400">{data.counsellors.length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-blue-400/60">Registered counsellors</span>
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
        <div className="text-2xl font-bold text-emerald-400">{data.counsellors.filter(c => c.status === "approved" || c.status === "active").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400/60">Verified counsellors</span>
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
          <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Pending</span>
        </div>
        <div className="text-2xl font-bold text-amber-400">{data.counsellors.filter(c => c.status === "pending" || !c.status).length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-amber-400/60">Awaiting approval</span>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-background p-5 group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-500/10 border border-rose-500/20">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-rose-400/60 font-medium">Suspended</span>
        </div>
        <div className="text-2xl font-bold text-rose-400">{data.counsellors.filter(c => c.status === "suspended").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs text-rose-400/60">Suspended accounts</span>
        </div>
      </div>
    </div>
  </div>

  {/* Counsellor Cards Grid */}
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
    {data.counsellors.length === 0 ? (
      <div className="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
          <UserCog className="h-8 w-8 text-foreground/25" />
        </div>
        <p className="font-semibold text-foreground/60">No counsellors yet</p>
        <p className="text-sm text-foreground/50 mt-1">Counsellors will appear here once they register and submit applications.</p>
      </div>
    ) : (
      data.counsellors.map((counsellor) => {
        const rating = counsellor.rating || 0;
        const isApproved = counsellor.status === "approved" || counsellor.status === "active";
        const isSuspended = counsellor.status === "suspended";
        const hasMeetLink = !!counsellor.meetLink;
        const statusColor = isApproved ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : 
                           isSuspended ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : 
                           "bg-amber-500/15 text-amber-600 border-amber-500/20";
        const statusLabel = isApproved ? "Active" : isSuspended ? "Suspended" : "Pending";
      
        return (
          <div key={counsellor.id} className="group relative overflow-hidden rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            {/* Top gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isApproved ? 'from-emerald-500/40 via-emerald-400/30 to-emerald-500/40' : isSuspended ? 'from-rose-500/40 via-rose-400/30 to-rose-500/40' : 'from-amber-500/40 via-amber-400/30 to-amber-500/40'}`} />
          
            <div className="p-5">
              {/* Header: Avatar + Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${isApproved ? 'from-emerald-500/30 to-emerald-500/10 border-emerald-500/20' : isSuspended ? 'from-rose-500/30 to-rose-500/10 border-rose-500/20' : 'from-amber-500/30 to-amber-500/10 border-amber-500/20'} border`}>
                    <span className="text-lg font-bold text-foreground/80">{counsellor.name?.charAt(0)?.toUpperCase() || "C"}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm leading-tight">{counsellor.name}</div>
                    <div className="text-xs text-foreground/60 mt-0.5">{counsellor.specialization || "General counselling"}</div>
                  </div>
                </div>
                <Badge className={`text-[10px] capitalize border ${statusColor}`}>{statusLabel}</Badge>
              </div>

              {/* Rating Stars */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-foreground/20"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-foreground/50">({counsellor.reviews || 0} reviews)</span>
                {hasMeetLink && (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px] ml-auto">
                    <Video className="h-3 w-3 mr-1" />
                    Meet ready
                  </Badge>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg bg-foreground/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">License</p>
                  <p className="text-xs font-medium mt-0.5 truncate">{counsellor.licenseNumber || "—"}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Type</p>
                  <p className="text-xs font-medium mt-0.5 capitalize">{counsellor.counsellorType || "Professional"}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Badge</p>
                  <p className="text-xs font-medium mt-0.5 truncate">{counsellor.verificationBadge || "Pending"}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Email</p>
                  <p className="text-xs font-medium mt-0.5 truncate">{counsellor.email || "—"}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Clinic</p>
                  <p className="text-xs font-medium mt-0.5 truncate">{counsellor.clinicName || counsellor.clinicAddress || "—"}</p>
                </div>
              </div>

              {/* Availability */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CalendarDays className="h-3 w-3 text-foreground/50" />
                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Availability</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(counsellor.availability || []).length > 0 ? (
                    counsellor.availability.map((slot, i) => (
                      <span key={i} className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded-md text-foreground/70">{slot}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-foreground/40 italic">Not set</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-glass-border/30">
                <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "approved")} className="h-7 text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                  verificationStatus: "approved",
                  verificationBadge: counsellor.counsellorType === "mentor" ? "Community Mentor" : "Verified Professional",
                  status: "approved",
                }, "License verified")} className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                  <ShieldCheck className="h-3 w-3" /> Verify
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                  availability: counsellor.availability?.length ? counsellor.availability : ["Mon 10:00-13:00", "Wed 14:00-17:00"],
                }, "Availability updated")} className="h-7 text-xs gap-1 border-violet-500/30 text-violet-600 hover:bg-violet-500/10">
                  <CalendarDays className="h-3 w-3" /> Slot
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "suspended")} className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                  <ShieldAlert className="h-3 w-3" /> Suspend
                </Button>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
    </>
  );
}
