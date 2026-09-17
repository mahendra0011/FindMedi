'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, PhoneOff, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoCall } from '@/context/VideoCallContext';

export default function IncomingVideoCallDialog() {
  const { callState, activePeer, isCaller, acceptVideoCall, rejectVideoCall } = useVideoCall();

  // Only render when incoming call is ringing
  const isRinging = callState === 'ringing' && !isCaller && activePeer;

  if (!isRinging) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-neutral-900 border border-white/15 p-6 text-center text-white shadow-2xl"
        >
          {/* Subtle glowing radial background */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

          {/* Caller Avatar with pulsing ring */}
          <div className="relative mx-auto mb-4 w-28 h-28 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-2 rounded-full bg-emerald-500/10"
            />

            {activePeer?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePeer.avatar}
                alt={activePeer.name || 'Caller'}
                className="relative z-10 w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-xl"
              />
            ) : (
              <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-3xl font-bold border-2 border-emerald-400/50 shadow-xl">
                {activePeer?.name?.charAt(0) || 'P'}
              </div>
            )}

            <span className="absolute bottom-1 right-2 z-20 bg-emerald-500 text-black p-1.5 rounded-full shadow-md">
              <Video className="w-4 h-4" />
            </span>
          </div>

          {/* Caller Name & Role */}
          <h3 className="text-xl font-bold tracking-tight text-white mb-0.5">
            {activePeer?.name || 'Patient'}
          </h3>
          <p className="text-xs text-neutral-400 capitalize mb-3">
            {activePeer?.role || 'Patient'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Incoming 1080p Full HD Video Call
          </div>

          {/* Action Buttons: Accept vs Decline */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => rejectVideoCall()}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <span className="text-[11px] font-medium text-neutral-400">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-1.5">
              <Button
                size="icon"
                onClick={() => acceptVideoCall()}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
              >
                <Video className="w-6 h-6" />
              </Button>
              <span className="text-[11px] font-semibold text-emerald-400">Accept Video</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>End-to-End Encrypted WebRTC Stream</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
