import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, AlertCircle, ShieldAlert } from 'lucide-react';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerFaqProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerFaq({ practitioner }: PractitionerFaqProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const defaultFaqs = [
    {
      q: 'What should I carry or keep ready for the consultation?',
      a: 'Please carry or upload previous prescription slips, diagnostic lab test reports, current medication packages, and hospital discharge summaries. For video consultations, keep your medical history ready in the FindMedi app.',
    },
    {
      q: 'How does the free follow-up consultation work?',
      a: 'Most consultation modes include a complimentary follow-up window within 7 calendar days. You can share newly conducted lab reports or report treatment progress via app chat or a short follow-up call without extra charge.',
    },
    {
      q: 'Can I reschedule or cancel my booking?',
      a: 'Yes, appointments can be freely rescheduled up to 2 hours prior to the slot time directly from your Appointments dashboard. Refunds for cancellations are processed according to the cancellation policy.',
    },
    {
      q: 'Is my health data and prescription confidential?',
      a: 'Yes, FindMedi complies with Indian Digital Personal Data Protection (DPDP) Act and ABHA M1/M2/M3 security specifications. Your consultation notes and digital prescriptions are encrypted and accessible only to you and your treating practitioner.',
    },
    {
      q: 'What if I need immediate emergency medical attention?',
      a: 'This consultation booking is meant for non-emergency elective care. If you are experiencing chest pain, difficulty breathing, acute trauma, or any life-threatening symptoms, immediately dial 108/112 or visit the nearest hospital emergency department.',
    },
  ];

  const faqs = practitioner.faqs && practitioner.faqs.length > 0
    ? practitioner.faqs
    : defaultFaqs;

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg font-bold text-foreground">
          Frequently Asked Questions & Patient Policies
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq: any, i: number) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs sm:text-sm text-foreground hover:bg-muted/40 transition-colors"
              >
                <span>{faq.q || faq.question}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${i}`}
                  className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/20 pt-2 bg-card"
                >
                  {faq.a || faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mandatory Regulatory Medical Disclaimer */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 flex items-start gap-3 text-xs text-muted-foreground">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Platform Healthcare Disclaimer:</strong> FindMedi is a verified practitioner directory and scheduling technology platform. Medical opinions and diagnoses are independently provided by licensed practitioners. In case of acute medical emergencies, call 108 or 112 immediately.
        </p>
      </div>
    </div>
  );
}
