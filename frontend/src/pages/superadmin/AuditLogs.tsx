import React, { useState, useCallback, useEffect } from 'react';
import { Search, Download, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { DataGrid } from '@/components/ui/System';
import { api, downloadAuditExport } from '@/lib/api';

// Mirrors TARGET_DETAIL_KEYS in backend/src/routes/auditLogs.js - the detail
// keys an action may store its target under. Keep the two lists in step, or
// the Target column and the target filter disagree about what exists.
const TARGET_KEYS = ['targetUserId', 'targetHospitalId', 'targetDoctorId', 'facilityId', 'profileId', 'resourceId', 'tokenId'];
type AuditLogRow = {
  _id?: string;
  timestamp?: string;
  action?: string;
  userId?: string;
  ip?: string;
  user?: { name?: string; email?: string } | null;
  details?: Record<string, unknown>;
};
const targetOf = (log: { details?: Record<string, unknown> }): string => {
  const d = log.details || {};
  const hit = TARGET_KEYS.map(k => d[k]).find(Boolean);
  return hit == null ? '' : String(hit);
};
type AuditStats = {
  totalLogs?: number;
  last24h?: number;
  uniqueUsers?: number;
  uniqueActions?: number;
  topActions?: { _id: string; count: number }[];
};

function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  // Seeded from the URL ONCE: the approval pages deep-link here with ?action= /
  // ?target=, and a copied URL has to reproduce the same view.
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '');
  const [targetFilter, setTargetFilter] = useState(searchParams.get('target') || '');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      if (targetFilter) params.target = targetFilter;
      if (search) params.search = search;
      const data = await api.getAuditLogs(params);
      const pages = Math.max(1, data.totalPages || 1);
      const want = Math.max(1, data.page || p || 1);
      // SA-6: filters can shrink totalPages below the active offset — clamp
      // into range and refetch once instead of showing an empty table.
      if (want > pages) {
        if (p !== pages) fetchLogs(pages);
        else { setLogs([]); setTotal(data.total || 0); setPage(pages); setTotalPages(pages); }
        return;
      }
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(want);
      setTotalPages(pages);
    } catch { toast.error('Failed to load audit logs'); }
    setLoading(false);
  }, [page, actionFilter, targetFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getAuditLogStats();
      setStats(data);
    } catch { toast.error('Failed to load audit stats'); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(1); }, [actionFilter, targetFilter]);

  // ADM-M-02: the filters live in the URL so the approval pages' History
  // buttons (?target=...) are shareable, bookmarkable, and back-button sane.
  useEffect(() => {
    const next: Record<string, string> = {};
    if (actionFilter) next.action = actionFilter;
    if (targetFilter) next.target = targetFilter;
    setSearchParams(next, { replace: true });
  }, [actionFilter, targetFilter, setSearchParams]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = () => { fetchLogs(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (targetFilter) params.target = targetFilter;
      if (search) params.search = search;
      await downloadAuditExport(params);
      toast.success('Audit export downloaded (capped at 10,000 rows)');
    } catch {
      toast.error('Failed to export audit logs');
    }
    setExporting(false);
  };

  // Options come from the stats leg (platform-wide top actions), not just
  // whatever happens to be on the current page - a filter that can only offer
  // already-visible values filters nothing.
  const uniqueActions = [...new Set([
    ...(stats?.topActions?.map(t => t._id) || []),
    ...logs.map(l => l.action),
    actionFilter,
  ].filter(Boolean))].sort();

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalLogs}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.last24h}</p>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-info">{stats.uniqueUsers}</p>
            <p className="text-xs text-muted-foreground">Unique Users</p>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.uniqueActions}</p>
            <p className="text-xs text-muted-foreground">Action Types</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="pl-10"
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm max-w-[200px]">
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="relative">
          <Input
            value={targetFilter}
            onChange={e => setTargetFilter(e.target.value.trim())}
            placeholder="Target id…"
            className="h-10 text-xs font-mono max-w-[210px] pr-8"
            aria-label="Filter by target record id"
          />
          {targetFilter && (
            <button
              type="button"
              aria-label="Clear target filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setTargetFilter('')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          title="Read-only trail; the export is capped at 10,000 rows"
        >
          <Download className="w-4 h-4 mr-1.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          {/* Server owns both the ORDER (timestamp desc) and the PAGE (30 rows),
              so every column is unsortable and the grid's own pager is replaced
              by the server pager below — re-sorting one server page client-side
              would sort30 rows and pretend to be the whole trail. */}
          <DataGrid
            columns={[
              { key: 'timestamp', label: 'Timestamp', sortable: false, render: (v) => <span className="text-muted-foreground whitespace-nowrap text-xs">{v ? new Date(v).toLocaleString() : '—'}</span> },
              {
                key: 'user', label: 'User', sortable: false,
                render: (_v, log) => (
                  <>
                    <span className="text-sm font-medium">{log.user?.name || log.userId || 'System'}</span>
                    {log.user?.email && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                  </>
                ),
              },
              { key: 'action', label: 'Action', sortable: false, render: (v) => <Badge variant="outline" className="text-xs font-mono">{v}</Badge> },
              {
                key: '_target', label: 'Target', sortable: false,
                render: (_v, log) => (
                  targetOf(log) ? (
                    <button
                      type="button"
                      title="Filter to this record's history"
                      className="text-xs font-mono text-info hover:underline max-w-[150px] truncate block"
                      onClick={() => setTargetFilter(targetOf(log))}
                    >
                      {targetOf(log)}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )
                ),
              },
              {
                key: 'details', label: 'Details', sortable: false,
                render: (v) => (
                  <span
                    className="text-xs text-muted-foreground max-w-[260px] truncate block"
                    title={v ? JSON.stringify(v) : undefined}
                  >
                    {v && Object.keys(v).length
                      ? Object.entries(v).slice(0, 4)
                          .map(([k, val]) => `${k}: ${val !== null && typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
                          .join(' · ')
                      : '—'}
                  </span>
                ),
              },
              { key: 'ip', label: 'IP', sortable: false, render: (v) => <span className="text-xs text-muted-foreground">{v || '—'}</span> },
            ]}
            rows={logs.map((log, i) => ({ ...log, _id: log._id || `row-${i}` }))}
            rowKey="_id"
            empty="No audit logs found"
            showSearch={false}
            manualPagination
          />
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total logs</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground px-2 self-center">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsTab;
