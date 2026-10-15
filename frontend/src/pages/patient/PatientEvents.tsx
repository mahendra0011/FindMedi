import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MapPin, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function PatientEvents() {
  interface EventRow {
    id: string;
    title: string;
    organizer: string;
    date: string;
    time: string;
    venue: string;
    status: string;
  }
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Live registrations (GET /patient/events, session-scoped). No demo rows:
  // an empty list renders the empty state below, never someone else's camp.
  useEffect(() => {
    let cancelled = false;
    api.getMyEventRegistrations()
      .then((res: any) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.registrations) ? res.registrations : [];
        setEvents(rows.map((r: any) => {
          const ev = r.eventId && typeof r.eventId === 'object' ? r.eventId : {};
          const start = ev?.schedule?.start ? new Date(ev.schedule.start) : null;
          const venue = ev?.venue?.mode === 'online'
            ? 'Online session (link shared before start)'
            : (ev?.venue?.address || ev?.location || '');
          return {
            id: String(r._id || r.id),
            title: ev?.title || ev?.name || 'Health Camp',
            organizer: ev?.organizerName || '',
            date: start ? start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
            time: start ? start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '',
            venue,
            status: r?.status || 'Registered',
          };
        }));
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenDirections = (venue: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Registered Health Camps & Events</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access your QR entry passes, screening schedules, and post-event diagnostic health reports.
          </p>
        </div>

        <Link to="/patient/services">
          <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Find Nearby Camps
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {loading && (
          <p className="text-xs text-muted-foreground py-8 text-center">Loading your registrations…</p>
        )}
        {!loading && events.length === 0 && (
          <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-2">
            <p className="font-bold text-sm text-foreground">No camp registrations yet</p>
            <p className="text-xs text-muted-foreground">When you register for a health camp or workshop, your entry pass will appear here.</p>
          </div>
        )}
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    {evt.status}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">{evt.title}</h2>
                {evt.organizer && <p className="text-xs text-muted-foreground">{evt.organizer}</p>}
              </div>
            </div>

            {/* Time & Venue */}
            <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs">
              <div className="space-y-1">
                {evt.date && (
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{evt.date}{evt.time ? ` · ${evt.time}` : ''}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {evt.venue && (
                  <div className="flex items-start gap-2 text-foreground font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{evt.venue}</span>
                  </div>
                )}
                {evt.venue && evt.venue !== 'Online session (link shared before start)' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDirections(evt.venue)}
                    className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 pl-5"
                  >
                    Get Directions <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
