import React from 'react';
import { Video, Building2, Phone, MessageSquare, Home, Sparkles, Check, Clock, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PractitionerDTO } from './PractitionerHeader';
import type { Unmodelled } from '@/lib/apiTypes';

interface PractitionerServicesFeesProps {
  practitioner: PractitionerDTO;
  onSelectMode?: (mode: string) => void;
}

export default function PractitionerServicesFees({
  practitioner,
  onSelectMode,
}: PractitionerServicesFeesProps) {
  const baseFee = practitioner.fee ?? practitioner.consultation_fees ?? 500;

  const defaultModes = [
    {
      mode: 'in_clinic',
      name: 'In-Clinic Consultation',
      duration: '20-30 mins',
      fee: baseFee,
      followUp: 'Free within 7 days',
      included: 'Physical examination, digital prescription, vitals check, diet guidance',
      popular: true,
    },
    {
      mode: 'video',
      name: 'Live Video Consultation',
      duration: '15-20 mins',
      fee: baseFee,
      followUp: 'Free within 7 days',
      included: 'Secure HD video call, instant digital Rx on app & WhatsApp, report review',
      popular: false,
    },
    {
      mode: 'audio',
      name: 'Audio Call Consult',
      duration: '15 mins',
      fee: Math.round(baseFee * 0.8),
      followUp: 'Valid 3 days',
      included: 'Phone call consultation, follow-up query support',
      popular: false,
    },
    {
      mode: 'chat',
      name: 'Doctor Chat Consult',
      duration: '24 hours validity',
      fee: Math.round(baseFee * 0.6),
      followUp: 'Included in chat window',
      included: 'Text chat with photo & lab report upload, doctor response within 1 hour',
      popular: false,
    },
  ];

  const modes = practitioner.modes && practitioner.modes.length > 0
    ? practitioner.modes.map((m: any) => ({
        mode: m.mode,
        name: m.name || (m.mode === 'in_clinic' ? 'In-Clinic Consultation' : m.mode === 'video' ? 'Video Consultation' : m.mode === 'home_visit' ? 'Home Visit' : `${m.mode} Consult`),
        duration: m.duration || '20 mins',
        fee: m.fee != null ? m.fee : baseFee,
        followUp: m.followUp || 'Free within 7 days',
        included: m.included || 'Clinical review & digital prescription',
        popular: m.mode === 'in_clinic' || m.mode === 'video',
      }))
    : defaultModes;

  // Add home visit if supported
  if (practitioner.homeVisitSupported && !modes.some((m: Unmodelled) => m.mode === 'home_visit')) {
    modes.push({
      mode: 'home_visit',
      name: 'Doctor Home Visit',
      duration: '45 mins',
      fee: Math.round(baseFee * 2),
      followUp: 'Free phone follow-up 7 days',
      included: 'Doorstep clinical consultation, emergency vitals check, physical exam',
      popular: false,
    });
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video className="w-5 h-5 text-primary" />;
      case 'audio':
        return <Phone className="w-5 h-5 text-sky-600" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case 'home_visit':
        return <Home className="w-5 h-5 text-amber-600" />;
      case 'in_clinic':
      default:
        return <Building2 className="w-5 h-5 text-indigo-600" />;
    }
  };

  const packages = practitioner.packages || [
    {
      title: 'Medical Second Opinion',
      price: baseFee * 1.5,
      description: 'Comprehensive review of past reports, imaging (CT/MRI), and diagnostic workup with a detailed written second opinion.',
      duration: '45 mins',
    },
    {
      title: 'Chronic Care 3-Month Follow-Up Plan',
      price: baseFee * 2.5,
      description: '3 scheduled follow-up consults, continuous report tracking on FindMedi e-records, priority chat messaging.',
      duration: '3 Months',
    },
  ];

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">Services, Modes & Consultation Fees</h2>
        </div>
        <span className="text-xs text-muted-foreground font-medium">All fees inclusive of standard taxes</span>
      </div>

      {/* Modes Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {modes.map((item: Unmodelled, idx: Unmodelled) => (
          <div
            key={idx}
            className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between ${
              item.popular
                ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-xs'
                : 'border-border/60 bg-card hover:border-border'
            }`}
          >
            {item.popular && (
              <span className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            )}

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-muted/80">{getModeIcon(item.mode)}</div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{item.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-foreground">₹{item.fee}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{item.followUp}</div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{item.included}</p>
            </div>

            <div className="pt-4 mt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Digital Rx on App
              </span>
              <Button
                size="sm"
                variant={item.popular ? 'default' : 'outline'}
                onClick={() => onSelectMode?.(item.mode)}
                className="h-8 text-xs font-semibold rounded-xl gap-1"
              >
                Select & Book <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Care Packages & Second Opinion */}
      {packages && packages.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Specialized Packages & Second Opinion
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {packages.map((pkg: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-xs text-foreground">{pkg.title}</h4>
                  <span className="font-black text-sm text-primary">₹{pkg.price}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
                <div className="flex justify-between items-center pt-1 text-[11px] text-muted-foreground">
                  <span>Duration: {pkg.duration}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectMode?.('in_clinic')}
                    className="h-6 text-xs text-primary px-2 font-semibold"
                  >
                    Inquire / Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
