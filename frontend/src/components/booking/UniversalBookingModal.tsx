import React, { useState } from 'react';
import {
  BookingFlowType,
  getFlowForCategory,
  getFlowActionLabel,
  RequestQuoteModal,
  EquipmentRentalModal,
  EventRegistrationModal,
  MembershipEnrollModal,
} from './index';
import BookingModal from '@/components/BookingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Phone, MapPin, Clock, ShieldCheck, AlertCircle,
  FileText, ExternalLink, QrCode, Sparkles, HeartPulse, CheckCircle2
} from 'lucide-react';
import { isSensitiveCategory } from '@/lib/discreet';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface UniversalBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional override for flow type
  flowType?: BookingFlowType;
  // Category / Subtype for flow derivation
  category?: string;
  facilityType?: string;
  facility?: any;
  doctor?: any;
  service?: any;
  initialContext?: any;
  onSuccess?: (result: any) => void;
}

/**
 * Universal Booking & Order Flow Dispatcher (File 05 Spec)
 *
 * Dynamically launches one of the 8 canonical flows:
 * - Flow A: Slot Booking (`BookingModal`)
 * - Flow B: Request & Quote (`RequestQuoteModal`)
 * - Flow C: Order Goods (`OrderGoodsModal` or Pharmacy routing)
 * - Flow D: Recurring / Membership (`MembershipEnrollModal`)
 * - Flow E: Event Registration (`EventRegistrationModal`)
 * - Flow F: Emergency / Instant (Direct Emergency Assist)
 * - Flow G: Rental (`EquipmentRentalModal`)
 * - Flow H: Info Only (Govt facility OPD tokens, helplines, schemes)
 */
