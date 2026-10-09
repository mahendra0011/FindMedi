import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.8/06.1 — payroll: calculate per staff/month, history list.
 * Salary structure server-side; this page only triggers and views.
 */
export default function PayrollPage() {
  const [staffId, setStaffId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [history, setHistory] = useState<any[]>([]);
  const [slips, setSlips] = useState<any[]>([]);
  const [earn, setEarn] = useState({ basic: '', hra: '', allowances: '', overtime: '' });
  const [ded, setDed] = useState({ pf: '', esi: '', pt: '', tds: '', advances: '' });

  const load = async () => {
    try {
      const r: any = await (api as any).getPayrollHistory({});
      setHistory(r?.history || r?.data || []);
    } catch { toast.error('Failed to load payroll history'); }
    try {
      const s: any = await api.payslips({ month });
      setSlips(s?.payslips || []);
    } catch { /* payslip ledger optional */ }
  };
  useEffect(() => { load(); }, [month]);

  const calc = async () => {
    try {
      await (api as any).calcPayroll({ staffId, month });
      toast.success('Payroll calculated');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Payroll</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Calculate</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="Staff ID" value={staffId} onChange={(e) => setStaffId(e.target.value)} />
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button onClick={calc} disabled={!staffId}>Calculate</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">History ({history.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-96 overflow-auto">
          {history.map((h: any, i: number) => (
            <div key={i} className="flex justify-between text-sm rounded-md border border-border/40 p-2">
              <span>{h.month || h.period} · {h.staffName || h.staffId}</span>
              <b>₹{Number(h.net ?? h.total ?? 0).toLocaleString('en-IN')}</b>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-muted-foreground">No payroll runs yet.</p>}
        </CardContent>
      </Card>
      {/* File 22 P0-6: payslip ledger (net derived server-side; release = SoD) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payslips ({slips.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {Object.keys(earn).map((k) => (
              <Input key={k} placeholder={k} value={(earn as any)[k]} onChange={(e) => setEarn({ ...earn, [k]: e.target.value })} />
            ))}
            {Object.keys(ded).map((k) => (
              <Input key={k} placeholder={k} value={(ded as any)[k]} onChange={(e) => setDed({ ...ded, [k]: e.target.value })} />
            ))}
          </div>
          <Button
            disabled={!staffId}
            onClick={async () => {
              try {
                const num = (v: string) => (Number(v) >= 0 ? Number(v) : 0);
                const clean = (o: any) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, num(v as string)]));
                await api.createPayslip({ staffId, month, earnings: clean(earn), deductions: clean(ded) });
                toast.success('Payslip created (net derived)');
                load();
              } catch (err: any) { toast.error(err?.response?.data?.message || err?.message || 'Failed'); }
            }}
          >
            Issue payslip for {month}
          </Button>
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {slips.map((s: any) => (
              <div key={s._id} className="flex items-center justify-between text-sm rounded-md border border-border/40 p-2">
                <span>{s.month} · gross ₹{Number(s.gross || 0).toLocaleString('en-IN')} · net <b>₹{Number(s.net || 0).toLocaleString('en-IN')}</b> · {s.status}</span>
                {s.status === 'Draft' ? (
                  <Button size="sm" variant="outline" onClick={async () => {
                    try { await api.releasePayslip(s._id); toast.success('Released'); load(); }
                    catch (err: any) { toast.error(err?.response?.data?.message || 'Release failed (self-release is forbidden)'); }
                  }}>Release</Button>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
