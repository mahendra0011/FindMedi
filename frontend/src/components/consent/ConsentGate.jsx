import React, { useState } from 'react';

/**
 * ConsentGate — minimal consent-checkbox gate.
 * Production flows (MentalHealth confidentiality modal, PatientSettings ABHA
 * auto-consent, telemedicine Join-Call consent) me yahi rule hai: checkbox ke
 * bina submit disabled rehta hai. Is chhote component par rule ko Vitest me
 * lock karte hain taaki bade pages refactor ho jayein tab bhi contract na toote.
 */
export default function ConsentGate({
  label = 'Patient Consent Obtained',
  requireScope = false,
  onSubmit = () => {},
}) {
  const [consent, setConsent] = useState(false);
  const [shareFamily, setShareFamily] = useState(false);
  const [shareDoctor, setShareDoctor] = useState(false);

  const blockedReason = !consent
    ? 'Consent required hai — checkbox tick karo'
    : requireScope && !shareFamily && !shareDoctor
      ? 'Sharing scope chuno'
      : '';

  return (
    <div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="w-4 h-4"
        />
        {label}
      </label>
      {requireScope && (
        <div className="mt-2 space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shareFamily} onChange={(e) => setShareFamily(e.target.checked)} className="w-4 h-4" />
            Share Information with Family
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shareDoctor} onChange={(e) => setShareDoctor(e.target.checked)} className="w-4 h-4" />
            Share with Referring Doctor
          </label>
        </div>
      )}
      {blockedReason && <p role="status" className="text-xs text-muted-foreground mt-2">{blockedReason}</p>}
      <button
        type="button"
        disabled={Boolean(blockedReason)}
        onClick={() => onSubmit({ consent, shareFamily, shareDoctor })}
        className="mt-3 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        Save Confidentiality Settings
      </button>
    </div>
  );
}
