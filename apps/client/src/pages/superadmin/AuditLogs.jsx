import React, { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      if (search) params.search = search;
      const data = await api.getAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error('Failed to load audit logs'); }
    setLoading(false);
  }, [page, actionFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getAuditLogStats();
      setStats(data);
    } catch { toast.error('Failed to load audit stats'); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(1); }, [actionFilter]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = () => { fetchLogs(1); };

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))];

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
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No audit logs found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Timestamp</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Action</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Details</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log._id || i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{log.user?.name || log.userId || 'System'}</span>
                    {log.user?.email && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground max-w-xs truncate block">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
