import { Calendar, Clock, Phone, ShieldCheck, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FacilityRightRailProps {
  facility: {
    name: string;
    phone?: string;
    emergencyPhone?: string;
    openNow?: boolean;
    openLabel?: string;
    timingsToday?: string;
    consultFee?: number;
    priceFrom?: number;
    insurance?: string[];
  };
  primaryLabel?: string;
  onPrimary?: () => void;
}

export default function FacilityRightRail({
  facility,
  primaryLabel = 'Book Appointment',
  onPrimary,
}: FacilityRightRailProps) {
  const handleCall = () => {
    const num = facility.emergencyPhone || facility.phone;
    if (num) {
      window.location.href = `tel:${num}`;
    }
  };

  return (
    <div className="space-y-4 sticky top-20">
      {/* Quick Booking Card */}
      <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-md border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">Instant Digital Booking</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-foreground">
              {facility.consultFee ? `₹${facility.consultFee}` : facility.priceFrom ? `From ₹${facility.priceFrom}` : 'Verified Tariffs'}
            </span>
            <span className="text-xs text-muted-foreground">GST Included</span>
          </div>
        </div>

        <div className="space-y-2 text-xs border-y py-3 text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Next Available Slot</span>
            <span className="font-semibold text-emerald-600">Today, Available</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Consultation Modes</span>
            <span className="font-semibold text-foreground">In-Clinic · Video</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Instant Confirmation</span>
            <span className="font-semibold text-foreground">SMS & WhatsApp</span>
          </div>
        </div>

        <Button className="w-full h-11 text-sm font-bold shadow-md shadow-primary/20" onClick={onPrimary}>
          {primaryLabel}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          100% Free Cancellation up to 2 hours before appointment
        </p>
      </div>

      {/* Helpline & Quick Contact */}
      <div className="bg-card border rounded-2xl p-4 space-y-3 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Need Urgent Assistance?</h4>
        <Button variant="outline" className="w-full text-xs h-9 gap-1.5" onClick={handleCall}>
          <Phone className="w-3.5 h-3.5 text-primary" /> Direct Reception Call
        </Button>
        {facility.emergencyPhone && (
          <p className="text-[11px] text-center text-rose-600 font-semibold">
            Emergency ER: {facility.emergencyPhone}
          </p>
        )}
      </div>

      {/* Empanelled Cashless Schemes */}
      <div className="bg-card border rounded-2xl p-4 space-y-2 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Cashless Insurance Supported</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          PM-JAY, Star Health, HDFC ERGO, Care Health, and all major corporate TPAs accepted at reception.
        </p>
      </div>
    </div>
  );
}
