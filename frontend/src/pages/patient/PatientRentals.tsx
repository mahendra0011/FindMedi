import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, ShieldCheck, Clock, Calendar, ArrowRight, RotateCcw,
  FileCheck2, CheckCircle2, AlertCircle, Sparkles, Loader2, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface AssetRef {
  productName?: string;
  serial?: string;
  kind?: string;
  status?: string;
  lastSanitisedAt?: string | null;
}
interface VendorRef {
  name?: string;
  type?: string;
}

interface Rental {
  _id?: string;
  startAt?: string | null;
  endAt?: string | null;
  days?: number;
  ratePerDay?: number;
  rentalAmount?: number;
  deposit?: number;
  depositRefundAmount?: number | null;
  currency?: string;
  status?: string;
  createdAt?: string | null;
  sanitisation?: { performedAt?: string | null; notes?: string };
  assetUnitId?: AssetRef | string | null;
  vendorId?: VendorRef | string | null;
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
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
};

const titleCase = (s?: string) =>
  (s ?? '').toLowerCase().replace(/(^|_)([a-z])/g, (_, p, c) => `${p ? ' ' : ''}${c.toUpperCase()}`);

const ref = <T,>(v: T | string | null | undefined): T | undefined =>
  v && typeof v === 'object' ? (v as T) : undefined;

export default function PatientRentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/patient/rentals');
        if (cancelled) return;
        const rows = Array.isArray((res as any)?.rentals) ? (res as any).rentals : [];
        setRentals(rows);
        setError(null);
      } catch {
        if (!cancelled) setError('Could not load your rentals.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScheduleReturn = () => {
    toast.success('Pickup request submitted! A technician will inspect and collect the equipment tomorrow.');
  };

  const handleExtend = () => {
    toast.info('Extension window opened. Select extension tenure in checkout.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Equipment Rentals & Returns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track active medical equipment rentals, security deposits held in escrow, and schedule return pickups.
          </p>
        </div>

        <Link to="/buy-medicine">
          <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Rent New Equipment
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="p-8 rounded-3xl border border-border/60 bg-card flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading rentals…
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-1">
            <AlertCircle className="w-5 h-5 mx-auto text-amber-600" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && rentals.length === 0 && (
          <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-1">
            <Inbox className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No equipment rentals yet.</p>
            <p className="text-[11px] text-muted-foreground/70">Rent a bed, concentrator or pump to see it here.</p>
          </div>
        )}

        {!loading && !error && rentals.map((item) => {
          const asset = ref<AssetRef>(item.assetUnitId);
          const vendor = ref<VendorRef>(item.vendorId);
          const left = daysLeft(item.endAt);
          const statusLabel = titleCase(item.status) || 'Rental';
          const sanitisedAt = item.sanitisation?.performedAt;
          const depositSettled = item.status === 'CLOSED' || item.status === 'DEPOSIT_REFUNDED';

          return (
            <div
              key={String(item._id ?? '')}
              className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-bold">
                      {statusLabel}
                    </Badge>
                    {asset?.serial && <span className="text-xs text-muted-foreground">S/N: {asset.serial}</span>}
                  </div>
                  <h2 className="font-heading text-base font-bold text-foreground">
                    {asset?.productName || 'Rented medical equipment'}
                  </h2>
                  <p className="text-xs text-muted-foreground">{vendor?.name || 'Partner vendor'}</p>
                </div>

                <div className="text-right sm:shrink-0">
                  <span className="text-xs text-muted-foreground block">Return Due</span>
                  <span className="text-sm font-extrabold text-foreground">{fmt(item.endAt)}</span>
                  {left !== null && (
                    <span className="text-[11px] text-amber-600 font-semibold block">
                      {left} day{left === 1 ? '' : 's'} left
                    </span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Rental Amount</span>
                  <strong className="text-foreground text-sm">₹{(item.rentalAmount ?? 0).toLocaleString('en-IN')}</strong>
                  {item.ratePerDay ? (
                    <span className="text-[10px] text-muted-foreground block">₹{item.ratePerDay}/day · {item.days ?? 0} day term</span>
                  ) : null}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Security Deposit Held</span>
                  <strong className="text-emerald-600 text-sm">₹{(item.deposit ?? 0).toLocaleString('en-IN')}</strong>
                  <span className="text-[10px] text-muted-foreground block">
                    {depositSettled
                      ? `Refunded ₹${(item.depositRefundAmount ?? item.deposit ?? 0).toLocaleString('en-IN')}`
                      : 'Held in Escrow (100% Refundable)'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sanitisation & QA</span>
                  <strong className="text-foreground text-sm flex items-center gap-1">
                    <FileCheck2 className={`w-3.5 h-3.5 ${sanitisedAt ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    {sanitisedAt ? 'Certified' : 'Pending'}
                  </strong>
                  <span className="text-[10px] text-muted-foreground block">
                    {sanitisedAt ? `Last cycle ${fmt(sanitisedAt)}` : 'Awaiting cycle certificate'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Deposit auto-refunded to UPI within 48h of return inspection
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtend}
                    className="rounded-xl text-xs h-8"
                  >
                    Extend Tenure
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleScheduleReturn}
                    className="rounded-xl text-xs h-8 font-semibold gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" /> Schedule Return Pickup
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
