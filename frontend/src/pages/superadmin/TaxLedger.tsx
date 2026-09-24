import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

// SA-M3: statutory reconciliation computed from the REAL transaction ledger.
// - Section 194-O TDS: 1% of gross provider payouts.
// - GST: 18% on the platform-fee (service) portion; medical consultations themselves are GST-exempt.
// Rows below are live ledger entries — nothing is sampled or invented.
const TDS_RATE = 0.01;
const GST_ON_FEE_RATE = 0.18;

export default function TaxLedger() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 50;
  // Form 16A quarterly TDS certificate (real aggregation from /commission/tax-summary).
  const fiscalQuarterOf = (d = new Date()) => {
    const m = d.getMonth();
    if (m >= 3 && m <= 5) return `${d.getFullYear()}-Q1`;
    if (m >= 6 && m <= 8) return `${d.getFullYear()}-Q2`;
    if (m >= 9 && m <= 11) return `${d.getFullYear()}-Q3`;
    return `${d.getFullYear() - (m <= 2 ? 1 : 0)}-Q4`;
  };
  const [quarter, setQuarter] = useState(fiscalQuarterOf());
  const [taxSummary, setTaxSummary] = useState(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const loadQuarter = useCallback(async (q) => {
    setTaxLoading(true);
    try {
      const data = await api.getTaxSummary(q);
      setTaxSummary(data);
    } catch { toast.error('Failed to load quarterly TDS summary'); }
    setTaxLoading(false);
  }, []);
  useEffect(() => { loadQuarter(quarter); }, [quarter, loadQuarter]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.getTransactionLedger({ page: p, limit: pageSize });
      setRows(data.transactions || data.ledger || data.rows || []);
      setTotal(data.total || 0);
      const pages = Math.max(1, data.totalPages || Math.ceil((data.total || 0) / pageSize));
      setTotalPages(pages);
      setPage(Math.min(p, pages));
    } catch { toast.error('Failed to load tax ledger'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  const sums = rows.reduce(
    (s, t) => ({
      gross: s.gross + (Number(t.amount) || 0),
      fee: s.fee + (Number(t.commissionAmount) || 0),
      net: s.net + (Number(t.netAmount) || 0),
    }),
    { gross: 0, fee: 0, net: 0 }
  );
  const tds = Math.round(sums.gross * TDS_RATE);
  const gst = Math.round(sums.fee * GST_ON_FEE_RATE);

  const exportCsv = () => {
    const header = 'date,facility,source,gross,platform_fee,net_payable,tds_1pct,gst_on_fee_18pct,status';
    const lines = rows.map((t) => [
      t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '',
      `"${String(t.facilityName || '').replace(/"/g, '""')}"`,
      t.source || '',
      Number(t.amount) || 0,
      Number(t.commissionAmount) || 0,
      Number(t.netAmount) || 0,
      Math.round((Number(t.amount) || 0) * TDS_RATE),
      Math.round((Number(t.commissionAmount) || 0) * GST_ON_FEE_RATE),
      t.status || '',
    ].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gstr1-payouts-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Tax Ledger (194-O · GST)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Computed live from {total.toLocaleString()} ledger entries — TDS 1% on gross, GST 18% on platform fee</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> GSTR-1 CSV (this page)
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Gross (this page)`, value: inr(sums.gross), color: '' },
          { label: 'TDS 1% payable', value: inr(tds), color: 'text-warning' },
          { label: 'GST 18% on platform fee', value: inr(gst), color: 'text-info' },
          { label: 'Net to providers', value: inr(sums.net), color: 'text-success' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.color || 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No ledger entries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Facility</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Source</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3 tabular-nums">Gross</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3 tabular-nums">Fee</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3 tabular-nums">TDS 1%</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3 tabular-nums">GST 18%</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 font-medium max-w-[180px] truncate">{t.facilityName || '—'}</td>
                  <td className="px-4 py-3 text-xs capitalize">{t.source || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(t.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(t.commissionAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(Math.round((Number(t.amount) || 0) * TDS_RATE))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(Math.round((Number(t.commissionAmount) || 0) * GST_ON_FEE_RATE))}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[11px]">{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} entries</p>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" /> Form 16A — Quarterly TDS Certificate (194-O)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Quarter (fiscal):</span>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
              {(() => {
                const out = [];
                const now = new Date();
                for (let i = 0; i < 8; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
                  const q = fiscalQuarterOf(d);
                  if (!out.includes(q)) out.push(q);
                }
                return out.map((q) => <option key={q} value={q}>{q}</option>);
              })()}
            </select>
            <Button variant="outline" size="sm" disabled={!taxSummary} onClick={() => window.print()} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          </div>
          {taxLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : taxSummary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Quarter gross', value: inr(taxSummary.totals?.gross) },
                  { label: 'TDS deducted (1%)', value: inr(taxSummary.totals?.tds) },
                  { label: 'Facilities', value: taxSummary.totals?.facilities ?? 0 },
                  { label: 'Period', value: taxSummary.period ? `${new Date(taxSummary.period.start).toLocaleDateString('en-IN')} – ${new Date(taxSummary.period.end).toLocaleDateString('en-IN')}` : '' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border p-3 text-center">
                    <p className="font-bold tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {(taxSummary.facilities || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payouts in this quarter yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left font-medium text-muted-foreground px-4 py-2">Deductee (facility)</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2 tabular-nums">Gross</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2 tabular-nums">TDS 1%</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2 tabular-nums">Txns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxSummary.facilities.map((f) => (
                        <tr key={String(f.facilityId)} className="border-b last:border-0">
                          <td className="px-4 py-2 font-medium max-w-[220px] truncate">{f.facilityName || String(f.facilityId)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{inr(f.gross)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{inr(f.tds)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{f.transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Generated live from the transaction ledger for {taxSummary.quarter}. File with the quarterly TDS return; this view is the working for Form 16A issuance.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
