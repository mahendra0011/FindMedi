import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  BarChart3,
  Calendar,
  IndianRupee,
  TrendingUp,
  MapPin,
  Eye,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';

export default function AdminLawyers() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'all' | 'bookings' | 'analytics'>('approvals');

  const [pending, setPending] = useState<any[]>([]);
  const [allLawyers, setAllLawyers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'approvals') {
        const res = await api.getPendingLawyers();
        setPending(res?.lawyers || []);
      } else if (activeTab === 'all') {
        const res = await api.getAdminLawyers({ search: search || undefined });
        setAllLawyers(res?.lawyers || []);
      } else if (activeTab === 'bookings') {
        const res = await api.getAdminLawyerBookings();
        setBookings(res?.bookings || []);
      } else if (activeTab === 'analytics') {
        const res = await api.getLawyerAnalytics();
        setAnalytics(res);
      }
    } catch (err) {
      console.error('Failed to fetch admin lawyer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve and activate this advocate profile on FindMedi?')) return;
    try {
      await api.approveLawyer(id);
      alert('Advocate verified and approved successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await api.rejectLawyer(id, reason);
      alert('Advocate registration rejected.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    }
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const reason = suspend ? prompt('Reason for suspension:') || 'Policy violation' : undefined;
    try {
      await api.suspendLawyer(id, suspend, reason);
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
              <Scale className="w-7 h-7 text-slate-900 dark:text-slate-100" />
              Legal Services & Advocate Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify Bar Council registrations, review advocate credentials, and oversee consultation cases.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'approvals'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Bar Council Approvals ({pending.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'all'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            All Advocates ({allLawyers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'bookings'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            All Consultations ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'analytics'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Legal Analytics
          </button>
        </div>

        {/* ── 1. APPROVALS QUEUE ──────────────────────────────────── */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                No pending advocate verification requests. All registrations processed!
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((lawyer) => {
                  const user = lawyer.userId || {};
                  return (
                    <div
                      key={lawyer._id}
                      className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-14 h-14 rounded-2xl object-cover border"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-lg">
                              {(user.name || 'Adv').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Adv. {user.name}
                              </h3>
                              <Badge className="bg-amber-500 text-white text-[10px]">
                                Verification Pending
                              </Badge>
                            </div>

                            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                              <div>
                                Email: <strong>{user.email}</strong> • Phone: <strong>{user.phone}</strong>
                              </div>
                              <div>
                                Bar Enrollment No: <strong className="text-slate-900 dark:text-slate-100 font-mono">{lawyer.barCouncilNumber}</strong> ({lawyer.stateBarCouncil})
                              </div>
                              <div>
                                Experience: {lawyer.yearsOfPractice || 0} years • City: {lawyer.jurisdictionCity}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(lawyer._id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs"
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApprove(lawyer._id)}
                            className="bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-bold rounded-xl text-xs"
                          >
                            Approve & Verify
                          </Button>
                        </div>
                      </div>

                      {/* Practice areas & bio */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Practice Categories:{' '}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 capitalize">
                            {(lawyer.practiceCategories || []).join(', ').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Courts:{' '}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {(lawyer.courtsPracticedIn || []).join(', ')}
                          </span>
                        </div>
                        {lawyer.bio && (
                          <p className="text-slate-600 dark:text-slate-400 italic">
                            "{lawyer.bio}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 2. ALL ADVOCATES ───────────────────────────────────── */}
        {activeTab === 'all' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by advocate name or Bar number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  className="pl-9 rounded-xl text-xs"
                />
              </div>
              <Button size="sm" onClick={fetchData} className="rounded-xl text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                Search
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="pb-3 font-semibold">Advocate</th>
                    <th className="pb-3 font-semibold">Bar Reg Number</th>
                    <th className="pb-3 font-semibold">City</th>
                    <th className="pb-3 font-semibold">Fee (₹)</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {allLawyers.map((l) => (
                    <tr key={l._id}>
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                        Adv. {l.userId?.name || 'Advocate'}
                      </td>
                      <td className="py-3 font-mono text-slate-900 dark:text-slate-100">
                        {l.barCouncilNumber}
                      </td>
                      <td className="py-3 text-slate-500">
                        {l.jurisdictionCity || 'N/A'}
                      </td>
                      <td className="py-3 font-bold">
                        ₹{l.consultationFee || 500}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            l.lawyerStatus === 'active'
                              ? 'bg-emerald-600 text-white'
                              : l.lawyerStatus === 'suspended'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }
                        >
                          {l.lawyerStatus}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {l.lawyerStatus === 'active' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(l._id, true)}
                            className="text-rose-600 text-xs h-7"
                          >
                            Suspend
                          </Button>
                        ) : l.lawyerStatus === 'suspended' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(l._id, false)}
                            className="text-emerald-600 text-xs h-7"
                          >
                            Reactivate
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

        {/* ── 3. BOOKINGS & CASES OVERSIGHT ──────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Live & Past Legal Consultation Cases
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="pb-3 font-semibold">Booking ID</th>
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Advocate</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Fee</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {b.bookingNumber || b._id.slice(-6)}
                      </td>
                      <td className="py-3 text-slate-800 dark:text-slate-200">
                        {b.userId?.name || 'Client'}
                      </td>
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                        Adv. {b.lawyerId?.userId?.name || 'Assigned Advocate'}
                      </td>
                      <td className="py-3 capitalize text-slate-600 dark:text-slate-400">
                        {b.category?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 font-bold">₹{b.fee}</td>
                      <td className="py-3">
                        <Badge
                          className={
                            b.status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : b.status === 'confirmed'
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                              : 'bg-slate-500 text-white'
                          }
                        >
                          {b.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. ANALYTICS ───────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500">Total Consultations</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {analytics?.totalBookings || bookings.length}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500">Total Legal Fee Volume</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{(analytics?.totalRevenue || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500">Platform Commission (10%)</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{(analytics?.platformRevenue || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500">Active Verified Advocates</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {analytics?.activeLawyersCount || allLawyers.filter((l) => l.lawyerStatus === 'active').length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border p-4 mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold">🔒 MLC Digital Vault: encrypted at rest</span>
          <span className="text-[11px] text-muted-foreground">Police intimation + medico-legal files show encryption indicator.</span>
        </div>
      </div>
    </div>
  );
}
