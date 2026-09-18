'use client';

import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';

export interface RefundItem {
  _id: string;
  description?: string;
  reason?: string;
  serviceType?: string;
  date?: string;
  refund_amount?: number;
  amount?: number;
  status: string;
}

interface PatientRefundsSectionProps {
  refunds: RefundItem[];
  totalRefunded: number;
  pendingRefunds: number;
}

export function PatientRefundsSection({
  refunds,
  totalRefunded,
  pendingRefunds,
}: PatientRefundsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl border border-border/60 p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Refunds</h3>
            <p className="text-xs text-muted-foreground">
              {refunds.length > 0 ? `₹${totalRefunded.toLocaleString()} refunded` : 'No refunds'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()}</span>
          {pendingRefunds > 0 && <span className="text-warning font-medium">{pendingRefunds} pending</span>}
        </div>
      </div>
      {refunds.length > 0 ? (
        <div className="space-y-2.5">
          {refunds.slice(0, 3).map(rf => (
            <div key={rf._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {rf.description || rf.reason || `${rf.serviceType || 'Refund'} payment`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rf.date ? new Date(rf.date).toLocaleDateString('en-IN') : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-destructive">
                  ₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    rf.status === 'Refunded' || rf.status === 'refunded'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {rf.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No refunds yet</p>
        </div>
      )}
    </motion.div>
  );
}
