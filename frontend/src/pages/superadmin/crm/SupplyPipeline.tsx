import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Filter, Phone, Mail, MapPin, Building,
  ArrowRight, CheckCircle2, AlertCircle, RefreshCw, XCircle, ArrowUpRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Lead {
  id: string;
  businessName: string;
  typeKey?: string;
  city?: string;
  area?: string;
  stage: string;
  score?: number;
  estMonthlyVolume?: number;
  contacts?: Array<{ name: string; role: string; phone: string; email: string }>;
  ownerId?: { _id: string; name: string; email: string };
  lostReason?: string;
}

const STAGES = [
  { key: 'identified', label: 'Identified', badge: 'bg-slate-100 text-slate-800' },
  { key: 'contacted', label: 'Contacted', badge: 'bg-blue-100 text-blue-800' },
  { key: 'interested', label: 'Interested', badge: 'bg-cyan-100 text-cyan-800' },
  { key: 'demo_done', label: 'Demo Done', badge: 'bg-indigo-100 text-indigo-800' },
  { key: 'docs_collected', label: 'Docs Ready', badge: 'bg-violet-100 text-violet-800' },
  { key: 'application_submitted', label: 'Applied', badge: 'bg-amber-100 text-amber-800' },
  { key: 'under_review', label: 'Under Review', badge: 'bg-orange-100 text-orange-800' },
  { key: 'approved', label: 'Approved', badge: 'bg-emerald-100 text-emerald-800' },
  { key: 'activated', label: 'Activated', badge: 'bg-green-100 text-green-800' },
  { key: 'active', label: 'Active', badge: 'bg-teal-100 text-teal-800' },
  { key: 'at_risk', label: 'At Risk', badge: 'bg-rose-100 text-rose-800' },
  { key: 'churned', label: 'Lost / Churned', badge: 'bg-gray-200 text-gray-700' },
];

