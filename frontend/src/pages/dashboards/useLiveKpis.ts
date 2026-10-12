/**
 * Wave 2 live-data helper — thin dashboards kept their RoleDashboardShell
 * config but previously rendered hard-coded demo numbers. This hook fetches
 * real KPIs from the backend and falls back to the static config values on
 * any error, so a role whose endpoint 403s/404s still renders a full shell.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Kpi } from './RoleDashboardShell';

export type KpiFetcher = () => Promise<Partial<Record<string, number | string>>>;

/** Keep static labels but override the `value` (and optional `hint`) with live data. */
export function mergeKpis(staticKpis: Kpi[], live?: Partial<Record<string, number | string>>): Kpi[] {
  if (!live) return staticKpis;
  return staticKpis.map((k) => {
    const key = k.label.toLowerCase();
    // direct label match first ("Available Beds" -> live.availableBeds or live['available beds'])
    const snake = key.replace(/[^a-z0-9]+([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    const direct = live[snake] ?? live[key] ?? live[k.label];
    if (direct === undefined || direct === null) return k;
    return { ...k, value: String(direct) };
  });
}

/** Fetch live KPI values. `fetcher` returns a flat map of label-slug -> value. */
export function useLiveKpis(fetcher: KpiFetcher, staticKpis: Kpi[]): Kpi[] {
  const [kpis, setKpis] = useState<Kpi[]>(staticKpis);
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((live) => {
        if (!cancelled && live) setKpis(mergeKpis(staticKpis, live));
      })
      .catch(() => {
        /* keep static fallback on any network/auth error */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return kpis;
}

export { api };
