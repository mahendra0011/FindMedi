/** Wave 2 — AuditorDashboard: live audit-log volume + break-glass events. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'auditor',
  title: 'Auditor Dashboard',
  subtitle: 'Tamper-proof audit trail, break-glass access & compliance checks',
  permissions: ['audit:read', 'reports:read', 'security:read'],
  kpis: [
    { label: 'Audit Events (24h)', value: '—', hint: 'Logged mutations' },
    { label: 'Break-Glass Access', value: '—', hint: 'Emergency overrides' },
    { label: 'Failed Logins (24h)', value: '—', hint: 'Security signal' },
    { label: 'Verify Status', value: '—', hint: 'Chain integrity' },
  ],
  tasks: [
    { id: 't1', text: 'Review break-glass access events and confirm clinical justification' },
    { id: 't2', text: 'Sample-check before/after diffs on high-value mutations' },
    { id: 't3', text: 'Run seal verification on signed documents this week' },
  ],
  alerts: [
    { id: 'a1', text: 'Unusual after-hours access pattern detected in audit log', level: 'urgent' },
    { id: 'a2', text: 'Quarterly audit sample due Friday', level: 'info' },
  ],
  domainModules: [
    { key: 'audit-log', emoji: '📜', label: 'Audit Trail', description: 'Immutable before/after diffs of every mutation with actor identity.', ctaLabel: 'Open Audit Logs', ctaHref: '/hospital/audit' },
    { key: 'access', emoji: '🔐', label: 'Access Control', description: 'Role matrix, break-glass overrides and IP-lock events.', ctaLabel: 'Open Access Control', ctaHref: '/access-control' },
    { key: 'verify', emoji: '✔️', label: 'Document Verify', description: 'Cryptographic seal verification for signed records.', ctaLabel: 'Verify Document', ctaHref: '/verify/doc/lab-report/demo' },
  ],
};

async function fetchLive() {
  const [logs, verify] = await Promise.all([
    api.get('/audit-logs?limit=200').catch(() => null),
    api.get('/audit-logs/verify').catch(() => null),
  ]);
  const rows = Array.isArray(logs) ? logs : (logs?.data ?? logs?.logs ?? []);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = rows.filter((r: any) => {
    const raw = r?.createdAt ?? r?.timestamp;
    if (!raw) return false;
    const d = new Date(raw).getTime();
    return !Number.isNaN(d) && d >= dayAgo;
  });
  const breakGlass = recent.filter((r: any) => {
    const action = String(r?.action ?? '').toLowerCase();
    return action.includes('break') || action.includes('glass') || action.includes('emergency');
  }).length;
  const failed = rows.filter((r: any) => String(r?.action ?? '').toLowerCase().includes('fail')).length;
  return {
    auditEvents24h: recent.length,
    breakGlassAccess: breakGlass,
    failedLogins24h: failed,
    verifyStatus: verify?.ok === false ? 'FAILED' : (verify?.valid === false ? 'FAILED' : 'OK'),
  };
}

export default function AuditorDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
