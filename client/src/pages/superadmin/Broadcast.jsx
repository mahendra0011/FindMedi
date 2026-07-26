import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone, Send, AlertTriangle, History, Users, Stethoscope, Building2,
  FlaskConical, Pill, UserRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'patient', label: 'Patients', icon: UserRound },
  { value: 'doctor', label: 'Doctors', icon: Stethoscope },
  { value: 'admin', label: 'Hospital Admins', icon: Building2 },
  { value: 'clinic_doctor', label: 'Clinics', icon: FlaskConical },
  { value: 'pharmacy', label: 'Pharmacies', icon: Pill },
];

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
];

export default function Broadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [selectedRoles, setSelectedRoles] = useState(['all']);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getBroadcasts({ limit: 50 });
      setBroadcasts(res?.data || res?.broadcasts || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required');
    setSending(true);
    try {
      await api.createBroadcast({ title, message, priority, targetRoles: selectedRoles });
      toast.success('Broadcast sent successfully');
      setTitle('');
      setMessage('');
      setPriority('normal');
      setSelectedRoles(['all']);
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed to send broadcast');
    }
    setSending(false);
  };

  const toggleRole = (role) => {
    if (role === 'all') { setSelectedRoles(['all']); return; }
    const next = selectedRoles.filter(r => r !== 'all');
    if (next.includes(role)) {
      setSelectedRoles(next.filter(r => r !== role));
    } else {
      setSelectedRoles([...next, role]);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Platform Broadcast</h1>
          <p className="text-sm text-muted-foreground mt-1">Send announcements to facilities and users across the platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            New Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <Input placeholder="e.g. Scheduled Maintenance - July 27" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Type your announcement message..."
                value={message} onChange={e => setMessage(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priority === p.value ? p.color + ' ring-2 ring-ring' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Target Roles</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r.value} type="button" onClick={() => toggleRole(r.value)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedRoles.includes(r.value) || (r.value === 'all' && selectedRoles.includes('all')) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      <r.icon className="w-3 h-3" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Recent Broadcasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No broadcasts sent yet</div>
          ) : (
            <div className="space-y-2">
              {broadcasts.map((b, i) => (
                <div key={b._id || i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${b.type === 'system' && b.title?.includes('🔴') ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    <Megaphone className={`w-4 h-4 ${b.type === 'system' && b.title?.includes('🔴') ? 'text-destructive' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{b.title?.replace(/[🔴📢]/g, '').trim() || b.title}</p>
                      {b.title?.includes('🔴') && <Badge className="bg-destructive/10 text-destructive text-[10px]">Urgent</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(b.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
