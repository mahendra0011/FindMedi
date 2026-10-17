import React, { useEffect, useState } from 'react';
import {
  Syringe, Calendar, CheckCircle2, AlertCircle, Clock, Download,
  MapPin, ShieldCheck, User, Sparkles, Loader2, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Dose {
  number?: number;
  dueAt?: string | null;
  givenAt?: string | null;
  recordId?: string | null;
  centre?: string;
  batchNo?: string;
  state?: 'given' | 'due' | 'overdue' | 'upcoming';
}

interface Schedule {
  _id?: string;
  id?: string;
  vaccineName?: string;
  scheduleType?: 'child_uip' | 'adult_booster' | 'travel' | 'covid' | 'other';
  status?: 'scheduled' | 'completed' | 'cancelled';
  source?: string;
  completedAt?: string | null;
  doses?: Dose[];
  overdueCount?: number;
  nextDueAt?: string | null;
}

const fmt = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

type RowStatus = 'Completed' | 'Overdue Due' | 'Upcoming Due' | 'Scheduled Future' | 'Cancelled';

function rowStatus(s: Schedule): RowStatus {
  if (s.status === 'cancelled') return 'Cancelled';
  if (s.status === 'completed') return 'Completed';
  if ((s.overdueCount ?? 0) > 0) return 'Overdue Due';
  if (s.nextDueAt) return 'Upcoming Due';
  return 'Scheduled Future';
}

const isDueLabel = (label: RowStatus) => label.includes('Due');

export default function PatientVaccinations() {
  const [activeTab, setActiveTab] = useState<'child' | 'adult'>('child');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/patient/vaccinations');
        if (cancelled) return;
        const rows = Array.isArray((res as any)?.schedules)
          ? (res as any).schedules
          : Array.isArray(res)
            ? (res as any)
            : [];
        setSchedules(rows);
        setError(null);
      } catch {
        if (!cancelled) setError('Could not load your vaccination records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = schedules.filter((s) =>
    activeTab === 'child'
      ? (s.scheduleType ?? 'child_uip') === 'child_uip'
      : (s.scheduleType ?? 'child_uip') !== 'child_uip',
  );

  const handleDownloadCert = (cert: string) => {
    toast.success(`Vaccination certificate ${cert} downloaded.`);
  };

  const totals = visible.reduce(
    (acc, s) => {
      const doses = s.doses ?? [];
      acc.given += doses.filter((d) => d.givenAt).length;
      acc.total += doses.length;
      return acc;
    },
    { given: 0, total: 0 },
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Vaccination Records & Schedule</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track National Immunization Schedule (UIP) doses for children and adult boosters with digital records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => toast.info('Opening nearby vaccination centres map...')}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" /> Nearest Vaccine Centre
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('child')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'child'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Child Immunization (UIP & IAP)
        </button>
        <button
          onClick={() => setActiveTab('adult')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'adult'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Adult & Travel Vaccines
        </button>
        {visible.length > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            {totals.given}/{totals.total} doses administered
          </span>
        )}
      </div>

      {/* Vaccine Timeline Table */}
      <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-xs divide-y divide-border/40">
        {loading && (
          <div className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vaccination records…
          </div>
        )}

        {!loading && error && (
          <div className="p-8 text-center space-y-1">
            <AlertCircle className="w-5 h-5 mx-auto text-amber-600" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-[11px] text-muted-foreground/70">Your records will appear here once a clinic adds a schedule.</p>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="p-8 text-center space-y-1">
            <Inbox className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No {activeTab === 'child' ? 'child immunization' : 'adult / travel'} schedules yet.</p>
            <p className="text-[11px] text-muted-foreground/70">Add one from your provider, or book a slot to get started.</p>
          </div>
        )}

        {!loading && !error && visible.map((item, i) => {
          const label = rowStatus(item);
          const doses = item.doses ?? [];
          const given = doses.filter((d) => d.givenAt);
          const lastGiven = given.length
            ? given.reduce((latest, d) => {
                const t = new Date(d.givenAt as string).getTime();
                return !latest || t > latest.t ? { t, d } : latest;
              }, null as { t: number; d: Dose } | null)
            : null;
          const certDose = given.find((d) => d.recordId);
          const dueDate = fmt(item.nextDueAt ?? doses.find((d) => !d.givenAt)?.dueAt);

          return (
            <div key={String(item._id ?? item.id ?? i)} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                  label === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : isDueLabel(label)
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Syringe className="w-5 h-5" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-foreground">{item.vaccineName || 'Vaccination schedule'}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                      label === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : isDueLabel(label)
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {label}
                    </span>
                    {(item.overdueCount ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-500/10 text-red-600">
                        {item.overdueCount} overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {doses.length} dose{doses.length === 1 ? '' : 's'} · {given.length} given
                    {item.source ? ` · Source: ${item.source.toUpperCase()}` : ''}
                  </p>
                  {lastGiven && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Administered on: {fmt(lastGiven.d.givenAt)}
                      {lastGiven.d.centre ? ` · ${lastGiven.d.centre}` : ''}
                    </p>
                  )}
                  {label !== 'Completed' && dueDate && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Due Date: {dueDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0 self-end sm:self-center">
                {certDose?.recordId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadCert(String(certDose.recordId))}
                    className="rounded-xl text-xs h-8 gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Certificate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => toast.info('Booking appointment for this vaccine slot...')}
                    className="rounded-xl text-xs h-8 font-semibold"
                  >
                    Book Slot
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
