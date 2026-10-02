import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * ADM-M-06 - superadmin management for per-tenant API quotas.
 *
 * The enforcement lives server-side (tenantQuotaGuard at the end of `protect`);
 * this panel is the management half: platform default, per-hospital overrides,
 * live window usage and an audit-logged save/remove for every change. Fail-soft:
 * a listing failure keeps the last data and toasts - an admin page that blanks
 * itself is useless exactly when quotas matter.
 */
interface QuotaValue {
  windowMs: number;
  max: number;
}

interface QuotaOverride extends QuotaValue {
  hospitalId: string;
}

interface QuotaListing {
  default: QuotaValue;
  defaultSource: string;
  overrides: QuotaOverride[];
  usage: Record<string, number>;
}

const ID_PATTERN = /^(default|[0-9a-f]{24})$/;

function TenantQuotas() {
  const [listing, setListing] = useState<QuotaListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState('');
  const [windowSec, setWindowSec] = useState('60');
  const [max, setMax] = useState('1000');
  const [saving, setSaving] = useState(false);

  const fetchQuotas = useCallback(async () => {
    try {
      setListing((await api.getTenantQuotas()) as QuotaListing);
    } catch {
      toast.error('Failed to load tenant quotas');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuotas(); }, [fetchQuotas]);

  const save = async () => {
    const id = hospitalId.trim();
    if (!ID_PATTERN.test(id)) {
      toast.error('Hospital ID must be a 24-hex ObjectId or "default"');
      return;
    }
    const windowMs = Number(windowSec) * 1000;
    const maxVal = Number(max);
    if (!Number.isFinite(windowMs) || windowMs < 1000 || windowMs > 3600000) {
      toast.error('Window must be between 1 and 3600 seconds');
      return;
    }
    if (!Number.isInteger(maxVal) || maxVal < 1 || maxVal > 1000000) {
      toast.error('Max must be a whole number between 1 and 1000000');
      return;
    }
    setSaving(true);
    try {
      await api.setTenantQuota(id, { windowMs, max: maxVal });
      toast.success(id === 'default' ? 'Platform default updated' : 'Tenant quota saved');
      setHospitalId('');
      fetchQuotas();
    } catch {
      toast.error('Failed to save quota');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteTenantQuota(id);
      toast.success('Override removed - tenant reverted to the platform default');
      fetchQuotas();
    } catch {
      toast.error('Failed to remove override');
    }
  };

  const edit = (q: QuotaValue, id: string) => {
    setHospitalId(id);
    setWindowSec(String(Math.round(q.windowMs / 1000)));
    setMax(String(q.max));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="bg-card rounded-xl border p-4 space-y-4">
      <div>
        <p className="font-medium text-foreground text-sm">Tenant API Quotas</p>
        <p className="text-xs text-muted-foreground">
          Sliding-window request quota per hospital, enforced on every authenticated tenant request.
          Fail-open: Redis outages never block hospital traffic.
        </p>
      </div>

      {listing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Platform default</span>
            <Badge variant="outline">{listing.defaultSource === 'override' ? 'overridden' : 'built-in'}</Badge>
            <span className="text-xs text-muted-foreground">
              {listing.default.max} req / {Math.round(listing.default.windowMs / 1000)}s
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => edit(listing.default, 'default')}>
            Edit default
          </Button>
        </div>
      )}

      {listing && listing.overrides.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {listing.overrides.map((row) => (
            <li key={row.hospitalId} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-xs text-foreground break-all">{row.hospitalId}</span>
                <span className="text-xs text-muted-foreground">
                  {row.max} req / {Math.round(row.windowMs / 1000)}s - in window now: {listing.usage[row.hospitalId] ?? 0}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(row, row.hospitalId)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(row.hospitalId)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {listing && listing.overrides.length === 0 && (
        <p className="text-xs text-muted-foreground">No hospital overrides - every tenant runs on the platform default.</p>
      )}

      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Hospital ID (or &quot;default&quot;)</span>
          <Input
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            placeholder="64b0... or default"
            className="font-mono text-xs"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Window (s)</span>
          <Input
            type="number"
            min={1}
            max={3600}
            value={windowSec}
            onChange={(e) => setWindowSec(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Max requests</span>
          <Input
            type="number"
            min={1}
            max={1000000}
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving...' : 'Save quota'}
        </Button>
      </form>
    </section>
  );
}

export default TenantQuotas;
