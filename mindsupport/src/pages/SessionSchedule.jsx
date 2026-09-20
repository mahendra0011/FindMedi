import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { api, getStoredUser } from "@/lib/api";
import { fetchCounsellors, selectCounsellors, selectCounsellorsStatus } from "@/store/counsellorsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ArrowLeft, ArrowRight, Building2, CalendarCheck, Check, CheckCircle2, ClipboardList, Clock3, CreditCard, Info, Landmark, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Smartphone, Star, Video, Wallet } from "lucide-react";

const fallbackPlans = [
  {
    id: "one-time",
    name: "One-Time Session",
    duration: "Single session",
    cadence: "One-time consultation",
    summary: "A single counselling session for immediate support",
    bestFor: ["Immediate support", "One-off guidance", "Quick check-in"],
    bookingPrice: 599,
    perSessionPrice: 599,
  },
  {
    id: "short-term",
    name: "Short-Term Support",
    duration: "4-8 sessions",
    cadence: "One session every two days",
    summary: "Quick emotional support and guidance",
    bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
    bookingPrice: 1499,
    perSessionPrice: 1499,
  },
  {
    id: "medium-term",
    name: "Medium-Term Support",
    duration: "8-15 sessions",
    cadence: "Weekly or bi-weekly",
    summary: "Emotional recovery and personal growth",
    bestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
    bookingPrice: 2499,
    perSessionPrice: 2499,
  },
  {
    id: "long-term",
    name: "Long-Term Therapy",
    duration: "3-6+ months",
    cadence: "Weekly or bi-weekly sessions",
    summary: "Ongoing therapy and steady progress",
    bestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
    bookingPrice: 3999,
    perSessionPrice: 3999,
  },
];

const activeStatuses = ["pending", "confirmed"];
const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse", "trauma", "kill myself", "want to die"];
const hasEmergencyLanguage = (text) => emergencyKeywords.some((keyword) => String(text || "").toLowerCase().includes(keyword));
const modeOptions = [
  { id: "video-chat", label: "Video Call + Chat", icon: Video, desc: "Video sessions + chat support between sessions" },
  { id: "chat-only", label: "Chat Only", icon: MessageCircle, desc: "Text-based counselling only" },
  { id: "google-meet", label: "Video Call Only", icon: Video, desc: "Video call sessions only" },
  { id: "in-person", label: "Visit + Video Calls", icon: MapPin, desc: "In-person clinic visits + video sessions" },
  { id: "voice-call", label: "Audio Only", icon: Phone, desc: "Voice call sessions" },
];
const timeSlots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

function buildDateChoices(count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    };
  });
}

function formatRupees(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MS"
  );
}

function plansFor(counsellor) {
  return counsellor?.supportPlans?.length ? counsellor.supportPlans : fallbackPlans;
}

function planPrice(plan) {
  return Number(plan?.bookingPrice || plan?.perSessionPrice || 0);
}

function planFromList(counsellor, planId) {
  const plans = plansFor(counsellor);
  return plans.find((plan) => plan.id === planId) || plans[0];
}

function modeLabel(value = "") {
  return modeOptions.find((mode) => mode.id === value)?.label || value || "Google Meet";
}

