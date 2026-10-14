import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, QrCode, Download, Share2,
  FileText, CheckCircle2, ChevronRight, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientEvents() {
  const [events, setEvents] = useState([
    {
      id: 'evt-1',
      title: 'Free Community Diabetes & Hypertension Health Screening Camp',
      organizer: 'Max Super Specialty Hospital Outreach Team',
      date: 'Sunday, 26 October 2026',
      time: '08:30 AM – 01:30 PM',
      venue: 'Community Centre, Block B, Green Park, New Delhi',
      ticketId: 'TCK-892415',
      status: 'Registered',
      attendeeName: 'Aarav Sharma',
      testsIncluded: ['Random Blood Glucose', 'Blood Pressure Screening', 'BMI & Body Composition', 'Doctor Consultation'],
      reportsStatus: 'Pending event completion',
    },
    {
      id: 'evt-2',
      title: 'Pediatric CPR & Infant First-Aid Life Support Workshop',
      organizer: 'Indian Red Cross Society & St. John Ambulance',
      date: 'Saturday, 8 November 2026',
      time: '10:00 AM – 01:00 PM',
      venue: 'Apollo Cradle Auditorium, Sector 14, Gurugram',
      ticketId: 'TCK-410298',
      status: 'Registered',
      attendeeName: 'Sneha Sharma',
      testsIncluded: ['Hands-on CPR Training', 'Choking Relief Mannequin Practice', 'Official Course Completion Certificate'],
      reportsStatus: 'Certificate will be issued post-session',
    },
  ]);

  const handleDownloadTicket = (ticketId: string) => {
    toast.success(`E-Ticket ${ticketId} saved to your downloads.`);
  };

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
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    Pass: {evt.ticketId}
                  </Badge>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    {evt.status}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">{evt.title}</h2>
                <p className="text-xs text-muted-foreground">{evt.organizer} • Attendee: <strong className="text-foreground">{evt.attendeeName}</strong></p>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTicket(evt.ticketId)}
                  className="rounded-xl text-xs h-8 gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> View QR Pass
                </Button>
              </div>
            </div>

            {/* Time & Venue */}
            <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{evt.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{evt.time}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-start gap-2 text-foreground font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{evt.venue}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDirections(evt.venue)}
                  className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 pl-5"
                >
                  Get Directions <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                Services & Screenings Included:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {evt.testsIncluded.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/40"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
