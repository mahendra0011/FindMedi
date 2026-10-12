import { useState } from 'react';
import { BarChart3, Download, FileText, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { Field, selectCls, toDateInput } from '@/components/radiology/radShared';

const REPORT_TYPES = [
  'Radiology Study Volume',
  'Radiology Revenue',
  'Radiology TAT',
  'Radiology Equipment Utilization',
  'Radiology Report Pending',
  'Radiology Cancelled/No-show',
];

function titleize(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()).trim();
}

function ValueBlock({ value }: { value: any }) {
  if (value === null || value === undefined) return <p className="text-sm text-muted-foreground">-</p>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-muted-foreground">No rows</p>;
    if (typeof value[0] === 'object') {
      const cols = Object.keys(value[0]);
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b bg-muted/30">
                {cols.map((c: string) => <th key={c} className="p-2.5 font-medium whitespace-nowrap">{titleize(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {value.map((row: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  {cols.map((c: string) => (
                    <td key={c} className="p-2.5 whitespace-nowrap">{row[c] === null || row[c] === undefined ? '-' : typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <p className="text-sm">{value.join(', ')}</p>;
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v]: [string, any]) => (
          <div key={k}>
            <p className="text-xs font-semibold text-muted-foreground mb-1">{titleize(k)}</p>
            <ValueBlock value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-lg font-bold">{String(value)}</p>;
}

function toCsv(data: any): string {
  if (!data || typeof data !== 'object') return String(data ?? '');
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      const cols = Object.keys(v[0]);
      const lines = [cols.join(',')];
      for (const row of v) lines.push(cols.map((c) => JSON.stringify(row[c] ?? '')).join(','));
      return lines.join('\n');
    }
  }
  return JSON.stringify(data, null, 2);
}

export default function RadiologyMIS() {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [dateFrom, setDateFrom] = useState(toDateInput(new Date(Date.now() - 30 * 86400000)));
  const [dateTo, setDateTo] = useState(toDateInput(new Date()));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res: any = await api.generateReport({
        reportType,
        category: 'Radiology',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setReport(res);
      toast.success('Report generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!report) return;
    const csv = toCsv(report.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(report.reportType || 'radiology-report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Radiology MIS Reports</h1>
          <p className="page-subtitle">Volume, revenue, turnaround, utilization and pending backlogs</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Report type">
            <select value={reportType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportType(e.target.value)} className={selectCls}>
              {REPORT_TYPES.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="From"><Input type="date" value={dateFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={dateTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)} /></Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={loading}>
            <Play className="w-4 h-4 mr-1" /> {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {report && (
            <Button variant="outline" onClick={downloadCsv}><Download className="w-4 h-4 mr-1" /> Download CSV</Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      )}

      {report && !loading && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <div>
              <h2 className="font-heading font-semibold">{report.reportType}</h2>
              <p className="text-xs text-muted-foreground">{report.dateFrom || 'All time'} → {report.dateTo || 'now'} · {report.reportId}</p>
            </div>
          </div>
          <div className="p-4 space-y-5">
            {report.summary && (
              <div className="rounded-lg border bg-primary/5 p-3 text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" /> {report.summary}
              </div>
            )}
            <ValueBlock value={report.data} />
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Choose a report type and generate to see results</p>
        </div>
      )}
    </div>
  );
}
