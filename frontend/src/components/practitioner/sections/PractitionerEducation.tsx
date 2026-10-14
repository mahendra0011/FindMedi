import React from 'react';
import { GraduationCap, Award, Briefcase, BookOpen, ShieldCheck } from 'lucide-react';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerEducationProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerEducation({ practitioner }: PractitionerEducationProps) {
  const education = practitioner.education || [
    { degree: 'MBBS', institution: 'All India Institute of Medical Sciences (AIIMS)', year: '2012' },
    { degree: 'MD / MS', institution: 'Postgraduate Institute of Medical Education & Research', year: '2016' },
  ];

  const experienceHistory = practitioner.experienceHistory || practitioner.workHistory || [
    { role: 'Senior Consultant', organization: 'Apollo Hospital & Healthcare', duration: '2020 – Present' },
    { role: 'Associate Specialist', organization: 'Fortis Memorial Research Institute', duration: '2016 – 2020' },
  ];

  const memberships = practitioner.memberships || [
    'Indian Medical Association (IMA)',
    'Association of Physicians of India (API)',
    'Delhi Medical Council (DMC)',
  ];

  const awards = practitioner.awards || practitioner.recognitions || [
    'Excellence in Clinical Care Award — State Medical Forum (2022)',
    'Best Research Presentation — National Healthcare Congress (2018)',
  ];

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg font-bold text-foreground">Education, Training & Experience</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Education & Qualifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Degrees & Qualifications
          </h3>
          <div className="space-y-3">
            {education.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{item.degree || item}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.institution} {item.year ? `• Class of ${item.year}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" /> Work History & Appointments
          </h3>
          <div className="space-y-3">
            {experienceHistory.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">{item.role || item.position}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.organization || item.hospital} • <span className="font-medium text-foreground">{item.duration}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Memberships & Awards */}
      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
        {memberships && memberships.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Professional Memberships
            </h4>
            <ul className="space-y-1.5 text-xs text-foreground">
              {memberships.map((m: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {awards && awards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Honors & Awards
            </h4>
            <ul className="space-y-1.5 text-xs text-foreground">
              {awards.map((a: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
