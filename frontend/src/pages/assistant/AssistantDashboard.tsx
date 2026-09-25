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
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TaskChecklistView } from '@/components/assistant/TaskChecklistView';
import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel';
import { AssistantOverviewTab } from '@/components/assistant/AssistantOverviewTab';
import { AssistantRequestsTab } from '@/components/assistant/AssistantRequestsTab';
import { AssistantActiveShiftTab } from '@/components/assistant/AssistantActiveShiftTab';
import { AssistantHistoryTab } from '@/components/assistant/AssistantHistoryTab';
import { AssistantEarningsTab } from '@/components/assistant/AssistantEarningsTab';
import { AssistantProfileTab } from '@/components/assistant/AssistantProfileTab';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinAssistantBookingRoom } from '@/lib/socket';
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

// Platform commission is defined server-side (assistants.js: 10%). Frontend
// must never invent amounts — use backend net fields when present, else
// derive from gross with the same rate. No ||600 fallback.
const ASSISTANT_COMMISSION_RATE = 0.10;
const getAssistantNet = (booking: any): number => {
  if (!booking) return 0;
  if (typeof booking.assistantPayout === 'number') return Math.round(booking.assistantPayout);
  if (typeof booking.netPayout === 'number') return Math.round(booking.netPayout);
  if (typeof booking.netAmount === 'number') return Math.round(booking.netAmount);
  const gross = booking.cost?.total;
  if (typeof gross !== 'number' || Number.isNaN(gross)) return 0;
  return Math.round(gross * (1 - ASSISTANT_COMMISSION_RATE));
};
const getAssistantGross = (booking: any): number => {
  const gross = booking?.cost?.total;
  return typeof gross === 'number' && !Number.isNaN(gross) ? gross : 0;
};

