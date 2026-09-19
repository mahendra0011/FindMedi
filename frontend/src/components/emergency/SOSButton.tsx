import React from 'react';
import { motion } from 'framer-motion';
import { Siren } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface SOSButtonProps {
  onClick: () => void;
  className?: string;
}

export default function SOSButton({ onClick, className = '' }: SOSButtonProps) {
  const location = useLocation();

  // If inside an authenticated dashboard with desktop sidebar, offset past the 256px sidebar
  const isDashboardRoute = /^\/(dashboard|admin|superadmin|doctor|clinic|pharmacy|lab|delivery|rider|assistant|lawyer|appointments|settings|notifications)/i.test(
    location.pathname
  );

  return (
    <div
      className={`fixed bottom-6 ${
        isDashboardRoute ? 'left-6 md:left-[280px]' : 'left-6'
      } z-[60] select-none transition-all duration-300 ${className}`}
    >
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative group w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center text-white focus:outline-none cursor-pointer"
        aria-label="Emergency SOS"
      >
        {/* Pulse Waves */}
        <span className="absolute inset-0 rounded-full bg-red-600/40 animate-ping duration-1000 pointer-events-none" />
        <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 opacity-75 blur-md group-hover:opacity-100 transition-opacity" />

        {/* Core Button Body */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700 border-2 border-red-300/40 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
          <Siren className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-bounce drop-shadow" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-red-50 drop-shadow">
            SOS
          </span>
        </div>
      </motion.button>
    </div>
  );
}
