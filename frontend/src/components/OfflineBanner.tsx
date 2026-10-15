import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export interface OfflineBannerProps {
  className?: string;
}

/**
 * OfflineBanner Component (FE-MISSING-03)
 * Displays a non-intrusive warning when the client loses network connectivity.
 * Prompts user that offline actions will synchronize once the connection recovers.
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      // Fast probe to check actual internet reachability
      const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setIsOffline(false);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md z-50 text-sm font-medium transition-all ${className}`}
    >
      <div className="flex items-center space-x-2.5">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" aria-hidden="true" />
        <span>
          You are currently offline. Actions are queued locally and will sync once connection is restored.
        </span>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isChecking}
        className="inline-flex items-center space-x-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-md transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>{isChecking ? 'Checking...' : 'Retry'}</span>
      </button>
    </div>
  );
};

export default OfflineBanner;
