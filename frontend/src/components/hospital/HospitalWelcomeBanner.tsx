'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const clinicTips = [
  'Review today\'s appointments before starting consultations.',
  'Confirm pending appointments promptly to avoid no-shows.',
  'Keep patient records updated after each visit.',
  'Follow up with patients who have pending lab tests.',
];

interface HospitalWelcomeBannerProps {
  userName?: string;
}

export function HospitalWelcomeBanner({ userName }: HospitalWelcomeBannerProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % clinicTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-white mb-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-medium text-white/70">{greeting}</p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-0.5">
            Welcome back, Dr. {userName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-white/80 mt-1">Here&apos;s your clinic overview for today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm">
            <p className="text-white/70 text-xs">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
            </p>
            <p className="font-semibold">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center min-w-[80px]">
            <p className="text-white/70 text-xs">Clinic Tip</p>
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-medium text-xs max-w-[200px] leading-tight"
            >
              {clinicTips[tipIndex]}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
