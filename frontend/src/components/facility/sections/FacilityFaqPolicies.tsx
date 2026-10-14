import { useState } from 'react';
import { HelpCircle, Shield, AlertTriangle, FileText, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FacilityFaqPoliciesProps {
  facilityName: string;
  faqs?: Array<{ question: string; answer: string }>;
  onClaimListing?: () => void;
  onReportListing?: () => void;
}

export default function FacilityFaqPolicies({
  facilityName,
  faqs = [],
  onClaimListing,
  onReportListing,
}: FacilityFaqPoliciesProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const defaultFaqs = faqs.length > 0
    ? faqs
    : [
        {
          question: `How do I book an appointment at ${facilityName}?`,
          answer: 'You can book directly using the Book button above. Select your preferred doctor or clinical department, choose an available date and slot, and confirm instantly.',
        },
        {
          question: 'Are walk-in consultations accepted?',
          answer: 'Yes, emergency and walk-in consultations are accommodated based on token queue availability. For guaranteed doctor availability, prior digital booking is strongly recommended.',
        },
        {
          question: 'Is health insurance and cashless hospitalisation accepted?',
          answer: 'Yes, this facility is empanelled with major TPA and private health insurers. Our dedicated hospital insurance desk assists with pre-authorisation and cashless processing.',
        },
        {
          question: 'What is the cancellation and refund policy?',
          answer: 'Appointments cancelled at least 2 hours before the scheduled slot are eligible for a full refund or free rescheduling to a future date.',
        },
      ];

  return (
    <div className="space-y-6">
      {/* FAQs */}
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Frequently Asked Questions</h3>
        </div>

        <div className="divide-y divide-border/60">
          {defaultFaqs.map((f, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <span>{f.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed pr-6">{f.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Policies & Medical Disclaimer */}
      <div className="bg-muted/10 border rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <h4 className="font-bold text-foreground">Important Medical Disclaimer & Policies</h4>
            <p className="leading-relaxed">
              FindMedi is an authorized digital discovery, appointment booking, and healthcare technology platform. Clinical services, treatments, diagnoses, and medical care are provided exclusively by the credentialed healthcare professionals and licensed facilities listed. In case of life-threatening emergency, call 108 or your local emergency department immediately.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {onClaimListing && (
              <button type="button" onClick={onClaimListing} className="text-primary font-semibold hover:underline">
                Claim this Facility Listing
              </button>
            )}
            {onReportListing && (
              <button type="button" onClick={onReportListing} className="text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Flag className="w-3 h-3" /> Report Incorrect Info
              </button>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">Last verified by FindMedi Clinical Operations</span>
        </div>
      </div>
    </div>
  );
}
