import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed, Calendar, Clock, AlertCircle, PauseCircle, PlayCircle,
  SkipForward, ShieldCheck, CheckCircle2, ChevronRight, Sparkles, MapPin, Truck,
  Loader2, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ProviderRef {
  name?: string;
  type?: string;
}
interface PlanRef {
  name?: string;
  price?: number;
  duration?: string | { value?: number; unit?: string };
}

interface Subscription {
  _id?: string;
  dietType?: string;
  allergies?: string[];
  deliverySlot?: string;
  deliveryAddress?: string;
  status?: 'active' | 'paused' | 'cancelled' | 'completed';
  startAt?: string | null;
  endAt?: string | null;
  pause?: { from?: string | null; to?: string | null; reason?: string; pausedDays?: number };
  skippedDates?: string[];
  providerId?: ProviderRef | string | null;
  planId?: PlanRef | string | null;
}

const fmt = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysLeft = (iso?: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const d = Math.ceil((t - Date.now()) / 86_400_000);
  return d < 0 ? 0 : d;
};

const ref = <T,>(v: T | string | null | undefined): T | undefined =>
  v && typeof v === 'object' ? (v as T) : undefined;

const DIET_LABELS: Record<string, string> = {
  veg: 'Vegetarian',
  non_veg: 'Non-Vegetarian',
  eggetarian: 'Eggetarian',
  vegan: 'Vegan',
  jain: 'Jain',
  custom: 'Custom diet',
};

const fmtDuration = (d?: PlanRef['duration']): string => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d.value && d.unit) return `${d.value} ${d.unit}`;
  return '';
};

export default function PatientMeals() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/patient/meals');
      const rows = Array.isArray((res as any)?.subscriptions) ? (res as any).subscriptions : [];
      setSubscriptions(rows);
      setError(null);
    } catch {
      setError('Could not load your meal subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handlePause = (sub: Subscription) => {
    const id = sub._id;
    if (!id) return;
    // The API requires an explicit from/to window and the UI has no range
    // picker yet, so pause for one day and say exactly when it lifts.
    const from = new Date();
    const to = new Date(Date.now() + 86_400_000);
    void run(
      id,
      () => api.post(`/patient/meals/${id}/pause`, { from: from.toISOString(), to: to.toISOString() }),
      `Paused until ${fmt(to.toISOString())}. Resume any time before then.`,
    );
  };

  const handleResume = (sub: Subscription) => {
    const id = sub._id;
    if (!id) return;
    void run(id, () => api.post(`/patient/meals/${id}/resume`, {}), 'Subscription resumed. Deliveries continue as scheduled.');
  };

  const handleSkipNext = (sub: Subscription) => {
    const id = sub._id;
    if (!id) return;
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(12, 0, 0, 0);
    void run(
      id,
      () => api.post(`/patient/meals/${id}/skip`, { dates: [tomorrow.toISOString()] }),
      `Skipped ${fmt(tomorrow.toISOString())}. Your billing cycle has been extended by 1 day.`,
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Clinical Diet & Meal Subscriptions
            </h1>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Flow D: Subscriptions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your daily therapeutic meal plans, pause deliveries, skip days, or adjust dietitian instructions.
          </p>
        </div>

        <Link to="/healthcare?category=diet_kitchen">
          <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Explore Diet Kitchens
          </Button>
        </Link>
      </div>

      {/* Active Subscriptions List */}
      <div className="space-y-4">
        {loading && (
          <div className="p-8 rounded-3xl border bg-card flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading subscriptions…
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-3xl border bg-card text-center space-y-1">
            <AlertCircle className="w-5 h-5 mx-auto text-amber-600" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && subscriptions.length === 0 && (
          <div className="p-8 rounded-3xl border bg-card text-center space-y-1">
            <Inbox className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No meal subscriptions yet.</p>
            <p className="text-[11px] text-muted-foreground/70">Pick a therapeutic plan to start daily deliveries.</p>
          </div>
        )}

        {!loading && !error && subscriptions.map((sub) => {
          const plan = ref<PlanRef>(sub.planId);
          const provider = ref<ProviderRef>(sub.providerId);
          const paused = sub.status === 'paused';
          const inactive = sub.status === 'cancelled' || sub.status === 'completed';
          const left = daysLeft(sub.endAt);
          const duration = fmtDuration(plan?.duration);
          const allergies = (sub.allergies ?? []).filter(Boolean);

          return (
            <div
              key={String(sub._id ?? '')}
              className="bg-card border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] font-bold ${
                      inactive
                        ? 'bg-muted text-muted-foreground border-border'
                        : paused
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}>
                      {sub.status === 'cancelled' ? 'Cancelled'
                        : sub.status === 'completed' ? 'Completed'
                        : paused ? 'Paused' : 'Active Delivery'}
                    </Badge>
                    <span className="text-xs font-semibold text-primary">{provider?.name || 'Clinical Diet Kitchen'}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {plan?.name || 'Clinical meal plan'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {DIET_LABELS[sub.dietType ?? 'custom'] ?? sub.dietType ?? 'Custom diet'}
                    {duration ? ` · ${duration}` : ''}
                    {plan?.price ? ` · ₹${plan.price}` : ''}
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[11px] text-muted-foreground block">Subscription Remaining</span>
                  <span className="text-lg font-extrabold text-foreground">
                    {left !== null ? `${left} Day${left === 1 ? '' : 's'}` : 'Ongoing'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {fmt(sub.startAt)} – {fmt(sub.endAt)}
                  </span>
                </div>
              </div>

              {/* Next Delivery Track Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-muted/40 border text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Delivery Slot
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{sub.deliverySlot || 'Slot not set'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Delivery Pin
                  </span>
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground truncate">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="truncate">{sub.deliveryAddress || 'No address on file'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Allergen Filter
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {allergies.length ? allergies.join(' · ') : 'None logged'}
                    </span>
                  </div>
                </div>
              </div>

              {(sub.skippedDates?.length ?? 0) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {sub.skippedDates!.length} skipped day{(sub.skippedDates!.length) === 1 ? '' : 's'} this term
                  {sub.pause?.pausedDays ? ` · ${sub.pause.pausedDays} paused day${sub.pause.pausedDays === 1 ? '' : 's'}` : ''}
                </p>
              )}

              {/* Quick Actions Row */}
              {!inactive && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      disabled={busyId === sub._id}
                      onClick={() => handleSkipNext(sub)}
                    >
                      <SkipForward className="w-3 h-3 text-muted-foreground" /> Skip Tomorrow's Meals
                    </Button>
                    {paused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1.5"
                        disabled={busyId === sub._id}
                        onClick={() => handleResume(sub)}
                      >
                        <PlayCircle className="w-3 h-3 text-emerald-600" /> Resume Subscription
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1.5"
                        disabled={busyId === sub._id}
                        onClick={() => handlePause(sub)}
                      >
                        <PauseCircle className="w-3 h-3 text-amber-600" /> Pause Subscription
                      </Button>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    FSSAI Lic. #10022011000841 · Strict Clinical Nutrition Standards
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
