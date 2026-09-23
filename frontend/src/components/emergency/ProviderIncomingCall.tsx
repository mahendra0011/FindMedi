import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Phone,
  PhoneOff,
  Siren,
  Ambulance,
  MapPin,
  Navigation,
  User,
  HeartPulse,
  Scale,
  Stethoscope,
  Car,
  Clock,
  IndianRupee,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { startEmergencyRing, stopEmergencyRing } from '@/utils/emergencyRing';

export interface IncomingEmergencyData {
  requestId: string;
  category?: string;
  title?: string;
  subtitle?: string;
  isSelf?: boolean;
  patient?: {
    name?: string;
    age?: number | string;
    gender?: string;
    bloodGroup?: string;
    knownAllergies?: string;
    knownConditions?: string;
    phone?: string;
  };
  reporter?: { name?: string; phone?: string };
  location?: {
    address?: string;
    coordinates?: [number, number];
    accuracy?: number;
    pickupAddress?: string;
    dropAddress?: string;
  };
  distanceKm?: number;
  windowSeconds?: number;
  hospitalName?: string;
  ambulanceId?: string;
  amount?: number | string;
  providerType?: 'ambulance' | 'rider' | 'assistant' | 'lawyer';
  specialInstructions?: string;
  scheduledTime?: string;
  serviceBadges?: string[];
}

