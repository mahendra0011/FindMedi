import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerSimilarProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerSimilar({ practitioner }: PractitionerSimilarProps) {
  const specialtyLabel =
    typeof practitioner.specialty === 'object' && practitioner.specialty?.label
      ? practitioner.specialty.label
      : typeof practitioner.specialty === 'string'
      ? practitioner.specialty
      : 'Specialist';

  const defaultSimilar = [
    {
      id: 'doc-sim-1',
      name: 'Dr. Vivek Mehra',
      specialty: specialtyLabel,
      qualifications: 'MBBS, MD',
      experience: '14 yrs exp',
      rating: 4.9,
      reviewsCount: 88,
      fee: 600,
      area: practitioner.area || 'Connaught Place',
      city: practitioner.city || 'New Delhi',
    },
    {
      id: 'doc-sim-2',
      name: 'Dr. Sunita Bansal',
      specialty: specialtyLabel,
      qualifications: 'MBBS, DNB',
      experience: '11 yrs exp',
      rating: 4.8,
      reviewsCount: 54,
      fee: 500,
      area: practitioner.area || 'Saket',
      city: practitioner.city || 'New Delhi',
    },
    {
      id: 'doc-sim-3',
      name: 'Dr. Rohan Deshmukh',
      specialty: specialtyLabel,
      qualifications: 'MBBS, MS',
      experience: '9 yrs exp',
      rating: 4.7,
      reviewsCount: 41,
      fee: 550,
      area: practitioner.area || 'Lajpat Nagar',
      city: practitioner.city || 'New Delhi',
    },
  ];

  const similarList = practitioner.similarPractitioners && practitioner.similarPractitioners.length > 0
    ? practitioner.similarPractitioners
    : defaultSimilar;

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-5 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            Similar {specialtyLabel} Specialists Nearby
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare doctors with high ratings and verified patient reviews
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {similarList.map((doc: any, i: number) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                  {doc.name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{doc.rating}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-foreground leading-tight">{doc.name}</h3>
                <p className="text-xs text-primary font-medium mt-0.5">{doc.specialty}</p>
                <p className="text-[11px] text-muted-foreground">{doc.qualifications} • {doc.experience}</p>
              </div>

              <div className="text-xs text-muted-foreground flex items-center justify-between pt-1">
                <span>{doc.area}</span>
                <strong className="text-foreground">₹{doc.fee}</strong>
              </div>
            </div>

            <Link
              to={`/practitioner/${doc.id}`}
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl border border-border/60 bg-card hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-colors mt-2"
            >
              <span>View Profile</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
