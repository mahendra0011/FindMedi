import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Microscope, ClipboardList, Clock, CheckCircle2, XCircle, ExternalLink, Loader2, Timer, AlertTriangle, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const SECTION_LIST = ['Biochemistry', 'Hematology', 'Clinical Pathology', 'Microbiology', 'Histopathology', 'Cytology', 'Serology', 'Molecular'];

const STATUS_COLORS: any = {
  Ordered: 'bg-muted text-muted-foreground',
  'Sample Needed': 'bg-warning/10 text-warning',
  'Sample Collected': 'bg-info/10 text-info',
  Processing: 'bg-info/10 text-info',
  'Result Pending': 'bg-warning/10 text-warning',
  Completed: 'bg-purple-500/10 text-purple-600',
  Verified: 'bg-success/10 text-success',
  'Report Delivered': 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
  Recollect: 'bg-orange-500/10 text-orange-600',
};

const PRIORITY_COLORS: any = {
  Routine: 'bg-muted text-muted-foreground',
  Urgent: 'bg-warning/10 text-warning',
  STAT: 'bg-destructive/10 text-destructive',
};

const CULTURE_STAGES: any = {
  Ordered: 'Awaiting specimen',
  'Sample Needed': 'Awaiting specimen',
  'Sample Collected': 'Plated / inoculated',
  Processing: 'Culture in progress',
  'Result Pending': 'Read & ID pending',
  Completed: 'Culture complete',
  Verified: 'Report released',
  'Report Delivered': 'Report released',
  Rejected: 'Specimen rejected',
};

const HISTO_STAGES: any = {
  Ordered: 'Awaiting grossing',
  'Sample Needed': 'Awaiting grossing',
  'Sample Collected': 'Grossing',
  Processing: 'Processing / embedding',
  'Result Pending': 'Blocks & slides ready',
  Completed: 'Slides stained',
  Verified: 'Slides signed out',
  'Report Delivered': 'Slides signed out',
  Rejected: 'Specimen rejected',
};

interface LabSectionWorkbenchProps {
  section?: string;
}

export default function LabSectionWorkbench(props: LabSectionWorkbenchProps) {
  const { section: routeSection } = useParams<{ section?: string }>();
  const section = props.section || (routeSection ? decodeURIComponent(routeSection) : 'Biochemistry');
  const [tab, setTab] = useState<'overview' | 'worklist'>('worklist');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: worklistData, isLoading } = useQuery({
    queryKey: ['lab-worklist', section],
    queryFn: () => api.getLabWorklist({ section, limit: 200 }),
  });
  const { data: sectionsData } = useQuery({ queryKey: ['lab-sections'], queryFn: () => api.getLabSections() });
  const { data: tat } = useQuery({ queryKey: ['lab-tat'], queryFn: () => api.labTat() });

  const rows: any[] = worklistData?.worklist || [];
  const sections: any[] = sectionsData?.sections || [];
  const mine = sections.find((s: any) => s.section === section) || { section, tests: 0, pending: 0, verified: 0, rejected: 0 };
  const slaHours: any = tat?.slaHours || { STAT: 2, Urgent: 6, Routine: 24 };

  const filtered = rows.filter((r: any) => statusFilter === 'All' || r.status === statusFilter);

  const dueInfo = (r: any) => {
    if (!r.receivedAt) return { label: '—', overdue: false };
    const sla = slaHours[r.priority] || slaHours.Routine || 24;
    const due = new Date(r.receivedAt).getTime() + sla * 3600000;
    const left = due - Date.now();
    if (left < 0) return { label: `overdue ${Math.max(1, Math.round(-left / 3600000))}h`, overdue: true };
    if (left < 3600000) return { label: `due in ${Math.max(1, Math.round(left / 60000))}m`, overdue: false };
    return { label: `due in ${Math.round(left / 3600000)}h`, overdue: false };
  };

  const statusCounts = rows.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Microscope className="w-6 h-6 text-primary" /> {section} Workbench
          </h1>
          <p className="text-muted-foreground">Section worklist, TAT tracking and bench actions</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 self-start">
          {(['overview', 'worklist'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SECTION_LIST.map(s => (
          <span key={s}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${s === section ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border/60'}`}>
            {s}
          </span>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tests in section', value: mine.tests, icon: Layers, cls: 'bg-primary/10 text-primary' },
              { label: 'Pending', value: mine.pending, icon: Clock, cls: 'bg-warning/10 text-warning' },
              { label: 'Verified', value: mine.verified, icon: CheckCircle2, cls: 'bg-success/10 text-success' },
              { label: 'Rejected', value: mine.rejected, icon: XCircle, cls: 'bg-destructive/10 text-destructive' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.cls}`}>
                  <c.icon className="w-4.5 h-4.5" />
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Live status split</h2>
            </div>
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No test lines in this section yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(statusCounts).map(([st, n]: any) => {
                  const pct = rows.length ? Math.round((n / rows.length) * 100) : 0;
                  return (
                    <div key={st}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{st}</span>
                        <span className="text-muted-foreground">{n} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                          className="h-full bg-primary rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">TAT targets</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(slaHours).map(([p, h]: any) => (
                <span key={p} className="rounded-md border border-border/60 px-2.5 py-1.5">
                  <b>{p}</b> · {h}h SLA
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {['All', ...Object.keys(statusCounts)].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {f} <span className="opacity-70">({f === 'All' ? rows.length : statusCounts[f]})</span>
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Patient / Order</th>
                    <th className="text-left px-4 py-3">Test</th>
                    <th className="text-left px-4 py-3">Priority</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Received</th>
                    <th className="text-left px-4 py-3">TAT</th>
                    {section === 'Microbiology' && <th className="text-left px-4 py-3">Culture</th>}
                    {section === 'Histopathology' && <th className="text-left px-4 py-3">Grossing / Blocks / Slides</th>}
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((r: any, i: number) => {
                    const due = dueInfo(r);
                    return (
                      <tr key={`${r.orderId}-${r.testIndex}-${i}`} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{r.patientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{r.orderNo} {r.sampleNo ? `· ${r.sampleNo}` : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{r.testName}</p>
                          <p className="text-[11px] text-muted-foreground">{r.doctorName || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${PRIORITY_COLORS[r.priority] || ''} border-0 text-[10px]`}>{r.priority}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${STATUS_COLORS[r.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>{r.status}</Badge>
                          {r.outsourced && <Badge className="ml-1 border-0 text-[10px] bg-violet-500/10 text-violet-600">Outsourced</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : 'Not received'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${due.overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {due.overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {due.label}
                          </span>
                        </td>
                        {section === 'Microbiology' && (
                          <td className="px-4 py-3 text-xs text-muted-foreground">{CULTURE_STAGES[r.status] || '—'}</td>
                        )}
                        {section === 'Histopathology' && (
                          <td className="px-4 py-3 text-xs text-muted-foreground">{HISTO_STAGES[r.status] || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                            <Link to="/lab">
                              <ExternalLink className="w-3.5 h-3.5" /> Open
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-14">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No worklist items for {section}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
