import {
  Palette,
  Sparkles,
  Package,
  Pencil,
  Trash2,
  Plus,
  BadgeCheck,
  Camera,
  Power,
  Lock,
  CalendarCheck,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Textarea } from "@/mind/components/ui/textarea";
import { Button } from "@/mind/components/ui/button";
import ProviderSettingsMaster from "@/mind/components/ProviderSettingsMaster";
import {
  ProfileLine,
  SettingToggle,
  AvailabilityManager,
} from "@/mind/components/ProviderDashboardComponents";
import {
  packagePricePlans,
  dayOptions,
  newAvailabilityRow,
  formatMoney,
  counsellorPayout,
  initials,
} from "@/mind/lib/providerDashboardShared";

export function ProviderSettingsTab({
  theme,
  setTheme,
  data,
  customPackages,
  addCustomPackage,
  updateCustomPackage,
  deleteCustomPackage,
  saveCustomPackages,
  profileDraft,
  setProfileDraft,
  uploadingPhoto,
  uploadProfilePhoto,
  meetLink,
  setMeetLink,
  bookingEnabled,
  setBookingEnabled,
  availabilityRows,
  setAvailabilityRows,
  unavailableDates,
  setUnavailableDates,
  unavailableDateDraft,
  setUnavailableDateDraft,
  saveProfileTools,
  providerSettings,
  setProviderSettings,
  privacySettings,
  setPrivacySettings,
  notificationSettings,
  setNotificationSettings,
  mode,
}) {
  return (
    <div className="space-y-6">
      {/* Theme Selection + Quick Profile */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-4 w-4 text-primary" />
              </span>
              <span>Dashboard Theme</span>
            </CardTitle>
            <CardDescription>Choose a calm, comfortable theme for your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { id: "default", name: "Midnight Calm", color: "bg-indigo-500" },
                { id: "lavender", name: "Lavender", color: "bg-violet-300" },
                { id: "sky", name: "Sky Blue", color: "bg-sky-300" },
                { id: "mint", name: "Mint Green", color: "bg-emerald-300" },
                { id: "soft", name: "Soft White", color: "bg-zinc-100" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-300 ${
                    theme === option.id
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-glass-border/40 bg-background/60 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {theme === option.id && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">✓</span>
                  )}
                  <div className={`mx-auto mb-3 h-10 w-10 rounded-full ${option.color} border-2 border-white/20 shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                    <div className={`h-full w-full rounded-full ${option.color} opacity-60 blur-sm`} />
                  </div>
                  <span className={`block text-center text-xs font-medium transition-colors ${theme === option.id ? "text-primary" : "text-foreground/80"}`}>
                    {option.name}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                <Sparkles className="h-4 w-4 text-secondary" />
              </span>
              <span>Profile at a Glance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-2">
              <ProfileLine label="Status" value={data.profile?.verificationBadge || "Verified Professional"} />
              <ProfileLine label="Type" value={data.profile?.counsellorType || "professional"} />
              <ProfileLine label="Packages" value={`${customPackages.filter((p) => p.name).length || packagePricePlans.length} active + One-Time`} />
              <ProfileLine label="Meet" value={data.stats?.googleMeetReady ? "Ready" : "Link needed"} />
              <ProfileLine label="Rating" value={`${data.stats?.rating || 4.8}/5`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Pricing - Dynamic Add/Delete */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/15 via-secondary/10 to-sky-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                <Package className="h-4 w-4 text-secondary" />
              </span>
              <div>
                <CardTitle>Package Pricing</CardTitle>
                <CardDescription>Create, edit, or remove packages. Users see these when booking. Platform fee is automatic.</CardDescription>
              </div>
            </div>
            <Button onClick={addCustomPackage} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Package
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {customPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="h-12 w-12 text-foreground/20 mb-3" />
              <p className="text-foreground/60 font-medium">No custom packages yet</p>
              <p className="text-sm text-foreground/50 mt-1 mb-4">Add your first package to show pricing options to users.</p>
              <Button onClick={addCustomPackage} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Package
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {customPackages.map((pkg, idx) => (
                <div key={pkg.id} className="group relative rounded-2xl border border-glass-border/40 bg-background/65 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        const id = pkg.id;
                        const name = prompt("Package name", pkg.name);
                        if (name !== null) updateCustomPackage(id, "name", name || "");
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 text-xs"
                      title="Edit name"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCustomPackage(pkg.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600 text-xs"
                      title="Delete package"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <input
                        value={pkg.name}
                        onChange={(e) => updateCustomPackage(pkg.id, "name", e.target.value)}
                        className="w-full bg-transparent font-semibold text-foreground border-b border-transparent focus:border-primary/40 focus:outline-none pb-0.5"
                        placeholder="Package name"
                      />
                    </div>
                    <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={pkg.isActive}
                        onChange={(e) => updateCustomPackage(pkg.id, "isActive", e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full bg-foreground/20 transition peer-checked:bg-primary" />
                      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white transition-all ${pkg.isActive ? "translate-x-4" : "translate-x-0"}`} />
                    </label>
                  </div>

                  <textarea
                    value={pkg.summary}
                    onChange={(e) => updateCustomPackage(pkg.id, "summary", e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground/70 resize-none border-b border-glass-border/20 focus:border-primary/30 focus:outline-none pb-1 mb-2"
                    placeholder="Brief description..."
                    rows={1}
                  />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-foreground/45">Duration</label>
                      <input
                        value={pkg.duration}
                        onChange={(e) => updateCustomPackage(pkg.id, "duration", e.target.value)}
                        className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                        placeholder="e.g. 4-8 sessions"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-foreground/45">Cadence</label>
                      <input
                        value={pkg.cadence}
                        onChange={(e) => updateCustomPackage(pkg.id, "cadence", e.target.value)}
                        className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                        placeholder="e.g. Weekly"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-foreground/45">Price (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={pkg.price}
                        onChange={(e) => updateCustomPackage(pkg.id, "price", Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-semibold border-b border-transparent focus:border-primary/30 focus:outline-none"
                        placeholder="1499"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-foreground/45">Sessions</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.sessionCount}
                        onChange={(e) => updateCustomPackage(pkg.id, "sessionCount", Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-semibold border-b border-transparent focus:border-primary/30 focus:outline-none"
                        placeholder="6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-foreground/45">Best for</label>
                    <input
                      value={Array.isArray(pkg.bestFor) ? pkg.bestFor.join(", ") : ""}
                      onChange={(e) => updateCustomPackage(pkg.id, "bestFor", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                      className="w-full bg-transparent text-xs border-b border-transparent focus:border-primary/30 focus:outline-none"
                      placeholder="Stress, Anxiety, Exams"
                    />
                  </div>

                  <div className="mt-3 pt-3 border-t border-glass-border/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/50">Your payout (after 2% platform fee)</span>
                      <span className="font-semibold text-emerald-500">{formatMoney(counsellorPayout(pkg.price, 2))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={saveCustomPackages} className="w-full gap-2" disabled={!customPackages.some((p) => p.name.trim())}>
            <Package className="h-4 w-4" />
            Save All Packages
          </Button>
        </CardContent>
      </Card>

      {/* Profile & Availability + Privacy & Notifications */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/8 via-secondary/5 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Profile & Availability
            </CardTitle>
            <CardDescription>Your public {mode} card, meeting link, and booking settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Specialization</label>
                <Input className="mt-1.5" value={profileDraft.specialization} onChange={(event) => setProfileDraft((current) => ({ ...current, specialization: event.target.value }))} placeholder="Relationship Therapist" />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input className="mt-1.5" value={profileDraft.location} onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Mumbai, IN" />
              </div>
              <div>
                <label className="text-sm font-medium">Clinic / Practice Name</label>
                <Input
                  className="mt-1.5"
                  value={profileDraft.clinicName || ""}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, clinicName: event.target.value }))}
                  placeholder="e.g. MindCare Clinic, Delhi"
                />
                <p className="text-xs text-slate-400 mt-1">This will appear on your profile and package bookings</p>
              </div>
              <div>
                <label className="text-sm font-medium">Clinic Address</label>
                <Input
                  className="mt-1.5"
                  value={profileDraft.clinicAddress || ""}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, clinicAddress: event.target.value }))}
                  placeholder="e.g. 123, Park Street, Colaba"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  className="mt-1.5"
                  value={profileDraft.city || ""}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, city: event.target.value }))}
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Education</label>
                <Input className="mt-1.5" value={profileDraft.education} onChange={(event) => setProfileDraft((current) => ({ ...current, education: event.target.value }))} placeholder="MA Clinical Psychology" />
              </div>
              <div>
                <label className="text-sm font-medium">Response time</label>
                <Input className="mt-1.5" value={profileDraft.responseTime} onChange={(event) => setProfileDraft((current) => ({ ...current, responseTime: event.target.value }))} placeholder="Within 24 hours" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                {data.profile?.verificationStatus === "approved" ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <Shield className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium text-sm">
                  Verification: {data.profile?.verificationStatus || "none"}
                </span>
              </div>
              {data.profile?.verificationBadge && (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  {data.profile.verificationBadge}
                </span>
              )}
              {data.profile?.verificationStatus !== "approved" && (
                <p className="text-xs text-slate-500 mt-2">
                  Your profile is pending verification. Admin will review your license and credentials.
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                License: {data.profile?.licenseNumber || "Not provided"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">About / bio</label>
              <Textarea className="mt-1.5 min-h-24" value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Describe your care style, approach, and the users you support." />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/20 text-2xl font-bold text-primary shadow-lg">
                {profileDraft.profilePhotoUrl ? (
                  <img src={profileDraft.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials(data.profile?.name || "C")}</span>
                )}
              </div>
              <div className="flex-1">
                <input type="file" accept="image/*" id="profile-photo-upload" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProfilePhoto(file); e.target.value = ""; }} />
                <label htmlFor="profile-photo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border/40 bg-background/60 px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-foreground/10">
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? "Uploading..." : "Upload photo"}
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Google Meet link</label>
                <Input className="mt-1.5" value={meetLink} onChange={(event) => setMeetLink(event.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                <p className="mt-1 text-xs text-foreground/50">Paste a reusable room link. Do not use meet.google.com/new.</p>
              </div>
              <button type="button" onClick={() => setBookingEnabled(!bookingEnabled)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${bookingEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"}`}>
                <span>
                  <span className="block text-sm font-semibold">{bookingEnabled ? "Bookings enabled" : "Bookings paused"}</span>
                  <span className="block text-xs text-foreground/60">Users can book only when enabled.</span>
                </span>
                <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
              </button>
            </div>

            <AvailabilityManager
              bookingEnabled={bookingEnabled}
              setBookingEnabled={setBookingEnabled}
              rows={availabilityRows}
              onRowChange={(id, key, value) => setAvailabilityRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)))}
              onAddRow={() => setAvailabilityRows((current) => [...current, newAvailabilityRow(dayOptions[current.length % dayOptions.length], "10:00", "16:00")])}
              onRemoveRow={(id) => setAvailabilityRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))}
              unavailableDates={unavailableDates}
              unavailableDateDraft={unavailableDateDraft}
              setUnavailableDateDraft={setUnavailableDateDraft}
              onAddUnavailableDate={() => {
                if (!unavailableDateDraft || unavailableDates.includes(unavailableDateDraft)) return;
                setUnavailableDates((current) => [...current, unavailableDateDraft].sort());
                setUnavailableDateDraft("");
              }}
              onRemoveUnavailableDate={(date) => setUnavailableDates((current) => current.filter((item) => item !== date))}
              onSave={saveProfileTools}
            />

            <Button onClick={saveProfileTools} className="gap-2">
              <BadgeCheck className="h-4 w-4" />
              Save Profile & Availability
            </Button>
          </CardContent>
        </Card>

        <ProviderSettingsMaster value={providerSettings} onChange={setProviderSettings} mode={mode} />

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-secondary" />
              Privacy & Notifications
            </CardTitle>
            <CardDescription>Control visibility, messaging, and alert preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-foreground/45 font-medium">Privacy</p>
              <SettingToggle title="Show online status" text="Active indicator in secure chat." checked={privacySettings.showOnlineStatus} onToggle={() => setPrivacySettings((current) => ({ ...current, showOnlineStatus: !current.showOnlineStatus }))} />
              <SettingToggle title="Allow patient messages" text="Let approved patients send follow-ups." checked={privacySettings.allowMessages} onToggle={() => setPrivacySettings((current) => ({ ...current, allowMessages: !current.allowMessages }))} />
              <SettingToggle title="Share progress insights" text="Use patient progress in care planning cards." checked={privacySettings.shareProgressWithCounsellor} onToggle={() => setPrivacySettings((current) => ({ ...current, shareProgressWithCounsellor: !current.shareProgressWithCounsellor }))} />
              <div>
                <label className="text-sm font-medium">Anonymous alias</label>
                <Input className="mt-1.5" value={privacySettings.anonymousDisplayName || ""} onChange={(event) => setPrivacySettings((current) => ({ ...current, anonymousDisplayName: event.target.value }))} placeholder={`MindSupport ${mode === "counsellor" ? "Counsellor" : "Psychiatrist"}`} />
              </div>
            </div>
            <div className="pt-2 space-y-2">
              <p className="text-xs uppercase tracking-wide text-foreground/45 font-medium">Notifications</p>
              <SettingToggle icon={CalendarCheck} title="Session reminders" text="Bookings, reschedules, cancellations." checked={notificationSettings.session} onToggle={() => setNotificationSettings((current) => ({ ...current, session: !current.session }))} />
              <SettingToggle icon={MessageCircle} title="Chat messages" text="New patient messages and replies." checked={notificationSettings.messages} onToggle={() => setNotificationSettings((current) => ({ ...current, messages: !current.messages }))} />
              <SettingToggle icon={CreditCard} title="Payment updates" text="Payout and platform fee notices." checked={notificationSettings.payments} onToggle={() => setNotificationSettings((current) => ({ ...current, payments: !current.payments }))} />
              <SettingToggle icon={AlertTriangle} title="Emergency alerts" text="SOS and safety escalation notices." checked={notificationSettings.emergency} onToggle={() => setNotificationSettings((current) => ({ ...current, emergency: !current.emergency }))} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
