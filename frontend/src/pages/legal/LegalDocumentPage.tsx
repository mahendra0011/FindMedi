import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

interface LegalSection { heading: string; body: string }
interface LegalDocument {
  context: string;
  version: string;
  title: string;
  titleHi?: string;
  updatedAt: string;
  summary: string;
  sections: LegalSection[];
  documentHash: string;
}

export default function LegalDocumentPage({ context }: { context: 'community_guidelines' | 'provider_agreement' }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.getLegalDocument(context)
      .then((res) => { if (alive) setDoc(res?.document || null); })
      .catch((err) => { if (alive) setError(err?.message || 'Failed to load document'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [context]);

  useEffect(() => {
    if (!user) return;
    api.getLegalAcceptances()
      .then((res) => {
        const row = (res?.acceptances || []).find((a: { context: string }) => a.context === context);
        setAccepted(Boolean(row?.upToDate));
      })
      .catch(() => {});
  }, [context, user]);

  const accept = async () => {
    if (!doc) return;
    if (!user) {
      toast.info('Please sign in to accept this document.');
      return;
    }
    setAccepting(true);
    try {
      await api.acceptLegalDocument({ context: doc.context, templateVersion: doc.version });
      setAccepted(true);
      toast.success(t('legal.accepted', 'Acceptance recorded.'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record acceptance';
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  };

  const title = doc ? (i18n.language === 'hi' && doc.titleHi ? doc.titleHi : doc.title) : '';

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">{title || t('legal.loading', 'Loading...')}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {doc ? `${t('legal.version', 'Version')} ${doc.version} \u2022 ${t('legal.updated', 'Updated')} ${doc.updatedAt}` : ''}
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> {t('legal.back', 'Back to Home')}
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('legal.loading', 'Loading...')}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {doc && !loading && (
          <>
            <p className="text-sm text-muted-foreground">{doc.summary}</p>
            <div className="space-y-4">
              {doc.sections.map((section) => (
                <section key={section.heading} className="bg-card rounded-2xl border p-6 space-y-2">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> {section.heading}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{section.body}</p>
                </section>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border bg-card p-5">
              <div className="text-xs text-muted-foreground break-all">
                {t('legal.hash', 'Document fingerprint')}: {doc.documentHash}
              </div>
              {accepted ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> {t('legal.acceptedBadge', 'Accepted')}
                </span>
              ) : (
                <Button onClick={accept} disabled={accepting} className="gap-2">
                  {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('legal.accept', 'Accept this document')}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