export default function AssistantDashboard() {
  const { user } = useAuth() as { user: any };
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
  // Spec 07: vitals chart for the open booking detail.
  const [detailVitals, setDetailVitals] = useState<any[]>([]);

  useEffect(() => {
    const id = historyDetailBooking?._id;
    if (!id) {
      setDetailVitals([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/assistant-bookings/${id}/vitals`);
        if (!cancelled) setDetailVitals(res?.vitals || []);
      } catch {
        if (!cancelled) setDetailVitals([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyDetailBooking?._id]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    hospital: '',
    category: 'clinical_emergency',
    severity: 'Medium',
    description: '',
    patientUhId: '',
  });
  const [submittingIncident, setSubmittingIncident] = useState(false);
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
  // Section-10 settings master
  const [editEmergencyStandby, setEditEmergencyStandby] = useState(false);
  const [editRefundPolicy, setEditRefundPolicy] = useState('full_6h');
  const [editRateCard, setEditRateCard] = useState({ halfDay4h: 0, day8h: 0, night12h: 0, full24h: 0 });
  const [editClinicalTags, setEditClinicalTags] = useState<string[]>([]);
  const [clinicalTagInput, setClinicalTagInput] = useState('');
  const [editPreferredHospitals, setEditPreferredHospitals] = useState<string[]>([]);
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
        if (p.settings) {
          setEditEmergencyStandby(Boolean(p.settings.emergencyStandby));
          if (p.settings.refundPolicy) setEditRefundPolicy(p.settings.refundPolicy);
          if (p.settings.rateCard) setEditRateCard({ halfDay4h: 0, day8h: 0, night12h: 0, full24h: 0, ...p.settings.rateCard });
          if (Array.isArray(p.settings.clinicalTags)) setEditClinicalTags(p.settings.clinicalTags);
          if (Array.isArray(p.settings.preferredHospitals)) setEditPreferredHospitals(p.settings.preferredHospitals);
        }
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

    // Wave-based instant dispatch alert (H3 radius expand engine)
    const handleInstantAssistantAlert = (payload: any) => {
      const booking = {
        _id: payload.requestId || payload.bookingId,
        bookingNumber: payload.bookingNumber,
        hospital: payload.location?.address || payload.hospital || 'Hospital',
        durationType: payload.durationType || 'hourly',
        scheduledDate: payload.scheduledTime,
        serviceCategories: payload.serviceCategories || ['paperwork'],
        cost: { total: payload.amount || 0 },
        specialInstructions: payload.specialInstructions,
        windowSeconds: payload.windowSeconds || 30,
        isInstantWave: true,
      };
      setIncomingRequests((prev) => {
        if (prev.some((r) => String(r._id) === String(booking._id))) return prev;
        return [{ ...booking, _receivedAt: Date.now() }, ...prev];
      });
      setActiveIncomingCall(booking);
    };

    socket.on('new_booking_request', handleNewRequest);
    socket.on('assistant:alert', handleInstantAssistantAlert);
    socket.on('assistant_booking_updated', handleBookingUpdate);

    return () => {
      socket.off('new_booking_request', handleNewRequest);
      socket.off('assistant:alert', handleInstantAssistantAlert);
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
      toast.error(err.message || 'Failed to update availability status');
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
      toast.error(err.message || 'Could not accept this booking.');
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
      toast.error(err.message || 'Could not decline booking');
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
      toast.error(err.message || 'Failed to mark assistance completed.');
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
      toast.error(err.message || 'Failed to download PDF receipt.');
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
      toast.warning('Withdrawal amount exceeds available wallet balance.');
      return;
    }
    try {
      setWithdrawing(true);
      const res = await api.withdrawAssistantDemo(amt);
      setWithdrawSuccessRef(res.reference || `DEMO-PAY-${Date.now().toString().slice(-6)}`);
      setWithdrawAmount('');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
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
        settings: {
          emergencyStandby: editEmergencyStandby,
          refundPolicy: editRefundPolicy,
          rateCard: {
            halfDay4h: Number(editRateCard.halfDay4h) || 0,
            day8h: Number(editRateCard.day8h) || 0,
            night12h: Number(editRateCard.night12h) || 0,
            full24h: Number(editRateCard.full24h) || 0,
          },
          clinicalTags: editClinicalTags,
          preferredHospitals: (editPreferredHospitals.length > 0 ? editPreferredHospitals : editHospitals).slice(0, 5),
        },
      });
      setProfileSuccessMsg('Profile and preferences updated successfully!');
      fetchDashboardData(true);
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Profile update failed.');
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
      <div className="w-full space-y-6 pb-20 animate-pulse" aria-busy="true" aria-label="Loading Assistant Workspace">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-64 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="flex gap-2">
              <div className="h-9 w-28 rounded-xl bg-teal-100 dark:bg-teal-950" />
              <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
          <div className="h-16 w-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800" />
        <p className="text-center text-sm font-semibold text-slate-500">Loading Assistant Workspace...</p>
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

            {/* Report Incident button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIncidentForm({
                  hospital: activeBooking?.hospital || profile?.hospitalsCovered?.[0] || '',
                  category: 'clinical_emergency',
                  severity: 'Medium',
                  description: '',
                  patientUhId: activeBooking?.patientId?._id || '',
                });
                setShowIncidentModal(true);
              }}
              className="rounded-2xl h-10 px-3 text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Report Incident
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
          <AssistantOverviewTab
            user={user}
            profile={profile}
            earnings={earnings}
            history={history}
            incomingRequests={incomingRequests}
            activeBooking={activeBooking}
            elapsedDuration={elapsedDuration}
            setActiveTab={setActiveTab}
            navigate={navigate}
            getAssistantNet={getAssistantNet}
            serviceCategories={SERVICE_CATEGORIES}
          />
        )}

        {/* ── 2. SHIFT REQUESTS TAB ───────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <AssistantRequestsTab
            incomingRequests={incomingRequests}
            filteredRequests={filteredRequests}
            requestFilter={requestFilter}
            setRequestFilter={setRequestFilter}
            setActiveTab={setActiveTab}
            getAssistantGross={getAssistantGross}
            getAssistantNet={getAssistantNet}
            serviceCategories={SERVICE_CATEGORIES}
            setDeclineTargetId={setDeclineTargetId}
            handleAcceptRequest={handleAcceptRequest}
          />
        )}

        {/* ── 3. ACTIVE SHIFT TAB ─────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <AssistantActiveShiftTab
            activeBooking={activeBooking}
            user={user}
            elapsedDuration={elapsedDuration}
            incomingRequestsCount={incomingRequests.length}
            showChat={showChat}
            setShowChat={setShowChat}
            setShowCompleteModal={setShowCompleteModal}
            setActiveTab={setActiveTab}
            getAssistantNet={getAssistantNet}
            handleCheckIn={async () => {
              try {
                await api.checkInAssistantBooking(activeBooking._id);
                await fetchDashboardData(true);
              } catch (e: any) {
                toast.error(e.message || 'Check in failed');
              }
            }}
            handleToggleTask={async (taskId, isDone) => {
              try {
                await api.updateAssistantTask(activeBooking._id, taskId, isDone);
                await fetchDashboardData(true);
              } catch (e: any) {
                toast.error(e.message || 'Toggle task failed');
              }
            }}
            handleAddCustomTask={async (label, category) => {
              try {
                await api.addAssistantCustomTask(activeBooking._id, label, category);
                await fetchDashboardData(true);
              } catch (e: any) {
                toast.error(e.message || 'Add task failed');
              }
            }}
          />
        )}

        {/* ── 4. SHIFT HISTORY TAB ────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <AssistantHistoryTab
            history={history}
            filteredHistory={filteredHistory}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            historyStatusFilter={historyStatusFilter}
            setHistoryStatusFilter={setHistoryStatusFilter}
            profile={profile}
            setHistoryDetailBooking={setHistoryDetailBooking}
            downloadingPdfId={downloadingPdfId}
            handleDownloadReceipt={handleDownloadReceipt}
          />
        )}

        {/* ── 5. EARNINGS & PAYOUTS TAB ──────────────────────────────────── */}
        {activeTab === 'earnings' && (
          <AssistantEarningsTab
            earnings={earnings}
            profile={profile}
            user={user}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            withdrawing={withdrawing}
            withdrawSuccessRef={withdrawSuccessRef}
            setWithdrawSuccessRef={setWithdrawSuccessRef}
            handleWithdrawDemo={handleWithdrawDemo}
            setActiveTab={setActiveTab}
          />
        )}

        {/* ── 6. ASSISTANT PROFILE TAB ────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <AssistantProfileTab
            handleSaveProfile={handleSaveProfile}
            savingProfile={savingProfile}
            profileSuccessMsg={profileSuccessMsg}
            editBio={editBio}
            setEditBio={setEditBio}
            editPricePerHour={editPricePerHour}
            setEditPricePerHour={setEditPricePerHour}
            editPricePerFullDay={editPricePerFullDay}
            setEditPricePerFullDay={setEditPricePerFullDay}
            editHospitals={editHospitals}
            setEditHospitals={setEditHospitals}
            customHospital={customHospital}
            setCustomHospital={setCustomHospital}
            editCategories={editCategories}
            setEditCategories={setEditCategories}
            editAvailableDays={editAvailableDays}
            setEditAvailableDays={setEditAvailableDays}
            editBankDetails={editBankDetails}
            setEditBankDetails={setEditBankDetails}
            profile={profile}
            editEmergencyStandby={editEmergencyStandby}
            setEditEmergencyStandby={setEditEmergencyStandby}
            editRefundPolicy={editRefundPolicy}
            setEditRefundPolicy={setEditRefundPolicy}
            editRateCard={editRateCard}
            setEditRateCard={setEditRateCard}
            editClinicalTags={editClinicalTags}
            setEditClinicalTags={setEditClinicalTags}
            clinicalTagInput={clinicalTagInput}
            setClinicalTagInput={setClinicalTagInput}
            editPreferredHospitals={editPreferredHospitals}
          />
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

              {/* Vitals chart (logged bedside) */}
              {detailVitals.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Vitals Logged During Shift:</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detailVitals.map((v: any) => (
                      <div
                        key={v._id || `${v.vitalType}-${v.recordedAt}`}
                        className="p-2 rounded-xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-xs flex items-center justify-between"
                      >
                        <span className="font-bold text-rose-700 dark:text-rose-300 uppercase">
                          {String(v.vitalType).replace('_', ' ')}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-mono">
                          {v.values?.systolic ? `${v.values.systolic}/${v.values.diastolic ?? '-'} ` : ''}
                          {v.values?.pulse ? `♥ ${v.values.pulse} ` : ''}
                          {v.values?.spo2 ? `O₂ ${v.values.spo2}% ` : ''}
                          {v.values?.tempValue ? `${v.values.tempValue}°${v.values.tempUnit || 'F'} ` : ''}
                          {v.values?.sugarValue ? `Sugar ${v.values.sugarValue} ` : ''}
                          {v.values?.weightKg ? `${v.values.weightKg}kg` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {v.recordedAt ? new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  await api.createEmergency({
                    patientName: user?.name ? `Assistant (${user?.name})` : 'Hospital Assistant Attendant',
                    condition: 'Assistant raised Emergency SOS from bedside console',
                    severity: 'Critical',
                    phone: (user?.phone as string) || '9876543210'
                  });
                  toast.success("🚨 Platform SOS raised — campus emergency team notified.");
                  setShowSosModal(false);
                } catch (e: any) {
                  toast.error(e.message || "Failed to raise SOS");
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

      {/* ── MODAL: INCIDENT REPORT FORM ───────────────────────────────────── */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Hospital & Patient Incident Report
              </h3>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record safety, medical deterioration, bedside hazards, or patient conduct incidents. Reports are immediately logged for compliance and hospital QA review.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!incidentForm.description.trim()) {
                  toast.error('Please describe the incident details');
                  return;
                }
                try {
                  setSubmittingIncident(true);
                  await api.createSupportTicket({
                    subject: `[Incident Report] ${incidentForm.severity.toUpperCase()} - ${incidentForm.category} at ${incidentForm.hospital || 'Hospital'}`,
                    message: `Incident Type: ${incidentForm.category}\nSeverity: ${incidentForm.severity}\nHospital: ${incidentForm.hospital}\nPatient UHID / Ref: ${incidentForm.patientUhId || 'N/A'}\nReported by Assistant: ${user?.name || ''} (${user?.phone || ''})\n\nIncident Narrative:\n${incidentForm.description}`,
                    category: 'IncidentReport',
                    priority: incidentForm.severity === 'Critical' ? 'Urgent' : incidentForm.severity === 'High' ? 'High' : 'Normal',
                  });
                  toast.success('Incident logged successfully and sent to hospital safety desk');
                  setShowIncidentModal(false);
                  setIncidentForm({
                    hospital: '',
                    category: 'clinical_emergency',
                    severity: 'Medium',
                    description: '',
                    patientUhId: '',
                  });
                } catch (err: any) {
                  toast.error(err.message || 'Failed to submit incident report');
                } finally {
                  setSubmittingIncident(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hospital Campus
                  </label>
                  <input
                    type="text"
                    required
                    value={incidentForm.hospital}
                    onChange={(e) => setIncidentForm({ ...incidentForm, hospital: e.target.value })}
                    placeholder="e.g. Metro Hospital OPD"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Severity Level
                  </label>
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="Low">Low (Informational / Minor Delay)</option>
                    <option value="Medium">Medium (Protocol Non-compliance)</option>
                    <option value="High">High (Patient Safety Risk / Fall)</option>
                    <option value="Critical">Critical (Cardiac / Medical Collapse / Violence)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Incident Category
                </label>
                <select
                  value={incidentForm.category}
                  onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="clinical_emergency">Patient Clinical Deterioration / Fall</option>
                  <option value="medication_error">Medication Dispensing Issue</option>
                  <option value="security_behavior">Harassment / Security / Aggression</option>
                  <option value="equipment_hazard">Hospital Stretcher / Wheelchair Defect</option>
                  <option value="other_complaint">Other Operational Incident</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Patient UHID or Booking Reference (Optional)
                </label>
                <input
                  type="text"
                  value={incidentForm.patientUhId}
                  onChange={(e) => setIncidentForm({ ...incidentForm, patientUhId: e.target.value })}
                  placeholder="e.g. UHID-98234 or Booking Number"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Incident Description & Immediate Action Taken *
                </label>
                <textarea
                  rows={3}
                  required
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Detail what occurred, timestamp, witnesses, nursing station alerted, etc..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIncidentModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingIncident}
                  className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submittingIncident ? 'Submitting...' : 'Submit Official Report'}
                </Button>
              </div>
            </form>
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
            subtitle: `Patient requested hospital assistance (${activeIncomingCall.durationType?.toUpperCase()}).${activeIncomingCall.taskDescription ? ` Task: ${activeIncomingCall.taskDescription}` : ''} Review details and respond within 2 minutes.`,
            patient: {
              name: activeIncomingCall.patientId?.name || 'Verified Patient',
              phone: activeIncomingCall.patientId?.phone || activeIncomingCall.emergencyPhone || 'Via FindMedi App',
              knownAllergies: Array.isArray(activeIncomingCall.patientAllergies)
                ? activeIncomingCall.patientAllergies.join(', ')
                : undefined,
            },
            location: {
              address: activeIncomingCall.hospital,
            },
            amount: getAssistantNet(activeIncomingCall),
            windowSeconds: 120,
            scheduledTime: activeIncomingCall.scheduledDate
              ? `${new Date(activeIncomingCall.scheduledDate).toLocaleDateString()} at ${activeIncomingCall.startTime || 'Scheduled time'}`
              : undefined,
            specialInstructions: activeIncomingCall.specialInstructions,
            serviceBadges: activeIncomingCall.serviceCategories || ['Hospital Assistance'],
          }}
          onAccept={async (bookingId) => {
            // Wave-based bookings (assistant:alert) vote via instant dispatch;
            // traditional new_booking_request accepts use the assistant booking API.
            if (activeIncomingCall?.isInstantWave) {
              try {
                await api.post(`/instant/assistant/${bookingId}/accept`, {});
                toast.success('Vote cast — waiting for dispatch confirmation…');
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Could not accept booking');
              }
              setActiveIncomingCall(null);
              return;
            }
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
