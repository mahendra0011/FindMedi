import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Send, MessageSquare, AlertCircle, TicketCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const ticketStatusColors = { Open: 'bg-warning/10 text-warning', 'In Progress': 'bg-info/10 text-info', Resolved: 'bg-success/10 text-success', Closed: 'bg-muted text-muted-foreground' };
const ticketStatusIcons = { Open: AlertCircle, 'In Progress': Clock, Resolved: CheckCircle2, Closed: TicketCheck };

export default function PatientSupport() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const data = await api.getMyTickets();
      setTickets(data.tickets || []);
    } catch { /* ignore */ }
    setTicketsLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return toast.error('Please fill all fields');
    
    setLoading(true);
    try {
      await api.createSupportTicket({ subject, message });
      toast.success('Support ticket created successfully');
      setSubject('');
      setMessage('');
      loadTickets();
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border/50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Submit a Request
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="E.g., Issue with booking" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea 
                className="w-full flex min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                placeholder="Describe your issue in detail..."
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </form>

          {/* My Tickets */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TicketCheck className="w-4 h-4 text-primary" /> My Tickets
            </h3>
            {ticketsLoading ? (
              <div className="text-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No support tickets yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tickets.map(t => {
                  const StatusIcon = ticketStatusIcons[t.status] || AlertCircle;
                  return (
                    <div key={t._id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.subject}</p>
                          <p className="text-xs text-muted-foreground">{t.ticketId} · {new Date(t.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${ticketStatusColors[t.status]}`}>
                          <StatusIcon className="w-2.5 h-2.5" /> {t.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Need Immediate Help?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our support team is available 24/7 to assist you with any platform-related issues.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Email: support@medicore.com</p>
              <p className="text-sm font-medium">Phone: 1800-123-4567</p>
            </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Medical Emergencies
            </h3>
            <p className="text-sm text-muted-foreground">
              For medical emergencies, please do not use this support form. Contact the nearest emergency service or use our Emergency Services feature immediately.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
