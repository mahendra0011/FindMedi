import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MonitorSmartphone, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const serverMsg = (err, fallback) => err?.response?.data?.message || err.message || fallback;

// SA-M5: active sessions (kill switch) + payout four-eyes queue + 2FA enrolment readout.
export default function Security() {
  const [sessions, setSessions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, p] = await Promise.all([
        api.getAdminSessions().catch(() => ({ sessions: [] })),
        api.get2faStatus().catch(() => ({ admins: [] })),
        api.getPayouts({ limit: 50 }).catch(() => ({ payouts: [] })),
      ]);
      setSessions(s.sessions || []);
      setAdmins(a.admins || []);
      setPayouts((p.payouts || []).filter((x) => x.status === 'pending'));
    } catch { toast.error('Failed to load security console'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const kill = async (id, email) => {
    if (!confirm(`Revoke this session (${email || 'unknown'})? The admin will be signed out on that device.`)) return;
    try {
      await api.killAdminSession(id);
      toast.success('Session revoked');
      load();
    } catch (err) { toast.error(serverMsg(err, 'Revoke failed')); }
  };

  const approve = async (id) => {
    try {
      await api.approvePayout(id);
      toast.success('Approval recorded');
      load();
    } catch (err) { toast.error(serverMsg(err, 'Approve failed')); }
  };

  const pay = async (p) => {
    const distinct = new Set((p.approvals || []).map((a) => String(a.adminId))).size;
    if ((p.netPayout || 0) >= 100000 && distinct < 2) {
      toast.error(`Four-eyes rule: ${distinct}/2 distinct approvals required before paying ₹${Number(p.netPayout).toLocaleString('en-IN')}`);
      return;
    }
    if (!confirm(`Mark ₹${Number(p.netPayout).toLocaleString('en-IN')} to ${p.facilityName} as paid?`)) return;
    try {
      await api.markPayoutPaid(p._id, { transactionRef: `TXN-${crypto.randomUUID()}` });
      toast.success('Payout marked as paid');
      load();
    } catch (err) { toast.error(serverMsg(err, 'Pay failed')); load(); }
  };

  const reset2fa = async (u) => {
    if (!confirm(`Reset 2FA for ${u.name || u.email}? They must re-enrol on next login.`)) return;
    try {
      await api.reset2fa(u.id);
      toast.success('2FA reset — re-enrolment required');
      load();
    } catch (err) { toast.error(serverMsg(err, 'Reset failed')); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const bigTickets = payouts.filter((p) => (p.netPayout || 0) >= 100000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" /> Security Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Live sessions, four-eyes payouts (≥ ₹1,00,000) and 2FA enrolment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-warning" /> Dual-approval queue ({bigTickets.length} need 2 admins)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending payouts.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => {
                const distinct = new Set((p.approvals || []).map((a) => String(a.adminId))).size;
                const needsFourEyes = (p.netPayout || 0) >= 100000;
                return (
                  <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <p className="font-semibold text-sm">{p.facilityName} · <span className="tabular-nums">₹{Number(p.netPayout || 0).toLocaleString('en-IN')}</span></p>
                      <p className="text-xs text-muted-foreground">
                        {needsFourEyes ? `${distinct}/2 approvals` : 'Single approval suffices (< ₹1L)'}
                        {(p.approvals || []).length > 0 && ` · by ${(p.approvals || []).map((a) => a.adminName || 'admin').join(', ')}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => approve(p._id)}>Approve</Button>
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => pay(p)}>Mark Paid</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-primary" /> Active sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unexpired refresh-token sessions.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Admin</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Created</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Expires</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.name || '—'}<span className="block text-xs text-muted-foreground">{s.email}</span></td>
                      <td className="px-4 py-3 text-xs">{s.role}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toLocaleString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.expiresAt ? new Date(s.expiresAt).toLocaleString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="destructive" onClick={() => kill(s.id, s.email)}>Kill session</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Superadmin 2FA enrolment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="font-semibold text-sm">{a.name || a.email}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <Badge variant={a.twoFactorEnabled ? 'default' : 'destructive'} className="text-[11px]">
                    {a.twoFactorEnabled ? '2FA ON' : '2FA OFF'}
                  </Badge>
                  {a.twoFactorEnabled && (
                    <Button size="sm" variant="outline" onClick={() => reset2fa(a)}>Reset 2FA</Button>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="text-sm text-muted-foreground">No superadmin accounts found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
