import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck, Check, Clock, Calendar, Truck, ArrowRight,
  Sparkles, RefreshCw, AlertCircle, FileCheck2, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface EquipmentRentalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: {
    id?: string;
    name: string;
    monthlyRent: number;
    deposit: number;
    sanitised?: boolean;
    rxRequired?: boolean;
    image?: string;
  };
  onSuccess?: (rentalOrder: any) => void;
}

export default function EquipmentRentalModal({
  open,
  onOpenChange,
  equipment = {
    name: 'Hospital Bed (5-Function Motorized with Mattress)',
    monthlyRent: 3500,
    deposit: 5000,
    sanitised: true,
    rxRequired: false,
  },
  onSuccess,
}: EquipmentRentalModalProps) {
  const [tenure, setTenure] = useState<'15_days' | '1_month' | '3_months'>('1_month');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [confirmedCondition, setConfirmedCondition] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const tenureMultiplier = tenure === '15_days' ? 0.6 : tenure === '3_months' ? 2.7 : 1;
  const rentalAmount = Math.round(equipment.monthlyRent * tenureMultiplier);
  const depositAmount = equipment.deposit;
  const deliveryInstallationFee = 499;
  const totalPayableNow = rentalAmount + depositAmount + deliveryInstallationFee;

  const handleConfirm = () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter the delivery address for equipment installation.');
      return;
    }
    if (!confirmedCondition) {
      toast.error('Please acknowledge the equipment condition and return inspection policy.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(2);
      onSuccess?.({
        equipmentName: equipment.name,
        tenure,
        rentalAmount,
        depositAmount,
        deliveryAddress,
      });
      toast.success('Medical equipment rental booked! Delivery & installation scheduled.');
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Flow G: Medical Equipment Rental
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            {step === 2 ? 'Rental Order Scheduled' : `Rent ${equipment.name}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 2
              ? 'Our biomedical technician will deliver, test, and install the equipment at your doorstep.'
              : 'Medical-grade sanitised equipment with refundable deposit and doorstep technician setup.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Sanitisation & Clinical Grade Badges */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                <FileCheck2 className="w-3.5 h-3.5" /> 100% Autoclaved & Sanitised
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
                <Truck className="w-3.5 h-3.5" /> Free Technician Installation
              </span>
            </div>

            {/* Tenure Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Rental Duration</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { key: '15_days', label: '15 Days', rent: Math.round(equipment.monthlyRent * 0.6) },
                  { key: '1_month', label: '1 Month', rent: equipment.monthlyRent, popular: true },
                  { key: '3_months', label: '3 Months (Save 10%)', rent: Math.round(equipment.monthlyRent * 2.7) },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTenure(t.key as any)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      tenure === t.key
                        ? 'border-primary bg-primary/5 font-bold shadow-xs'
                        : 'border-border/50 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold text-foreground">{t.label}</span>
                    <strong className="text-primary text-sm mt-1 block">₹{t.rent}</strong>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Delivery & Installation Address <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Full address with flat/house number and floor details"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Price Breakup Card */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Equipment Rental ({tenure.replace('_', ' ')})</span>
                <span>₹{rentalAmount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Refundable Security Deposit <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <span className="font-semibold text-foreground">₹{depositAmount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Doorstep Delivery, Demo & Setup</span>
                <span>₹{deliveryInstallationFee}</span>
              </div>
              <div className="border-t border-border/40 pt-2 flex justify-between font-black text-sm text-foreground">
                <span>Total Payable Now</span>
                <span className="text-primary text-base">₹{totalPayableNow}</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * The ₹{depositAmount} security deposit is 100% refunded to your source payment account within 48 hours of return inspection.
              </p>
            </div>

            {/* Condition & Return Policy Checkbox */}
            <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedCondition}
                onChange={(e) => setConfirmedCondition(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground leading-relaxed">
                I agree to the equipment usage guidelines, condition checklist signed at delivery, and 24-hour return inspection policy.
              </span>
            </label>

            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full rounded-2xl h-11 font-bold text-xs"
            >
              {submitting ? 'Confirming Order...' : `Proceed to Pay ₹${totalPayableNow}`}
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold">Rental Booking #RN-{Math.floor(100000 + Math.random() * 900000)} Active</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Delivery scheduled within 24 hours. A verified technician will call before dispatch to coordinate staircase/lift clearance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit Held:</span>
                <strong className="text-emerald-600">₹{depositAmount} (Refundable)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return Scheduled:</span>
                <strong className="text-foreground">{tenure === '15_days' ? '15 Days from delivery' : '30 Days from delivery'}</strong>
              </div>
            </div>

            <Button onClick={() => onOpenChange(false)} className="rounded-2xl text-xs h-10 px-6 font-bold">
              Done / View My Rentals
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
