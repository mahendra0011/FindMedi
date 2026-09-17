'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  serviceName?: string;
  initialAmount?: number;
}

export default function BillModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName = 'Consultation - General OPD',
  initialAmount = 500,
}: BillModalProps) {
  const [amount, setAmount] = useState(initialAmount);

  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Generate Invoice</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Service</label>
            <Input value={serviceName} disabled />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (₹)</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => onConfirm(amount)}
            disabled={!amount || amount <= 0}
          >
            <Send className="w-4 h-4" /> Generate &amp; Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
