import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, CheckCircle2, ShieldCheck, Calendar, Clock,
  CreditCard, Smartphone, Check, Zap, ArrowRight, QrCode
} from 'lucide-react';
import { toast } from 'sonner';

interface MembershipEnrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: {
    id?: string;
    title: string;
    providerName?: string;
    type?: 'gym' | 'yoga' | 'chronic_care' | 'dialysis' | 'meal';
    plans?: Array<{
      id: string;
      label: string;
      duration: string;
      price: number;
      popular?: boolean;
      savings?: string;
    }>;
    benefits?: string[];
    freezeDaysAllowed?: number;
  };
  onSuccess?: (membership: any) => void;
}

export default function MembershipEnrollModal({
  open,
  onOpenChange,
  program = {
    title: 'CultPass All-Access Fitness & Yoga Membership',
    providerName: 'Cult.Fit Partner Studio',
    type: 'gym',
    plans: [
      { id: '1m', label: '1 Month Kickstart', duration: '30 Days', price: 2499 },
      { id: '3m', label: '3 Months Pro', duration: '90 Days', price: 5999, popular: true, savings: 'Save 20%' },
      { id: '12m', label: '12 Months Annual', duration: '365 Days', price: 17999, savings: 'Save 40%' },
    ],
    benefits: [
      'Unlimited access to all group classes & gym equipment',
      'Dedicated fitness coach & initial functional assessment',
      'Dietary guide & biometric progress tracking on app',
      'Up to 30 days vacation freeze included',
    ],
    freezeDaysAllowed: 30,
  },
  onSuccess,
}: MembershipEnrollModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    program.plans?.find((p) => p.popular)?.id || program.plans?.[0]?.id || '3m'
  );
  const [autoRenew, setAutoRenew] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = program.plans?.find((p) => p.id === selectedPlanId) || program.plans?.[0];
  const price = selectedPlan?.price || 5999;

  const handleEnroll = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(2);
      onSuccess?.({
        programTitle: program.title,
        plan: selectedPlan,
        membershipId: `MEM-${Math.floor(100000 + Math.random() * 900000)}`,
        autoRenew,
      });
      toast.success('Membership activated! QR access card created.');
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Flow D: Membership & Care Programs
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            {step === 2 ? 'Membership Active!' : program.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 2
              ? 'Your active pass is ready. Use the QR code at the facility front desk.'
              : `Enrolling with ${program.providerName || 'Provider'}. Easy freeze and flexible cancellation.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Plans Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Select Membership Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {program.plans?.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative p-3 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/5 shadow-xs font-bold'
                        : 'border-border/50 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                        Popular
                      </span>
                    )}
                    <div>
                      <span className="block text-xs text-foreground font-semibold">{plan.label}</span>
                      <span className="text-[10px] text-muted-foreground">{plan.duration}</span>
                    </div>
                    <div className="mt-2">
                      <strong className="text-primary text-sm block">₹{plan.price}</strong>
                      {plan.savings && <span className="text-[10px] text-emerald-600 font-bold">{plan.savings}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Included Program Benefits */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2 text-xs">
              <span className="font-bold text-foreground block">Included in this Program:</span>
              <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                {program.benefits?.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Auto-renew e-mandate preference */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-border/50 bg-card text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <div className="space-y-0.5 text-[11px]">
                <strong className="text-foreground block">Auto-Renew via UPI / Card Mandate</strong>
                <p className="text-muted-foreground">
                  Renewal notification sent 7 days in advance. You can pause or cancel auto-renewal with one click anytime in your dashboard.
                </p>
              </div>
            </label>

            <Button
              onClick={handleEnroll}
              disabled={submitting}
              className="w-full rounded-2xl h-11 font-bold text-xs"
            >
              {submitting ? 'Activating Pass...' : `Enroll & Pay ₹${price}`}
            </Button>
          </div>
        ) : (
          <div className="py-4 text-center space-y-4">
            <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 max-w-xs mx-auto space-y-3">
              <div className="w-28 h-28 bg-card rounded-2xl border border-border/60 mx-auto flex items-center justify-center p-2 shadow-xs">
                <QrCode className="w-full h-full text-foreground" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pass ID</span>
                <p className="font-mono font-extrabold text-sm text-foreground">MEM-782190</p>
                <p className="text-xs font-bold text-emerald-600">Active Membership</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Pass valid for {selectedPlan?.duration}.</p>
              <p className="text-[11px]">Includes {program.freezeDaysAllowed || 30} days vacation freeze rights.</p>
            </div>

            <Button onClick={() => onOpenChange(false)} className="rounded-2xl text-xs h-10 px-6 font-bold">
              Done / Go to My Programs
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
