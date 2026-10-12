import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, History, Printer, Send, PenLine, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import RadiologyReportingModal from '@/components/radiology/RadiologyReportingModal';
import {
  Modal, StatusBadge, ModalityBadge, errMessage, fmtDateTime,
  patientNameOf, doctorNameOf,
} from '@/components/radiology/radShared';

const REPORT_STATUSES = ['Reported', 'Report Finalized', 'Report Released', 'Delivered'];
const TABS = ['All', 'MRI', 'X-Ray', 'CT Scan', 'Ultrasound', 'Doppler', 'Mammography', 'Other'];

export default function ReportCenter() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [historyOrder, setHistoryOrder] = useState<any>(null);
  const [amendOrder, setAmendOrder] = useState<any>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);

  const ordersQ = useQuery({ queryKey: ['radiology', 'orders', 'reports'], queryFn: () => radApi.getOrders({}) });
  const all: any[] = ordersQ.data?.orders || [];

  const reported = useMemo(() => all.filter((o: any) => REPORT_STATUSES.includes(o.status)), [all]);

  const filtered = reported.filter((o: any) => {
    const inTab = tab === 'All' || (tab === 'Other' ? !['MRI', 'X-Ray', 'CT Scan', 'Ultrasound', 'Doppler', 'Mammography'].includes(o.modality) : o.modality === tab);
    const s = search.toLowerCase();
    const inSearch = !s || [o.patientName, o.orderId, o.studyNumber, o.reportNumber, o.bodyPart].some((v: any) => String(v || '').toLowerCase().includes(s));
    return inTab && inSearch;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const deliverMut = useMutation({
    mutationFn: (id: string) => radApi.deliver(id),
    onSuccess: () => { toast.success('Report delivered to patient'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Deliver failed')),
  });
  const reportMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.submitReport(id, b),
    onSuccess: () => { toast.success('Amended report signed'); invalidate(); setAmendOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Amendment failed')),
  });

  const counts: Record<string, number> = { All: reported.length };
  for (const o of reported) counts[o.modality || 'Other'] = (counts[o.modality || 'Other'] || 0) + 1;

  const handlePrint = () => {
    setPrintOrder(printOrder);
    setTimeout(() => window.print(), 120);
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Radiology Report Center</h1>
          <p className="page-subtitle">{reported.length} signed reports · {reported.filter((o: any) => !['Delivered', 'Report Released'].includes(o.status)).length} awaiting delivery</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t: string) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 h-9 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {t} ({counts[t] || 0})
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search patient / report no..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="p-3 font-medium">Patient</th>
              <th className="p-3 font-medium">Order No</th>
              <th className="p-3 font-medium">Study No</th>
              <th className="p-3 font-medium">Report No</th>
              <th className="p-3 font-medium">Modality</th>
              <th className="p-3 font-medium">Radiologist</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Ver</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o: any) => (
              <tr key={o._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <p className="font-medium">{patientNameOf(o.patientId || o)}</p>
                  <p className="text-[11px] text-muted-foreground">{o.bodyPart}</p>
                </td>
                <td className="p-3">{o.orderId}</td>
                <td className="p-3 font-mono text-[11px]">{o.studyNumber || '-'}</td>
                <td className="p-3 font-mono text-[11px]">{o.reportNumber || '-'}</td>
                <td className="p-3"><ModalityBadge value={o.modality} /></td>
                <td className="p-3">{o.reportedBy?.name || (o.reportedBy ? String(o.reportedBy).slice(0, 8) : '-')}</td>
                <td className="p-3"><StatusBadge value={o.status} /></td>
                <td className="p-3 text-right">{(o.reportVersions?.length || 0) + 1}</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end flex-wrap">
                    {(o.reportVersions?.length || 0) > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setHistoryOrder(o)}>
                        <History className="w-3 h-3 mr-1" /> v{o.reportVersions.length}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPrintOrder(o)}>
                      <Printer className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAmendOrder(o)}>
                      <PenLine className="w-3 h-3 mr-1" /> Correct / Amend
                    </Button>
                    {o.status !== 'Delivered' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => deliverMut.mutate(o._id)} disabled={deliverMut.isPending}>
                        <Send className="w-3 h-3 mr-1" /> Deliver
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />No reports in this category</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(historyOrder)} onClose={() => setHistoryOrder(null)} title="Report Version History" wide>
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{historyOrder?.orderId} · {historyOrder?.patientName} · {historyOrder?.modality}</p>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-emerald-600 mb-1">Current (v{(historyOrder?.reportVersions?.length || 0) + 1}) — {fmtDateTime(historyOrder?.reportedAt)}</p>
            <p className="whitespace-pre-line">{historyOrder?.impression || historyOrder?.findings || 'No content'}</p>
          </div>
          {(historyOrder?.reportVersions || []).slice().reverse().map((v: any, i: number) => (
            <div key={i} className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-1">v{v.versionNumber} — {fmtDateTime(v.signedAt)}{v.amendmentReason ? ` · ${v.amendmentReason}` : ''}</p>
              <p className="text-xs font-medium">Impression: {v.impression || '-'}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{v.findings || ''}</p>
              {v.recommendation && <p className="text-xs text-muted-foreground mt-1">Rec: {v.recommendation}</p>}
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(printOrder)} onClose={() => setPrintOrder(null)} title="Report View" wide>
        <div className="space-y-4 text-sm">
          <div id="rad-report-print" className="rounded-lg border p-6 bg-background">
            <div className="text-center border-b pb-3 mb-4">
              <h2 className="font-heading text-lg font-bold">Radiology Diagnostic Report</h2>
              <p className="text-xs text-muted-foreground">{printOrder?.reportNumber ? `Report ${printOrder.reportNumber} · ` : ''}{fmtDateTime(printOrder?.reportedAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><span className="text-xs text-muted-foreground">Patient</span><p className="font-medium">{patientNameOf(printOrder?.patientId || printOrder)}</p></div>
              <div><span className="text-xs text-muted-foreground">Order</span><p className="font-medium">{printOrder?.orderId}</p></div>
              <div><span className="text-xs text-muted-foreground">Study</span><p className="font-medium">{printOrder?.modality} — {printOrder?.bodyPart}</p></div>
              <div><span className="text-xs text-muted-foreground">Referring</span><p className="font-medium">Dr. {doctorNameOf(printOrder)}</p></div>
              <div><span className="text-xs text-muted-foreground">Study No</span><p className="font-mono text-xs">{printOrder?.studyNumber || '-'}</p></div>
              <div><span className="text-xs text-muted-foreground">Priority</span><p className="font-medium">{printOrder?.priority}</p></div>
            </div>
            <div className="space-y-3">
              <div><p className="text-xs font-semibold text-muted-foreground">Findings</p><p className="whitespace-pre-line">{printOrder?.findings || '-'}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground">Impression</p><p className="whitespace-pre-line">{printOrder?.impression || '-'}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground">Recommendation</p><p className="whitespace-pre-line">{printOrder?.recommendation || '-'}</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-6 pt-3 border-t">Electronically signed report. Version {(printOrder?.reportVersions?.length || 0) + 1}.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setPrintOrder(null); setAmendOrder(printOrder); }}>
              <PenLine className="w-4 h-4 mr-1" /> Amend
            </Button>
            <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-1" /> Print / Save PDF</Button>
          </div>
        </div>
      </Modal>

      {amendOrder && (
        <RadiologyReportingModal
          order={amendOrder}
          onClose={() => setAmendOrder(null)}
          onSubmit={(b: any) => {
            if ((amendOrder.findings || amendOrder.impression) && !b.amendmentReason) {
              toast.error('Amendment reason is required');
              return;
            }
            reportMut.mutate({ id: amendOrder._id, ...b });
          }}
        />
      )}

      <style>{`@media print { body * { visibility: hidden; } #rad-report-print, #rad-report-print * { visibility: visible; } #rad-report-print { position: absolute; inset: 0; } }`}</style>
    </div>
  );
}