function formatScheduleDate(value) {
  if (!value) return "Choose date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const SessionSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const counsellors = useAppSelector(selectCounsellors);
  const counsellorsStatus = useAppSelector(selectCounsellorsStatus);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(params.get("counsellorId") || "");
  const [selectedPlanId, setSelectedPlanId] = useState(params.get("plan") || "short-term");
  const [booking, setBooking] = useState({ mode: "google-meet", date: "", time: "" });
  const [concern, setConcern] = useState("");
  const packageId = params.get("packageId");
  const [userPackage, setUserPackage] = useState(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const storedUser = useMemo(() => getStoredUser(), []);
  const [confirmationEmail, setConfirmationEmail] = useState(storedUser?.email || "");
  const dateChoices = useMemo(() => buildDateChoices(10), []);

  useEffect(() => {
    if (counsellorsStatus === "idle") {
      dispatch(fetchCounsellors());
    }
    setLoading(true);
    api.get("/api/appointments/my")
      .then(({ data }) => {
        setAppointments(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch, counsellorsStatus]);

  useEffect(() => {
    if (counsellors.length > 0) {
      setSelectedId((current) => current || counsellors[0]?.id || "");
    }
  }, [counsellors]);

  useEffect(() => {
    if (!packageId) { setUserPackage(null); return; }
    setPackageLoading(true);
    api.get(`/api/packages/${packageId}`)
      .then(({ data }) => setUserPackage(data || null))
      .catch(() => setUserPackage(null))
      .finally(() => setPackageLoading(false));
  }, [packageId]);

  useEffect(() => {
    if (!packageId) { setIntakeSubmitted(false); return; }
    api.get(`/api/intake/${packageId}`)
      .then(({ data }) => setIntakeSubmitted(data?.submitted || false))
      .catch(() => setIntakeSubmitted(false));
  }, [packageId]);

  const selectedCounsellor = useMemo(
    () => counsellors.find((counsellor) => counsellor.id === selectedId) || counsellors[0] || null,
    [counsellors, selectedId]
  );
  const selectedPlan = planFromList(selectedCounsellor, selectedPlanId);
  const supportedModes = useMemo(
    () => (selectedCounsellor?.consultationModes?.length ? selectedCounsellor.consultationModes : ["google-meet", "voice-call", "in-person", "video-chat", "chat-only"]),
    [selectedCounsellor]
  );
  const activeBooking = appointments.find(
    (appointment) => appointment.counsellorId === selectedCounsellor?.id && activeStatuses.includes(appointment.status)
  );
  const acceptingBookings = selectedCounsellor?.bookingEnabled !== false;
  const dateUnavailable = Boolean(booking.date && (selectedCounsellor?.unavailableDates || []).includes(booking.date));
  const canSubmit = Boolean(selectedCounsellor && selectedPlan && booking.date && booking.time && acceptingBookings && !activeBooking && !dateUnavailable);

  const paymentMethods = [
    { id: "card", label: "Credit/Debit Card", icon: CreditCard },
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "netbanking", label: "Net Banking", icon: Landmark },
    { id: "wallet", label: "Wallet", icon: Wallet },
  ];

  useEffect(() => {
    if (!selectedCounsellor) return;
    const plans = plansFor(selectedCounsellor);
    setSelectedPlanId((current) => (plans.some((plan) => plan.id === current) ? current : plans[0]?.id || "short-term"));
    setBooking((current) => (supportedModes.includes(current.mode) ? current : { ...current, mode: supportedModes[0] || "google-meet" }));
  }, [selectedCounsellor, supportedModes]);

  const bookSession = async () => {
    setSubmitting(true);
    try {
      const { data: appointment } = await api.post("/api/appointments", {
        counsellorId: selectedCounsellor.id,
        supportPlanId: selectedPlan.id,
        mode: booking.mode,
        date: booking.date,
        time: booking.time,
        concern,
        isAnonymous: false,
        autoConfirm: true,
        packageId: packageId || undefined,
      });
      setAppointments((current) => [...current, appointment]);
      setBooking((current) => ({ ...current, date: "", time: "" }));
      toast({
        title: packageId ? "Session booked" : "Booking confirmed & paid",
        description: packageId
          ? `${selectedCounsellor.name} is confirmed. Session deducted from your ${userPackage?.planName || "package"}.`
          : `${selectedCounsellor.name} is confirmed for ${selectedPlan.name}. Payment receipt sent to your email.`,
      });
      dispatch(fetchCounsellors());
    } catch (error) {
      toast({ variant: "destructive", title: "Booking failed", description: error?.message || "" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitBooking = async () => {
    if (!selectedCounsellor || !selectedPlan || !booking.date || !booking.time) {
      toast({ variant: "destructive", title: "Booking incomplete", description: "Choose mode, date, and time." });
      return;
    }
    if (activeBooking) {
      toast({ variant: "destructive", title: "Already booked", description: "This counsellor is already in your active schedule." });
      return;
    }
    if (!acceptingBookings) {
      toast({ variant: "destructive", title: "Bookings paused", description: "This counsellor is not accepting new bookings right now." });
      return;
    }
    if (dateUnavailable) {
      toast({ variant: "destructive", title: "Date unavailable", description: "Choose another date for this counsellor." });
      return;
    }
    if (packageId && userPackage) {
      bookSession();
    } else {
      setShowPayment(true);
    }
  };

  const completePayment = async () => {
    setPaying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPaying(false);
    setShowPayment(false);
    await bookSession();
  };

  return (
    <div className="min-h-screen bg-[#050914] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-10 md:py-12">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-700/14 blur-3xl" />
          <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(selectedCounsellor ? `/counselling/${selectedCounsellor.id}` : "/counselling")}
              className="mb-8 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {selectedCounsellor ? "Back to profile" : "Back to counsellors"}
            </button>

            <div className="mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-transparent bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text">Book a session</p>
              <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-tight md:text-[2.85rem] bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">Pick your mode, day and time</h1>
              <p className="mt-3 text-slate-500 max-w-xl">Choose your counselling mode, pick a date and time that works for you, and we will handle the rest.</p>
            </div>

            {loading ? (
              <PanelText>Loading schedule data...</PanelText>
            ) : !selectedCounsellor ? (
              <PanelText>No approved counsellors available yet.</PanelText>
            ) : (
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  {packageId && !intakeSubmitted && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
                      <div className="flex items-start gap-3">
                        <ClipboardList className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Complete Your Intake Form</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Please fill out your background and concerns before booking your first session.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate(`/intake/${packageId}`)}>
                            Fill Intake Form
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <SchedulePanel title="Counselling mode">
                      <div className="grid gap-4 md:grid-cols-3">
                        {modeOptions.map((mode) => {
                          const Icon = mode.icon;
                          const active = booking.mode === mode.id;
                          const disabled = !supportedModes.includes(mode.id);
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => setBooking((current) => ({ ...current, mode: mode.id }))}
                              className={`relative min-h-[120px] rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 ${
                                active
                                  ? "border-violet-400/50 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 shadow-lg shadow-violet-500/20"
                                  : "border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:border-violet-500/30 hover:bg-white/[0.05]"
                              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                            >
                              {active && (
                                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-lg shadow-violet-500/40">
                                  <Check className="h-3 w-3 text-white" />
                                </span>
                              )}
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${active ? "from-violet-500/30 to-cyan-500/20 border border-violet-400/30" : "from-white/10 to-white/5 border border-white/[0.06]"} mb-3`}>
                                <Icon className={`h-5 w-5 ${active ? "text-violet-200" : "text-slate-300"}`} />
                              </div>
                              <div className={`text-base font-bold ${active ? "text-white" : "text-white"}`}>{mode.label}</div>
                              <p className={`mt-1 text-sm leading-5 ${active ? "text-violet-200/70" : "text-slate-500"}`}>
                                {disabled ? "Not offered" : mode.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </SchedulePanel>

                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Cancellation Policy
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Free cancellation up to 24 hours before your session. Late cancellations (within 24 hours) will consume the session. 
                        Unused sessions in a package are eligible for refund within 7 days of purchase.
                      </p>
                    </div>

                  <SchedulePanel title="Preferred date">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-500">Pick a date for your session</p>
                        <span className="text-xs font-semibold text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                          {dateChoices.length > 0 && new Date(dateChoices[0].value).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-3 sm:grid-cols-5 xl:grid-cols-10">
                        {dateChoices.map((date) => {
                          const unavailable = (selectedCounsellor.unavailableDates || []).includes(date.value);
                          const isWeekend = date.weekday === "SAT" || date.weekday === "SUN";
                          const isToday = new Date().toISOString().slice(0, 10) === date.value;
                          return (
                            <button
                              key={date.value}
                              type="button"
                              disabled={unavailable}
                              onClick={() => setBooking((current) => ({ ...current, date: date.value }))}
                              className={`rounded-2xl border px-3 py-3 text-center transition-all duration-300 ${
                                booking.date === date.value
                                  ? "border-violet-400/50 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 text-white shadow-lg shadow-violet-500/20 scale-105"
                                  : isWeekend
                                    ? "border-amber-500/15 bg-gradient-to-br from-amber-500/8 to-amber-500/3 text-amber-200/80 hover:border-amber-400/30 hover:bg-amber-500/10"
                                    : "border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] text-slate-300 hover:border-violet-500/30 hover:bg-white/[0.05] hover:-translate-y-0.5"
                              } ${unavailable ? "cursor-not-allowed opacity-30" : ""}`}
                            >
                              <div className={`text-[10px] font-bold tracking-[0.12em] uppercase ${isWeekend ? "text-amber-400/70" : "text-slate-500"}`}>{date.weekday}</div>
                              <div className={`mt-1 text-2xl font-bold ${booking.date === date.value ? "text-white" : isWeekend ? "text-amber-200" : "text-white"}`}>{date.day}</div>
                              {isToday && <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 rounded-full px-1.5 py-0.5 inline-block">Today</div>}
                            </button>
                          );
                        })}
                      </div>
                    </SchedulePanel>

                  <SchedulePanel title="Available time slots">
                      <p className="text-xs text-slate-500 mb-4">Choose a time that fits your schedule</p>
                      <div className="flex flex-wrap gap-3">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setBooking((current) => ({ ...current, time: slot }))}
                            className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                              booking.time === slot
                                ? "border-violet-400/50 bg-gradient-to-r from-violet-500/20 to-cyan-500/10 text-white shadow-lg shadow-violet-500/20 scale-105"
                                : "border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] text-slate-200 hover:border-violet-500/30 hover:bg-white/[0.05] hover:-translate-y-0.5"
                            }`}
                          >
                            <Clock3 className={`h-3.5 w-3.5 inline mr-1.5 ${booking.time === slot ? "text-violet-300" : "text-slate-500"}`} />
                            {slot}
                          </button>
                        ))}
                      </div>
                    </SchedulePanel>

                  <SchedulePanel title="Where should we send confirmation?">
                      <p className="text-xs text-slate-500 mb-4">We'll send booking details and reminders</p>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                        <Input
                          type="email"
                          value={confirmationEmail}
                          onChange={(event) => setConfirmationEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="h-12 rounded-2xl border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] pl-12 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      {confirmationEmail && (
                        <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Confirmation will be sent to {confirmationEmail}
                        </p>
                      )}
                    </SchedulePanel>

                  <SchedulePanel title="What brings you here?">
                      <p className="text-xs text-slate-500 mb-4">Share a brief concern or goal (optional)</p>
                      <textarea
                        value={concern}
                        onChange={(e) => setConcern(e.target.value)}
                        placeholder="e.g., Feeling anxious about exams, need help with stress management..."
                        rows={3}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 resize-none"
                      />
                      {hasEmergencyLanguage(concern) && (
                        <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-rose-300 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            Crisis Support Available
                          </div>
                          <p className="text-xs text-rose-200/80 leading-relaxed">
                            Your safety matters. If you're in crisis, help is available 24/7:
                          </p>
                          <ul className="mt-2 space-y-1 text-xs text-rose-200/70">
                            <li>🚑 Emergency: <strong className="text-white">108</strong> (India) or your local emergency number</li>
                            <li>💬 AASRA Helpline: <strong className="text-white">+91-982-046-6726</strong> (24x7)</li>
                            <li>🧠 iCall Helpline: <strong className="text-white">+91-915-298-7821</strong> (Mon-Sat 10am-8pm)</li>
                          </ul>
                        </div>
                      )}
                    </SchedulePanel>

                  {activeBooking && (
                    <StatusPanel tone="success" title="This counsellor is already booked once.">
                      {activeBooking.supportPlanName || "Counselling session"} on {activeBooking.date} at {activeBooking.time}. Manage it from your dashboard.
                    </StatusPanel>
                  )}
                  {!activeBooking && !acceptingBookings && (
                    <StatusPanel tone="danger" title="Bookings are paused">
                      This counsellor has disabled new bookings for now.
                    </StatusPanel>
                  )}
                  {!activeBooking && dateUnavailable && (
                    <StatusPanel tone="danger" title="Choose another date">
                      The selected counsellor marked this date unavailable.
                    </StatusPanel>
                  )}
                </div>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <Card className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] shadow-xl shadow-black/20">
                    <div className="h-1.5 bg-gradient-to-r from-violet-500 to-cyan-500" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-xl ring-2 ring-violet-500/20">
                          <AvatarImage src={selectedCounsellor.profilePhotoUrl} alt={selectedCounsellor.name} />
                          <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-lg font-bold text-violet-300">
                            {initials(selectedCounsellor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-bold leading-tight">{selectedCounsellor.name}</h2>
                          <p className="mt-0.5 text-sm text-slate-400">{selectedCounsellor.specialization}</p>
                          {selectedCounsellor?.clinicName && (
                            <p className="text-xs text-slate-500">
                              <Building2 className="h-3 w-3 inline mr-1" />{selectedCounsellor.clinicName}
                            </p>
                          )}
                          {selectedCounsellor?.clinicAddress && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              <MapPin className="h-3 w-3 inline mr-1" />{selectedCounsellor.clinicAddress}{selectedCounsellor.city ? `, ${selectedCounsellor.city}` : ""}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs text-amber-200">{Number(selectedCounsellor.rating || 4.8).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="my-6 h-px bg-gradient-to-r from-violet-500/20 via-white/10 to-cyan-500/20" />

                      <div className="space-y-4 text-sm">
                        <SummaryLine label="Plan" value={selectedPlan?.name || "Selected plan"} />
                        <SummaryLine label="Mode" value={modeLabel(booking.mode)} />
                        <SummaryLine label="Date" value={formatScheduleDate(booking.date)} />
                        <SummaryLine label="Time" value={booking.time || "-"} />
                      </div>

                      <div className="my-6 h-px bg-gradient-to-r from-violet-500/20 via-white/10 to-cyan-500/20" />

                      {packageId && userPackage ? (
                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm text-slate-400">Package</span>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">{userPackage.planName}</div>
                            <div className="text-xs text-slate-500">{userPackage.sessionsUsed}/{userPackage.sessionsTotal} sessions used • {userPackage.sessionsRemaining} left</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm text-slate-400">Total</span>
                          <div className="text-right">
                            <div className="text-3xl font-bold bg-gradient-to-r from-violet-200 to-cyan-200 bg-clip-text text-transparent">{formatRupees(planPrice(selectedPlan))}</div>
                            <div className="text-xs text-slate-500">{selectedPlan?.duration || "one-time"} package</div>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={submitBooking}
                        disabled={submitting || !canSubmit}
                        className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-bold text-white hover:from-violet-400 hover:to-cyan-400 disabled:opacity-40 shadow-lg shadow-violet-500/25 transition-all"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">Confirming booking...</span>
                        ) : activeBooking ? (
                          "Already booked"
                        ) : packageId ? (
                          <span className="flex items-center justify-center gap-2"><CalendarCheck className="h-4 w-4" /> Book session <ArrowRight className="h-4 w-4" /></span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">Proceed to payment <ArrowRight className="h-4 w-4" /></span>
                        )}
                      </Button>
                      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                        {packageId ? "Session charged to your package • No additional payment needed." : "Secure payment • You will receive session details after confirmation."}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="mt-4 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-4 text-xs leading-6 text-slate-500">
                    <ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" />
                    MindSupport is for emotional support. In immediate danger or medical emergency, contact local emergency services.
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>

        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !paying && setShowPayment(false)}>
            <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0d1220] to-[#0a0e1a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-violet-500 to-cyan-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Complete payment</h2>
                  {!paying && (
                    <button onClick={() => setShowPayment(false)} className="text-slate-500 hover:text-white transition-colors text-sm">Cancel</button>
                  )}
                </div>

                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">{selectedCounsellor?.name}</span>
                    <span className="text-sm text-slate-400">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{modeLabel(booking.mode)} • {formatScheduleDate(booking.date)} at {booking.time}</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-violet-200 to-cyan-200 bg-clip-text text-transparent">{formatRupees(planPrice(selectedPlan))}</span>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Pay with</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const active = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          active
                            ? "border-violet-400/50 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 shadow-lg shadow-violet-500/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-violet-500/30"
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-violet-500/20" : "bg-white/5"}`}>
                          <Icon className={`h-4 w-4 ${active ? "text-violet-300" : "text-slate-400"}`} />
                        </div>
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === "card" && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Card number</p>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                        <Input value="4242 4242 4242 4242" readOnly className="h-11 rounded-xl border-white/[0.06] bg-white/[0.02] pl-10 text-sm text-slate-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Expiry</p>
                        <Input value="12/28" readOnly className="h-11 rounded-xl border-white/[0.06] bg-white/[0.02] text-sm text-slate-300" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">CVV</p>
                        <Input value="123" readOnly className="h-11 rounded-xl border-white/[0.06] bg-white/[0.02] text-sm text-slate-300" />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "upi" && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 mb-1.5">UPI ID</p>
                    <Input value="user@paytm" readOnly className="h-11 rounded-xl border-white/[0.06] bg-white/[0.02] text-sm text-slate-300" />
                    <p className="text-xs text-slate-600 mt-2">Demo UPI — auto-approved for testing</p>
                  </div>
                )}

                {(paymentMethod === "netbanking" || paymentMethod === "wallet") && (
                  <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-sm text-slate-300">Demo {paymentMethod === "netbanking" ? "Net Banking" : "Wallet"} enabled</p>
                    <p className="text-xs text-slate-600 mt-1">Auto-approved for testing purposes</p>
                  </div>
                )}

                <div className="text-xs text-slate-600 mb-6 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  This is a demo payment. No real charge will be made.
                </div>

                <Button
                  onClick={completePayment}
                  disabled={paying}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-bold text-white hover:from-violet-400 hover:to-cyan-400 shadow-lg shadow-violet-500/25 transition-all"
                >
                  {paying ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Processing payment...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">Pay {formatRupees(planPrice(selectedPlan))} <ArrowRight className="h-4 w-4" /></span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

function SchedulePanel({ title, children }) {
  return (
    <Card className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] shadow-xl shadow-black/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1 w-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatusPanel({ tone, title, children }) {
  const styles =
    tone === "danger"
      ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  return (
    <div className={`rounded-[22px] border p-4 ${styles}`}>
      <div className="font-bold">{title}</div>
      <p className="mt-1 text-sm opacity-85">{children}</p>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-[#070b15] p-4 text-sm text-slate-300/75">{children}</div>;
}

export default SessionSchedule;
