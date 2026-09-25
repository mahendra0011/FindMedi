import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Calendar, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface InstantNoRespondersScreenProps {
  type: 'lawyer' | 'assistant' | 'emergency_doctor' | 'ride' | 'ambulance';
  onRetry: () => void;
  onSchedule?: () => void;
  onDismiss: () => void;
  message?: string;
}

export default function InstantNoRespondersScreen({
  type,
  onRetry,
  onSchedule,
  onDismiss,
  message,
}: InstantNoRespondersScreenProps) {
  const isEmergency = type === 'ambulance' || type === 'emergency_doctor';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-white select-none animate-in zoom-in-95 duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/20">
          <AlertCircle className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white">No Responders Found Nearby</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {message ||
              'We notified all available providers in your maximum radius, but no one accepted within the window. You can retry with a wider search or schedule in advance.'}
          </p>
        </div>

        {isEmergency && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 space-y-2">
            <p className="font-bold">🚨 Urgent Emergency Hotlines</p>
            <div className="flex gap-2 justify-center">
              <a
                href="tel:108"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call 108 (Ambulance)
              </a>
              <a
                href="tel:112"
                className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call 112 (National SOS)
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={onRetry}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md"
          >
            <RefreshCw className="w-4 h-4" /> Try Searching Again
          </Button>

          {onSchedule && !isEmergency && (
            <Button
              onClick={onSchedule}
              variant="outline"
              className="w-full h-11 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs gap-1.5"
            >
              <Calendar className="w-4 h-4" /> Schedule for Later
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onDismiss}
            className="w-full h-10 rounded-xl text-slate-400 hover:text-white text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
