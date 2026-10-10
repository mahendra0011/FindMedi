import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Stethoscope, Activity, DollarSign, FileText, Settings, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/System';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { userFacingError } from '@/lib/errorCopy';

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
      } catch { toast.error('Failed to load revenue overview'); }
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

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCommissionConfigs();
      setConfigs(data.configs || []);
      setStats(data.stats || null);
    } catch { toast.error('Failed to load commission configs'); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      <DataGrid
        columns={[
          {
            key: 'facilityName', label: 'Facility', sortable: false,
            render: (_v, c) => (
              <>
                <p className="font-medium text-foreground">{c.facilityName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.facilityType}</p>
              </>
            ),
          },
          {
            key: 'commissionPercent', label: 'Commission %', sortable: false,
            render: (_v, c) => (
              editId === c._id ? (
                <Input type="number" value={editFields.commissionPercent ?? c.commissionPercent}
                  onChange={e => setEditFields(f => ({ ...f, commissionPercent: Number(e.target.value) }))}
                  className="w-20 h-8 text-sm" min={0} max={100} />
              ) : (
                <span className="font-semibold">{c.commissionPercent}%</span>
              )
            ),
          },
          {
            key: 'commissionCap', label: 'Cap', sortable: false,
            render: (_v, c) => (
              editId === c._id ? (
                <Input type="number" value={editFields.commissionCap ?? c.commissionCap}
                  onChange={e => setEditFields(f => ({ ...f, commissionCap: Number(e.target.value) }))}
                  className="w-24 h-8 text-sm" />
              ) : (
                <span className="text-muted-foreground">₹{c.commissionCap || 0}</span>
              )
            ),
          },
          {
            key: 'payoutSchedule', label: 'Schedule', sortable: false,
            render: (_v, c) => (
              editId === c._id ? (
                <select value={editFields.payoutSchedule ?? c.payoutSchedule}
                  onChange={e => setEditFields(f => ({ ...f, payoutSchedule: e.target.value }))}
                  className="h-8 px-2 rounded border border-input bg-background text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              ) : (
                <span className="capitalize">{c.payoutSchedule}</span>
              )
            ),
          },
          { key: 'totalEarnings', label: 'Earnings', sortable: false, render: (v) => <span className="font-medium">₹{(v || 0).toLocaleString()}</span> },
          { key: 'pendingPayout', label: 'Pending', sortable: false, render: (v) => <span className="text-warning font-medium">₹{(v || 0).toLocaleString()}</span> },
          {
            key: 'status', label: 'Status', sortable: false,
            render: (_v, c) => (
              editId === c._id ? (
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
              )
            ),
          },
          {
            key: '_actions', label: 'Action', sortable: false,
            render: (_v, c) => (
              editId === c._id ? (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" onClick={() => handleSave(c._id)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setEditId(c._id); setEditFields({}); }}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              )
            ),
          },
        ]}
        rows={configs.map((c, i) => ({ ...c, _id: c._id || `cfg-${i}` }))}
        rowKey="_id"
        empty="No commission configs"
        showSearch={false}
        manualPagination
      />
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

  const fetchLedger = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (sourceFilter) params.source = sourceFilter;
      const data = await api.getTransactionLedger(params);
      setTransactions(data.transactions || []);
      setTotals(data.totals || {});
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error('Failed to load transaction ledger'); }
    setLoading(false);
  }, [page, sourceFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        /* Server-paginated + server-filtered (source buttons above own the controls). */
        <DataGrid
          columns={[
            { key: 'createdAt', label: 'Date', sortable: false, render: (v) => <span className="text-xs text-muted-foreground whitespace-nowrap">{v ? new Date(v).toLocaleDateString() : '—'}</span> },
            { key: 'facilityName', label: 'Facility', sortable: false, render: (v) => <span className="text-sm font-medium">{v || '—'}</span> },
            { key: 'source', label: 'Source', sortable: false, render: (v) => <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded-full">{v}</span> },
            { key: 'patientName', label: 'Patient', sortable: false, render: (v) => <span className="text-muted-foreground">{v || '—'}</span> },
            { key: 'amount', label: 'Amount', sortable: false, render: (v) => <span className="text-right font-medium">₹{(v || 0).toLocaleString()}</span> },
            { key: 'commissionAmount', label: 'Commission', sortable: false, render: (v) => <span className="text-right text-warning">₹{(v || 0).toLocaleString()}</span> },
            { key: 'netAmount', label: 'Net', sortable: false, render: (v) => <span className="text-right text-success font-medium">₹{(v || 0).toLocaleString()}</span> },
          ]}
          rows={transactions.map((t, i) => ({ ...t, _id: t._id || `txn-${i}` }))}
          rowKey="_id"
          empty="No transactions found"
          showSearch={false}
          manualPagination
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchLedger(p); }}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchLedger(p); }}>Next</Button>
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

  const fetchPayouts = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await api.getPayouts({ page: p, limit: 30 });
      setPayouts(data.payouts || []);
      setPayoutStats(data.stats || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error('Failed to load payouts'); }
    setLoading(false);
  }, [page]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPayouts(1); }, []);

  const serverMsg = (err) => userFacingError(err, { fallback: 'Failed' });
  const handleMarkPaid = async (id) => {
    if (!confirm('Mark this payout as paid?')) return;
    try {
      await api.markPayoutPaid(id, { transactionRef: `TXN-${crypto.randomUUID()}` });
      toast.success('Payout marked as paid');
      fetchPayouts(page);
    } catch (err) {
      // SA-M5: four-eyes 403 surfaces exactly how many approvals are still missing.
      toast.error(serverMsg(err));
      fetchPayouts(page);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approvePayout(id);
      toast.success('Approval recorded');
      fetchPayouts(page);
    } catch (err) { toast.error(serverMsg(err)); }
  };

  const statusTotals = {};
  (Array.isArray(payoutStats) ? payoutStats : []).forEach(s => { statusTotals[s._id] = { total: s.total || 0, count: s.count || 0 }; });

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
        /* Server-paginated (own Prev/Next below owns paging). */
        <DataGrid
          columns={[
            { key: 'facilityName', label: 'Facility', sortable: false, render: (v) => <span className="font-medium">{v || '—'}</span> },
            { key: 'periodStart', label: 'Period', sortable: false, render: (v, p) => <span className="text-xs text-muted-foreground">{v ? new Date(v).toLocaleDateString() : '—'} - {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString() : '—'}</span> },
            { key: 'grossRevenue', label: 'Gross', sortable: false, render: (v) => <span className="text-right">₹{(v || 0).toLocaleString()}</span> },
            { key: 'commissionAmount', label: 'Commission', sortable: false, render: (v) => <span className="text-right text-warning">₹{(v || 0).toLocaleString()}</span> },
            { key: 'netPayout', label: 'Net Payout', sortable: false, render: (v) => <span className="text-right font-semibold">₹{(v || 0).toLocaleString()}</span> },
            { key: 'transactionCount', label: 'Txns', sortable: false },
            { key: 'status', label: 'Status', sortable: false, render: (v) => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v === 'paid' ? 'bg-success/10 text-success' : v === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{v}</span> },
            {
              key: '_actions', label: 'Action', sortable: false,
              render: (_v, p) => (
                p.status === 'pending' ? (
                  <div className="flex gap-1.5 justify-end items-center">
                    {(p.netPayout || 0) >= 100000 && (
                      <span className="text-[11px] text-muted-foreground tabular-nums" title={(p.approvals || []).map((a) => a.adminName || 'admin').join(', ') || 'No approvals yet'}>
                        {(p.approvals || []).length}/2 approvals
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleApprove(p._id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="default" className="bg-success hover:bg-success/90 gap-1"
                      onClick={() => handleMarkPaid(p._id)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                    </Button>
                  </div>
                ) : p.status === 'paid' && p.transactionRef ? (
                  <span className="text-xs text-muted-foreground">{p.transactionRef}</span>
                ) : null
              ),
            },
          ]}
          rows={payouts.map((p, i) => ({ ...p, _id: p._id || `po-${i}` }))}
          rowKey="_id"
          empty="No payouts yet"
          showSearch={false}
          manualPagination
        />
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchPayouts(p); }}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchPayouts(p); }}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevenueTab() {
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
