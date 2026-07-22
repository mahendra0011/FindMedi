import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Building2, Building, CheckCircle, XCircle, AlertTriangle,
  Clock, TrendingUp, Users, Ban, Search, Mail, MapPin, FileText,
  ChevronDown, ChevronRight, Trash2, UserRound, Stethoscope,
  Activity, DollarSign, History, Flag, Settings, Eye, EyeOff, Star,
  Headset, Tags, FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const statusColors = {
  approved: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted-foreground/10 text-muted-foreground',
};

const planColors = {
  premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const TABS = [
  { key: 'pending', label: 'Pending Approvals', icon: Clock },
  { key: 'all', label: 'All Hospitals', icon: Building2 },
  { key: 'facilities', label: 'Facilities', icon: Building },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'audit', label: 'Audit Logs', icon: History },
  { key: 'moderation', label: 'Content Moderation', icon: Flag },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'settings', label: 'System Settings', icon: Settings },
  { key: 'stats', label: 'Platform Stats', icon: TrendingUp },
  { key: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { key: 'tickets', label: 'Support Tickets', icon: Headset },
  { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'licenses', label: 'License Tracking', icon: FileCheck },
];

function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({ search, role: roleFilter });
      setUsers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try { await api.deleteUser(id); loadUsers(); } catch (e) { console.error(e); }
  };

  const handleBlock = async (id) => {
    try { await api.blockUser(id); loadUsers(); } catch (e) { console.error(e); }
  };

  const roleColors = { admin: 'bg-primary/10 text-primary', doctor: 'bg-info/10 text-info', patient: 'bg-success/10 text-success' };
  const roleIcons = { admin: Shield, doctor: Stethoscope, patient: UserRound };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'admin', 'doctor', 'patient'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Admins</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p></div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-info" /></div>
          <div><p className="text-xs text-muted-foreground">Doctors</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'doctor').length}</p></div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><UserRound className="w-5 h-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Patients</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'patient').length}</p></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const RoleIcon = roleIcons[u.role] || UserRound;
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex items-center gap-1 w-fit ${roleColors[u.role]}`}>
                        <RoleIcon className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleBlock(u.id)}>
                          {u.status === 'blocked' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {u.status === 'blocked' ? 'Unblock' : 'Block'}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (p = page) => {
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
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const data = await api.getAuditLogStats();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchLogs(1); }, [actionFilter]);
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

function ContentModerationTab() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = filter === 'flagged' ? { flagged: 'true' } : {};
      const data = await api.getFlaggedReviews(params);
      setReviews(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const handleFlag = async (id, reason = '') => {
    try { await api.flagReview(id, { reason }); fetchReviews(); } catch (e) { console.error(e); }
  };

  const handleUnflag = async (id) => {
    try { await api.unflagReview(id); fetchReviews(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try { await api.deleteReview(id); fetchReviews(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {['all', 'flagged'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? 'All Reviews' : 'Flagged'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{filter === 'flagged' ? 'No flagged reviews' : 'No reviews found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r._id} className="bg-card rounded-xl border p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground">{r.patientName}</p>
                  <span className="text-xs text-muted-foreground">→</span>
                  <p className="font-medium text-foreground">{r.doctorName}</p>
                  {r.flagged && (
                    <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Flagged</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">({r.date})</span>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>}
                {r.flagReason && <p className="text-xs text-destructive mt-1">Reason: {r.flagReason}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.flagged ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleUnflag(r._id)}>
                    <Eye className="w-3.5 h-3.5" /> Unflag
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleFlag(r._id, 'Moderator review')}>
                    <Flag className="w-3.5 h-3.5" /> Flag
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleDelete(r._id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueTab() {
  const [subTab, setSubTab] = useState('overview');

  const SUB_TABS = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'config', label: 'Commission Config', icon: Settings },
    { key: 'ledger', label: 'Transaction Ledger', icon: FileText },
    { key: 'payouts', label: 'Payouts', icon: DollarSign },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${subTab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'overview' && <RevenueOverview />}
      {subTab === 'config' && <CommissionConfigTab />}
      {subTab === 'ledger' && <TransactionLedgerTab />}
      {subTab === 'payouts' && <PayoutsTab />}
    </div>
  );
}

function RevenueOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardData, commissionData] = await Promise.all([
          api.dashboardStats(),
          api.getCommissionStats().catch(() => null),
        ]);
        setStats({ ...(dashboardData.stats || dashboardData), commission: commissionData });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-success" /></div>
          <p className="text-2xl font-bold text-foreground">₹{(stats?.revenue || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-3"><Users className="w-5 h-5 text-info" /></div>
          <p className="text-2xl font-bold text-foreground">{stats?.totalPatients || 0}</p>
          <p className="text-xs text-muted-foreground">Total Patients</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Stethoscope className="w-5 h-5 text-primary" /></div>
          <p className="text-2xl font-bold text-foreground">{stats?.totalDoctors || 0}</p>
          <p className="text-xs text-muted-foreground">Total Doctors</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3"><Activity className="w-5 h-5 text-warning" /></div>
          <p className="text-2xl font-bold text-foreground">{stats?.todayAppointments || 0}</p>
          <p className="text-xs text-muted-foreground">Today's Appointments</p>
        </div>
      </div>

      {stats?.commission && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">₹{(stats.commission.totalEarnings || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Platform Commission Earned</p>
          </div>
          <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl border border-warning/20 p-4 text-center">
            <p className="text-2xl font-bold text-warning">₹{(stats.commission.pendingPayoutAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Payout</p>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl border border-success/20 p-4 text-center">
            <p className="text-2xl font-bold text-success">₹{(stats.commission.totalPaid || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Paid Out</p>
          </div>
          <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-xl border border-info/20 p-4 text-center">
            <p className="text-2xl font-bold text-info">{stats.commission.pendingPayouts || 0}</p>
            <p className="text-xs text-muted-foreground">Pending Payouts</p>
          </div>
        </div>
      )}

      {stats?.commission?.monthlyTrend && stats.commission.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Monthly Commission Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.commission.monthlyTrend.slice().reverse().map((item, i) => {
                const max = Math.max(...stats.commission.monthlyTrend.map(d => d.amount || 0), 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-24">
                      {['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][item._id?.month || 1]} {item._id?.year || ''}
                    </span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${((item.amount || 0) / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">₹{(item.amount || 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-16">-₹{(item.commission || 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.commission?.sourceBreakdown && stats.commission.sourceBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenue by Source</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.commission.sourceBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm capitalize font-medium">{item._id}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{item.count} txns</span>
                    <span className="text-sm font-semibold">₹{(item.amount || 0).toLocaleString()}</span>
                    <span className="text-xs text-warning">-₹{(item.commission || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CommissionConfigTab() {
  const [configs, setConfigs] = useState([]);
  const [stats, setStats] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await api.getCommissionConfigs();
      setConfigs(data.configs || []);
      setStats(data.stats || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async (id) => {
    try {
      await api.updateCommissionConfig(id, editFields);
      toast.success('Commission config updated');
      setEditId(null);
      fetchConfigs();
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.totalActive}</p>
            <p className="text-xs text-muted-foreground">Active Configs</p>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.totalPaused}</p>
            <p className="text-xs text-muted-foreground">Paused</p>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-primary">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Facility</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Commission %</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Cap</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Schedule</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Earnings</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Pending</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c, i) => (
              <tr key={c._id || i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{c.facilityName || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.facilityType}</p>
                </td>
                <td className="px-4 py-3">
                  {editId === c._id ? (
                    <Input type="number" value={editFields.commissionPercent ?? c.commissionPercent}
                      onChange={e => setEditFields(f => ({ ...f, commissionPercent: Number(e.target.value) }))}
                      className="w-20 h-8 text-sm" min={0} max={100} />
                  ) : (
                    <span className="font-semibold">{c.commissionPercent}%</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editId === c._id ? (
                    <Input type="number" value={editFields.commissionCap ?? c.commissionCap}
                      onChange={e => setEditFields(f => ({ ...f, commissionCap: Number(e.target.value) }))}
                      className="w-24 h-8 text-sm" />
                  ) : (
                    <span>₹{c.commissionCap || 0}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editId === c._id ? (
                    <select value={editFields.payoutSchedule ?? c.payoutSchedule}
                      onChange={e => setEditFields(f => ({ ...f, payoutSchedule: e.target.value }))}
                      className="h-8 px-2 rounded border border-input bg-background text-sm">
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  ) : (
                    <span className="capitalize">{c.payoutSchedule}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">₹{(c.totalEarnings || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-warning font-medium">₹{(c.pendingPayout || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {editId === c._id ? (
                    <select value={editFields.status ?? c.status}
                      onChange={e => setEditFields(f => ({ ...f, status: e.target.value }))}
                      className="h-8 px-2 rounded border border-input bg-background text-sm">
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {c.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editId === c._id ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" onClick={() => handleSave(c._id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(c._id); setEditFields({}); }}>
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionLedgerTab() {
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ totalAmount: 0, totalCommission: 0, totalNet: 0, count: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sourceFilter, setSourceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLedger = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (sourceFilter) params.source = sourceFilter;
      const data = await api.getTransactionLedger(params);
      setTransactions(data.transactions || []);
      setTotals(data.totals || {});
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchLedger(1); }, [sourceFilter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-foreground">{totals.count}</p>
          <p className="text-xs text-muted-foreground">Transactions</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-success">₹{(totals.totalAmount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Gross Revenue</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-warning">₹{(totals.totalCommission || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Commission</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-primary">₹{(totals.totalNet || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Net to Facility</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'appointment', 'lab', 'pharmacy', 'ipd'].map(s => (
          <button key={s} onClick={() => setSourceFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${sourceFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No transactions found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Facility</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Source</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Patient</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Commission</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t._id || i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{t.facilityName || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded-full">{t.source}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.patientName || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{(t.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-warning">₹{(t.commissionAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-success font-medium">₹{(t.netAmount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchLedger(page - 1); }}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchLedger(page + 1); }}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutsTab() {
  const [payouts, setPayouts] = useState([]);
  const [payoutStats, setPayoutStats] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = async (p = page) => {
    setLoading(true);
    try {
      const data = await api.getPayouts({ page: p, limit: 30 });
      setPayouts(data.payouts || []);
      setPayoutStats(data.stats || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPayouts(1); }, []);

  const handleMarkPaid = async (id) => {
    try {
      await api.markPayoutPaid(id, { transactionRef: `TXN-${Date.now()}` });
      toast.success('Payout marked as paid');
      fetchPayouts(page);
    } catch { toast.error('Failed'); }
  };

  const statusTotals = {};
  payoutStats.forEach(s => { statusTotals[s._id] = { total: s.total || 0, count: s.count || 0 }; });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-warning">{statusTotals.pending?.count || 0}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-sm font-medium mt-1">₹{((statusTotals.pending?.total || 0)).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-success">{statusTotals.paid?.count || 0}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-sm font-medium mt-1">₹{((statusTotals.paid?.total || 0)).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{statusTotals.cancelled?.count || 0}</p>
          <p className="text-xs text-muted-foreground">Cancelled</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No payouts yet</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Facility</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Period</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Gross</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Commission</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Net Payout</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Txns</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={p._id || i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.facilityName || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.periodStart ? new Date(p.periodStart).toLocaleDateString() : '—'} - {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">₹{(p.grossRevenue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-warning">₹{(p.commissionAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{(p.netPayout || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.transactionCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-success/10 text-success' : p.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'pending' && (
                      <Button size="sm" variant="default" className="bg-success hover:bg-success/90 gap-1"
                        onClick={() => handleMarkPaid(p._id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                      </Button>
                    )}
                    {p.status === 'paid' && p.transactionRef && (
                      <span className="text-xs text-muted-foreground">{p.transactionRef}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchPayouts(page - 1); }}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchPayouts(page + 1); }}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      setSettings(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key) => {
    try {
      let val = editValue;
      if (settings[key].type === 'number') val = Number(val);
      else if (settings[key].type === 'boolean') val = val === 'true';
      else if (settings[key].type === 'array') val = val.split(',').map(s => s.trim());
      await api.updateSystemSetting(key, { value: val });
      toast.success('Setting updated');
      setEditKey(null);
      fetchSettings();
    } catch { toast.error('Failed to update setting'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {settings && Object.entries(settings).map(([key, config]) => (
        <div key={key} className="bg-card rounded-xl border p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {editKey === key ? (
              <div className="flex items-center gap-2 mt-2">
                {config.type === 'boolean' ? (
                  <select value={String(editValue)} onChange={e => setEditValue(e.target.value)}
                    className="h-8 px-2 rounded border border-input bg-background text-sm">
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm h-8 max-w-xs" />
                )}
                <Button size="sm" onClick={() => handleSave(key)}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground mt-1">
                {config.type === 'boolean' ? (config.value ? '✅ Enabled' : '❌ Disabled') :
                 config.type === 'array' ? (config.value || []).join(', ') :
                 String(config.value)}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">{config.type}</Badge>
          {editKey !== key && (
            <Button variant="ghost" size="sm" onClick={() => { setEditKey(key); setEditValue(String(config.value)); }}>
              <Settings className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function DisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getDisputes({}), api.getDisputeStats()]);
      setDisputes(res.disputes || []);
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'All' ? disputes : disputes.filter(d => d.status === filter);

  const handleResolve = async (id) => {
    if (!resolution) return;
    await api.updateDisputeStatus(id, { status: 'Resolved', resolution });
    setSelected(null);
    setResolution('');
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Open', value: stats.open, color: 'text-warning' },
            { label: 'In Review', value: stats.inReview, color: 'text-info' },
            { label: 'Resolved', value: stats.resolved, color: 'text-success' },
            { label: 'Critical', value: stats.critical, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Open', 'In Review', 'Resolved', 'Dismissed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? disputes.length : disputes.filter(d => d.status === f).length})</button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disputes..." className="pl-10" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No disputes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.filter(d => !search || d.disputeId?.includes(search) || d.raisedByName?.toLowerCase().includes(search.toLowerCase())).map((d, i) => (
            <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${d.priority === 'Critical' ? 'text-destructive' : d.priority === 'High' ? 'text-warning' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground text-sm">#{d.disputeId}</span>
                    <Badge variant="outline" className="text-[10px]">{d.againstType}</Badge>
                  </div>
                  <p className="text-sm text-foreground">{d.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.raisedByName} → {d.againstName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={d.status === 'Resolved' ? 'bg-success/10 text-success' : d.status === 'Dismissed' ? 'bg-destructive/10 text-destructive' : d.status === 'In Review' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}>{d.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(d); setResolution(d.resolution || ''); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">#{selected.disputeId}</h3>
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Reason:</strong> {selected.reason}</div>
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Raised by:</strong> {selected.raisedByName}</div>
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Against:</strong> {selected.againstName} ({selected.againstType})</div>
              {selected.description && <div className="p-3 bg-muted/20 rounded-xl text-sm">{selected.description}</div>}
            </div>
            {(selected.status === 'Open' || selected.status === 'In Review') && (
              <div className="space-y-3">
                <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background p-3 text-sm min-h-[80px]" placeholder="Resolution notes..." />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success" onClick={() => handleResolve(selected._id)}>Resolve</Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => { api.updateDisputeStatus(selected._id, { status: 'Dismissed' }); setSelected(null); load(); }}>Dismiss</Button>
                </div>
              </div>
            )}
            {selected.resolution && <div className="p-3 bg-success/10 rounded-xl text-sm mt-3"><strong>Resolution:</strong> {selected.resolution}</div>}
            <Button variant="outline" className="w-full mt-3" onClick={() => setSelected(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SupportTicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getSupportTickets({}), api.getTicketStats()]);
      setTickets(res.tickets || []);
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReply = async () => {
    if (!reply.trim()) return;
    await api.addTicketMessage(selected._id, { message: reply, senderName: 'Super Admin' });
    setReply('');
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Open', value: stats.open, color: 'text-warning' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-info' },
            { label: 'Resolved', value: stats.resolved, color: 'text-success' },
            { label: 'Urgent', value: stats.urgent, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? tickets.length : tickets.filter(t => t.status === f).length})</button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-10" />
      </div>
      {tickets.filter(t => filter === 'All' || t.status === filter).filter(t => !search || t.ticketId?.includes(search) || t.subject?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <Headset className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.filter(t => filter === 'All' || t.status === filter).filter(t => !search || t.ticketId?.includes(search) || t.subject?.toLowerCase().includes(search.toLowerCase())).map((t, i) => (
            <motion.div key={t._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelected(t); setReply(''); }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">#{t.ticketId}</span>
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    <Badge className={t.priority === 'Urgent' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}>{t.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.raisedByName}</p>
                </div>
                <Badge className={t.status === 'Resolved' || t.status === 'Closed' ? 'bg-success/10 text-success' : t.status === 'In Progress' ? 'bg-info/10 text-info' : t.status === 'Waiting on User' ? 'bg-warning/10 text-warning' : 'bg-muted-foreground/10 text-muted-foreground'}>{t.status}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">#{selected.ticketId}</h3>
              <Badge className={selected.status === 'Resolved' || selected.status === 'Closed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{selected.status}</Badge>
            </div>
            <div className="p-4 bg-muted/20 rounded-xl mb-4">
              <p className="font-medium text-foreground">{selected.subject}</p>
              <p className="text-sm text-muted-foreground mt-2">{selected.description}</p>
              <p className="text-xs text-muted-foreground mt-2">From: {selected.raisedByName} | {selected.category}</p>
            </div>
            {selected.messages?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Conversation</p>
                <div className="space-y-2">
                  {selected.messages.map((msg, j) => (
                    <div key={j} className={`p-3 rounded-xl ${msg.senderName === 'Super Admin' ? 'bg-primary/10 ml-8' : 'bg-muted/20 mr-8'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.status !== 'Resolved' && selected.status !== 'Closed' && (
              <div className="flex gap-2">
                <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." className="flex-1" />
                <Button onClick={handleReply}>Send</Button>
                <Button variant="outline" size="sm" onClick={() => { api.updateTicketStatus(selected._id, { status: 'Resolved' }); setSelected(null); load(); }}>Resolve</Button>
              </div>
            )}
            <Button variant="outline" className="w-full mt-3" onClick={() => setSelected(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('test');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'test', description: '', displayOrder: 0 });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCategories({ type: typeFilter });
      setCategories(res.categories || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editId) await api.updateCategory(editId, form);
      else await api.createCategory(form);
      setShowForm(false);
      setForm({ name: '', type: typeFilter, description: '', displayOrder: 0 });
      setEditId(null);
      load();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, type: cat.type, description: cat.description || '', displayOrder: cat.displayOrder || 0 });
    setEditId(cat._id);
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1">
          {['test', 'medicine', 'department', 'service'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', type: typeFilter, description: '', displayOrder: 0 }); }}>{showForm ? 'Cancel' : 'Add Category'}</Button>
      </div>
      {showForm && (
        <div className="bg-card rounded-xl border border-border/60 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </div>
          <div className="w-20">
            <label className="text-xs text-muted-foreground mb-1 block">Order</label>
            <Input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
          </div>
          <Button onClick={handleSave} className="shrink-0">{editId ? 'Update' : 'Create'}</Button>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="pl-10" />
      </div>
      {categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <Tags className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No categories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm">{c.name}</h4>
                <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
              </div>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Order: {c.displayOrder || 0}</span>
                <span className={c.isActive ? 'text-success' : 'text-destructive'}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEdit(c)}>Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => { api.deleteCategory(c._id); load(); }}>Delete</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function LicensesTab() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [stats, setStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getLicenses({}), api.getLicenseStats()]);
      setLicenses(res.licenses || []);
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Active', value: stats.active, color: 'text-success' },
            { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-warning' },
            { label: 'Expired', value: stats.expired, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Active', 'Expiring Soon', 'Expired', 'Revoked'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? licenses.length : licenses.filter(l => l.status === f).length})</button>
        ))}
      </div>
      {licenses.filter(l => filter === 'All' || l.status === filter).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <FileCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No licenses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {licenses.filter(l => filter === 'All' || l.status === filter).map((l, i) => {
            const daysLeft = Math.ceil((new Date(l.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <motion.div key={l._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{l.facilityName || 'Unknown Facility'}</span>
                      <Badge variant="outline" className="text-[10px]">{l.facilityType}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{l.licenseType}: <span className="font-mono">{l.licenseNumber}</span></p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Issued: {new Date(l.issueDate).toLocaleDateString()}</span>
                      <span>Expires: {new Date(l.expiryDate).toLocaleDateString()}</span>
                      {daysLeft > 0 && daysLeft <= 30 && <span className="text-warning font-medium">{daysLeft}d left</span>}
                      {daysLeft <= 0 && <span className="text-destructive font-medium">Expired</span>}
                    </div>
                  </div>
                  <Badge className={
                    l.status === 'Active' ? 'bg-success/10 text-success' :
                    l.status === 'Expiring Soon' ? 'bg-warning/10 text-warning' :
                    l.status === 'Expired' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted-foreground/10 text-muted-foreground'
                  }>{l.status}</Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [pendingFacilities, setPendingFacilities] = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityRejectingId, setFacilityRejectingId] = useState(null);
  const [facilityRejectReason, setFacilityRejectReason] = useState('');
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pending, all] = await Promise.all([
        api.getPendingHospitals(),
        api.getHospitals({}),
      ]);
      setPendingHospitals(pending || []);
      setAllHospitals(all || []);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await api.approveHospital(id);
      toast.success('Hospital approved successfully');
      fetchData();
    } catch {
      toast.error('Failed to approve hospital');
    }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.rejectHospital(id, { reason: rejectReason });
      toast.success('Hospital rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch {
      toast.error('Failed to reject hospital');
    }
  }

  async function handleSuspend(id) {
    try {
      await api.suspendHospital(id);
      toast.success('Hospital suspended');
      fetchData();
    } catch {
      toast.error('Failed to suspend hospital');
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteHospital(id);
      toast.success('Hospital permanently deleted');
      setDeleteConfirmId(null);
      if (expandedHospitalId === id) {
        setExpandedHospitalId(null);
        setHospitalDoctors([]);
      }
      fetchData();
    } catch {
      toast.error('Failed to delete hospital');
    }
  }

  async function toggleExpand(hospitalId) {
    if (expandedHospitalId === hospitalId) {
      setExpandedHospitalId(null);
      setHospitalDoctors([]);
      return;
    }
    setExpandedHospitalId(hospitalId);
    setDoctorsLoading(true);
    try {
      const data = await api.getDoctors({ hospitalId });
      setHospitalDoctors(data || []);
    } catch {
      setHospitalDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  }

  async function fetchFacilities(type) {
    setFacilityLoading(true);
    try {
      const data = await api.getPendingFacilities(type || '');
      setPendingFacilities(data || []);
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      setFacilityLoading(false);
    }
  }

  async function handleApproveFacility(id) {
    try {
      await api.approveFacility(id);
      toast.success('Facility approved successfully');
      fetchFacilities(facilityType);
    } catch {
      toast.error('Failed to approve facility');
    }
  }

  async function handleRejectFacility(id) {
    if (!facilityRejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.rejectFacility(id, { reason: facilityRejectReason });
      toast.success('Facility rejected');
      setFacilityRejectingId(null);
      setFacilityRejectReason('');
      fetchFacilities(facilityType);
    } catch {
      toast.error('Failed to reject facility');
    }
  }

  useEffect(() => {
    if (activeTab === 'facilities') {
      fetchFacilities(facilityType);
    }
  }, [activeTab, facilityType]);

  const FACILITY_TYPES = [
    { key: '', label: 'All' },
    { key: 'hospital', label: 'Hospital' },
    { key: 'clinic', label: 'Clinic' },
    { key: 'lab', label: 'Lab' },
    { key: 'pharmacy', label: 'Pharmacy' },
  ];

  const filteredHospitals = allHospitals.filter(h => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      h.name?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: allHospitals.length,
    approved: allHospitals.filter(h => h.status === 'approved').length,
    pending: allHospitals.filter(h => h.status === 'pending').length,
    rejected: allHospitals.filter(h => h.status === 'rejected').length,
    suspended: allHospitals.filter(h => h.status === 'suspended').length,
  };

  const maxStat = Math.max(stats.approved, stats.pending, stats.rejected, stats.suspended, 1);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">
            Manage hospitals across the <span className="font-semibold text-foreground">MediCore</span> platform
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-sm text-primary font-medium">
          <Shield className="w-4 h-4" />
          Super Admin
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-3" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingHospitals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">All Caught Up</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No pending hospital registrations. New registrations will appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pendingHospitals.map((hospital, i) => (
                <motion.div
                  key={hospital._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <Badge className="bg-warning/10 text-warning border-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>

                      <h3 className="font-heading font-semibold text-lg text-foreground mb-3">
                        {hospital.name}
                      </h3>

                      <div className="space-y-2 mb-5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{hospital.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>License: {hospital.licenseNumber}</span>
                        </div>
                      </div>

                      {hospital.description && (
                        <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
                          {hospital.description}
                        </p>
                      )}

                      {rejectingId === hospital._id ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(hospital._id)}
                              className="gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success hover:bg-success/90 gap-1.5"
                            onClick={() => handleApprove(hospital._id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            onClick={() => setRejectingId(hospital._id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* All Hospitals Tab */}
      {activeTab === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredHospitals.length} of {allHospitals.length} hospitals
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Hospital</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">City</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Plan</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Created</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {searchTerm ? 'No hospitals match your search' : 'No hospitals registered yet'}
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((h, i) => (
                    <React.Fragment key={h._id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(h._id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {expandedHospitalId === h._id
                              ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                            }
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{h.name}</p>
                              <p className="text-xs text-muted-foreground">{h.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{h.city}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[h.status] || 'bg-muted text-muted-foreground'}`}>
                            {h.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                            {h.status === 'pending' && <Clock className="w-3 h-3" />}
                            {h.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {h.status === 'suspended' && <Ban className="w-3 h-3" />}
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planColors[h.subscriptionPlan] || 'bg-muted text-muted-foreground'}`}>
                            {h.subscriptionPlan || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {h.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                                onClick={() => handleSuspend(h._id)}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Suspend
                              </Button>
                            )}
                            {deleteConfirmId === h._id ? (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(h._id)}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                                onClick={() => setDeleteConfirmId(h._id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {/* Expanded doctors row */}
                      {expandedHospitalId === h._id && (
                        <tr key={`${h._id}-doctors`} className="bg-muted/20 border-b">
                          <td colSpan={6} className="px-4 py-4">
                            {doctorsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Loading doctors...
                              </div>
                            ) : hospitalDoctors.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No doctors found for this hospital</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                  Doctors ({hospitalDoctors.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {hospitalDoctors.map(doc => (
                                    <div key={doc._id} className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <UserRound className="w-3.5 h-3.5 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{doc.specialization}</p>
                                      </div>
                                      <span className={`ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                        {doc.available ? 'Available' : 'Unavailable'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Type filter */}
          <div className="flex gap-2 mb-5">
            {FACILITY_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setFacilityType(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  facilityType === t.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {facilityLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-3" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingFacilities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">All Caught Up</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No pending facility registrations for this type.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pendingFacilities.map((facility, i) => (
                <motion.div
                  key={facility._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-warning/10 text-warning border-0">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <Badge className="bg-primary/10 text-primary border-0 capitalize">
                            {facility.type || 'hospital'}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-heading font-semibold text-lg text-foreground mb-3">
                        {facility.name}
                      </h3>

                      <div className="space-y-2 mb-5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{facility.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{facility.city}{facility.state ? `, ${facility.state}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{facility.createdAt ? new Date(facility.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </div>
                      </div>

                      {facilityRejectingId === facility._id ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Reason for rejection..."
                            value={facilityRejectReason}
                            onChange={e => setFacilityRejectReason(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectFacility(facility._id)}
                              className="gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setFacilityRejectingId(null); setFacilityRejectReason(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success hover:bg-success/90 gap-1.5"
                            onClick={() => handleApproveFacility(facility._id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            onClick={() => setFacilityRejectingId(facility._id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <UserManagementTab />
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <AuditLogsTab />
      )}

      {/* Content Moderation Tab */}
      {activeTab === 'moderation' && (
        <ContentModerationTab />
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <RevenueTab />
      )}

      {/* System Settings Tab */}
      {activeTab === 'settings' && (
        <SystemSettingsTab />
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && <DisputesTab />}
      {/* Support Tickets Tab */}
      {activeTab === 'tickets' && <SupportTicketsTab />}
      {/* Categories Tab */}
      {activeTab === 'categories' && <CategoriesTab />}
      {/* License Tracking Tab */}
      {activeTab === 'licenses' && <LicensesTab />}

      {/* Platform Stats Tab */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Hospitals', value: stats.total, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
              { label: 'Suspended', value: stats.suspended, icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted-foreground/10' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  No hospitals registered yet
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Approved', value: stats.approved, color: 'bg-success' },
                    { label: 'Pending', value: stats.pending, color: 'bg-warning' },
                    { label: 'Rejected', value: stats.rejected, color: 'bg-destructive' },
                    { label: 'Suspended', value: stats.suspended, color: 'bg-muted-foreground' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / maxStat) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