export default function SupplyPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Add Lead Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    businessName: '',
    typeKey: 'clinic',
    city: 'Bhopal',
    area: '',
    contactName: '',
    contactPhone: '',
    estMonthlyVolume: 0,
  });

  // Stage change modal state (for lost reason if churned)
  const [stageModalLead, setStageModalLead] = useState<Lead | null>(null);
  const [targetStage, setTargetStage] = useState<string>('');
  const [lostReason, setLostReason] = useState<string>('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = filterCity && filterCity !== 'all'
        ? `/crm/leads?city=${encodeURIComponent(filterCity)}&limit=100`
        : '/crm/leads?limit=100';
      const res = await apiClient.get(url);
      setLeads(res.data.leads || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filterCity]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    try {
      await apiClient.post('/crm/leads', {
        businessName: newLead.businessName.trim(),
        typeKey: newLead.typeKey,
        city: newLead.city,
        area: newLead.area,
        estMonthlyVolume: Number(newLead.estMonthlyVolume) || 0,
        contacts: newLead.contactName ? [{
          name: newLead.contactName,
          phone: newLead.contactPhone,
        }] : [],
      });
      toast.success('Lead created successfully');
      setIsAddOpen(false);
      setNewLead({
        businessName: '',
        typeKey: 'clinic',
        city: 'Bhopal',
        area: '',
        contactName: '',
        contactPhone: '',
        estMonthlyVolume: 0,
      });
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create lead');
    }
  };

  const handleStageSelect = (lead: Lead, stage: string) => {
    if (stage === 'churned') {
      setStageModalLead(lead);
      setTargetStage('churned');
      setLostReason('');
    } else {
      updateStage(lead.id, stage, '');
    }
  };

  const updateStage = async (id: string, stage: string, reason: string) => {
    try {
      await apiClient.patch(`/crm/leads/${id}/stage`, {
        stage,
        lostReason: reason,
      });
      toast.success(`Stage updated to ${stage}`);
      setStageModalLead(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = l.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.city && l.city.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 border-blue-200">
              Supply Pipeline (Provider CRM)
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Users className="h-6 w-6 text-primary" />
            Provider Onboarding & Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Track prospective clinics, hospitals, labs, and pharmacies through validation, onboarding, and activation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-muted rounded-md p-0.5 border border-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'kanban' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'list' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
            >
              List View
            </button>
          </div>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="Bhopal">Bhopal</SelectItem>
              <SelectItem value="Indore">Indore</SelectItem>
              <SelectItem value="Jabalpur">Jabalpur</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Prospect Lead
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prospect by business name or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filteredLeads.length} leads
        </span>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
          {STAGES.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.stage === col.key);
            return (
              <div
                key={col.key}
                className="w-72 shrink-0 bg-muted/40 border border-border/80 rounded-xl flex flex-col max-h-[750px]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-border/60 flex items-center justify-between sticky top-0 bg-muted/90 backdrop-blur-xs rounded-t-xl z-10">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs tracking-tight text-foreground">{col.label}</span>
                    <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                      {colLeads.length}
                    </Badge>
                  </div>
                </div>

                {/* Cards List */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                  {colLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className="shadow-2xs hover:shadow-md transition-shadow bg-card border-border/70"
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-semibold text-sm leading-snug line-clamp-1">{lead.businessName}</h4>
                          {lead.score !== undefined && lead.score > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold shrink-0">
                              ★ {lead.score}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {lead.typeKey && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
                              {lead.typeKey.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {lead.city && (
                            <span className="flex items-center gap-0.5 text-[11px]">
                              <MapPin className="h-3 w-3" />
                              {lead.city} {lead.area ? `(${lead.area})` : ''}
                            </span>
                          )}
                        </div>

                        {lead.contacts && lead.contacts.length > 0 && (
                          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
                            <span className="truncate">{lead.contacts[0].name}</span>
                            <span className="text-[10px] font-mono text-foreground/80">{lead.contacts[0].phone}</span>
                          </div>
                        )}

                        {lead.lostReason && (
                          <div className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-1 rounded">
                            Reason: {lead.lostReason}
                          </div>
                        )}

                        {/* Move Stage Selector */}
                        <div className="pt-1 flex items-center justify-between">
                          <Select
                            value={lead.stage}
                            onValueChange={(val) => handleStageSelect(lead, val)}
                          >
                            <SelectTrigger className="h-6 text-[10px] px-2 py-0 w-32 border-dashed">
                              <SelectValue placeholder="Move..." />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => (
                                <SelectItem key={s.key} value={s.key} className="text-xs">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {lead.stage === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-emerald-600 gap-0.5"
                              onClick={() => toast.info('Submit join application in provider wizard to activate.')}
                            >
                              Activate
                              <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Business Name</th>
                <th className="py-2.5 px-4 text-left font-medium">Type</th>
                <th className="py-2.5 px-4 text-left font-medium">Location</th>
                <th className="py-2.5 px-4 text-left font-medium">Contact Person</th>
                <th className="py-2.5 px-4 text-left font-medium">Current Stage</th>
                <th className="py-2.5 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-semibold">{lead.businessName}</td>
                  <td className="py-2.5 px-4 text-muted-foreground capitalize">{lead.typeKey || '—'}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{lead.city} {lead.area ? `(${lead.area})` : ''}</td>
                  <td className="py-2.5 px-4">
                    {lead.contacts && lead.contacts[0] ? (
                      <div>
                        <span>{lead.contacts[0].name}</span>
                        <span className="text-xs text-muted-foreground block font-mono">{lead.contacts[0].phone}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant="outline" className="capitalize text-xs">
                      {lead.stage.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Select
                      value={lead.stage}
                      onValueChange={(val) => handleStageSelect(lead, val)}
                    >
                      <SelectTrigger className="h-7 text-xs w-36 ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.key} value={s.key} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No leads found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prospect Provider Lead</DialogTitle>
            <DialogDescription>
              Record a new provider opportunity for the field ops and supply pipeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Business Name *</Label>
              <Input
                placeholder="e.g. LifeCare Dental Clinic"
                value={newLead.businessName}
                onChange={(e) => setNewLead({ ...newLead, businessName: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Provider Type</Label>
                <Select
                  value={newLead.typeKey}
                  onValueChange={(v) => setNewLead({ ...newLead, typeKey: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">Clinic / Doctor</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="diagnostic_center">Pathology / Lab</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="gym">Fitness / Gym</SelectItem>
                    <SelectItem value="yoga_studio">Yoga Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={newLead.city}
                  onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Area / Locality</Label>
              <Input
                placeholder="e.g. Arera Colony, MP Nagar"
                value={newLead.area}
                onChange={(e) => setNewLead({ ...newLead, area: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Contact Person Name</Label>
                <Input
                  placeholder="Dr. Verma"
                  value={newLead.contactName}
                  onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone / WhatsApp</Label>
                <Input
                  placeholder="9876543210"
                  value={newLead.contactPhone}
                  onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog when moving to churned */}
      <Dialog open={!!stageModalLead} onOpenChange={(open) => !open && setStageModalLead(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Lost / Churn Reason Required</DialogTitle>
            <DialogDescription>
              To maintain pipeline data quality, provide a reason why this provider was lost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Reason Code / Explanation *</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select lost reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_interested">Not Interested in Online Platforms</SelectItem>
                <SelectItem value="fee_concern">Commission / Fee Concern</SelectItem>
                <SelectItem value="tech_barrier">Tech Barrier / No Computer Staff</SelectItem>
                <SelectItem value="competitor">Working with Competitor Exclusively</SelectItem>
                <SelectItem value="unresponsive">Unresponsive after multiple visits</SelectItem>
                <SelectItem value="unverifiable_docs">Documents Missing / Unverifiable</SelectItem>
                <SelectItem value="other">Other Reason</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageModalLead(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!lostReason}
              onClick={() => stageModalLead && updateStage(stageModalLead.id, 'churned', lostReason)}
            >
              Confirm Churn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
