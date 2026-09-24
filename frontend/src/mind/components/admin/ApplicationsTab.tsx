import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { AlertTriangle, Briefcase, CheckCircle2, CreditCard, ExternalLink, FileText, Globe, Search, Shield, ShieldCheck, UserCog } from "lucide-react";

export default function ApplicationsTab({ data, users, reviewApplication }) {
  return (
    <>
  {/* Application Stats */}
  <div className="grid md:grid-cols-4 gap-4">
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
        </div>
        <div className="text-2xl font-bold text-blue-400">{data.counsellorApplications.length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-blue-400/60">Total applications</span>
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
        <div className="text-2xl font-bold text-amber-400">{data.counsellorApplications.filter(a => a.status === "pending" || a.status === "reviewing").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-amber-400/60">Awaiting review</span>
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
        <div className="text-2xl font-bold text-emerald-400">{data.counsellorApplications.filter(a => a.status === "approved").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400/60">Approved applications</span>
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
        <div className="text-2xl font-bold text-rose-400">{data.counsellorApplications.filter(a => a.status === "rejected").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs text-rose-400/60">Rejected applications</span>
        </div>
      </div>
    </div>
  </div>

  {/* Application Cards */}
  <div className="space-y-4">
    {data.counsellorApplications.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-glass-border/40 bg-background/40">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
          <FileText className="h-8 w-8 text-foreground/25" />
        </div>
        <p className="font-semibold text-foreground/60">No applications yet</p>
        <p className="text-sm text-foreground/50 mt-1">Counsellor applications will appear here when users submit them.</p>
      </div>
    ) : (
      data.counsellorApplications.map((application) => {
        const isApproved = application.status === "approved";
        const isRejected = application.status === "rejected";
        const isReviewing = application.status === "reviewing";
        const isPending = application.status === "pending" || !application.status;
        const isProfessional = application.requestedType === "professional";
      
        const statusColor = isApproved ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : 
                           isRejected ? "bg-rose-500/15 text-rose-600 border-rose-500/20" :
                           isReviewing ? "bg-blue-500/15 text-blue-600 border-blue-500/20" :
                           "bg-amber-500/15 text-amber-600 border-amber-500/20";
        const statusLabel = isApproved ? "Approved" : isRejected ? "Rejected" : isReviewing ? "Reviewing" : "Pending";
        const accentGradient = isApproved ? "from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" :
                              isRejected ? "from-rose-500/40 via-rose-400/30 to-rose-500/40" :
                              isReviewing ? "from-blue-500/40 via-blue-400/30 to-blue-500/40" :
                              "from-amber-500/40 via-amber-400/30 to-amber-500/40";
        const avatarGradient = isApproved ? "from-emerald-500/30 to-emerald-500/10 border-emerald-500/20" :
                              isRejected ? "from-rose-500/30 to-rose-500/10 border-rose-500/20" :
                              isReviewing ? "from-blue-500/30 to-blue-500/10 border-blue-500/20" :
                              "from-amber-500/30 to-amber-500/10 border-amber-500/20";
      
        return (
          <div key={application.id} className="group relative overflow-hidden rounded-2xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />
          
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient} border`}>
                    <span className="text-lg font-bold text-foreground/80">{application.fullName?.charAt(0)?.toUpperCase() || "A"}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm leading-tight">{application.fullName}</div>
                    <div className="text-xs text-foreground/60 mt-0.5">{application.userEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] capitalize border ${statusColor}`}>{statusLabel}</Badge>
                  <Badge className={isProfessional ? "bg-blue-500/15 text-blue-600 border-blue-500/20 text-[10px]" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]"}>
                    {isProfessional ? "Verified Professional" : "Community Mentor"}
                  </Badge>
                </div>
              </div>

              {/* Specialization & Bio */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCog className="h-3.5 w-3.5 text-foreground/50" />
                  <span className="text-sm font-medium">{application.specialization}</span>
                </div>
                {application.bio && (
                  <p className="text-xs text-foreground/70 leading-relaxed bg-foreground/5 rounded-lg p-3">{application.bio}</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Briefcase className="h-3 w-3 text-foreground/50" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Experience</span>
                  </div>
                  <p className="text-sm font-medium">{application.experience || "—"}</p>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="h-3 w-3 text-foreground/50" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Pricing</span>
                  </div>
                  <p className="text-sm font-medium">Rs. {application.sessionPricing || 0}/session</p>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="h-3 w-3 text-foreground/50" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Languages</span>
                  </div>
                  <p className="text-sm font-medium">{(application.languages || []).join(", ") || "—"}</p>
                </div>
              </div>

              {/* Documents & Verification */}
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-foreground/50" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Identity</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70">{application.idDocumentType || "Not specified"}</span>
                    <Badge className={application.idDocumentNumber ? "bg-emerald-500/15 text-emerald-600 text-[10px]" : "bg-amber-500/15 text-amber-600 text-[10px]"}>
                      {application.idDocumentNumber ? "Provided" : "Missing"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-3.5 w-3.5 text-foreground/50" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">License</span>
                  </div>
                  <p className="text-xs text-foreground/70">{application.licenseNumber || "Not provided"}</p>
                </div>
              </div>

              {/* LinkedIn & Notes */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {application.linkedin && (
                  <a href={application.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    LinkedIn Profile
                  </a>
                )}
                {application.verificationNotes && (
                  <div className="w-full rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-600/80">{application.verificationNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-glass-border/30">
                <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "reviewing")} className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                  <Search className="h-3.5 w-3.5" /> Review
                </Button>
                <Button size="sm" onClick={() => reviewApplication(application, "approved")} className="h-8 text-xs gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25 border">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "rejected")} className="h-8 text-xs gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                  <X className="h-3.5 w-3.5" /> Reject
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
