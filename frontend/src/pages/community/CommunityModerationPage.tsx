import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ApiRow } from '@/lib/apiTypes';

export default function CommunityModerationPage() {
  const [reports, setReports] = useState<ApiRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const result = await api.getCommunityReports();
      setReports(result.reports || []);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the moderation queue.');
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (report: ApiRow, action: 'hide' | 'dismiss') => {
    const key = `${String(report.postId)}:${String(report.reportId)}`;
    setBusy(key);
    try {
      await api.reviewCommunityReport(String(report.postId), String(report.reportId), action);
      setReports((current) => current.filter((item) => item.reportId !== report.reportId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not review report.');
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl font-bold">Community moderation</h1>
        <p className="text-sm text-muted-foreground">Review member reports. Hiding removes the post from public listings; dismissing closes the report without hiding it.</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {reports.length === 0 && <p className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">No open reports.</p>}
      <section className="space-y-3">
        {reports.map((report) => {
          const key = `${String(report.postId)}:${String(report.reportId)}`;
          return (
            <article key={key} className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm"><strong>{String(report.reason)}</strong><span className="text-muted-foreground">{String(report.post?.category || '')}</span></div>
              {report.details && <p className="text-sm text-muted-foreground">{String(report.details)}</p>}
              <div className="rounded-lg bg-muted/40 p-3">
                <h2 className="font-semibold">{String(report.post?.title || '')}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm">{String(report.post?.body || '')}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={busy === key} onClick={() => decide(report, 'hide')}>Hide post</Button>
                <Button size="sm" variant="outline" disabled={busy === key} onClick={() => decide(report, 'dismiss')}>Dismiss report</Button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
