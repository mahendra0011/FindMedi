import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Siren, MapPin, Clock, AlertTriangle, ShieldCheck, Check, X, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playEmergencyDoctorSiren, stopEmergencyDoctorSiren } from '@/utils/emergencyDoctorAudio';
import { Link } from 'react-router-dom';

export interface IncomingEmergencyDispatchData {
  requestId: string;
  bookingId?: string;
  requestNumber?: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  bloodGroup?: string;
  emergencyCategory: string;
  symptomsDescription?: string;
  severity: string;
  pickupAddress: string;
  distanceKm?: number;
  etaMinutes?: number;
  baseFee?: number;
  pricing?: {
    baseEmergencyFee?: number;
    totalAmount?: number;
  };
  expiresInSeconds?: number;
}

interface IncomingEmergencyProps {
  dispatchData: IncomingEmergencyDispatchData;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => void;
}

export default function DoctorIncomingEmergencyModal({
  dispatchData,
  onAccept,
  onDecline,
}: IncomingEmergencyProps) {
  const [secondsLeft, setSecondsLeft] = useState(dispatchData.expiresInSeconds || 30);
  const [isAccepting, setIsAccepting] = useState(false);

  // Play audio alert siren on mount, stop on unmount
  useEffect(() => {
    playEmergencyDoctorSiren();
    return () => {
      stopEmergencyDoctorSiren();
    };
  }, []);

  // 30s Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      stopEmergencyDoctorSiren();
      onDecline(dispatchData.requestId);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, dispatchData.requestId, onDecline]);

  const handleConfirmAccept = async () => {
    try {
      setIsAccepting(true);
      stopEmergencyDoctorSiren();
      await onAccept(dispatchData.requestId);
    } catch {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    stopEmergencyDoctorSiren();
    onDecline(dispatchData.requestId);
  };

  const payout = dispatchData.baseFee || dispatchData.pricing?.baseEmergencyFee || 800;
  const reqNum = dispatchData.bookingId || dispatchData.requestNumber || `REQ-${dispatchData.requestId.slice(-6)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-card rounded-3xl border-2 border-red-500/60 shadow-[0_0_80px_rgba(239,68,68,0.35)] overflow-hidden flex flex-col text-card-foreground"
      >
        {/* Siren Header Bar */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Siren className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider">
                Emergency Doctor SOS Call
              </h3>
              <p className="text-[11px] text-red-100 font-mono">
                {reqNum}
              </p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center font-mono font-black text-xl bg-white/10">
            {secondsLeft}s
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Triage Banner */}
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-black uppercase text-red-500 tracking-wider">
                {dispatchData.severity || 'Critical'} Crisis: {dispatchData.emergencyCategory}
              </span>
              <p className="text-xs text-foreground font-medium mt-0.5">
                {dispatchData.symptomsDescription || 'Patient in acute distress requiring bedside clinical triage.'}
              </p>
            </div>
          </div>

          {/* Patient Details Strip */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="p-3 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Patient</span>
              <span className="text-xs font-bold text-foreground truncate block">{dispatchData.patientName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Age / Gender</span>
              <span className="text-xs font-bold text-foreground block">
                {dispatchData.patientAge ? `${dispatchData.patientAge}y` : '—'} • {dispatchData.patientGender ? dispatchData.patientGender[0] : '—'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Blood Group</span>
              <span className="text-xs font-bold text-red-500 block">{dispatchData.bloodGroup || 'Unknown'}</span>
            </div>
          </div>

          {/* Location & Transit Distance */}
          <div className="p-4 rounded-2xl bg-card border space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-foreground">Pickup Location:</span>
                <p className="text-muted-foreground leading-snug">{dispatchData.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t font-semibold">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" /> Distance: {dispatchData.distanceKm ? `${dispatchData.distanceKm} km` : '~3.5 km'}
              </span>
              <span className="text-emerald-500 font-bold">
                ETA: ~{dispatchData.etaMinutes || 10} mins
              </span>
              <span className="text-foreground font-mono">
                Payout: ₹{payout}
              </span>
            </div>
          </div>

          {/* Statutory Licensure & Good Samaritan Notice */}
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground leading-relaxed">
            <Scale className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">Statutory Good Samaritan Notice: </span>
              Responding physician acts under the statutory protections of Sec 134A Motor Vehicles Act 2019 and NMC Ethics. See FindMedi{' '}
              <Link to="/terms" target="_blank" className="text-primary underline hover:text-primary/80">Terms</Link> &{' '}
              <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">Privacy</Link>.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={handleDecline}
              variant="outline"
              disabled={isAccepting}
              className="h-12 rounded-2xl border-border/80 text-muted-foreground hover:bg-muted font-bold text-xs"
            >
              <X className="w-4 h-4 mr-1.5" />
              Decline Run
            </Button>

            <Button
              onClick={handleConfirmAccept}
              disabled={isAccepting}
              className="h-12 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-sm shadow-xl shadow-teal-500/25"
            >
              <Check className="w-5 h-5 mr-1.5" />
              {isAccepting ? 'Locking Run...' : 'ACCEPT DISPATCH'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
