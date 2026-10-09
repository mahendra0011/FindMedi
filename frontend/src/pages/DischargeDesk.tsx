import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.2 — discharge desk: running bill → initiate → doctor approve →
 * nursing/pharmacy/billing clears → finalize (final bill + bed freed).
 */
const STAGES = ['Initiated', 'DoctorApproved', 'NursingClear', 'PharmacyClear', 'BillingClear', 'Discharged'];

export default function DischargeDesk() {
  const [admissionId, setAdmissionId] = useState('');
  const [bill, setBill] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);

  const load = async () => {
    if (!admissionId) return;
    try {
      const b: any = await (api as any).getRunningBill(admissionId);
      setBill(b);
    } catch { toast.error('Admission not found'); }
  };

  const step = async (fn: () => Promise<any>, label: string) => {
    try {
      const r: any = await fn();
      setFlow(r?.flow || r);
      toast.success(label);
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Discharge Desk</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Admission</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Admission ID" value={admissionId} onChange={(e) => setAdmissionId(e.target.value)} />
          <Button onClick={load}>Load</Button>
        </CardContent>
      </Card>
      {bill && (
        <Card>
          <CardHeader><CardTitle className="text-base">Running bill: ₹{bill.balance} due (charged ₹{bill.charged}, deposits ₹{bill.deposited})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => step(() => (api as any).initDischarge(admissionId, {}), 'Discharge initiated')}>1. Initiate</Button>
            <Button size="sm" variant="outline" onClick={() => step(() => (api as any).approveDischarge(admissionId, {}), 'Doctor approved')}>2. Doctor approve</Button>
            {['nursing', 'pharmacy', 'billing'].map((s, i) => (
              <Button key={s} size="sm" variant="outline" onClick={() => step(() => (api as any).clearDischarge(admissionId, s, {}), `${s} cleared`)}>{3 + i}. {s} clear</Button>
            ))}
            <Button size="sm" onClick={() => step(() => (api as any).finalizeDischarge(admissionId, {}), 'Discharged + final bill created')}>6. Finalize (bill + free bed)</Button>
          </CardContent>
        </Card>
      )}
      {flow && (
        <Card>
          <CardHeader><CardTitle className="text-base">State: {flow.state || flow.status}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <span key={s} className={`text-[11px] px-2 py-0.5 rounded-full ${flow.state === s ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>{s}</span>
              ))}
            </div>
            {flow.balance != null && <p className="text-sm mt-2">Outstanding at finalize: ₹{flow.balance}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
