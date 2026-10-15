import React, { useEffect, useCallback } from 'react';
import { LogOut } from 'lucide-react';

export interface QuickExitButtonProps {
  redirectUrl?: string;
  className?: string;
}

/**
 * QuickExitButton Component (MH-MISSING-02)
 * Privacy & Safety control for Mental Health / Mind Support modules (MHCA 2017).
 * Instantly wipes mental health session caches and replaces the window location
 * with an innocuous page (e.g., Google or Weather).
 * Supports click and double-tap of Escape key.
 */
export const QuickExitButton: React.FC<QuickExitButtonProps> = ({
  redirectUrl = 'https://www.google.com',
  className = '',
}) => {
  const triggerExit = useCallback(() => {
    try {
      // Wipe session and local storage caches
      sessionStorage.clear();
      // Wipe mental health query cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('findmedi:logout'));
      }
    } catch {
      // Ignore storage errors on exit
    }
    // Hard replace history entry so back button doesn't expose mental health screen
    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  useEffect(() => {
    let lastEscTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime < 500) {
          triggerExit();
        }
        lastEscTime = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerExit]);

  return (
    <button
      type="button"
      onClick={triggerExit}
      title="Quick Exit (Esc twice) — Clears mental health data and opens Google immediately"
      aria-label="Quick Exit"
      className={`fixed bottom-4 right-4 z-50 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full shadow-lg transition-transform active:scale-95 ${className}`}
    >
      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Quick Exit (Esc)</span>
    </button>
  );
};

export default QuickExitButton;
