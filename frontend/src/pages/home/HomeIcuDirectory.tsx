import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

export default function HomeIcuDirectory() {
  const [providers, setProviders] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers?type=home_icu&limit=100')
      .then((res: Unmodelled) => setProviders(res.providers || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Providers could not be loaded'))
      .finally(() => setLoading(false));
  }, []);

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
    <header className="space-y-2">
      <div className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /><h1 className="font-heading text-2xl font-bold">Home ICU Providers</h1></div>
      <p className="text-sm text-muted-foreground">Browse live home critical-care providers. Contact the provider to assess suitability, staffing and equipment before arranging care.</p>
      <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">This directory is not an emergency response service. For urgent or life-threatening symptoms, call 112 or your local emergency service.</p>
    </header>
    {loading && <p className="text-sm text-muted-foreground">Loading providers…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!loading && !error && providers.length === 0 && <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">No live home ICU providers are currently listed for this directory.</p>}
    <section className="grid gap-3 sm:grid-cols-2">
      {providers.map((provider) => <article key={String(provider._id)} className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{String(provider.name || 'Home ICU provider')}</h2><Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Live</Badge></div>
        {provider.tagline && <p className="text-sm text-muted-foreground">{String(provider.tagline)}</p>}
        {provider.address?.city && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{String(provider.address.city)}{provider.address.area ? ` · ${String(provider.address.area)}` : ''}</p>}
        <Link className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" to={`/home-icu/${String(provider.slug || provider._id)}`}>View provider</Link>
      </article>)}
    </section>
  </main>;
}
