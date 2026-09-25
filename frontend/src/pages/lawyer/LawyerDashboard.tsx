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
import { LawyerOverviewTab } from '../../components/lawyer/LawyerOverviewTab';
import { LawyerRequestsTab } from '../../components/lawyer/LawyerRequestsTab';
import { LawyerActiveConsultationTab } from '../../components/lawyer/LawyerActiveConsultationTab';
import { LawyerCasesTab } from '../../components/lawyer/LawyerCasesTab';
import { LawyerEarningsTab } from '../../components/lawyer/LawyerEarningsTab';
import { LawyerProfileTab } from '../../components/lawyer/LawyerProfileTab';
import { LawyerDocumentsTab } from '../../components/lawyer/LawyerDocumentsTab';
import { LawyerReviewsTab } from '../../components/lawyer/LawyerReviewsTab';
import { LawyerSettingsTab } from '../../components/lawyer/LawyerSettingsTab';
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

    // Wave-based instant dispatch alert (H3 radius expand engine)
    const handleInstantLawyerAlert = (payload: any) => {
      if (!payload?.requestId && !payload?.bookingId) return;
      const booking = {
        _id: payload.requestId || payload.bookingId,
        bookingNumber: payload.bookingNumber,
        category: payload.category,
        caseCategory: payload.caseCategory,
        consultationMode: payload.consultationMode || 'video',
        fee: payload.amount || 0,
        scheduledDate: payload.scheduledTime,
        specialInstructions: payload.specialInstructions,
        windowSeconds: payload.windowSeconds || 30,
        status: 'requested',
        isInstantWave: true,
      };
      setIncomingRequests((prev) =>
        prev.some((r) => String(r._id) === String(booking._id))
          ? prev
          : [{ ...booking, _receivedAt: Date.now() }, ...prev]
      );
      setAcceptedWaiting(false);
      setActiveIncomingCall(booking);
    };

    socket.on('new_booking_request', handleNewRequest);
    socket.on('lawyer:alert', handleInstantLawyerAlert);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
      socket.off('lawyer:alert', handleInstantLawyerAlert);
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
        <LawyerOverviewTab
          user={user}
          profile={profile}
          isPendingApproval={isPendingApproval}
          togglingAvailable={togglingAvailable}
          handleToggleAvailable={handleToggleAvailable}
          incomingRequests={incomingRequests}
          activeBooking={activeBooking}
          earnings={earnings}
          history={history}
          weeklyData={weeklyData}
          caseMix={caseMix}
          setActiveTab={setActiveTab}
        />
      )}

        {/* ── 2. BOOKING REQUESTS TAB ────────────────────────────── */}
        {activeTab === 'requests' && (
          <LawyerRequestsTab
            incomingRequests={incomingRequests}
            handleAcceptRequest={handleAcceptRequest}
            handleDeclineRequest={handleDeclineRequest}
            proposingId={proposingId}
            setProposingId={setProposingId}
            proposedTime={proposedTime}
            setProposedTime={setProposedTime}
            handleProposeTime={handleProposeTime}
          />
        )}

        {/* ── 3. ACTIVE CONSULTATION TAB ─────────────────────────── */}
        {activeTab === 'active' && (
          <LawyerActiveConsultationTab
            activeBooking={activeBooking}
            user={user}
            fetchDashboardData={fetchDashboardData}
          />
        )}

        {/* ── 4. CASES HISTORY TAB (search + filter + pagination — L-9) ── */}
        {activeTab === 'cases' && (
          <LawyerCasesTab
            filteredHistory={filteredHistory}
            history={history}
            caseSearch={caseSearch}
            setCaseSearch={setCaseSearch}
            caseStatusFilter={caseStatusFilter}
            setCaseStatusFilter={setCaseStatusFilter}
            setCasePage={setCasePage}
            pagedHistory={pagedHistory}
            safeCasePage={safeCasePage}
            totalCasePages={totalCasePages}
          />
        )}

        {/* ── 5. EARNINGS & WALLET TAB ───────────────────────────── */}
        {activeTab === 'earnings' && (
          <LawyerEarningsTab
            earnings={earnings}
            history={history}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            withdrawing={withdrawing}
            handleWithdrawDemo={handleWithdrawDemo}
          />
        )}

        {/* ── 6. PROFILE & FEES TAB ──────────────────────────────── */}
        {activeTab === 'profile' && (
          <LawyerProfileTab
            handleSaveProfile={handleSaveProfile}
            editBio={editBio}
            setEditBio={setEditBio}
            editFee={editFee}
            setEditFee={setEditFee}
            editFollowUpFee={editFollowUpFee}
            setEditFollowUpFee={setEditFollowUpFee}
            editDuration={editDuration}
            setEditDuration={setEditDuration}
            savingProfile={savingProfile}
          />
        )}

        {/* ── 7. VERIFICATION DOCUMENTS TAB ──────────────────────── */}
        {activeTab === 'documents' && (
          <LawyerDocumentsTab profile={profile} />
        )}

        {/* ── 8. REVIEWS & RATINGS TAB ───────────────────────────── */}
        {activeTab === 'reviews' && (
          <LawyerReviewsTab history={history} />
        )}

        {/* ── 9. SETTINGS & PAYOUT TAB ───────────────────────────── */}
        {activeTab === 'settings' && (
          <LawyerSettingsTab
            handleSaveSettings={handleSaveSettings}
            acceptsUrgent={acceptsUrgent}
            setAcceptsUrgent={setAcceptsUrgent}
            editEmergencyStandby={editEmergencyStandby}
            setEditEmergencyStandby={setEditEmergencyStandby}
            editRefundPolicy={editRefundPolicy}
            setEditRefundPolicy={setEditRefundPolicy}
            editFeeSchedule={editFeeSchedule}
            setEditFeeSchedule={setEditFeeSchedule}
            editPracticingCourts={editPracticingCourts}
            setEditPracticingCourts={setEditPracticingCourts}
            courtInput={courtInput}
            setCourtInput={setCourtInput}
            editPrivilegeLocked={editPrivilegeLocked}
            setEditPrivilegeLocked={setEditPrivilegeLocked}
            bankHolder={bankHolder}
            setBankHolder={setBankHolder}
            bankAccount={bankAccount}
            setBankAccount={setBankAccount}
            bankIfsc={bankIfsc}
            setBankIfsc={setBankIfsc}
            bankUpi={bankUpi}
            setBankUpi={setBankUpi}
            bankGstin={bankGstin}
            setBankGstin={setBankGstin}
            profile={profile}
            savingSettings={savingSettings}
          />
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
            subtitle: `Client requesting consultation (${activeIncomingCall.consultationMode?.replace('_', ' ') || 'Direct Session'}). Respond within 2 minutes.${activeIncomingCall.firNumber ? ` FIR: ${activeIncomingCall.firNumber}` : ''}${activeIncomingCall.policeStationName ? ` @ ${activeIncomingCall.policeStationName}` : ''}`,
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
            // Wave-based bookings (lawyer:alert) vote via instant dispatch;
            // traditional new_booking_request accepts use the lawyer booking API.
            if (activeIncomingCall?.isInstantWave) {
              try {
                await api.post(`/instant/lawyer/${bookingId}/accept`, {});
                toast.success('Vote cast — waiting for dispatch confirmation…');
                setAcceptedWaiting(true);
                setTimeout(() => {
                  setActiveIncomingCall(null);
                  setAcceptedWaiting(false);
                }, 1100);
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Could not accept request');
              }
              return;
            }
            const accepted = await handleAcceptRequest(bookingId);
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
