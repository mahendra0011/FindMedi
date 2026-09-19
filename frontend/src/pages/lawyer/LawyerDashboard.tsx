import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  Clock,
  IndianRupee,
  Star,
  ShieldCheck,
  Power,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Send,
  Plus,
  MessageSquare,
  Settings,
  Briefcase,
  History,
  Phone,
  Layers,
  Award,
  Video,
  UserCheck,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { CaseNotesView } from '../../components/lawyer/CaseNotesView';
import { LawyerChatPanel } from '../../components/lawyer/LawyerChatPanel';
import { BookingStatusPanel } from '../../components/lawyer/BookingStatusPanel';
import { api } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinLawyerBookingRoom } from '../../lib/socket';

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requests' | 'active' | 'cases' | 'earnings' | 'profile' | 'documents' | 'reviews' | 'settings'
  >('overview');

  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Incoming Requests & Actions
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposedTime, setProposedTime] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Profile Edit fields
  const [editBio, setEditBio] = useState('');
  const [editFee, setEditFee] = useState(500);
  const [editFollowUpFee, setEditFollowUpFee] = useState(500);
  const [editDuration, setEditDuration] = useState(30);
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings fields
  const [acceptsUrgent, setAcceptsUrgent] = useState(true);
  const [bankHolder, setBankHolder] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankUpi, setBankUpi] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profileRes, earningsRes, activeRes, historyRes] = await Promise.all([
        api.getMyLawyerProfile().catch(() => ({ profile: null })),
        api.getLawyerEarnings().catch(() => null),
        api.getActiveLawyerBooking().catch(() => ({ activeBooking: null })),
        api.getLawyerBookingHistory().catch(() => ({ bookings: [] })),
      ]);

      if (profileRes?.profile) {
        const p = profileRes.profile;
        setProfile(p);
        setEditBio(p.bio || '');
        setEditFee(p.consultationFee || 500);
        setEditFollowUpFee(p.followUpFee || 500);
        setEditDuration(p.sessionDuration || 30);
        setAcceptsUrgent(p.acceptsUrgent !== undefined ? p.acceptsUrgent : true);
        if (p.bankDetails) {
          setBankHolder(p.bankDetails.accountHolder || '');
          setBankAccount(p.bankDetails.accountNumber || '');
          setBankIfsc(p.bankDetails.ifsc || '');
          setBankUpi(p.bankDetails.upiId || '');
        }
      }
      setEarnings(earningsRes);
      setActiveBooking(activeRes?.activeBooking || null);
      setHistory(historyRes?.bookings || []);
    } catch (e) {
      console.error('Failed to load lawyer dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket listener for new booking requests
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewRequest = (booking: any) => {
      setIncomingRequests((prev) => [booking, ...prev]);
      if (Notification?.permission === 'granted') {
        new Notification('New Legal Consultation Request!', {
          body: `Client booked consultation in ${booking.category?.replace(/_/g, ' ')}`,
        });
      }
    };

    socket.on('new_booking_request', handleNewRequest);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
    };
  }, []);

  // Room join for active consultation
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinLawyerBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  const handleToggleAvailable = async () => {
    if (!profile) return;
    try {
      const res = await api.setLawyerStatus(!profile.isAvailable);
      setProfile((prev: any) => ({ ...prev, isAvailable: res.isAvailable }));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAcceptRequest = async (bookingId: string) => {
    try {
      await api.acceptLawyerBooking(bookingId);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
      fetchDashboardData();
      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Accept failed');
    }
  };

  const handleDeclineRequest = async (bookingId: string) => {
    const reason = prompt('Reason for declining:') || 'Court commitment';
    try {
      await api.declineLawyerBooking(bookingId, reason);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
    } catch (err: any) {
      alert(err.message || 'Decline failed');
    }
  };

  const handleProposeTime = async (bookingId: string) => {
    if (!proposedTime) {
      alert('Please select proposed alternate time');
      return;
    }
    try {
      await api.proposeLawyerTime(bookingId, proposedTime);
      alert('Proposed alternate time sent to client.');
      setProposingId(null);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Propose time failed');
    }
  };

  const handleWithdrawDemo = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Enter a valid withdrawal amount');
      return;
    }
    try {
      setWithdrawing(true);
      const res = await api.withdrawLawyerEarnings(amount);
      alert(`Withdrawal of ₹${amount} simulated successfully! Ref: ${res.transactionRef}`);
      setWithdrawAmount('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.updateLawyerProfile({
        bio: editBio,
        consultationFee: editFee,
        followUpFee: editFollowUpFee,
        sessionDuration: editDuration,
      });
      alert('Profile updated successfully!');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateLawyerProfile({
        acceptsUrgent,
        bankDetails: {
          accountHolder: bankHolder,
          accountNumber: bankAccount,
          ifsc: bankIfsc,
          upiId: bankUpi,
        },
      });
      alert('Settings saved successfully!');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const isPendingApproval = profile?.lawyerStatus !== 'active';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Bar Council Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-7 h-7 text-indigo-600" />
              Advocate Legal Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bar Reg: <strong>{profile?.barCouncilNumber || 'Enrollment Pending'}</strong> •{' '}
              {profile?.yearsOfPractice || 0} Yrs Practice • Enrolled: {profile?.stateBarCouncil || 'State Bar'}
            </p>
          </div>

          {/* Availability Toggle Switch */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={isPendingApproval}
              onClick={handleToggleAvailable}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                profile?.isAvailable
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Power className="w-4 h-4 mr-1.5" />
              {profile?.isAvailable ? '🟢 Online (Available for Consult)' : '⚪ Offline (Unavailable)'}
            </Button>
          </div>
        </div>

        {/* Pending Verification Banner */}
        {isPendingApproval && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>Bar Council Verification Pending:</strong> Your advocate credentials and enrollment certificates are currently under review by FindMedi admin compliance. You will be able to receive booking requests once approved (typically within 24–48 hours).
            </div>
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Booking Requests
            {incomingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Consultation
            {activeBooking && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cases')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'cases'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Case History ({history.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'earnings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Earnings & Wallet
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Practice Profile & Fees
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Verification Documents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ratings & Reviews
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Settings & Payout
          </button>
        </div>

        {/* ── 1. OVERVIEW TAB ────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Wallet Balance</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{earnings?.walletBalance?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Net Payout Ready</div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Total Earned</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{earnings?.totalEarnings?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-indigo-600 mt-0.5">
                  Platform Commission: 10%
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Total Consultations</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {earnings?.totalBookings || history.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cases Advised</div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Rating Score</div>
                <div className="text-2xl font-black text-amber-500 flex items-center gap-1 mt-1">
                  <Star className="w-5 h-5 fill-amber-500" />
                  {profile?.rating?.avg ? profile.rating.avg.toFixed(1) : '5.0'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ({profile?.rating?.count || 0} reviews)
                </div>
              </div>
            </div>

            {/* Active Consultation Quick Card */}
            {activeBooking && (
              <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold">
                    Active Consultation in Progress
                  </Badge>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Client: {activeBooking.userId?.name || 'Client'} ({activeBooking.category?.replace(/_/g, ' ')})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mode: {activeBooking.consultationMode?.replace('_', ' ')} • Fee: ₹{activeBooking.fee}
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab('active')}
                  className="bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Go to Active Session →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── 2. BOOKING REQUESTS TAB ────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Incoming Consultation Requests
            </h3>

            {incomingRequests.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No pending requests. When clients book consultations in your practice categories, they will appear here in real time.
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                          {(req.userId?.name || 'Client').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {req.userId?.name || 'Client'}
                          </h4>
                          <div className="text-xs text-slate-500 capitalize">
                            Category: {req.category?.replace(/_/g, ' ')} • Mode: {req.consultationMode?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 dark:text-slate-100">
                          ₹{req.fee || 500}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {req.urgency === 'urgent' ? '⚡ Urgent Request' : 'Scheduled'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
                      <strong>Issue Summary:</strong> "{req.caseDescription}"
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeclineRequest(req._id)}
                        className="rounded-xl text-xs text-rose-600"
                      >
                        Decline
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProposingId(proposingId === req._id ? null : req._id)}
                        className="rounded-xl text-xs"
                      >
                        Propose New Time
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAcceptRequest(req._id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                      >
                        Accept Consultation
                      </Button>
                    </div>

                    {/* Propose Alternate Time Input */}
                    {proposingId === req._id && (
                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center gap-2 text-xs">
                        <Input
                          type="datetime-local"
                          value={proposedTime}
                          onChange={(e) => setProposedTime(e.target.value)}
                          className="h-8 text-xs rounded-xl"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleProposeTime(req._id)}
                          className="bg-indigo-600 text-white rounded-xl text-xs h-8 shrink-0"
                        >
                          Send Offer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 3. ACTIVE CONSULTATION TAB ─────────────────────────── */}
        {activeTab === 'active' && (
          <div>
            {activeBooking ? (
              <BookingStatusPanel
                booking={activeBooking}
                currentUser={user}
                isLawyer={true}
                onRefresh={fetchDashboardData}
              />
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No active consultation in progress. Accept an incoming request to start an advisory session.
              </div>
            )}
          </div>
        )}

        {/* ── 4. CASES HISTORY TAB ───────────────────────────────── */}
        {activeTab === 'cases' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Consultation Case History
            </h3>

            {history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No past consultations found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Client</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 font-semibold">Mode</th>
                      <th className="pb-3 font-semibold">Fee</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {history.map((h) => (
                      <tr key={h._id}>
                        <td className="py-3">
                          {new Date(h.scheduledDate || h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                          {h.userId?.name || 'Client'}
                        </td>
                        <td className="py-3 capitalize">
                          {h.category?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 capitalize">
                          {h.consultationMode?.replace('_', ' ')}
                        </td>
                        <td className="py-3 font-bold">₹{h.fee}</td>
                        <td className="py-3">
                          <Badge
                            className={
                              h.status === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-500 text-white'
                            }
                          >
                            {h.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {h.ratingByUser?.stars ? (
                            <span className="text-amber-500 font-bold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-500" />
                              {h.ratingByUser.stars}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 5. EARNINGS & WALLET TAB ───────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-indigo-600 text-white shadow-xl">
                <div className="text-xs font-medium text-indigo-100 uppercase tracking-wider">
                  Available Wallet Balance
                </div>
                <div className="text-3xl font-black mt-1">
                  ₹{earnings?.walletBalance?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-indigo-200 mt-2">
                  Net earnings ready for simulated demo payout
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Gross Earnings
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{earnings?.totalEarnings?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Platform Fee: 10% auto-deducted
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Completed Cases
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {earnings?.totalBookings || history.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  100% Paid & Settled Consultations
                </div>
              </div>
            </div>

            {/* Withdraw Simulation Box */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Simulate Payout Withdrawal (Demo)
              </h4>
              <p className="text-xs text-slate-500">
                Withdraw your consultation fees to your registered bank account or UPI ID. In DEMO MODE, no actual banking transfer occurs.
              </p>

              <div className="flex gap-3 max-w-md">
                <Input
                  type="number"
                  min={100}
                  step={100}
                  placeholder="Enter Amount (₹)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="rounded-xl text-xs"
                />
                <Button
                  type="button"
                  disabled={withdrawing}
                  onClick={handleWithdrawDemo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  {withdrawing ? 'Processing...' : 'Withdraw (Demo)'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. PROFILE & FEES TAB ──────────────────────────────── */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Practice Profile & Consultation Rates
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bio & Practice Experience
              </label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Consultation Fee (₹ per session)
                </label>
                <Input
                  type="number"
                  min={100}
                  step={50}
                  value={editFee}
                  onChange={(e) => setEditFee(Number(e.target.value))}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-Up Session Fee (₹)
                </label>
                <Input
                  type="number"
                  min={100}
                  step={50}
                  value={editFollowUpFee}
                  onChange={(e) => setEditFollowUpFee(Number(e.target.value))}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Typical Duration (Minutes)
                </label>
                <select
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Details'}
              </Button>
            </div>
          </form>
        )}

        {/* ── 7. VERIFICATION DOCUMENTS TAB ──────────────────────── */}
        {activeTab === 'documents' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Advocate Legal Credentials & Certificates
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    State Bar Council Enrollment Certificate
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Enrollment No: {profile?.barCouncilNumber}
                  </div>
                </div>
                <Badge
                  className={
                    profile?.isDocumentVerified
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }
                >
                  {profile?.isDocumentVerified ? 'Verified' : 'Pending Verification'}
                </Badge>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Law Degree (LLB / LLM) Qualification
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Year of Enrollment: {profile?.yearOfEnrollment || 'Registered'}
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white">Attached</Badge>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Government Photo Identity ({profile?.govtIdType || 'ID'})
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Number: {profile?.govtIdNumber || 'Verified ID'}
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white">Verified</Badge>
              </div>
            </div>
          </div>
        )}

        {/* ── 8. REVIEWS & RATINGS TAB ───────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Client Feedback & Testimonials
            </h3>

            {history.filter((h) => h.ratingByUser?.stars).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No ratings received yet. Ratings left by clients upon consultation completion will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {history
                  .filter((h) => h.ratingByUser?.stars)
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {r.userId?.name || 'Verified Client'}
                        </span>
                        <div className="flex items-center text-amber-500 font-bold gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          {r.ratingByUser?.stars} / 5
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{r.ratingByUser?.comment || 'Helpful and professional guidance.'}"
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── 9. SETTINGS & PAYOUT TAB ───────────────────────────── */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Consultation Availability & Bank Payout Settings
            </h3>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Accept Urgent / Emergency Requests
                </div>
                <div className="text-[11px] text-slate-500">
                  Receive broadcast requests for immediate 1-hour legal assistance.
                </div>
              </div>
              <input
                type="checkbox"
                checked={acceptsUrgent}
                onChange={(e) => setAcceptsUrgent(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Holder Name
                </label>
                <Input
                  type="text"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Account Number
                </label>
                <Input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  IFSC Code
                </label>
                <Input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UPI ID (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="name@upi"
                  value={bankUpi}
                  onChange={(e) => setBankUpi(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={savingSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
