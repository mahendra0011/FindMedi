import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Phone, Navigation, ShieldCheck, Hospital, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SOSAssignedScreenProps {
  emergency: any;
  onDismiss?: () => void;
}

export default function SOSAssignedScreen({ emergency, onDismiss }: SOSAssignedScreenProps) {
  const responder = emergency?.responder || {};
  const isAmbulance = responder.providerType === 'ambulance';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-white select-none animate-in zoom-in-95 duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl space-y-5"
      >
        {/* Success Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase px-3 py-1 tracking-wider">
            {isAmbulance ? '🚑 Hospital Ambulance Dispatched!' : '🚗 Emergency Vehicle En Route!'}
          </Badge>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            Help Is On The Way!
          </h2>
          <p className="text-xs text-slate-300">
            Your emergency request has been accepted. The responder is currently driving towards your location.
          </p>
        </div>

        {/* Responder Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          {/* Hospital or Fleet Badge */}
          {isAmbulance && responder.hospitalName && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pb-2 border-b border-white/10">
              <Hospital className="w-4 h-4" />
              <span>{responder.hospitalName}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Assigned Unit</p>
              <p className="text-base font-extrabold text-white font-mono">
                {responder.registrationNumber || responder.vehicleType?.toUpperCase() || 'Emergency Unit'}
              </p>
              {responder.ambulanceType && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {responder.ambulanceType} Ambulance
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Estimated Arrival</p>
              <p className="text-2xl font-black text-emerald-400">
                ~{responder.etaMin || 6} min
              </p>
              <p className="text-[11px] text-slate-400">
                {responder.distanceKm || '2.5'} km away
              </p>
            </div>
          </div>

          {/* Driver Contact */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">
                {responder.driverName || 'Verified Driver'}
              </p>
              <p className="text-[11px] text-slate-400">
                {responder.driverPhone || 'Emergency Unit Staff'}
              </p>
            </div>

            {responder.driverPhone && (
              <a
                href={`tel:${responder.driverPhone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call Driver
              </a>
            )}
          </div>
        </div>

        {/* Safety Note */}
        <p className="text-[11px] text-center text-slate-400 leading-snug">
          Please keep your phone line clear and remain at the reported pickup location.
        </p>

        {onDismiss && (
          <Button
            type="button"
            variant="outline"
            onClick={onDismiss}
            className="w-full rounded-xl text-xs h-10 border-white/20 text-slate-300 hover:bg-white/10"
          >
            Close Overlay (Tracking in background)
          </Button>
        )}
      </motion.div>
    </div>
  );
}
