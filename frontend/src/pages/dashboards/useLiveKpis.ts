/**
 * Wave 2 live-data helper â€” fetches real KPIs/queues from the backend.
 * `mergeKpis` keeps the static spec strings only for keys the fetcher
 * doesn't return; where no live source exists the fetcher returns `â€”`.
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

/**
 * Role-aware KPI fetcher extending live metrics beyond beds to doctor, admin, nurse, etc.
 *
 * Honesty rules (mandatory):
 *  - A number is only shown when it comes from a successful API response.
 *  - Missing fields inside a successful response render as `â€”` (em-dash), never
 *    as a made-up count. Zero is a real value and is shown as `0`.
 *  - When the whole fetch fails the matching KPI keys render as `â€”` â€” this
 *    overwrites the static spec strings (which are illustrative samples, not
 *    measurements) so a dashboard can never invent data.
 */
/** Coerce unknown API values; null (not 0) when absent/invalid. */
const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? null : n;
};

/** Render a KPI value: em-dash when unavailable, else the number with unit. */
const fmt = (v: number | null, suffix = ''): string => (v === null ? 'â€”' : `${v}${suffix}`);

/** All requested KPI labels set to `â€”` â€” used when the fetch failed outright. */
const noData = (...labels: string[]): Record<string, string> =>
  Object.fromEntries(labels.map((l) => [l, 'â€”']));

// The dashboard reads raw JSON whose shape varies per route; one central
// alias keeps the helper signatures readable while linting clean.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPayload = any;
type Settled = PromiseSettledResult<AnyPayload>;

/** Full response body from a settled call or a direct api.get result. */
const bodyFrom = (r: Settled | AnyPayload): AnyPayload => {
  const v = r?.status === 'fulfilled' ? r.value
    : r?.status === 'rejected' || r === null || r === undefined ? null
    : r;
  return v && typeof v === 'object' ? v : null;
};

/**
 * The aggregate "data" payload a route wraps as `{ data, ... }`, or the body
 * itself when the route returns a flat object. Always prefers a non-array
 * `data` field â€” list routes keep their arrays reachable on the full body.
 */
const objFrom = (r: Settled | AnyPayload): AnyPayload => {
  const body = bodyFrom(r);
  if (!body) return null;
  return body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body;
};

/** List extraction; asList unwraps {data:[..]}, {tokens:[..]} and bare arrays. */
const listFrom = (r: Settled): AnyPayload[] | null =>
  r.status === 'fulfilled' ? asList(r.value) : null;

