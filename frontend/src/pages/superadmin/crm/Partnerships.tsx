import React, { useEffect, useState } from 'react';
import {
  Briefcase, Plus, RefreshCw, Building, Handshake, Users, Calendar,
  FileCheck, ArrowRight, MapPin
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Partner {
  id: string;
  orgName: string;
  type: string;
  city: string;
  area?: string;
  size?: number;
  stage: string;
  mouStatus?: string;
  offer?: string;
  outcomes?: { eventsHeld: number; registrations: number; conversions: number };
  ownerId?: { name: string; email: string };
  nextStep?: string;
}

const PARTNER_STAGES = [
  { key: 'identified', label: 'Identified' },
  { key: 'intro_done', label: 'Intro Done' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'agreement_signed', label: 'MoU Signed' },
  { key: 'pilot', label: 'Pilot Event' },
  { key: 'active', label: 'Active Partner' },
  { key: 'renewal', label: 'Renewal' },
  { key: 'lost', label: 'Lost' },
];

export default function Partnerships() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    orgName: '',
    type: 'rwa',
    city: 'Bhopal',
    area: '',
    size: 500,
    offer: 'Free health screening camp + 20% discount vouchers',
  });

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/crm/partners');
      setPartners(res.data.partners || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    try {
      await apiClient.post('/crm/partners', {
        orgName: newPartner.orgName.trim(),
        type: newPartner.type,
        city: newPartner.city,
        area: newPartner.area,
        size: Number(newPartner.size) || 0,
        offer: newPartner.offer,
      });
      toast.success('Partner added to pipeline');
      setIsAddOpen(false);
      setNewPartner({
        orgName: '',
        type: 'rwa',
        city: 'Bhopal',
        area: '',
        size: 500,
        offer: 'Free health screening camp + 20% discount vouchers',
      });
      fetchPartners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add partner');
    }
  };

  const handleStageChange = async (partnerId: string, stage: string) => {
    try {
      await apiClient.patch(`/crm/partners/${partnerId}`, { stage });
      toast.success('Partner stage updated');
      fetchPartners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update partner stage');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-violet-50 text-violet-700 dark:bg-violet-950/40 border-violet-200">
              Partnerships CRM
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Handshake className="h-6 w-6 text-primary" />
            Institutional & Community Partnerships
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline management for RWAs, Corporates, NGOs, Schools, and Govt associations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchPartners} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Partner Lead
          </Button>
        </div>
      </div>

      {/* Partners List */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-4 text-left font-medium">Organization</th>
              <th className="py-2.5 px-4 text-left font-medium">Type</th>
              <th className="py-2.5 px-4 text-left font-medium">Location & Reach</th>
              <th className="py-2.5 px-4 text-left font-medium">Stage</th>
              <th className="py-2.5 px-4 text-left font-medium">MoU Status</th>
              <th className="py-2.5 px-4 text-center font-medium">Events / Regs</th>
              <th className="py-2.5 px-4 text-right font-medium">Update Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {partners.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="py-3 px-4">
                  <div className="font-semibold text-foreground">{p.orgName}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.offer || '—'}</div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="capitalize text-xs">
                    {p.type.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">
                  <div>{p.city} {p.area ? `(${p.area})` : ''}</div>
                  {p.size ? <div className="text-[11px]">~{p.size} members/residents</div> : null}
                </td>
                <td className="py-3 px-4">
                  <Badge className="capitalize text-xs font-medium">
                    {p.stage.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs capitalize text-muted-foreground">
                  {p.mouStatus || 'Not Drafted'}
                </td>
                <td className="py-3 px-4 text-center text-xs">
                  <span className="font-semibold">{p.outcomes?.eventsHeld || 0}</span> events •{' '}
                  <span className="text-muted-foreground">{p.outcomes?.registrations || 0} regs</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <Select value={p.stage} onValueChange={(val) => handleStageChange(p.id, val)}>
                    <SelectTrigger className="h-7 text-xs w-36 ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_STAGES.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                  No partners in pipeline yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Partner Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Institutional Partner</DialogTitle>
            <DialogDescription>
              Record an RWA, corporate employer, school, or NGO for health camps and partnerships.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePartner} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Organization Name *</Label>
              <Input
                placeholder="e.g. BHEL Town Residents Welfare Association"
                value={newPartner.orgName}
                onChange={(e) => setNewPartner({ ...newPartner, orgName: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Partner Category</Label>
                <Select value={newPartner.type} onValueChange={(v) => setNewPartner({ ...newPartner, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rwa">RWA / Society</SelectItem>
                    <SelectItem value="corporate">Corporate Employer</SelectItem>
                    <SelectItem value="ngo">NGO / CSR Wing</SelectItem>
                    <SelectItem value="association">Trade / Professional Assoc</SelectItem>
                    <SelectItem value="school">School / College</SelectItem>
                    <SelectItem value="insurer">Insurer / TPA</SelectItem>
                    <SelectItem value="govt">Government Dept</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={newPartner.city}
                  onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Area</Label>
                <Input
                  placeholder="e.g. Habibganj"
                  value={newPartner.area}
                  onChange={(e) => setNewPartner({ ...newPartner, area: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Estimated Reach / Size</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={newPartner.size}
                  onChange={(e) => setNewPartner({ ...newPartner, size: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Proposed Value / Offer</Label>
              <Input
                placeholder="Camp offering or joint health initiative"
                value={newPartner.offer}
                onChange={(e) => setNewPartner({ ...newPartner, offer: e.target.value })}
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Partner</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
