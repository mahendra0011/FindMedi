import React, { useEffect, useState } from 'react';
import {
  MapPin, Plus, RefreshCw, Calendar, CheckCircle2, Clock, MapPinned, Target
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { queueWrite, syncNow, pendingWrites, onReconnect } from '@/lib/offlineQueue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Territory {
  id: string;
  name: string;
  city: string;
  pincodes: string[];
  ownerIds?: Array<{ name: string; email: string }>;
  targets?: { visitsPerDay: number; leadsPerWeek: number; activationsPerMonth: number };
}

interface Visit {
  id: string;
  plannedAt: string;
  userId?: { name: string; email: string };
  leadId?: { businessName: string; city: string; area: string };
  outcome: string;
  notes?: string;
  checkIn?: { at?: string };
}

export default function FieldOps() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOffline, setPendingOffline] = useState(0);
  const [isTerritoryOpen, setIsTerritoryOpen] = useState(false);
  const [newTerritory, setNewTerritory] = useState({
    name: '',
    city: 'Bhopal',
    pincodes: '462001, 462003, 462016',
    visitsPerDay: 5,
    leadsPerWeek: 15,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, vRes] = await Promise.all([
        apiClient.get('/crm/territories'),
        apiClient.get('/crm/visits'),
      ]);
      setTerritories(tRes.data.territories || []);
      setVisits(vRes.data.visits || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch field ops data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Offline-first: replay queued territory creates when connectivity
    // returns, and surface the pending count. Queue rows carry idempotency
    // keys so a replayed create can never double-create server-side.
    let cancelled = false;
    const refreshPending = async () => {
      try {
        const rows = await pendingWrites();
        if (!cancelled) setPendingOffline(rows.length);
      } catch { /* IndexedDB unavailable — online-only mode */ }
    };
    const replay = async () => {
      try {
        const out = await syncNow(async (w) => {
          await apiClient.post(w.url, w.body);
        });
        if (!cancelled) {
          setPendingOffline(out.pending);
          if (out.synced > 0) {
            toast.success(`${out.synced} offline change(s) synced`);
            fetchData();
          }
        }
      } catch { /* stays queued for the next reconnect */ }
    };
    refreshPending();
    const off = onReconnect(() => { void replay(); });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerritory.name.trim()) {
      toast.error('Territory name is required');
      return;
    }
    try {
      const pincodesArray = newTerritory.pincodes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        name: newTerritory.name.trim(),
        city: newTerritory.city,
        pincodes: pincodesArray,
        targets: {
          visitsPerDay: Number(newTerritory.visitsPerDay) || 0,
          leadsPerWeek: Number(newTerritory.leadsPerWeek) || 0,
        },
      };
      await apiClient.post('/crm/territories', payload);
      toast.success('Territory created');
      setIsTerritoryOpen(false);
      setNewTerritory({
        name: '',
        city: 'Bhopal',
        pincodes: '462001, 462003, 462016',
        visitsPerDay: 5,
        leadsPerWeek: 15,
      });
      fetchData();
    } catch (err: any) {
      // Offline: queue the create for replay on reconnect instead of losing
      // field work. Anything else surfaces the server message as before.
      if (!err?.response) {
        try {
          await queueWrite('/crm/territories', 'POST', {
            name: newTerritory.name.trim(),
            city: newTerritory.city,
            pincodes: newTerritory.pincodes.split(',').map((p) => p.trim()).filter(Boolean),
            targets: {
              visitsPerDay: Number(newTerritory.visitsPerDay) || 0,
              leadsPerWeek: Number(newTerritory.leadsPerWeek) || 0,
            },
          });
          const rows = await pendingWrites().catch(() => []);
          setPendingOffline(rows.length);
          toast.success('Offline — territory queued, will sync on reconnect');
          setIsTerritoryOpen(false);
          return;
        } catch { /* fall through to the error toast */ }
      }
      toast.error(err.response?.data?.message || 'Failed to create territory');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200">
              Field Ops Management
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <MapPinned className="h-6 w-6 text-primary" />
            Territories & Visit Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage geographic pincode clusters, field executive routes, check-ins, and on-ground productivity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {pendingOffline > 0 && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200">
              {pendingOffline} offline change(s) pending sync
            </Badge>
          )}

          <Button size="sm" onClick={() => setIsTerritoryOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Territory
          </Button>
        </div>
      </div>

      {/* Grid: Territories & Recent Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Territories */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              Active Coverage Territories
            </CardTitle>
            <CardDescription>Pincodes, assigned owners, and daily visit targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {territories.map((t) => (
              <div key={t.id} className="p-3.5 border border-border/80 rounded-lg bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{t.name}</span>
                  <Badge variant="secondary" className="text-xs">{t.city}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                  <span className="font-medium text-foreground">Pincodes:</span>
                  {t.pincodes?.map((pin) => (
                    <span key={pin} className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{pin}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
                  <span>Target: {t.targets?.visitsPerDay || 0} visits/day</span>
                  <span>{t.targets?.leadsPerWeek || 0} leads/wk</span>
                </div>
              </div>
            ))}
            {territories.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">No territories configured yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Visit Logs */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Field Visits & Check-ins
            </CardTitle>
            <CardDescription>Geo check-in records during duty with structured outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visits.map((v) => (
              <div key={v.id} className="p-3.5 border border-border/80 rounded-lg bg-card/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{v.leadId?.businessName || 'Provider Visit'}</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {v.outcome ? v.outcome.replace(/_/g, ' ') : 'Planned'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Field Exec: {v.userId?.name || 'Assigned Agent'}</span>
                  <span>{v.plannedAt ? new Date(v.plannedAt).toLocaleDateString() : 'Today'}</span>
                </div>
                {v.notes && <p className="text-xs text-muted-foreground italic">"{v.notes}"</p>}
              </div>
            ))}
            {visits.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">No field visits logged yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Territory Dialog */}
      <Dialog open={isTerritoryOpen} onOpenChange={setIsTerritoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Coverage Territory</DialogTitle>
            <DialogDescription>
              Define a geographic zone with associated pincodes and productivity quotas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTerritory} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Territory Name *</Label>
              <Input
                placeholder="e.g. Bhopal South / New City Cluster"
                value={newTerritory.name}
                onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">City</Label>
              <Input
                value={newTerritory.city}
                onChange={(e) => setNewTerritory({ ...newTerritory, city: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Pincodes (comma-separated)</Label>
              <Input
                placeholder="462001, 462003, 462016"
                value={newTerritory.pincodes}
                onChange={(e) => setNewTerritory({ ...newTerritory, pincodes: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Visits Target / Day</Label>
                <Input
                  type="number"
                  value={newTerritory.visitsPerDay}
                  onChange={(e) => setNewTerritory({ ...newTerritory, visitsPerDay: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Leads Target / Week</Label>
                <Input
                  type="number"
                  value={newTerritory.leadsPerWeek}
                  onChange={(e) => setNewTerritory({ ...newTerritory, leadsPerWeek: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTerritoryOpen(false)}>Cancel</Button>
              <Button type="submit">Create Territory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
