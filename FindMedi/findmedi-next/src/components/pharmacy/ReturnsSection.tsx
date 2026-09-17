'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

export interface ReturnItem {
  _id: string;
  returnId?: string;
  patientName?: string;
  customer?: string;
  total?: number;
  refundAmount?: number;
  status: string;
}

interface ReturnsSectionProps {
  refunds: ReturnItem[];
}

export default function ReturnsSection({ refunds }: ReturnsSectionProps) {
  const totalRefunded = refunds.reduce((s, r) => s + (r.total || r.refundAmount || 0), 0);
  const pendingRefunds = refunds.filter((r) => r.status === 'Pending' || r.status === 'pending').length;

  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-destructive" /> Refunds & Returns
        </h3>
        <Link href="/pharmacy/returns" className="text-xs text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4">
          <p className="text-2xl font-bold text-destructive">₹{totalRefunded.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Refunded</p>
        </div>
        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
          <p className="text-2xl font-bold text-amber-600">{pendingRefunds}</p>
          <p className="text-xs text-muted-foreground">Pending Returns</p>
        </div>
        <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
          <p className="text-2xl font-bold text-blue-600">{refunds.length}</p>
          <p className="text-xs text-muted-foreground">Total Returns</p>
        </div>
      </div>
      {refunds.length > 0 ? (
        <div className="space-y-3">
          {refunds.map((r, i) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-card-foreground truncate">{r.returnId || r._id}</p>
                <p className="text-xs text-muted-foreground">Patient: {r.patientName || r.customer || '—'}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-bold text-destructive">
                  ₹{(r.total || r.refundAmount || 0).toLocaleString()}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'Refunded'
                      ? 'bg-destructive/10 text-destructive'
                      : r.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No returns or refunds</p>
        </div>
      )}
    </div>
  );
}
