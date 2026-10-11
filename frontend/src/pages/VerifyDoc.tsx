import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, ShieldX, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiBaseUrl } from '@/lib/axios';

/**
 * File 14 §14.5 — PUBLIC document verification (no login). A pharmacist or
 * patient pastes the printed link (QR target) for a prescription / consent /
 * discharge seal and sees authenticity only — never patient content.
 */

type VerifyResult = {
  valid: boolean;
  signatures?: number;
  lastSignedAt?: string;
  kind?: string;
};

const KIND_LABELS: Record<string, string> = {
  prescription: 'Prescription',
  consent: 'Consent form',
  discharge: 'Discharge summary',
  report: 'Report',
  bill: 'Bill',
};

export default function VerifyDoc() {
  const { kind = '', id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const nonce = searchParams.get('nonce') || '';
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = nonce ? `?nonce=${encodeURIComponent(nonce)}` : '';
        const url = `${getApiBaseUrl()}/verify/doc/${encodeURIComponent(kind)}/${encodeURIComponent(id)}${qs}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = (await res.json()) as VerifyResult;
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setError('Verification service unreachable — please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, id, nonce]);

  const kindLabel = KIND_LABELS[kind] || kind || 'Document';
  const sealFound = (result?.signatures ?? 0) > 0;
  const needsNonce = result?.valid === false && sealFound && !nonce;
  const verified = result?.valid === true;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b pb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BadgeCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold">Document verification</h1>
            <p className="text-sm text-muted-foreground">Tamper seal check — no patient data shown</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{kindLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-4 h-4" /> {error}
              </div>
            )}
            {!loading && !error && verified && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <BadgeCheck className="w-5 h-5" /> Authentic — seal intact
                </div>
                <p className="text-muted-foreground">
                  {result?.signatures} signature{result?.signatures === 1 ? '' : 's'} · last signed{' '}
                  {result?.lastSignedAt ? new Date(result.lastSignedAt).toLocaleString() : '—'}
                </p>
              </div>
            )}
            {!loading && !error && needsNonce && (
              <div className="flex items-start gap-2 text-amber-600">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Seal found, but this link is missing its verification code. Open the QR/link
                  printed on the document (it includes a <code>nonce</code> parameter) to complete
                  verification.
                </span>
              </div>
            )}
            {!loading && !error && result && !verified && !needsNonce && (
              <div className="flex items-center gap-2 text-destructive font-medium">
                <ShieldX className="w-5 h-5" /> Not valid — no matching seal found
              </div>
            )}
            <p className="text-xs text-muted-foreground border-t pt-3">
              Document ID: <code>{id || '—'}</code>. Verification confirms the platform issued this
              document and has not altered it since. It does not show any patient or clinical data.
            </p>
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="w-full">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}