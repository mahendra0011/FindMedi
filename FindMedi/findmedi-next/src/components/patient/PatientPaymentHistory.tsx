'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee, ChevronRight, FileText, CreditCard, Smartphone, Landmark,
  Wallet, Download, type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadPaymentInvoice } from '@/lib/api';

export interface PaymentItem {
  _id: string;
  invoice_id?: string;
  invoiceId?: string;
  referenceId?: string;
  patient_id?: string;
  patientId?: string;
  amount: number;
  method: string;
  serviceType?: string;
  description?: string;
  provider?: string;
  createdAt: string;
  transaction_id?: string;
}

const methodIcons: Record<string, LucideIcon> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Landmark,
  cash: Wallet,
};

interface PatientPaymentHistoryProps {
  payments: PaymentItem[];
}

export function PatientPaymentHistory({ payments }: PatientPaymentHistoryProps) {
  const router = useRouter();

  return (
    <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <IndianRupee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">Payment History</h3>
            <p className="text-xs text-muted-foreground">
              {payments.length > 0 ? `Last ${Math.min(payments.length, 3)} payments` : 'No payments yet'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl text-primary border-primary/20 hover:bg-primary/5 hover:text-primary"
          onClick={() => router.push('/patient/history')}
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {payments.length > 0 ? (
        <div className="space-y-3">
          {payments.slice(0, 3).map((txn, idx) => {
            const MethodIcon = methodIcons[txn.method] || FileText;
            const typeIcon = txn.serviceType === 'appointment' ? '🩺' : txn.serviceType === 'test' ? '🧪' : '💊';
            return (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">{typeIcon}</span>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {txn.description || `${txn.serviceType} payment`}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {txn.provider} · {new Date(txn.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50">
                      <MethodIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground capitalize font-medium">{txn.method}</span>
                    </div>
                    {txn.transaction_id && (
                      <span className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[100px]">
                        {txn.transaction_id}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-emerald-600">₹{txn.amount?.toLocaleString('en-IN')}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-[11px] gap-1.5 text-primary hover:bg-primary/10 rounded-xl mt-1"
                    onClick={() => downloadPaymentInvoice(txn._id, `${txn.invoice_id || 'invoice'}.pdf`).catch(() => {})}
                  >
                    <Download className="w-3 h-3" /> Invoice
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <IndianRupee className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No payments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Your payment history will appear here</p>
        </div>
      )}
    </div>
  );
}
