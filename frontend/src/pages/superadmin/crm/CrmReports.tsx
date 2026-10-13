import React, { useEffect, useState } from 'react';
import {
  BarChart3, RefreshCw, Download, Mail, Plus, Trash2, CalendarClock, Table2
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ReportMeta { key: string }
interface ReportData {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  generatedAt?: string;
}
interface Schedule {
  id: string;
  reportKey: string;
  frequency: string;
  recipients: string[];
  active: boolean;
  lastRunAt?: string | null;
}

const REPORT_TITLES: Record<string, string> = {
  supply_funnel: 'Supply Funnel',
  field_productivity: 'Field Productivity',
  churn: 'Churn Analysis',
  partner_outcomes: 'Partnership Outcomes',
  cohort: 'Cohort & Retention',
};

const toCsv = (columns: string[], rows: (string | number)[][]) => {
  const esc = (v: string | number) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
};

export default function CrmReports() {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    reportKey: 'supply_funnel',
    frequency: 'weekly',
    recipients: '',
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/crm/reports');
      setReports(res.data.reports || []);
      setSchedules(res.data.schedules || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const loadReport = async (key: string) => {
    setRunning(true);
    setActive(key);
    try {
      const res = await apiClient.get(`/crm/reports/${key}`);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run report');
      setActive(null);
    } finally {
      setRunning(false);
    }
  };

  const downloadCsv = () => {
    if (!data) return;
    try {
      const csv = toCsv(data.columns, data.rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-${data.key}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Failed to build CSV');
    }
  };

  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = newSchedule.recipients
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!recipients.length) { toast.error('At least one recipient email required'); return; }
    try {
      await apiClient.post('/crm/reports/schedules', {
        reportKey: newSchedule.reportKey,
        frequency: newSchedule.frequency,
        recipients,
        active: true,
      });
      toast.success('Report schedule created');
      setIsScheduleOpen(false);
      setNewSchedule({ reportKey: 'supply_funnel', frequency: 'weekly', recipients: '' });
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create schedule');
    }
  };

  const toggleSchedule = async (s: Schedule) => {
    try {
      await apiClient.patch(`/crm/reports/schedules/${s.id}`, { active: !s.active });
      setSchedules(schedules.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
      toast.success(s.active ? 'Schedule paused' : 'Schedule activated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    }
  };

  const deleteSchedule = async (s: Schedule) => {
    try {
      await apiClient.delete(`/crm/reports/schedules/${s.id}`);
      setSchedules(schedules.filter((x) => x.id !== s.id));
      toast.success('Schedule deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading CRM reports…</div>;

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <Badge variant="outline" className="text-xs uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-200">
            File 24 §4.12 — aggregate only, no PII
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <BarChart3 className="h-6 w-6 text-primary" />
            CRM Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Supply funnel, field productivity, churn, partnership outcomes & cohort retention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchList} className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsScheduleOpen(true)} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> Schedule Report
          </Button>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {reports.map((r) => (
          <Card
            key={r.key}
            className={`shadow-xs cursor-pointer hover:shadow-md transition-shadow ${active === r.key ? 'border-primary' : ''}`}
            onClick={() => loadReport(r.key)}
          >
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-foreground">{REPORT_TITLES[r.key] || r.key}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.key}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report table */}
      {active && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{data?.title || REPORT_TITLES[active]}</CardTitle>
                <CardDescription>
                  {data?.rows?.length ?? 0} rows
                  {data?.generatedAt ? ` • generated ${new Date(data.generatedAt).toLocaleString()}` : ''}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!data} className="gap-1.5 h-9">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {running || !data ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Running report…</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      {data.columns.map((c) => (
                        <th key={c} className="text-left font-semibold px-3 py-2 whitespace-nowrap capitalize">
                          {c.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                            {typeof cell === 'number' ? cell.toLocaleString() : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr><td colSpan={data.columns.length} className="px-3 py-6 text-center text-muted-foreground">No data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedules */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-500" /> Scheduled Exports
          </CardTitle>
          <CardDescription>Emailed nightly as CSV to recipients (aggregate-only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedules.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">No schedules configured.</div>
          )}
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Table2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">{REPORT_TITLES[s.reportKey] || s.reportKey}</span>
                  <Badge variant="secondary" className="text-[10px] capitalize">{s.frequency}</Badge>
                  <Badge variant={s.active ? 'outline' : 'secondary'} className="text-[10px] capitalize">
                    {s.active ? 'active' : 'paused'}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {s.recipients.join(', ')}
                  {s.lastRunAt ? ` • last run ${new Date(s.lastRunAt).toLocaleDateString()}` : ' • never run'}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toggleSchedule(s)}>
                  {s.active ? 'Pause' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600"
                  onClick={() => deleteSchedule(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Schedule dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Report Export</DialogTitle>
            <DialogDescription>CSV emailed to recipients on the frequency you choose.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createSchedule} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Report</Label>
              <Select value={newSchedule.reportKey} onValueChange={(v) => setNewSchedule({ ...newSchedule, reportKey: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{REPORT_TITLES[r.key] || r.key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Frequency</Label>
              <Select value={newSchedule.frequency} onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (01:30)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Recipients (comma-separated emails) *</Label>
              <Input
                placeholder="ops@findmedi.com, admin@findmedi.com"
                value={newSchedule.recipients}
                onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
              <Button type="submit">Create Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
