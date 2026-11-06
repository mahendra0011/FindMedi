import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Headset, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

function SupportTicketsTab() {
  const [tickets, setTickets] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<Unmodelled>(null);
  const [selected, setSelected] = useState<Unmodelled>(null);
  const [reply, setReply] = useState('');
  const { user } = useAuth();
  const [assistCode, setAssistCode] = useState('');
  const [assistReason, setAssistReason] = useState('');
  const [assistFields, setAssistFields] = useState<string[]>(['phone']);
  const [revealedContact, setRevealedContact] = useState<Unmodelled>(null);
  const isL2 = user?.role === 'support_l2';
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin';

  const verifyAssistCode = async () => {
    if (assistReason.trim().length < 20) return toast.error('Enter a specific reason (at least 20 characters)');
    try {
      await api.verifySupportAssist(selected._id, { code: assistCode, reason: assistReason, fields: assistFields });
      const result = await api.getSupportAssistContact(selected._id);
      setRevealedContact(result.fields);
      toast.success('Patient-authorized contact details loaded; session expires in 15 minutes.');
    } catch (error: Unmodelled) { toast.error(error?.response?.data?.message || 'Could not verify consent'); }
  };

  useEffect(() => {
    let socket: Unmodelled;
    (async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        socket = getSocket();
        const onNew = (t: Unmodelled) => { setTickets((prev) => [t, ...prev]); toast.info(`New Support Ticket #${t.ticketNumber || String(t._id).slice(-6)} received`); };
        const onMsg = (p: Unmodelled) => {
          if (selected?._id === p.ticketId && isL2 && revealedContact) {
            setSelected((prev: Unmodelled) => ({ ...prev, messages: [...(prev.messages || []), p.message] }));
          }
        };
        socket?.on('support_ticket_created', onNew);
        socket?.on('support_message_received', onMsg);
      } catch {}
    })();
    return () => { socket?.off('support_ticket_created'); socket?.off('support_message_received'); };
  }, [selected?._id, isL2, revealedContact]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getSupportTickets({}), user?.role === 'support_l2' ? api.getTicketStats() : Promise.resolve(null)]);
      setTickets(res.tickets || []);
      setStats(s);
    } catch { toast.error('Failed to load support tickets'); }
    setLoading(false);
  }, [user?.role]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.addTicketMessage(selected._id, { message: reply });
      setReply('');
      const detail = await api.getSupportTicket(selected._id);
      setSelected(detail.ticket);
    } catch { toast.error('Failed to send reply'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Open', value: stats.open, color: 'text-warning' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-info' },
            { label: 'Resolved', value: stats.resolved, color: 'text-success' },
            { label: 'Urgent', value: stats.urgent, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? tickets.length : tickets.filter(t => t.status === f).length})</button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-10" />
      </div>
      {tickets.filter(t => filter === 'All' || t.status === filter).filter(t => !search || t.ticketId?.includes(search)).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <Headset className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.filter(t => filter === 'All' || t.status === filter).filter(t => !search || t.ticketId?.includes(search)).map((t, i) => (
            <motion.div key={t._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all cursor-pointer" onClick={async () => { try { const detail = await api.getSupportTicket(t._id); setSelected(detail.ticket); setAssistCode(''); setAssistReason(''); setRevealedContact(null); setReply(''); } catch (error: Unmodelled) { toast.error(error?.response?.data?.message || 'Could not open ticket'); } }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">#{t.ticketId}</span>
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    <Badge className={t.priority === 'Urgent' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}>{t.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">Support request</p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
                <Badge className={t.status === 'Resolved' || t.status === 'Closed' ? 'bg-success/10 text-success' : t.status === 'In Progress' ? 'bg-info/10 text-info' : t.status === 'Waiting on User' ? 'bg-warning/10 text-warning' : 'bg-muted-foreground/10 text-muted-foreground'}>{t.status}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">#{selected.ticketId}</h3>
              <Badge className={selected.status === 'Resolved' || selected.status === 'Closed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{selected.status}</Badge>
            </div>
            {isL2 ? <div className="p-4 bg-muted/20 rounded-xl mb-4">
              <p className="font-medium text-foreground">{selected.subject}</p>
              <p className="text-sm text-muted-foreground mt-2">{selected.description}</p>
              <p className="text-xs text-muted-foreground mt-2">From: {selected.raisedByName} | {selected.category}</p>
            </div> : <div className="p-4 bg-muted/20 rounded-xl mb-4 text-sm">Ticket content is restricted to the assigned L2 operator. This view is for masked status and assignment oversight.</div>}
            {isL2 && <div className="p-4 border rounded-xl mb-4 space-y-3">
              <p className="font-medium text-sm">Patient-consented contact access</p>
              <p className="text-xs text-muted-foreground">Ask the patient for the one-time code shown in their app. Access is limited to this assigned ticket and expires in 15 minutes.</p>
              <Input value={assistCode} onChange={(e) => setAssistCode(e.target.value)} placeholder="6-digit patient code" maxLength={6} inputMode="numeric" />
              <Input value={assistReason} onChange={(e) => setAssistReason(e.target.value)} placeholder="Reason for contact access (20+ characters)" />
              <div className="flex gap-3 text-sm">{['name', 'phone', 'email'].map((field) => <label key={field} className="flex items-center gap-1"><input type="checkbox" checked={assistFields.includes(field)} onChange={(e) => setAssistFields((old) => e.target.checked ? [...old, field] : old.filter((v) => v !== field))} />{field}</label>)}</div>
              <Button variant="outline" onClick={verifyAssistCode} disabled={!assistCode || assistFields.length === 0}>Verify consent & reveal selected fields</Button>
              {revealedContact && <p className="text-sm">{Object.entries(revealedContact).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}
            </div>}
            {isL2 && selected.messages?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Conversation</p>
                <div className="space-y-2">
                  {selected.messages.map((msg: Unmodelled, j: Unmodelled) => (
                    <div key={j} className={`p-3 rounded-xl ${msg.senderName === 'Super Admin' ? 'bg-primary/10 ml-8' : 'bg-muted/20 mr-8'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isL2 && revealedContact && selected.status !== 'Resolved' && selected.status !== 'Closed' && (
              <div className="flex gap-2">
                <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." className="flex-1" />
                <Button onClick={handleReply}>Send</Button>
                <Button variant="outline" size="sm" onClick={async () => { try { await api.updateTicketStatus(selected._id, { status: 'Resolved' }); setSelected(null); load(); } catch { toast.error('Failed to resolve'); } }}>Resolve</Button>
              </div>
            )}
            {isSuperAdmin && <div className="mt-4 space-y-2"><p className="text-xs text-muted-foreground">Assign this ticket to an L2 operator by their user ID.</p><Input id="support-assignee-id" placeholder="L2 operator user ID" /><Button variant="outline" className="w-full" onClick={async () => { const assignedTo = (document.getElementById('support-assignee-id') as HTMLInputElement)?.value; try { await api.assignTicket(selected._id, { assignedTo }); toast.success('Ticket assigned'); setSelected(null); load(); } catch (error: Unmodelled) { toast.error(error?.response?.data?.message || 'Assignment failed'); } }}>Assign</Button><Button variant="outline" className="w-full" onClick={async () => { try { await api.updateTicketStatus(selected._id, { status: selected.status === 'Closed' ? 'Open' : 'Closed' }); toast.success('Ticket status updated'); setSelected(null); load(); } catch (error: Unmodelled) { toast.error(error?.response?.data?.message || 'Could not update ticket status'); } }}>Mark {selected.status === 'Closed' ? 'Open' : 'Closed'}</Button></div>}
            <Button variant="outline" className="w-full mt-3" onClick={() => setSelected(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default SupportTicketsTab;
