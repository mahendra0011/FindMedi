import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';

export default function AdminAssistants() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'all' | 'bookings' | 'analytics'>('approvals');

  const [pending, setPending] = useState<any[]>([]);
  const [allAssistants, setAllAssistants] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'approvals') {
        const res = await api.getPendingAssistants();
        setPending(res?.assistants || []);
      } else if (activeTab === 'all') {
        const res = await api.getAdminAssistants({ search: search || undefined });
        setAllAssistants(res?.assistants || []);
      } else if (activeTab === 'bookings') {
        const res = await api.getAdminAssistantBookings();
        setBookings(res?.bookings || []);
      } else if (activeTab === 'analytics') {
        const res = await api.getAssistantAnalytics();
        setAnalytics(res);
      }
    } catch (err) {
      console.error('Failed to fetch admin assistant data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveAssistant(id);
      alert('Assistant verified and approved successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await api.rejectAssistant(id, reason);
      alert('Assistant rejected.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    }
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const reason = suspend ? prompt('Reason for suspension:') || 'Policy violation' : undefined;
    try {
      await api.suspendAssistant(id, suspend, reason);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-teal-600" />
              Hospital Assistant Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Admin panel for assistant verification, profile monitoring, bookings oversight, and revenue analytics.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'approvals', label: `Pending Approvals (${pending.length})`, icon: ShieldCheck },
            { id: 'all', label: 'All Assistants', icon: Users },
            { id: 'bookings', label: 'All Bookings', icon: Calendar },
            { id: 'analytics', label: 'Analytics & Revenue', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── 1. APPROVALS QUEUE ──────────────────────────────────── */}
        {activeTab === 'approvals' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Assistant Verification Queue
            </h3>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading queue...</div>
            ) : pending.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All pending assistant applications have been reviewed!
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((ast) => (
                  <div
                    key={ast._id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {ast.userId?.name || 'Applicant'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {ast.govtIdType}: {ast.govtIdNumber}
                        </Badge>
                        <span className="text-xs text-slate-400">• {ast.userId?.email}</span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {ast.experienceYears} Years Exp • Hospitals:{' '}
                        <strong>{(ast.hospitalsCovered || []).join(', ')}</strong> • Rate: ₹{ast.pricePerHour}/hr
                      </div>

                      {ast.bio && (
                        <p className="text-xs text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border">
                          "{ast.bio}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(ast._id)}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApprove(ast._id)}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        Approve & Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 2. ALL ASSISTANTS ───────────────────────────────────── */}
        {activeTab === 'all' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                All Platform Assistants ({allAssistants.length})
              </h3>
              <Input
                type="text"
                placeholder="Search assistant by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs text-xs h-9"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-3">Name & Contact</th>
                    <th className="py-3 px-3">Hospitals</th>
                    <th className="py-3 px-3">Experience</th>
                    <th className="py-3 px-3">Rate</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allAssistants.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{a.userId?.name}</div>
                        <div className="text-[10px] text-slate-400">{a.userId?.email}</div>
                      </td>
                      <td className="py-3 px-3">{(a.hospitalsCovered || []).slice(0, 2).join(', ')}</td>
                      <td className="py-3 px-3">{a.experienceYears || 1} yrs</td>
                      <td className="py-3 px-3 font-bold text-teal-600">₹{a.pricePerHour}/hr</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={a.assistantStatus === 'active' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {a.assistantStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {a.assistantStatus === 'active' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(a._id, true)}
                            className="text-xs text-rose-600 hover:text-rose-700 h-7"
                          >
                            Suspend
                          </Button>
                        ) : a.assistantStatus === 'suspended' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(a._id, false)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 h-7"
                          >
                            Reinstate
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 3. ALL BOOKINGS ─────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Live & Historical Assistant Shifts ({bookings.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-3">Shift #</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-3">Assistant</th>
                    <th className="py-3 px-3">Hospital</th>
                    <th className="py-3 px-3">Fee</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-bold">
                        #{b.bookingNumber || String(b._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-3">{b.patientId?.name || 'Patient'}</td>
                      <td className="py-3 px-3">{b.assistantId?.name || 'Unassigned'}</td>
                      <td className="py-3 px-3">{b.hospital}</td>
                      <td className="py-3 px-3 font-bold text-teal-600">₹{b.cost?.total || 0}</td>
                      <td className="py-3 px-3">
                        <Badge className="text-[10px]">{b.status?.replace('_', ' ').toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. ANALYTICS & REVENUE ──────────────────────────────── */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <span className="text-xs text-slate-500">Gross Shift Revenue</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{analytics.financials?.grossBookingsRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <span className="text-xs text-slate-500">Platform Commission (10%)</span>
                <div className="text-2xl font-black text-teal-600 mt-1">
                  ₹{analytics.financials?.platformCommission10Pct?.toLocaleString('en-IN') || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <span className="text-xs text-slate-500">Total Bookings</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {analytics.bookings?.total || 0}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">
                  {analytics.bookings?.completionRate || 100}% Completed
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <span className="text-xs text-slate-500">Active Attendants</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {analytics.assistants?.active || 0}
                </div>
                <span className="text-[10px] text-amber-500 font-bold">
                  {analytics.assistants?.pending || 0} Pending
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border p-4 mt-4">
          <p className="font-semibold text-sm mb-2">Ward Duty Timeline</p>
          <p className="text-xs text-muted-foreground">Morning → Afternoon → Night roster blocks per ward. Detailed timeline view coming from duty-roster API.</p>
        </div>
      </div>
    </div>
  );
}
