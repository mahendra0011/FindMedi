import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, Clock, MapPin, Users, QrCode, CheckCircle2,
  Sparkles, Download, Share2, ShieldCheck, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface EventRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: {
    id?: string;
    title: string;
    organizer?: string;
    date?: string;
    time?: string;
    venue?: string;
    fee?: number;
    seatsLeft?: number;
    eligibility?: string;
    category?: string;
  };
  onSuccess?: (ticket: any) => void;
}

export default function EventRegistrationModal({
  open,
  onOpenChange,
  event = {
    title: 'Free Community Diabetes & Hypertension Health Screening Camp',
    organizer: 'Max Super Specialty Hospital Outreach Team',
    date: 'Sunday, 26 October 2026',
    time: '08:30 AM – 01:30 PM',
    venue: 'Community Centre, Block B, Green Park, New Delhi',
    fee: 0,
    seatsLeft: 34,
    eligibility: 'Open to all adults aged 25+. 10-12 hours overnight fasting recommended for accurate lipid/sugar profiling.',
    category: 'Preventive Health Camp',
  },
  onSuccess,
}: EventRegistrationModalProps) {
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [attendeeAge, setAttendeeAge] = useState('');
  const [consentScreening, setConsentScreening] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = () => {
    if (!attendeeName.trim()) {
      toast.error('Please enter the attendee name.');
      return;
    }
    if (!consentScreening) {
      toast.error('Please consent to clinical diagnostic screening and record syncing.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(2);
      onSuccess?.({
        eventTitle: event.title,
        attendeeName,
        attendeePhone,
        ticketId: `TCK-${Math.floor(100000 + Math.random() * 900000)}`,
      });
      toast.success('Event registration confirmed! QR Pass generated.');
    }, 1000);
  };

  const handleDownloadTicket = () => {
    toast.success('E-ticket saved to downloads folder.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Flow E: Health Camp & Event Registration
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            {step === 2 ? 'Registration Confirmed!' : event.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 2
              ? 'Show your QR entry pass at the event registration desk.'
              : `Organized by ${event.organizer}. Free electronic passes with digital report sync.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Event Key Facts Card */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  {event.category || 'Health Event'}
                </Badge>
                {event.seatsLeft != null && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {event.seatsLeft} spots remaining
                  </span>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{event.venue}</span>
                </div>
              </div>

              {event.eligibility && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 mt-2">
                  <strong>Prep & Eligibility: </strong>{event.eligibility}
                </div>
              )}
            </div>

            {/* Attendee Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Attendee Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Full name as on Aadhaar / Gov ID"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Phone Number</label>
                  <Input
                    placeholder="10-digit mobile"
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Age</label>
                  <Input
                    placeholder="E.g. 42"
                    value={attendeeAge}
                    onChange={(e) => setAttendeeAge(e.target.value)}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>
            </div>

            {/* Screening & Health Data Sync Consent */}
            <label className="flex items-start gap-2 text-xs cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={consentScreening}
                onChange={(e) => setConsentScreening(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground leading-relaxed text-[11px]">
                I consent to on-spot diagnostic screenings. Camp lab reports and doctor assessments will be automatically synced to my secure FindMedi Health Locker.
              </span>
            </label>

            <Button
              onClick={handleRegister}
              disabled={submitting}
              className="w-full rounded-2xl h-11 font-bold text-xs"
            >
              {submitting ? 'Registering...' : event.fee ? `Pay ₹${event.fee} & Confirm Pass` : 'Confirm Free Registration Pass'}
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
                <p className="font-mono font-extrabold text-sm text-foreground">TCK-892415</p>
                <p className="text-xs font-bold text-primary">{attendeeName || 'Attendee'}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Entry pass has been saved to your FindMedi Events & SMS sent.</p>
              <p className="font-medium text-foreground">{event.venue}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTicket}
                className="rounded-xl text-xs h-9 gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Pass
              </Button>
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs h-9"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
