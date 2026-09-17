'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Zap, Building2, MapPin, Video, Phone, MessageCircle, Syringe, Pill,
  Upload, Ambulance, Heart
} from 'lucide-react';

const quickActions = [
  { label: 'Find Doctors', icon: Building2, link: '/doctors', desc: 'In Clinic / Hospital' },
  { label: 'Home Visits', icon: MapPin, link: '/patient/home-visit', desc: 'Live map tracking' },
  { label: 'Video Consult', icon: Video, link: '/patient/video-calls', desc: 'Full HD 1080p' },
  { label: 'Voice Calls', icon: Phone, link: '/patient/calls', desc: 'Audio consults' },
  { label: 'Doctor Chat', icon: MessageCircle, link: '/patient/chat', desc: 'Instant messaging' },
  { label: 'Book Lab Test', icon: Syringe, link: '/patient/services', desc: 'Home collection' },
  { label: 'Buy Medicine', icon: Pill, link: '/pharmacy', desc: 'Doorstep delivery' },
  { label: 'Upload Report', icon: Upload, link: '/upload', desc: 'Store securely' },
  { label: 'Emergency', icon: Ambulance, link: '/patient/emergency', desc: 'Get help now' },
  { label: 'Saved Doctors', icon: Heart, link: '/patient/favorites', desc: 'Quick access' },
];

export function PatientQuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">Quick Actions</h3>
            <p className="text-xs text-muted-foreground">Tasks at your fingertips</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickActions.map(a => (
          <Link
            key={a.label}
            href={a.link}
            className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <a.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {a.label}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{a.desc}</span>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-border/0 group-hover:ring-primary/20 transition-all" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
