'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface SupportTicketFormProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

/** Support ticket form shown inside the patient dashboard support modal. */
export function SupportTicketForm({ onClose, showToast }: SupportTicketFormProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) return showToast('Please fill all fields', 'error');
    setSubmitting(true);
    try {
      await api.createSupportTicket({ subject, message });
      showToast('Support ticket submitted');
      onClose();
    } catch {
      showToast('Failed to submit ticket', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Subject</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief title for your issue" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue in detail..."
          className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={submitting || !subject || !message}>
        {submitting ? 'Submitting...' : 'Submit Ticket'}
      </Button>
    </div>
  );
}
