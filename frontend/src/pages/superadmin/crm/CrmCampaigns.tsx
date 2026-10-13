import React, { useEffect, useState } from 'react';
import {
  Calendar, Plus, RefreshCw, Users, MapPin, Building,
  CheckCircle2, Clock, Award, Activity
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

interface CampaignItem {
  id: string;
  title: string;
  type: string;
  date?: string;
  venue?: string;
  city?: string;
  budget?: number;
  capacity?: number;
  registrations?: number;
  attendees?: number;
  conversions?: number;
  status: string;
}

const CAMPAIGN_STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'partner_confirmed', label: 'Partner Confirmed' },
  { key: 'ops_ready', label: 'Ops Ready' },
  { key: 'registrations_open', label: 'Registrations Open' },
  { key: 'completed', label: 'Completed' },
  { key: 'reported', label: 'Reported' },
];

export default function CrmCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCamp, setNewCamp] = useState({
    title: '',
    type: 'health_camp',
    city: 'Bhopal',
    venue: '',
    date: new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0],
    budget: 15000,
    capacity: 200,
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/crm/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamp.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await apiClient.post('/crm/campaigns', {
        title: newCamp.title.trim(),
        type: newCamp.type,
        city: newCamp.city,
        venue: newCamp.venue,
        date: newCamp.date ? new Date(newCamp.date) : null,
        budget: Number(newCamp.budget) || 0,
        capacity: Number(newCamp.capacity) || 0,
      });
      toast.success('Campaign / Health camp created');
      setIsAddOpen(false);
      setNewCamp({
        title: '',
        type: 'health_camp',
        city: 'Bhopal',
        venue: '',
        date: new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0],
        budget: 15000,
        capacity: 200,
      });
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    }
  };

  const handleStatusChange = async (campId: string, status: string) => {
    try {
      await apiClient.patch(`/crm/campaigns/${campId}`, { status });
      toast.success('Status updated');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-200">
              Community Health Events
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-6 w-6 text-primary" />
            Campaigns & Health Camps Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan, staff, and measure community camps, partner health drives, registrations, and booking conversions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Plan Health Camp
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-4 text-left font-medium">Camp / Event Title</th>
              <th className="py-2.5 px-4 text-left font-medium">Type</th>
              <th className="py-2.5 px-4 text-left font-medium">Date & Venue</th>
              <th className="py-2.5 px-4 text-left font-medium">Status</th>
              <th className="py-2.5 px-4 text-center font-medium">Capacity / Attendees</th>
              <th className="py-2.5 px-4 text-right font-medium">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((camp) => (
              <tr key={camp.id} className="hover:bg-muted/30">
                <td className="py-3 px-4 font-semibold text-foreground">
                  <div>{camp.title}</div>
                  <div className="text-xs text-muted-foreground">{camp.city}</div>
                </td>
                <td className="py-3 px-4 capitalize text-xs text-muted-foreground">
                  {camp.type.replace(/_/g, ' ')}
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  <div>{camp.date ? new Date(camp.date).toLocaleDateString() : 'Date TBD'}</div>
                  <div className="truncate max-w-xs">{camp.venue || 'Venue TBD'}</div>
                </td>
                <td className="py-3 px-4">
                  <Badge className="capitalize text-xs font-medium">
                    {camp.status.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center text-xs">
                  <span className="font-semibold">{camp.attendees || 0}</span> / {camp.capacity || 0}
                  {camp.conversions ? (
                    <span className="block text-[11px] text-emerald-600 font-semibold">
                      {camp.conversions} conversions
                    </span>
                  ) : null}
                </td>
                <td className="py-3 px-4 text-right">
                  <Select value={camp.status} onValueChange={(val) => handleStatusChange(camp.id, val)}>
                    <SelectTrigger className="h-7 text-xs w-40 ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_STAGES.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                  No health camps or campaigns in pipeline yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Plan Camp Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Health Camp / Campaign</DialogTitle>
            <DialogDescription>Setup a free/subsidized screening drive or wellness workshop.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Camp Title *</Label>
              <Input
                placeholder="e.g. Free Dental & Eye Screening Camp"
                value={newCamp.title}
                onChange={(e) => setNewCamp({ ...newCamp, title: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Event Type</Label>
                <Select value={newCamp.type} onValueChange={(v) => setNewCamp({ ...newCamp, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health_camp">General Health Camp</SelectItem>
                    <SelectItem value="specialty_camp">Specialty Camp</SelectItem>
                    <SelectItem value="vaccination_drive">Vaccination Drive</SelectItem>
                    <SelectItem value="blood_drive">Blood Donation Camp</SelectItem>
                    <SelectItem value="workshop">Wellness Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={newCamp.city}
                  onChange={(e) => setNewCamp({ ...newCamp, city: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Venue / Community Hall</Label>
              <Input
                placeholder="e.g. Community Hall, Sector C, Shahpura"
                value={newCamp.venue}
                onChange={(e) => setNewCamp({ ...newCamp, venue: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Target Date</Label>
                <Input
                  type="date"
                  value={newCamp.date}
                  onChange={(e) => setNewCamp({ ...newCamp, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Capacity (People)</Label>
                <Input
                  type="number"
                  value={newCamp.capacity}
                  onChange={(e) => setNewCamp({ ...newCamp, capacity: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Campaign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
