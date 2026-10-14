import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, ShieldCheck, Clock, Calendar, ArrowRight, RotateCcw,
  FileCheck2, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientRentals() {
  const [rentals, setRentals] = useState([
    {
      id: 'rnt-1',
      equipment: 'Motorized ICU Hospital Bed (5-Function with Waterproof Mattress)',
      vendor: 'MedEquip Rentals & Healthcare Logistics',
      status: 'Active',
      startDate: '10 Oct 2026',
      returnDueDate: '10 Nov 2026',
      daysRemaining: 18,
      monthlyRent: 3500,
      depositHeld: 5000,
      depositStatus: 'Held in Escrow (100% Refundable)',
      serialNo: 'BED-5F-2024-89',
      sanitisedCertificate: 'CERT-AUTOCLAVE-9921',
    },
    {
      id: 'rnt-2',
      equipment: 'Philips Respironics 10L High-Flow Oxygen Concentrator',
      vendor: 'O2Care Life Systems',
      status: 'Active',
      startDate: '15 Oct 2026',
      returnDueDate: '30 Oct 2026',
      daysRemaining: 7,
      monthlyRent: 4000,
      depositHeld: 8000,
      depositStatus: 'Held in Escrow (100% Refundable)',
      serialNo: 'O2C-10L-8761',
      sanitisedCertificate: 'CERT-O2-8812',
    },
  ]);

  const handleScheduleReturn = (id: string) => {
    toast.success('Pickup request submitted! A technician will inspect and collect the equipment tomorrow.');
  };

  const handleExtend = (id: string) => {
    toast.info('Extension window opened. Select extension tenure in checkout.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Equipment Rentals & Returns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track active medical equipment rentals, security deposits held in escrow, and schedule return pickups.
          </p>
        </div>

        <Link to="/buy-medicine">
          <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Rent New Equipment
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {rentals.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-bold">
                    Active Rental
                  </Badge>
                  <span className="text-xs text-muted-foreground">S/N: {item.serialNo}</span>
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">{item.equipment}</h2>
                <p className="text-xs text-muted-foreground">{item.vendor}</p>
              </div>

              <div className="text-right sm:shrink-0">
                <span className="text-xs text-muted-foreground block">Return Due</span>
                <span className="text-sm font-extrabold text-foreground">{item.returnDueDate}</span>
                <span className="text-[11px] text-amber-600 font-semibold block">{item.daysRemaining} days left</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Monthly Rent</span>
                <strong className="text-foreground text-sm">₹{item.monthlyRent}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Security Deposit Held</span>
                <strong className="text-emerald-600 text-sm">₹{item.depositHeld}</strong>
                <span className="text-[10px] text-muted-foreground block">{item.depositStatus}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Sanitisation & QA</span>
                <strong className="text-foreground text-sm flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Certified
                </strong>
                <span className="text-[10px] text-muted-foreground block">{item.sanitisedCertificate}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Deposit auto-refunded to UPI within 48h of return inspection
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExtend(item.id)}
                  className="rounded-xl text-xs h-8"
                >
                  Extend Tenure
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleScheduleReturn(item.id)}
                  className="rounded-xl text-xs h-8 font-semibold gap-1"
                >
                  <Truck className="w-3.5 h-3.5" /> Schedule Return Pickup
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
