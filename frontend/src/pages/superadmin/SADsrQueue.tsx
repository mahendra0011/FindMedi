import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  Download, FileText, Search, RefreshCw, Calendar, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

interface DsrRow {
  id: string;
  _id?: string;
  userId?: string;
  type: 'access' | 'correction' | 'erasure' | 'export';
  status: 'submitted' | 'in_review' | 'verified' | 'fulfilled' | 'rejected';
  requestedAt: string;
  dueAt: string;
  overdue?: boolean;
  extensionReason?: string;
  resolutionNote?: string;
  exportRef?: string;
  details?: Record<string, any>;
  verification?: {
    method: string;
    at: string;
    by: string;
  };
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  access: { label: 'Right to Access', badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: FileText },
  correction: { label: 'Right to Correction', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: RefreshCw },
  erasure: { label: 'Right to Erasure (Forget)', badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: ShieldAlert },
  export: { label: 'Data Portability (Export)', badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: Download },
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  submitted: { label: 'Submitted', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  in_review: { label: 'In Review', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  verified: { label: 'Identity Verified', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  fulfilled: { label: 'Fulfilled ✅', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  rejected: { label: 'Rejected', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
};

export default function SADsrQueue() {
  const [requests, setRequests] = useState<DsrRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Decision modal state
  const [selectedReq, setSelectedReq] = useState<DsrRow | null>(null);
  const [actionType, setActionType] = useState<'review' | 'verify' | 'fulfill' | 'reject' | 'extend' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [verifyMethod, setVerifyMethod] = useState('aadhaar_otp');
  const [exportUrl, setExportUrl] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDsrQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'overdue') {
        params.set('overdue', '1');
      } else if (activeTab !== 'all') {
        params.set('status', activeTab);
      }
      params.set('page', String(page));
      params.set('limit', '25');

      const res: any = await api.get(`/admin/dsr?${params.toString()}`);
      setRequests(res?.requests || []);
      setTotal(res?.total || 0);
    } catch (err: any) {
      toast.error('Failed to load DSR compliance queue', {
        description: err?.response?.data?.message || err?.message || 'Check network / role permissions',
      });
      // Fallback mock items for offline or initial review
      setRequests([
        {
          id: '65239a110000000000000001',
          type: 'erasure',
          status: 'submitted',
          requestedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          dueAt: new Date(Date.now() + 27 * 86400000).toISOString(),
          overdue: false,
          details: { reason: 'User requested complete deletion under DPDP Act 2023 Sec 12' },
        },
        {
          id: '65239a110000000000000002',
          type: 'export',
          status: 'in_review',
          requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          dueAt: new Date(Date.now() + 25 * 86400000).toISOString(),
          overdue: false,
          details: { format: 'JSON/FHIR medical history and invoices' },
        },
      ]);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchDsrQueue();
  }, [fetchDsrQueue]);

  const handleDecision = async () => {
    if (!selectedReq || !actionType) return;
    setSubmitting(true);

    try {
      if (actionType === 'extend') {
        if (!extendReason.trim()) {
          toast.error('Audit justification reason is required for SLA extension');
          setSubmitting(false);
          return;
        }
        await api.post(`/admin/dsr/${selectedReq.id}/extend`, {
          reason: extendReason.trim(),
        });
        toast.success('DSR statutory deadline extended by 15 days');
      } else {
        const payload: any = { action: actionType };
        if (actionNote.trim()) payload.note = actionNote.trim();
        if (actionType === 'verify') payload.method = verifyMethod;
        if (actionType === 'fulfill' && selectedReq.type === 'export') {
          if (!exportUrl.trim()) {
            toast.error('Export download URL / reference is required');
            setSubmitting(false);
            return;
          }
          payload.exportRef = exportUrl.trim();
        }

        await api.post(`/admin/dsr/${selectedReq.id}/decision`, payload);
        toast.success(`Request status updated: ${actionType}`);
      }

      // Close modal & reload
      setActionType(null);
      setSelectedReq(null);
      setActionNote('');
      setExtendReason('');
      setExportUrl('');
      fetchDsrQueue();
    } catch (err: any) {
      toast.error('Action failed', {
        description: err?.response?.data?.message || err?.message || 'Check state machine rules',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysRemaining = (dueAtStr: string) => {
    const diffMs = new Date(dueAtStr).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredRequests = requests.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term) ||
      r.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                DPDP Act 2023 · Data-Subject Requests (DSR)
              </h1>
              <p className="text-sm text-muted-foreground">
                Digital Personal Data Protection Act compliance console · Statutory 30-day SLA with audit logs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">
            DPO Gate Active
          </Badge>
          <Button variant="outline" size="sm" onClick={() => fetchDsrQueue()} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total DSR Queue</p>
            <p className="text-2xl font-bold mt-1">{total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">All registered citizen requests</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In-Flight SLA
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
              {requests.filter((r) => ['submitted', 'in_review', 'verified'].includes(r.status)).length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active countdown clock</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10">
          <CardContent className="p-4">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue Statutory
            </p>
            <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">
              {requests.filter((r) => r.overdue).length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Urgent compliance escalation</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled & Closed
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
              {requests.filter((r) => r.status === 'fulfilled').length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Right executed with cryptographic audit</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-lg">
          {[
            { key: 'all', label: 'All Requests' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'in_review', label: 'In Review' },
            { key: 'verified', label: 'Verified' },
            { key: 'overdue', label: 'Overdue ⚠️' },
            { key: 'fulfilled', label: 'Fulfilled' },
            { key: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or type..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main Table / Card List */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading DPDP statutory queue...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-base font-semibold">No requests in this view</p>
            <p className="text-xs text-muted-foreground">All citizen data protection requests are settled.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRequests.map((req) => {
              const typeCfg = TYPE_CONFIG[req.type] || { label: req.type, badgeClass: 'bg-muted text-foreground', icon: FileText };
              const statusCfg = STATUS_CONFIG[req.status] || { label: req.status, badgeClass: 'bg-muted text-foreground' };
              const daysLeft = getDaysRemaining(req.dueAt);
              const isOpen = ['submitted', 'in_review', 'verified'].includes(req.status);

              return (
                <div key={req.id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded">
                        #{req.id.slice(-8).toUpperCase()}
                      </span>
                      <Badge variant="outline" className={`text-xs gap-1 py-0.5 ${typeCfg.badgeClass}`}>
                        <typeCfg.icon className="w-3 h-3" /> {typeCfg.label}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </Badge>
                      {req.overdue && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          Overdue SLA!
                        </Badge>
                      )}
                      {req.extensionReason && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                          +15d Extension Applied
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Submitted: {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className={`font-medium ${isOpen && daysLeft <= 5 ? 'text-destructive' : ''}`}>
                        SLA Due: {new Date(req.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isOpen && ` (${daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`})`}
                      </span>
                      {req.verification && (
                        <span className="text-sky-600 dark:text-sky-400">
                          Verified via {req.verification.method} on {new Date(req.verification.at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {req.details && (
                      <p className="text-xs bg-muted/40 p-2 rounded-md font-sans text-foreground/80">
                        {req.details.reason || JSON.stringify(req.details)}
                      </p>
                    )}

                    {req.resolutionNote && (
                      <p className="text-xs text-muted-foreground italic">
                        Resolution Note: &quot;{req.resolutionNote}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-end">
                    {req.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedReq(req); setActionType('review'); }}
                          className="text-xs h-8"
                        >
                          Mark In-Review
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSelectedReq(req); setActionType('reject'); }}
                          className="text-xs h-8"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {req.status === 'in_review' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => { setSelectedReq(req); setActionType('verify'); }}
                          className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verify Identity
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSelectedReq(req); setActionType('reject'); }}
                          className="text-xs h-8"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {req.status === 'verified' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => { setSelectedReq(req); setActionType('fulfill'); }}
                          className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fulfill Right
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSelectedReq(req); setActionType('reject'); }}
                          className="text-xs h-8"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {isOpen && !req.extensionReason && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelectedReq(req); setActionType('extend'); }}
                        className="text-xs h-8 text-muted-foreground hover:text-foreground"
                      >
                        Extend +15d
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Dialog Modal */}
      <Dialog open={Boolean(selectedReq && actionType)} onOpenChange={(open) => { if (!open) setActionType(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'verify' && <ShieldCheck className="w-5 h-5 text-sky-600" />}
              {actionType === 'fulfill' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {actionType === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
              {actionType === 'extend' && <Clock className="w-5 h-5 text-purple-600" />}
              {actionType === 'review' && <RefreshCw className="w-5 h-5 text-indigo-600" />}
              <span>
                {actionType === 'verify' && 'Verify Citizen Identity'}
                {actionType === 'fulfill' && 'Fulfill Data-Subject Right'}
                {actionType === 'reject' && 'Reject Data-Subject Request'}
                {actionType === 'extend' && 'Extend Statutory SLA (+15 Days)'}
                {actionType === 'review' && 'Assign to Active Legal Review'}
              </span>
            </DialogTitle>
            <DialogDescription>
              Request #{selectedReq?.id?.slice(-8).toUpperCase()} · DPDP Act 2023 Sec 12 statutory flow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {actionType === 'verify' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Verification Method</label>
                <Select value={verifyMethod} onValueChange={setVerifyMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhaar_otp">Aadhaar OTP / DigiLocker</SelectItem>
                    <SelectItem value="email_otp">Primary Registered Email OTP</SelectItem>
                    <SelectItem value="mobile_otp">Primary Registered Mobile OTP</SelectItem>
                    <SelectItem value="government_id_scan">Government ID Document Match</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  DPDP compliance mandates verifying applicant identity before releasing personal data or erasing records.
                </p>
              </div>
            )}

            {actionType === 'fulfill' && selectedReq?.type === 'export' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Export Data Reference / Secure URL</label>
                <Input
                  value={exportUrl}
                  onChange={(e) => setExportUrl(e.target.value)}
                  placeholder="https://storage.findmedi.in/exports/dsr-..."
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Encrypted archive link sent directly to verified citizen email.
                </p>
              </div>
            )}

            {actionType === 'extend' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Legal Grounds for SLA Extension *</label>
                <Textarea
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="Explain complex multi-tenant data retrieval, hospital clinical record hold, etc..."
                  className="text-xs min-h-[80px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Extension is recorded in compliance audit log and communicated to the data principal.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                {actionType === 'reject' ? 'Mandatory Rejection Ground *' : 'Resolution / Audit Note (Optional)'}
              </label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionType === 'reject'
                    ? 'State legal exception (e.g., active legal proceeding, statutory clinical record retention)...'
                    : 'Add reviewer observations for compliance auditor...'
                }
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDecision}
              disabled={submitting}
              className={
                actionType === 'reject'
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }
            >
              {submitting ? 'Recording...' : 'Confirm Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
