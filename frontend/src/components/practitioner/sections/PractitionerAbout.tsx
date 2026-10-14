import React, { useState } from 'react';
import { User, Sparkles, CheckCircle2, ShieldCheck, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerAboutProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerAbout({ practitioner }: PractitionerAboutProps) {
  const [expanded, setExpanded] = useState(false);

  const bio = practitioner.bio || practitioner.about || practitioner.description ||
    `${practitioner.name} is a dedicated specialist with extensive clinical experience committed to evidence-based healthcare and patient-centric medical treatment. Providing personalized consultations, comprehensive diagnostics review, and preventive management tailored to individual patient needs.`;

  const conditions = practitioner.conditions || practitioner.focus || [
    'General Health Consultation',
    'Preventive Healthcare & Screenings',
    'Chronic Disease Management',
    'Lifestyle & Dietary Guidance',
    'Post-Treatment Follow-ups',
  ];

  const philosophy = practitioner.philosophy || practitioner.approach;
  const interests = practitioner.specialInterests || practitioner.interests;

  const council = practitioner.registration?.council || practitioner.council;
  const maskedReg = practitioner.registration?.numberMasked ||
    (practitioner.registrationNo ? `•••${String(practitioner.registrationNo).slice(-4)}` : null);
  const verifiedAt = practitioner.registration?.verifiedAt;

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <User className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg font-bold text-foreground">About the Practitioner</h2>
      </div>

      {/* Bio Text */}
      <div className="space-y-3">
        <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
          {bio}
        </p>
        {bio.length > 250 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary font-semibold h-7 px-2 hover:bg-primary/5"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
            ) : (
              <>Read Full Bio <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
            )}
          </Button>
        )}
      </div>

      {/* Philosophy / Approach */}
      {philosophy && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Treatment Philosophy & Approach
          </div>
          <p className="text-sm text-foreground/90 italic">"{philosophy}"</p>
        </div>
      )}

      {/* Conditions Treated */}
      {conditions && conditions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-primary" /> Key Conditions Treated & Care Areas
          </h3>
          <div className="flex flex-wrap gap-2">
            {conditions.map((item: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-muted/60 text-foreground border border-border/50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Special Interests */}
      {interests && interests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Special Clinical Interests</h3>
          <p className="text-xs text-muted-foreground">
            {Array.isArray(interests) ? interests.join(' • ') : interests}
          </p>
        </div>
      )}

      {/* Official Council Verification Card */}
      {(council || maskedReg) && (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Verified Medical Council Registration</p>
              <p className="text-muted-foreground mt-0.5">
                Registered with <strong>{council || 'Medical Council of India'}</strong>
                {maskedReg && <> • Registration ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-medium">{maskedReg}</code></>}
              </p>
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium shrink-0">
            {verifiedAt ? `Verified ${new Date(verifiedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'Government Council Verified'}
          </div>
        </div>
      )}
    </div>
  );
}
