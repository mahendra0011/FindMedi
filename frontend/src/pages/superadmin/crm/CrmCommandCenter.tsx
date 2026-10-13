import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, Building2, AlertTriangle, CheckCircle2, Clock,
  Calendar, ShieldAlert, ArrowRight, Layers, Target, Briefcase, FileCheck, RefreshCw, BarChart2, Award
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface CommandCenterData {
  funnel: Record<string, number>;
  totalLeads: number;
  activeProviders: number;
  pendingApps: number;
  openDisputes: number;
  openTickets: number;
  expiringDocs30d: number;
  overdueTasks: number;
  atRiskProviders: number;
  okrs: Array<{
    id: string;
    title: string;
    level: string;
    keyResults: Array<{ title: string; target: number; current: number; confidence: string }>;
  }>;
  timestamp: string;
}

const STAGE_ORDER = [
  { key: 'identified', label: 'Identified', color: 'bg-slate-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { key: 'interested', label: 'Interested', color: 'bg-cyan-500' },
  { key: 'demo_done', label: 'Demo Done', color: 'bg-indigo-500' },
  { key: 'docs_collected', label: 'Docs Ready', color: 'bg-violet-500' },
  { key: 'application_submitted', label: 'Applied', color: 'bg-amber-500' },
  { key: 'under_review', label: 'In Review', color: 'bg-orange-500' },
  { key: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { key: 'activated', label: 'Activated', color: 'bg-green-600' },
  { key: 'active', label: 'Active', color: 'bg-teal-600' },
];

export default function CrmCommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedCity && selectedCity !== 'all'
        ? `/crm/command-center?city=${encodeURIComponent(selectedCity)}`
        : '/crm/command-center';
      const res = await apiClient.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load CRM command center', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">File 24 • Operations Cockpit</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-1">
            <Layers className="h-8 w-8 text-primary" />
            Ops CRM Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform supply pipeline, marketplace health, team velocity, and city launch-gates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="Bhopal">Bhopal</SelectItem>
              <SelectItem value="Indore">Indore</SelectItem>
              <SelectItem value="Jabalpur">Jabalpur</SelectItem>
              <SelectItem value="Gwalior">Gwalior</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground">
            <Link to="/superadmin/crm/pipeline">
              Supply Pipeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* North-Star Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Total Leads</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{data?.totalLeads ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Prospect providers</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Active Supply</span>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{data?.activeProviders ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Live listings</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Pending KYC</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{data?.pendingApps ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">In review</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">At-Risk Supply</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold">{data?.atRiskProviders ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Needs intervention</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Expiring Docs</span>
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{data?.expiringDocs30d ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Tasks Overdue</span>
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{data?.overdueTasks ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">SLA breaches</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Conversion Funnel */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Provider Supply Funnel
              </CardTitle>
              <CardDescription>
                Full prospect journey: Identified → Contacted → Demo → Docs → Application → Activated
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Aggregated • k-anonymous
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {STAGE_ORDER.map((stage, idx) => {
              const count = data?.funnel?.[stage.key] || 0;
              return (
                <div
                  key={stage.key}
                  className="bg-card/60 border border-border/80 rounded-lg p-3 text-center flex flex-col items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="text-xs font-medium text-muted-foreground truncate w-full" title={stage.label}>
                    {idx + 1}. {stage.label}
                  </div>
                  <div className="text-2xl font-black text-foreground my-2">{count}</div>
                  <div className={`h-1.5 w-full rounded-full ${stage.color} opacity-80`} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Grid: City Launch Gates & OKRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Launch Gates */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              City Launch Gates (Readiness Status)
            </CardTitle>
            <CardDescription>Launch criteria monitoring per target market</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="border border-border/70 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Bhopal (Primary Pilot)</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300">Live & Scaling</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-center pt-1">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Supply Density</span>
                    <span className="font-bold text-emerald-600">● 92%</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Slot Fill</span>
                    <span className="font-bold text-emerald-600">◐ 68%</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Repeat Rate</span>
                    <span className="font-bold text-amber-600">◐ 44%</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Support Load</span>
                    <span className="font-bold text-emerald-600">● Low</span>
                  </div>
                </div>
              </div>

              <div className="border border-border/70 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Indore (Expansion Phase 2)</span>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-300">Soft Launch</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-center pt-1">
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Supply Density</span>
                    <span className="font-bold text-amber-600">◐ 54%</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Slot Fill</span>
                    <span className="font-bold text-amber-600">◐ 42%</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Repeat Rate</span>
                    <span className="font-bold text-slate-500">○ 18%</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground block text-[10px]">Support Load</span>
                    <span className="font-bold text-emerald-600">● Normal</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Objectives & OKRs */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                Company & City OKRs
              </CardTitle>
              <CardDescription>Strategic key results tracking</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/superadmin/crm/okrs">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.okrs && data.okrs.length > 0 ? (
              data.okrs.slice(0, 3).map((okr) => (
                <div key={okr.id} className="space-y-2 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="truncate pr-2">{okr.title}</span>
                    <Badge variant="outline" className="capitalize text-[11px] shrink-0">
                      {okr.level}
                    </Badge>
                  </div>
                  {okr.keyResults?.map((kr, idx) => {
                    const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="truncate">{kr.title}</span>
                          <span>{kr.current} / {kr.target} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No active OKRs configured yet.{' '}
                <Link to="/superadmin/crm/okrs" className="text-primary underline">
                  Create an OKR
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation to CRM Submodules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/pipeline">
            <Users className="h-5 w-5 text-blue-600" />
            Supply Pipeline
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/accounts">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Provider 360
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/partnerships">
            <Briefcase className="h-5 w-5 text-violet-600" />
            Partnerships
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/field-ops">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Field Ops
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/tasks">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            Tasks & SLAs
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs font-medium hover:border-primary/50">
          <Link to="/superadmin/crm/team">
            <FileCheck className="h-5 w-5 text-indigo-600" />
            Team Roster
          </Link>
        </Button>
      </div>
    </div>
  );
}