export default function UniversalBookingModal({
  open,
  onOpenChange,
  flowType,
  category,
  facilityType,
  facility,
  doctor,
  service,
  initialContext,
  onSuccess,
}: UniversalBookingModalProps) {
  const navigate = useNavigate();

  // Resolve the flow: override > service category > facilityType > facility subtype/category
  const resolvedCategory =
    category ||
    service?.category ||
    facilityType ||
    facility?.subType ||
    facility?.category ||
    doctor?.specialization ||
    '';

  const flow: BookingFlowType = flowType || getFlowForCategory(resolvedCategory);
  const sensitive = isSensitiveCategory(resolvedCategory) || isSensitiveCategory(facility?.name) || isSensitiveCategory(doctor?.specialization);

  // State for Info dialog token generation
  const [opdTokenGenerated, setOpdTokenGenerated] = useState(false);
  const [tokenNumber, setTokenNumber] = useState<string | null>(null);

  const handleGenerateOpdToken = () => {
    const randomToken = `OPD-${Math.floor(100 + Math.random() * 900)}`;
    setTokenNumber(randomToken);
    setOpdTokenGenerated(true);
    toast.success(`Government OPD queue token generated: ${randomToken}`);
    onSuccess?.({ type: 'opd_token', token: randomToken });
  };

  // ── Flow B: Request & Quote ──
  if (flow === 'quote') {
    return (
      <RequestQuoteModal
        open={open}
        onOpenChange={onOpenChange}
        serviceName={service?.name || facility?.name || 'Custom Care Plan'}
        providerName={facility?.name || doctor?.name || 'Verified Provider'}
        category={resolvedCategory}
        onSuccess={onSuccess}
      />
    );
  }

  // ── Flow G: Equipment Rental ──
  if (flow === 'rental') {
    return (
      <EquipmentRentalModal
        open={open}
        onOpenChange={onOpenChange}
        equipment={{
          name: service?.name || facility?.name || 'Medical Equipment Rental',
          monthlyRent: service?.price || 3500,
          deposit: 5000,
          sanitised: true,
          rxRequired: false,
        }}
        onSuccess={onSuccess}
      />
    );
  }

  // ── Flow D: Membership / Recurring ──
  if (flow === 'membership') {
    const programType = resolvedCategory.includes('yoga')
      ? 'yoga'
      : resolvedCategory.includes('dialysis')
      ? 'dialysis'
      : resolvedCategory.includes('meal')
      ? 'meal'
      : resolvedCategory.includes('chronic')
      ? 'chronic_care'
      : 'gym';

    return (
      <MembershipEnrollModal
        open={open}
        onOpenChange={onOpenChange}
        program={{
          title: service?.name || facility?.name || 'Healthcare & Wellness Membership',
          providerName: facility?.name || 'Partner Facility',
          type: programType,
        }}
        onSuccess={onSuccess}
      />
    );
  }

  // ── Flow E: Event Registration ──
  if (flow === 'event') {
    return (
      <EventRegistrationModal
        open={open}
        onOpenChange={onOpenChange}
        event={{
          title: service?.name || facility?.name || 'Health Screening & Wellness Drive',
          organizer: facility?.name || 'Medical Outreach Cell',
          date: service?.date || 'Upcoming Weekend',
          time: service?.time || '09:00 AM – 01:00 PM',
          venue: facility?.address || 'Community Healthcare Centre',
          fee: service?.price || 0,
          eligibility: 'Open to registered participants',
          category: resolvedCategory,
        }}
        onSuccess={onSuccess}
      />
    );
  }

  // ── Flow H: Info Only (Govt PHC/CHC/UPHC, Arogya Mandir, Helplines) ──
  if (flow === 'info') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Public Health Facility · Info & Walk-In
              </Badge>
              {sensitive && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-[10px] font-bold">
                  🔒 Discreet
                </Badge>
              )}
            </div>
            <DialogTitle className="font-heading text-xl font-bold">
              {facility?.name || 'Government Health Centre'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Government public health institutions (PHCs, CHCs, Ayushman Arogya Mandirs) provide free or nominal consultation under state health programs. No advance platform booking fee is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="bg-muted/40 p-3.5 rounded-2xl border space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span>General OPD Timings</span>
              </div>
              <p className="text-muted-foreground pl-6">
                Monday to Saturday: 08:30 AM – 01:30 PM (Morning OPD)
                <br />
                Emergency & Maternity Care: Available 24x7
              </p>
            </div>

            <div className="bg-muted/40 p-3.5 rounded-2xl border space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Facility Address & Directions</span>
              </div>
              <p className="text-muted-foreground pl-6">
                {facility?.address || 'Public Health Centre Complex, District Health Office'}
                {facility?.city ? `, ${facility.city}` : ''}
              </p>
            </div>

            {/* Virtual OPD Token Feature */}
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Digital Walk-In OPD Queue Token</span>
                </div>
                <Badge className="bg-primary text-primary-foreground text-[10px]">Free</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Skip the physical counter line by generating a digital token number for today's OPD session.
              </p>

              {opdTokenGenerated ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Your OPD Token</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono tracking-wider">{tokenNumber}</div>
                  <p className="text-[11px] text-muted-foreground">Present this token at Counter #1 upon arrival</p>
                </div>
              ) : (
                <Button className="w-full h-9 font-semibold text-xs" onClick={handleGenerateOpdToken}>
                  Generate Today's OPD Token
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-xs"
              onClick={() => {
                const query = encodeURIComponent(`${facility?.name || 'Govt Hospital'} ${facility?.city || ''}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Get Directions
            </Button>
            <Button className="w-full sm:w-auto text-xs" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Flow C: Order Goods (Pharmacy, Medicines, Meals) ──
  if (flow === 'order') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Flow C: Prescription & Health Order
            </div>
            <DialogTitle className="font-heading text-xl font-bold">
              Order from {facility?.name || 'Verified Pharmacy'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Order verified medicines, generic alternatives, health supplements, or diet kitchen meals. Schedule H/H1 drugs require a valid prescription upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-2xl border space-y-1">
              <span className="font-bold text-foreground block">Express Delivery Service</span>
              <p className="text-muted-foreground text-[11px]">
                60-90 minute delivery available within 5 km. Temperature-controlled cold chain for insulins & biologics.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-2xl border space-y-1">
              <span className="font-bold text-foreground block">Schedule H/H1 Compliance</span>
              <p className="text-muted-foreground text-[11px]">
                Doctor's registration number and date will be verified by a registered pharmacist before dispatch.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-xs"
              onClick={() => {
                onOpenChange(false);
                navigate('/medicines');
              }}
            >
              Browse Catalogue
            </Button>
            <Button
              className="w-full sm:w-auto text-xs font-semibold"
              onClick={() => {
                onOpenChange(false);
                navigate('/prescriptions?upload=1');
              }}
            >
              Upload Prescription (Rx)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Flow F: Emergency / Instant ──
  if (flow === 'emergency') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-rose-500/30">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
              <HeartPulse className="w-4 h-4 animate-pulse" /> Flow F: Emergency Dispatch
            </div>
            <DialogTitle className="font-heading text-xl font-bold text-rose-600">
              Immediate Emergency Assistance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Emergency requests require NO upfront payment gate. Live location dispatch and hospital pre-alerts are initiated immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-900 dark:text-rose-200">
              <span className="font-bold block mb-1">National Helpline Direct Fallback</span>
              <p className="text-[11px]">
                In life-threatening situations, also dial 112 (National Emergency) or 108 (Ambulance Service) immediately.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-xs"
              onClick={() => {
                window.location.href = 'tel:112';
              }}
            >
              <Phone className="w-3.5 h-3.5 mr-1 text-rose-600" /> Dial 112 Now
            </Button>
            <Button
              className="w-full sm:w-auto text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() => {
                onOpenChange(false);
                navigate('/emergency');
              }}
            >
              Open Live Emergency SOS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Flow A: Slot Booking (Default) ──
  return (
    <BookingModal
      open={open}
      onOpenChange={onOpenChange}
      doctor={doctor}
      facility={facility}
      initialContext={initialContext}
      onSuccess={onSuccess}
    />
  );
}
