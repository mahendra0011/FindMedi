'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface RefundRecord {
  _id?: string;
  patientName?: string;
  patient?: string;
  reason?: string;
  description?: string;
  refund_amount?: number;
  amount?: number;
  status: string;
}

interface RefundsSectionProps {
  refunds: RefundRecord[];
}

export default function RefundsSection({ refunds }: RefundsSectionProps) {
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter((r) => r.status === 'Pending' || r.status === 'pending').length;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingRefunds} Pending</span>
        </div>
      </div>
      {refunds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No refunds found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((r, idx) => (
            <div key={r._id || idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{r.patientName || r.patient || '—'}</p>
                  <p className="text-xs text-muted-foreground">{r.reason || r.description || 'Refund'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-destructive">
                  ₹{(r.refund_amount || r.amount || 0).toLocaleString()}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'Refunded' || r.status === 'refunded'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
