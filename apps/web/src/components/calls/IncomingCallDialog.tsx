'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, User, ShieldCheck } from 'lucide-react';
import { useAudioCall } from '@/context/AudioCallContext';

export default function IncomingCallDialog() {
  const { callState, activePeer, isCaller, acceptCall, rejectCall } = useAudioCall();

  if (callState !== 'ringing' || isCaller || !activePeer) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card/95 border border-border/70 p-6 shadow-2xl text-center text-foreground backdrop-blur-xl"
        >
          {/* Pulsing background glow */}
          <div className="absolute -top-12 -left-12 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* Incoming audio call badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Incoming 1-to-1 Audio Call
          </div>

          {/* Avatar with pulsing rings */}
          <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg bg-muted flex items-center justify-center">
              {activePeer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activePeer.avatar} alt={activePeer.name || 'Caller'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Caller Details */}
          <h3 className="text-xl font-bold font-heading tracking-tight mb-1 text-foreground">
            {activePeer.name || 'Patient'}
          </h3>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
            {activePeer.role ? `${activePeer.role.replace('_', ' ')} • Audio Call` : 'Audio Call'}
          </p>
          {activePeer.phone && (
            <p className="text-xs text-muted-foreground/80 font-mono mb-6">
              {activePeer.phone}
            </p>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted Audio</span>
          </div>

          {/* Action Buttons: Decline & Accept */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => rejectCall()}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all duration-200 font-semibold text-sm shadow-sm border border-destructive/20 active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>

            <button
              type="button"
              onClick={() => acceptCall()}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200 font-semibold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 animate-bounce"
              style={{ animationDuration: '2s' }}
            >
              <Phone className="w-4 h-4" />
              <span>Accept</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
