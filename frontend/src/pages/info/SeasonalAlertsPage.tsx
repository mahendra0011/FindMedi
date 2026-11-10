import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type SeasonalAlert = { key: string; title: string; detail: string };
type SeasonalResponse = { month: number; alerts: SeasonalAlert[]; liveData: false };

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SeasonalAlertsPage() {
  const [data, setData] = useState<SeasonalResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getSeasonalAlerts()
      .then((result: SeasonalResponse) => { if (active) setData(result); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Seasonal guidance is unavailable right now.');
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">Seasonal Health Guidance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.month ? `General reminders for ${MONTHS[data.month]}.` : 'General seasonal reminders.'}
          {' '}These are not live outbreak, weather or air-quality measurements. Follow local health-authority advice.
        </p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {!data && !error && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading guidance…</div>}
      {data?.alerts.length === 0 && <p className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">No seasonal reminders are listed for this month.</p>}

      <section className="space-y-3" aria-label="Current seasonal guidance">
        {data?.alerts.map((alert) => (
          <article key={alert.key} className="flex gap-3 rounded-xl border border-border/60 bg-card p-4">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div><h2 className="font-semibold">{alert.title}</h2><p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p></div>
          </article>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">For urgent help, use the <Link className="text-primary underline" to="/helplines">helpline directory</Link> or contact local emergency services.</p>
    </main>
  );
}
