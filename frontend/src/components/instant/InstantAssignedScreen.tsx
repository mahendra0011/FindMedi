import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Phone, MessageSquare, MapPin, Navigation, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface InstantAssignedScreenProps {
  type: 'lawyer' | 'assistant' | 'emergency_doctor' | 'ride' | 'ambulance';
  assignedDetails: any;
  requestDetails?: any;
  onViewDetails?: () => void;
  onDismiss?: () => void;
}

export default function InstantAssignedScreen({
  type,
  assignedDetails,
  requestDetails,
  onViewDetails,
  onDismiss,
}: InstantAssignedScreenProps) {
  const provider = assignedDetails?.providerDetails || assignedDetails?.responder || {};
  const distanceKm = assignedDetails?.distanceKm || assignedDetails?.distance || 1.5;

  const roleTitles = {
    lawyer: 'Advocate Assigned',
    assistant: 'Care Attendant Assigned',
    emergency_doctor: 'Emergency Doctor Dispatched',
    ride: 'Driver En Route',
    ambulance: 'Ambulance En Route',
  };

  const roleEmoji = {
    lawyer: '⚖️',
    assistant: '🩺',
    emergency_doctor: '👨‍⚕️',
    ride: '🚗',
    ambulance: '🚑',
  };

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
            {roleEmoji[type]} {roleTitles[type] || 'Provider Assigned!'}
          </Badge>

          <h2 className="text-xl sm:text-2xl font-black text-white">Help Is Confirmed!</h2>
          <p className="text-xs text-slate-300">
            Your instant request has been accepted. The verified professional is now assigned to your booking.
          </p>
        </div>

        {/* Provider Profile Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {provider?.name ? provider.name.charAt(0).toUpperCase() : roleEmoji[type]}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-base text-white truncate">
                  {provider?.name || 'Verified Professional'}
                </h4>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>

              <p className="text-xs text-slate-400 truncate">
                {provider?.specialization || provider?.vehicleType?.toUpperCase() || provider?.experienceYears ? `${provider.experienceYears} Years Exp` : 'FindMedi Verified'}
              </p>

              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center text-amber-400 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                  {provider?.rating || '4.9'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  • ~{distanceKm} km away
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
            {provider?.phone ? (
              <a
                href={`tel:${provider.phone}`}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-bold text-xs shadow-md transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
            ) : (
              <div className="h-11 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center font-bold text-xs">
                In-app Chat Active
              </div>
            )}

            <Button
              onClick={onViewDetails || onDismiss}
              className="h-11 rounded-xl bg-white text-slate-900 hover:bg-slate-200 font-bold text-xs gap-1.5 shadow-md"
            >
              <span>View Booking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Footer Dismiss / Close */}
        <div className="text-center pt-1">
          <button
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-white underline transition-colors"
          >
            Continue in background
          </button>
        </div>
      </motion.div>
    </div>
  );
}
