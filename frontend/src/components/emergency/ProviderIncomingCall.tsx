import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Phone, PhoneOff, Siren, Ambulance, MapPin, Navigation, User, HeartPulse } from 'lucide-react';
import { startEmergencyRing, stopEmergencyRing } from '@/utils/emergencyRing';

interface IncomingEmergencyData {
  requestId: string;
  category?: string;
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
  location?: { address?: string; coordinates?: [number, number]; accuracy?: number };
  distanceKm?: number;
  windowSeconds?: number;
  hospitalName?: string;
  ambulanceId?: string;
  providerType?: 'ambulance' | 'rider';
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
};

/**
 * FULL-SCREEN "incoming call" style emergency screen.
 * - Notification / toast / bell nahi: poori screen ghere rehti hai (portal, top z-index)
 * - Ringtone + vibration repeat hoti hai jab tak Accept / Decline / timeout na ho
 * - Neeche do bade gol buttons: Decline (laal) aur Accept (hara), phone-call jaise
 */
export default function ProviderIncomingCall({
  data,
  acceptedWaiting,
  onAccept,
  onReject,
  onTimeout,
}: ProviderIncomingCallProps) {
  const totalSeconds = data.windowSeconds || 30;
  const endsAtRef = useRef(Date.now() + totalSeconds * 1000);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cbRef = useRef({ onReject, onTimeout });
  cbRef.current = { onReject, onTimeout };

  // Ring + vibrate + toasts hide + body scroll lock + wake lock + title flash
  useEffect(() => {
    toast.dismiss(); // pehle se dikh rahe sab toasts hata do
    document.body.classList.add('sos-ringing');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const prevTitle = document.title;
    let flash = true;
    const titleTimer = setInterval(() => {
      document.title = flash ? '🚨 EMERGENCY CALL' : prevTitle;
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
  }, []);

  // Ringtone sirf tab tak jab tak "incoming" state hai; accept ke baad band
  useEffect(() => {
    if (acceptedWaiting) {
      stopEmergencyRing();
      return;
    }
    startEmergencyRing();
    return () => stopEmergencyRing();
  }, [acceptedWaiting]);

  // Countdown: end-time based, parent re-render se reset nahi hota
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isAmbulance = data.providerType === 'ambulance';
  const callerTitle = CATEGORY_LABELS[data.category || ''] || 'Urgent Medical Emergency';
  const HeroIcon = isAmbulance ? Ambulance : Siren;
  const p = data.patient || {};

  const ui = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={acceptedWaiting ? 'Emergency accepted, waiting for confirmation' : 'Incoming emergency call'}
      className="fixed inset-0 flex flex-col items-center justify-between text-white select-none overflow-y-auto"
      style={{
        zIndex: 2147483000,
        background:
          'radial-gradient(120% 80% at 50% 0%, #7f1d1d 0%, #450a0a 45%, #0b0b10 100%)',
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
      <div className="w-full max-w-md px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-300">
            {acceptedWaiting ? 'Emergency accepted' : 'Incoming emergency call'}
          </span>
        </div>
        <span className="text-[11px] font-bold rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
          {isAmbulance ? 'Hospital Ambulance' : 'Emergency Vehicle'}
        </span>
      </div>

      {/* Caller area */}
      <div className="w-full max-w-md px-5 flex flex-col items-center text-center gap-4">
        <div className="relative w-52 h-52 flex items-center justify-center">
          {!acceptedWaiting &&
            [0, 1, 2].map((i) => (
              <span
                key={i}
                className="sos-wave absolute inset-6 rounded-full border-2 border-red-400/60"
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
              stroke={timeLeft <= 8 ? '#f87171' : '#fca5a5'}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-800 border-4 border-red-300/40 shadow-2xl shadow-red-900/70 flex items-center justify-center">
            {acceptedWaiting ? (
              <div className="w-12 h-12 border-4 border-white/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <HeroIcon className="w-16 h-16 text-white sos-shake" />
            )}
          </div>
          <span className="absolute bottom-3 right-6 min-w-[2.75rem] text-center rounded-full bg-black/60 border border-white/20 px-2 py-0.5 text-sm font-mono font-black">
            {timeLeft}s
          </span>
        </div>

        <div>
          <p className="text-2xl font-black leading-tight">{callerTitle}</p>
          <p className="text-sm text-red-200/90 mt-1">
            {acceptedWaiting
              ? 'Aapne accept kiya — sabse paas wale ko assign hoga, confirmation ka wait…'
              : 'Emergency SOS aa raha hai — turant jawab do'}
          </p>
          {data.hospitalName && (
            <p className="text-xs text-slate-300 mt-1">
              Assigned to fleet of <strong className="text-white">{data.hospitalName}</strong>
            </p>
          )}
        </div>

        {/* Quick info chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 px-3 py-1 font-bold">
            <Navigation className="w-3.5 h-3.5" />
            {data.distanceKm ? `${data.distanceKm} km door` : 'Paas me'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 font-semibold">
            <User className="w-3.5 h-3.5" />
            {data.isSelf ? 'Patient khud' : 'Kisi aur ke liye'}
          </span>
          {p.bloodGroup && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-1 font-bold">
              <HeartPulse className="w-3.5 h-3.5" /> {p.bloodGroup}
            </span>
          )}
        </div>

        <div className="w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-left text-xs space-y-1.5">
          <div className="flex items-start gap-2 text-slate-200">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />
            <span className="line-clamp-2">
              {data.location?.address || 'Reported emergency location (GPS)'}
              {data.location?.accuracy && data.location.accuracy > 50
                ? ` · ±${Math.round(data.location.accuracy)}m`
                : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
            <span>
              <span className="text-slate-500">Naam: </span>
              <b className="text-white">{p.name || (data.isSelf ? 'Not available' : 'Unknown')}</b>
            </span>
            <span>
              <span className="text-slate-500">Umar: </span>
              <b className="text-white">
                {p.age ? `${p.age} yrs` : 'Unknown'}
                {p.gender ? ` (${p.gender})` : ''}
              </b>
            </span>
            <span className="col-span-2">
              <span className="text-slate-500">Contact: </span>
              <b className="text-white">{p.phone || 'Not provided'}</b>
            </span>
          </div>
          {p.knownConditions && (
            <p className="text-amber-300/90">
              <b>Conditions:</b> {p.knownConditions}
            </p>
          )}
          {p.knownAllergies && (
            <p className="text-amber-300/90">
              <b>Allergies:</b> {p.knownAllergies}
            </p>
          )}
          {data.reporter?.name && (
            <p className="text-slate-400 pt-1 border-t border-white/10">
              Reporter: <b className="text-slate-200">{data.reporter.name}</b>
              {data.reporter.phone ? ` (${data.reporter.phone})` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Call buttons */}
      {acceptedWaiting ? (
        <p className="px-6 pb-2 text-center text-[11px] text-slate-400">
          Multiple responders accept kar sakte hain. Final assignment window band hone par distance ke hisaab se hoga.
        </p>
      ) : (
        <div className="w-full max-w-md px-8 pb-2 flex items-start justify-between">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isSubmitting}
              aria-label="Decline emergency"
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition flex items-center justify-center shadow-xl shadow-red-950/70 disabled:opacity-60"
            >
              <PhoneOff className="w-9 h-9 text-white" />
            </button>
            <span className="text-xs font-bold text-red-200">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.button
              type="button"
              onClick={handleAcceptClick}
              disabled={isSubmitting}
              aria-label="Accept emergency"
              whileTap={{ scale: 0.92 }}
              className="sos-accept w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 transition flex items-center justify-center shadow-xl shadow-emerald-950/70 disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Phone className="w-9 h-9 text-white" />
              )}
            </motion.button>
            <span className="text-xs font-bold text-emerald-200">Accept</span>
          </div>
        </div>
      )}
    </div>
  );

  // Portal: kisi bhi page/layout/stacking-context ke upar, notification-jaisa nahi
  return typeof document !== 'undefined' ? createPortal(ui, document.body) : ui;
}
