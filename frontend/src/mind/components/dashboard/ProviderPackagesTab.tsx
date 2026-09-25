import {
  Package,
  CheckCircle2,
  Clock,
  IndianRupee,
  Search,
  FileText,
  CalendarCheck,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { EmptyState } from "@/mind/components/ProviderDashboardComponents";
import {
  formatMoney,
  statusTone,
  counsellingModeLabel,
} from "@/mind/lib/providerDashboardShared";

export function ProviderPackagesTab({
  packageSummary,
  packageSearch,
  setPackageSearch,
  packageStatusFilter,
  setPackageStatusFilter,
  filteredPackages,
  selectedPackageForDetail,
  setSelectedPackageForDetail,
  setSearchParams,
  appointments,
  patients,
  setSelectedPatientId,
  data,
}) {
  return (
    <div className="space-y-6">
      {/* 1. Summary Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="glass-card dashboard-card-motion border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Package className="h-4 w-4 text-primary" />
              Active Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {packageSummary.activeCount}
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              {packageSummary.totalPackagesCount} all-time purchased
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card dashboard-card-motion border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              Sessions Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-cyan-400 tracking-tight">
              {packageSummary.sessionsRemainingTotal}
            </div>
            <p className="mt-1 text-xs text-foreground/50">Across all active packages</p>
          </CardContent>
        </Card>

        <Card className="glass-card dashboard-card-motion border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Clock className="h-4 w-4 text-amber-400" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
                {packageSummary.expiringSoonCount}
              </span>
              {packageSummary.expiringSoonCount > 0 && (
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <p className="mt-1 text-xs text-foreground/50">Within the next 7 days</p>
          </CardContent>
        </Card>

        <Card className="glass-card dashboard-card-motion border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <IndianRupee className="h-4 w-4 text-emerald-400" />
              Revenue Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const pkgRev = Number(packageSummary.packageRevenueThisMonth || 0);
              const oneRev = Number(packageSummary.oneTimeRevenueThisMonth || 0);
              const total = pkgRev + oneRev;
              const pkgPct = total > 0 ? Math.round((pkgRev / total) * 100) : 0;
              const onePct = 100 - pkgPct;
              return (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-emerald-400 tracking-tight">{formatMoney(total)}</span>
                    <span className="text-[10px] text-foreground/40">this month</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-foreground/10 overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pkgPct}%` }} />
                    <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${onePct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Package {formatMoney(pkgRev)} ({pkgPct}%)
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-sky-400">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> One-Time {formatMoney(oneRev)} ({onePct}%)
                    </span>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* 2. Package List with Search & Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Consultation Packages
              </CardTitle>
              <CardDescription>
                Track purchased plans, session consumption, cadence rules, and client progress.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                <Input
                  className="pl-9 w-full sm:w-56"
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                  placeholder="Search client or plan..."
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "active", label: "Active" },
                  { key: "expiring", label: "Expiring Soon" },
                  { key: "completed", label: "Completed" },
                  { key: "cancelled", label: "Cancelled" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setPackageStatusFilter(f.key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      packageStatusFilter === f.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredPackages.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const nowTime = Date.now();
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const isExpiringSoon =
                  pkg.status === "active" &&
                  pkg.expiryDate &&
                  new Date(pkg.expiryDate).getTime() - nowTime > 0 &&
                  new Date(pkg.expiryDate).getTime() - nowTime <= sevenDaysMs;

                return (
                  <div
                    key={pkg.id}
                    className="dashboard-card-motion group relative flex flex-col justify-between rounded-2xl border border-glass-border/40 bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-sm truncate">{pkg.userName}</h4>
                            {pkg.mode && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {counsellingModeLabel(pkg.mode)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/50 truncate mt-0.5">{pkg.userEmail}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize px-2 py-0.5 font-medium ${
                              pkg.status === "active"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : pkg.status === "completed"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {pkg.status}
                          </Badge>
                          {isExpiringSoon && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Expiring Soon
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-foreground/5 p-2.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-foreground/90">{pkg.planName}</span>
                          <span className="font-medium text-foreground/60">{formatMoney(pkg.price)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-foreground/65 mb-1.5">
                          <span>
                            Progress: {pkg.sessionsUsed}/{pkg.sessionsTotal} sessions
                          </span>
                          <span className="font-semibold text-primary">
                            {pkg.sessionsRemaining} left
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-primary to-cyan-400 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, pkg.progress || 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-foreground/60">
                        {pkg.expiryDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Valid Until</span>
                            <span className="font-medium">
                              {new Date(pkg.expiryDate).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {pkg.minCadenceDays > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Cadence Rule</span>
                            <span className="font-medium">Min {pkg.minCadenceDays}d between sessions</span>
                          </div>
                        )}
                        {pkg.lastSessionDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-foreground/45 uppercase tracking-wide">Last Session</span>
                            <span className="font-medium">
                              {new Date(pkg.lastSessionDate).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-glass-border/25 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs gap-1.5"
                        onClick={() => setSelectedPackageForDetail(pkg)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Package Details
                      </Button>
                      {pkg.status === "active" && pkg.sessionsRemaining > 0 && (
                        <Button
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setSearchParams({ tab: "sessions" })}
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          Sessions
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No packages found"
              text={packageSearch || packageStatusFilter !== "all" ? "Try adjusting your filter or search query." : "When clients buy packages from your profile, they will appear here."}
            />
          )}
        </CardContent>
      </Card>

      {/* 3. Package Detail Modal / Drawer */}
      {selectedPackageForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedPackageForDetail(null)}
        >
          <div
            className="glass-card relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-glass-border/50 bg-background/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-glass-border/30 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{selectedPackageForDetail.planName}</h3>
                  <p className="text-xs text-foreground/50">
                    Client: {selectedPackageForDetail.userName} ({selectedPackageForDetail.userEmail})
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0"
                onClick={() => setSelectedPackageForDetail(null)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50">Status</div>
                  <div className="mt-1 font-bold capitalize text-primary">
                    {selectedPackageForDetail.status}
                  </div>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50">Total Sessions</div>
                  <div className="mt-1 font-bold">{selectedPackageForDetail.sessionsTotal}</div>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50">Remaining</div>
                  <div className="mt-1 font-bold text-emerald-400">
                    {selectedPackageForDetail.sessionsRemaining}
                  </div>
                </div>
                <div className="rounded-xl border border-glass-border/30 bg-foreground/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50">Price</div>
                  <div className="mt-1 font-bold">{formatMoney(selectedPackageForDetail.price)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-glass-border/30 bg-background/60 p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  Cadence & Booking Rules
                </h4>
                <p className="text-xs text-foreground/75">
                  • Cadence interval: {selectedPackageForDetail.minCadenceDays > 0 ? `Minimum ${selectedPackageForDetail.minCadenceDays} days between consecutive bookings` : "No cooldown constraint"}.
                </p>
                <p className="text-xs text-foreground/75">
                  • Auto-Confirmation: All package bookings automatically reserve confirmed slots without 409 multi-booking restrictions.
                </p>
                {selectedPackageForDetail.expiryDate && (
                  <p className="text-xs text-foreground/75">
                    • Expiry date: {new Date(selectedPackageForDetail.expiryDate).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}.
                  </p>
                )}
              </div>

              {/* Linked Sessions for this package */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  Linked Sessions In This Package
                </h4>
                {(() => {
                  const linkedSessions = appointments.filter(
                    (a) =>
                      a.packageId === selectedPackageForDetail.id ||
                      (a.studentEmail === selectedPackageForDetail.userEmail && a.supportPlanName === selectedPackageForDetail.planName)
                  );
                  if (!linkedSessions.length) {
                    return (
                      <p className="text-xs text-foreground/50 italic py-2">
                        No session bookings recorded under this package yet.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2 max-h-48 overflow-y-auto chat-scrollbar pr-1">
                      {linkedSessions.map((session, sIdx) => (
                        <div
                          key={session.id || sIdx}
                          className="flex items-center justify-between rounded-xl border border-glass-border/20 bg-background/60 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">#{sIdx + 1}</span>
                            <span>{session.date} at {session.time}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              {counsellingModeLabel(session.mode)}
                            </Badge>
                          </div>
                          <Badge className={statusTone[session.status] || statusTone.upcoming}>
                            {session.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-glass-border/30 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPackageForDetail(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPackageForDetail(null);
                  const pt = patients.find(p => p.email === selectedPackageForDetail.userEmail || p.id === selectedPackageForDetail.userId);
                  if (pt) setSelectedPatientId(pt.id);
                  setSearchParams({ tab: "patients" });
                }}
              >
                View Patient Care Profile →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Package Notifications — grouped by package lifecycle */}
      {(() => {
        const packageNotifs = (data.notifications || []).filter(
          (n) =>
            n.metadata?.packageId ||
            /package/i.test(n.title || "") ||
            /package/i.test(n.message || "")
        );
        if (!packageNotifs.length) return null;
        return (
          <Card className="glass-card border-violet-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4 text-violet-400" />
                Package Notifications
                <Badge variant="secondary" className="ml-auto text-xs">{packageNotifs.length}</Badge>
              </CardTitle>
              <CardDescription>Purchase, session booked, refund & expiry alerts — package-specific</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {packageNotifs.slice(0, 6).map((n, idx) => (
                <div key={n._id || idx} className="flex items-start gap-3 rounded-xl border border-glass-border/30 bg-background/60 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{n.title}</span>
                      {n.type === "payment" && (
                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">payment</Badge>
                      )}
                      {n.type === "booking" && (
                        <Badge variant="outline" className="text-[9px] h-4 border-sky-500/30 bg-sky-500/10 text-sky-400">booking</Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-foreground/40 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
