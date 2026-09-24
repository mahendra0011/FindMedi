import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Clock, User, Phone, MessageCircle,
  FileText, CheckCircle2, AlertCircle, RefreshCw, Calendar,
  Search, ExternalLink, Stethoscope, Pill, Check,
  Car, Hospital, Building2, Compass, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAudioCall } from '@/context/AudioCallContext';
import { api } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import {
  Map, MapMarker, MarkerContent, MapRoute, MapControls
} from '@/components/ui/map';

// Helper to test if an appointment is Home Visit (offline/home_visit)
function isInPersonAppointment(appt) {
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  const intakeMode = (appt.preConsultationDetails?.appointmentMode || appt.preConsultationDetails?.mode || '').toLowerCase();

  if (mode === 'offline' || mode === 'in_person' || mode === 'in-person' || mode === 'home_visit' || mode === 'home' || intakeMode === 'in_person' || intakeMode === 'offline' || intakeMode === 'home_visit' || intakeMode === 'home') {
    return true;
  }

  const isOnline = mode === 'chat' || mode === 'video' || mode === 'voice' || mode === 'audio' ||
    type.includes('chat') || type.includes('video') || type.includes('voice') || type.includes('audio');

  return !isOnline;
}

// Distance formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function estimateEtaMinutes(distKm) {
  if (!distKm || distKm <= 0) return 0;
  const minutes = Math.round((distKm / 25) * 60) + 4;
  return Math.max(3, minutes);
}

function generateRouteLine(startCoords, endCoords) {
  if (!startCoords || !endCoords) return [];
  const [lng1, lat1] = startCoords;
  const [lng2, lat2] = endCoords;

  const points = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * 0.0035;
    const lng = lng1 + (lng2 - lng1) * t + curve;
    const lat = lat1 + (lat2 - lat1) * t - curve * 0.5;
    points.push([lng, lat]);
  }
  return points;
}

