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

  const load = async () => {
    try {
      const r: any = await (api as any).getPayrollHistory({});
      setHistory(r?.history || r?.data || []);
    } catch { toast.error('Failed to load payroll history'); }
  };
  useEffect(() => { load(); }, []);

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
    </div>
  );
}
