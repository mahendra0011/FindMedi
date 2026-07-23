import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function PatientSupport() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return toast.error('Please fill all fields');
    
    setLoading(true);
    try {
      await api.createSupportTicket({ subject, message });
      toast.success('Support ticket created successfully');
      setSubject('');
      setMessage('');
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