export default function PatientInPersonVisits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCall } = useAudioCall();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'pending' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApptId, setSelectedApptId] = useState(null);
  const [updatingTransit, setUpdatingTransit] = useState(false);
  const [intakeAppt, setIntakeAppt] = useState(null);

  // User's live GPS coordinates (browser or fallback)
  const [userLocation, setUserLocation] = useState([77.2090, 28.6139]); // Default Central Delhi
  const [geoLocating, setGeoLocating] = useState(false);

  // Get user browser location
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGeoLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.longitude, pos.coords.latitude]);
          setGeoLocating(false);
        },
        (err) => {
          console.warn('Geolocation not allowed or failed:', err.message);
          setGeoLocating(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getAppointments({ limit: 100 });
      const raw = data?.appointments || data?.data || data || [];

      // Filter home visit appointments for this patient
      const inPerson = raw.filter(isInPersonAppointment);
      setAppointments(inPerson);

      if (inPerson.length > 0 && !selectedApptId) {
        const firstActive = inPerson.find(a => (a.status || '').toLowerCase() !== 'completed') || inPerson[0];
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

  useAppointmentRealtime(loadAppointments);

  const today = getISTDateString();

  // Tab filtering
  const filteredAppointments = useMemo(() => {
    let list = appointments;

    if (activeTab === 'today') {
      list = list.filter((a) => {
        const s = (a.status || '').toLowerCase();
        return a.date === today && s !== 'completed' && s !== 'cancelled';
      });
    } else if (activeTab === 'upcoming') {
      list = list.filter((a) => {
        const s = (a.status || '').toLowerCase();
        return a.date > today && s !== 'completed' && s !== 'cancelled';
      });
    } else if (activeTab === 'pending') {
      list = list.filter((a) => (a.status || '').toLowerCase() === 'pending');
    } else if (activeTab === 'completed') {
      list = list.filter((a) => {
        const s = (a.status || '').toLowerCase();
        return s === 'completed' || s === 'cancelled';
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        return (
          (a.doctor || '').toLowerCase().includes(q) ||
          (a.doctorName || '').toLowerCase().includes(q) ||
          (a.department || '').toLowerCase().includes(q) ||
          (a.tokenNumber || '').toLowerCase().includes(q) ||
          (a.hospitalId?.name || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [appointments, activeTab, searchQuery, today]);

  const selectedAppt = useMemo(() => {
    return appointments.find((a) => a._id === selectedApptId) || filteredAppointments[0] || null;
  }, [appointments, selectedApptId, filteredAppointments]);

  // Derive Clinic Coordinates
  const clinicCoordinates = useMemo(() => {
    if (!selectedAppt) return [77.2180, 28.6280];
    const hospLoc = selectedAppt.hospitalId?.location?.coordinates;
    if (Array.isArray(hospLoc) && hospLoc.length === 2 && hospLoc[0] && hospLoc[1]) {
      return [hospLoc[0], hospLoc[1]];
    }
    return [77.2180, 28.6280];
  }, [selectedAppt]);

  // Distance & ETA calculation from patient's current location to clinic
  const transitMetrics = useMemo(() => {
    if (!selectedAppt) return { distanceKm: 0, etaMinutes: 0 };
    const distKm = getDistanceFromLatLonInKm(
      userLocation[1], userLocation[0],
      clinicCoordinates[1], clinicCoordinates[0]
    );
    const eta = estimateEtaMinutes(distKm);
    return { distanceKm: distKm, etaMinutes: eta };
  }, [selectedAppt, userLocation, clinicCoordinates]);

  // Route points
  const routeCoordinates = useMemo(() => {
    if (!selectedAppt) return [];
    return generateRouteLine(userLocation, clinicCoordinates);
  }, [selectedAppt, userLocation, clinicCoordinates]);

  const mapCenter = useMemo(() => {
    return [
      (userLocation[0] + clinicCoordinates[0]) / 2,
      (userLocation[1] + clinicCoordinates[1]) / 2,
    ];
  }, [userLocation, clinicCoordinates]);

  // Patient Transit Action: update "on_the_way" or "arrived"
  const handleTransitUpdate = async (apptId, newStatus) => {
    setUpdatingTransit(true);
    try {
      await api.updateAppointmentTransit(apptId, {
        transitStatus: newStatus,
        lat: userLocation[1],
        lng: userLocation[0],
        distanceKm: transitMetrics.distanceKm,
        etaMinutes: transitMetrics.etaMinutes,
      });
      toast.success(
        newStatus === 'on_the_way'
          ? 'Live status updated: Doctor notified that you are On The Way!'
          : 'Status updated: Marked as Arrived at Clinic Waiting Room!'
      );
      loadAppointments(true);
    } catch (err) {
      console.error('Failed to update transit status:', err);
      toast.error('Failed to update transit status');
    } finally {
      setUpdatingTransit(false);
    }
  };

  // Google Maps navigation link
  const googleMapsDirectionsUrl = useMemo(() => {
    const [destLng, destLat] = clinicCoordinates;
    const [origLng, origLat] = userLocation;
    return `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }, [clinicCoordinates, userLocation]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold mb-2">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              Doctor Home Visits
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">
              My Home Visits & Live Route Tracking
            </h1>
            <p className="text-white/80 text-sm mt-1 max-w-xl leading-relaxed">
              Track your approved doctor home visits in real-time, view live route directions, ETA, and share your arrival status with your doctor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAppointments(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 rounded-xl gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/patient/doctors')}
              className="bg-white text-violet-700 hover:bg-white/90 h-9 rounded-xl font-semibold gap-1.5 shadow-sm"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Book New Visit
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/find-vehicle?emergency=true')}
              className="bg-rose-600 hover:bg-rose-700 text-white h-9 rounded-xl font-bold gap-1.5"
            >
              SOS Panic
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-muted/60 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Today's Visits ({appointments.filter(a => a.date === today && a.status !== 'Completed' && a.status !== 'Cancelled').length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap relative ${
              activeTab === 'pending'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Approval
            {appointments.filter(a => (a.status || '').toLowerCase() === 'pending').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {appointments.filter(a => (a.status || '').toLowerCase() === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Past History
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search doctor or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-card text-xs"
          />
        </div>
      </div>

      {/* Main Grid: Visits List (Left) + Live Route Tracking Map & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Home Visit Appointments List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl bg-card border border-border/60 animate-pulse h-28" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-10 rounded-2xl bg-card border border-border/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-base text-foreground">
                No Home Visits Found
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {activeTab === 'pending'
                  ? 'You have no appointments waiting for doctor approval.'
                  : activeTab === 'today'
                  ? 'No home visit appointments scheduled for today.'
                  : 'Book a home visit appointment with a doctor to track your live visit.'}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/doctors')}
                className="mt-2 rounded-xl text-xs gap-1.5"
              >
                <Stethoscope className="w-3.5 h-3.5" /> Book Home Visit Appointment
              </Button>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const isSelected = selectedAppt?._id === appt._id;
              const isPending = (appt.status || '').toLowerCase() === 'pending';
              const isConfirmed = (appt.status || '').toLowerCase() === 'confirmed';
              const isInQueue = (appt.status || '').toLowerCase() === 'in queue';
              const isServing = (appt.status || '').toLowerCase() === 'serving';
              const isCompleted = (appt.status || '').toLowerCase() === 'completed';

              const transitStatus = appt.patientLocation?.transitStatus;

              return (
                <motion.div
                  key={appt._id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedApptId(appt._id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-card ${
                    isSelected
                      ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-md'
                      : 'border-border/60 hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {appt.tokenNumber ? `#${appt.tokenNumber}` : 'OPD'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-sm text-foreground truncate">
                          Dr. {appt.doctor || appt.doctorName}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {appt.department || 'General Physician'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting Approval
                        </span>
                      ) : isServing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                          Now Serving
                        </span>
                      ) : isInQueue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                          In Queue
                        </span>
                      ) : isConfirmed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Confirmed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          {appt.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Facility / Clinic Name */}
                  <div className="flex items-center gap-1.5 text-xs text-foreground/80 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="truncate font-medium">
                      {appt.hospitalId?.name || appt.facilityId?.name || 'FindMedi Health Clinic'}
                    </span>
                  </div>

                  {/* Schedule Details & Transit Tag */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {formatDisplayDate(appt.date)} · {appt.time}
                    </span>

                    {transitStatus === 'arrived' ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> At Waiting Room
                      </span>
                    ) : transitStatus === 'on_the_way' ? (
                      <span className="text-violet-600 font-medium flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 animate-bounce" /> On The Way
                      </span>
                    ) : isPending ? (
                      <span className="text-amber-600 text-[11px]">
                        Pending Clinic Acceptance
                      </span>
                    ) : (
                      <span className="text-violet-600 text-[11px] font-medium">
                        Live Tracking Ready
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Column: Live Map & Interactive Travel Console */}
        <div className="lg:col-span-7 space-y-4">
          {selectedAppt ? (
            <div className="bg-card rounded-3xl border border-border/60 p-5 shadow-sm space-y-5">
              {/* Doctor / Facility Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedAppt.tokenNumber || 'DR'}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                      Dr. {selectedAppt.doctor || selectedAppt.doctorName}
                      <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">
                        Home Visit
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Hospital className="w-3.5 h-3.5 text-violet-500" />
                      {selectedAppt.hospitalId?.name || selectedAppt.facilityId?.name || 'FindMedi Clinic Center'}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => initiateCall(selectedAppt.doctorId?._id || selectedAppt.doctorId, {
                      name: `Dr. ${selectedAppt.doctor || selectedAppt.doctorName}`,
                      specialization: selectedAppt.department
                    })}
                    className="h-8 rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/patient/chat')}
                    className="h-8 rounded-xl text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Button>
                  {selectedAppt.preConsultationDetails && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIntakeAppt(selectedAppt)}
                      className="h-8 rounded-xl text-xs gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Intake
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Notice if Pending */}
              {(selectedAppt.status || '').toLowerCase() === 'pending' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Appointment is awaiting doctor/clinic approval</p>
                    <p className="opacity-90 mt-0.5">
                      Your home visit request is currently in the doctor's <strong>Approve Appointments</strong> queue. Once accepted, your queue token and live tracking will activate.
                    </p>
                  </div>
                </div>
              )}

              {/* Travel Metrics Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Distance</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {transitMetrics.distanceKm} km
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center">
                  <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wide">Driving ETA</p>
                  <p className="text-base font-bold text-violet-700 dark:text-violet-300 mt-0.5">
                    ~{transitMetrics.etaMinutes} mins
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Slot Time</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {selectedAppt.time}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Token</p>
                  <p className="text-base font-bold text-primary mt-0.5">
                    {selectedAppt.tokenNumber ? `#${selectedAppt.tokenNumber}` : 'Assigned on arrival'}
                  </p>
                </div>
              </div>

              {/* Interactive Live Tracking Map */}
              <div className="relative rounded-2xl overflow-hidden border border-border/70 shadow-inner h-[320px] bg-muted/30">
                <Map
                  center={mapCenter}
                  zoom={12}
                  className="w-full h-full"
                >
                  <MapControls position="top-right" />

                  {/* Route Line between Patient and Clinic */}
                  {routeCoordinates.length > 0 && (
                    <MapRoute
                      coordinates={routeCoordinates}
                      color="#8b5cf6"
                      width={4}
                      opacity={0.85}
                    />
                  )}

                  {/* Patient Pin (Current Location) */}
                  <MapMarker coordinates={userLocation}>
                    <MarkerContent>
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-8 h-8 rounded-full bg-violet-500/30 animate-ping" />
                        <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </MarkerContent>
                  </MapMarker>

                  {/* Clinic Pin */}
                  <MapMarker coordinates={clinicCoordinates}>
                    <MarkerContent>
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                          <Hospital className="w-4 h-4" />
                        </div>
                      </div>
                    </MarkerContent>
                  </MapMarker>
                </Map>

                {/* Floating Map Overlay Label */}
                <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/60 shadow-md text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">Live Route Active</span>
                  <span className="text-muted-foreground">· GPS Synced</span>
                </div>
              </div>

              {/* Patient Transit Update Actions (Mark "On The Way" / "Arrived") */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200/50 dark:border-violet-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-violet-600" />
                      Live Travel Status & Check-In
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tap below when you leave your home or reach the clinic reception.
                    </p>
                  </div>

                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-500/10 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Open Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Button
                    onClick={() => handleTransitUpdate(selectedAppt._id, 'on_the_way')}
                    disabled={updatingTransit || selectedAppt.patientLocation?.transitStatus === 'on_the_way'}
                    variant={selectedAppt.patientLocation?.transitStatus === 'on_the_way' ? 'default' : 'outline'}
                    className={`rounded-xl h-10 text-xs font-semibold gap-1.5 ${
                      selectedAppt.patientLocation?.transitStatus === 'on_the_way'
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'border-violet-300 text-violet-700 dark:text-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    {selectedAppt.patientLocation?.transitStatus === 'on_the_way'
                      ? '✓ Marked: On The Way'
                      : "I'm On The Way"}
                  </Button>

                  <Button
                    onClick={() => handleTransitUpdate(selectedAppt._id, 'arrived')}
                    disabled={updatingTransit || selectedAppt.patientLocation?.transitStatus === 'arrived'}
                    variant={selectedAppt.patientLocation?.transitStatus === 'arrived' ? 'default' : 'outline'}
                    className={`rounded-xl h-10 text-xs font-semibold gap-1.5 ${
                      selectedAppt.patientLocation?.transitStatus === 'arrived'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedAppt.patientLocation?.transitStatus === 'arrived'
                      ? '✓ Checked-In: At Waiting Room'
                      : 'I Have Arrived at Clinic'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-card border border-border/60 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Select a home visit on the left to track route and status</p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Consultation Intake Modal */}
      <Dialog open={!!intakeAppt} onOpenChange={() => setIntakeAppt(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-600" />
              Clinical Intake Summary
            </DialogTitle>
            <DialogDescription>
              Details provided during your home visit booking
            </DialogDescription>
          </DialogHeader>

          {intakeAppt?.preConsultationDetails && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border">
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">Chief Complaint</p>
                <p className="font-medium text-sm text-foreground mt-0.5">
                  {intakeAppt.preConsultationDetails.chiefComplaint || 'None specified'}
                </p>
                {intakeAppt.preConsultationDetails.symptomsDuration && (
                  <p className="text-muted-foreground mt-1">
                    Duration: <span className="font-semibold text-foreground">{intakeAppt.preConsultationDetails.symptomsDuration}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">Medications</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {intakeAppt.preConsultationDetails.currentMedications || 'None'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">Allergies</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {intakeAppt.preConsultationDetails.allergies || 'No known allergies'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border">
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">Past Medical History</p>
                <p className="font-medium text-foreground mt-0.5">
                  {intakeAppt.preConsultationDetails.pastMedicalHistory || 'No prior medical conditions reported.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
