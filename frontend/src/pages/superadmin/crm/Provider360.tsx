import React, { useEffect, useState } from 'react';
import {
  Building2, Star, AlertTriangle, ShieldCheck, Phone, CheckCircle2,
  Calendar, Clock, UserCheck, Plus, RefreshCw, MessageSquare, AlertCircle, FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CrmAccountItem {
  id: string;
  providerId: string;
  name: string;
  type: string;
  tier: string;
  city: string;
  area: string;
  rating: number;
  reviewsCount: number;
  healthScore: number;
  healthBand: 'healthy' | 'watch' | 'at_risk';
  riskReasons: string[];
  plan: string;
  accountOwner?: { name: string; email: string };
  lastContactAt?: string;
}

interface Provider360Detail {
  provider: {
    id: string;
    name: string;
    type: string;
    tier: string;
    status: string;
    address: { city: string; area: string; line1: string };
    rating: number;
    reviewsCount: number;
  };
  overlay: {
    healthScore: number;
    healthBand: 'healthy' | 'watch' | 'at_risk';
    riskReasons: string[];
    plan: string;
    accountOwner?: { name: string; email: string };
    notes: Array<{ content: string; at: string }>;
  };
  documents: Array<{ id: string; type: string; status: string; expiryDate?: string }>;
  openDisputes: number;
  openTickets: number;
  tasks: Array<{ id: string; title: string; status: string; dueAt?: string; priority: string }>;
  activities: Array<{ id: string; type: string; outcome: string; summary: string; at: string }>;
}

export default function Provider360() {
  const [accounts, setAccounts] = useState<CrmAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedDetail, setSelectedDetail] = useState<Provider360Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Quick activity log modal
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    outcome: 'Connected - Discussed renewal',
    summary: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const url = selectedBand && selectedBand !== 'all'
        ? `/crm/accounts?healthBand=${selectedBand}`
        : '/crm/accounts';
      const res = await apiClient.get(url);
      setAccounts(res.data.accounts || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedBand]);

  const openAccountDetail = async (providerId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/crm/accounts/${providerId}`);
      setSelectedDetail(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Provider 360');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;
    try {
      await apiClient.post('/crm/activities', {
        objectType: 'account',
        objectId: selectedDetail.provider.id,
        type: newActivity.type,
        outcome: newActivity.outcome,
        summary: newActivity.summary,
      });
      toast.success('Activity logged to timeline');
      setIsActivityOpen(false);
      setNewActivity({ type: 'call', outcome: 'Connected - Discussed renewal', summary: '' });
      openAccountDetail(selectedDetail.provider.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log activity');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-200">
              Provider 360 (Live Supply CRM)
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Building2 className="h-6 w-6 text-primary" />
            Accounts & Health Scorecards
          </h1>
          <p className="text-sm text-muted-foreground">
            Single 360 view per live provider: composite health score, doc validity, tickets, SLA tasks, and relationship touchpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedBand} onValueChange={setSelectedBand}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Health Bands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bands</SelectItem>
              <SelectItem value="healthy">Healthy (≥75)</SelectItem>
              <SelectItem value="watch">Watch (50-74)</SelectItem>
              <SelectItem value="at_risk">At-Risk (&lt;50)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-4 text-left font-medium">Provider Name</th>
              <th className="py-2.5 px-4 text-left font-medium">Type / City</th>
              <th className="py-2.5 px-4 text-center font-medium">Health Score</th>
              <th className="py-2.5 px-4 text-center font-medium">Band</th>
              <th className="py-2.5 px-4 text-left font-medium">Rating</th>
              <th className="py-2.5 px-4 text-left font-medium">Account Owner</th>
              <th className="py-2.5 px-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-muted/30">
                <td className="py-3 px-4">
                  <div className="font-semibold text-foreground">{acc.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">Plan: {acc.plan}</div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  <span className="capitalize">{acc.type}</span> • {acc.city}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center justify-center font-bold text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {acc.healthScore} / 100
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {acc.healthBand === 'healthy' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Healthy</Badge>
                  )}
                  {acc.healthBand === 'watch' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Watch</Badge>
                  )}
                  {acc.healthBand === 'at_risk' && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200">At-Risk</Badge>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1 text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {acc.rating || 'N/A'} ({acc.reviewsCount} reviews)
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {acc.accountOwner?.name || 'Unassigned'}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openAccountDetail(acc.providerId)}
                  >
                    View 360
                  </Button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                  No live provider accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Provider 360 Detail Modal */}
      {selectedDetail && (
        <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    {selectedDetail.provider.name}
                    <Badge variant="outline" className="text-xs uppercase">{selectedDetail.provider.type}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedDetail.provider.address?.city} {selectedDetail.provider.address?.area ? `(${selectedDetail.provider.address?.area})` : ''}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">
                    {selectedDetail.overlay.healthScore}
                    <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                  </div>
                  <span className="text-xs font-semibold capitalize text-muted-foreground">
                    Band: {selectedDetail.overlay.healthBand}
                  </span>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-muted/60 rounded border border-border">
                  <span className="text-muted-foreground block text-[11px]">Rating</span>
                  <span className="font-bold text-sm">★ {selectedDetail.provider.rating || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-muted/60 rounded border border-border">
                  <span className="text-muted-foreground block text-[11px]">Open Disputes</span>
                  <span className={`font-bold text-sm ${selectedDetail.openDisputes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedDetail.openDisputes}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/60 rounded border border-border">
                  <span className="text-muted-foreground block text-[11px]">Open Tickets</span>
                  <span className="font-bold text-sm">{selectedDetail.openTickets}</span>
                </div>
                <div className="p-2.5 bg-muted/60 rounded border border-border">
                  <span className="text-muted-foreground block text-[11px]">Compliance Docs</span>
                  <span className="font-bold text-sm">{selectedDetail.documents.length} verified</span>
                </div>
              </div>

              {/* Documents & Compliance */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Statutory & Verification Documents
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedDetail.documents.map((doc) => (
                    <div key={doc.id} className="p-2 bg-muted/30 border border-border rounded flex justify-between items-center">
                      <span className="font-medium truncate">{doc.type}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                  {selectedDetail.documents.length === 0 && (
                    <span className="text-xs text-muted-foreground">No statutory documents linked.</span>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Touchpoint Activity Timeline
                  </h4>
                  <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1" onClick={() => setIsActivityOpen(true)}>
                    <Plus className="h-3 w-3" />
                    Log Activity
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDetail.activities.map((act) => (
                    <div key={act.id} className="p-2.5 border border-border/80 rounded bg-card/60 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold capitalize text-foreground">{act.type} • {act.outcome}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(act.at).toLocaleDateString()}</span>
                      </div>
                      {act.summary && <p className="text-muted-foreground">{act.summary}</p>}
                    </div>
                  ))}
                  {selectedDetail.activities.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2 text-center">No recent logged interactions.</div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDetail(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Log Activity Dialog */}
      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Touchpoint / Activity</DialogTitle>
            <DialogDescription>Record a visit, call, or account manager check-in.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogActivity} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Interaction Type</Label>
              <Select value={newActivity.type} onValueChange={(v) => setNewActivity({ ...newActivity, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="visit">Field Visit</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Outreach</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="note">Internal Account Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Outcome / Actionable</Label>
              <Input
                value={newActivity.outcome}
                onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Detailed Summary (NO patient data)</Label>
              <Input
                placeholder="Discussed renewal, pricing structure, doctors onboarded..."
                value={newActivity.summary}
                onChange={(e) => setNewActivity({ ...newActivity, summary: e.target.value })}
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsActivityOpen(false)}>Cancel</Button>
              <Button type="submit">Save Activity</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
