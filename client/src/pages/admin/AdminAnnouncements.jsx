import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Megaphone, Clock, User, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const priorityStyles = {
  urgent: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10',
  normal: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10',
  low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10',
};

const priorityIcons = { urgent: AlertCircle, high: AlertTriangle, normal: Info, low: Info };

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetRoles, setTargetRoles] = useState(['all']);

  const load = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = (role) => {
    setTargetRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev.filter(r => r !== 'all'), role]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required');
    setSending(true);
    try {
      await api.createAnnouncement({ title, message, priority, targetRoles });
      toast.success('Announcement sent successfully');
      setTitle(''); setMessage(''); setPriority('normal'); setTargetRoles(['all']);
      await load();
    } catch (e) { toast.error(e.message || 'Failed to send'); }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Staff Announcements</h1>
        <p className="text-muted-foreground">Send broadcast messages to doctors, nurses, and hospital staff</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" /> New Announcement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Staff Meeting Tomorrow" /></div>
          <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your announcement here..." /></div>
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex gap-1.5">
                {['low', 'normal', 'high', 'urgent'].map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${priority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Send To</Label>
              <div className="flex gap-1.5 flex-wrap">
                {['all', 'doctor', 'nurse', 'admin'].map(role => (
                  <button key={role} onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${targetRoles.includes(role) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {role === 'all' ? 'Everyone' : role + 's'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleSend} disabled={sending} className="gap-2 w-full">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Announcement'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Announcement History</h2>
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
            <Megaphone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No announcements sent yet</p>
          </div>
        ) : (
          announcements.map((a, i) => {
            const PrioIcon = priorityIcons[a.priority] || Info;
            return (
              <motion.div key={a._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${priorityStyles[a.priority] || 'bg-muted'}`}>
                    <PrioIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${priorityStyles[a.priority]}`}>{a.priority}</Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1.5">{a.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.createdBy?.name || 'Admin'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.createdAt).toLocaleDateString()}</span>
                      <span>To: {(a.targetRoles || ['all']).join(', ')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
