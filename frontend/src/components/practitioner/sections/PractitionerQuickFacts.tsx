import React from 'react';
import { Award, Clock, Languages, Video, Building2, Phone, MessageSquare, Home, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerQuickFactsProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerQuickFacts({ practitioner }: PractitionerQuickFactsProps) {
  const modes = practitioner.modes || [
    { mode: 'in_clinic', fee: practitioner.fee || practitioner.consultation_fees || 500 },
    { mode: 'video', fee: (practitioner.fee || 500) },
  ];

  const getModeIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'video':
      case 'telemedicine':
        return <Video className="w-4 h-4 text-primary" />;
      case 'audio':
        return <Phone className="w-4 h-4 text-sky-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'home_visit':
        return <Home className="w-4 h-4 text-amber-600" />;
      case 'in_clinic':
      default:
        return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  const formatModeName = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'in_clinic':
        return 'In-Clinic Consult';
      case 'video':
      case 'telemedicine':
        return 'Video Consult';
      case 'audio':
        return 'Audio Call';
      case 'chat':
        return 'Chat Consult';
      case 'home_visit':
        return 'Home Visit';
      default:
        return mode.replace('_', ' ');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Experience */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Experience</p>
          <p className="text-sm font-bold text-foreground truncate">
            {practitioner.experience || (practitioner.experienceYears ? `${practitioner.experienceYears} Years` : '10+ Years')}
          </p>
        </div>
      </div>

      {/* Languages */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
          <Languages className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Languages</p>
          <p className="text-sm font-bold text-foreground truncate">
            {practitioner.languages?.length ? practitioner.languages.join(', ') : 'English, Hindi'}
          </p>
        </div>
      </div>

      {/* Response Time Band */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Response Time</p>
          <p className="text-sm font-bold text-foreground truncate">
            {practitioner.responseTime || 'Under 30 mins'}
          </p>
        </div>
      </div>

      {/* Reliability / On-time */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">On-Time Visits</p>
          <p className="text-sm font-bold text-foreground truncate">
            {practitioner.onTimePercent ? `${practitioner.onTimePercent}%` : '96% on-time'}
          </p>
        </div>
      </div>

      {/* Consultation Modes summary bar */}
      <div className="col-span-2 sm:col-span-4 bg-muted/30 border border-border/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
          <HeartHandshake className="w-4 h-4 text-primary" /> Supported Consult Modes:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {modes.map((m: any, i: number) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/50 font-medium text-foreground"
            >
              {getModeIcon(m.mode)}
              <span>{formatModeName(m.mode)}</span>
              {m.fee != null && <strong className="text-primary ml-1">₹{m.fee}</strong>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
