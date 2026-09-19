import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Banknote, CheckCircle2, ShieldCheck, Loader2, IndianRupee, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DemoPaymentSheetProps {
  rideId: string;
  amount: number;
  onPaymentComplete: (payment: any) => void;
}

export default function DemoPaymentSheet({
  rideId,
  amount,
  onPaymentComplete,
}: DemoPaymentSheetProps) {
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ transactionRef: string; method: string } | null>(null);

  const handlePay = async (method: 'demo_wallet' | 'cash') => {
    setLoadingMethod(method);
    try {
      const res = await api.payDemoRide({ rideId, method });
      setSuccessData({
        transactionRef: res.transactionRef || `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        method,
      });
      toast.success(res.message || 'Payment completed successfully (Demo Mode)');
      setTimeout(() => {
        onPaymentComplete(res.payment || { status: 'paid', method });
      }, 1600);
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed');
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-foreground">Ride Completed</h3>
          <p className="text-xs text-muted-foreground">Select payment method to settle fare</p>
        </div>
        <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 shadow-sm">
          Demo Mode
        </Badge>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
        <p className="text-xs text-muted-foreground font-medium">Total Fare Amount</p>
        <div className="flex items-center justify-center gap-0.5 text-3xl font-extrabold text-foreground mt-1">
          <span>₹</span>
          <span>{amount}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {successData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center space-y-2"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-foreground text-sm">Payment Successful!</h4>
            <p className="text-xs text-muted-foreground font-mono">
              Ref: {successData.transactionRef}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Receipt verified. Redirecting to rating...
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {/* Wallet Option */}
            <Button
              type="button"
              onClick={() => handlePay('demo_wallet')}
              disabled={!!loadingMethod}
              className="w-full h-13 justify-start gap-3.5 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary font-semibold"
            >
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                {loadingMethod === 'demo_wallet' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-bold leading-tight">Pay with Demo Wallet</p>
                <p className="text-[10px] opacity-80">Simulated instant digital wallet deduction</p>
              </div>
            </Button>

            {/* Cash Option */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePay('cash')}
              disabled={!!loadingMethod}
              className="w-full h-13 justify-start gap-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
                {loadingMethod === 'cash' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Banknote className="w-4 h-4 text-foreground" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-bold leading-tight text-foreground">Cash (Mark as Paid)</p>
                <p className="text-[10px] text-muted-foreground">Handover physical cash directly to driver</p>
              </div>
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Simulated payment test environment — No real money transferred</span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
