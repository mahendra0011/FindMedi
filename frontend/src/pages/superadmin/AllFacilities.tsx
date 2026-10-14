import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Building, Search, Ban, Trash2, ChevronDown, ChevronRight,
  UserRound, Clock, CheckCircle, XCircle, Mail, MapPin, FileText,
  ShieldAlert, ShieldCheck, Lock, Unlock, Eye, AlertTriangle, ExternalLink,
  Layers, RefreshCw, Filter, UserCheck, AlertOctagon, UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/System';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-success/10 text-success border-success/30',
  approved: 'bg-success/10 text-success border-success/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  pending: 'bg-warning/10 text-warning border-warning/30',
  suspended: 'bg-destructive/10 text-destructive border-destructive/30',
  banned: 'bg-destructive/20 text-destructive border-destructive/50',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  draft: 'bg-muted text-muted-foreground border-border',
};

const PROVIDER_GROUPS = [
  { key: '', label: 'All Groups' },
  { key: 'clinical', label: 'Clinical (T1)' },
  { key: 'diagnostics', label: 'Diagnostics & Labs' },
  { key: 'pharmacy', label: 'Pharmacy & Supplies' },
  { key: 'transport', label: 'Transport & Fleet' },
  { key: 'home_service', label: 'Home Healthcare' },
  { key: 'wellness', label: 'Wellness & Fitness' },
  { key: 'professional', label: 'Professional Services' },
  { key: 'info', label: 'Info & Helplines' },
];

const SENSITIVE_KEYWORDS = ['ivf', 'fertility', 'de-addiction', 'deaddiction', 'palliative', 'hospice', 'sexual', 'cosmetic', 'transplant', 'organ', 'hiv', 'std', 'mental_health', 'psych'];

