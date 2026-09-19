import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, PhoneOff, AlertTriangle, MapPin, User, HeartPulse, Hospital, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  reporter?: {
    name?: string;
    phone?: string;
  };
  location?: {
    address?: string;
    coordinates?: [number, number];
  };
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

export default function ProviderIncomingCall({
  data,
  acceptedWaiting,
  onAccept,
  onReject,
  onTimeout,
}: ProviderIncomingCallProps) {
  const totalSeconds = data.windowSeconds || 30;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<any>(null);

  // Play audio beeps + vibration
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        const playBeep = () => {
          if (!audioCtxRef.current) return;
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, audioCtxRef.current.currentTime + 0.3);
          gain.gain.setValueAtTime(0.25, audioCtxRef.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.35);
        };

        playBeep();
        beepIntervalRef.current = setInterval(playBeep, 1200);
      }
    } catch {
      // AudioContext not permitted without user gesture
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      } catch {
        // vibration unsupported or blocked
      }
    }

    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch {}
      }
    };
  }, []);

  // 30s Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeout) {
            onTimeout(data.requestId);
          } else {
            onReject(data.requestId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data.requestId, onReject, onTimeout]);

  const handleAcceptClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAccept(data.requestId);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SVG Circle Progress calculation
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (timeLeft / totalSeconds) * circumference;

  const categoryLabels: Record<string, string> = {
    accident: 'Accident / Trauma',
    heart_attack: 'Cardiac Emergency / Chest Pain',
    breathing_issue: 'Severe Respiratory Distress',
    burn: 'Severe Burn Injury',
    fall: 'Severe Fall / Trauma',
    stroke: 'Suspected Stroke / Paralysis',
    other: 'Critical Medical Emergency',
  };

  if (acceptedWaiting) {
    return (
      <div role="alertdialog" aria-modal="true" aria-label="Emergency confirmation wait"
        className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none">
        <style>{`@media (prefers-reduced-motion: reduce){.ring-icon{animation:none!important}}`}</style>
        <div className="w-full max-w-md rounded-3xl border-2 border-emerald-500/40 bg-slate-900 p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-lg font-black">Aapne accept kiya</h2>
          <p className="text-sm text-slate-300">Sabse paas wale responder ko assign hoga, confirmation ka wait…</p>
          <p className="text-xs text-slate-500">Window band hone par result aayega. Overlay band mat karo.</p>
        </div>
      </div>
    );
  }

  return (
    <div role="alertdialog" aria-modal="true" aria-label="Incoming emergency call"
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none"
      onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') e.stopPropagation(); }}>
      <style>{`
        @keyframes ring-shake { 0%,100%{transform:rotate(0)} 10%,30%,50%,70%,90%{transform:rotate(-12deg)} 20%,40%,60%,80%{transform:rotate(12deg)} }
        .ring-icon { animation: ring-shake 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .ring-icon{animation:none!important} }
      `}</style>
      {/* Top Header */}
      <div className="w-full max-w-md pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-red-400">
            Emergency SOS Alert
          </span>
        </div>

        {data.providerType === 'ambulance' ? (
          <Badge className="bg-red-600/30 text-red-300 border border-red-500/40 text-[11px] font-bold">
            Hospital Ambulance
          </Badge>
        ) : (
          <Badge className="bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
            Emergency Support Vehicle
          </Badge>
        )}
      </div>

      {/* Center Body Card */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-red-500/40 rounded-3xl p-6 shadow-2xl shadow-red-950/50 space-y-5"
      >
        {/* Countdown Timer with Circular SVG */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={circleRadius}
                stroke="currentColor"
                strokeWidth="6"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={circleRadius}
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-red-500 transition-all duration-1000 ease-linear"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono text-white leading-none">
                {timeLeft}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                sec left
              </span>
            </div>
          </div>

          <p className="text-xs text-red-300/90 font-semibold mt-2">
            Respond quickly to secure this emergency request
          </p>
        </div>

        {/* Emergency Category */}
        <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-3.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold">
            Incident Type
          </p>
          <p className="text-base font-extrabold text-white mt-0.5">
            {categoryLabels[data.category || ''] || 'Urgent Medical Emergency'}
          </p>
        </div>

        {/* Pickup & Distance Info */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <Navigation className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-300">Pickup Distance</p>
                <span className="font-black text-emerald-400 text-sm">
                  {data.distanceKm ? `${data.distanceKm} km away` : 'Nearby'}
                </span>
              </div>
              <p className="text-slate-400 mt-1 truncate">
                {data.location?.address || 'Reported emergency location (GPS coordinates)'}
              </p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" /> Patient Details
              </span>
              <span className="text-[11px] text-slate-400">
                {data.isSelf ? 'Self' : 'Reported for Someone Else'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300 text-[11px]">
              <div>
                <span className="text-slate-500">Name: </span>
                <span className="font-semibold text-white">
                  {data.patient?.name || 'Anonymous Patient'}
                </span>
              </div>
              {data.patient?.age && (
                <div>
                  <span className="text-slate-500">Age: </span>
                  <span className="font-semibold text-white">
                    {data.patient.age} yrs {data.patient?.gender ? `(${data.patient.gender})` : ''}
                  </span>
                </div>
              )}
              {data.patient?.bloodGroup && (
                <div>
                  <span className="text-slate-500">Blood Group: </span>
                  <span className="font-bold text-red-400">
                    {data.patient.bloodGroup}
                  </span>
                </div>
              )}
              {data.patient?.phone && (
                <div>
                  <span className="text-slate-500">Contact: </span>
                  <span className="font-semibold text-white">
                    {data.patient.phone}
                  </span>
                </div>
              )}
            </div>

            {data.patient?.knownConditions && (
              <p className="text-[10px] text-amber-300/90 pt-1 border-t border-white/5">
                <span className="font-bold">Conditions:</span> {data.patient.knownConditions}
              </p>
            )}
            {(data.patient as any)?.knownAllergies && (
              <p className="text-[10px] text-amber-300/90 pt-1">
                <span className="font-bold">Allergies:</span> {(data.patient as any).knownAllergies}
              </p>
            )}

            {data.reporter?.name && (
              <p className="text-[10px] text-slate-400 pt-1 border-t border-white/5">
                <span className="font-bold text-slate-300">Reporter:</span> {data.reporter.name}{' '}
                {data.reporter.phone ? `(${data.reporter.phone})` : ''}
              </p>
            )}
          </div>
        </div>

        {data.hospitalName && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Hospital className="w-3.5 h-3.5 text-slate-500" />
            <span>Assigned to fleet of <strong className="text-white">{data.hospitalName}</strong></span>
          </div>
        )}
      </motion.div>

      {/* Bottom Action Controls */}
      <div className="w-full max-w-md pb-4 pt-3 flex items-center gap-4">
        {/* Decline Button */}
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => onReject(data.requestId)}
          className="flex-1 h-14 rounded-2xl border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
        >
          <PhoneOff className="w-5 h-5 text-red-400" />
          Decline
        </Button>

        {/* Accept Button */}
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleAcceptClick}
          className="flex-2 h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 transition-all transform active:scale-95"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <PhoneCall className="w-5 h-5 ring-icon" />
              Accept SOS
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
