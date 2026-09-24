import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Siren, Stethoscope, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface DualFABProps {
  onOpenAmbulance: () => void;
  onOpenDoctor: () => void;
}

export default function DualEmergencyFAB({ onOpenAmbulance, onOpenDoctor }: DualFABProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isDashboard = /^\/(dashboard|patient|doctor|clinic|lab|pharmacy|admin)/i.test(location.pathname);

  return (
    <div className={`fixed bottom-6 ${isDashboard ? 'left-6 md:left-[280px]' : 'left-6'} z-[70]`}>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="mb-3 flex flex-col gap-2.5"
          >
            {/* 1. Emergency Doctor Button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setMenuOpen(false);
                onOpenDoctor();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xl border border-teal-400/40 cursor-pointer"
            >
              <Stethoscope className="w-5 h-5 text-white" />
              <span>Request Emergency Doctor</span>
            </motion.button>

            {/* 2. Ambulance SOS Button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setMenuOpen(false);
                onOpenAmbulance();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xl border border-red-400/40 cursor-pointer"
            >
              <Siren className="w-5 h-5 text-white animate-bounce" />
              <span>Ambulance / Vehicle SOS</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setMenuOpen(!menuOpen)}
        className="relative group w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center text-white focus:outline-none cursor-pointer"
        aria-label="Emergency Help"
      >
        <span className="absolute inset-0 rounded-full bg-red-600/40 animate-ping duration-1000 pointer-events-none" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-teal-600 border-2 border-white/40 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
          {menuOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <>
              <div className="flex items-center gap-0.5 text-white">
                <Siren className="w-5 h-5 animate-bounce" />
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-white">SOS</span>
            </>
          )}
        </div>
      </motion.button>
    </div>
  );
}
