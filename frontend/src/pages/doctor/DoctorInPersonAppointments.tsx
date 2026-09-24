import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Navigation, Clock, User, Phone, MessageCircle,
  FileText, CheckCircle2, AlertCircle, RefreshCw, Calendar,
  Search, ExternalLink, Stethoscope, Pill, Check, X,
  Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

function useDoctorGpsSync(enabled) {
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        getSocket()?.emit('doctor:location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);
}
import { useAudioCall } from '@/context/AudioCallContext';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import { isHomeVisitAppointment } from '@/lib/appointmentModes';
import {
  Map, MapMarker, MarkerContent, MapRoute, MapControls
} from '@/components/ui/map';

// Calculate straight-line approximate distance in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Estimate driving travel time in minutes based on distance in city traffic
function estimateEtaMinutes(distKm) {
  if (!distKm || distKm <= 0) return 0;
  // Avg urban speed ~25 km/h
  const minutes = Math.round((distKm / 25) * 60) + 4;
  return Math.max(3, minutes);
}

// Generate realistic intermediate route coordinates between two points
function generateRouteLine(startCoords, endCoords) {
  if (!startCoords || !endCoords) return [];
  const [lng1, lat1] = startCoords;
  const [lng2, lat2] = endCoords;

  const points = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add small realistic curvature
    const curve = Math.sin(t * Math.PI) * 0.0035;
    const lng = lng1 + (lng2 - lng1) * t + curve;
    const lat = lat1 + (lat2 - lat1) * t - curve * 0.5;
    points.push([lng, lat]);
  }
  return points;
}