export function isSensitiveProvider(provider: any): boolean {
  if (provider?.isSensitive || provider?.sensitive) return true;
  const t = `${provider?.type || ''} ${provider?.category || ''} ${provider?.name || ''}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => t.includes(kw));
}

export function isInfoOnlyProvider(provider: any): boolean {
  return Boolean(
    provider?.isInfoOnly ||
    provider?.kind === 'info' ||
    provider?.type === 'helpline' ||
    provider?.type === 'govt_facility' ||
    provider?.type === 'info'
  );
}

const SUB_TABS = [
  { key: 'all_providers', label: 'All Providers (52 Types)', icon: Layers },
  { key: 'hospitals', label: 'Legacy Hospitals', icon: Building2 },
  { key: 'facilities', label: 'Legacy Pending Requests', icon: Building },
];

export default function AllFacilities() {
  const [subTab, setSubTab] = useState('all_providers');

  // All Providers State (Spec 08 §3)
  const [providers, setProviders] = useState<any[]>([]);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersPage, setProvidersPage] = useState(1);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerGroup, setProviderGroup] = useState('');
  const [providerStatus, setProviderStatus] = useState('all');
  const [providersLoading, setProvidersLoading] = useState(false);

  // Modals & Action State
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; provider: any; reason: string; status: string }>({
    open: false, provider: null, reason: '', status: 'suspended'
  });
  const [probationModal, setProbationModal] = useState<{ open: boolean; provider: any; active: boolean; payoutHold: boolean; cap: number }>({
    open: false, provider: null, active: false, payoutHold: false, cap: 0
  });
  const [impersonateModal, setImpersonateModal] = useState<{ open: boolean; provider: any; reason: string }>({
    open: false, provider: null, reason: ''
  });
  const [strikeModal, setStrikeModal] = useState<{ open: boolean; provider: any; note: string }>({
    open: false, provider: null, note: ''
  });

  // Legacy Hospital & Facility State
  const [allHospitals, setAllHospitals] = useState<any[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [expandedHospitalId, setExpandedHospitalId] = useState<string | null>(null);
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [pendingFacilities, setPendingFacilities] = useState<any[]>([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityRejectingId, setFacilityRejectingId] = useState<string | null>(null);
  const [facilityRejectReason, setFacilityRejectReason] = useState('');

  // Fetch Providers (Admin endpoint with fallback)
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const q = new URLSearchParams();
      if (providerStatus && providerStatus !== 'all') q.set('status', providerStatus);
      if (providerGroup) q.set('group', providerGroup);
      if (providerSearch.trim()) q.set('q', providerSearch.trim());
      q.set('page', String(providersPage));
      q.set('limit', '25');

      const res: any = await api.get(`/providers/admin/list?${q.toString()}`).catch(async () => {
        // Fallback to public list if admin list is empty
        return await api.get(`/providers?${q.toString()}&all=1`);
      });

      const list = res?.providers || res?.data || (Array.isArray(res) ? res : []);
      setProviders(list);
      setProvidersTotal(Number(res?.total) || list.length);
    } catch {
      toast.error('Failed to load providers list');
    } finally {
      setProvidersLoading(false);
    }
  }, [providerStatus, providerGroup, providerSearch, providersPage]);

  useEffect(() => {
    if (subTab === 'all_providers') {
      fetchProviders();
    }
  }, [subTab, fetchProviders]);

  // Legacy Hospitals fetch
  useEffect(() => {
    if (subTab === 'hospitals') {
      setHospitalsLoading(true);
      api.getHospitals({})
        .then((data: any) => setAllHospitals(data?.hospitals || data?.data || (Array.isArray(data) ? data : [])))
        .catch(() => toast.error('Failed to load hospitals'))
        .finally(() => setHospitalsLoading(false));
    }
  }, [subTab]);

  // Legacy Facilities fetch
  useEffect(() => {
    if (subTab === 'facilities') {
      setFacilityLoading(true);
      api.getPendingFacilities('')
        .then((data: any) => setPendingFacilities(data?.facilities || data?.data || (Array.isArray(data) ? data : [])))
        .catch(() => toast.error('Failed to load facilities'))
        .finally(() => setFacilityLoading(false));
    }
  }, [subTab]);

  // Status transition handler (Suspend / Reinstate)
  const handleStatusTransition = async () => {
    if (!suspendModal.provider) return;
    try {
      await api.post(`/providers/${suspendModal.provider._id}/status`, {
        status: suspendModal.status,
        reason: suspendModal.reason.trim(),
      });
      toast.success(`Provider status updated to ${suspendModal.status}`);
      setSuspendModal({ open: false, provider: null, reason: '', status: 'suspended' });
      fetchProviders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update status');
    }
  };

  // Probation toggle handler
  const handleSaveProbation = async () => {
    if (!probationModal.provider) return;
    try {
      await api.post(`/providers/${probationModal.provider._id}/probation`, {
        active: probationModal.active,
        bookingCap: Number(probationModal.cap) || 0,
        payoutHold: probationModal.payoutHold,
      });
      toast.success('Probation parameters updated');
      setProbationModal({ open: false, provider: null, active: false, payoutHold: false, cap: 0 });
      fetchProviders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update probation');
    }
  };

  // Impersonate / View-As handler
  const handleImpersonate = async () => {
    if (!impersonateModal.provider || !impersonateModal.reason.trim()) {
      toast.error('An audited reason is required for View-As mode');
      return;
    }
    try {
      const res: any = await api.post(`/providers/${impersonateModal.provider._id}/view-as`, {
        reason: impersonateModal.reason.trim(),
      });
      toast.success(res?.message || 'Read-only View-As session authorized (30 min)');
      setImpersonateModal({ open: false, provider: null, reason: '' });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to start view-as session');
    }
  };

  // Issue Strike handler
  const handleIssueStrike = async () => {
    if (!strikeModal.provider || !strikeModal.note.trim()) {
      toast.error('A justification note is required to issue a strike');
      return;
    }
    try {
      await api.post(`/moderation/provider-${strikeModal.provider._id}/action`, {
        action: 'strike',
        note: strikeModal.note.trim(),
      }).catch(async () => {
        // Fallback to provider status suspension if direct strike action not in queue
        await api.post(`/providers/${strikeModal.provider._id}/status`, {
          status: 'suspended',
          reason: `Strike issued: ${strikeModal.note.trim()}`,
        });
      });
      toast.success('Strike recorded against provider profile');
      setStrikeModal({ open: false, provider: null, note: '' });
      fetchProviders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to issue strike');
    }
  };

  // Legacy doctors toggle
  const toggleHospitalDoctors = async (hospitalId: string) => {
    if (expandedHospitalId === hospitalId) {
      setExpandedHospitalId(null);
      return;
    }
    setExpandedHospitalId(hospitalId);
    setDoctorsLoading(true);
    try {
      const res: any = await api.get(`/doctors?hospitalId=${hospitalId}`).catch(() => []);
      setHospitalDoctors(Array.isArray(res) ? res : res?.doctors || []);
    } catch {
      setHospitalDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Provider & Facility Management Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational governance for 52 provider types across clinical, diagnostic, transport & wellness groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fetchProviders()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: ALL PROVIDERS (52 TYPES) ─────────────────────────────── */}
      {subTab === 'all_providers' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, city, slug..."
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  className="pl-9 text-xs h-8"
                />
              </div>

              <select
                value={providerGroup}
                onChange={(e) => setProviderGroup(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 h-8 text-foreground"
              >
                {PROVIDER_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>

              <select
                value={providerStatus}
                onChange={(e) => setProviderStatus(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 h-8 text-foreground capitalize"
              >
                <option value="all">All Statuses</option>
                <option value="live">Live</option>
                <option value="under_review">Under Review</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground">
              Total: <strong className="text-foreground">{providersTotal}</strong> providers
            </div>
          </div>

          {/* Providers Grid */}
          {providersLoading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : providers.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
              <Building className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-semibold text-foreground">No providers found</p>
              <p className="text-xs mt-1">Try broadening your search term or status filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p) => {
                const statusChip = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                return (
                  <Card key={p._id} className="border border-border/70 hover:border-border transition-all shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">{p.name}</h3>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            /{p.slug || p._id} · {p.kind || 'facility'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${statusChip}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.type?.replace('_', ' ') || 'General'}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          Tier {p.tier || 'T3'}
                        </Badge>
                        {isInfoOnlyProvider(p) && (
                          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] border-sky-500/30">
                            Info-Only · No Booking CTA
                          </Badge>
                        )}
                        {isSensitiveProvider(p) && (
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] border-purple-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Sensitive 🔒
                          </Badge>
                        )}
                        {p.probation?.active && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                            Probation ({p.probation.bookingCap || 'Cap'} slots)
                          </Badge>
                        )}
                        {p.probation?.payoutHold && (
                          <Badge className="bg-destructive/15 text-destructive text-[10px]">
                            Payout Hold
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/50">
                        <p className="truncate flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                          {p.address?.city || 'No city'}{p.address?.area ? `, ${p.address.area}` : ''}
                        </p>
                        <p className="truncate flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                          Joined: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                        </p>
                        {(p.sourceVerifiedDate || p.lastVerifiedAt) && (
                          <p className="truncate flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
                            <CheckCircle className="w-3 h-3 shrink-0" />
                            Source verified: {new Date(p.sourceVerifiedDate || p.lastVerifiedAt).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                        {p.status === 'live' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setSuspendModal({ open: true, provider: p, reason: '', status: 'suspended' })}
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 text-success border-success/30 hover:bg-success/10"
                            onClick={() => setSuspendModal({ open: true, provider: p, reason: '', status: 'live' })}
                          >
                            <CheckCircle className="w-3 h-3" /> Reinstate
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => setProbationModal({
                            open: true,
                            provider: p,
                            active: Boolean(p.probation?.active),
                            payoutHold: Boolean(p.probation?.payoutHold),
                            cap: p.probation?.bookingCap || 15
                          })}
                        >
                          <ShieldAlert className="w-3 h-3 text-amber-500" /> Probation
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => setImpersonateModal({ open: true, provider: p, reason: '' })}
                        >
                          <Eye className="w-3 h-3 text-blue-500" /> View-As
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => setStrikeModal({ open: true, provider: p, note: '' })}
                        >
                          <AlertTriangle className="w-3 h-3" /> Strike
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: LEGACY HOSPITALS ───────────────────────────────────────── */}
      {subTab === 'hospitals' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {hospitalsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allHospitals
                .filter((h) => !hospitalSearch || (h.name || '').toLowerCase().includes(hospitalSearch.toLowerCase()))
                .map((h) => (
                  <Card key={h._id} className="border border-border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{h.name}</h4>
                          <p className="text-xs text-muted-foreground">{h.city || 'City N/A'} · {h.type || 'Hospital'}</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{h.status || 'Active'}</Badge>
                      </div>
                      <div className="pt-2 flex justify-between items-center text-xs">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleHospitalDoctors(h._id)}>
                          {expandedHospitalId === h._id ? 'Hide Doctors' : 'Show Doctors'}
                        </Button>
                        <span className="text-muted-foreground">ID: {h._id.slice(-6)}</span>
                      </div>
                      {expandedHospitalId === h._id && (
                        <div className="p-2 rounded bg-muted/30 border text-xs space-y-1">
                          {doctorsLoading ? (
                            <p className="text-muted-foreground">Loading affiliated doctors...</p>
                          ) : hospitalDoctors.length === 0 ? (
                            <p className="text-muted-foreground">No doctors affiliated</p>
                          ) : (
                            hospitalDoctors.map((doc) => (
                              <div key={doc._id} className="flex justify-between py-0.5 border-b border-border/40 last:border-0">
                                <span>{doc.name}</span>
                                <span className="text-muted-foreground">{doc.specialization}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: LEGACY PENDING FACILITIES ──────────────────────────────── */}
      {subTab === 'facilities' && (
        <div className="space-y-4">
          {facilityLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingFacilities.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40 text-success" />
              <p className="font-semibold text-foreground">No pending facilities</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingFacilities.map((f) => (
                <Card key={f._id} className="border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-foreground">{f.name}</h4>
                      <Badge className="bg-warning/10 text-warning text-xs">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.email} · {f.city}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-success hover:bg-success/90"
                        onClick={async () => {
                          await api.approveFacility(f._id);
                          toast.success('Approved');
                          setPendingFacilities((prev) => prev.filter((p) => p._id !== f._id));
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={async () => {
                          await api.rejectFacility(f._id, 'Requirements not met');
                          toast.success('Rejected');
                          setPendingFacilities((prev) => prev.filter((p) => p._id !== f._id));
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SUSPEND / REINSTATE MODAL ────────────────────────────────────── */}
      {suspendModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              {suspendModal.status === 'suspended' ? 'Suspend Provider Listing' : 'Reinstate Provider to Live'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Provider: <strong className="text-foreground">{suspendModal.provider?.name}</strong>
            </p>
            <Input
              value={suspendModal.reason}
              onChange={(e) => setSuspendModal((s) => ({ ...s, reason: e.target.value }))}
              placeholder="Reason for suspension / reactivation (required for audit log)…"
              className="text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setSuspendModal({ open: false, provider: null, reason: '', status: 'suspended' })}>
                Cancel
              </Button>
              <Button size="sm" variant={suspendModal.status === 'suspended' ? 'destructive' : 'default'} onClick={handleStatusTransition}>
                Confirm {suspendModal.status === 'suspended' ? 'Suspension' : 'Reinstatement'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROBATION & RISK MODAL ────────────────────────────────────────── */}
      {probationModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Provider Probation & Payout Controls
            </h3>
            <p className="text-xs text-muted-foreground">
              Provider: <strong className="text-foreground">{probationModal.provider?.name}</strong>
            </p>
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={probationModal.active}
                  onChange={(e) => setProbationModal((p) => ({ ...p, active: e.target.checked }))}
                  className="w-4 h-4 rounded text-primary"
                />
                Active Probation (Flags provider as high monitoring)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={probationModal.payoutHold}
                  onChange={(e) => setProbationModal((p) => ({ ...p, payoutHold: e.target.checked }))}
                  className="w-4 h-4 rounded text-destructive"
                />
                Payout Hold (Lock wallet settlement until review passes)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Daily Booking Cap:</span>
                <Input
                  type="number"
                  min="0"
                  value={probationModal.cap}
                  onChange={(e) => setProbationModal((p) => ({ ...p, cap: Number(e.target.value) || 0 }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setProbationModal({ open: false, provider: null, active: false, payoutHold: false, cap: 0 })}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProbation}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IMPERSONATE VIEW-AS MODAL ─────────────────────────────────────── */}
      {impersonateModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" /> Start Audited "View-As" Mode
            </h3>
            <p className="text-xs text-muted-foreground">
              Review portal experience for: <strong className="text-foreground">{impersonateModal.provider?.name}</strong>
            </p>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300">
              <p>• Read-only access: no bookings, payouts, or settings can be changed.</p>
              <p>• PHI is automatically masked.</p>
              <p>• Session expires automatically after 30 minutes and is recorded in the audit log.</p>
            </div>
            <Input
              value={impersonateModal.reason}
              onChange={(e) => setImpersonateModal((m) => ({ ...m, reason: e.target.value }))}
              placeholder="Investigation ticket / Reason for view-as (required)…"
              className="text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setImpersonateModal({ open: false, provider: null, reason: '' })}>
                Cancel
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleImpersonate}>
                Authorize Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ISSUE STRIKE MODAL ────────────────────────────────────────────── */}
      {strikeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-destructive" /> Issue Strike to Provider
            </h3>
            <p className="text-xs text-muted-foreground">
              Provider: <strong className="text-foreground">{strikeModal.provider?.name}</strong>
            </p>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
              <p>• Strike 1: Formal warning badge issued</p>
              <p>• Strike 2: 7-Day directory listing suspension</p>
              <p>• Strike 3: Permanent ban & payout freeze</p>
            </div>
            <Input
              value={strikeModal.note}
              onChange={(e) => setStrikeModal((s) => ({ ...s, note: e.target.value }))}
              placeholder="Violation description (e.g. fraudulent medical claim, severe patient complaint)…"
              className="text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setStrikeModal({ open: false, provider: null, note: '' })}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleIssueStrike}>
                Confirm Strike
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
