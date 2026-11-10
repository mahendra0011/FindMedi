import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, HeartHandshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import EventRegistrationModal from '@/components/booking/EventRegistrationModal';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

export default function QuitProgramsPage() {
  const [events, setEvents] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Unmodelled>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEvents({ type: 'quit_smoking_alcohol', limit: 100 })
      .then((res: Unmodelled) => setEvents(res.events || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Programs could not be loaded'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Quit Smoking &amp; Alcohol Programs</h1>
        <p className="text-sm text-muted-foreground">Confidential, clinician-supported quit programs — counselling, nicotine-replacement guidance, and relapse-prevention groups.</p>
        <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">These programs support behaviour change and are not a substitute for medical treatment. For withdrawal symptoms or severe dependence, consult a doctor. Discreet notifications: your participation is never shared publicly.</p>
      </header>
      {loading && <p className="text-sm text-muted-foreground">Loading programs…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming programs are listed right now.</p>}
      <section className="grid gap-3 sm:grid-cols-2">
        {events.map((event) => {
          const fee = Number(event?.fee?.amount || 0);
          const seats = typeof event.capacity === 'number' ? Math.max(0, Number(event.capacity) - Number(event.registeredCount || 0)) : undefined;
          const audience = String(event.audience || 'general');
          return <article key={String(event._id)} className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{String(event.title || 'Quit program')}</h2>
              <Badge variant="outline">{audience}</Badge>
            </div>
            <p className="line-clamp-3 text-sm text-muted-foreground">{String(event.description || '')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {event.schedule?.start && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(String(event.schedule.start)).toLocaleString()}</span>}
              {event.venue?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{String(event.venue.city)}</span>}
              {seats !== undefined && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{seats} seats</span>}
            </div>
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">{fee ? `₹${fee}` : 'Free'}</span><Button size="sm" disabled={seats === 0} onClick={() => { setSelected(event); setOpen(true); }}>Register</Button></div>
          </article>;
        })}
      </section>
      {selected && <EventRegistrationModal open={open} onOpenChange={setOpen} event={{
        id: String(selected._id), title: String(selected.title || 'Quit program'),
        date: selected.schedule?.start ? new Date(String(selected.schedule.start)).toLocaleDateString() : '',
        time: selected.schedule?.start ? new Date(String(selected.schedule.start)).toLocaleTimeString() : '',
        venue: selected.venue?.city || selected.venue?.address || 'Online',
        fee: Number(selected.fee?.amount || 0) || undefined,
        seatsLeft: typeof selected.capacity === 'number' ? Math.max(0, Number(selected.capacity) - Number(selected.registeredCount || 0)) : undefined,
      }} />}
    </main>
  );
}