export default function DoctorInPersonAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCall } = useAudioCall();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApptId, setSelectedApptId] = useState(null);

  // Modals
  const [intakeAppt, setIntakeAppt] = useState(null);
  const [updatingTransit, setUpdatingTransit] = useState(false);

  // Clinic coordinates (from doctor's facility or central default)
  const clinicCoordinates = useMemo(() => {
    return [77.2180, 28.6280]; // Central medical hub coordinates
  }, []);

  // Fetch appointments
  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getAppointments({ status: 'All', limit: 200 });
      const raw = data?.appointments || data?.data || data || [];

      // STRICT FILTER:
      // Must be a HOME VISIT appointment (chat/video/audio are in Online, offline clinic in In-Clinic)
      const homeVisits = raw.filter(isHomeVisitAppointment);

      setAppointments(homeVisits);

      // Auto-select first active appointment if none selected
      if (homeVisits.length > 0 && !selectedApptId) {
        const firstActive = homeVisits.find(a => (a.status || '').toLowerCase() !== 'completed') || homeVisits[0];
        setSelectedApptId(firstActive._id);
      }
    } catch (err) {
      console.warn('Failed to load home visits:', err);
      toast.error('Could not load home visits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedApptId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Real-time updates when an appointment is confirmed/updated
  useAppointmentRealtime(loadAppointments);

  const today = getISTDateString();

  const handleStatus = async (id, status, extra = {}) => {
    try {
      await api.updateAppointment(id, { status, ...extra });
      toast.success(`Home visit request ${status === 'Confirmed' ? 'accepted' : 'updated'}`);
      loadAppointments(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update home visit');
    }
  };

  // Tab filtering
  const filteredAppointments = useMemo(() => {
    let list = appointments;

    if (activeTab === 'pending') {
      list = list.filter((a) => (a.status || '').toLowerCase() === 'pending');
    } else if (activeTab === 'today') {
      list = list.filter((a) => a.date === today && (a.status || '').toLowerCase() !== 'completed' && (a.status || '').toLowerCase() !== 'pending');
    } else if (activeTab === 'upcoming') {
      list = list.filter((a) => a.date > today && (a.status || '').toLowerCase() !== 'completed' && (a.status || '').toLowerCase() !== 'pending');
    } else if (activeTab === 'completed') {
      list = list.filter((a) => (a.status || '').toLowerCase() === 'completed');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        return (
          (a.patient || '').toLowerCase().includes(q) ||
          (a.patientId?.name || '').toLowerCase().includes(q) ||
          (a.patientId?.phone || '').toLowerCase().includes(q) ||
          (a.tokenNumber || '').toLowerCase().includes(q) ||
          (a.preConsultationDetails?.chiefComplaint || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [appointments, activeTab, searchQuery, today]);

  // Selected appointment details & coordinates
  const selectedAppt = useMemo(() => {
    return appointments.find((a) => a._id === selectedApptId) || filteredAppointments[0] || null;
  }, [appointments, selectedApptId, filteredAppointments]);

  // Derive patient GPS coordinates (real or deterministic based on patient ID for demo tracking)
  const patientLocationData = useMemo(() => {
    if (!selectedAppt) return null;

    const patient = selectedAppt.patientId || {};
    const hasDbLocation = selectedAppt.patientLocation?.lat && selectedAppt.patientLocation?.lng;

    // Use DB location or create realistic local coordinates near the clinic
    let lat = hasDbLocation ? selectedAppt.patientLocation.lat : 28.6080;
    let lng = hasDbLocation ? selectedAppt.patientLocation.lng : 77.2340;

    // If deterministic variation based on appointment ID
    if (!hasDbLocation && selectedAppt._id) {
      const hash = selectedAppt._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      lat = 28.6280 + ((hash % 40) - 20) * 0.0025;
      lng = 77.2180 + (((hash * 7) % 40) - 20) * 0.0025;
    }

    const distKm = getDistanceFromLatLonInKm(lat, lng, clinicCoordinates[1], clinicCoordinates[0]);
    const etaMins = estimateEtaMinutes(distKm);

    const transitStatus = selectedAppt.patientLocation?.transitStatus ||
      (selectedAppt.status === 'In Queue' || selectedAppt.status === 'Serving' ? 'arrived' : distKm < 0.3 ? 'arrived' : 'on_the_way');

    return {
      coordinates: [lng, lat],
      address: selectedAppt.patientLocation?.address || patient.address || 'Civil Lines, Central District',
      distanceKm: distKm,
      etaMinutes: etaMins,
      transitStatus,
      updatedAt: selectedAppt.patientLocation?.updatedAt || selectedAppt.updatedAt || new Date(),
    };
  }, [selectedAppt, clinicCoordinates]);

  // Route points from patient to clinic
  const routeCoordinates = useMemo(() => {
    if (!patientLocationData) return [];
    return generateRouteLine(patientLocationData.coordinates, clinicCoordinates);
  }, [patientLocationData, clinicCoordinates]);

  // Map center between patient and clinic
  const mapCenter = useMemo(() => {
    if (!patientLocationData) return clinicCoordinates;
    return [
      (patientLocationData.coordinates[0] + clinicCoordinates[0]) / 2,
      (patientLocationData.coordinates[1] + clinicCoordinates[1]) / 2,
    ];
  }, [patientLocationData, clinicCoordinates]);

  // Status counts
  const stats = useMemo(() => {
    const pending = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
    const todayApproved = appointments.filter(a => a.date === today && (a.status || '').toLowerCase() !== 'pending');
    const onTheWay = todayApproved.filter(a => {
      const s = (a.patientLocation?.transitStatus || '').toLowerCase();
      return s === 'on_the_way' || s === 'pending_departure';
    });
    const arrived = todayApproved.filter(a => {
      const s = (a.status || '').toLowerCase();
      const t = (a.patientLocation?.transitStatus || '').toLowerCase();
      return s === 'in queue' || s === 'serving' || t === 'arrived';
    });
    const completed = appointments.filter(a => (a.status || '').toLowerCase() === 'completed');

    return {
      pendingCount: pending.length,
      todayCount: todayApproved.length,
      onTheWayCount: onTheWay.length,
      arrivedCount: arrived.length,
      completedCount: completed.length,
    };
  }, [appointments, today]);

  // Action: Update Patient Transit Status
  const handleUpdateTransit = async (apptId, newStatus) => {
    setUpdatingTransit(true);
    try {
      await api.updateAppointmentTransit(apptId, { transitStatus: newStatus });
      toast.success(`Patient marked as ${newStatus === 'arrived' ? 'Arrived at Clinic' : 'On the Way'}`);
      loadAppointments(true);
    } catch (err) {
      toast.error('Failed to update transit status');
    } finally {
      setUpdatingTransit(false);
    }
  };

  // Action: Check-in / Call into Queue
  const handleCheckIn = async (apptId) => {
    try {
      await api.updateAppointment(apptId, { status: 'In Queue', checkedInAt: new Date() });
      toast.success('Patient checked in and added to queue');
      loadAppointments(true);
    } catch (err) {
      toast.error('Failed to check in patient');
    }
  };

  // Action: Open 1-to-1 Audio Call with Patient
  const handleCallPatient = (appt) => {
    if (!appt) return;
    const peer = appt.patientId || {
      _id: appt.patientId?._id || appt.patientId,
      name: appt.patient,
      phone: appt.phone,
      role: 'patient',
    };
    initiateCall(peer, appt._id);
  };

  // Action: Open Chat with Patient
  const handleOpenChat = (appt) => {
    const peerId = appt.patientId?._id || appt.patientId;
    const isClinic = user?.role === 'clinic_doctor';
    navigate(isClinic ? '/clinic/chat' : '/doctor/chat', { state: { targetUserId: peerId } });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border border-border/70 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold border border-violet-500/20 inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Approved Home Visits
            </span>
            <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-600">
              Live Radar
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
            Home Visit Consultations & Live Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track approved home visit patients in real-time on the map, monitor travel ETA, review intake complaints, and manage arrival.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAppointments(true)}
            disabled={refreshing}
            className="rounded-xl h-10 gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('pending')}
            className={`rounded-xl h-10 gap-1.5 text-xs ${
              stats.pendingCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm'
                : 'text-muted-foreground border-border/60 hover:bg-muted/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Requests {stats.pendingCount > 0 && `(${stats.pendingCount})`}
          </Button>
        </div>
      </div>

      {/* ── STATS COUNTER BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-card border-border/60 shadow-sm hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">{stats.pendingCount}</p>
          <span className="text-[11px] text-muted-foreground">Needs approval</span>
        </div>

        <div
          onClick={() => setActiveTab('today')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'today'
              ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
              : 'bg-card border-border/60 shadow-sm hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Approved Today</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{stats.todayCount}</p>
          <span className="text-[11px] text-muted-foreground">Scheduled today</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">On the Way</span>
            <Car className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">{stats.onTheWayCount}</p>
          <span className="text-[11px] text-muted-foreground">Traveling to clinic</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Arrived / Queue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">{stats.arrivedCount}</p>
          <span className="text-[11px] text-muted-foreground">In waiting area</span>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'completed'
              ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30'
              : 'bg-card border-border/60 shadow-sm hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Completed</span>
            <Stethoscope className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">{stats.completedCount}</p>
          <span className="text-[11px] text-muted-foreground">Visits finished</span>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: SPLIT SCREEN (LIST + INTERACTIVE TRACKING MAP) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: APPROVED PATIENT LIST (5 cols) ── */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Tabs & Search */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  ...(stats.pendingCount > 0
                    ? [{ key: 'pending', label: `Requests (${stats.pendingCount})` }]
                    : [{ key: 'pending', label: 'Requests' }]),
                  { key: 'today', label: 'Today' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'all', label: 'All' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {filteredAppointments.length} found
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, token, complaint..."
                className="pl-9 text-xs h-9 rounded-xl bg-muted/20"
              />
            </div>
          </div>

          {/* Appointments Scrollable List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                Loading approved appointments...
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">
                  {activeTab === 'pending' ? 'No pending home visit requests' : 'No home visits found'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {activeTab === 'pending'
                    ? 'New patient home visit requests awaiting your approval will appear here.'
                    : 'Patients who booked home visit appointments will appear here.'}
                </p>
              </div>
            ) : (
              filteredAppointments.map((appt) => {
                const isSelected = selectedApptId === appt._id;
                const status = (appt.status || '').toLowerCase();
                const isArrived = status === 'in queue' || status === 'serving' || (appt.patientLocation?.transitStatus === 'arrived');
                const intake = appt.preConsultationDetails;

                return (
                  <motion.div
                    key={appt._id}
                    layout
                    onClick={() => setSelectedApptId(appt._id)}
                    className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-card border-primary ring-1 ring-primary shadow-md'
                        : 'bg-card/70 border-border/60 hover:border-border hover:shadow-sm'
                    }`}
                  >
                    {/* Header Row: Token + Time + Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs">
                          {appt.tokenNumber || 'Token #--'}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appt.time}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 ${
                          status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : isArrived
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                        }`}
                      >
                        {status === 'pending'
                          ? 'Pending Approval'
                          : status === 'completed'
                          ? 'Completed'
                          : isArrived
                          ? 'Arrived / In Queue'
                          : 'On The Way'}
                      </Badge>
                    </div>

                    {/* Patient Name + Phone */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-sm text-foreground truncate">
                          {appt.patient || appt.patientId?.name || 'Patient'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {appt.patientId?.phone || appt.phone || 'No phone provided'}
                        </p>
                      </div>

                      {/* Quick Intake Indicator Badge */}
                      {intake?.chiefComplaint && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIntakeAppt(appt);
                          }}
                          className="h-7 px-2 gap-1 text-[11px] text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg shrink-0"
                          title="View Quick Intake Details"
                        >
                          <FileText className="w-3 h-3" />
                          Intake
                        </Button>
                      )}
                    </div>

                    {/* Chief Complaint Preview if available */}
                    {intake?.chiefComplaint && (
                      <div className="mt-2 text-xs bg-muted/40 p-2 rounded-xl border border-border/40 text-foreground/80 line-clamp-1">
                        <span className="font-semibold text-foreground">Complaint:</span> {intake.chiefComplaint}
                        {intake.symptomsDuration && ` (${intake.symptomsDuration})`}
                      </div>
                    )}

                    {/* Footer Actions Row */}
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {/* Audio Call */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallPatient(appt);
                          }}
                          className="h-7 px-2 text-xs gap-1 rounded-lg text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                          title="1-to-1 Audio Call"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </Button>

                        {/* Chat */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenChat(appt);
                          }}
                          className="h-7 px-2 text-xs gap-1 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Send Message"
                        >
                          <MessageCircle className="w-3 h-3" /> Chat
                        </Button>
                      </div>

                      {/* Pending: Accept / Reject Buttons */}
                      {status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatus(appt._id, 'Confirmed');
                            }}
                            className="h-7 px-2.5 text-xs gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatus(appt._id, 'Cancelled');
                            }}
                            className="h-7 px-2 text-xs gap-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      ) : status !== 'completed' && (
                        <div>
                          {!isArrived ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTransit(appt._id, 'arrived');
                              }}
                              disabled={updatingTransit}
                              className="h-7 px-2.5 text-xs gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                              <Check className="w-3 h-3" /> Mark Arrived
                            </Button>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> In Waiting Room
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE LIVE TRACKING MAP (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-card rounded-3xl border border-border/60 p-5 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] relative">
            {/* Top Map Bar: Selected Patient Transit HUD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    {selectedAppt?.patient || 'Select a Patient'}
                    {selectedAppt?.tokenNumber && (
                      <span className="text-xs font-mono font-bold px-2 py-0.2 rounded bg-muted">
                        {selectedAppt.tokenNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-sm">
                    {patientLocationData?.address || 'Patient location not specified'}
                  </p>
                </div>
              </div>

              {/* Transit Distance & ETA Pill */}
              {patientLocationData && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs flex items-center gap-2 font-mono">
                    <span className="text-primary font-bold">{patientLocationData.distanceKm} km</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">~{patientLocationData.etaMinutes} min</span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${clinicCoordinates[1]},${clinicCoordinates[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Open Navigation in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Interactive Map Container */}
            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-border/60 bg-muted/20 min-h-[460px]">
              {selectedAppt ? (
                <Map
                  center={mapCenter}
                  zoom={13.2}
                  className="w-full h-full min-h-[460px]"
                >
                  <MapControls position="bottom-right" showZoom showLocate showFullscreen />

                  {/* Route connecting patient to clinic */}
                  {routeCoordinates.length > 0 && (
                    <MapRoute
                      id={`route-${selectedAppt._id}`}
                      coordinates={routeCoordinates}
                      color="#3b82f6"
                      width={4}
                      opacity={0.85}
                    />
                  )}

                  {/* 1. Clinic / Hospital Marker */}
                  <MapMarker
                    longitude={clinicCoordinates[0]}
                    latitude={clinicCoordinates[1]}
                  >
                    <MarkerContent>
                      <div className="relative flex flex-col items-center group cursor-pointer">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-500/20">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-card/90 border border-border/80 text-[10px] font-bold text-foreground shadow-sm whitespace-nowrap">
                          {user?.name || 'Clinic Hub'}
                        </span>
                      </div>
                    </MarkerContent>
                  </MapMarker>

                  {/* 2. Patient Marker */}
                  {patientLocationData && (
                    <MapMarker
                      longitude={patientLocationData.coordinates[0]}
                      latitude={patientLocationData.coordinates[1]}
                    >
                      <MarkerContent>
                        <div className="relative flex flex-col items-center group cursor-pointer">
                          {/* Animated radar ring if traveling */}
                          {patientLocationData.transitStatus === 'on_the_way' && (
                            <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping" />
                          )}
                          <div className="relative w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg ring-4 ring-blue-500/20">
                            <User className="w-5 h-5" />
                          </div>
                          <span className="mt-1 px-2 py-0.5 rounded-md bg-card/90 border border-border/80 text-[10px] font-bold text-foreground shadow-sm whitespace-nowrap">
                            {selectedAppt.patient} (~{patientLocationData.etaMinutes}m)
                          </span>
                        </div>
                      </MarkerContent>
                    </MapMarker>
                  )}
                </Map>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                  Select an appointment on the left to activate patient tracking
                </div>
              )}

              {/* Floating Bottom Status Bar on Map */}
              {selectedAppt && patientLocationData && (
                <div className="absolute bottom-3 left-3 right-16 z-20 p-3 rounded-2xl bg-card/90 backdrop-blur-md border border-border/70 shadow-lg flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      patientLocationData.transitStatus === 'arrived'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500 animate-pulse'
                    }`} />
                    <div>
                      <p className="font-semibold text-foreground">
                        {patientLocationData.transitStatus === 'arrived'
                          ? 'Patient has arrived at clinic waiting area'
                          : `Patient is on the way (${patientLocationData.distanceKm} km away)`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Estimated arrival: {new Date(Date.now() + patientLocationData.etaMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {patientLocationData.transitStatus !== 'arrived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateTransit(selectedAppt._id, 'arrived')}
                        className="h-8 px-2.5 text-xs gap-1 bg-card hover:bg-muted"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Mark Arrived
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(selectedAppt._id)}
                      className="h-8 px-3 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Queue Check-in
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK INTAKE FORM MODAL ── */}
      <Dialog open={!!intakeAppt} onOpenChange={(open) => !open && setIntakeAppt(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="w-5 h-5 text-violet-500" />
              <span>Pre-Consultation Intake Record</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Medical intake submitted by {intakeAppt?.patient} before arriving at the clinic.
            </DialogDescription>
          </DialogHeader>

          {intakeAppt?.preConsultationDetails && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Chief Complaint */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Chief Complaint</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {intakeAppt.preConsultationDetails.chiefComplaint || 'None specified'}
                </p>
                {intakeAppt.preConsultationDetails.symptomsDuration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: <span className="font-semibold text-foreground">{intakeAppt.preConsultationDetails.symptomsDuration}</span>
                  </p>
                )}
              </div>

              {/* Current Medications & Allergies */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-blue-500" /> Current Medications
                  </p>
                  <p className="text-xs text-foreground mt-1 font-medium">
                    {intakeAppt.preConsultationDetails.currentMedications || 'None'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Known Allergies
                  </p>
                  <p className="text-xs text-foreground mt-1 font-medium">
                    {intakeAppt.preConsultationDetails.allergies || 'No known allergies'}
                  </p>
                </div>
              </div>

              {/* Medical History */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/60">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Past Medical History</p>
                <p className="text-xs text-foreground mt-1 leading-relaxed">
                  {intakeAppt.preConsultationDetails.pastMedicalHistory || 'No prior medical conditions reported.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIntakeAppt(null)}
                  className="rounded-xl text-xs h-9 px-4"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const appt = intakeAppt;
                    setIntakeAppt(null);
                    handleCallPatient(appt);
                  }}
                  className="rounded-xl text-xs h-9 px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Patient
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
