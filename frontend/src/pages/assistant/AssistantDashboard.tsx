import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { TaskChecklistView } from '../../components/assistant/TaskChecklistView';
import { AssistantChatPanel } from '../../components/assistant/AssistantChatPanel';
import { api } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinAssistantBookingRoom } from '../../lib/socket';

export default function AssistantDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'active' | 'history' | 'earnings' | 'profile'>('overview');

  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Incoming Requests state
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Profile edit fields
  const [editBio, setEditBio] = useState('');
  const [editPrice, setEditPrice] = useState(150);
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profileRes, earningsRes, activeRes, historyRes] = await Promise.all([
        api.getMyAssistantProfile().catch(() => ({ profile: null })),
        api.getAssistantEarnings().catch(() => null),
        api.getActiveAssistantBooking().catch(() => ({ activeBooking: null })),
        api.getAssistantBookingHistory().catch(() => ({ bookings: [] })),
      ]);

      if (profileRes?.profile) {
        setProfile(profileRes.profile);
        setEditBio(profileRes.profile.bio || '');
        setEditPrice(profileRes.profile.pricePerHour || 150);
      }
      setEarnings(earningsRes);
      setActiveBooking(activeRes?.activeBooking || null);
      setHistory(historyRes?.bookings || []);
    } catch (e) {
      console.error('Failed to load assistant dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket listener for incoming requests
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewRequest = (booking: any) => {
      setIncomingRequests((prev) => [booking, ...prev]);
      // If currently on overview, notify assistant
      if (Notification?.permission === 'granted') {
        new Notification('New Assistant Booking Request!', {
          body: `Patient booked assistance at ${booking.hospital}`,
        });
      }
    };

    socket.on('new_booking_request', handleNewRequest);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
    };
  }, []);

  // Room join for active booking
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinAssistantBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  const handleToggleAvailable = async () => {
    if (!profile) return;
    try {
      const res = await api.setAssistantStatus(!profile.isAvailable);
      setProfile((prev: any) => ({ ...prev, isAvailable: res.isAvailable }));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAcceptRequest = async (bookingId: string) => {
    try {
      await api.acceptAssistantBooking(bookingId);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
      fetchDashboardData();
      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Accept failed');
    }
  };

  const handleDeclineRequest = async (bookingId: string) => {
    try {
      await api.declineAssistantBooking(bookingId, 'Assistant not available');
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
    } catch (err: any) {
      alert(err.message || 'Decline failed');
    }
  };

  const handleWithdrawDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    try {
      setWithdrawing(true);
      const res = await api.withdrawAssistantDemo(Number(withdrawAmount));
      alert(res.message);
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
      await api.updateAssistantProfile({
        bio: editBio,
        pricePerHour: Number(editPrice),
      });
      alert('Profile updated successfully!');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const isVerified = profile?.assistantStatus === 'active';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Verification Alert Banner if pending */}
        {!isVerified && profile && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">Application Pending Admin Verification</span>
              Your documents and background details are under review by FindMedi Admin. You will be able to toggle Available and accept patient bookings once verified (24-48 hours).
            </div>
          </div>
        )}

        {/* Dashboard Top Navigation & Status */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {user?.name || 'Assistant Portal'}
                </h1>
                <Badge variant={isVerified ? 'default' : 'secondary'} className="text-[10px]">
                  {profile?.assistantStatus?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                ⭐ {profile?.rating?.avg?.toFixed(1) || '5.0'} Rating • {profile?.totalBookings || 0} Shifts Completed
              </div>
            </div>
          </div>

          {/* Availability Switch */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {profile?.isAvailable ? '🟢 Online & Available' : '⚪ Unavailable / Off Duty'}
            </span>
            <Button
              type="button"
              disabled={!isVerified}
              onClick={handleToggleAvailable}
              className={`rounded-full px-4 h-9 font-bold text-xs ${
                profile?.isAvailable
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Power className="w-3.5 h-3.5 mr-1" />
              {profile?.isAvailable ? 'Go Offline' : 'Go Available'}
            </Button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'requests', label: `Requests (${incomingRequests.length})`, icon: Briefcase },
            { id: 'active', label: 'Active Shift', icon: Clock },
            { id: 'history', label: 'Shift History', icon: History },
            { id: 'earnings', label: 'Earnings & Payout', icon: DollarSign },
            { id: 'profile', label: 'Profile & Rates', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── 1. OVERVIEW TAB ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400">Wallet Balance</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  ₹{profile?.walletBalance || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400">Total Net Earned</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{earnings?.netEarnings || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400">This Month Net</span>
                <div className="text-2xl font-black text-teal-600 mt-1">
                  ₹{earnings?.thisMonthNet || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400">Patient Satisfaction</span>
                <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-500" />
                  {profile?.rating?.avg?.toFixed(1) || '5.0'}
                </div>
              </div>
            </div>

            {/* Active booking snippet if any */}
            {activeBooking && (
              <div className="p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                <div>
                  <Badge className="bg-teal-700 text-white text-[10px] mb-1">
                    ACTIVE BOOKING • {activeBooking.status.toUpperCase()}
                  </Badge>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Patient: {activeBooking.patientId?.name || 'Patient'} at {activeBooking.hospital}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Date: {new Date(activeBooking.scheduledDate).toLocaleDateString()} at {activeBooking.startTime}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                >
                  Manage Active Shift
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── 2. REQUESTS TAB ─────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Incoming Patient Assistance Requests
            </h3>

            {incomingRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No pending booking requests right now. Keep your status toggled "Available" to receive requests.
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      {req.isUrgent && (
                        <Badge className="bg-rose-600 text-white text-[10px] uppercase font-bold mb-1">
                          🚨 URGENT REQUEST
                        </Badge>
                      )}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {req.hospital} • {req.durationType?.toUpperCase()}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Patient: {req.patientId?.name || 'Verified Patient'} • Fee: ₹{req.cost?.total || 600}
                      </p>
                      {req.specialInstructions && (
                        <p className="text-xs text-slate-500 italic mt-1">"{req.specialInstructions}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeclineRequest(req._id)}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Decline
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAcceptRequest(req._id)}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        Accept Request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 3. ACTIVE SHIFT TAB ─────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="space-y-5">
            {!activeBooking ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                You do not have any confirmed or in-progress booking right now.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                {/* Top Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <Badge className="bg-teal-700 text-white text-[10px] mb-1">
                      {activeBooking.status.toUpperCase()}
                    </Badge>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      Assisting {activeBooking.patientId?.name || 'Patient'} at {activeBooking.hospital}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scheduled: {new Date(activeBooking.scheduledDate).toLocaleDateString()} at {activeBooking.startTime} ({activeBooking.durationType})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeBooking.patientId?.phone && (
                      <a href={`tel:${activeBooking.patientId.phone}`}>
                        <Button type="button" variant="outline" size="sm" className="text-xs gap-1">
                          <Phone className="w-3.5 h-3.5 text-teal-600" /> Call Patient
                        </Button>
                      </a>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowChat(!showChat)}
                      className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {showChat ? 'Hide Chat' : 'Chat'}
                    </Button>
                  </div>
                </div>

                {/* Check In Action if confirmed */}
                {activeBooking.status === 'confirmed' && (
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Check In at Hospital Campus
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tap when you arrive to notify the patient and start tracking tasks.
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.checkInAssistantBooking(activeBooking._id);
                          fetchDashboardData();
                        } catch (e: any) {
                          alert(e.message || 'Check in failed');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Check In Now
                    </Button>
                  </div>
                )}

                {/* Task Checklist Component */}
                <TaskChecklistView
                  tasks={activeBooking.taskChecklist || []}
                  isAssistant={true}
                  onToggleTask={async (taskId, isDone) => {
                    try {
                      await api.updateAssistantTask(activeBooking._id, taskId, isDone);
                      fetchDashboardData();
                    } catch (e: any) {
                      alert(e.message || 'Toggle task failed');
                    }
                  }}
                  onAddCustomTask={async (label, category) => {
                    try {
                      await api.addAssistantCustomTask(activeBooking._id, label, category);
                      fetchDashboardData();
                    } catch (e: any) {
                      alert(e.message || 'Add task failed');
                    }
                  }}
                />

                {/* Complete Assistance Action */}
                {activeBooking.status === 'in_progress' && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      type="button"
                      onClick={async () => {
                        const note = prompt('Enter a short summary note for the patient (e.g. All medicines collected, paperwork submitted):');
                        try {
                          await api.completeAssistantBooking(activeBooking._id, note || 'Assistance completed.');
                          fetchDashboardData();
                        } catch (e: any) {
                          alert(e.message || 'Complete failed');
                        }
                      }}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-6"
                    >
                      Mark Assistance Completed
                    </Button>
                  </div>
                )}

                {/* In-hospital Chat */}
                {showChat && (
                  <AssistantChatPanel
                    bookingId={activeBooking._id}
                    currentUser={user}
                    targetUser={activeBooking.patientId}
                    onClose={() => setShowChat(false)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 4. SHIFT HISTORY TAB ────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">
              Completed & Past Shifts
            </h3>

            {history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No past shifts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Patient</th>
                      <th className="py-3 px-3">Hospital</th>
                      <th className="py-3 px-3">Shift</th>
                      <th className="py-3 px-3">Net Earning</th>
                      <th className="py-3 px-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3">{new Date(h.scheduledDate || h.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-medium">{h.patientId?.name || 'Patient'}</td>
                        <td className="py-3 px-3">{h.hospital}</td>
                        <td className="py-3 px-3">{h.durationType?.toUpperCase()}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">
                          ₹{Math.round((h.cost?.total || 0) * 0.90)}
                        </td>
                        <td className="py-3 px-3 text-amber-500 font-bold">
                          {h.ratingByPatient?.stars ? `⭐ ${h.ratingByPatient.stars}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 5. EARNINGS TAB ─────────────────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-4">
                Earnings & Demo Settlement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900">
                  <span className="text-xs text-slate-500">Available Wallet Balance</span>
                  <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
                    ₹{profile?.walletBalance || 0}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
                  <span className="text-xs text-slate-500">Gross Patient Bookings</span>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    ₹{earnings?.totalGross || 0}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
                  <span className="text-xs text-slate-500">Platform Commission (10%)</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    -₹{earnings?.platformCommission || 0}
                  </div>
                </div>
              </div>

              {/* Demo Withdrawal Form */}
              <form onSubmit={handleWithdrawDemo} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Request Payout / Withdrawal (Simulated Demo)
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">DEMO PAYOUT</Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="Enter amount to withdraw (₹)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={profile?.walletBalance || 0}
                    className="text-xs h-10 max-w-xs"
                  />
                  <Button
                    type="submit"
                    disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0}
                    className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw to Bank (Demo)'}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Target Account: {profile?.bankDetails?.accountNumber || 'Default Bank'} ({profile?.bankDetails?.ifsc || 'IFSC'})
                </p>
              </form>
            </div>
          </div>
        )}

        {/* ── 6. PROFILE & RATES TAB ──────────────────────────────── */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
          >
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Profile Bio & Service Pricing
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Hourly Assistance Rate (₹ / hr) *
              </label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                min={50}
                required
                className="text-xs h-10 max-w-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Short Bio / Patient Introduction (Max 300 chars) *
              </label>
              <textarea
                rows={4}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={300}
                required
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Details'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
