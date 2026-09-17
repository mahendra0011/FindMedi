'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Building2, ChevronRight, MapPin, Video, Phone, MessageCircle
} from 'lucide-react';

export function PatientTelehealthHub() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mb-6 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-muted/20 p-5 sm:p-6 shadow-sm relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                Consultation & Telehealth Hub
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Instant Connect
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect with verified doctors anytime via encrypted chat, crystal-clear voice, or Full HD video.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1: In Clinic / Hospital */}
        <div
          onClick={() => router.push('/doctors')}
          className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                OPD Visit
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
              In Clinic / Hospital
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Consult top specialists at verified clinics & hospitals with instant token appointments.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>In-Person Visit</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              Book Visit <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 2: Home Visits */}
        <div
          onClick={() => router.push('/patient/home-visit')}
          className="group relative rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-950/20 p-4 hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white flex items-center gap-1">
                Live GPS
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-violet-600 transition-colors">
              Home Visits
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Doctor visits your doorstep with live route tracking, real-time ETA, and arrival check-in.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>MapLibre Route</span>
            <span className="text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
              Track Live <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 3: Video Consultations */}
        <div
          onClick={() => router.push('/patient/video-calls')}
          className="group relative rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-950/20 p-4 hover:border-cyan-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white flex items-center gap-1">
                1080p HD
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-cyan-600 transition-colors">
              Video Consult
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Full HD face-to-face video consultation with screen sharing, PiP mode, and e-prescriptions.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Adaptive Full HD</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
              Video Room <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 4: Voice Calls */}
        <div
          onClick={() => router.push('/patient/calls')}
          className="group relative rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                WebRTC
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
              Voice Calls
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Opus 48kHz audio calling with noise cancellation, doctor directory, and call history.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Opus 48kHz Audio</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              Call Hub <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 5: Doctor Chat */}
        <div
          onClick={() => router.push('/patient/chat')}
          className="group relative rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                Instant
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-amber-600 transition-colors">
              Doctor Chat
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Direct text messaging, share symptoms, medical photos, and get quick answers in real-time.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Real-time Chat</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              Open Chat <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