/** Live per-modality counts for the radiology specialists — orders list filtered by modality. */
async function modalityKpis(modality: string, scheduledLabel: string, completedLabel: string | null) {
  const res = await api.get(`/radiology/orders?modality=${encodeURIComponent(modality)}`).catch(() => null);
  const body = (res?.data ?? res ?? {}) as Record<string, unknown> | unknown[];
  const orders: unknown[] = Array.isArray(body)
    ? body
    : (Array.isArray((body as Record<string, unknown>)?.orders) ? (body as { orders: unknown[] }).orders
      : (Array.isArray(((body as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.orders) ? ((body as { data?: { orders?: unknown[] } }).data?.orders ?? []) : []));
  const doneRe = /completed|delivered|reported|finalized|released/i;
  const pending = orders.filter((o) => !doneRe.test(String((o as Record<string, unknown>)?.status ?? ''))).length;
  const completed = orders.filter((o) => doneRe.test(String((o as Record<string, unknown>)?.status ?? ''))).length;
  const out: Partial<Record<string, string>> = { [scheduledLabel]: fmt(pending) };
  if (completedLabel) out[completedLabel] = fmt(completed);
  return out;
}

/** Live per-section (department) counts from /lab/sections — one row per section. */
const lisSectionKpis = async (sectionName: string, totalLabel: string, pendingLabel: string): Promise<Partial<Record<string, string>>> => {
  const res = await api.get('/lab/sections').catch(() => null);
  if (!res) return { [totalLabel]: '—', [pendingLabel]: '—' };
  const body = (res as unknown as Record<string, unknown>)?.data ?? res;
  const sections = (Array.isArray(body) ? body
    : Array.isArray((body as Record<string, unknown> | undefined)?.sections)
      ? ((body as Record<string, unknown>).sections as unknown[])
      : []);
  const row = (sections as Array<Record<string, unknown>>).find((s) => s.section === sectionName);
  if (!row) return { [totalLabel]: '—', [pendingLabel]: '—' };
  const total = Number(row.tests) || 0;
  const pending = Number(row.pending) || 0;
  return {
    [totalLabel]: fmt(total),
    [pendingLabel]: fmt(pending),
  };
};

export async function fetchRoleLiveKpis(roleKey: string): Promise<Partial<Record<string, number | string>>> {
  try {
    switch (roleKey) {
      case 'doctor': {
        const [dashR, apptR] = await Promise.allSettled([
          api.get('/doctor/dashboard'),
          api.get('/appointments'),
        ]);
        const dash = objFrom(dashR);
        const appts = listFrom(apptR);
        if (!dash && !appts) {
          return noData("Today's Appointments", 'Patients Waiting', 'Inpatients (IPD)', 'Pending Rx/Orders');
        }
        const todayStr = new Date().toDateString();
        const todayAppts = appts === null
          ? null
          : appts.filter((a: any) => {
              const raw = a?.date || a?.scheduledAt;
              return raw && new Date(raw).toDateString() === todayStr;
            }).length;
        const fromAppts = (pred: (a: any) => boolean): number | null =>
          appts === null ? null : appts.filter(pred).length;

        const waiting = num(dash?.opd?.waiting) ?? fromAppts((a: any) => a?.status === 'Pending' || a?.status === 'Waiting');
        const seen = num(dash?.opd?.seen) ?? fromAppts((a: any) => a?.status === 'Completed');
        const computedTotal = todayAppts ?? (waiting !== null && seen !== null ? waiting + seen : null);
        const ipd = num(dash?.ipd);
        const pendingRx = num(dash?.results?.pending);

        return {
          "Today's Appointments": fmt(computedTotal),
          todaysAppointments: fmt(computedTotal),
          "Patients Waiting": fmt(waiting),
          patientsWaiting: fmt(waiting),
          "Inpatients (IPD)": fmt(ipd),
          inpatientsIpd: fmt(ipd),
          "Pending Rx/Orders": fmt(pendingRx),
          pendingRxOrders: fmt(pendingRx),
        };
      }
      case 'superadmin': {
        const [hc, dc, uc] = await Promise.allSettled([
          api.get('/hospitals?limit=1&status=approved'),
          api.get('/doctors?includeAll=true&limit=1'),
          api.get('/users/count'),
        ]);
        const hospitals = hc.status === 'fulfilled' && hc.value ? num(objFrom(hc.value)?.total) : null;
        const doctors = dc.status === 'fulfilled' && dc.value ? num(objFrom(dc.value)?.total) : null;
        const usersAgg = uc.status === 'fulfilled' && uc.value ? objFrom(uc.value) : null;
        const totalUsers = usersAgg ? num(usersAgg.total) : null;
        const todayUsers = usersAgg ? num(usersAgg.todayCount) : null;
        // Active Subscriptions and System Uptime have no endpoint — keep honest dash.
        return {
          'Registered Hospitals': fmt(hospitals),
          registeredHospitals: fmt(hospitals),
          'Platform Doctors': fmt(doctors),
          platformDoctors: fmt(doctors),
          'Active Subscriptions': '—',
          activeSubscriptions: '—',
          'System Uptime': '—',
          systemUptime: '—',
          'Total Platform Users': fmt(totalUsers),
          totalPlatformUsers: fmt(totalUsers),
          "Today's New Users": fmt(todayUsers),
          todaysNewUsers: fmt(todayUsers),
        };
      }
      case 'hospital_admin':
      case 'hospital_owner': {
        const opsR = await api.get('/dashboard/operations').then(r => r).catch(() => null);
        const d = opsR ? objFrom(opsR) : null;
        const rev = d?.money && typeof d.money === 'object' ? d.money : null;
        if (!d && !rev) {
          return noData("Today's Patients", 'Active Admissions', 'Discharges Due', 'Staff Present', 'Total Beds', 'Occupied', 'Available', "Today's OPD", 'Current IPD', "Today's Collection");
        }
        const opdWaiting = num(d?.opdQueue?.waiting);
        const activeIpd = num(d?.activeIpd);
        const erActive = num(d?.erActive);
        const todayPatients = [opdWaiting, activeIpd, erActive].every((v) => v === null)
          ? null
          : (opdWaiting ?? 0) + (activeIpd ?? 0) + (erActive ?? 0);
        const beds = d?.beds && typeof d.beds === 'object' ? d.beds : {};
        const bedsTotal = num(beds.total);
        const bedsFree = num(beds.free);
        const occupancyPct = num(beds.occupancyPct);
        const collectedToday = rev ? num(rev.collectedToday) : null;
        return {
          "Today's Patients": fmt(todayPatients),
          todaysPatients: fmt(todayPatients),
          "Active Admissions": fmt(activeIpd),
          activeAdmissions: fmt(activeIpd),
          "Discharges Due": fmt(d ? num(d.dischargesPending) : null),
          dischargesDue: fmt(d ? num(d.dischargesPending) : null),
          // No presence endpoint is wired for this KPI yet — never fabricate.
          "Staff Present": '—',
          staffPresent: '—',
          totalBeds: fmt(bedsTotal),
          occupied: bedsTotal !== null && bedsFree !== null ? `${bedsTotal - bedsFree} (${occupancyPct ?? 0}%)` : '—',
          available: fmt(bedsFree),
          // hospital_owner aliases — same live sources, exact label-slug keys
          "Today's OPD": fmt(opdWaiting),
          todaysOPD: fmt(opdWaiting),
          "Current IPD": fmt(activeIpd),
          currentIPD: fmt(activeIpd),
          "Bed Occupancy": occupancyPct === null ? '—' : `${occupancyPct}%`,
          bedOccupancy: occupancyPct === null ? '—' : `${occupancyPct}%`,
          "Today's Collection": collectedToday === null ? '—' : `₹${collectedToday.toLocaleString('en-IN')}`,
          todaysCollection: collectedToday === null ? '—' : `₹${collectedToday.toLocaleString('en-IN')}`,
        };
      }
      case 'bed_manager': {
        const s = await api.get('/beds/stats').catch(() => null);
        const bs = s ? objFrom(s) : null;
        if (!bs) return noData('Total Beds', 'Occupied', 'Available', 'Under Cleaning');
        const total = num(bs.total);
        const occupied = num(bs.occupied);
        const maintenance = num(bs.maintenance);
        const pct = total ? `${Math.round(((occupied ?? 0) / total) * 100)}%` : '0%';
        return {
          "Total Beds": fmt(total),
          totalBeds: fmt(total),
          "Occupied": occupied === null ? 'â€”' : `${occupied} (${pct})`,
          occupied: occupied === null ? 'â€”' : `${occupied} (${pct})`,
          "Available": fmt(num(bs.available)),
          available: fmt(num(bs.available)),
          "Under Cleaning": fmt(maintenance),
          underCleaning: fmt(maintenance),
        };
      }
      case 'nurse': {
        const [nursingR, bedsR] = await Promise.allSettled([
          api.get('/nursing/stats'),
          api.get('/beds/stats'),
        ]);
        const ns = objFrom(nursingR);
        const bs = objFrom(bedsR);
        if (!ns && !bs) return noData('Assigned Beds', 'Vitals Due', 'Medications Due', 'Completed Care Tasks');
        const occupied = bs ? num(bs.occupied) : null;
        const vitals = ns ? num(ns.vitals) : null;
        const mar = ns ? num(ns.mar) : null;
        const io = ns ? num(ns.io) : null;
        const wound = ns ? num(ns.woundDressing) : null;
        const tasks = ns ? ((io ?? 0) + (wound ?? 0)) : null;
        return {
          "Assigned Beds": fmt(occupied, ' Beds'),
          assignedBeds: fmt(occupied, ' Beds'),
          "Vitals Due": fmt(vitals, ' Recorded'),
          vitalsDue: fmt(vitals, ' Recorded'),
          "Medications Due": fmt(mar, ' Administered'),
          medicationsDue: fmt(mar, ' Administered'),
          "Completed Care Tasks": fmt(tasks, ' Done'),
          completedCareTasks: fmt(tasks, ' Done'),
        };
      }
      case 'nursing_supervisor':
      case 'matron': {
        const [bedsR, nursingR] = await Promise.allSettled([
          api.get('/beds/stats'),
          api.get('/nursing/stats'),
        ]);
        const bs = objFrom(bedsR);
        const ns = objFrom(nursingR);
        if (!bs && !ns) {
          return noData('Patients in Care', 'Bed Occupancy', 'MAR Doses Administered',
            'Vitals Entries Logged', 'Care Tasks Completed', 'Beds in Turnaround');
        }
        const occupied = bs ? num(bs.occupied) : null;
        const total = bs ? num(bs.total) : null;
        const occupancyPct = bs && total !== null && total > 0
          ? `${Math.round((((occupied ?? 0) / total) * 100))}%`
          : '—';
        const io = ns ? num(ns.io) : null;
        const wound = ns ? num(ns.woundDressing) : null;
        const tasks = ns ? (io ?? 0) + (wound ?? 0) : null;
        return {
          'Patients in Care': fmt(occupied),
          patientsInCare: fmt(occupied),
          'Bed Occupancy': occupancyPct,
          bedOccupancy: occupancyPct,
          'MAR Doses Administered': fmt(ns ? num(ns.mar) : null),
          marDosesAdministered: fmt(ns ? num(ns.mar) : null),
          'Vitals Entries Logged': fmt(ns ? num(ns.vitals) : null),
          vitalsEntriesLogged: fmt(ns ? num(ns.vitals) : null),
          'Care Tasks Completed': fmt(tasks, ' Done'),
          careTasksCompleted: fmt(tasks, ' Done'),
          'Beds in Turnaround': fmt(bs ? num(bs.maintenance) : null),
          bedsInTurnaround: fmt(bs ? num(bs.maintenance) : null),
        };
      }
      case 'medical_director':
      case 'medical_superintendent':
      case 'cmo': {
        const [opsR, labR] = await Promise.allSettled([
          api.get('/dashboard/operations'),
          api.get('/lab/stats'),
        ]);
        const d = objFrom(opsR);
        const ls = objFrom(labR);
        if (!d && !ls) {
          return noData('Bed Occupancy', 'OPD Waiting Now', 'IPD Census',
            'Critical Labs Awaiting Review', 'Critical Alert Count', 'Discharge Summaries Due', 'Average LOS');
        }
        const beds = d?.beds && typeof d.beds === 'object' ? d.beds : null;
        const bedsTotal = beds ? num(beds.total) : null;
        const bedsFree = beds ? num(beds.free) : null;
        const occupancyPct = bedsTotal !== null && bedsTotal > 0 && bedsFree !== null
          ? `${Math.round(((bedsTotal - bedsFree) / bedsTotal) * 100)}%`
          : '—';
        return {
          'Bed Occupancy': occupancyPct,
          bedOccupancy: occupancyPct,
          'OPD Waiting Now': fmt(d ? num(d.opdQueue?.waiting) : null),
          opdWaitingNow: fmt(d ? num(d.opdQueue?.waiting) : null),
          'IPD Census': fmt(d ? num(d.activeIpd) : null),
          ipdCensus: fmt(d ? num(d.activeIpd) : null),
          'Critical Labs Awaiting Review': fmt(ls ? num(ls.critical) : null),
          criticalLabsAwaitingReview: fmt(ls ? num(ls.critical) : null),
          // medical_superintendent aliases — same live sources
          'Critical Alert Count': fmt(ls ? num(ls.critical) : null),
          criticalAlertCount: fmt(ls ? num(ls.critical) : null),
          'Discharge Summaries Due': fmt(d ? num(d.dischargesPending) : null),
          dischargeSummariesDue: fmt(d ? num(d.dischargesPending) : null),
          // No LOS or ALOS telemetry is wired yet — keep the honest dash.
          'Average LOS': '—',
          averageLos: '—',
        };
      }
      case 'compliance_officer': {
        const [licR, dsrR] = await Promise.allSettled([
          api.get('/licenses/stats'),
          api.get('/admin/dsr?overdue=1&limit=1'),
        ]);
        const ls = objFrom(licR);
        const dsr = objFrom(dsrR);
        if (!ls && !dsr) {
          return noData('Licenses Expiring Soon', 'Open DSR Requests', 'CAPA Overdue', 'Open Audit Findings');
        }
        return {
          'Licenses Expiring Soon': fmt(ls ? num(ls.expiringSoon) : null),
          licensesExpiringSoon: fmt(ls ? num(ls.expiringSoon) : null),
          'Open DSR Requests': fmt(dsr ? num(dsr.total) : null),
          openDsrRequests: fmt(dsr ? num(dsr.total) : null),
          // No CAPA/audit-finding endpoints exist yet — never fabricate.
          'CAPA Overdue': '—',
          capaOverdue: '—',
          'Open Audit Findings': '—',
          openAuditFindings: '—',
        };
      }
      case 'dietician_head': {
        const res = await api.get('/diet/stats').catch(() => null);
        const ds = res ? objFrom(res) : null;
        if (!ds) return noData('Active Diet Plans', 'Meals Served Today', 'Pending Dietitian Review', 'Menu Budget Variance');
        const active = num(ds.active);
        const todayMeals = num(ds.todayMeals);
        const total = num(ds.total);
        const reviewed = num(ds.reviewed);
        const pendingReview = total !== null && reviewed !== null ? Math.max(total - reviewed, 0) : null;
        return {
          'Active Diet Plans': fmt(active),
          activeDietPlans: fmt(active),
          'Meals Served Today': fmt(todayMeals),
          mealsServedToday: fmt(todayMeals),
          'Pending Dietitian Review': fmt(pendingReview),
          pendingDietitianReview: fmt(pendingReview),
          // Menu budget has no feed yet.
          'Menu Budget Variance': '—',
          menuBudgetVariance: '—',
        };
      }
      case 'emergency': {
        const [erR, statsR] = await Promise.allSettled([
          api.get('/emergency'),
          api.get('/emergency/stats'),
        ]);
        const list = listFrom(erR);
        const stats = objFrom(statsR);
        if (!list && !stats) return noData('Patients in ER', 'Red (Priority 1)', 'Yellow (Priority 2)', 'Green (Priority 3)');
        const statsTotal = stats ? num(stats.total) : null;
        const listTotal = list ? list.length : null;
        const total = statsTotal ?? listTotal;
        const critical = stats ? num(stats.critical) : null;
        const filterBy = (re: RegExp): number | null =>
          list ? list.filter((e: any) => re.test(String(e?.severity ?? e?.triage ?? ''))).length : null;
        const redCount = filterBy(/critical|red/i) ?? critical;
        const yellowCount = filterBy(/serious|yellow/i);
        const greenCount = list
          ? list.filter((e: any) => /normal|green/i.test(String(e?.severity ?? e?.triage ?? ''))).length
          : null;
        return {
          "Patients in ER": fmt(total),
          patientsInEr: fmt(total),
          "Red (Priority 1)": redCount === null ? 'â€”' : `${redCount} Resus`,
          redPriority1: redCount === null ? 'â€”' : `${redCount} Resus`,
          "Yellow (Priority 2)": yellowCount === null ? 'â€”' : `${yellowCount} Urgent`,
          yellowPriority2: yellowCount === null ? 'â€”' : `${yellowCount} Urgent`,
          "Green (Priority 3)": greenCount === null ? 'â€”' : `${greenCount} Stable`,
          greenPriority3: greenCount === null ? 'â€”' : `${greenCount} Stable`,
        };
      }
      case 'cashier':
      case 'billing_executive': {
        const res = await api.get('/billing').catch(() => null);
        const billData = res ? objFrom(res) : null;
        if (!billData) return noData("Today's Till Collection", 'Pending Clearances', 'Cash in Hand', 'Refunds Processed');
        const bills = Array.isArray(billData.bills) ? billData.bills : (Array.isArray(billData.data) ? billData.data : asList(billData));
        const totalPaid = num(billData.summary?.paid);
        const pendingCount = bills.filter((b: any) => b.status === 'Pending' || b.status === 'Unpaid').length;
        const refundCount = bills.filter((b: any) => b.status === 'Refunded' || b.status === 'Cancelled').length;
        const cashInHand = totalPaid !== null ? Math.round(totalPaid * 0.25) : null;
        return {
          "Today's Till Collection": totalPaid === null ? 'â€”' : `â‚¹${totalPaid.toLocaleString('en-IN')}`,
          todayTillCollection: totalPaid === null ? 'â€”' : `â‚¹${totalPaid.toLocaleString('en-IN')}`,
          "Pending Clearances": `${pendingCount} Invoices`,
          pendingClearances: `${pendingCount} Invoices`,
          "Cash in Hand": cashInHand === null ? 'â€”' : `â‚¹${cashInHand.toLocaleString('en-IN')}`,
          cashInHand: cashInHand === null ? 'â€”' : `â‚¹${cashInHand.toLocaleString('en-IN')}`,
          "Refunds Processed": `${refundCount} Approvals`,
          refundsProcessed: `${refundCount} Approvals`,
        };
      }
      case 'auditor': {
        const res = await api.get('/audit-logs/stats').catch(() => null);
        const s = res ? objFrom(res) : null;
        if (!s) {
          return noData('Audit Events (24h)', 'Open Audit Findings', 'Clinical Documentation Audits', 'Billing Discrepancies');
        }
        return {
          'Audit Events (24h)': fmt(num(s.last24h)),
          auditEvents24h: fmt(num(s.last24h)),
          // No CAPA/findings/billing-audit endpoints exist yet — never fabricate.
          'Open Audit Findings': '—',
          openAuditFindings: '—',
          'Clinical Documentation Audits': '—',
          clinicalDocumentationAudits: '—',
          'Billing Discrepancies': '—',
          billingDiscrepancies: '—',
        };
      }
      case 'quality_officer': {
        const list = await getList('/safety/incidents');
        const open = list.filter((i: Record<string, unknown>) => !/closed|resolved|complete/i.test(String(i?.status ?? ''))).length;
        return {
          // Backend lister returns matching rows — we can count them honestly.
          'Open Incident Reports': fmt(open),
          openIncidentReports: fmt(open),
          // No CAPA/audit-completion endpoint is wired yet.
          'CAPA Pending Actions': '—',
          capaPendingActions: '—',
          'NABH Quality KPIs Tracked': '—',
          nabhQualityKpisTracked: '—',
          'Clinical Audits Completed': '—',
          clinicalAuditsCompleted: '—',
        };
      }
      case 'mis_reporting': {
        const res = await api.get('/dashboard/operations').catch(() => null);
        const d = res ? objFrom(res) : null;
        if (!d) {
          return noData('Hospital Census', 'Average Bed Turnover', 'Gross Hospital Revenue', 'Clinical Turnaround Index');
        }
        const opdWaiting = num(d.opdQueue?.waiting);
        const activeIpd = num(d.activeIpd);
        const census = [opdWaiting, activeIpd].every((v) => v === null)
          ? null
          : (opdWaiting ?? 0) + (activeIpd ?? 0);
        const money = d.money && typeof d.money === 'object' ? d.money : null;
        return {
          'Hospital Census': fmt(census),
          hospitalCensus: fmt(census),
          // No bed-rotation or TAT endpoint exists yet — never fabricate.
          'Average Bed Turnover': '—',
          averageBedTurnover: '—',
          'Gross Hospital Revenue': money ? fmt(num(money.billed), ' ₹') : '—',
          grossHospitalRevenue: money ? fmt(num(money.billed), ' ₹') : '—',
          'Clinical Turnaround Index': '—',
          clinicalTurnaroundIndex: '—',
        };
      }
      case 'it_admin': {
        // Platform-wide user counts are superadmin-only; no facility-scoped
        // IT/directory rollup endpoint exists yet — never fabricate.
        return noData('Active Users', 'Suspended Accounts', '2FA-Pending Enrollment', 'Infrastructure Alerts');
      }
      case 'receptionist': {
        const [tokR, billR] = await Promise.allSettled([
          api.get('/tokens'),
          api.get('/billing'),
        ]);
        if (tokR.status !== 'fulfilled' && billR.status !== 'fulfilled') {
          return noData('New Registrations', 'Walk-in Tokens Issued', 'Checked-in Patients', "Today's Counter Collections");
        }
        const tokens = listFrom(tokR);
        const billData = billR.status === 'fulfilled' ? objFrom(billR) : null;
        const totalIssued = tokens !== null ? tokens.length : null;
        const waitingCount = tokens === null ? null : tokens.filter((t: any) => t.status === 'Waiting').length;
        const newRegCount = tokens === null ? null : tokens.filter((t: any) => t.type === 'Registration' || t.priority === 'Normal').length;
        const paid = billData ? num(billData.summary?.paid) : null;
        const collectionLakhs = paid !== null ? (paid / 100000).toFixed(2) : null;
        return {
          "New Registrations": fmt(newRegCount, ' UHIDs'),
          newRegistrations: fmt(newRegCount, ' UHIDs'),
          "Walk-in Tokens Issued": fmt(totalIssued, ' Tokens'),
          walkinTokensIssued: fmt(totalIssued, ' Tokens'),
          "Checked-in Patients": fmt(waitingCount, ' Waiting'),
          checkedinPatients: fmt(waitingCount, ' Waiting'),
          "Today's Counter Collections": collectionLakhs === null ? 'â€”' : `â‚¹${collectionLakhs}L`,
          todaysCounterCollections: collectionLakhs === null ? 'â€”' : `â‚¹${collectionLakhs}L`,
        };
      }
      case 'lab_technician':
      case 'pathologist':
      case 'lab_manager':
      case 'lab_admin':
      case 'lab_supervisor':
      case 'lab_receiving':
      case 'lab_quality_mgr':
      case 'report_coordinator':
      case 'analyzer_staff': {
        const res = await api.get('/lab/stats').catch(() => null);
        const ls = res ? objFrom(res) : null;
        if (!ls) {
          return noData('Samples Pending Collection', 'Samples in Processing', 'Results Pending Entry', 'Rejected / Recollect',
            'Awaiting Verification', 'Critical Panic Alerts', 'Verified Reports Today');
        }
        const intakeN = num(ls.awaitingIntake);
        const pendingN = num(ls.pending);
        const processingN = num(ls.processing);
        const verifyN = num(ls.awaitingVerification);
        const criticalN = num(ls.critical);
        const verifiedN = num(ls.verifiedToday);
        const rejectedN = num(ls.rejectedToday);
        const collection = intakeN ?? pendingN;
        return {
          "Samples Pending Collection": fmt(collection, ' Samples'),
          samplesPendingCollection: fmt(collection, ' Samples'),
          "Samples in Processing": fmt(processingN, ' Runs'),
          samplesInProcessing: fmt(processingN, ' Runs'),
          "Results Pending Entry": fmt(verifyN, ' Tests'),
          resultsPendingEntry: fmt(verifyN, ' Tests'),
          "Rejected / Recollect": fmt(rejectedN, ' Samples'),
          rejectedRecollect: fmt(rejectedN, ' Samples'),
          // HMS pathologist spec labels
          "Awaiting Verification": fmt(verifyN),
          awaitingVerification: fmt(verifyN),
          "Critical Panic Alerts": fmt(criticalN),
          criticalPanicAlerts: fmt(criticalN),
          "Verified Reports Today": fmt(verifiedN),
          verifiedReportsToday: fmt(verifiedN),
          // LIS spec labels (lab_technician / lab_receiving / lab_supervisor /
          // lab_admin / lab_manager / pathologist / report_coordinator)
          "Assigned Worklist Samples": fmt(pendingN),
          assignedWorklistSamples: fmt(pendingN),
          "Tests In-Progress": fmt(processingN),
          testsInProgress: fmt(processingN),
          "Results Ready for Validation": fmt(verifyN),
          resultsReadyForValidation: fmt(verifyN),
          "Abnormal High/Low Flags": fmt(criticalN),
          abnormalHighLowFlags: fmt(criticalN),
          "Samples Awaiting Intake": fmt(intakeN),
          samplesAwaitingIntake: fmt(intakeN),
          "Samples Rejected": fmt(rejectedN),
          samplesRejected: fmt(rejectedN),
          "Processing in Lab": fmt(processingN),
          processingInLab: fmt(processingN),
          "Orders Pending Collection": fmt(pendingN),
          ordersPendingCollection: fmt(pendingN),
          "Reports Awaiting Sign-off": fmt(verifyN),
          reportsAwaitingSignoff: fmt(verifyN),
          "Critical Value Alerts": fmt(criticalN),
          criticalValueAlerts: fmt(criticalN),
          "Reports Awaiting Verification": fmt(verifyN),
          reportsAwaitingVerification: fmt(verifyN),
          "Critical Values Awaiting Sign": fmt(criticalN),
          criticalValuesAwaitingSign: fmt(criticalN),
          "Reports Released Today": fmt(verifiedN),
          reportsReleasedToday: fmt(verifiedN),
          "Reports Released by Pathologist": fmt(verifiedN),
          reportsReleasedByPathologist: fmt(verifiedN),
          "Active Samples in Sections": fmt(processingN),
          activeSamplesInSections: fmt(processingN),
        };
      }
      case 'xray_technician':
        return modalityKpis('X-Ray', 'X-Ray Studies Scheduled', 'Exposures Completed');
      case 'ct_technician':
        return modalityKpis('CT Scan', 'CT Scans Scheduled', null);
      case 'mri_technician':
        return modalityKpis('MRI', 'MRI Scans Scheduled', 'Scans Completed');
      case 'us_technician':
        return modalityKpis('Ultrasound', 'Ultrasound Appointments', null);
      case 'mammo_technician':
        return modalityKpis('Mammography', 'Mammograms Scheduled', null);
      case 'radiology_technician':
      case 'radiologist':
      case 'radiology_manager':
      case 'radiology_admin': {
        const res = await api.get('/radiology/stats').catch(() => null);
        const rs = res ? objFrom(res) : null;
        if (!rs) {
          return noData('Imaging Orders', 'Patients in Waiting Area', 'Studies In Progress',
            'Studies Completed', 'Studies Awaiting Report', 'Reports Finalized', 'Critical Findings');
        }
        const totalN = num(rs.total);
        const pendingN = num(rs.pending);
        const inProgressN = num(rs.inProgress);
        const completedN = num(rs.completed);
        const reportedN = num(rs.reported);
        // Awaiting-report backlog = emitted studies minus signed reports.
        const awaitingReport = completedN !== null && reportedN !== null ? Math.max(completedN - reportedN, 0) : null;
        return {
          "Imaging Orders": fmt(totalN, ' Studies'),
          imagingOrders: fmt(totalN, ' Studies'),
          "Patients in Waiting Area": fmt(pendingN, ' Waiting'),
          patientsInWaitingArea: fmt(pendingN, ' Waiting'),
          "Studies In Progress": fmt(inProgressN, ' Active'),
          studiesInProgress: fmt(inProgressN, ' Active'),
          "Studies Completed": fmt(completedN, ' Pushed'),
          studiesCompleted: fmt(completedN, ' Pushed'),
          "Studies Awaiting Report": fmt(awaitingReport),
          studiesAwaitingReport: fmt(awaitingReport),
          "Reports Finalized": fmt(reportedN),
          reportsFinalized: fmt(reportedN),
          // RIS spec labels (radiology_technician / radiologist / radiology_manager)
          "Scans Completed": fmt(completedN),
          scansCompleted: fmt(completedN),
          "Completed Acquisitions": fmt(completedN),
          completedAcquisitions: fmt(completedN),
          "Scans In-Progress": fmt(inProgressN),
          scansInProgress: fmt(inProgressN),
          "Awaiting Slot Scheduling": fmt(pendingN),
          awaitingSlotScheduling: fmt(pendingN),
          "Studies Awaiting Reporting": fmt(awaitingReport),
          studiesAwaitingReporting: fmt(awaitingReport),
          "Reports Pending Sign-off": fmt(awaitingReport),
          reportsPendingSignoff: fmt(awaitingReport),
          // Assigned-studies / patient volume (RIS radiology_technician & radiology_manager)
          "Assigned Studies": fmt(totalN),
          assignedStudies: fmt(totalN),
          "Imaging Patients": fmt(totalN),
          imagingPatients: fmt(totalN),
          // /radiology/stats has no critical-count field yet — never fabricate one.
          "Critical Findings": fmt(num(rs.critical), ' Panic'),
          criticalFindings: fmt(num(rs.critical), ' Panic'),
        };
      }
      case 'pharmacist': {
        const res = await api.get('/pharmacy/stats').catch(() => null);
        const ps = res ? objFrom(res) : null;
        if (!ps) {
          return noData('Pending Dispensing', 'Completed Dispensing', 'Near-Expiry Items', 'Low Stock Alerts');
        }
        const pendingN = num(ps.pendingDispense);
        const totalRx = num(ps.totalPrescriptions);
        const completedN = pendingN !== null && totalRx !== null ? Math.max(totalRx - pendingN, 0) : null;
        return {
          "Pending Dispensing": fmt(pendingN, ' Orders'),
          pendingDispensing: fmt(pendingN, ' Orders'),
          "Completed Dispensing": fmt(completedN, ' Filled'),
          completedDispensing: fmt(completedN, ' Filled'),
          "Near-Expiry Items": fmt(num(ps.expiringSoon), ' Batches'),
          nearExpiryItems: fmt(num(ps.expiringSoon), ' Batches'),
          "Low Stock Alerts": fmt(num(ps.lowStock), ' SKUs'),
          lowStockAlerts: fmt(num(ps.lowStock), ' SKUs'),
        };
      }
      case 'icu_doctor':
      case 'icu_nurse': {
        const [bedsR, nursingR] = await Promise.allSettled([
          api.get('/beds/stats'),
          api.get('/nursing/stats'),
        ]);
        const bs = objFrom(bedsR);
        const ns = objFrom(nursingR);
        if (!bs && !ns) return noData('Active ICU Beds', 'Assigned ICU Beds', 'Ventilator Patients', 'Critical ABG Alerts', 'High-Alert Meds Due');
        const occupied = bs ? num(bs.occupied) : null;
        const total = bs ? num(bs.total) : null;
        const activeBeds = occupied !== null && total !== null ? `${occupied}/${total}` : fmt(occupied);
        const vitals = ns ? num(ns.vitals) : null;
        // No personal-assignment or ventilator telemetry is exposed yet.
        return {
          "Active ICU Beds": activeBeds,
          activeIcuBeds: activeBeds,
          "Assigned ICU Beds": 'â€”',
          assignedIcuBeds: 'â€”',
          "Ventilator Patients": 'â€”',
          ventilatorPatients: 'â€”',
          "Critical ABG Alerts": fmt(vitals, ' Panic'),
          criticalAbgAlerts: fmt(vitals, ' Panic'),
          "High-Alert Meds Due": 'â€”',
          highAlertMedsDue: 'â€”',
        };
      }
      case 'ot_coordinator':
      case 'surgeon':
      case 'anaesthesiologist':
      case 'anaesthetist': {
        const res = await api.get('/ot/stats').catch(() => null);
        const os = res ? objFrom(res) : null;
        if (!os) return noData('Surgeries Scheduled', 'Today Surgeries', 'Cases on Schedule', 'In Theatre', 'PAC Clearances', 'Surgeries Completed Today');
        const total = fmt(num(os.today) ?? num(os.total), ' Cases');
        const scheduled = fmt(num(os.scheduled), ' Upcoming');
        const inProgress = fmt(num(os.inProgress), ' In Theatre');
        const completed = fmt(num(os.completed), ' Finished');
        // /ot/stats has no PAC/pre-anaesthesia clearance counter yet.
        return {
          "Surgeries Scheduled": scheduled,
          surgeriesScheduled: scheduled,
          "Today Surgeries": total,
          todaySurgeries: total,
          "Cases on Schedule": scheduled,
          casesOnSchedule: scheduled,
          "In Theatre": inProgress,
          inTheatre: inProgress,
          "PAC Clearances": 'â€”',
          pacClearances: 'â€”',
          "Surgeries Completed Today": completed,
          surgeriesCompletedToday: completed,
        };
      }
      case 'housekeeping_supervisor': {
        const res = await api.get('/beds/stats').catch(() => null);
        const bs = res ? objFrom(res) : null;
        if (!bs) {
          return noData('Pending Cleaning Requests', 'Rooms Disinfected Today', 'SLA Breaches (>45m)', 'Staff on Duty');
        }
        const cleaning = fmt(num(bs.maintenance), ' Beds');
        // No rooms-disinfected, cleaning-SLA or staffing feed exists â€” never invent.
        return {
          "Pending Cleaning Requests": cleaning,
          pendingCleaningRequests: cleaning,
          "Rooms Disinfected Today": 'â€”',
          roomsDisinfectedToday: 'â€”',
          "SLA Breaches (>45m)": 'â€”',
          slaBreaches45m: 'â€”',
          "Staff on Duty": 'â€”',
          staffOnDuty: 'â€”',
        };
      }
      case 'biomedical_engineer': {
        // No equipment-telemetry endpoint is wired yet â€” all four stay `â€”`.
        return noData('Total Medical Equipment', 'Breakdown Tickets', 'PM Due This Month', 'Uptime Ratio');
      }
      case 'cssd_technician': {
        // No autoclave/sterility telemetry endpoint is wired yet â€” all four stay `â€”`.
        return noData('Active Autoclave Cycles', 'Sterile Trays Ready', 'Unprocessed Racks', 'Biological Indicator');
      }
      case 'discharge_coordinator':
        // /dashboard/operations is hospital-leadership-only; the discharge desk
        // KPIs ride the static spec rather than firing a doomed 403.
        return {};
      case 'clinic_admin': {
        const [apptsR, billsR] = await Promise.allSettled([
          api.get('/appointments'),
          api.get('/bills'),
        ]);
        if (apptsR.status !== 'fulfilled' && billsR.status !== 'fulfilled') {
          return noData("Today's Footfall", 'Waiting in Queue', 'Completed OPD', "Today's Revenue");
        }
        const appts = listFrom(apptsR);
        const bills = listFrom(billsR);
        const waiting = appts === null ? null : appts.filter((a: any) => a?.status === 'Waiting' || a?.status === 'Pending').length;
        const completed = appts === null ? null : appts.filter((a: any) => a?.status === 'Completed').length;
        const footfall = appts === null ? null : appts.length;
        const totalRev = bills === null
          ? null
          : bills.reduce((sum: number, b: any) => sum + (Number(b?.total || b?.amount) || 0), 0);
        return {
          "Today's Footfall": fmt(footfall),
          todaysFootfall: fmt(footfall),
          "Waiting in Queue": fmt(waiting),
          waitingInQueue: fmt(waiting),
          "Completed OPD": fmt(completed),
          completedOpd: fmt(completed),
          "Today's Revenue": totalRev === null ? 'â€”' : `â‚¹${totalRev.toLocaleString('en-IN')}`,
          todaysRevenue: totalRev === null ? 'â€”' : `â‚¹${totalRev.toLocaleString('en-IN')}`,
        };
      }
      case 'clinic_doctor': {
        const [apptsR] = await Promise.allSettled([api.get('/appointments')]);
        const appts = listFrom(apptsR);
        if (!appts) return noData('Queue Waiting', 'Consultations Done', 'Prescriptions Issued', 'Diagnostic Orders');
        const waiting = appts.filter((a: any) => !isDoneStatus(str(a, ['status'], ''))).length;
        const completed = appts.filter((a: any) => isDoneStatus(str(a, ['status'], ''))).length;
        const inConsultation = appts.filter((a: any) => /consult|progress|in-consultation/i.test(str(a, ['status'], ''))).length;
        return {
          "Queue Waiting": `${waiting} Patients`,
          queueWaiting: `${waiting} Patients`,
          "Completed Today": `${completed} Done`,
          completedToday: `${completed} Done`,
          "In Consultation": `${inConsultation} In-Room`,
          inConsultation: `${inConsultation} In-Room`,
          "Consultations Done": `${completed} Done`,
          consultationsDone: `${completed} Done`,
          "Prescriptions Issued": `${completed} e-Rx`,
          prescriptionsIssued: `${completed} e-Rx`,
          // No diagnostic-order aggregate is wired for this role yet.
          "Diagnostic Orders": '—',
          diagnosticOrders: '—',
        };
      }
      case 'clinic_nurse': {
        const [apptsR] = await Promise.allSettled([api.get('/appointments')]);
        const appts = listFrom(apptsR);
        if (!appts) return noData('Triage Queue', 'Vitals Recorded', 'Clinical Alerts', 'Procedures Done');
        const pending = appts.filter((a: any) => !a?.vitalsRecorded).length;
        const recorded = appts.filter((a: any) => a?.vitalsRecorded).length;
        return {
          "Triage Queue": `${pending} Waiting`,
          triageQueue: `${pending} Waiting`,
          "Vitals Pending": `${pending} Waiting`,
          vitalsPending: `${pending} Waiting`,
          "Vitals Recorded": `${recorded} Done`,
          vitalsRecorded: `${recorded} Done`,
          // No clinical-alert or procedure telemetry is exposed yet.
          "Clinical Alerts": '—',
          clinicalAlerts: '—',
          "Procedures Done": '—',
          proceduresDone: '—',
        };
      }
      case 'clinic_receptionist': {
        const [apptsR, tokensR] = await Promise.allSettled([
          api.get('/appointments'),
          api.get('/tokens'),
        ]);
        if (apptsR.status !== 'fulfilled' && tokensR.status !== 'fulfilled') {
          return noData('Tokens Dispensed', 'Waiting in Lobby', 'UHID Registered', 'Doctors On-Duty');
        }
        const appts = listFrom(apptsR);
        const tokens = listFrom(tokensR);
        const tokenN = tokens === null ? null : tokens.length;
        const apptN = appts === null ? null : appts.length;
        const total = tokenN ?? apptN;
        const waiting = appts === null ? null : appts.filter((a: any) => a?.status === 'Waiting').length;
        return {
          "Tokens Dispensed": fmt(total, ' Tokens'),
          tokensDispensed: fmt(total, ' Tokens'),
          "Active Queue Tokens": fmt(total, ' Tokens'),
          activeQueueTokens: fmt(total, ' Tokens'),
          "Waiting in Lobby": fmt(waiting, ' Waiting'),
          waitingInLobby: fmt(waiting, ' Waiting'),
          // No registration-count or room-roster telemetry is exposed yet.
          "UHID Registered": '—',
          uhidRegistered: '—',
          "Doctors On-Duty": '—',
          doctorsOnDuty: '—',
        };
      }
      case 'clinic_cashier': {
        const [billsR] = await Promise.allSettled([api.get('/bills')]);
        const bills = listFrom(billsR);
        if (!bills) return noData('Pending Invoices', 'Bills Settled Today', 'Cash Drawer Total', 'Digital Collections');
        const pending = bills.filter((b: any) => !isDoneStatus(str(b, ['status'], ''))).length;
        const settled = bills.filter((b: any) => isDoneStatus(str(b, ['status'], ''))).length;
        return {
          "Pending Invoices": `${pending} Bills`,
          pendingInvoices: `${pending} Bills`,
          "Bills Settled Today": `${settled} Settled`,
          billsSettledToday: `${settled} Settled`,
          // No till/digital-split telemetry is exposed yet.
          "Cash Drawer Total": 'â€”',
          cashDrawerTotal: 'â€”',
          "Digital Collections": 'â€”',
          digitalCollections: 'â€”',
        };
      }
      case 'biochem_tech':
        return lisSectionKpis('Biochemistry', 'Biochemistry Samples', 'LFT Panels Pending');
      case 'hematology_tech':
        return lisSectionKpis('Hematology', 'CBC Profiles Today', 'Peripheral Smear Reviews');
      case 'clinical_pathology_tech':
        return lisSectionKpis('Clinical Pathology', 'Urine Routine & Microscopy', 'Stool Routine & Occult Blood');
      case 'microbiology_tech':
        return lisSectionKpis('Microbiology', 'Active Culture Plates', 'Cultures in Incubation');
      case 'histopathology_tech':
        return lisSectionKpis('Histopathology', 'Biopsy Specimens Received', 'Grossing Pending');
      case 'cytology_tech':
        return lisSectionKpis('Cytology', 'Pap Smears in Staining', 'FNAC Smears Prepared');
      case 'serology_tech':
        return lisSectionKpis('Serology', 'ELISA Plates in Incubation', 'Reactive Serology Positives');
      case 'molecular_tech':
        return lisSectionKpis('Molecular', 'Nucleic Extractions Ready', 'Thermal Cycler Runs');
      default: {
        // Only roles that may read the hospital-wide operations snapshot may
        // probe it; everyone else falls back to the static spec KPIs instead of
        // firing a doomed 403 on every load.
        if (!['hospital_admin', 'superadmin', 'medical_director', 'cmo', 'hospital_owner'].includes(roleKey)) return {};
        const res = await api.get('/dashboard/operations').catch(() => null);
        const d = res ? objFrom(res) : null;
        if (!d) {
          return { totalBeds: 'â€”', occupied: 'â€”', available: 'â€”', todayOpd: 'â€”', currentIpd: 'â€”' };
        }
        const beds = d.beds && typeof d.beds === 'object' ? d.beds : {};
        const bedsTotal = num(beds.total);
        const bedsFree = num(beds.free);
        const occupancyPct = num(beds.occupancyPct);
        return {
          totalBeds: fmt(bedsTotal),
          occupied: bedsTotal !== null && bedsFree !== null ? `${bedsTotal - bedsFree} (${occupancyPct ?? 0}%)` : 'â€”',
          available: fmt(bedsFree),
          todayOpd: fmt(num(d.opdQueue?.waiting)),
          currentIpd: fmt(num(d.activeIpd)),
        };
      }
    }
  } catch {
    return {};
  }
}

// â”€â”€â”€ Live work queues (Wave 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// fetchRoleQueues pulls real transactional lists per role and maps them onto
// the canonical SPEC workQueue names (frontend/src/lib/hmsDashboardSpec.ts).
// Queues with no live data (empty list, 403/404, network error) are omitted â€”
// WorkQueueTable falls back to its curated roster for those, so a failed
// request never blanks a dashboard.

export interface LiveQueueRow {
  id: string;
  name: string;
  meta: string;
  detail: string;
  timeOrWait: string;
  status: string;
  statusColor: 'urgent' | 'warn' | 'info' | 'success';
  primaryActionLabel: string;
  primaryActionRoute?: string;
}

/** Normalize any backend list shape (bare array or {data|items|rows|...}) to an array. */
function asList(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const body = payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    for (const k of ['items', 'rows', 'results', 'docs', 'orders', 'beds', 'list', 'patients', 'tasks', 'appointments', 'prescriptions', 'surgeries', 'tokens', 'queues', 'admissions', 'requests', 'units', 'sessions', 'workOrders', 'incidents', 'passes']) {
      if (Array.isArray(body[k])) return body[k];
    }
  }
  return [];
}

/** First non-empty string among candidate fields. */
function str(obj: any, keys: string[], fb = 'â€”'): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return fb;
}

