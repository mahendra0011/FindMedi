import { useState } from 'react';

type BeforeAfterConsentProps = {
  consentText?: string;
  onConsent?: () => void | Promise<void>;
  children?: import('react').ReactNode;
};

export function BeforeAfterConsent(props: BeforeAfterConsentProps) {
  const { consentText, onConsent, children } = props;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (accepted) return <>{children}</>;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-medium text-amber-900">Before/after photos require your consent</p>
      <p className="mt-1 text-amber-800">
        {consentText || 'These images show patient results. By viewing you agree they are for informational purposes only and may not represent typical outcomes.'}
      </p>
      <button
        type="button"
        disabled={busy}
        className="mt-3 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          try { await onConsent?.(); setAccepted(true); } finally { setBusy(false); }
        }}
      >
        {busy ? 'Recording consent...' : 'I consent and want to view'}
      </button>
    </div>
  );
}
