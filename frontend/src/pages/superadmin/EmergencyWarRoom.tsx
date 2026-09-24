import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Siren, Clock, Megaphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const ACTIVE = ['Pending', 'Assigned', 'Under Treatment'];
const SLA_TARGET_MIN = 60;

function ageMin(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

export default function EmergencyWarRoom() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('All');
  const [now, setNow] = useState(Date.now());
  const [blastTitle, setBlastTitle] = useState('');
  const [blastMsg, setBlastMsg] = useState('');
  const [blasting, setBlasting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getEmergencies({});
      setEmergencies(Array.isArray(data) ? data : data?.emergencies || []);
    } catch { if (!silent) toast.error('Failed to load emergency queue'); }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live SLA clocks tick every 30s; silent list refresh every 60s.
  useEffect(() => {
    const t1 = setInterval(() => setNow(Date.now()), 30000);
    const t2 = setInterval(() => load(true), 60000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  // Socket: new SOS pushes refresh the board instantly.
  useEffect(() => {
    let socket;
    (async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        socket = getSocket();
        if (!socket) return;
        const bump = () => load(true);
        socket.on('emergency_alert_critical', bump);
        socket.on('emergency_created', bump);
      } catch { /* manual refresh remains */ }
    })();
    return () => {
      socket?.off('emergency_alert_critical');
      socket?.off('emergency_created');
    };
  }, [load]);

  const active = emergencies.filter((e) => ACTIVE.includes(e.status));
  const critical = active.filter((e) => e.severity === 'Critical');
  const breached = active.filter((e) => ageMin(e.createdAt) >= SLA_TARGET_MIN && e.status === 'Pending');
  const filtered = severity === 'All' ? active : active.filter((e) => e.severity === severity);

  const sendBlast = async () => {
    if (!blastTitle.trim() || !blastMsg.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setBlasting(true);
    try {
      const res = await api.createBroadcast({
        title: blastTitle.trim(),
        message: blastMsg.trim(),
        priority: 'urgent',
        targetRoles: ['all'],
      });
      toast.success(`Disaster blast sent to ${res.recipientCount ?? 'all'} recipients`);
      setBlastTitle('');
      setBlastMsg('');
    } catch (err) {
      toast.error(err.message || 'Broadcast failed');
    } finally {
      setBlasting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Siren className="w-6 h-6 text-destructive" /> Emergency War Room
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live SOS queue · {SLA_TARGET_MIN}-min dispatch SLA · auto-refresh 60s</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active SOS', value: active.length, color: 'text-destructive' },
          { label: 'Critical', value: critical.length, color: 'text-destructive' },
          { label: 'SLA breached (Pending)', value: breached.length, color: breached.length ? 'text-destructive' : 'text-success' },
          { label: 'Total tracked', value: emergencies.length, color: '' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted-foreground">Severity:</span>
        {['All', 'Critical', 'Serious', 'Stable'].map((s) => (
          <Button key={s} size="sm" variant={severity === s ? 'default' : 'outline'} onClick={() => setSeverity(s)}>{s}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No active emergencies{severity !== 'All' ? ` with severity ${severity}` : ''}. Board is clear.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" key={now}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Patient</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Condition</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Severity</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">SLA clock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const mins = ageMin(e.createdAt);
                const bad = e.status === 'Pending' && mins >= SLA_TARGET_MIN;
                return (
                  <tr key={e._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{e.patientName || 'Unknown'}{e.phone ? <span className="block text-xs text-muted-foreground">{e.phone}</span> : null}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{e.condition}</td>
                    <td className="px-4 py-3"><Badge variant={e.severity === 'Critical' ? 'destructive' : 'outline'}>{e.severity}</Badge></td>
                    <td className="px-4 py-3 text-xs">{e.status}{e.assignedDoctorName ? ` · ${e.assignedDoctorName}` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${bad ? 'text-destructive' : 'text-foreground'}`}>
                        <Clock className="w-3.5 h-3.5" />{mins}m{bad ? ' · BREACH' : ''}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-primary" /> Disaster override blast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Urgent-priority push to all roles (overrides quiet hours). Every blast is audit-logged.</p>
          <Input value={blastTitle} onChange={(e) => setBlastTitle(e.target.value)} placeholder="Blast title, e.g. Mass casualty — City Hospital needs O- blood" />
          <Input value={blastMsg} onChange={(e) => setBlastMsg(e.target.value)} placeholder="Message for all off-duty medical personnel" />
          <div className="flex justify-end">
            <Button onClick={sendBlast} disabled={blasting} className="bg-destructive hover:bg-destructive/90">
              {blasting ? 'Sending...' : 'Send urgent blast'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
