import { useEffect, useState } from 'react';
import { GraduationCap, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import EventRegistrationModal from '@/components/booking/EventRegistrationModal';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

export default function CoursesPage() {
  const [courses, setCourses] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Unmodelled>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Courses are Event rows of type training/workshop/webinar — the same
        // catalogue + registration engine as camps, with a course filter.
        const out: Unmodelled[] = [];
        for (const type of ['training', 'workshop', 'webinar']) {
          const res = await api.getEvents({ type, limit: 50 }).catch(() => ({ events: [] }));
          out.push(...(res.events || []));
        }
        setCourses(out);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Courses</h1>
        <p className="text-muted-foreground text-sm">Certified training — CPR/first-aid/BLS, caregiver, nutrition, yoga-teacher and more.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {courses.length === 0 && <p className="text-sm text-muted-foreground">No upcoming courses. Camps and workshops appear here when organisers publish them.</p>}

      <section className="grid gap-3 sm:grid-cols-2">
        {courses.map((c: ApiRow) => {
          const fee = Number(c?.fee?.amount || 0);
          const seatsLeft = typeof c?.capacity === 'number' ? Math.max(0, Number(c.capacity) - Number(c.registeredCount || 0)) : undefined;
          return (
            <article key={String(c._id)} className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">{String(c.title || 'Course')}</h3>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{String(c.type || 'training')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{String(c.description || '')}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {c.schedule?.start && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(String(c.schedule.start)).toLocaleString()}
                  </span>
                )}
                {c.venue?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {String(c.venue.city)}
                  </span>
                )}
                {seatsLeft !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" /> {seatsLeft} seats left
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{fee === 0 ? 'Free' : `₹${fee}`}</p>
                <Button size="sm" disabled={seatsLeft === 0} onClick={() => { setSelected(c); setOpen(true); }}>
                  Enroll
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      {selected && (
        <EventRegistrationModal
          open={open}
          onOpenChange={setOpen}
          event={{
            id: String(selected._id),
            title: String(selected.title || 'Course'),
            date: selected.schedule?.start ? new Date(String(selected.schedule.start)).toLocaleDateString() : '',
            time: selected.schedule?.start ? new Date(String(selected.schedule.start)).toLocaleTimeString() : '',
            venue: selected.venue?.city || selected.venue?.address || 'Online',
            fee: Number(selected.fee?.amount || 0) || undefined,
            seatsLeft: typeof selected.capacity === 'number' ? Math.max(0, Number(selected.capacity) - Number(selected.registeredCount || 0)) : undefined,
          }}
          onSuccess={() => { setOpen(false); setSelected(null); }}
        />
      )}
    </div>
  );
}
