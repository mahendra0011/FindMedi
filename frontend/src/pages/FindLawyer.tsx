import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Scale,
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
  BookOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  LegalCategorySelector,
  LEGAL_CATEGORIES,
} from '../components/lawyer/LegalCategorySelector';
import {
  CaseRequirementForm,
  CaseRequirementData,
} from '../components/lawyer/CaseRequirementForm';
import { LawyerCard } from '../components/lawyer/LawyerCard';
import { LawyerProfileModal } from '../components/lawyer/LawyerProfileModal';
import { BookingConfirmModal } from '../components/lawyer/BookingConfirmModal';
import { BookingStatusPanel } from '../components/lawyer/BookingStatusPanel';
import { api } from '../lib/api';
import { useAuth } from '@/context/AuthContext';
import { joinLawyerBookingRoom } from '../lib/socket';

export default function FindLawyer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');
  const followUpThreadId = searchParams.get('followUpThreadId');

  // Active / Tracking Booking State
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // 3-step search flow: 'category' -> 'case_form' -> 'results'
  const [step, setStep] = useState<'category' | 'case_form' | 'results'>('category');
  const [selectedCategory, setSelectedCategory] = useState('medical_negligence');
  const [caseData, setCaseData] = useState<CaseRequirementData | null>(null);

  // Search results & filters
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'experience'>('rating');
  const [filterCourt, setFilterCourt] = useState('all');

  // Modals
  const [selectedLawyer, setSelectedLawyer] = useState<any>(null);
  const [profileModalLawyer, setProfileModalLawyer] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch active consultation or specific bookingId
  const fetchActiveBooking = async () => {
    try {
      if (requestedBookingId) {
        const res = await api.getLawyerBooking(requestedBookingId);
        if (res?.booking) {
          setActiveBooking(res.booking);
          return;
        }
      }
      const res = await api.getActiveLawyerBooking();
      if (res?.activeBooking) {
        setActiveBooking(res.activeBooking);
      } else {
        setActiveBooking(null);
      }
    } catch (e) {
      setActiveBooking(null);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    fetchActiveBooking();
  }, [requestedBookingId]);

  // Join socket room for live status & notes updates
  useEffect(() => {
    if (!activeBooking?._id) return;
    const leave = joinLawyerBookingRoom(activeBooking._id);
    return () => leave?.();
  }, [activeBooking?._id]);

  // Handle case requirement submission -> search advocates
  const handleCaseFormSubmit = async (formData: CaseRequirementData) => {
    if (!user) {
      navigate('/login?redirect=/find-lawyer');
      return;
    }
    setCaseData(formData);
    try {
      setLoadingSearch(true);
      setStep('results');
      const res = await api.searchLawyers({
        category: formData.category,
        consultationMode: formData.consultationMode,
        isUrgent: formData.urgency === 'urgent',
        scheduledDate: formData.urgency === 'urgent' ? undefined : formData.scheduledDate,
        startTime: formData.urgency === 'urgent' ? undefined : formData.startTime,
      });
      setLawyers(res?.lawyers || []);
    } catch (err: any) {
      alert(err.message || 'Error searching advocates');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Trigger Booking Confirmation
  const handleConfirmBooking = async () => {
    if (!caseData) return;
    try {
      setBookingLoading(true);
      const payload: any = {
        category: caseData.category,
        caseDescription: caseData.caseDescription,
        urgency: caseData.urgency,
        consultationMode: caseData.consultationMode,
        scheduledDate: caseData.urgency === 'urgent' ? undefined : `${caseData.scheduledDate}T${caseData.startTime}:00`,
        budgetRange: {
          min: caseData.budgetMin,
          max: caseData.budgetMax,
        },
        documents: caseData.documents,
      };

      if (selectedLawyer) {
        payload.lawyerId = selectedLawyer._id;
        payload.fee = selectedLawyer.consultationFee || 500;
      }

      if (followUpThreadId) {
        payload.caseThreadId = followUpThreadId;
        payload.isFollowUp = true;
      }

      const res = await api.bookLawyer(payload);
      setShowConfirmModal(false);
      setActiveBooking(res.booking);
    } catch (err: any) {
      alert(err.message || 'Failed to submit consultation booking');
    } finally {
      setBookingLoading(false);
    }
  };

  // Sorting
  const sortedLawyers = [...lawyers].sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.rating?.avg || 0) - (a.rating?.avg || 0);
    }
    if (sortBy === 'fee') {
      return (a.consultationFee || 0) - (b.consultationFee || 0);
    }
    if (sortBy === 'experience') {
      return (b.yearsOfPractice || 0) - (a.yearsOfPractice || 0);
    }
    return 0;
  });

  const filteredLawyers = filterCourt === 'all'
    ? sortedLawyers
    : sortedLawyers.filter((l) =>
        (l.courtsPracticedIn || []).some((c: string) =>
          c.toLowerCase().includes(filterCourt.toLowerCase())
        )
      );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-indigo-200">
              <Scale className="w-3.5 h-3.5 text-indigo-300" />
              Verified In-App Legal Help & Hospital Case Advisory
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Book a Verified Advocate for Hospital & Legal Matters
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
              Medical negligence claims, health insurance disputes, road accident MLC documentation, patient consent disputes, and general legal opinion. Private, Bar Council verified, and confidential.
            </p>
          </div>

          <div className="absolute right-4 -bottom-10 opacity-10 pointer-events-none hidden md:block">
            <Scale className="w-80 h-80" />
          </div>
        </div>

        {/* ACTIVE BOOKING / CASE TRACKER (If active consultation in progress/requested) */}
        {activeBooking && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                Active Legal Consultation
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveBooking(null)}
                className="text-xs text-slate-500"
              >
                + Book Another Consultation
              </Button>
            </div>

            <BookingStatusPanel
              booking={activeBooking}
              currentUser={user}
              onRefresh={fetchActiveBooking}
              onNewBooking={() => {
                setActiveBooking(null);
                setStep('category');
              }}
              onBookFollowUp={(threadId) => {
                navigate(`/find-lawyer?followUpThreadId=${threadId}`);
                setActiveBooking(null);
                setStep('case_form');
              }}
            />
          </div>
        )}

        {/* 3-STEP BOOKING WIZARD (If no active consultation being tracked or user clicked new) */}
        {!activeBooking && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-7">
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 text-xs">
              <div
                className={`flex items-center gap-2 font-bold ${
                  step === 'category'
                    ? 'text-indigo-600'
                    : 'text-slate-500 cursor-pointer'
                }`}
                onClick={() => setStep('category')}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Select Legal Category</span>
              </div>

              <div className="w-8 sm:w-16 h-0.5 bg-slate-200 dark:bg-slate-700" />

              <div
                className={`flex items-center gap-2 font-bold ${
                  step === 'case_form'
                    ? 'text-indigo-600'
                    : 'text-slate-500'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Case Requirements</span>
              </div>

              <div className="w-8 sm:w-16 h-0.5 bg-slate-200 dark:bg-slate-700" />

              <div
                className={`flex items-center gap-2 font-bold ${
                  step === 'results'
                    ? 'text-indigo-600'
                    : 'text-slate-400'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Choose Advocate</span>
              </div>
            </div>

            {/* STEP 1: CATEGORY SELECTOR */}
            {step === 'category' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    What kind of legal assistance do you require?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the legal area relevant to your hospital proceeding, insurance dispute, or consultation.
                  </p>
                </div>

                <LegalCategorySelector
                  selectedCategory={selectedCategory}
                  onSelectCategory={(code) => {
                    setSelectedCategory(code);
                    setStep('case_form');
                  }}
                />
              </div>
            )}

            {/* STEP 2: CASE REQUIREMENT FORM */}
            {step === 'case_form' && (
              <CaseRequirementForm
                selectedCategory={selectedCategory}
                onBackToCategory={() => setStep('category')}
                onSubmit={handleCaseFormSubmit}
                loading={loadingSearch}
              />
            )}

            {/* STEP 3: ADVOCATE SEARCH RESULTS */}
            {step === 'results' && (
              <div className="space-y-6">
                {/* Back & Filters Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('case_form')}
                    className="text-xs self-start gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Edit Requirements
                  </Button>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-500 font-medium">Sort by:</span>
                    <button
                      type="button"
                      onClick={() => setSortBy('rating')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                        sortBy === 'rating'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Top Rated
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('fee')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                        sortBy === 'fee'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Lowest Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('experience')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                        sortBy === 'experience'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Experience
                    </button>
                  </div>
                </div>

                {/* Urgent Broadcast Fast Action (if urgent) */}
                {caseData?.urgency === 'urgent' && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-rose-600 animate-bounce shrink-0" />
                      <div>
                        <div className="text-xs font-black text-rose-800 dark:text-rose-300">
                          Urgent Broadcast Mode Enabled
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400">
                          Broadcast immediately to all available advocates in {selectedCategory.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedLawyer(null);
                        setShowConfirmModal(true);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" /> Broadcast Now
                    </Button>
                  </div>
                )}

                {/* Results Grid */}
                {loadingSearch ? (
                  <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                    <Scale className="w-8 h-8 text-indigo-600 mx-auto animate-pulse" />
                    <p>Searching verified advocates and checking court calendars...</p>
                  </div>
                ) : filteredLawyers.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <Scale className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      No matching advocates available for this specific slot
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Try choosing another consultation mode, changing the date/time slot, or posting an urgent request.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('case_form')}
                      className="rounded-xl text-xs"
                    >
                      Adjust Case Requirements
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLawyers.map((lawyer) => (
                      <LawyerCard
                        key={lawyer._id}
                        lawyer={lawyer}
                        isSelected={selectedLawyer?._id === lawyer._id}
                        onViewDetails={() => setProfileModalLawyer(lawyer)}
                        onSelect={() => {
                          setSelectedLawyer(lawyer);
                          setShowConfirmModal(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFILE MODAL */}
        <LawyerProfileModal
          isOpen={Boolean(profileModalLawyer)}
          lawyer={profileModalLawyer}
          onClose={() => setProfileModalLawyer(null)}
          onBook={() => {
            setSelectedLawyer(profileModalLawyer);
            setProfileModalLawyer(null);
            setShowConfirmModal(true);
          }}
        />

        {/* BOOKING CONFIRM MODAL */}
        {caseData && (
          <BookingConfirmModal
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmBooking}
            loading={bookingLoading}
            bookingDetails={{
              lawyer: selectedLawyer,
              category: caseData.category,
              urgency: caseData.urgency,
              consultationMode: caseData.consultationMode,
              scheduledDate: caseData.scheduledDate,
              startTime: caseData.startTime,
              caseDescription: caseData.caseDescription,
              documents: caseData.documents,
              fee: selectedLawyer?.consultationFee || 500,
            }}
          />
        )}
      </div>
    </div>
  );
}