interface ProviderIncomingCallProps {
  data: IncomingEmergencyData;
  acceptedWaiting?: boolean;
  onAccept: (requestId: string) => Promise<void> | void;
  onReject: (requestId: string) => void;
  onTimeout?: (requestId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  accident: 'Accident / Trauma',
  heart_attack: 'Cardiac Emergency / Chest Pain',
  breathing_issue: 'Severe Respiratory Distress',
  burn: 'Severe Burn Injury',
  fall: 'Severe Fall / Trauma',
  stroke: 'Suspected Stroke / Paralysis',
  other: 'Critical Medical Emergency',
  medical_negligence: 'Medical Negligence / Malpractice',
  consumer_dispute: 'Hospital Consumer Dispute',
  bail_arrest: 'Bail & Urgent Criminal Relief',
  insurance_claim: 'Health Insurance Rejection',
  organ_transplant: 'Organ Transplant Authorization',
  patient_rights: 'Patient Rights Violation',
  corporate_hospital: 'Hospital Contract / Corporate',
};

/**
 * FULL-SCREEN "incoming call" style modal screen for Assistant, Lawyer & Rider.
 * - Full viewport portal overlay with high z-index (no toast or small cards)
 * - Ringtone caller sound repeats until Accept / Reject or 2-minute timer ends
 * - Accept (Green) and Reject (Red) phone-call style buttons
 * - Detailed view of location, requester, fee, countdown timer (default 120s)
 */
export default function ProviderIncomingCall({
  data,
  acceptedWaiting,
  onAccept,
  onReject,
  onTimeout,
}: ProviderIncomingCallProps) {
  // Default window: 120 seconds (2 minutes)
  const totalSeconds = data.windowSeconds || 120;
  const endsAtRef = useRef(Date.now() + totalSeconds * 1000);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cbRef = useRef({ onReject, onTimeout });
  cbRef.current = { onReject, onTimeout };

  const providerType = data.providerType || 'rider';

  // Ring + vibrate + body scroll lock + wake lock + title flash
  useEffect(() => {
    toast.dismiss();
    document.body.classList.add('sos-ringing');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const prevTitle = document.title;
    let flash = true;
    const alertTitle =
      providerType === 'assistant'
        ? '🩺 NEW ATTENDANT REQUEST'
        : providerType === 'lawyer'
        ? '⚖️ NEW LEGAL CONSULTATION'
        : providerType === 'ambulance'
        ? '🚨 EMERGENCY SOS'
        : '🚖 NEW RIDE REQUEST';

    const titleTimer = setInterval(() => {
      document.title = flash ? alertTitle : prevTitle;
      flash = !flash;
    }, 800);

    let wake: any = null;
    (async () => {
      try {
        wake = await (navigator as any).wakeLock?.request('screen');
      } catch {
        /* wake lock unsupported */
      }
    })();

    return () => {
      document.body.classList.remove('sos-ringing');
      document.body.style.overflow = prevOverflow;
      clearInterval(titleTimer);
      document.title = prevTitle;
      try {
        wake?.release?.();
      } catch {
        /* noop */
      }
    };
  }, [providerType]);

  // Caller tone / ring tone during incoming state
  useEffect(() => {
    if (acceptedWaiting) {
      stopEmergencyRing();
      return;
    }
    startEmergencyRing();
    return () => stopEmergencyRing();
  }, [acceptedWaiting]);

  // Countdown: 2 minutes timer with auto reject/timeout
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(id);
        if (!acceptedWaiting) {
          const cb = cbRef.current;
          if (cb.onTimeout) cb.onTimeout(data.requestId);
          else cb.onReject(data.requestId);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [data.requestId, acceptedWaiting]);

  const handleAcceptClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    stopEmergencyRing();
    try {
      await onAccept(data.requestId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (isSubmitting) return;
    stopEmergencyRing();
    onReject(data.requestId);
  };

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (timeLeft / totalSeconds) * circumference;

  // Visual Theme by Provider Type
  const themeConfig = {
    assistant: {
      bg: 'radial-gradient(120% 80% at 50% 0%, #0f3d3e 0%, #062425 45%, #050d11 100%)',
      ringColor: '#2dd4bf',
      ringBg: 'from-teal-500 to-teal-800',
      borderRing: 'border-teal-300/40',
      badgeBg: 'bg-teal-500/20 text-teal-200 border-teal-400/30',
      badgeLabel: 'Hospital Care Attendant',
      HeroIcon: Stethoscope,
      subtitle: data.subtitle || 'Patient requested hospital support. Review details and accept shift.',
      pingColor: 'bg-teal-400',
      title: data.title || (data.hospitalName ? `Shift at ${data.hospitalName}` : 'Hospital Attendant Request'),
    },
    lawyer: {
      bg: 'radial-gradient(120% 80% at 50% 0%, #1f2937 0%, #0b0f19 45%, #030712 100%)',
      ringColor: '#cbd5e1',
      ringBg: 'from-slate-700 to-black',
      borderRing: 'border-slate-400/40',
      badgeBg: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
      badgeLabel: 'Medico-Legal Consultation',
      HeroIcon: Scale,
      subtitle: data.subtitle || 'Client requesting direct legal consultation. Respond before timer ends.',
      pingColor: 'bg-slate-300',
      title: data.title || CATEGORY_LABELS[data.category || ''] || 'Urgent Legal Consultation',
    },
    rider: {
      bg: 'radial-gradient(120% 80% at 50% 0%, #78350f 0%, #451a03 45%, #0b0b10 100%)',
      ringColor: '#fbbf24',
      ringBg: 'from-amber-500 to-amber-800',
      borderRing: 'border-amber-300/40',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
      badgeLabel: 'Passenger Ride Request',
      HeroIcon: Car,
      subtitle: data.subtitle || 'Passenger waiting for pickup confirmation. Respond before timer expires.',
      pingColor: 'bg-amber-400',
      title: data.title || 'New Ride Request',
    },
    ambulance: {
      bg: 'radial-gradient(120% 80% at 50% 0%, #7f1d1d 0%, #450a0a 45%, #0b0b10 100%)',
      ringColor: '#f87171',
      ringBg: 'from-red-500 to-red-800',
      borderRing: 'border-red-300/40',
      badgeBg: 'bg-red-500/20 text-red-200 border-red-400/30',
      badgeLabel: 'Emergency Ambulance',
      HeroIcon: Ambulance,
      subtitle: data.subtitle || 'Critical Medical Emergency — Immediate response required!',
      pingColor: 'bg-red-400',
      title: data.title || CATEGORY_LABELS[data.category || ''] || 'Urgent Medical Emergency',
    },
  }[providerType];

  const HeroIcon = themeConfig.HeroIcon;
  const p = data.patient || {};
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const ui = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={acceptedWaiting ? 'Request accepted, waiting for confirmation' : 'Incoming booking request'}
      className="fixed inset-0 flex flex-col items-center justify-between text-white select-none overflow-y-auto"
      style={{
        zIndex: 2147483000,
        background: themeConfig.bg,
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.stopPropagation();
      }}
    >
      <style>{`
        body.sos-ringing [data-sonner-toaster],
        body.sos-ringing .toaster { display: none !important; }
        @keyframes sos-ring-wave { 0% { transform: scale(0.75); opacity: 0.7 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes sos-shake { 0%,100% { transform: rotate(0) } 15%,45%,75% { transform: rotate(-14deg) } 30%,60%,90% { transform: rotate(14deg) } }
        @keyframes sos-accept-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.65) } 70% { box-shadow: 0 0 0 26px rgba(34,197,94,0) } }
        .sos-wave { animation: sos-ring-wave 2.2s ease-out infinite }
        .sos-shake { animation: sos-shake 1.3s ease-in-out infinite }
        .sos-accept { animation: sos-accept-pulse 1.4s ease-out infinite }
        @media (prefers-reduced-motion: reduce) { .sos-wave, .sos-shake, .sos-accept { animation: none !important } }
      `}</style>

      {/* Top strip */}
      <div className="w-full max-w-lg px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${themeConfig.pingColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${themeConfig.pingColor}`} />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">
            {acceptedWaiting ? 'Request Accepted' : 'Incoming Request Call'}
          </span>
        </div>
        <span className={`text-[11px] font-bold rounded-full border px-3 py-1 ${themeConfig.badgeBg}`}>
          {themeConfig.badgeLabel}
        </span>
      </div>

      {/* Caller area */}
      <div className="w-full max-w-lg px-5 flex flex-col items-center text-center gap-3">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {!acceptedWaiting &&
            [0, 1, 2].map((i) => (
              <span
                key={i}
                className="sos-wave absolute inset-5 rounded-full border-2 border-white/20"
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            ))}
          {/* countdown ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={timeLeft <= 20 ? '#f87171' : themeConfig.ringColor}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${themeConfig.ringBg} border-4 ${themeConfig.borderRing} shadow-2xl flex items-center justify-center`}>
            {acceptedWaiting ? (
              <div className="w-10 h-10 border-4 border-white/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <HeroIcon className="w-14 h-14 text-white sos-shake" />
            )}
          </div>
          <span className="absolute bottom-2 right-4 min-w-[3.25rem] text-center rounded-full bg-black/75 border border-white/20 px-2 py-0.5 text-xs font-mono font-black text-amber-300">
            {formattedTime}
          </span>
        </div>

        <div>
          <p className="text-2xl font-black leading-tight text-white">{themeConfig.title}</p>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
            {acceptedWaiting
              ? 'Request accepted. Loading booking details...'
              : themeConfig.subtitle}
          </p>
        </div>

        {/* Quick info chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {data.amount != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1 font-black">
              <IndianRupee className="w-3.5 h-3.5" />
              {typeof data.amount === 'number' ? `₹${data.amount}` : data.amount}
            </span>
          )}

          {data.distanceKm != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 px-3 py-1 font-bold">
              <Navigation className="w-3.5 h-3.5" />
              {data.distanceKm} km away
            </span>
          )}

          {data.scheduledTime && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 font-medium text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              {data.scheduledTime}
            </span>
          )}

          {p.bloodGroup && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-1 font-bold">
              <HeartPulse className="w-3.5 h-3.5" /> {p.bloodGroup}
            </span>
          )}
        </div>

        {/* Details card */}
        <div className="w-full rounded-2xl bg-black/40 border border-white/15 p-3.5 text-left text-xs space-y-2 backdrop-blur-md">
          {/* Location / Destination */}
          {data.location?.address && (
            <div className="flex items-start gap-2 text-slate-100">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  {providerType === 'assistant' ? 'Hospital Location' : 'Location Address'}
                </span>
                <span className="line-clamp-2 font-medium">{data.location.address}</span>
              </div>
            </div>
          )}

          {data.location?.pickupAddress && (
            <div className="flex items-start gap-2 text-slate-100">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">Pickup Location</span>
                <span className="line-clamp-2 font-medium">{data.location.pickupAddress}</span>
              </div>
            </div>
          )}

          {data.location?.dropAddress && (
            <div className="flex items-start gap-2 text-slate-100">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <div className="flex-1">
                <span className="text-[10px] text-rose-400 uppercase font-bold block">Drop Location</span>
                <span className="line-clamp-2 font-medium">{data.location.dropAddress}</span>
              </div>
            </div>
          )}

          {/* Client / Patient details */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-white/10 text-slate-300">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">
                {providerType === 'lawyer' ? 'Client Name' : 'Patient / Requester'}
              </span>
              <b className="text-white text-sm">{p.name || data.reporter?.name || 'Verified User'}</b>
            </div>

            {(p.phone || data.reporter?.phone) && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Contact</span>
                <b className="text-white text-sm">{p.phone || data.reporter?.phone}</b>
              </div>
            )}

            {p.age && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Age / Gender</span>
                <span className="text-slate-200">
                  {p.age} yrs {p.gender ? `(${p.gender})` : ''}
                </span>
              </div>
            )}

            {data.category && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Category / Type</span>
                <span className="text-amber-300 font-semibold capitalize">
                  {data.category.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Badges */}
          {data.serviceBadges && data.serviceBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/10">
              {data.serviceBadges.map((badge, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Special Instructions or Case notes */}
          {data.specialInstructions && (
            <div className="pt-2 border-t border-white/10 text-amber-200/90 text-xs">
              <span className="font-bold text-amber-300 block text-[10px] uppercase">Instructions / Details:</span>
              <p className="line-clamp-2 italic">"{data.specialInstructions}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Call action buttons (Reject / Accept) */}
      {acceptedWaiting ? (
        <p className="px-6 pb-2 text-center text-xs text-slate-300">
          Booking accepted. Opening session...
        </p>
      ) : (
        <div className="w-full max-w-md px-8 pb-3 flex items-start justify-between">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isSubmitting}
              aria-label="Decline request"
              className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 transition flex items-center justify-center shadow-2xl shadow-rose-950/80 disabled:opacity-60"
            >
              <PhoneOff className="w-9 h-9 text-white" />
            </button>
            <span className="text-xs font-bold text-rose-300">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.button
              type="button"
              onClick={handleAcceptClick}
              disabled={isSubmitting}
              aria-label="Accept request"
              whileTap={{ scale: 0.92 }}
              className="sos-accept w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 transition flex items-center justify-center shadow-2xl shadow-emerald-950/80 disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Phone className="w-9 h-9 text-white" />
              )}
            </motion.button>
            <span className="text-xs font-bold text-emerald-300">Accept</span>
          </div>
        </div>
      )}
    </div>
  );

  // Portal: render directly in document.body so it's always full-screen
  return typeof document !== 'undefined' ? createPortal(ui, document.body) : ui;
}
