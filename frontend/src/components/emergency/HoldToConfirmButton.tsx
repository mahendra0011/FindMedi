import React, { useRef, useState, useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  holdMs?: number;
  label?: string;
  className?: string;
}

export default function HoldToConfirmButton({
  onConfirm,
  holdMs = 1000,
  label = 'Hold to Confirm Emergency',
  className = '',
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<any>(null);
  const startRef = useRef<number>(0);

  const startHold = () => {
    setIsHolding(true);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const currentProgress = Math.min(100, (elapsed / holdMs) * 100);
      setProgress(currentProgress);
      if (elapsed >= holdMs) {
        clearInterval(timerRef.current);
        setIsHolding(false);
        setProgress(0);
        onConfirm();
      }
    }, 25);
  };

  const cancelHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={`relative overflow-hidden w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 transition-all select-none flex items-center justify-center gap-2 cursor-pointer ${className}`}
    >
      {/* Background Fill Animation */}
      <span
        className="absolute left-0 top-0 bottom-0 bg-red-800 pointer-events-none transition-[width] duration-30 ease-linear"
        style={{ width: `${progress}%` }}
      />

      {/* Button Content */}
      <span className="relative z-10 flex items-center gap-2">
        <AlertOctagon className={`w-5 h-5 ${isHolding ? 'animate-spin' : ''}`} />
        <span>{isHolding ? `Keep holding... (${Math.round(progress)}%)` : label}</span>
      </span>
    </button>
  );
}
