import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Zap,
  Filter,
  Search,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ServiceCategorySelector } from '../components/assistant/ServiceCategorySelector';
import { AssistantCard } from '../components/assistant/AssistantCard';
import { AssistantProfileModal } from '../components/assistant/AssistantProfileModal';
import { BookingConfirmModal } from '../components/assistant/BookingConfirmModal';
import { BookingStatusPanel } from '../components/assistant/BookingStatusPanel';
import { api } from '../lib/api';
import { useAuth } from '@/context/AuthContext';
import { joinAssistantBookingRoom } from '../lib/socket';

const SHIFT_OPTIONS = [
  { id: '2hr', name: '2 Hours Quick Assist', hours: 2 },
  { id: '4hr', name: '4 Hours (Half Day)', hours: 4 },
  { id: 'full_day', name: 'Full Day (8 Hours)', hours: 8 },
  { id: 'overnight', name: 'Overnight Care (12 Hours)', hours: 12 },
];

export default function BookAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');

  // Active booking tracking state
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // Form State
  const [hospital, setHospital] = useState('');
  const [hospitalOptions, setHospitalOptions] = useState<string[]>([
    'Apollo Hospital',
    'Fortis Healthcare',
    'Max Super Speciality Hospital',
    'AIIMS Hospital',
    'City Civil Hospital',
    'Medanta Medicity',
    'Ruby Hall Clinic',
  ]);
  const [serviceCategories, setServiceCategories] = useState<string[]>(['paperwork']);
  const [isUrgent, setIsUrgent] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationType, setDurationType] = useState('4hr');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Browse & Search State
  const [step, setStep] = useState<'form' | 'results'>('form');
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'experience'>('rating');

  // Modals
  const [selectedAssistant, setSelectedAssistant] = useState<any>(null);
  const [profileModalAssistant, setProfileModalAssistant] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Load existing active booking or specific bookingId on mount
  const fetchActiveBooking = async () => {
    try {
      if (requestedBookingId) {
        const res = await api.getAssistantBooking(requestedBookingId);
        if (res?.booking) {
          setActiveBooking(res.booking);
          return;
        }
      }
      const res = await api.getActiveAssistantBooking();
      if (res?.activeBooking) {
        setActiveBooking(res.activeBooking);
      } else {
        setActiveBooking(null);
      }
    } catch (e) {
      // not logged in or no active booking
      setActiveBooking(null);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    fetchActiveBooking();

    // Fetch hospital suggestions if API exists
    api.getHospitals?.()
      .then((res: any) => {
        const list = (res?.hospitals || []).map((h: any) => h.name || h);
        if (list.length > 0) setHospitalOptions(list);
      })
      .catch(() => {});
  }, [requestedBookingId]);

  // Socket room joining for realtime updates
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinAssistantBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  const handleSearchAssistants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital.trim()) {
      alert('Please select or enter the hospital where assistance is needed.');
      return;
    }
    if (serviceCategories.length === 0) {
      alert('Please choose at least one assistance category.');
      return;
    }

    try {
      setLoadingSearch(true);
      const res = await api.searchAssistants({
        hospital: hospital.trim(),
        serviceCategories,
        isUrgent,
        scheduledDate: isUrgent ? undefined : scheduledDate,
        startTime: isUrgent ? undefined : startTime,
      });

      setAssistants(res.assistants || []);
      setStep('results');
    } catch (err: any) {
      alert(err.message || 'Failed to search assistants');
    } finally {
      setLoadingSearch(false);
    }
  };

  const getHours = () => {
    const opt = SHIFT_OPTIONS.find((s) => s.id === durationType);
    return opt ? opt.hours : 4;
  };

  const handleOpenConfirm = (assistant?: any) => {
    if (!user) {
      navigate('/login?redirect=/book-assistant');
      return;
    }
    setSelectedAssistant(assistant || null);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    try {
      setBookingLoading(true);
      const res = await api.bookAssistant({
        assistantId: selectedAssistant?.userId?._id || selectedAssistant?._id,
        hospital: hospital.trim(),
        serviceCategories,
        isUrgent,
        scheduledDate: isUrgent ? undefined : scheduledDate,
        startTime: isUrgent ? undefined : startTime,
        durationType,
        specialInstructions,
      });

      setShowConfirmModal(false);
      if (res?.booking) {
        setActiveBooking(res.booking);
      }
    } catch (err: any) {
      alert(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const sortedAssistants = [...assistants].sort((a, b) => {
    if (sortBy === 'price') return (a.pricePerHour || 0) - (b.pricePerHour || 0);
    if (sortBy === 'experience') return (b.experienceYears || 0) - (a.experienceYears || 0);
    return (b.rating?.avg || 5.0) - (a.rating?.avg || 5.0);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Title */}
        <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Hospital Attendants & Caretakers
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Book a Personal Hospital Assistant
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Dedicated on-site help for paperwork, medicines, lab reports, and solo patient care.
            </p>
          </div>

          {user && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/patient/assistants')}
              className="text-xs self-center sm:self-auto rounded-xl"
            >
              My Assistant Bookings
            </Button>
          )}
        </div>

        {/* ── ACTIVE / IN-PROGRESS BOOKING PANEL ──────────────────── */}
        {loadingActive ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading booking status...</div>
        ) : activeBooking ? (
          <div className="space-y-6">
            <BookingStatusPanel
              booking={activeBooking}
              currentUser={user}
              onRefresh={fetchActiveBooking}
              onNewBooking={() => {
                setActiveBooking(null);
                setStep('form');
              }}
            />
          </div>
        ) : (
          <div>
            {/* ── STEP 1: BOOKING DETAILS FORM ─────────────────────── */}
            {step === 'form' && (
              <form
                onSubmit={handleSearchAssistants}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-7"
              >
                {/* Hospital Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    1. Select Hospital / Medical Campus *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-teal-600" />
                    <input
                      type="text"
                      list="hospitals-list"
                      placeholder="Search or enter hospital name (e.g. Apollo Hospital, AIIMS, City Civil)"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <datalist id="hospitals-list">
                      {hospitalOptions.map((h) => (
                        <option key={h} value={h} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Service Categories */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Service Categories Needed *
                  </label>
                  <ServiceCategorySelector
                    selected={serviceCategories}
                    onChange={setServiceCategories}
                  />
                </div>

                {/* Urgent Toggle Card */}
                <div
                  onClick={() => setIsUrgent(!isUrgent)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                    isUrgent
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isUrgent ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Need Assistant Urgently (Within 1 Hour)
                        <Badge className="bg-amber-500 text-white text-[10px]">FAST TRACK</Badge>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Broadcasts your request directly to all attendants currently available at or near the hospital.
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={() => {}}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                  />
                </div>

                {/* Date, Time & Shift (Shown only if not urgent) */}
                {!isUrgent && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" /> Scheduled Date
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" /> Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-600" /> Duration / Shift
                      </label>
                      <select
                        value={durationType}
                        onChange={(e) => setDurationType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      >
                        {SHIFT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Special Instructions / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Patient is in a wheelchair, needs assistance at Room 304, collect blood report from Lab 2 by 12 PM."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Submit CTA */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loadingSearch}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-xl shadow-md gap-2"
                  >
                    {loadingSearch ? 'Searching Attendants...' : 'Find Available Assistants'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* ── STEP 2: BROWSE ASSISTANT PROFILES ──────────────────── */}
            {step === 'results' && (
              <div className="space-y-6">
                {/* Filter and Top Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('form')}
                      className="text-xs gap-1 text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" /> Change Filters
                    </Button>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {assistants.length} Attendants Covering {hospital}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs"
                    >
                      <option value="rating">Top Rated</option>
                      <option value="experience">Most Experienced</option>
                      <option value="price">Lowest Rate (₹/hr)</option>
                    </select>
                  </div>
                </div>

                {/* Urgent Broadcast Card */}
                {isUrgent && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                        <Zap className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          Instant Broadcast Mode
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          You can also broadcast immediately to all verified attendants online right now. First to accept will report.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleOpenConfirm(null)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm"
                    >
                      Broadcast to All Now
                    </Button>
                  </div>
                )}

                {/* Assistant Cards Grid */}
                {sortedAssistants.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                      No matching assistants found
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try selecting another hospital, broadening service categories, or toggling Urgent mode.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('form')}
                      className="mt-4 text-xs"
                    >
                      Modify Search
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedAssistants.map((ast) => (
                      <AssistantCard
                        key={ast._id}
                        assistant={ast}
                        onSelect={() => handleOpenConfirm(ast)}
                        onViewDetails={() => setProfileModalAssistant(ast)}
                        isSelected={selectedAssistant?._id === ast._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODALS ──────────────────────────────────────────────── */}
        <AssistantProfileModal
          assistant={profileModalAssistant}
          isOpen={Boolean(profileModalAssistant)}
          onClose={() => setProfileModalAssistant(null)}
          onBook={() => {
            handleOpenConfirm(profileModalAssistant);
            setProfileModalAssistant(null);
          }}
        />

        <BookingConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmBooking}
          loading={bookingLoading}
          bookingDetails={{
            assistant: selectedAssistant,
            hospital,
            serviceCategories,
            isUrgent,
            scheduledDate,
            startTime,
            durationType,
            specialInstructions,
            rate: selectedAssistant?.pricePerHour || 150,
            hours: getHours(),
            estimatedCost: (selectedAssistant?.pricePerHour || 150) * getHours(),
          }}
        />
      </div>
    </div>
  );
}
