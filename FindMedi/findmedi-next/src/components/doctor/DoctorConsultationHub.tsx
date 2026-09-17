'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Building2, ChevronRight, MapPin, Car, Video, Phone, MessageCircle
} from 'lucide-react';

interface DoctorConsultationHubProps {
  inHospitalCount: number;
  homeVisitsCount: number;
  videoCount: number;
  voiceCount: number;
}

export function DoctorConsultationHub({
  inHospitalCount,
  homeVisitsCount,
  videoCount,
  voiceCount,
}: DoctorConsultationHubProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg text-foreground">
                Consultation &amp; Live Patient Tracking Hub
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Hospital Doctor Suite
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your in-hospital OPD, confirmed home visits with live GPS map tracking, video consultations, voice calls, and encrypted chat.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. In Hospital Consultations */}
        <div
          onClick={() => router.push('/doctor/appointments')}
          className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                Hospital OPD
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
              In Hospital
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              In-person hospital OPD patient consultations, token queue, prescription &amp; vitals.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-xs font-semibold text-blue-600">
            <span>{inHospitalCount} active today</span>
            <span className="flex items-center gap-0.5">Open OPD <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        {/* 2. Home Visits with Live GPS Map */}
        <div
          onClick={() => router.push('/doctor/home-visit')}
          className="group relative rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-950/20 p-4 hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white flex items-center gap-1">
                <Car className="w-3 h-3" /> Live GPS
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-violet-600 transition-colors">
              Home Visits
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Live patient route tracking map, Haversine distance, urban ETA, and arrival waiting room check-in.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-xs font-semibold text-violet-600">
            <span>{homeVisitsCount} active today</span>
            <span className="flex items-center gap-0.5">Track Map <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        {/* 3. Video Calls */}
        <div
          onClick={() => router.push('/doctor/video-calls')}
          className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-cyan-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">
                1080p HD
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-cyan-600 transition-colors">
              Video Consult
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Full HD 1080p video consultation room with screen sharing, PiP, and camera controls.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-cyan-600">
            <span>{videoCount} active today</span>
            <span className="flex items-center gap-0.5">Start <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        {/* 4. Voice Calls */}
        <div
          onClick={() => router.push('/doctor/calls')}
          className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                WebRTC
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
              Voice Calls
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              1-to-1 crystal-clear audio consultations with active call duration &amp; log history.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>{voiceCount} active today</span>
            <span className="flex items-center gap-0.5">Dial <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        {/* 5. Patient Chat */}
        <div
          onClick={() => router.push('/doctor/chat')}
          className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                Instant
              </span>
            </div>
            <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-amber-600 transition-colors">
              Patient Chat
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Encrypted text chat, symptom discussions, and medical report sharing.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-amber-600">
            <span>Direct Messages</span>
            <span className="flex items-center gap-0.5">Chat <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