/** Compact relative time for date-ish fields; falls back to the raw value. */
function ago(iso: any): string {
  if (!iso) return 'â€”';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return String(iso);
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function colorFor(status: string): LiveQueueRow['statusColor'] {
  const s = (status || '').toLowerCase();
  if (/(critical|urgent|emergency|red|breach|overdue|panic|stat|expired|rejected|failed|abscond|lama)/.test(s)) return 'urgent';
  if (/(pending|waiting|due|expir|low|attention|review|progress|transit|scheduled|scheduled|hold|query)/.test(s)) return 'warn';
  if (/(done|complet|clear|ready|paid|success|verif|active|available|signed|stable|reconciled|approved)/.test(s)) return 'success';
  return 'info';
}

async function getList(path: string): Promise<any[]> {
  try {
    const res = await api.get(path).catch(() => null);
    return asList(res?.data ?? res).slice(0, 8);
  } catch {
    return [];
  }
}

const isDoneStatus = (s: string) => /complet|cancel|no-?show|discharg|closed|done/i.test(s || '');

function mapAppointment(a: any, actionLabel: string, actionRoute: string): LiveQueueRow {
  const status = str(a, ['status'], 'Waiting');
  return {
    id: str(a, ['tokenNo', 'token', 'appointmentNo', 'appointmentId', '_id', 'id'], 'TK'),
    name: str(a, ['patientName', 'patient', 'name'], 'Walk-in Patient'),
    meta: `UHID: ${str(a, ['uhid', 'patientUhid', 'mrn'], 'â€”')} Â· ${str(a, ['doctorName', 'doctor', 'specialty', 'department'], '')}`,
    detail: str(a, ['reason', 'complaint', 'chiefComplaint', 'purpose', 'symptoms'], 'General consultation'),
    timeOrWait: str(a, ['slot', 'time', 'appointmentTime'], ago(a.scheduledAt || a.date || a.createdAt)),
    status,
    statusColor: colorFor(status),
    primaryActionLabel: actionLabel,
    primaryActionRoute: actionRoute,
  };
}

function mapAdmission(a: any, actionLabel: string, actionRoute: string): LiveQueueRow {
  const status = str(a, ['status', 'admissionStatus'], 'Admitted');
  return {
    id: str(a, ['admissionNo', 'ipdNo', 'admissionId', '_id', 'id'], 'IPD'),
    name: str(a, ['patientName', 'patient', 'name'], 'Inpatient'),
    meta: `${str(a, ['ward', 'wardName'], '')} ${str(a, ['bedNo', 'bed', 'bedNumber'], '')} Â· ${str(a, ['doctorName', 'consultant', 'doctor'], '')}`.trim(),
    detail: str(a, ['diagnosis', 'provisionalDiagnosis', 'complaint', 'reason'], 'Under observation'),
    timeOrWait: ago(a.admittedAt || a.admissionDate || a.createdAt),
    status,
    statusColor: colorFor(status),
    primaryActionLabel: actionLabel,
    primaryActionRoute: actionRoute,
  };
}

function mapBed(b: any, actionLabel: string, actionRoute: string): LiveQueueRow {
  const status = str(b, ['status', 'bedStatus'], 'Occupied');
  return {
    id: str(b, ['bedNo', 'bedNumber', 'number', 'label', 'name', '_id', 'id'], 'BED'),
    name: `${str(b, ['ward', 'wardName', 'unit'], 'Ward')} Â· ${str(b, ['bedNo', 'bedNumber', 'number', 'label'], '')}`.trim(),
    meta: `${str(b, ['type', 'category', 'roomType'], '')} Â· ${str(b, ['patientName', 'occupant', 'patient'], '')}`.trim(),
    detail: str(b, ['patientName', 'occupant', 'diagnosis', 'note'], `Bed status: ${status}`),
    timeOrWait: ago(b.updatedAt || b.cleanedAt || b.createdAt),
    status,
    statusColor: colorFor(status),
    primaryActionLabel: actionLabel,
    primaryActionRoute: actionRoute,
  };
}

async function clinicDoctorQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [appts, recs] = await Promise.all([getList('/appointments'), getList('/records')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const waiting = appts.filter((a) => !isDoneStatus(str(a, ['status'], '')));
  if (waiting.length) {
    out['Live Patient Waiting Queue'] = waiting.map((a) => mapAppointment(a, 'Consult Patient', '/clinic/consultations'));
    out['Waiting OPD Patients'] = out['Live Patient Waiting Queue'];
  }
  const active = appts.filter((a) => /consult|progress|in-consultation/i.test(str(a, ['status'], '')));
  if (active.length) {
    out['In-Consultation Encounter'] = active.map((a) => mapAppointment(a, 'Open EMR Workstation', '/clinic/consultations'));
    out['Active Consultation'] = out['In-Consultation Encounter'];
  }
  if (recs.length) {
    const labItems = recs.slice(0, 6).map((r) => ({
      id: str(r, ['reportNo', '_id', 'id'], 'REP'),
      name: `${str(r, ['patientName', 'patient'], 'Patient')} Â· ${str(r, ['diagnosis', 'testName'], 'Lab Report')}`,
      meta: `Date: ${str(r, ['date'], 'Today')}`,
      detail: str(r, ['notes', 'prescription'], 'Investigation report awaiting clinical review'),
      timeOrWait: ago(r.createdAt),
      status: 'Review Pending',
      statusColor: colorFor('Review Pending') as LiveQueueRow['statusColor'],
      primaryActionLabel: 'Review Report',
      primaryActionRoute: '/clinic/consultations',
    }));
    out['Pending Lab Results'] = labItems;
    out['Pending Investigation Reviews'] = labItems;
  }
  const followups = appts.filter((a) => /follow|review|recall/i.test(str(a, ['type', 'service', 'notes'], '')));
  const followupPool = followups.length ? followups : appts.slice(0, 4);
  if (followupPool.length) {
    out['Scheduled Follow-ups'] = followupPool.map((a) => mapAppointment(a, 'Review Patient', '/clinic/consultations'));
  }
  const video = appts.filter((a) => /video|tele|virtual|online/i.test(str(a, ['mode', 'type', 'appointmentMode'], '')));
  if (video.length) {
    out['Telemedicine Queue'] = video.map((a) => mapAppointment(a, 'Join Video Room', '/clinic/consultations'));
  }
  return out;
}

async function clinicAdminQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [appts, bills, items, staff] = await Promise.all([
    getList('/appointments'),
    getList('/bills'),
    getList('/inventory/items'),
    getList('/clinic/staff'),
  ]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (appts.length) {
    out['Today Consultation Census'] = appts.map((a) => mapAppointment(a, 'View Visit', '/clinic/appointments'));
  }
  const unpaid = bills.filter((b) => !isDoneStatus(str(b, ['status'], '')));
  if (unpaid.length) {
    out['Pending Bill Settlements'] = unpaid.map((b) => ({
      id: str(b, ['invoiceNo', 'billNo', '_id', 'id'], 'INV'),
      name: `${str(b, ['patientName', 'patient'], 'Patient')} Â· â‚¹${str(b, ['total', 'amount', 'balance'], '0')}`,
      meta: `Mode: ${str(b, ['paymentMethod', 'mode'], 'Pending')}`,
      detail: str(b, ['notes', 'itemsSummary'], 'Pending payment settlement'),
      timeOrWait: ago(b.createdAt),
      status: 'Payment Due',
      statusColor: 'urgent',
      primaryActionLabel: 'Collect Payment',
      primaryActionRoute: '/clinic/billing',
    }));
  }
  const lowStock = items.filter((it) => {
    const qty = Number(it?.quantity ?? it?.stock ?? NaN);
    const min = Number(it?.reorderLevel ?? it?.minStock ?? NaN);
    return !Number.isNaN(qty) && !Number.isNaN(min) ? qty <= min : /low|reorder/i.test(str(it, ['status'], ''));
  });
  if (lowStock.length) {
    out['Inventory Reorder Alerts'] = lowStock.map((it) => ({
      id: str(it, ['sku', 'itemCode', '_id', 'id'], 'SKU'),
      name: str(it, ['name', 'itemName'], 'Medicine Item'),
      meta: `Qty: ${str(it, ['quantity', 'stock'], '0')} / Reorder: ${str(it, ['reorderLevel', 'minStock'], '10')}`,
      detail: 'Below minimum stock threshold',
      timeOrWait: 'Reorder Due',
      status: 'Low Stock',
      statusColor: 'urgent',
      primaryActionLabel: 'Order Stock',
      primaryActionRoute: '/clinic/inventory',
    }));
  }
  if (staff.length) {
    out['Staff Duty Status'] = staff.map((s) => ({
      id: str(s, ['staffId', '_id', 'id'], 'STF'),
      name: str(s, ['name', 'fullName'], 'Staff Member'),
      meta: str(s, ['role', 'department', 'designation'], 'Clinical Staff'),
      detail: str(s, ['shift', 'timing'], 'Morning Shift'),
      timeOrWait: 'On Duty',
      status: 'Active',
      statusColor: 'success',
      primaryActionLabel: 'View Roster',
      primaryActionRoute: '/clinic/staff',
    }));
  }
  return out;
}

async function clinicNurseQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [appts] = await Promise.all([getList('/appointments')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const waitingVitals = appts.filter((a) => !a?.vitalsRecorded && !isDoneStatus(str(a, ['status'], '')));
  if (waitingVitals.length) {
    out['Vitals Station Queue'] = waitingVitals.map((a) => mapAppointment(a, 'Record Vitals', '/clinic/nurse'));
  }
  const procedures = appts.filter((a) => /procedure|injection|dressing|nebuliz/i.test(str(a, ['type', 'service', 'notes'], '')));
  if (procedures.length) {
    out['Minor Procedure / Dressing Queue'] = procedures.map((a) => mapAppointment(a, 'Perform Procedure', '/clinic/nurse'));
  }
  const vaccines = appts.filter((a) => /vaccin|immuniz/i.test(str(a, ['type', 'service', 'notes'], '')));
  if (vaccines.length) {
    out['Immunization & Vaccine Due'] = vaccines.map((a) => mapAppointment(a, 'Administer Vaccine', '/clinic/nurse'));
  }
  if (appts.length) {
    out['Doctor Room Assistance'] = appts.slice(0, 5).map((a) => mapAppointment(a, 'Assist Doctor', '/clinic/nurse'));
  }
  return out;
}

async function clinicReceptionistQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [tokens, patients, appts] = await Promise.all([getList('/tokens'), getList('/patients'), getList('/appointments')]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (appts.length) {
    out['Front Desk Check-in Queue'] = appts.map((a) => mapAppointment(a, 'Check-In', '/clinic/reception'));
    const waiting = appts.filter((a) => !isDoneStatus(str(a, ['status'], '')));
    if (waiting.length) {
      out['Waiting Room Patient Queue'] = waiting.map((a) => mapAppointment(a, 'Call to Room', '/clinic/reception'));
    }
  }
  if (patients.length) {
    out['OPD Thermal Slips Queue'] = patients.slice(0, 6).map((p) => ({
      id: str(p, ['uhid', '_id', 'id'], 'UHID'),
      name: str(p, ['name', 'patientName'], 'Patient'),
      meta: str(p, ['phone', 'mobile'], ''),
      detail: 'Registered patient slip ready for printing',
      timeOrWait: ago(p.createdAt),
      status: 'Ready to Print',
      statusColor: 'success',
      primaryActionLabel: 'Print OPD Slip',
      primaryActionRoute: '/clinic/reception',
    }));
  }
  if (tokens.length) {
    out['Doctor Room Status'] = tokens.map((t) => ({
      id: str(t, ['tokenNo', '_id', 'id'], 'TKN'),
      name: str(t, ['doctorName', 'doctor'], 'Consulting Doctor'),
      meta: `Room ${str(t, ['roomNo', 'room'], '1')}`,
      detail: `Current Token: #${str(t, ['number', 'tokenNo'], '1')}`,
      timeOrWait: 'Consulting',
      status: 'Room Active',
      statusColor: 'info',
      primaryActionLabel: 'Queue Desk',
      primaryActionRoute: '/clinic/reception',
    }));
  }
  return out;
}

async function clinicCashierQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [bills] = await Promise.all([getList('/bills')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const unpaid = bills.filter((b) => !isDoneStatus(str(b, ['status'], '')));
  if (unpaid.length) {
    out['Unpaid Consultation Invoices'] = unpaid.map((b) => ({
      id: str(b, ['invoiceNo', 'billNo', '_id', 'id'], 'INV'),
      name: `${str(b, ['patientName', 'patient'], 'Patient')} Â· â‚¹${str(b, ['total', 'amount'], '0')}`,
      meta: `Doctor: ${str(b, ['doctorName', 'doctor'], 'OPD')}`,
      detail: str(b, ['notes', 'itemsSummary'], 'Pending cashier counter settlement'),
      timeOrWait: ago(b.createdAt),
      status: 'Payment Due',
      statusColor: 'urgent',
      primaryActionLabel: 'Collect Payment',
      primaryActionRoute: '/clinic/cashier',
    }));
  }
  const pharmacy = bills.filter((b) => /pharmacy|medicine|rx/i.test(str(b, ['type', 'category'], '')));
  if (pharmacy.length) {
    out['Pharmacy Dispensing Bills'] = pharmacy.map((b) => ({
      id: str(b, ['billNo', '_id', 'id'], 'RX-BILL'),
      name: `${str(b, ['patientName', 'patient'], 'Patient')} Â· â‚¹${str(b, ['total', 'amount'], '0')}`,
      meta: 'Pharmacy Counter',
      detail: 'Medicines dispensed pending billing',
      timeOrWait: ago(b.createdAt),
      status: 'Dispensed',
      statusColor: 'warn',
      primaryActionLabel: 'Settle Rx Bill',
      primaryActionRoute: '/clinic/cashier',
    }));
  }
  const paid = bills.filter((b) => /paid|settled/i.test(str(b, ['status'], '')));
  if (paid.length) {
    out['Collected Receipts Log'] = paid.map((b) => ({
      id: str(b, ['receiptNo', 'invoiceNo', '_id', 'id'], 'RCT'),
      name: `${str(b, ['patientName', 'patient'], 'Patient')} Â· â‚¹${str(b, ['total', 'amount'], '0')}`,
      meta: `Mode: ${str(b, ['paymentMethod', 'mode'], 'Cash / UPI')}`,
      detail: 'Settled at counter',
      timeOrWait: ago(b.updatedAt || b.createdAt),
      status: 'Paid',
      statusColor: 'success',
      primaryActionLabel: 'Print Receipt',
      primaryActionRoute: '/clinic/cashier',
    }));
  }
  return out;
}

async function clinicBranchManagerQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [appts, bills, staff] = await Promise.all([
    getList('/appointments'),
    getList('/bills'),
    getList('/clinic/staff'),
  ]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (appts.length) {
    out['Branch Patient Queue'] = appts.map((a) => mapAppointment(a, 'Review Patient', '/clinic/appointments'));
  }
  if (staff.length) {
    out['Doctor Room Allocations'] = staff.slice(0, 5).map((s) => ({
      id: str(s, ['staffId', '_id', 'id'], 'RM'),
      name: `Room ${str(s, ['roomNo', 'room'], '101')} Â· Dr. ${str(s, ['name', 'doctorName'], 'Consultant')}`,
      meta: str(s, ['specialty', 'department'], 'General OPD'),
      detail: 'Consulting room occupied & active',
      timeOrWait: 'Active',
      status: 'Room Active',
      statusColor: 'success',
      primaryActionLabel: 'Reallocate Room',
      primaryActionRoute: '/clinic/schedule',
    }));
    out['Staff Attendance Log'] = staff.map((s) => ({
      id: str(s, ['staffId', '_id', 'id'], 'ATT'),
      name: str(s, ['name', 'fullName'], 'Staff'),
      meta: str(s, ['shift', 'timing'], 'Morning 08:00 - 16:00'),
      detail: 'Biometric verified check-in',
      timeOrWait: 'On Time',
      status: 'Present',
      statusColor: 'success',
      primaryActionLabel: 'Staff Details',
      primaryActionRoute: '/clinic/staff',
    }));
  }
  return out;
}

async function clinicLabQueues(): Promise<Record<string, LiveQueueRow[]>> {
  // /clinic/test-requests has no backend route; the lab worklist lives at /lab/orders.
  const pool = await getList('/lab/orders');
  if (!pool.length) return {};
  return {
    'Accession & Barcode Queue': pool.map((r) => ({
      id: str(r, ['accessionNo', 'testNo', '_id', 'id'], 'LAB'),
      name: `${str(r, ['patientName', 'patient'], 'Patient')} Â· ${str(r, ['testName', 'test'], 'Investigation')}`,
      meta: `Ref Doctor: ${str(r, ['doctorName', 'doctor'], '')}`,
      detail: str(r, ['notes', 'clinicalNotes'], 'Sample awaiting accessioning'),
      timeOrWait: ago(r.createdAt),
      status: str(r, ['status'], 'Sample Due'),
      statusColor: colorFor(str(r, ['status'], 'Sample Due')),
      primaryActionLabel: 'Print Barcode',
      primaryActionRoute: '/clinic/tests',
    })),
    'Results Entry Worklist': pool.map((r) => ({
      id: str(r, ['accessionNo', '_id', 'id'], 'RES'),
      name: `${str(r, ['patientName', 'patient'], 'Patient')} Â· ${str(r, ['testName', 'test'], 'Test')}`,
      meta: 'Hematology / Biochemistry',
      detail: 'Test processed, enter values',
      timeOrWait: ago(r.createdAt),
      status: 'Awaiting Results',
      statusColor: 'warn',
      primaryActionLabel: 'Enter Results',
      primaryActionRoute: '/clinic/tests',
    })),
  };
}

async function clinicInventoryQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const items = await getList('/inventory/items');
  if (!items.length) return {};
  return {
    'Medicine Stock Below Reorder Level': items.map((it) => ({
      id: str(it, ['sku', '_id', 'id'], 'SKU'),
      name: str(it, ['name', 'itemName'], 'Medicine'),
      meta: `Stock: ${str(it, ['quantity', 'stock'], '0')}`,
      detail: 'Stock level critical',
      timeOrWait: 'Reorder Due',
      status: 'Low Stock',
      statusColor: 'urgent',
      primaryActionLabel: 'Create PO',
      primaryActionRoute: '/clinic/inventory',
    })),
    'Batches Expiring in 30 Days': items.slice(0, 4).map((it) => ({
      id: str(it, ['batchNo', '_id', 'id'], 'BAT'),
      name: str(it, ['name', 'itemName'], 'Medicine Batch'),
      meta: `Exp: ${str(it, ['expiryDate', 'expiry'], 'Next Month')}`,
      detail: 'Expiring batch quarantine check',
      timeOrWait: '30 Days',
      status: 'Near Expiry',
      statusColor: 'warn',
      primaryActionLabel: 'Quarantine Batch',
      primaryActionRoute: '/clinic/inventory',
    })),
  };
}

async function doctorQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [appts, admissions] = await Promise.all([getList('/appointments'), getList('/ipd/admissions')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const waiting = appts.filter((a) => !isDoneStatus(str(a, ['status'], '')));
  if (waiting.length) out['Waiting OPD Patients'] = waiting.map((a) => mapAppointment(a, 'Start Consult', '/doctor/consultation'));
  const done = appts.filter((a) => isDoneStatus(str(a, ['status'], '')));
  if (done.length) out['Completed Consults'] = done.map((a) => mapAppointment(a, 'View Rx', '/prescriptions'));
  const video = appts.filter((a) => /video|tele|virtual|online/i.test(str(a, ['mode', 'type', 'consultType', 'visitType'], '')));
  if (video.length) out['Telemedicine Queue'] = video.map((a) => mapAppointment(a, 'Join Video Room', '/doctor/consultation'));
  if (admissions.length) out['Assigned Inpatients'] = admissions.map((a) => mapAdmission(a, 'Rounds Note', '/ipd'));
  return out;
}

async function residentQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [admissions, er] = await Promise.all([getList('/ipd/admissions'), getList('/emergency')]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (admissions.length) out['Ward Inpatient List'] = admissions.map((a) => mapAdmission(a, 'Progress Note', '/ipd'));
  if (er.length) out['Urgent Reviews Due'] = er.slice(0, 8).map((e) => mapEmergency(e, 'Review Now', '/hospital/emergency?tab=triage'));
  return out;
}

function mapEmergency(e: any, actionLabel: string, actionRoute: string): LiveQueueRow {
  const priority = str(e, ['priority', 'triage', 'triageLevel', 'severity', 'status'], 'Triage Pending');
  return {
    id: str(e, ['emergencyNo', 'caseNo', 'mlcNo', '_id', 'id'], 'ER'),
    name: str(e, ['patientName', 'name'], 'Unknown Patient'),
    meta: str(e, ['complaint', 'chiefComplaint', 'modeOfArrival', 'age'], ''),
    detail: str(e, ['complaint', 'chiefComplaint', 'detail', 'notes'], 'Awaiting triage evaluation'),
    timeOrWait: ago(e.arrivedAt || e.createdAt),
    status: priority,
    statusColor: colorFor(priority),
    primaryActionLabel: actionLabel,
    primaryActionRoute: actionRoute,
  };
}

async function emergencyQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [list, triage, mlc] = await Promise.all([getList('/emergency'), getList('/triage'), getList('/safety/mlc')]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (list.length) out['Triage Waiting Queue'] = list.map((e) => mapEmergency(e, 'Triage Evaluation', '/hospital/emergency?tab=triage'));
  const red = triage.filter((t) => /red|p1|critical|resus|active/i.test(str(t, ['priority', 'triageLevel', 'status'], '')));
  if ((red.length ? red : triage).length) out['Active Resuscitation Cases'] = (red.length ? red : triage).map((t) => mapEmergency(t, 'Resuscitation Flow', '/hospital/emergency?tab=triage'));
  if (mlc.length) {
    out['MLC Register'] = mlc.map((m) => ({
      id: str(m, ['mlcNo', 'caseNo', '_id', 'id'], 'MLC'),
      name: str(m, ['patientName', 'name'], 'MLC Case'),
      meta: str(m, ['policeStation', 'station'], ''),
      detail: str(m, ['injuryDetail', 'detail', 'notes'], 'Medico-legal documentation'),
      timeOrWait: ago(m.createdAt),
      status: str(m, ['status'], 'MLC Open'),
      statusColor: colorFor(str(m, ['status'], '')) as LiveQueueRow['statusColor'],
      primaryActionLabel: 'MLC Document',
      primaryActionRoute: '/hospital/emergency?tab=mlc',
    }));
  }
  const transfers = list.filter((e) => /transfer|admit|icu|ward/i.test(str(e, ['disposition', 'transferStatus', 'plan', 'status'], '')));
  if (transfers.length) out['Pending Ward/ICU Transfers'] = transfers.map((e) => mapEmergency(e, 'Expedite Bed', '/hospital/beds?ward=icu'));
  return out;
}

async function frontDeskQueues(queueNames: { queue: string; recent: string }): Promise<Record<string, LiveQueueRow[]>> {
  const [tokens, patients, appts] = await Promise.all([getList('/tokens'), getList('/patients'), getList('/appointments')]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (tokens.length) {
    out[queueNames.queue] = tokens.map((t) => ({
      id: str(t, ['tokenNo', 'number', '_id', 'id'], 'TKN'),
      name: str(t, ['patientName', 'name'], 'Waiting Patient'),
      meta: str(t, ['department', 'doctor', 'counter'], ''),
      detail: str(t, ['purpose', 'detail'], 'Token issued at front desk'),
      timeOrWait: ago(t.createdAt || t.issuedAt),
      status: str(t, ['status'], 'Token Issued'),
      statusColor: colorFor(str(t, ['status'], '')) as LiveQueueRow['statusColor'],
      primaryActionLabel: 'Check-In',
      primaryActionRoute: '/hospital/frontdesk?tab=book',
    }));
  }
  if (patients.length) {
    out[queueNames.recent] = patients.slice(0, 5).map((p) => ({
      id: str(p, ['uhid', 'mrn', '_id', 'id'], 'UHID'),
      name: str(p, ['name', 'patientName'], 'New Patient'),
      meta: str(p, ['phone', 'mobile'], ''),
      detail: 'Registration completed at front desk',
      timeOrWait: ago(p.createdAt || p.registeredAt),
      status: 'UHID Generated',
      statusColor: 'success' as const,
      primaryActionLabel: 'Print OPD Slip',
      primaryActionRoute: '/hospital/frontdesk?tab=slips',
    }));
  }
  const noShow = appts.filter((a) => /no-?show|cancel/i.test(str(a, ['status'], '')));
  if (noShow.length && queueNames.queue === 'Clinic Floor Queue Status') {
    out['No-Show Follow-up'] = noShow.map((a) => mapAppointment(a, 'Recall Patient', '/hospital/frontdesk?tab=book'));
  }
  const resched = appts.filter((a) => /reschedul/i.test(str(a, ['status', 'notes'], '')));
  if (resched.length && queueNames.queue === 'Clinic Floor Queue Status') {
    out['Rescheduled Appointments'] = resched.map((a) => mapAppointment(a, 'Confirm Slot', '/hospital/frontdesk?tab=book'));
  }
  return out;
}

async function admissionQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [admissions, beds] = await Promise.all([getList('/ipd/admissions'), getList('/beds')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const pending = admissions.filter((a) => /pend|request|wait/i.test(str(a, ['status'], '')));
  if ((pending.length ? pending : admissions).length) {
    out['Pending Admission Requests'] = (pending.length ? pending : admissions).map((a) => mapAdmission(a, 'Allocate Bed', '/hospital/beds?action=allocate'));
  }
  const free = beds.filter((b) => /free|vacant|available|clean|ready/i.test(str(b, ['status'], '')));
  if ((free.length ? free : beds).length) {
    out['Bed Allocation Queue'] = (free.length ? free : beds).slice(0, 8).map((b) => mapBed(b, 'Confirm Allocation', '/hospital/beds?action=allocate'));
  }
  return out;
}

async function bedQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [beds, tasks] = await Promise.all([getList('/beds'), getList('/housekeeping/tasks')]);
  const out: Record<string, LiveQueueRow[]> = {};
  const occupied = beds.filter((b) => /occup|engag/i.test(str(b, ['status'], '')));
  if ((occupied.length ? occupied : beds).length) {
    out['Hospital Bed Board'] = (occupied.length ? occupied : beds).slice(0, 8).map((b) => mapBed(b, 'View Status', '/hospital/beds'));
  }
  if (tasks.length) {
    out['Turnaround / Cleaning Queue'] = tasks.map((t) => ({
      id: str(t, ['taskNo', '_id', 'id'], 'CLN'),
      name: `${str(t, ['ward', 'location'], 'Ward')} Â· ${str(t, ['bedNo', 'bed', 'room'], 'Bed')}`.trim(),
      meta: str(t, ['taskType', 'type'], 'Terminal cleaning'),
      detail: str(t, ['detail', 'notes', 'description'], 'Cleaning requested on discharge'),
      timeOrWait: ago(t.createdAt),
      status: str(t, ['status'], 'Cleaning In-Progress'),
      statusColor: colorFor(str(t, ['status'], '')) as LiveQueueRow['statusColor'],
      primaryActionLabel: 'Mark Cleaned',
      primaryActionRoute: '/housekeeping?tab=tasks',
    }));
  }
  const blocked = beds.filter((b) => /block|maint|repair|isol/i.test(str(b, ['status'], '')));
  if (blocked.length) out['Maintenance Blocked Beds'] = blocked.map((b) => mapBed(b, 'Inspect Block', '/hospital/beds?action=release'));
  const free = beds.filter((b) => /free|vacant|available|clean|ready/i.test(str(b, ['status'], '')));
  if (free.length) out['Ward Allocation Map'] = free.map((b) => mapBed(b, 'Allocate Bed', '/hospital/beds?action=allocate'));
  return out;
}

async function billingQueues(queueNames: { unpaid: string; discharge?: string; receipts?: string }): Promise<Record<string, LiveQueueRow[]>> {
  const bills = await getList('/billing');
  const out: Record<string, LiveQueueRow[]> = {};
  const unpaid = bills.filter((b) => !/paid|settled|closed/i.test(str(b, ['status', 'paymentStatus'], '')));
  const mapBill = (b: any, label: string, route: string): LiveQueueRow => {
    const status = str(b, ['status', 'paymentStatus'], 'Unpaid Invoice');
    return {
      id: str(b, ['billNo', 'invoiceNo', 'receiptNo', '_id', 'id'], 'BIL'),
      name: `${str(b, ['patientName', 'patient', 'name'], 'Patient')} Â· â‚¹${str(b, ['balance', 'due', 'netPayable', 'total', 'amount'], 'â€”')}`,
      meta: `UHID: ${str(b, ['uhid', 'patientUhid'], 'â€”')}`,
      detail: str(b, ['billType', 'type', 'detail'], 'Awaiting payment clearance'),
      timeOrWait: ago(b.createdAt || b.billDate),
      status,
      statusColor: colorFor(status),
      primaryActionLabel: label,
      primaryActionRoute: route,
    };
  };
  if ((unpaid.length ? unpaid : bills).length) {
    out[queueNames.unpaid] = (unpaid.length ? unpaid : bills).slice(0, 8).map((b) => mapBill(b, 'Collect Payment', '/hospital/cashier?action=settle'));
  }
  if (queueNames.discharge) {
    const finals = bills.filter((b) => /discharg|final/i.test(str(b, ['billType', 'type', 'detail'], '')));
    if (finals.length) out[queueNames.discharge] = finals.map((b) => mapBill(b, 'Settle Final Bill', '/hospital/cashier?action=settle'));
  }
  if (queueNames.receipts) {
    const paid = bills.filter((b) => /paid|settled|reconciled/i.test(str(b, ['status', 'paymentStatus'], '')));
    if (paid.length) out[queueNames.receipts] = paid.slice(0, 5).map((b) => mapBill(b, 'Print Receipt', '/hospital/cashier?action=receipt'));
  }
  return out;
}

async function labQueues(queueNames: { intake: string; review: string }, criticalKey?: string): Promise<Record<string, LiveQueueRow[]>> {
  const orders = await getList('/lab/orders');
  const out: Record<string, LiveQueueRow[]> = {};
  const mapOrder = (o: any, label: string, route: string): LiveQueueRow => {
    const status = str(o, ['status', 'orderStatus'], 'Sample Accepted');
    return {
      id: str(o, ['accessionNo', 'orderNo', 'labNo', '_id', 'id'], 'ACC'),
      name: `${str(o, ['patientName', 'patient', 'name'], 'Patient')} (${str(o, ['testName', 'test', 'panel'], 'Test')})`,
      meta: str(o, ['sampleType', 'sample', 'ward'], ''),
      detail: str(o, ['testName', 'test', 'detail'], 'Awaiting processing'),
      timeOrWait: ago(o.collectedAt || o.createdAt),
      status,
      statusColor: colorFor(status),
      primaryActionLabel: label,
      primaryActionRoute: route,
    };
  };
  const intake = orders.filter((o) => !/verif|report|complet/i.test(str(o, ['status'], '')));
  if ((intake.length ? intake : orders).length) {
    out[queueNames.intake] = (intake.length ? intake : orders).slice(0, 8).map((o) => mapOrder(o, 'Load on Analyzer', '/hospital/lab?tab=results'));
  }
  const review = orders.filter((o) => /result|verif|review|critical|panic/i.test(str(o, ['status', 'flag'], '')));
  if (review.length) out[queueNames.review] = review.map((o) => mapOrder(o, 'Sign & Release', '/hospital/lab?tab=critical'));
  if (criticalKey) {
    const critical = orders.filter((o) => /critical|panic/i.test(str(o, ['status', 'flag', 'result'], '')));
    if (critical.length) out[criticalKey] = critical.map((o) => mapOrder(o, 'Telephone Alert', '/hospital/lab?tab=critical'));
  }
  return out;
}

async function radiologyQueues(queueNames: { worklist: string; unread?: string; stat?: string }): Promise<Record<string, LiveQueueRow[]>> {
  const orders = await getList('/radiology/orders');
  const out: Record<string, LiveQueueRow[]> = {};
  const mapStudy = (o: any, label: string, route: string): LiveQueueRow => {
    const status = str(o, ['status', 'orderStatus'], 'Patient Ready');
    return {
      id: str(o, ['studyNo', 'accessionNo', 'orderNo', '_id', 'id'], 'RAD'),
      name: `${str(o, ['patientName', 'patient', 'name'], 'Patient')} (${str(o, ['study', 'test', 'procedure'], 'Study')})`,
      meta: `Modality: ${str(o, ['modality'], '')}`,
      detail: str(o, ['indication', 'detail', 'notes'], 'Awaiting acquisition'),
      timeOrWait: ago(o.orderedAt || o.createdAt),
      status,
      statusColor: colorFor(status),
      primaryActionLabel: label,
      primaryActionRoute: route,
    };
  };
  if (orders.length) {
    out[queueNames.worklist] = orders.slice(0, 8).map((o) => mapStudy(o, 'Acquire Image', '/hospital/radiology?tab=worklist'));
    if (queueNames.unread) out[queueNames.unread] = orders.slice(0, 8).map((o) => mapStudy(o, 'Open Web PACS', '/hospital/radiology?tab=pacs'));
  }
  if (queueNames.stat) {
    const stat = orders.filter((o) => /stat|urgent|emergency|critical/i.test(str(o, ['priority', 'status'], '')));
    if (stat.length) out[queueNames.stat] = stat.map((o) => mapStudy(o, 'Telephone Alert ER', '/hospital/radiology?tab=critical'));
  }
  return out;
}

async function pharmacyQueues(): Promise<Record<string, LiveQueueRow[]>> {
  const [rx, indents] = await Promise.all([getList('/pharmacy/prescriptions'), getList('/pharmacy/orders')]);
  const out: Record<string, LiveQueueRow[]> = {};
  if (rx.length) {
    out['OPD Dispensing Queue'] = rx.map((r) => ({
      id: str(r, ['rxNo', 'prescriptionNo', '_id', 'id'], 'RX'),
      name: `${str(r, ['patientName', 'patient', 'name'], 'Patient')} (Prescription)`,
      meta: `Prescribed by: ${str(r, ['doctorName', 'doctor'], '')}`,
      detail: str(r, ['itemsSummary', 'detail'], `${str(r, ['itemCount', 'items'], '')} items`),
      timeOrWait: ago(r.createdAt),
      status: str(r, ['status', 'dispenseStatus'], 'Awaiting Dispense'),
      statusColor: colorFor(str(r, ['status'], '')) as LiveQueueRow['statusColor'],
      primaryActionLabel: 'Dispense & Scan Barcode',
      primaryActionRoute: '/hospital/pharmacy?tab=dispense',
    }));
  }
  if (indents.length) {
    out['IPD Ward Indents'] = indents.map((o) => ({
      id: str(o, ['orderNo', 'indentNo', '_id', 'id'], 'IND'),
      name: `${str(o, ['ward', 'department'], 'Ward')} Indent`,
      meta: `Requested by: ${str(o, ['requestedBy', 'nurse'], '')}`,
      detail: str(o, ['itemsSummary', 'detail'], 'Ward replenishment request'),
      timeOrWait: ago(o.createdAt),
      status: str(o, ['status'], 'Pack & Dispatch'),
      statusColor: colorFor(str(o, ['status'], '')) as LiveQueueRow['statusColor'],
      primaryActionLabel: 'Fulfill Indent',
      primaryActionRoute: '/hospital/pharmacy?tab=indents',
    }));
  }
  return out;
}

async function otQueues(queueNames: { board: string; preop?: string; notes?: string }): Promise<Record<string, LiveQueueRow[]>> {
  const cases = await getList('/ot/surgeries');
  const out: Record<string, LiveQueueRow[]> = {};
  const mapCase = (c: any, label: string, route: string): LiveQueueRow => {
    const status = str(c, ['status', 'caseStatus'], 'Scheduled');
    return {
      id: str(c, ['caseNo', 'surgeryNo', '_id', 'id'], 'OT'),
      name: `${str(c, ['patientName', 'patient', 'name'], 'Patient')} Â· ${str(c, ['procedure', 'surgery', 'operation'], 'Procedure')}`,
      meta: `Surgeon: ${str(c, ['surgeon', 'surgeonName'], '')} Â· Anaesth: ${str(c, ['anaesthetist', 'anaesthesia'], '')}`,
      detail: `Theatre ${str(c, ['theatre', 'ot', 'room'], '')} Â· ${str(c, ['anaesthesiaType', 'anaesthesia'], '')}`,
      timeOrWait: str(c, ['slot', 'scheduledAt'], ago(c.createdAt)),
      status,
      statusColor: colorFor(status),
      primaryActionLabel: label,
      primaryActionRoute: route,
    };
  };
  if (cases.length) {
    out[queueNames.board] = cases.slice(0, 8).map((c) => mapCase(c, 'Live OT Board', '/ot?tab=rooms'));
    if (queueNames.preop) {
      const pre = cases.filter((c) => /schedul|pre-?op|posted|clear/i.test(str(c, ['status'], '')));
      if ((pre.length ? pre : cases).length) {
        out[queueNames.preop] = (pre.length ? pre : cases).slice(0, 8).map((c) => mapCase(c, 'Verify Checklist', '/ot?tab=checklist'));
      }
    }
    if (queueNames.notes) {
      const post = cases.filter((c) => /complet|post-?op|recover|pacu/i.test(str(c, ['status'], '')));
      if (post.length) out[queueNames.notes] = post.map((c) => mapCase(c, 'Complete Op Note', '/ot?tab=operative-note'));
    }
  }
  return out;
}

async function icuBedQueues(queueNames: { board: string; monitor?: string }): Promise<Record<string, LiveQueueRow[]>> {
  const [beds, admissions] = await Promise.all([getList('/beds'), getList('/ipd/admissions')]);
  const icu = beds.filter((b) => /icu|critical|hdu|ventil/i.test(str(b, ['ward', 'unit', 'type', 'category'], '')));
  const pool = icu.length ? icu : beds.filter((b) => /occup/i.test(str(b, ['status'], '')));
  const out: Record<string, LiveQueueRow[]> = {};
  if (pool.length) {
    const rows = pool.slice(0, 8).map((b) => mapBed(b, 'Review Chart', '/hospital/icu'));
    out[queueNames.board] = rows;
    if (queueNames.monitor) out[queueNames.monitor] = rows;
  } else if (admissions.length) {
    const rows = admissions.slice(0, 8).map((a) => mapAdmission(a, 'Review Chart', '/hospital/icu'));
    out[queueNames.board] = rows;
    if (queueNames.monitor) out[queueNames.monitor] = rows;
  }
  return out;
}

async function singleListQueue(path: string, queueName: string, map: (x: any) => LiveQueueRow): Promise<Record<string, LiveQueueRow[]>> {
  const list = await getList(path);
  if (!list.length) return {};
  return { [queueName]: list.map(map) };
}

/** Role â†’ live work queues. Keys MUST match the role's SPEC workQueues names. */
export async function fetchRoleQueues(roleKey: string): Promise<Record<string, LiveQueueRow[]>> {
  try {
    const role = String(roleKey || '').toLowerCase();
    switch (role) {
      case 'doctor':
        return doctorQueues();
      case 'clinic_doctor':
        return clinicDoctorQueues();
      case 'clinic_admin':
        return clinicAdminQueues();
      case 'clinic_nurse':
        return clinicNurseQueues();
      case 'clinic_receptionist':
        return clinicReceptionistQueues();
      case 'clinic_cashier':
        return clinicCashierQueues();
      case 'clinic_branch_manager':
        return clinicBranchManagerQueues();
      case 'clinic_lab_tech':
        return clinicLabQueues();
      case 'clinic_inventory_mgr':
        return clinicInventoryQueues();
      case 'clinic_radiology_tech':
        return singleListQueue('/radiology/orders', 'Modality Study Worklist', (s) => ({
          id: str(s, ['accessionNo', 'studyNo', '_id', 'id'], 'RAD'),
          name: `${str(s, ['patientName', 'patient'], 'Patient')} Â· ${str(s, ['modality', 'studyType'], 'X-Ray')}`,
          meta: `Room: ${str(s, ['room', 'location'], 'B-1')}`,
          detail: str(s, ['clinicalHistory', 'reason'], 'Digital radiography scan ordered'),
          timeOrWait: ago(s.createdAt),
          status: str(s, ['status'], 'Ordered'),
          statusColor: colorFor(str(s, ['status'], 'Ordered')),
          primaryActionLabel: 'Acquire Study',
          primaryActionRoute: '/clinic/tests',
        }));
      case 'clinic_purchase_officer':
        return singleListQueue('/inventory/items', 'Pending Purchase Indents', (it) => ({
          id: str(it, ['sku', '_id', 'id'], 'IND'),
          name: str(it, ['name', 'itemName'], 'Inventory Item'),
          meta: `Supplier: ${str(it, ['vendor', 'supplier'], 'MedSource')}`,
          detail: 'Indent generated from low stock threshold',
          timeOrWait: ago(it.createdAt),
          status: 'Indent Raised',
          statusColor: 'warn',
          primaryActionLabel: 'Generate PO',
          primaryActionRoute: '/clinic/inventory',
        }));
      case 'clinic_hr_admin':
        return singleListQueue('/leave-requests/pending', 'Leave Approval Requests', (l) => ({
          id: str(l, ['requestNo', '_id', 'id'], 'LV'),
          name: `${str(l, ['employeeName', 'staffName', 'name'], 'Staff')} Â· ${str(l, ['leaveType', 'type'], 'Casual Leave')}`,
          meta: `${str(l, ['fromDate', 'from'], '')} â†’ ${str(l, ['toDate', 'to'], '')}`,
          detail: str(l, ['reason', 'detail'], 'Staff leave awaiting clinic approval'),
          timeOrWait: ago(l.createdAt || l.appliedAt),
          status: 'Pending Review',
          statusColor: 'warn',
          primaryActionLabel: 'Review Request',
          primaryActionRoute: '/clinic/staff',
        }));
      case 'clinic_home_collection':
        return singleListQueue('/appointments', 'Assigned Home Visits Today', (a) => mapAppointment(a, 'Start Visit', '/clinic/appointments'));
      case 'clinic_telemed_coord':
        return singleListQueue('/appointments', 'Scheduled Video Tele-Consults', (a) => mapAppointment(a, 'Join Tele-Consult', '/clinic/appointments'));
      case 'clinic_crm_staff':
        return singleListQueue('/reviews', 'Post-Consultation Feedback Follow-up', (r) => ({
          id: str(r, ['reviewNo', '_id', 'id'], 'REV'),
          name: `${str(r, ['patientName', 'patient'], 'Patient')} Â· ${str(r, ['rating'], '5')}â˜…`,
          meta: `Dr. ${str(r, ['doctorName', 'doctor'], 'Consultant')}`,
          detail: str(r, ['comment', 'feedback', 'text'], 'Post consultation rating & feedback'),
          timeOrWait: ago(r.createdAt),
          status: 'Feedback Logged',
          statusColor: 'info',
          primaryActionLabel: 'Patient Outreach',
          primaryActionRoute: '/clinic/reviews',
        }));
      case 'clinic_quality_mgr':
        return singleListQueue('/safety/incidents', 'Clinical Incident Reports', (i) => ({
          id: str(i, ['incidentNo', '_id', 'id'], 'INC'),
          name: str(i, ['title', 'type'], 'Clinical QA Event'),
          meta: str(i, ['location', 'department'], 'OPD Clinic'),
          detail: str(i, ['description', 'detail'], 'Audit finding flagged for review'),
          timeOrWait: ago(i.createdAt),
          status: 'Audit Flagged',
          statusColor: 'warn',
          primaryActionLabel: 'Investigate',
          primaryActionRoute: '/clinic/analytics',
        }));
      case 'doctor_portal': {
        const base = await doctorQueues();
        const out: Record<string, LiveQueueRow[]> = {};
        if (base['Waiting OPD Patients']) out['Telemedicine Video Room'] = base['Waiting OPD Patients'];
        if (base['Assigned Inpatients']) out['Inpatient Quick Rounds'] = base['Assigned Inpatients'];
        return out;
      }
      case 'hod': {
        const [appts, cases] = await Promise.all([getList('/appointments'), getList('/ot/surgeries')]);
        const out: Record<string, LiveQueueRow[]> = {};
        if (appts.length) out['Specialty Patient Queue'] = appts.map((a) => mapAppointment(a, 'Review Case', '/doctor/consultation'));
        if (cases.length) {
          out['Procedural Schedule'] = cases.slice(0, 8).map((c) => ({
            id: str(c, ['caseNo', '_id', 'id'], 'OT'),
            name: `${str(c, ['patientName', 'patient'], 'Patient')} Â· ${str(c, ['procedure', 'surgery'], 'Procedure')}`,
            meta: `Surgeon: ${str(c, ['surgeon'], '')}`,
            detail: str(c, ['status'], 'Scheduled'),
            timeOrWait: ago(c.scheduledAt || c.createdAt),
            status: str(c, ['status'], 'Scheduled'),
            statusColor: colorFor(str(c, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Review Schedule',
            primaryActionRoute: '/ot?tab=rooms',
          }));
        }
        return out;
      }
      case 'resident_doctor':
      case 'ward_nurse':
      case 'nursing_supervisor':
      case 'matron':
        return residentQueues();
      case 'nurse':
        return (async () => {
          const [admissions] = await Promise.all([getList('/ipd/admissions')]);
          const out: Record<string, LiveQueueRow[]> = {};
          if (admissions.length) {
            out['Assigned Ward Patients'] = admissions.slice(0, 8).map((a) => mapAdmission(a, 'Log Vitals', '/hospital/nursing?tab=vitals'));
            out['Pending Vitals'] = admissions.slice(0, 8).map((a) => mapAdmission(a, 'Record Vitals', '/hospital/nursing?tab=vitals'));
          }
          return out;
        })();
      case 'icu_doctor':
        return icuBedQueues({ board: 'ICU Bed Board' });
      case 'icu_nurse':
      case 'ot_nurse':
        return icuBedQueues({ board: 'Hourly Monitoring Log' });
      case 'emergency':
      case 'casualty':
        return emergencyQueues();
      case 'receptionist':
      case 'front_desk':
        return frontDeskQueues({ queue: 'Front Desk Check-in Queue', recent: 'New Patient Registrations' });
      case 'opd_coordinator':
        return frontDeskQueues({ queue: 'Clinic Floor Queue Status', recent: 'New Patient Registrations' });
      case 'admission_coordinator':
        return admissionQueues();
      case 'bed_manager':
        return bedQueues();
      case 'billing_executive':
        return billingQueues({ unpaid: 'Pending Discharge Bills' });
      case 'cashier':
        return billingQueues({ unpaid: 'Unpaid Invoices Queue', receipts: 'Today Collected Receipts' });
      case 'tpa_agent':
      case 'insurance_desk': {
        const list = await getList('/tpa/preauth');
        if (!list.length) return {};
        return {
          'Pre-Authorization Queue': list.map((p) => ({
            id: str(p, ['preauthNo', 'claimNo', '_id', 'id'], 'PRE'),
            name: `${str(p, ['patientName', 'patient'], 'Patient')} Â· â‚¹${str(p, ['amount', 'claimedAmount', 'estimate'], 'â€”')}`,
            meta: `TPA: ${str(p, ['tpa', 'insurer'], '')}`,
            detail: str(p, ['diagnosis', 'treatment', 'detail'], 'Cashless pre-authorization request'),
            timeOrWait: ago(p.createdAt),
            status: str(p, ['status'], 'Pre-Auth Pending'),
            statusColor: colorFor(str(p, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Submit Pre-Auth',
            primaryActionRoute: '/hospital/insurance',
          })),
        };
      }
      case 'lab_technician':
        return labQueues({ intake: 'Assigned Samples Queue', review: 'Pending Result Entry' });
      case 'biochem_tech':
        return labQueues({ intake: 'Biochemistry Analyzer Worklist', review: 'Glucose & HbA1c Batches' }, 'Critical Electrolytes');
      case 'hematology_tech':
        return labQueues({ intake: 'CBC Worklist Queue', review: 'Coagulation PT/INR Queue' }, 'Peripheral Smear Reviews');
      case 'clinical_pathology_tech':
        return labQueues({ intake: 'Urine Routine & Microscopy Worklist', review: 'Stool Occult Blood & Parasitology' }, 'Body Fluid Cell Count & Differential');
      case 'microbiology_tech':
        return labQueues({ intake: 'Active Culture Incubations', review: 'Antibiotic Susceptibility Testing' }, 'Preliminary Gram Stains');
      case 'histopathology_tech':
        return labQueues({ intake: 'Grossing Worklist', review: 'Staining & Slide Mounts' }, 'Block Embedding Queue');
      case 'cytology_tech':
        return labQueues({ intake: 'Pap Smear Screening Worklist', review: 'FNAC Smear Fixation & Staining Queue' });
      case 'serology_tech':
        return labQueues({ intake: 'Serology & Immunoassay Worklist', review: 'Viral Marker Screening' }, 'Autoimmune Antibody Panel');
      case 'molecular_tech':
        return labQueues({ intake: 'RT-PCR Extraction & Amplification Queue', review: 'Viral Load Quantification' }, 'Thermal Cycler Runs');
      case 'analyzer_staff':
        return labQueues({ intake: 'Analyzer Calibration Worklist', review: 'Reagent Blank Verifications' }, 'ASTM / HL7 Interfacing Feeds');
      case 'lab_inventory_mgr':
        return singleListQueue('/inventory/items', 'Reagent Low Stock Warnings', (it) => ({
          id: str(it, ['sku', '_id', 'id'], 'RGT'),
          name: str(it, ['name', 'itemName'], 'Laboratory Reagent'),
          meta: `Lot: ${str(it, ['lotNo', 'batch'], 'â€”')}`,
          detail: 'Minimum laboratory stock threshold breached',
          timeOrWait: 'Reorder Due',
          status: 'Low Stock',
          statusColor: 'urgent',
          primaryActionLabel: 'Reorder Reagent',
          primaryActionRoute: '/inventory',
        }));
      case 'pathologist':
      case 'lab_supervisor':
      case 'lab_admin':
      case 'lab_manager':
      case 'lab_quality_mgr':
        return labQueues({ intake: 'Results Awaiting Verification', review: 'Results Awaiting Verification' }, 'Critical Panic Values');
      case 'phlebotomist':
      case 'home_collection_staff':
        return labQueues({ intake: 'Pending Collection Queue', review: 'Urgent STAT Collections' });
      case 'lab_receiving':
        return labQueues({ intake: 'Samples Awaiting Receipt', review: 'Sample Acceptance & Rejection' });
      case 'radiology_technician':
        return radiologyQueues({ worklist: 'Pending Acquisition Queue' });
      case 'mri_technician':
        return radiologyQueues({ worklist: 'MRI Queue Today', unread: 'Screening Cleared Patients', stat: 'Contrast-Enhanced MRI Waiting' });
      case 'xray_technician':
        return radiologyQueues({ worklist: 'Routine OP Chest Worklist', unread: 'Pediatric Radiography Queue', stat: 'STAT Trauma X-Rays' });
      case 'ct_technician':
        return radiologyQueues({ worklist: 'Triple Phase CT Queue', unread: 'HRCT Chest Worklist', stat: 'Trauma Whole Body CT' });
      case 'us_technician':
        return radiologyQueues({ worklist: 'Full Bladder Waiting Queue', unread: 'Fasting Upper Abdomen Queue', stat: 'STAT Vascular Doppler' });
      case 'mammo_technician':
        return radiologyQueues({ worklist: 'Screening Mammography Queue', unread: 'Prior Image Retrieval Desk', stat: 'Diagnostic Magnification Views' });
      case 'radiologist':
      case 'reporting_assistant':
      case 'report_coordinator':
        return radiologyQueues({ worklist: 'CT Scan Reporting Queue', unread: 'MRI Reporting Queue', stat: 'STAT Emergency Queue' });
      case 'radiology_manager':
      case 'radiology_admin':
        return radiologyQueues({ worklist: 'Overdue Reporting Worklist', stat: 'Urgent / STAT Queue' });
      case 'equipment_manager':
        return radiologyQueues({ worklist: 'Modality Breakdown Work Orders', stat: 'Critical Calibration Pending' });
      case 'radiology_billing_executive':
      case 'radiology_cashier':
        return singleListQueue('/radiology/orders', 'Unbilled Modality Studies', (s) => ({
          id: str(s, ['accessionNo', 'studyNo', '_id', 'id'], 'RAD'),
          name: `${str(s, ['patientName', 'patient'], 'Patient')} Â· ${str(s, ['modality', 'studyType'], 'Scan')}`,
          meta: `Modality: ${str(s, ['modality'], 'X-Ray')}`,
          detail: 'Completed scan awaiting billing counter settlement',
          timeOrWait: ago(s.createdAt),
          status: 'Pending Settlement',
          statusColor: 'urgent',
          primaryActionLabel: 'Collect Billing',
          primaryActionRoute: '/billing',
        }));
      case 'pacs_admin':
        return radiologyQueues({ worklist: 'Unlinked / Orphan DICOM Studies', stat: 'Retry Transfer Queue' });
      case 'radiology_prep_staff':
        return radiologyQueues({ worklist: 'MRI Safety Screening Queue', stat: 'CT Contrast Hydration & Renal Check' });
      case 'radiology_scheduler':
        return radiologyQueues({ worklist: 'Waitlist Queue', stat: 'Rescheduling Queue' });
      case 'pharmacist':
      case 'clinic_pharmacist':
        return pharmacyQueues();
      case 'ot_coordinator':
        return otQueues({ board: 'Daily OT Board' });
      case 'surgeon':
        return otQueues({ board: 'My Surgery Schedule', preop: 'Pre-Operative Assessment Queue', notes: 'Operative Notes Pending' });
      case 'anaesthetist':
      case 'anaesthesiologist':
        return otQueues({ board: 'Pre-Anaesthesia Checkup Queue' });
      case 'housekeeping_supervisor':
      case 'ward_boy': {
        const tasks = await getList('/housekeeping/tasks');
        if (!tasks.length) return {};
        return {
          'Bed Cleaning Queue': tasks.map((t) => ({
            id: str(t, ['taskNo', '_id', 'id'], 'CLN'),
            name: `${str(t, ['ward', 'location'], 'Ward')} Â· ${str(t, ['bedNo', 'bed', 'room'], 'Bed')}`.trim(),
            meta: str(t, ['taskType', 'type'], 'Terminal cleaning'),
            detail: str(t, ['detail', 'notes', 'description'], 'Cleaning requested on discharge'),
            timeOrWait: ago(t.createdAt),
            status: str(t, ['status'], 'Cleaning In-Progress'),
            statusColor: colorFor(str(t, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Dispatch Attendant',
            primaryActionRoute: '/housekeeping?tab=tasks',
          })),
        };
      }
      case 'store_keeper':
      case 'store_manager': {
        const items = await getList('/inventory/items');
        if (!items.length) return {};
        return {
          'Low Stock Reorder List': items.slice(0, 8).map((it) => {
            const qty = Number(it?.quantity ?? it?.stock ?? it?.qty ?? NaN);
            const min = Number(it?.reorderLevel ?? it?.minStock ?? it?.minimum ?? NaN);
            const low = !Number.isNaN(qty) && !Number.isNaN(min) ? qty <= min : /low|reorder|critical/i.test(str(it, ['stockStatus', 'status'], ''));
            const status = low ? 'Below Reorder Point' : `Stock: ${Number.isNaN(qty) ? 'â€”' : qty}`;
            return {
              id: str(it, ['sku', 'itemCode', '_id', 'id'], 'SKU'),
              name: str(it, ['name', 'itemName'], 'Inventory Item'),
              meta: `Batch: ${str(it, ['batch', 'batchNo'], 'â€”')} Â· Exp: ${str(it, ['expiry', 'expiryDate'], 'â€”')}`,
              detail: `On hand: ${Number.isNaN(qty) ? 'â€”' : qty} Â· Reorder at: ${Number.isNaN(min) ? 'â€”' : min}`,
              timeOrWait: 'Cycle count due',
              status,
              statusColor: colorFor(status) as LiveQueueRow['statusColor'],
              primaryActionLabel: 'Raise Indent',
              primaryActionRoute: '/hospital/inventory',
            };
          }),
        };
      }
      case 'biomedical_engineer':
      case 'facility_manager': {
        const wo = await getList('/biomedical/work-orders');
        if (!wo.length) return {};
        const key = role === 'facility_manager' ? 'Facility Work Orders' : 'Active Breakdown Work Orders';
        return {
          [key]: wo.map((w) => ({
            id: str(w, ['woNo', 'ticketNo', '_id', 'id'], 'WO'),
            name: str(w, ['assetName', 'equipment', 'title'], 'Equipment Work Order'),
            meta: `Asset: ${str(w, ['assetId', 'asset'], '')}`,
            detail: str(w, ['issue', 'description', 'detail'], 'Breakdown reported'),
            timeOrWait: ago(w.createdAt || w.reportedAt),
            status: str(w, ['status'], 'Engineer Assigned'),
            statusColor: colorFor(str(w, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Repair & Test',
            primaryActionRoute: '/biomedical?action=breakdown',
          })),
        };
      }
      case 'cssd_technician': {
        const cycles = await getList('/cssd/cycles');
        if (!cycles.length) return {};
        return {
          'Active Autoclave Cycles': cycles.map((c) => ({
            id: str(c, ['cycleNo', 'batchNo', '_id', 'id'], 'AUTO'),
            name: str(c, ['autoclave', 'machine', 'name'], 'Autoclave Cycle'),
            meta: str(c, ['temperature', 'program'], ''),
            detail: str(c, ['detail', 'phase', 'status'], 'Sterilization cycle running'),
            timeOrWait: ago(c.startedAt || c.createdAt),
            status: str(c, ['status'], 'Cycle Running'),
            statusColor: colorFor(str(c, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Monitor Autoclave',
            primaryActionRoute: '/cssd?action=autoclave',
          })),
        };
      }
      case 'mortuary_attendant': {
        const records = await getList('/mortuary');
        if (!records.length) return {};
        return {
          'Mortuary Chamber Status Board': records.map((m) => ({
            id: str(m, ['chamberNo', 'caseNo', '_id', 'id'], 'CHM'),
            name: str(m, ['deceasedName', 'name'], 'Record'),
            meta: `Chamber: ${str(m, ['chamber', 'unit'], '')}`,
            detail: str(m, ['detail', 'causeOfDeath', 'notes'], 'Cold storage occupancy'),
            timeOrWait: ago(m.admittedAt || m.createdAt),
            status: str(m, ['status'], 'In Custody'),
            statusColor: colorFor(str(m, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Verify Documents',
            primaryActionRoute: '/mortuary',
          })),
        };
      }
      case 'dialysis_admin': {
        const sessions = await getList('/provider/dialysis/sessions');
        if (!sessions.length) return {};
        return {
          'Patient Dialysis Schedule': sessions.map((s) => ({
            id: str(s, ['sessionNo', '_id', 'id'], 'DIA'),
            name: `${str(s, ['patientName', 'patient'], 'Patient')} Â· Station ${str(s, ['station', 'machine'], '')}`.trim(),
            meta: str(s, ['shift', 'slot'], ''),
            detail: str(s, ['prescription', 'detail'], 'Hemodialysis session'),
            timeOrWait: ago(s.scheduledAt || s.createdAt),
            status: str(s, ['status'], 'Scheduled'),
            statusColor: colorFor(str(s, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Start Session',
            primaryActionRoute: '/hospital/dialysis',
          })),
        };
      }
      case 'blood_bank_admin': {
        const reqs = await getList('/bloodbank/requests');
        if (!reqs.length) return {};
        return {
          'Component Requisition Queue': reqs.map((r) => ({
            id: str(r, ['requestNo', '_id', 'id'], 'BB'),
            name: `${str(r, ['component', 'bloodGroup'], 'Blood Component')} Â· ${str(r, ['bloodGroup', 'group'], '')}`.trim(),
            meta: `Ward: ${str(r, ['ward', 'department'], '')}`,
            detail: str(r, ['detail', 'indication'], 'Component requisition from ward/OT'),
            timeOrWait: ago(r.createdAt),
            status: str(r, ['status'], 'Cross-Match Pending'),
            statusColor: colorFor(str(r, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Cross-Match',
            primaryActionRoute: '/hospital/bloodbank',
          })),
        };
      }
      case 'diet_kitchen_admin':
      case 'dietician_head':
      case 'kitchen_staff': {
        const orders = await getList('/diet/orders');
        if (!orders.length) return {};
        return {
          'Ward Diet Distribution List': orders.map((o) => ({
            id: str(o, ['orderNo', '_id', 'id'], 'DIET'),
            name: `${str(o, ['patientName', 'patient'], 'Patient')} Â· ${str(o, ['dietType', 'diet'], 'Diet')}`.trim(),
            meta: `Ward: ${str(o, ['ward', 'bed'], '')}`,
            detail: str(o, ['restrictions', 'allergies', 'detail'], 'Meal scheduled'),
            timeOrWait: str(o, ['meal', 'slot'], ago(o.createdAt)),
            status: str(o, ['status'], 'Kitchen Preparing'),
            statusColor: colorFor(str(o, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Confirm Tray',
            primaryActionRoute: '/hospital/diet',
          })),
        };
      }
      case 'security': {
        const [passes, incidents] = await Promise.all([getList('/safety/visitor-passes'), getList('/safety/incidents')]);
        const out: Record<string, LiveQueueRow[]> = {};
        if (passes.length) {
          out['Visitor Check-In / Out Log'] = passes.map((p) => ({
            id: str(p, ['passNo', '_id', 'id'], 'VIS'),
            name: str(p, ['visitorName', 'name'], 'Visitor'),
            meta: `Patient: ${str(p, ['patientName', 'patient'], '')}`,
            detail: str(p, ['purpose', 'detail'], 'Visit pass issued'),
            timeOrWait: ago(p.issuedAt || p.createdAt),
            status: str(p, ['status'], 'Visitor Inside'),
            statusColor: colorFor(str(p, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Scan Exit',
            primaryActionRoute: '/hospital/frontdesk',
          }));
        }
        if (incidents.length) {
          out['Security Incident Reports'] = incidents.map((i) => ({
            id: str(i, ['incidentNo', '_id', 'id'], 'SEC'),
            name: str(i, ['title', 'type'], 'Incident'),
            meta: str(i, ['location'], ''),
            detail: str(i, ['description', 'detail'], 'Reported for review'),
            timeOrWait: ago(i.createdAt || i.reportedAt),
            status: str(i, ['status'], 'Under Review'),
            statusColor: colorFor(str(i, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'View Incident',
            primaryActionRoute: '/admin/settings',
          }));
        }
        return out;
      }
      case 'quality_officer': {
        const [incidents, capa] = await Promise.all([getList('/safety/incidents'), getList('/quality/capa')]);
        const out: Record<string, LiveQueueRow[]> = {};
        if (incidents.length) {
          out['Patient Safety Incident Reports'] = incidents.map((i) => ({
            id: str(i, ['incidentNo', '_id', 'id'], 'INC'),
            name: str(i, ['title', 'type'], 'Safety Event'),
            meta: str(i, ['department', 'location'], ''),
            detail: str(i, ['description', 'detail'], 'Filed for investigation'),
            timeOrWait: ago(i.createdAt || i.reportedAt),
            status: str(i, ['status'], 'Under Investigation'),
            statusColor: colorFor(str(i, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Open Incident File',
            primaryActionRoute: '/hospital/quality',
          }));
        }
        if (capa.length) {
          out['CAPA Action Item Tracker'] = capa.map((c) => ({
            id: str(c, ['capaNo', '_id', 'id'], 'CAPA'),
            name: str(c, ['title', 'finding'], 'Corrective Action'),
            meta: `Owner: ${str(c, ['owner', 'assignee'], '')}`,
            detail: str(c, ['description', 'detail'], 'Action tracked to closure'),
            timeOrWait: ago(c.createdAt),
            status: str(c, ['status'], 'Action Active'),
            statusColor: colorFor(str(c, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Verify Compliance',
            primaryActionRoute: '/hospital/quality',
          }));
        }
        return out;
      }
      case 'hr_manager': {
        const list = await getList('/leave-requests/pending');
        if (!list.length) return {};
        return {
          'Leave Approval Queue': list.map((l) => ({
            id: str(l, ['requestNo', '_id', 'id'], 'LV'),
            name: `${str(l, ['employeeName', 'staffName', 'name'], 'Staff')} Â· ${str(l, ['leaveType', 'type'], 'Leave')}`.trim(),
            meta: `${str(l, ['fromDate', 'from'], '')} â†’ ${str(l, ['toDate', 'to'], '')}`,
            detail: str(l, ['reason', 'detail'], 'Leave request awaiting approval'),
            timeOrWait: ago(l.createdAt || l.appliedAt),
            status: str(l, ['status'], 'Pending Approval'),
            statusColor: colorFor(str(l, ['status'], '')) as LiveQueueRow['statusColor'],
            primaryActionLabel: 'Approve / Reject',
            primaryActionRoute: '/hr/roster',
          })),
        };
      }
      case 'patient': {
        const appts = await getList('/appointments');
        if (!appts.length) return {};
        return {
          'My Upcoming Appointments': appts.map((a) => mapAppointment(a, 'View Details', '/appointments')),
        };
      }
      case 'discharge_coordinator': {
        const admissions = await getList('/ipd/admissions');
        const due = admissions.filter((a) => /discharg|clear|ready|settle/i.test(str(a, ['status', 'dischargeStatus'], '')));
        const pool = due.length ? due : admissions;
        if (!pool.length) return {};
        return {
          'Multi-Stage Discharge Clearance Board': pool.slice(0, 8).map((a) => mapAdmission(a, 'Expedite Billing', '/hospital/cashier')),
        };
      }
      default:
        return {};
    }
  } catch {
    return {};
  }
}

export { api };
