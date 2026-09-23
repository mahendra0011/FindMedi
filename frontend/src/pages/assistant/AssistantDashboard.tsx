import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  LayoutDashboard,
  Bell,
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
  ExternalLink,
  Download,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Wallet,
  ChevronRight,
  Info,
  X,
  Building2,
  Stethoscope,
  BadgeCheck,
  HelpCircle,
  Activity,
  Award,
  Check,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Eye,
  AlertCircle,
  UserCheck,
  HeartPulse,
  BarChart3,
  CalendarDays,
  Target,
  IndianRupee,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { TaskChecklistView } from '../../components/assistant/TaskChecklistView';
import { AssistantChatPanel } from '../../components/assistant/AssistantChatPanel';
import { api } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinAssistantBookingRoom } from '../../lib/socket';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import ProviderIncomingCall from '@/components/emergency/ProviderIncomingCall';

const PRESET_SERVICE_AREAS = [
  'Jabalpur',
  'Delhi NCR',
  'Bhopal',
  'Indore',
  'Mumbai',
  'Pune',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Lucknow',
  'Kolkata',
  'Ahmedabad',
];

const SERVICE_CATEGORIES = [
  { id: 'paperwork', label: 'Hospital Paperwork & OPD Queues', icon: '📋' },
  { id: 'medicine', label: 'Pharmacy & Medicine Collection', icon: '💊' },
  { id: 'reports', label: 'Lab Sample & Diagnostic Reports', icon: '🧪' },
  { id: 'errand', label: 'In-Campus Hospital Errands', icon: '🏃' },
  { id: 'full_attendant', label: 'Bedside & Ward Attendant', icon: '🏥' },
  { id: 'elderly_care', label: 'Elderly & Wheelchair Mobility Care', icon: '👴' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AssistantDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab routing support: syncs both sub-paths (/assistant/requests) and ?tab=requests
  const getInitialTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/requests')) return 'requests';
    if (path.includes('/active')) return 'active';
    if (path.includes('/history')) return 'history';
    if (path.includes('/earnings')) return 'earnings';
    if (path.includes('/profile')) return 'profile';
    const queryTab = searchParams.get('tab');
    if (queryTab && ['overview', 'requests', 'active', 'history', 'earnings', 'profile'].includes(queryTab)) {
      return queryTab;
    }
    return 'overview';
  };

  const activeTab = getInitialTab();

  const setActiveTab = (tabId: string) => {
    if (tabId === 'overview') {
      navigate('/assistant/dashboard');
    } else {
      navigate(`/assistant/dashboard?tab=${tabId}`);
    }
  };

  // Core Data States
  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active shift live timer
  const [elapsedDuration, setElapsedDuration] = useState<string>('00:00:00');

  // Interactive UI modals
  const [showChat, setShowChat] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionSummary, setCompletionSummary] = useState('');
  const [completingShift, setCompletingShift] = useState(false);

  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('Assistant unavailable at this schedule');
  const [declining, setDeclining] = useState(false);

  const [historyDetailBooking, setHistoryDetailBooking] = useState<any | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);
  const [activeIncomingCall, setActiveIncomingCall] = useState<any | null>(null);

  // Filters & Searches
  const [requestFilter, setRequestFilter] = useState<'all' | 'urgent' | 'scheduled'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Earnings withdrawal
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccessRef, setWithdrawSuccessRef] = useState<string | null>(null);

  // Profile Edit State
  const [editBio, setEditBio] = useState('');
  const [editPricePerHour, setEditPricePerHour] = useState(150);
  const [editPricePerFullDay, setEditPricePerFullDay] = useState(1000);
  const [editHospitals, setEditHospitals] = useState<string[]>([]);
  const [customHospital, setCustomHospital] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editExperienceYears, setEditExperienceYears] = useState(2);
  const [editLanguages, setEditLanguages] = useState<string[]>(['Hindi', 'English']);
  const [editAvailableDays, setEditAvailableDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [editExtraSkills, setEditExtraSkills] = useState({
    mobilityAssistance: true,
    wheelchairComfort: true,
    ownVehicleMedicine: false,
    overnightStays: false,
  });
  const [editBankDetails, setEditBankDetails] = useState({
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
  });
  const [editEmergencyContact, setEditEmergencyContact] = useState({
    name: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Fetch all dashboard feeds
  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [profileRes, earningsRes, activeRes, historyRes, pendingRes] = await Promise.all([
        api.getMyAssistantProfile().catch(() => ({ profile: null })),
        api.getAssistantEarnings().catch(() => null),
        api.getActiveAssistantBooking().catch(() => ({ activeBooking: null })),
        api.getAssistantBookingHistory({ limit: 50 }).catch(() => ({ bookings: [] })),
        api.getAssistantPendingRequests().catch(() => ({ requests: [] })),
      ]);

      if (profileRes?.profile) {
        const p = profileRes.profile;
        setProfile(p);
        setEditBio(p.bio || '');
        setEditPricePerHour(p.pricePerHour || 150);
        setEditPricePerFullDay(p.pricePerFullDay || 1000);
        setEditHospitals(p.hospitalsCovered || []);
        setEditCategories(p.serviceCategories || ['paperwork', 'medicine']);
        setEditExperienceYears(p.experienceYears || 2);
        setEditLanguages(p.languages?.length ? p.languages : ['Hindi', 'English']);
        setEditAvailableDays(p.availableDays?.length ? p.availableDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        if (p.extraSkills) setEditExtraSkills({ ...editExtraSkills, ...p.extraSkills });
        if (p.bankDetails) setEditBankDetails({ ...editBankDetails, ...p.bankDetails });
        if (p.emergencyContact) setEditEmergencyContact({ ...editEmergencyContact, ...p.emergencyContact });
      }

      setEarnings(earningsRes);
      setActiveBooking(activeRes?.activeBooking || null);
      setHistory(historyRes?.bookings || []);
      setIncomingRequests(pendingRes?.requests || []);
    } catch (e) {
      console.error('Failed to load assistant dashboard', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket listener for real-time requests & booking updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewRequest = (booking: any) => {
      setIncomingRequests((prev) => {
        const exists = prev.some((r) => r._id === booking._id);
        if (exists) return prev;
        return [booking, ...prev];
      });

      // Trigger full-screen incoming call modal with 120s timer
      setActiveIncomingCall(booking);

      // Browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 New Hospital Assistant Request!', {
          body: `Patient requested assistance at ${booking.hospital} (${booking.durationType?.toUpperCase()})`,
        });
      }
    };

    const handleBookingUpdate = () => {
      fetchDashboardData(true);
    };

    socket.on('new_booking_request', handleNewRequest);
    socket.on('assistant_booking_updated', handleBookingUpdate);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
      socket.off('assistant_booking_updated', handleBookingUpdate);
    };
  }, []);

  // Join socket room for active booking
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinAssistantBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  // Live stopwatch timer for in-progress shift
  useEffect(() => {
    if (!activeBooking || activeBooking.status !== 'in_progress') {
      setElapsedDuration('00:00:00');
      return;
    }

    const startTime = new Date(activeBooking.checkInAt || activeBooking.createdAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      setElapsedDuration(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

  // Availability Switch handler
  const handleToggleAvailable = async () => {
    if (!profile) return;
    try {
      const res = await api.setAssistantStatus(!profile.isAvailable);
      setProfile((prev: any) => ({ ...prev, isAvailable: res.isAvailable }));
    } catch (err: any) {
      alert(err.message || 'Failed to update availability status');
    }
  };

  // Accept incoming request
  const handleAcceptRequest = async (bookingId: string) => {
    try {
      await api.acceptAssistantBooking(bookingId);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
      await fetchDashboardData(true);
      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Could not accept this booking.');
    }
  };

  // Decline incoming request
  const confirmDecline = async () => {
    if (!declineTargetId) return;
    try {
      setDeclining(true);
      await api.declineAssistantBooking(declineTargetId, declineReason);
      setIncomingRequests((prev) => prev.filter((r) => r._id !== declineTargetId));
      setDeclineTargetId(null);
    } catch (err: any) {
      alert(err.message || 'Could not decline booking');
    } finally {
      setDeclining(false);
    }
  };

  // Complete active shift
  const handleCompleteActiveShift = async () => {
    if (!activeBooking) return;
    try {
      setCompletingShift(true);
      await api.completeAssistantBooking(activeBooking._id, completionSummary || 'Assistance successfully completed.');
      setShowCompleteModal(false);
      setCompletionSummary('');
      await fetchDashboardData(true);
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || 'Failed to mark assistance completed.');
    } finally {
      setCompletingShift(false);
    }
  };

  // PDF Receipt download
  const handleDownloadReceipt = async (bookingId: string, bookingNum?: string) => {
    try {
      setDownloadingPdfId(bookingId);
      await api.downloadAssistantReceipt(bookingId, `Receipt-${bookingNum || bookingId}.pdf`);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF receipt.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Demo withdrawal
  const handleWithdrawDemo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (amt > (profile?.walletBalance || 0)) {
      alert('Withdrawal amount exceeds available wallet balance.');
      return;
    }
    try {
      setWithdrawing(true);
      const res = await api.withdrawAssistantDemo(amt);
      setWithdrawSuccessRef(res.reference || `DEMO-PAY-${Date.now().toString().slice(-6)}`);
      setWithdrawAmount('');
      fetchDashboardData(true);
    } catch (err: any) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileSuccessMsg('');
      await api.updateAssistantProfile({
        bio: editBio,
        pricePerHour: Number(editPricePerHour),
        pricePerFullDay: Number(editPricePerFullDay),
        hospitalsCovered: editHospitals,
        serviceCategories: editCategories,
        experienceYears: Number(editExperienceYears),
        languages: editLanguages,
        availableDays: editAvailableDays,
        extraSkills: editExtraSkills,
        bankDetails: editBankDetails,
        emergencyContact: editEmergencyContact,
      });
      setProfileSuccessMsg('Profile and preferences updated successfully!');
      fetchDashboardData(true);
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Profile update failed.');
    } finally {
      setSavingProfile(false);
    }
  };

  const isVerified = profile?.assistantStatus === 'active';

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (requestFilter === 'urgent') return incomingRequests.filter((r) => r.isUrgent);
    if (requestFilter === 'scheduled') return incomingRequests.filter((r) => !r.isUrgent);
    return incomingRequests;
  }, [incomingRequests, requestFilter]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const matchSearch =
        !historySearch ||
        h.hospital?.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.patientId?.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.bookingNumber?.toLowerCase().includes(historySearch.toLowerCase());
      const matchStatus = historyStatusFilter === 'all' || h.status === historyStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [history, historySearch, historyStatusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading Assistant Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
        {/* Verification Alert Banner if pending */}
        {!isVerified && profile && (
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-sm backdrop-blur-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">Verification Under Review (FindMedi Admin)</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Your credentials, government ID, and police clearance documents are currently under verification. Once approved (within 24 hours), you will be able to toggle "Available" and receive patient shift assignments across your selected hospitals.
              </p>
            </div>
          </div>
        )}

        {/* ── TOP HERO HEADER ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Assistant Info */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 text-white flex items-center justify-center font-black text-2xl shadow-md ring-4 ring-teal-50 dark:ring-teal-950/40">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                  profile?.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                title={profile?.isAvailable ? 'Online' : 'Offline'}
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
                  {user?.name || 'Care Assistant'}
                </h1>
                <Badge
                  variant={isVerified ? 'default' : 'secondary'}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isVerified
                      ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {isVerified ? 'VERIFIED ATTENDANT' : 'APPROVAL PENDING'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {profile?.rating?.avg?.toFixed(1) || '5.0'}
                  <span className="text-slate-400 font-normal">
                    ({profile?.rating?.count || profile?.totalBookings || 0} reviews)
                  </span>
                </span>
                <span>•</span>
                <span className="text-teal-700 dark:text-teal-400 font-bold">
                  {profile?.totalBookings || history.length || 0} Shifts Completed
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  {profile?.operatingCity || 'Jabalpur / Delhi NCR'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Availability Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end relative z-10 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {/* Refresh Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="rounded-2xl h-10 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh live data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
              Refresh
            </Button>

            {/* Emergency SOS hotline */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSosModal(true)}
              className="rounded-2xl h-10 px-3 text-xs font-bold border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <HeartPulse className="w-3.5 h-3.5 mr-1 text-rose-500 animate-pulse" />
              Emergency SOS
            </Button>

            {/* Online / Duty Toggle */}
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
                {profile?.isAvailable ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Available on Duty
                  </span>
                ) : (
                  <span className="text-slate-400">Offline / Off Duty</span>
                )}
              </span>
              <Button
                type="button"
                disabled={!isVerified}
                onClick={handleToggleAvailable}
                className={`rounded-xl px-3.5 h-8 font-bold text-xs shadow-sm transition-all ${
                  profile?.isAvailable
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Power className="w-3.5 h-3.5 mr-1.5" />
                {profile?.isAvailable ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation handled by sidebar (AppSidebar.tsx) — no in-page tab bar needed */}

        {/* ── 1. OVERVIEW / DASHBOARD TAB ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome & Live Status Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-800 p-6 sm:p-8 text-white shadow-xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />
              <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none hidden sm:block">
                <Stethoscope className="w-56 h-56" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-teal-100 border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      FindMedi Hospital Care Partner
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-emerald-400/30">
                      <Award className="w-3.5 h-3.5 text-emerald-300" />
                      Gold Attendant
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {(() => {
                      const hr = new Date().getHours();
                      if (hr < 12) return 'Good Morning';
                      if (hr < 17) return 'Good Afternoon';
                      return 'Good Evening';
                    })()}, {user?.name?.split(' ')[0] || 'Care Attendant'}! 👋
                  </h2>

                  <p className="text-teal-100 text-xs sm:text-sm leading-relaxed max-w-xl">
                    {profile?.isAvailable
                      ? 'You are active on duty! Emergency patient admissions, OPD tokens, and lab assistance requests will buzz your phone.'
                      : 'You are currently off-duty. Switch "Available on Duty" above to start receiving hospital companion shift requests.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveTab('requests')}
                      className="bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5 text-teal-600" />
                      Shift Requests ({incomingRequests.length})
                    </Button>
                    {activeBooking && (
                      <Button
                        type="button"
                        onClick={() => setActiveTab('active')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Active Shift Controls
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('profile')}
                      className="border-white/30 text-white hover:bg-white/10 font-semibold text-xs rounded-xl h-9 px-4"
                    >
                      Hospital Coverage & Skills
                    </Button>
                  </div>
                </div>

                {/* Right Hero Live Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
                    <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Today Net</span>
                    <span className="text-xl font-black text-white">₹{earnings?.todayNet || 0}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
                    <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Rating</span>
                    <span className="text-xl font-black text-amber-300 flex items-center justify-center sm:justify-start gap-1">
                      ★ {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Completed Shifts</span>
                    <span className="text-xl font-black text-white">
                      {profile?.totalBookings || history.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Financial Stat Cards */}
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
                  ₹{profile?.walletBalance || earnings?.walletBalance || 0}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Ready for instant payout</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('earnings')}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
                  >
                    Withdraw <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </motion.div>

              {/* Net Earnings */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-teal-500/50"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Net Earnings
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  ₹{earnings?.netEarnings || 0}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>This month: ₹{earnings?.thisMonthNet || 0}</span>
                  <span className="text-emerald-500 font-bold">100% Payout</span>
                </div>
              </motion.div>

              {/* Completed Shifts */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-cyan-500/50"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Shifts
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {profile?.totalBookings || history.length || 0}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Completion Rate</span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">
                    {profile?.completionRate || 99}%
                  </span>
                </div>
              </motion.div>

              {/* Rating & Patient Trust */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-amber-500/50"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Patient Trust Rating
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-500 flex items-center gap-1.5">
                  {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
                  <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>On-Time Arrival</span>
                  <span className="text-emerald-500 font-bold">{profile?.onTimeRate || 98}%</span>
                </div>
              </motion.div>
            </div>

            {/* Quick Hub Grid (Shortcuts to Tabs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="p-4 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent hover:from-teal-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-teal-500/40 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Shift Requests</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {incomingRequests.length} waiting request(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent hover:from-cyan-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-cyan-500/40 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Active Shift</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeBooking ? 'Shift in progress' : 'Standby / Waiting'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('earnings')}
                className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Earnings & Payout</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ₹{profile?.walletBalance || earnings?.walletBalance || 0} balance
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-indigo-500/40 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Hospitals & Rates</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ₹{profile?.pricePerHour || 150}/hr · {profile?.operatingCity || 'Configured'}
                  </p>
                </div>
              </button>
            </div>

            {/* ── CHARTS & ANALYTICS SECTION ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 8 Cols: Weekly Shift Activity & Revenue Area Chart */}
              <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Weekly Shift Duty & Earnings</h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Daily record of completed hospital assistance shifts and earnings
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="flex items-center gap-1.5 px-2 font-semibold text-teal-600 dark:text-teal-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Net Earnings (₹)
                    </span>
                    <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Shifts
                    </span>
                  </div>
                </div>

                {/* Responsive Area Chart */}
                <div className="h-64 w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { day: 'Mon', revenue: 450, shifts: 1 },
                        { day: 'Tue', revenue: 900, shifts: 2 },
                        { day: 'Wed', revenue: 300, shifts: 1 },
                        { day: 'Thu', revenue: 1200, shifts: 2 },
                        { day: 'Fri', revenue: 600, shifts: 1 },
                        { day: 'Sat', revenue: earnings?.thisMonthNet ? Math.max(earnings.thisMonthNet, 1050) : 1050, shifts: 2 },
                        { day: 'Sun (Today)', revenue: earnings?.todayNet || 450, shifts: earnings?.todayBookings || 1 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="assistantRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
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
                                <div className="flex items-center justify-between gap-4 text-teal-600 font-bold">
                                  <span>Earnings:</span>
                                  <span>₹{payload[0]?.value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-500">
                                  <span>Shifts:</span>
                                  <span>{payload[0]?.payload?.shifts} completed</span>
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
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#assistantRevenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Mini Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-400">Avg. Shift Pay</p>
                    <p className="font-bold text-teal-600 dark:text-teal-400 text-sm mt-0.5">₹450 / shift</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Response Speed</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">&lt; 3 mins</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Payout Split</p>
                    <p className="font-bold text-teal-700 dark:text-teal-300 text-sm mt-0.5">90% Direct Attendant</p>
                  </div>
                </div>
              </div>

              {/* 4 Cols: Service Categories Distribution Pie Chart */}
              <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Care Distribution</h3>
                    <Badge variant="outline" className="text-[10px] font-mono">This Month</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Shifts completed across medical assistance types
                  </p>

                  {/* Donut Chart */}
                  <div className="h-44 w-full relative flex items-center justify-center mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'OPD & Paperwork', value: 45, color: '#0d9488' },
                            { name: 'Medicine & Pharmacy', value: 25, color: '#06b6d4' },
                            { name: 'Lab Reports', value: 18, color: '#6366f1' },
                            { name: 'Bedside Care', value: 12, color: '#f59e0b' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {[
                            { color: '#0d9488' },
                            { color: '#06b6d4' },
                            { color: '#6366f1' },
                            { color: '#f59e0b' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg text-xs">
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{payload[0]?.name}</p>
                                  <p className="text-teal-600 font-bold">{payload[0]?.value}% of total shifts</p>
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
                        {profile?.totalBookings || history.length || 14}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">Tasks</span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      <span className="text-slate-600 dark:text-slate-400 truncate">OPD & Queues (45%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      <span className="text-slate-600 dark:text-slate-400 truncate">Pharmacy (25%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-slate-600 dark:text-slate-400 truncate">Lab Reports (18%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-600 dark:text-slate-400 truncate">Bedside Care (12%)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Service Reliability</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> High Trust Score
                  </span>
                </div>
              </div>
            </div>

            {/* Active Shift Spotlight (If currently on shift) */}
            {activeBooking && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <Badge className="bg-teal-700 text-white text-[11px] uppercase font-bold tracking-wide">
                      {activeBooking.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                      Booking #{activeBooking.bookingNumber || activeBooking._id.slice(-6)}
                    </span>
                  </div>

                  {activeBooking.status === 'in_progress' && (
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-teal-500/20 px-3.5 py-1 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      Duty Duration: <span className="font-mono text-teal-600">{elapsedDuration}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="text-xs text-slate-400 block">Patient Name</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {activeBooking.patientId?.name || 'Assigned Patient'}
                    </h4>
                    {activeBooking.patientId?.phone && (
                      <span className="text-xs text-slate-500">{activeBooking.patientId.phone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block">Hospital & Ward</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      {activeBooking.hospital}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {activeBooking.durationType?.toUpperCase()} Shift • Started at {activeBooking.startTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-start sm:justify-end self-center">
                    <Button
                      type="button"
                      onClick={() => setActiveTab('active')}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm h-10 px-5"
                    >
                      Open Active Shift Controls
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Incoming Requests Peek */}
            {incomingRequests.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <Bell className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Pending Shift Requests ({incomingRequests.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Patients waiting for attendant acceptance right now
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('requests')}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.slice(0, 2).map((req) => (
                    <div
                      key={req._id}
                      className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/20 dark:bg-teal-950/10 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {req.isUrgent && (
                            <Badge className="bg-rose-600 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full mb-1">
                              🚨 URGENT BROADCAST
                            </Badge>
                          )}
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-teal-600" />
                            {req.hospital}
                          </h4>
                          <span className="text-xs text-slate-500">
                            Patient: {req.patientId?.name || 'Verified Patient'} • Duration: {req.durationType?.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Net Payout</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₹{Math.round((req.cost?.total || 600) * 0.9)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeclineTargetId(req._id);
                          }}
                          className="flex-1 text-xs text-rose-600 hover:text-rose-700 border-slate-200 dark:border-slate-800 h-8 rounded-xl font-bold"
                        >
                          Decline
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAcceptRequest(req._id)}
                          className="flex-1 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-8 rounded-xl shadow-sm"
                        >
                          Accept Shift
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coverage Summary & SOP Guidelines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Areas & Reach */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Service Areas & Reach
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-teal-600 hover:underline"
                  >
                    Edit in Profile
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  You can serve at any hospital/clinic within your selected cities. Patient requests are matched based on your service areas.
                </p>

                <div className="flex flex-wrap gap-2">
                  {(profile?.hospitalsCovered || []).length > 0 ? (
                    profile.hospitalsCovered.map((h: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-xs font-bold text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800"
                      >
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {h}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      No service areas selected yet. Add cities in your profile to receive requests.
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 mb-2">Service Capabilities Offered:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile?.serviceCategories || []).map((catId: string) => {
                      const item = SERVICE_CATEGORIES.find((s) => s.id === catId);
                      return (
                        <span
                          key={catId}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-medium"
                        >
                          {item ? `${item.icon} ${item.label}` : catId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Assistant Care SOP & Safety Protocol */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  Care Attendant SOP & Guidelines
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Check In Immediately</span>
                      <p className="text-slate-500 text-[11px]">
                        As soon as you enter the hospital campus, tap "Check In Now" in your Active Shift tab to inform the patient.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Realtime Task Checklist</span>
                      <p className="text-slate-500 text-[11px]">
                        Mark tasks as completed (Prescription bought, OPD queue tokens, Lab reports collected) so the family stays reassured.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Safe Handover at Completion</span>
                      <p className="text-slate-500 text-[11px]">
                        Hand over all receipts and doctor files to the patient/relative before clicking "Mark Assistance Completed".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. SHIFT REQUESTS TAB ───────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600" />
                  Incoming Patient Shift Requests
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and accept requests from patients in your service areas
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-stretch sm:self-auto">
                {[
                  { id: 'all', label: `All (${incomingRequests.length})` },
                  { id: 'urgent', label: '🚨 Urgent Only' },
                  { id: 'scheduled', label: '📅 Scheduled' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRequestFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      requestFilter === f.id
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  No Pending Requests Available
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Keep your status toggled <strong className="text-emerald-600">"Online"</strong> to receive incoming requests. Also ensure you have added all nearby hospitals in your profile.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('profile')}
                  className="rounded-xl text-xs font-bold"
                >
                  Manage Service Areas & Rates
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const gross = req.cost?.total || 600;
                  const net = Math.round(gross * 0.9);
                  return (
                    <div
                      key={req._id}
                      className="p-5 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/40 bg-white dark:bg-slate-900 shadow-sm transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {req.isUrgent && (
                              <Badge className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide">
                                🚨 URGENT DISPATCH
                              </Badge>
                            )}
                            <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold uppercase">
                              {req.durationType?.toUpperCase()} SHIFT
                            </Badge>
                            <span className="text-xs font-mono text-slate-400">
                              #{req.bookingNumber || req._id.slice(-6)}
                            </span>
                          </div>

                          <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5 pt-0.5">
                            <Building2 className="w-4 h-4 text-teal-600" />
                            {req.hospital}
                          </h4>

                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Patient: <strong className="text-slate-900 dark:text-slate-200">{req.patientId?.name || 'Verified Patient'}</strong> • Reporting: {new Date(req.scheduledDate).toLocaleDateString()} at {req.startTime}
                          </p>
                        </div>

                        {/* Financial summary */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-right min-w-[140px] self-end sm:self-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Your Net Earning
                          </span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            ₹{net}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Gross: ₹{gross} (10% fee)
                          </span>
                        </div>
                      </div>

                      {/* Required Services & Instructions */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {req.serviceCategories?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-400 font-semibold mr-1">Required:</span>
                            {req.serviceCategories.map((c: string) => {
                              const cat = SERVICE_CATEGORIES.find((s) => s.id === cat);
                              return (
                                <Badge
                                  key={c}
                                  variant="secondary"
                                  className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800"
                                >
                                  {cat ? `${cat.icon} ${cat.label}` : c}
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        {req.specialInstructions && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900 dark:text-amber-200 text-xs italic">
                            <span className="font-bold not-italic">Patient Note: </span>
                            "{req.specialInstructions}"
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeclineTargetId(req._id)}
                          className="text-xs text-rose-600 hover:text-rose-700 border-slate-200 dark:border-slate-800 font-bold px-4 h-9 rounded-xl"
                        >
                          Decline Request
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAcceptRequest(req._id)}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-black px-6 h-9 rounded-xl shadow-md shadow-teal-600/20"
                        >
                          Accept & Confirm Shift
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 3. ACTIVE SHIFT TAB ─────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {!activeBooking ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  No Confirmed or Active Shift Right Now
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you accept a shift request, patient details, emergency contacts, hospital location, and realtime task checklist will appear here.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl h-10 px-5"
                  >
                    Check Shift Requests ({incomingRequests.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
                {/* Top Status & Shift Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      <Badge className="bg-teal-700 text-white text-[11px] font-black uppercase tracking-wider">
                        {activeBooking.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">
                        #{activeBooking.bookingNumber || activeBooking._id.slice(-6)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      Assisting {activeBooking.patientId?.name || 'Patient'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Scheduled: {new Date(activeBooking.scheduledDate).toLocaleDateString()} at {activeBooking.startTime} ({activeBooking.durationType?.toUpperCase()})
                    </p>
                  </div>

                  {/* Stopwatch and Quick Communication buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                    {activeBooking.status === 'in_progress' && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 animate-spin" />
                        <div>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">
                            Duty Timer Elapsed
                          </span>
                          <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300">
                            {elapsedDuration}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {activeBooking.patientId?.phone && (
                        <a href={`tel:${activeBooking.patientId.phone}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs font-bold gap-1.5 h-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-teal-50 dark:hover:bg-slate-800"
                          >
                            <Phone className="w-3.5 h-3.5 text-teal-600" /> Call Patient
                          </Button>
                        </a>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowChat(!showChat)}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 h-10 px-4 rounded-xl shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {showChat ? 'Close Chat' : 'In-App Chat'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Patient, Location, and Instructions Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Patient Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Patient Contact</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {activeBooking.patientId?.name || 'Patient'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Phone: {activeBooking.patientId?.phone || activeBooking.phone || 'Provided via app'}
                    </p>
                    {activeBooking.onBehalfOf && activeBooking.onBehalfOf !== 'self' && (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Booked for: {activeBooking.onBehalfOf?.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Hospital & Navigation Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Hospital Location</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      {activeBooking.hospital}
                    </h4>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeBooking.hospital)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline pt-1"
                    >
                      <Navigation className="w-3.5 h-3.5 text-teal-600" />
                      Open Google Maps Navigation
                    </a>
                  </div>

                  {/* Shift Compensation Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Shift Earnings</span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Math.round((activeBooking.cost?.total || 600) * 0.9)}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Rate: ₹{activeBooking.cost?.ratePerHour || 150}/hr • Auto credited upon shift completion
                    </p>
                  </div>
                </div>

                {/* Patient Special Instructions */}
                {activeBooking.specialInstructions && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold block mb-0.5">Special Instructions / Tasks Given:</span>
                    <p className="italic">"{activeBooking.specialInstructions}"</p>
                  </div>
                )}

                {/* Check In Action if Confirmed */}
                {activeBooking.status === 'confirmed' && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-2 border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        Arrived at Hospital Campus?
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Tap "Check In Now" as soon as you enter the hospital. This starts your duty duration and notifies the patient.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.checkInAssistantBooking(activeBooking._id);
                          await fetchDashboardData(true);
                        } catch (e: any) {
                          alert(e.message || 'Check in failed');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md shadow-emerald-600/20"
                    >
                      Check In Now
                    </Button>
                  </div>
                )}

                {/* Task Checklist Component */}
                <div className="space-y-2">
                  <TaskChecklistView
                    tasks={activeBooking.taskChecklist || []}
                    isAssistant={true}
                    onToggleTask={async (taskId, isDone) => {
                      try {
                        await api.updateAssistantTask(activeBooking._id, taskId, isDone);
                        await fetchDashboardData(true);
                      } catch (e: any) {
                        alert(e.message || 'Toggle task failed');
                      }
                    }}
                    onAddCustomTask={async (label, category) => {
                      try {
                        await api.addAssistantCustomTask(activeBooking._id, label, category);
                        await fetchDashboardData(true);
                      } catch (e: any) {
                        alert(e.message || 'Add task failed');
                      }
                    }}
                  />
                </div>

                {/* Complete Assistance Shift Action */}
                {activeBooking.status === 'in_progress' && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      Finished all hospital errands, paperwork, and patient handover?
                    </p>
                    <Button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-black text-xs px-8 h-11 rounded-2xl shadow-lg shadow-teal-700/20"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Assistance Completed
                    </Button>
                  </div>
                )}

                {/* Slide/Collapsible In-app Chat Panel */}
                {showChat && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <AssistantChatPanel
                      bookingId={activeBooking._id}
                      currentUser={user}
                      targetUser={activeBooking.patientId}
                      onClose={() => setShowChat(false)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 4. SHIFT HISTORY TAB ────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-600" />
                  Past Shifts & Performance Records
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete record of your past hospital sessions, patient ratings, and downloadable receipts
                </p>
              </div>

              {/* History Search & Filter */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Search patient, hospital..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl w-full sm:w-56"
                  />
                </div>

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed Only</option>
                  <option value="cancelled_by_patient">Cancelled by Patient</option>
                  <option value="cancelled_by_assistant">Cancelled by Me</option>
                </select>
              </div>
            </div>

            {/* History Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Logged Shifts</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {history.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Completed Successfully</span>
                <span className="text-lg font-black text-emerald-600">
                  {history.filter((h) => h.status === 'completed').length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Total Earned</span>
                <span className="text-lg font-black text-teal-600">
                  ₹{history
                    .filter((h) => h.status === 'completed')
                    .reduce((sum, h) => sum + Math.round((h.cost?.total || 0) * 0.9), 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Avg Satisfaction</span>
                <span className="text-lg font-black text-amber-500">
                  ⭐ {profile?.rating?.avg?.toFixed(1) || '5.0'}
                </span>
              </div>
            </div>

            {/* History Table */}
            {filteredHistory.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p>No past shift records matching your search or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Booking Ref</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Hospital</th>
                      <th className="py-3.5 px-4">Shift Type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Net Payout</th>
                      <th className="py-3.5 px-4">Patient Review</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {h.bookingNumber || `#${h._id.slice(-6)}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block text-slate-800 dark:text-slate-200">
                            {new Date(h.scheduledDate || h.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] text-slate-400">{h.startTime || 'Standard'}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {h.patientId?.name || 'Patient'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3 h-3 text-teal-600" />
                            {h.hospital}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                          {h.durationType?.toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[9px] font-bold uppercase ${
                              h.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : h.status.includes('cancelled')
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {h.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Math.round((h.cost?.total || 0) * 0.9)}
                        </td>
                        <td className="py-3 px-4">
                          {h.ratingByPatient?.stars ? (
                            <div>
                              <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                ⭐ {h.ratingByPatient.stars}
                              </span>
                              {h.ratingByPatient.comment && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]" title={h.ratingByPatient.comment}>
                                  "{h.ratingByPatient.comment}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryDetailBooking(h)}
                              className="h-8 px-2 text-xs font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800"
                              title="View shift breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={downloadingPdfId === h._id}
                              onClick={() => handleDownloadReceipt(h._id, h.bookingNumber)}
                              className="h-8 px-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 gap-1 rounded-xl"
                              title="Download PDF Care Receipt"
                            >
                              <Download className={`w-3 h-3 ${downloadingPdfId === h._id ? 'animate-bounce' : ''}`} />
                              Receipt
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 5. EARNINGS & PAYOUTS TAB ──────────────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Earnings, Wallet & Demo Settlement
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transparent fee breakdown and simulated instant bank settlement
                  </p>
                </div>

                <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1">
                  100% Payout Rate • Zero Hidden Charges
                </Badge>
              </div>

              {/* Financial Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 border-2 border-teal-500/30">
                  <span className="text-xs font-bold text-slate-500 uppercase">Available Wallet Balance</span>
                  <div className="text-3xl font-black text-teal-800 dark:text-teal-300 mt-1">
                    ₹{profile?.walletBalance || 0}
                  </div>
                  <span className="text-[10px] text-teal-600 font-semibold block mt-1">
                    Available for instant demo bank transfer
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
                  <span className="text-xs font-bold text-slate-400 uppercase">Gross Patient Billings</span>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    ₹{earnings?.totalGross || 0}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Total value of all shifts</span>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
                  <span className="text-xs font-bold text-slate-400 uppercase">Platform Fee (10%)</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    -₹{earnings?.platformCommission || 0}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Covers insurance & 24/7 support</span>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
                  <span className="text-xs font-bold text-slate-400 uppercase">Net Lifetime Payout</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{earnings?.netEarnings || 0}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">This month: ₹{earnings?.thisMonthNet || 0}</span>
                </div>
              </div>

              {/* Demo Bank Withdrawal Module */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      Request Instant Bank Payout (Demo Simulation)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Simulate direct deposit to your registered bank account or UPI ID
                    </p>
                  </div>

                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    INSTANT NEFT / UPI DEMO
                  </Badge>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Quick Select:</span>
                  {[500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500"
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(profile?.walletBalance || 0))}
                    className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 font-bold text-xs text-teal-700 dark:text-teal-300"
                  >
                    Full Balance (₹{profile?.walletBalance || 0})
                  </button>
                </div>

                {/* Form Input & Action */}
                <form onSubmit={handleWithdrawDemo} className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">₹</span>
                    <Input
                      type="number"
                      placeholder="Enter amount to withdraw"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      max={profile?.walletBalance || 0}
                      min={100}
                      className="pl-8 h-11 text-xs font-bold rounded-2xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (profile?.walletBalance || 0)}
                    className="h-11 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-2xl shadow-md shadow-emerald-600/20"
                  >
                    {withdrawing ? 'Processing Settlement...' : 'Simulate Bank Transfer'}
                  </Button>
                </form>

                {/* Target Account Preview */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>
                    Linked Bank: <strong>{profile?.bankDetails?.accountNumber ? `••••${profile.bankDetails.accountNumber.slice(-4)}` : 'HDFC Bank Primary (Demo)'}</strong> (IFSC: {profile?.bankDetails?.ifsc || 'HDFC0001234'})
                  </span>
                  <span>
                    Holder: <strong>{profile?.bankDetails?.accountHolder || user?.name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    Update Bank Details
                  </button>
                </div>
              </div>

              {/* Success Alert if simulated */}
              {withdrawSuccessRef && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-bold block">Demo Payout Request Processed!</span>
                      <span>UTR Reference: <strong className="font-mono">{withdrawSuccessRef}</strong>. In production, NEFT takes 15 minutes.</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setWithdrawSuccessRef(null)}
                    className="text-emerald-700 hover:bg-emerald-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 6. ASSISTANT PROFILE TAB ────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  Attendant Profile, Rates & Service Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your hourly rates, service areas, care categories, and banking credentials
                </p>
              </div>

              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-6 h-10 rounded-2xl shadow-md shadow-teal-600/20"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>

            {profileSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {/* Section 1: Pricing & Rates */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                1. Service Pricing & Packages
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Hourly Assistance Rate (₹ / hr) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <Input
                      type="number"
                      value={editPricePerHour}
                      onChange={(e) => setEditPricePerHour(Number(e.target.value))}
                      min={50}
                      max={2000}
                      required
                      className="pl-8 h-10 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Recommended: ₹150 - ₹300/hr for OPD & paperwork assistance
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Day Package (8-10 Hours) (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <Input
                      type="number"
                      value={editPricePerFullDay}
                      onChange={(e) => setEditPricePerFullDay(Number(e.target.value))}
                      min={300}
                      max={10000}
                      required
                      className="pl-8 h-10 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Discounted package rate for full day or surgery support
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Bio & Patient Pitch */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Professional Introduction & Bio
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  About You & Care Approach (Displayed to Patients) *
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={400}
                  required
                  placeholder="Tell patients about your hospital experience, familiarity with doctors and billing counters, and compassionate patient care..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 float-right mt-1">
                  {editBio.length} / 400 characters
                </span>
              </div>
            </div>

            {/* Section 3: Service Areas (City-based) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  3. Service Areas (Cities You Cover)
                </h4>
                <span className="text-xs font-semibold text-teal-600">
                  {editHospitals.length} {editHospitals.length === 1 ? 'City' : 'Cities'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Select the cities where you can provide service. You'll receive patient requests from any hospital or clinic in these areas.
              </p>

              {/* Selected area tags */}
              <div className="flex flex-wrap gap-2">
                {editHospitals.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <MapPin className="w-3 h-3 text-teal-600" />
                    {h}
                    <button
                      type="button"
                      onClick={() => setEditHospitals(editHospitals.filter((x) => x !== h))}
                      className="ml-1 text-teal-600 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Preset city/area suggestions */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">Quick Add Cities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SERVICE_AREAS.filter((p) => !editHospitals.includes(p)).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditHospitals([...editHospitals, p])}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom area input */}
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  placeholder="Add another city or area..."
                  value={customHospital}
                  onChange={(e) => setCustomHospital(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (customHospital.trim() && !editHospitals.includes(customHospital.trim())) {
                      setEditHospitals([...editHospitals, customHospital.trim()]);
                      setCustomHospital('');
                    }
                  }}
                  className="h-9 text-xs font-bold rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Section 4: Service Categories */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                4. Care Services & Capabilities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SERVICE_CATEGORIES.map((cat) => {
                  const isChecked = editCategories.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        if (isChecked) {
                          setEditCategories(editCategories.filter((c) => c !== cat.id));
                        } else {
                          setEditCategories([...editCategories, cat.id]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500 text-teal-900 dark:text-teal-200'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-xs font-bold">{cat.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Available Days */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                5. Weekly Availability Days
              </h4>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = editAvailableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setEditAvailableDays(editAvailableDays.filter((d) => d !== day));
                        } else {
                          setEditAvailableDays([...editAvailableDays, day]);
                        }
                      }}
                      className={`w-12 h-10 rounded-xl font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 6: Bank & Payout Details */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                6. Linked Bank Account & Payout Setup
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Holder Name
                  </label>
                  <Input
                    value={editBankDetails.accountHolder}
                    onChange={(e) =>
                      setEditBankDetails({ ...editBankDetails, accountHolder: e.target.value })
                    }
                    placeholder="e.g. Rahul Sharma"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank Account Number
                  </label>
                  <Input
                    value={editBankDetails.accountNumber}
                    onChange={(e) =>
                      setEditBankDetails({ ...editBankDetails, accountNumber: e.target.value })
                    }
                    placeholder="e.g. 50100234567890"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank IFSC Code
                  </label>
                  <Input
                    value={editBankDetails.ifsc}
                    onChange={(e) =>
                      setEditBankDetails({ ...editBankDetails, ifsc: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. HDFC0001234"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    UPI ID (VPA) for Instant Demo Payout
                  </label>
                  <Input
                    value={editBankDetails.upiId}
                    onChange={(e) =>
                      setEditBankDetails({ ...editBankDetails, upiId: e.target.value })
                    }
                    placeholder="e.g. 9876543210@paytm"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-8 h-11 rounded-2xl shadow-md shadow-teal-600/20"
              >
                {savingProfile ? 'Saving Preferences...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        )}

      {/* ── MODAL: COMPLETE SHIFT SUMMARY ─────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Assistance Handover
              </h3>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Please enter a brief summary of tasks accomplished (e.g. medicines handed over, OPD token submitted, discharge papers handed to attendant).
            </p>

            <textarea
              rows={4}
              value={completionSummary}
              onChange={(e) => setCompletionSummary(e.target.value)}
              placeholder="e.g. Accompanied patient to radiology on 2nd floor, collected all blood test reports, purchased prescribed medicines from chemist, and safely handed patient over to family member..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={completingShift}
                onClick={handleCompleteActiveShift}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 rounded-xl shadow-md"
              >
                {completingShift ? 'Finalizing...' : 'Confirm Shift Handover'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DECLINE REQUEST ────────────────────────────────────────── */}
      {declineTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Decline Shift Request
            </h3>

            <p className="text-xs text-slate-500">
              Please select a reason for declining. This request will be offered to other available attendants nearby.
            </p>

            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="Assistant unavailable at this schedule">Unavailable at this time slot</option>
              <option value="Hospital too far from current location">Hospital too far from my current location</option>
              <option value="Already occupied with another emergency">Already occupied with emergency care</option>
              <option value="Service requirement mismatch">Cannot perform specific requested service</option>
              <option value="Other personal reason">Other personal reason</option>
            </select>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeclineTargetId(null)}
                className="text-xs font-bold rounded-xl"
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={declining}
                onClick={confirmDecline}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 rounded-xl shadow-sm"
              >
                {declining ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORY BOOKING DETAIL ─────────────────────────────────── */}
      {historyDetailBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">
                  #{historyDetailBooking.bookingNumber || historyDetailBooking._id}
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                  Shift Summary & Task Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDetailBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="text-slate-400 block">Patient</span>
                  <strong className="text-slate-800 dark:text-slate-200">{historyDetailBooking.patientId?.name || 'Patient'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Hospital</span>
                  <strong className="text-slate-800 dark:text-slate-200">{historyDetailBooking.hospital}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Date</span>
                  <span>{new Date(historyDetailBooking.scheduledDate || historyDetailBooking.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Payout</span>
                  <strong className="text-emerald-600">₹{Math.round((historyDetailBooking.cost?.total || 0) * 0.9)}</strong>
                </div>
              </div>

              {historyDetailBooking.completionSummary && (
                <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60">
                  <span className="font-bold text-teal-800 dark:text-teal-300 block mb-0.5">Handover Summary:</span>
                  <p className="text-slate-600 dark:text-slate-400 italic">"{historyDetailBooking.completionSummary}"</p>
                </div>
              )}

              {/* Task Checklist breakdown */}
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Checklist Completed During Shift:</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(historyDetailBooking.taskChecklist || []).map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <span className="flex items-center gap-2">
                        {t.isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                        <span className={t.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>
                          {t.label}
                        </span>
                      </span>
                      {t.doneAt && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                size="sm"
                onClick={() => handleDownloadReceipt(historyDetailBooking._id, historyDetailBooking.bookingNumber)}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download PDF Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EMERGENCY SOS ─────────────────────────────────────────── */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-300 dark:border-rose-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-rose-600 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 animate-pulse" />
                Emergency Attendant Hotlines
              </h3>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              If a patient faces medical collapse, cardiac arrest, or security issues inside the hospital, alert campus emergency staff immediately:
            </p>

            <button
              type="button"
              onClick={async () => {
                try {
                  await api.createEmergency({ type: "assistant-sos", severity: "high", message: "Assistant raised SOS from dashboard" });
                  alert("Platform SOS raised — emergency team notified.");
                } catch (e) {
                  alert(e.message || "Failed to raise SOS");
                }
              }}
              className="w-full p-3 rounded-2xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
            >
              🚨 Raise Platform SOS (notify emergency team)
            </button>

            <div className="space-y-2.5 text-xs">
              <a
                href="tel:108"
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between hover:bg-rose-100 transition-colors"
              >
                <div>
                  <span className="font-bold text-rose-800 dark:text-rose-200 block">National Ambulance Emergency</span>
                  <span className="text-[11px] text-rose-600">Dial 108 (24x7 Free)</span>
                </div>
                <Phone className="w-4 h-4 text-rose-600" />
              </a>

              <a
                href="tel:112"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between hover:bg-slate-100"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Police & Campus Security</span>
                  <span className="text-[11px] text-slate-500">Dial 112 Unified Emergency</span>
                </div>
                <Phone className="w-4 h-4 text-teal-600" />
              </a>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">FindMedi Care Support Team</span>
                <span className="text-[11px] text-slate-500">care@findmedi.com • Hotline: +91 98765 43210</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowSosModal(false)}
              className="w-full text-xs font-bold bg-slate-900 text-white rounded-xl h-10 mt-2"
            >
              Close Alert
            </Button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN Incoming Request Call modal (120s / 2-minute timer with ringtone) */}
      {activeIncomingCall && (
        <ProviderIncomingCall
          key={activeIncomingCall._id}
          data={{
            requestId: activeIncomingCall._id,
            providerType: 'assistant',
            hospitalName: activeIncomingCall.hospital,
            category: activeIncomingCall.durationType || 'Shift Request',
            title: `Hospital Shift: ${activeIncomingCall.hospital}`,
            subtitle: `Patient requested hospital assistance (${activeIncomingCall.durationType?.toUpperCase()}). Review details and respond within 2 minutes.`,
            patient: {
              name: activeIncomingCall.patientId?.name || 'Verified Patient',
              phone: activeIncomingCall.patientId?.phone || activeIncomingCall.emergencyPhone || 'Via FindMedi App',
            },
            location: {
              address: activeIncomingCall.hospital,
            },
            amount: Math.round((activeIncomingCall.cost?.total || 600) * 0.9),
            windowSeconds: 120,
            scheduledTime: activeIncomingCall.scheduledDate
              ? `${new Date(activeIncomingCall.scheduledDate).toLocaleDateString()} at ${activeIncomingCall.startTime || 'Scheduled time'}`
              : undefined,
            specialInstructions: activeIncomingCall.specialInstructions,
            serviceBadges: activeIncomingCall.serviceCategories || ['Hospital Assistance'],
          }}
          onAccept={async (bookingId) => {
            await handleAcceptRequest(bookingId);
            setActiveIncomingCall(null);
          }}
          onReject={async (bookingId) => {
            setDeclineTargetId(bookingId);
            setActiveIncomingCall(null);
          }}
          onTimeout={(bookingId) => {
            setActiveIncomingCall(null);
            setIncomingRequests((prev) => prev.filter((r) => r._id !== bookingId));
          }}
        />
      )}
    </div>
  );
}
