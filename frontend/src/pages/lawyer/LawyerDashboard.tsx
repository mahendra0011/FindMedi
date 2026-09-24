import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
  TrendingUp,
  Wallet,
  Sparkles,
  Bell,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { BookingStatusPanel } from '../../components/lawyer/BookingStatusPanel';
import { api } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinLawyerBookingRoom } from '../../lib/socket';
import ProviderIncomingCall from '@/components/emergency/ProviderIncomingCall';

export default function LawyerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab routing sync: supports URL params (?tab=requests) and subpaths
  const getInitialTab = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/requests')) return 'requests';
    if (p.includes('/active')) return 'active';
    if (p.includes('/cases')) return 'cases';
    if (p.includes('/history')) return 'cases';
    if (p.includes('/earnings')) return 'earnings';
    if (p.includes('/profile')) return 'profile';
    if (p.includes('/documents')) return 'documents';
    if (p.includes('/reviews')) return 'reviews';
    if (p.includes('/settings')) return 'settings';

    const queryTab = searchParams.get('tab');
    if (queryTab && ['overview', 'requests', 'active', 'cases', 'earnings', 'profile', 'documents', 'reviews', 'settings'].includes(queryTab)) {
      return queryTab as any;
    }
    return 'overview';
  };

  const activeTab = getInitialTab();

  const setActiveTab = (tabId: string) => {
    if (tabId === 'overview') {
      navigate('/lawyer/dashboard');
    } else {
      navigate(`/lawyer/dashboard?tab=${tabId}`);
    }
  };

  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);

  // Incoming Requests & Actions
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeIncomingCall, setActiveIncomingCall] = useState<any | null>(null);
  const [acceptedWaiting, setAcceptedWaiting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
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
  const [bankGstin, setBankGstin] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  // Section-10 settings master
  const [editEmergencyStandby, setEditEmergencyStandby] = useState(false);
  const [editRefundPolicy, setEditRefundPolicy] = useState('lawyer_cancels_full');
  const [editFeeSchedule, setEditFeeSchedule] = useState({ video30m: 0, chamberVisit: 0, bedsideVisit: 0, noticeDrafting: 0 });
  const [editPracticingCourts, setEditPracticingCourts] = useState<string[]>([]);
  const [courtInput, setCourtInput] = useState('');
  const [editPrivilegeLocked, setEditPrivilegeLocked] = useState(true);

  // Cases search / filter / pagination (L-9)
  const [caseSearch, setCaseSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('all');
  const [casePage, setCasePage] = useState(1);
  const CASE_PAGE_SIZE = 10;

  // Real analytics derived from history + earnings (L-3, L-6)
  const weeklyData = React.useMemo(() => {
    const days: { day: string; revenue: number; cases: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayBookings = (history || []).filter((h: any) => {
        const dt = new Date(h.completedAt || h.scheduledDate || h.createdAt);
        return !Number.isNaN(dt.getTime()) && dt.toDateString() === key && h.status === 'completed';
      });
      days.push({
        day: label,
        revenue: dayBookings.reduce((s: number, h: any) => s + (Number(h.fee) || 0), 0),
        cases: dayBookings.length,
      });
    }
    return days;
  }, [history]);

  const caseMix = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (history || []).forEach((h: any) => {
      const c = String(h.category || h.caseCategory || 'General').replace(/_/g, ' ');
      counts[c] = (counts[c] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const palette = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value / total) * 100),
        count: value,
        color: palette[i % palette.length],
      }));
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return (history || []).filter((h: any) => {
      if (caseStatusFilter !== 'all' && h.status !== caseStatusFilter) return false;
      if (!q) return true;
      return [h.userId?.name, h.category, h.caseCategory, h.bookingNumber, h.consultationMode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [history, caseSearch, caseStatusFilter]);

  const totalCasePages = Math.max(1, Math.ceil(filteredHistory.length / CASE_PAGE_SIZE));
  const safeCasePage = Math.min(casePage, totalCasePages);
  const pagedHistory = filteredHistory.slice((safeCasePage - 1) * CASE_PAGE_SIZE, safeCasePage * CASE_PAGE_SIZE);

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [profileRes, earningsRes, activeRes, historyRes, requestsRes] = await Promise.all([
        api.getMyLawyerProfile().catch(() => ({ profile: null })),
        api.getLawyerEarnings().catch(() => null),
        api.getActiveLawyerBooking().catch(() => ({ activeBooking: null })),
        api.getLawyerBookingHistory().catch(() => ({ bookings: [] })),
        api.getLawyerPendingRequests().catch(() => null),
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
        if (p.gstin) setBankGstin(p.gstin);
        if (p.settings) {
          setEditEmergencyStandby(Boolean(p.settings.emergencyStandby));
          if (p.settings.refundPolicy) setEditRefundPolicy(p.settings.refundPolicy);
          if (p.settings.feeSchedule) setEditFeeSchedule({ video30m: 0, chamberVisit: 0, bedsideVisit: 0, noticeDrafting: 0, ...p.settings.feeSchedule });
          if (Array.isArray(p.settings.practicingCourts)) setEditPracticingCourts(p.settings.practicingCourts);
          if (typeof p.settings.privilegeLocked === 'boolean') setEditPrivilegeLocked(p.settings.privilegeLocked);
        }
        if (Array.isArray(p.courtsPracticedIn) && p.courtsPracticedIn.length && !p.settings?.practicingCourts?.length) {
          setEditPracticingCourts(p.courtsPracticedIn);
        }
      }
      setEarnings(earningsRes);
      setActiveBooking(activeRes?.booking || activeRes?.activeBooking || null);
      setHistory(historyRes?.bookings || []);

      // Merge pending requests from the server with anything received over socket.
      // A failed fetch yields null → keep the local list untouched.
      if (requestsRes) {
        const serverRequests: any[] = requestsRes.requests || [];
        const serverIds = new Set(serverRequests.map((r) => String(r._id)));
        setIncomingRequests((prev) => {
          // Server is the source of truth: drop local entries it no longer lists
          // (already accepted / declined / claimed by another advocate). Very fresh
          // socket entries (<15s) are kept to avoid racing an in-flight event.
          const kept = prev.filter(
            (r) => serverIds.has(String(r._id)) || Date.now() - (r._receivedAt || 0) < 15000
          );
          const keptIds = new Set(kept.map((r) => String(r._id)));
          return [...kept, ...serverRequests.filter((r) => !keptIds.has(String(r._id)))];
        });
      }
    } catch (e) {
      console.error('Failed to load lawyer dashboard', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      if (!booking?._id) return;
      // Ignore requests that are no longer pending (already accepted / declined / cancelled)
      if (booking.status && booking.status !== 'requested') return;
      setIncomingRequests((prev) =>
        prev.some((r) => String(r._id) === String(booking._id))
          ? prev
          : [{ ...booking, _receivedAt: Date.now() }, ...prev]
      );
      // Trigger full screen incoming call modal with 120s timer
      setAcceptedWaiting(false);
      setActiveIncomingCall(booking);
      if (Notification?.permission === 'granted') {
        const notif = new Notification('New Legal Consultation Request!', {
          body: `Client booked consultation in ${booking.category?.replace(/_/g, ' ')}`,
        });
        // Clicking the desktop notification must bring the advocate back to the
        // ringing call screen (earlier it did nothing at all).
        notif.onclick = () => {
          try {
            window.focus();
          } catch {
            /* noop */
          }
          setAcceptedWaiting(false);
          setActiveIncomingCall(booking);
          notif.close();
        };
      }
    };

    socket.on('new_booking_request', handleNewRequest);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
    };
  }, []);

  // Keep dashboard availability in sync when toggled elsewhere (e.g. PublicNavbar)
  useEffect(() => {
    const handleSyncStatus = (e: any) => {
      if (e?.detail?.type === 'lawyer' && e.detail.isAvailable !== undefined) {
        setProfile((prev: any) => (prev ? { ...prev, isAvailable: Boolean(e.detail.isAvailable) } : prev));
      }
    };
    window.addEventListener('provider_status_changed', handleSyncStatus);
    return () => window.removeEventListener('provider_status_changed', handleSyncStatus);
  }, []);

  // Room join for active consultation
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinLawyerBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  // Availability (Online / Offline) Toggle — real API + socket presence sync
  const handleToggleAvailable = async () => {
    if (!profile) {
      toast.error('Lawyer profile not loaded yet. Please refresh.');
      return;
    }

    if (profile.lawyerStatus !== 'active') {
      toast.error('Your Bar Council profile is pending verification. You cannot go available yet.');
      return;
    }

    if (togglingAvailable) return;

    const next = !profile.isAvailable;
    setTogglingAvailable(true);
    try {
      const res = await api.setLawyerStatus(next);
      const finalState = res?.isAvailable !== undefined ? Boolean(res.isAvailable) : next;

      // Optimistic local state update
      setProfile((prev: any) => ({ ...prev, isAvailable: finalState }));

      // Keep PublicNavbar / other surfaces in sync without a refetch
      window.dispatchEvent(new CustomEvent('provider_status_changed', {
        detail: { type: 'lawyer', isAvailable: finalState },
      }));

      // Real-time presence broadcast (backend socket handler mirrors this to LawyerProfile)
      const socket = getSocket();
      if (socket) {
        socket.emit(finalState ? 'lawyer_go_available' : 'lawyer_go_unavailable', {
          lawyerId: user?._id,
        });
      }

      toast.success(
        finalState
          ? 'You are now Available — clients can book consultations'
          : 'You are now Offline / In Court'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update availability status');
    } finally {
      setTogglingAvailable(false);
    }
  };

  // Broadcast claimed by another advocate → auto-dismiss our ringing call screen
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleBookingTaken = (payload: any) => {
      const takenId = payload?.bookingId ? String(payload.bookingId) : '';
      if (!takenId) return;
      setIncomingRequests((prev) => prev.filter((r) => String(r._id) !== takenId));
      setActiveIncomingCall((prev: any) => (prev && String(prev._id) === takenId ? null : prev));
      setAcceptedWaiting(false);
      toast.info('Another advocate accepted this request.');
    };
    socket.on('booking_taken', handleBookingTaken);
    return () => {
      socket.off('booking_taken', handleBookingTaken);
    };
  }, []);

  const handleAcceptRequest = async (bookingId: string) => {
    if (!bookingId) {
      toast.error('Request ID missing — please refresh the console and try again.');
      return false;
    }
    if (acceptingId) return false;
    setAcceptingId(bookingId);
    // Instant feedback on the full-screen call view ("Booking accepted. Opening session...")
    if (String(activeIncomingCall?._id) === String(bookingId)) setAcceptedWaiting(true);
    try {
      await api.acceptLawyerBooking(bookingId);
      // Hide the request from the Requests tab immediately (optimistic)
      setIncomingRequests((prev) => prev.filter((r) => String(r._id) !== String(bookingId)));
      toast.success('Consultation confirmed — client notified. Opening active case…');
      setActiveTab('active');
      await fetchDashboardData(true);
      return true;
    } catch (err: any) {
      setAcceptedWaiting(false);
      toast.error(err?.message || 'Could not accept the request. Please try again.');
      return false;
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineRequest = async (bookingId: string) => {
    if (!bookingId) return;
    const reason = 'Court commitment';
    try {
      await api.declineLawyerBooking(bookingId, reason);
      setIncomingRequests((prev) => prev.filter((r) => String(r._id) !== String(bookingId)));
      toast.success('Request declined — client has been informed.');
    } catch (err: any) {
      toast.error(err?.message || 'Decline failed');
    }
  };

  const handleProposeTime = async (bookingId: string) => {
    if (!proposedTime) {
      toast.warning('Please select proposed alternate time');
      return;
    }
    try {
      const [pDate, pTime] = proposedTime.includes('T') ? proposedTime.split('T') : [proposedTime, '10:00'];
      await api.proposeLawyerTime(bookingId, { date: pDate, time: pTime, reason: 'Advocate proposed alternate consultation slot' });
      toast.success('Proposed alternate time sent to client.');
      setProposingId(null);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Propose time failed');
    }
  };

  const handleWithdrawDemo = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid withdrawal amount');
      return;
    }
    try {
      setWithdrawing(true);
      const res = await api.withdrawLawyerDemo(amount);
      const ref = res?.reference || res?.transactionRef || '';
      toast.success(
        ref
          ? `Withdrawal of ₹${amount} simulated successfully! Ref: ${ref}`
          : `Withdrawal of ₹${amount} simulated successfully!`
      );
      setWithdrawAmount('');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
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
      toast.success('Profile updated successfully!');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
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
        gstin: bankGstin.trim(),
        settings: {
          emergencyStandby: editEmergencyStandby,
          refundPolicy: editRefundPolicy,
          feeSchedule: {
            video30m: Number(editFeeSchedule.video30m) || 0,
            chamberVisit: Number(editFeeSchedule.chamberVisit) || 0,
            bedsideVisit: Number(editFeeSchedule.bedsideVisit) || 0,
            noticeDrafting: Number(editFeeSchedule.noticeDrafting) || 0,
          },
          practicingCourts: editPracticingCourts.slice(0, 10),
          privilegeLocked: editPrivilegeLocked,
        },
      });
      toast.success('Settings saved successfully!');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const isPendingApproval = profile?.lawyerStatus !== 'active';

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Header & Bar Council Status Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800/5 rounded-full blur-3xl pointer-events-none" />

        {/* Lawyer Info */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-2xl shadow-md ring-4 ring-slate-200 dark:ring-slate-800">
              <Scale className="w-8 h-8" />
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                profile?.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={profile?.isAvailable ? 'Available for Consult' : 'Offline'}
            >
              <span
                className={`w-2 h-2 rounded-full bg-white ${
                  profile?.isAvailable ? 'animate-ping' : ''
                }`}
              />
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {user?.name || 'Advocate Legal Console'}
              </h1>
              <Badge
                variant={!isPendingApproval ? 'default' : 'secondary'}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  !isPendingApproval
                    ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {!isPendingApproval ? 'BAR COUNCIL VERIFIED' : 'ENROLLMENT REVIEW'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {profile?.rating?.avg ? profile.rating.avg.toFixed(1) : 'New'}
                <span className="text-slate-400 font-normal">
                  ({profile?.rating?.count ?? history.length} reviews)
                </span>
              </span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">
                Bar Reg: {profile?.barCouncilNumber || 'Pending verification'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                {profile?.yearsOfPractice ? `${profile.yearsOfPractice} Yrs Practice` : 'Experience pending'} • {profile?.stateBarCouncil || 'Bar council pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Availability Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end relative z-10 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="rounded-2xl h-10 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh legal console"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-slate-900 dark:text-slate-100' : ''}`} />
            Refresh
          </Button>

          {/* Availability Toggle */}
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
              {profile?.isAvailable ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Available for Consult
                </span>
              ) : (
                <span className="text-slate-400">Offline / In Court</span>
              )}
            </span>
            <Button
              type="button"
              disabled={isPendingApproval || togglingAvailable}
              onClick={handleToggleAvailable}
              title={
                isPendingApproval
                  ? 'Bar Council verification pending — availability unlock hoga approval ke baad'
                  : profile?.isAvailable
                  ? 'Go Offline / In Court'
                  : 'Go Online — clients can book you'
              }
              className={`rounded-xl px-3.5 h-8 font-bold text-xs shadow-sm transition-all ${
                profile?.isAvailable
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } ${isPendingApproval ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {togglingAvailable ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5 mr-1.5" />
              )}
              {togglingAvailable
                ? 'Updating...'
                : profile?.isAvailable
                ? 'Go Offline'
                : 'Go Online'}
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Verification Banner */}
      {isPendingApproval && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex items-center gap-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-sm backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="space-y-0.5">
            <strong className="block text-sm">Bar Council Verification In Progress:</strong>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Your advocate credentials, Bar enrollment certificates, and practice jurisdiction documents are currently under review by FindMedi admin compliance. You will be able to receive booking requests once approved (within 24 hours).
            </p>
          </div>
        </div>
      )}

      {/* Navigation handled by sidebar (AppSidebar.tsx) — no duplicate in-page tab bar needed */}

      {/* ── 1. OVERVIEW TAB ────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Welcome & Live Status Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-black via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none hidden sm:block">
              <Scale className="w-56 h-56" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-slate-100 border border-white/20">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Medical Negligence & Health Law Council
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-emerald-400/30">
                    <Award className="w-3.5 h-3.5 text-emerald-300" />
                    Senior Advocate
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {(() => {
                    const hr = new Date().getHours();
                    if (hr < 12) return 'Good Morning';
                    if (hr < 17) return 'Good Afternoon';
                    return 'Good Evening';
                  })()}, {user?.name?.split(' ')[0] || 'Counsel'}! ⚖️
                </h2>

                <p className="text-slate-100 text-xs sm:text-sm leading-relaxed max-w-xl">
                  {profile?.isAvailable
                    ? 'Your legal chamber is online! Clients requiring urgent medical negligence, insurance disputes, or hospital consumer claims will connect directly.'
                    : 'You are currently offline. Switch "Available for Consult" above to accept tele-law advisory and chamber sessions.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Primary Availability Toggle — hero se hi online/offline */}
                  <Button
                    type="button"
                    disabled={isPendingApproval || togglingAvailable}
                    onClick={handleToggleAvailable}
                    className={`font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5 ${
                      profile?.isAvailable
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                        : 'bg-emerald-400 hover:bg-emerald-500 text-emerald-950'
                    } ${isPendingApproval ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {togglingAvailable ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    {togglingAvailable
                      ? 'Updating...'
                      : profile?.isAvailable
                      ? 'Go Offline / In Court'
                      : 'Go Online — Accept Clients'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5 text-slate-900" />
                    Consultation Requests ({incomingRequests.length})
                  </Button>
                  {activeBooking && (
                    <Button
                      type="button"
                      onClick={() => setActiveTab('active')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Active Legal Session
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('profile')}
                    className="border-white/30 text-white hover:bg-white/10 font-semibold text-xs rounded-xl h-9 px-4"
                  >
                    Chamber Fees & Specialization
                  </Button>
                </div>
              </div>

              {/* Right Hero Live Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
                  <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">Wallet Balance</span>
                  <span className="text-xl font-black text-white">₹{earnings?.walletBalance?.toLocaleString() || 0}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
                  <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">Rating</span>
                  <span className="text-xl font-black text-amber-300 flex items-center justify-center sm:justify-start gap-1">
                    ★ {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">Completed Cases</span>
                  <span className="text-xl font-black text-white">
                    {earnings?.completedConsultationsCount ?? history.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Wallet Balance */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-emerald-500/50"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Wallet Balance
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{earnings?.walletBalance?.toLocaleString() || 0}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Available to withdraw</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('earnings')}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
                >
                  Withdraw <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </motion.div>

            {/* Total Earned */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-slate-900/50 dark:hover:border-white/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                ₹{earnings?.totalEarnings?.toLocaleString() || 0}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Commission: 10%</span>
                <span className="text-emerald-500 font-bold">90% Net Payout</span>
              </div>
            </motion.div>

            {/* Cases Advised */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-slate-900/40 dark:hover:border-white/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-700/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Consultations
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-700/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {earnings?.totalBookings || history.length || 0}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Success Rate</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">100% Settled</span>
              </div>
            </motion.div>

            {/* Rating Score */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-amber-500/50"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Client Rating
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-500 flex items-center gap-1.5">
                {profile?.rating?.avg ? profile.rating.avg.toFixed(1) : '5.0'}
                <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Verified Feedback</span>
                <span className="text-amber-500 font-bold">({profile?.rating?.count || history.length || 0} reviews)</span>
              </div>
            </motion.div>
          </div>

          {/* Quick Hub Grid (Shortcuts to Tabs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className="p-4 rounded-2xl border border-slate-900/20 bg-gradient-to-br from-slate-800/10 via-slate-700/5 to-transparent hover:from-slate-800/20 transition-all text-left space-y-2 group shadow-sm hover:border-slate-900/25 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800/15 text-slate-900 dark:text-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Booking Requests</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {incomingRequests.length} pending request(s)
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className="p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent hover:from-cyan-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-cyan-500/40 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Active Consultation</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeBooking ? 'Session in progress' : 'Chamber Standby'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Case History</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {history.length} cases logged
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-amber-500/40 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Earnings & Payout</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ₹{earnings?.walletBalance?.toLocaleString() || 0} wallet
                </p>
              </div>
            </button>
          </div>

          {/* ── CHARTS & ANALYTICS SECTION ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 8 Cols: Weekly Consultations & Revenue Area Chart */}
            <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Weekly Consultations & Earnings</h3>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900" /> Revenue (₹)
                    </span>
                    <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Cases
                    </span>
                  </div>
                </div>
              </div>

                {/* Responsive Area Chart — real last-7-days revenue from completed bookings (L-3) */}
                <div className="h-64 w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="lawyerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs space-y-1.5">
                                <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
                                <div className="flex items-center justify-between gap-4 text-slate-900 dark:text-slate-100 font-bold">
                                  <span>Revenue:</span>
                                  <span>₹{payload[0]?.value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-500">
                                  <span>Consultations:</span>
                                  <span>{payload[0]?.payload?.cases} cases</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#lawyerRevenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Mini Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-400">Avg. Consultation Fee</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">₹{profile?.consultationFee || 500} / session</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Follow-Up Fee</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">₹{profile?.followUpFee || 500}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Advocate Payout</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">90% Direct Net</p>
                  </div>
                </div>
              </div>

              {/* 4 Cols: Legal Practice Domain Distribution */}
              <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Practice Distribution</h3>
                    <Badge variant="outline" className="text-[10px] font-mono">This Month</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Consultations categorized by healthcare law topics
                  </p>

                  {/* Donut Chart — real category mix from history (L-3) */}
                  <div className="h-44 w-full relative flex items-center justify-center mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={caseMix.length > 0 ? caseMix : [{ name: 'No cases yet', value: 100, color: '#e2e8f0' }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {((caseMix.length > 0 ? caseMix : [{ color: '#e2e8f0' }]) as any[]).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={(entry as any).color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg text-xs">
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{payload[0]?.name}</p>
                                  <p className="text-slate-900 dark:text-slate-100 font-bold">{payload[0]?.value}% of consultations</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center pointer-events-none">
                      <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {earnings?.completedConsultationsCount ?? history.length}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">Cases</span>
                    </div>
                  </div>

                  {/* Legend list — real mix (L-3) */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    {caseMix.length === 0 && (
                      <span className="text-slate-400 col-span-2">No consultations yet — complete a case to see mix.</span>
                    )}
                    {caseMix.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="text-slate-600 dark:text-slate-400 truncate">{c.name} ({c.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Legal Compliance</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> High Court Enrolled
                  </span>
                </div>
              </div>
            </div>

            {/* Active Consultation Spotlight */}
            {activeBooking && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-800/10 via-slate-700/5 to-cyan-500/10 border-2 border-slate-900/20 dark:border-white/20 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <Badge className="bg-slate-900 text-white text-[11px] uppercase font-bold tracking-wide">
                      {activeBooking.status?.replace('_', ' ') || 'ACTIVE CONSULTATION'}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Booking #{activeBooking.bookingNumber || activeBooking._id?.slice(-6)}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-900/20 px-3.5 py-1 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100 animate-spin" />
                    Mode: <span className="capitalize text-slate-900 dark:text-slate-100">{activeBooking.consultationMode?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="text-xs text-slate-400 block">Client Name</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {activeBooking.userId?.name || 'Verified Client'}
                    </h4>
                    {activeBooking.userId?.phone && (
                      <span className="text-xs text-slate-500">{activeBooking.userId.phone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block">Legal Category & Issue</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize">
                      {activeBooking.category?.replace(/_/g, ' ')}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Fee: ₹{activeBooking.fee}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-start sm:justify-end self-center">
                    <Button
                      type="button"
                      onClick={() => setActiveTab('active')}
                      className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm h-10 px-5"
                    >
                      Open Consultation Room
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
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
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
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
                        className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold"
                      >
                        Accept Consultation
                      </Button>
                    </div>

                    {/* Propose Alternate Time Input */}
                    {proposingId === req._id && (
                      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center gap-2 text-xs">
                        <Input
                          type="datetime-local"
                          value={proposedTime}
                          onChange={(e) => setProposedTime(e.target.value)}
                          className="h-8 text-xs rounded-xl"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleProposeTime(req._id)}
                          className="bg-slate-900 text-white rounded-xl text-xs h-8 shrink-0"
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

        {/* ── 4. CASES HISTORY TAB (search + filter + pagination — L-9) ── */}
        {activeTab === 'cases' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Consultation Case History ({filteredHistory.length})
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Search client / category / booking no..."
                  value={caseSearch}
                  onChange={(e) => { setCaseSearch(e.target.value); setCasePage(1); }}
                  className="h-9 text-xs w-56"
                />
                <select
                  value={caseStatusFilter}
                  onChange={(e) => { setCaseStatusFilter(e.target.value); setCasePage(1); }}
                  className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
                >
                  <option value="all">All status</option>
                  <option value="completed">Completed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {history.length === 0 ? 'No past consultations found.' : 'No cases match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="pb-3 font-semibold">Booking</th>
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
                    {pagedHistory.map((h) => (
                      <tr key={h._id}>
                        <td className="py-3 font-mono text-slate-500">
                          #{h.bookingNumber || h._id?.slice(-6)}
                        </td>
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
            {filteredHistory.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Page {safeCasePage} of {totalCasePages} • {filteredHistory.length} cases</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCasePage <= 1}
                    onClick={() => setCasePage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs"
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCasePage >= totalCasePages}
                    onClick={() => setCasePage((p) => Math.min(totalCasePages, p + 1))}
                    className="h-8 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 5. EARNINGS & WALLET TAB ───────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
                <div className="text-xs font-medium text-slate-100 uppercase tracking-wider">
                  Available Wallet Balance
                </div>
                <div className="text-3xl font-black mt-1">
                  ₹{earnings?.walletBalance?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-200 mt-2">
                  Net earnings ready for simulated demo payout
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Gross Earnings
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ₹{(earnings?.totalEarnings ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Commission: ₹{(earnings?.platformCommission ?? 0).toLocaleString()} (10%) • Net: ₹{(earnings?.netPayable ?? 0).toLocaleString()} • This month: ₹{(earnings?.thisMonthEarnings ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Completed Cases
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {earnings?.completedConsultationsCount ?? history.length}
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
                  className="bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shrink-0"
                >
                  {withdrawing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500"
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
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Client Feedback & Testimonials
              </h3>
              {history.filter((h) => h.ratingByUser?.stars).length > 0 && (
                <span className="text-xs font-bold text-amber-600">
                  ★ {(history.filter((h) => h.ratingByUser?.stars).reduce((s, h) => s + (h.ratingByUser.stars || 0), 0) / history.filter((h) => h.ratingByUser?.stars).length).toFixed(1)} avg · {history.filter((h) => h.ratingByUser?.stars).length} reviews
                </span>
              )}
            </div>

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
                className="w-5 h-5 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Emergency medico-legal / bail standby
                </div>
                <div className="text-[11px] text-slate-500">
                  Distressed families facing detention or MLC FIR can find you on standby.
                </div>
              </div>
              <input
                type="checkbox"
                checked={editEmergencyStandby}
                onChange={(e) => setEditEmergencyStandby(e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Court-conflict reschedule & refund policy
              </label>
              <select
                value={editRefundPolicy}
                onChange={(e) => setEditRefundPolicy(e.target.value)}
                className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 w-full"
              >
                <option value="lawyer_cancels_full">100% refund if lawyer cancels</option>
                <option value="court_clash_reschedule">Free priority reschedule on court clash</option>
                <option value="client_12h_full">100% refund on client cancel &gt;12h before</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Legal fee schedule (₹)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['video30m', '30m Video Advisory'],
                  ['chamberVisit', 'Chamber Visit'],
                  ['bedsideVisit', 'Hospital Bedside Visit'],
                  ['noticeDrafting', 'Legal Notice Drafting'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-[11px] text-slate-500 mb-1">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      value={editFeeSchedule[key]}
                      onChange={(e) => setEditFeeSchedule({ ...editFeeSchedule, [key]: Number(e.target.value) })}
                      className="rounded-xl text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Primary practicing courts
              </label>
              <div className="flex flex-wrap gap-2">
                {editPracticingCourts.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditPracticingCourts(editPracticingCourts.filter((x) => x !== c))}
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold"
                    title="Remove"
                  >
                    {c} ✕
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={courtInput}
                  onChange={(e) => setCourtInput(e.target.value)}
                  placeholder="e.g. Supreme Court, High Court of MP, NCDRC"
                  className="rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const v = courtInput.trim();
                    if (v && !editPracticingCourts.includes(v)) setEditPracticingCourts([...editPracticingCourts, v].slice(0, 10));
                    setCourtInput('');
                  }}
                  className="text-xs shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Client-attorney privilege lock
                </div>
                <div className="text-[11px] text-slate-500">
                  Health records shared by the patient stay encrypted under privilege.
                </div>
              </div>
              <input
                type="checkbox"
                checked={editPrivilegeLocked}
                onChange={(e) => setEditPrivilegeLocked(e.target.checked)}
                className="w-5 h-5 rounded"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  GSTIN (for fee invoices)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 23ABCDE1234F1Z5"
                  value={bankGstin}
                  onChange={(e) => setBankGstin(e.target.value.toUpperCase())}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
            {profile?.bankDetails?.verified && (
              <p className="text-[11px] font-bold text-emerald-600">✓ Settlement account verified by admin</p>
            )}

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={savingSettings}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}

      {/* FULL-SCREEN Incoming Legal Consultation Call modal (120s / 2-minute timer with ringtone) */}
      {activeIncomingCall && (
        <ProviderIncomingCall
          key={activeIncomingCall._id}
          data={{
            requestId: activeIncomingCall._id,
            providerType: 'lawyer',
            category: activeIncomingCall.category || 'medical_negligence',
            title: `Legal Consultation: ${activeIncomingCall.category?.replace(/_/g, ' ') || 'Healthcare Issue'}`,
            subtitle: `Client requesting consultation (${activeIncomingCall.consultationMode?.replace('_', ' ') || 'Direct Session'}). Respond within 2 minutes.`,
            patient: {
              name: activeIncomingCall.userId?.name || 'Client',
              phone: activeIncomingCall.userId?.phone || 'Direct App Connect',
            },
            location: {
              address: activeIncomingCall.userId?.city
                ? `Client City: ${activeIncomingCall.userId.city}`
                : 'Direct Consultation (Audio / Video / Chamber)',
            },
            amount: activeIncomingCall.fee || 500,
            windowSeconds: 120,
            specialInstructions: activeIncomingCall.caseDescription,
            serviceBadges: [
              activeIncomingCall.consultationMode?.replace('_', ' ') || 'Consultation',
              activeIncomingCall.urgency === 'urgent' ? '⚡ Urgent' : 'Scheduled',
            ],
          }}
          acceptedWaiting={acceptedWaiting || String(acceptingId) === String(activeIncomingCall._id)}
          onAccept={async (bookingId) => {
            const accepted = await handleAcceptRequest(bookingId);
            // Success → show "Booking accepted" on the call screen briefly, then close it.
            // Failure → keep the call screen open so the advocate can retry. (Earlier it
            // always closed silently, so it looked like the accept did nothing at all.)
            if (accepted) {
              setAcceptedWaiting(true);
              setTimeout(() => {
                setActiveIncomingCall(null);
                setAcceptedWaiting(false);
              }, 1100);
            }
          }}
          onReject={async (bookingId) => {
            await handleDeclineRequest(bookingId);
            setActiveIncomingCall(null);
            setAcceptedWaiting(false);
          }}
          onTimeout={(bookingId) => {
            toast.info('Request timed out — it stays in your Requests tab.');
            setActiveIncomingCall(null);
            setAcceptedWaiting(false);
            setIncomingRequests((prev) => prev.filter((r) => String(r._id) !== String(bookingId)));
          }}
        />
      )}
    </div>
  );
}
