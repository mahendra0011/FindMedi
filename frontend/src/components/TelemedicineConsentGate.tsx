import { useState } from 'react';

type TelemedicineConsentProps = {
  consentText?: string;
  onConsent?: () => void | Promise<void>;
  children?: import('react').ReactNode;
};

export function TelemedicineConsentGate(props: TelemedicineConsentProps) {
  const { consentText, onConsent, children } = props;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (accepted) return <>{children}</>;

  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm">
      <p className="font-medium text-sky-900">Telemedicine consent required</p>
      <p className="mt-1 text-sky-800">
        {consentText || 'This consult is provided via video/audio/chat. By continuing you consent to remote consultation, identity verification, and the prescribing limits that apply to telemedicine.'}
      </p>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        className="mt-3 rounded-md bg-sky-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          setError(null);
          try { await onConsent?.(); setAccepted(true); }
          catch (e: unknown) { setError(e instanceof Error ? e.message : 'Consent failed'); }
          finally { setBusy(false); }
        }}
      >
        {busy ? 'Recording consent...' : 'I consent to telemedicine'}
      </button>
    </div>
  );
}
