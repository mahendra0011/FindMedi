import React, { useEffect, useState } from 'react';
import {
  Target, Plus, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp,
  Award, BarChart3, Layers
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Objective {
  id: string;
  level: 'company' | 'city' | 'team' | 'person';
  period: string;
  title: string;
  city?: string;
  status: 'active' | 'closed';
  keyResults: Array<{
    title: string;
    target: number;
    current: number;
    confidence: 'on_track' | 'at_risk' | 'off_track';
  }>;
}

export default function GoalsOkrs() {
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOkr, setNewOkr] = useState({
    title: '',
    level: 'company',
    period: 'Q4 2026',
    city: 'Bhopal',
    kr1Title: 'Onboard & verify live healthcare providers',
    kr1Target: 50,
  });

  const fetchOkrs = async () => {
    setLoading(true);
    try {
      const url = levelFilter && levelFilter !== 'all' ? `/crm/okrs?level=${levelFilter}` : '/crm/okrs';
      const res = await apiClient.get(url);
      setOkrs(res.data.okrs || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch OKRs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOkrs();
  }, [levelFilter]);

  const handleCreateOkr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOkr.title.trim()) {
      toast.error('Objective title is required');
      return;
    }
    try {
      await apiClient.post('/crm/okrs', {
        title: newOkr.title.trim(),
        level: newOkr.level,
        period: newOkr.period,
        city: newOkr.city,
        keyResults: [
          {
            title: newOkr.kr1Title,
            target: Number(newOkr.kr1Target) || 10,
            current: 0,
            confidence: 'on_track',
          },
        ],
      });
      toast.success('Objective created');
      setIsAddOpen(false);
      setNewOkr({
        title: '',
        level: 'company',
        period: 'Q4 2026',
        city: 'Bhopal',
        kr1Title: 'Onboard & verify live healthcare providers',
        kr1Target: 50,
      });
      fetchOkrs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create objective');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border-indigo-200">
              Strategic Goals & OKRs
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Target className="h-6 w-6 text-primary" />
            Objectives & Key Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Track company, city launch, and team targets aligned with live supply and fulfillment metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Level Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="city">City Gate</SelectItem>
              <SelectItem value="team">Ops Team</SelectItem>
              <SelectItem value="person">Individual</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchOkrs} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            New Objective
          </Button>
        </div>
      </div>

      {/* OKRs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {okrs.map((okr) => (
          <Card key={okr.id} className="shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-[11px]">{okr.level}</Badge>
                    <span className="text-xs font-semibold text-muted-foreground">{okr.period}</span>
                    {okr.city && <span className="text-xs text-muted-foreground">• {okr.city}</span>}
                  </div>
                  <CardTitle className="text-base font-bold mt-1.5">{okr.title}</CardTitle>
                </div>
                <Badge variant={okr.status === 'active' ? 'outline' : 'secondary'} className="capitalize text-xs">
                  {okr.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {okr.keyResults?.map((kr, idx) => {
                const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
                return (
                  <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="truncate pr-2">{kr.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize shrink-0 ${
                          kr.confidence === 'on_track' ? 'text-emerald-600 border-emerald-300' :
                          kr.confidence === 'at_risk' ? 'text-amber-600 border-amber-300' :
                          'text-rose-600 border-rose-300'
                        }`}
                      >
                        {kr.confidence.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Progress: {kr.current} / {kr.target}</span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
        {okrs.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            No objectives found. Click "New Objective" to define your targets.
          </div>
        )}
      </div>

      {/* Add Objective Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Strategic Objective (OKR)</DialogTitle>
            <DialogDescription>Define high-level objective and quantifiable key result.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOkr} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Objective Title *</Label>
              <Input
                placeholder="e.g. Achieve Supply Liquidity in Bhopal Market"
                value={newOkr.title}
                onChange={(e) => setNewOkr({ ...newOkr, title: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Level</Label>
                <Select value={newOkr.level} onValueChange={(v: any) => setNewOkr({ ...newOkr, level: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="city">City Gate</SelectItem>
                    <SelectItem value="team">Ops Team</SelectItem>
                    <SelectItem value="person">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Period</Label>
                <Input
                  value={newOkr.period}
                  onChange={(e) => setNewOkr({ ...newOkr, period: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Key Result 1 Title</Label>
              <Input
                value={newOkr.kr1Title}
                onChange={(e) => setNewOkr({ ...newOkr, kr1Title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Numeric Target</Label>
              <Input
                type="number"
                value={newOkr.kr1Target}
                onChange={(e) => setNewOkr({ ...newOkr, kr1Target: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Objective</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
