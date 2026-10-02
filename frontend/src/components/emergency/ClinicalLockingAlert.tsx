import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Siren, FlaskConical, Droplets, CheckCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startEmergencyRing, stopEmergencyRing } from '@/utils/emergencyRing';

// Tech 09: fullscreen hardware-locking clinical modal. Reuses the dispatch
// alert pattern (ProviderIncomingCall): z-[99999] viewport lock + Web Audio
// oscillator tone + WakeLock + vibration + countdown. Blocks ALL other UI
// until 1-tap acknowledge. Props:
//   alert: { alertId, kind: 'code_blue'|'lab_panic'|'mtp', title, detail,
//            toneType, actionLabel, room }
//   onAcked(ack), onAction()
const KIND_STYLE = {
  code_blue: {
    icon: Siren,
    ring: 'border-sky-400',
    glow: 'bg-sky-500/20',
    banner: 'bg-sky-500',
    label: 'CODE BLUE',
    tone: 'code_blue',
  },
  lab_panic: {
    icon: FlaskConical,
    ring: 'border-red-500',
    glow: 'bg-red-500/20',
    banner: 'bg-red-600',
    label: 'STAT LAB PANIC',
    tone: 'lab_panic',
  },
  mtp: {
    icon: Droplets,
    ring: 'border-amber-400',
    glow: 'bg-amber-500/20',
    banner: 'bg-amber-500',
    label: 'MTP — MASSIVE TRANSFUSION',
    tone: 'siren',
  },
};

export default function ClinicalLockingAlert({ alert, onAcked, onAction }) {
  const [secs, setSecs] = useState(0);
  const [acking, setAcking] = useState(false);
  const style = KIND_STYLE[alert?.kind] || KIND_STYLE.code_blue;
  const Icon = style.icon;

  useEffect(() => {
    try {
      startEmergencyRing(alert?.toneType || style.tone);
    } catch { /* audio unavailable */ }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      try { stopEmergencyRing(); } catch { /* noop */ }
    };
  }, [alert?.alertId]);

  if (!alert) return null;

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  const ack = async () => {
    setAcking(true);
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post(`/clinical-alerts/${encodeURIComponent(alert.alertId)}/ack`, {
        room: alert.room || '',
        action: 'acknowledged_from_locking_modal',
      });
      try { stopEmergencyRing(); } catch { /* noop */ }
      onAcked?.(res);
    } catch {
      try { stopEmergencyRing(); } catch { /* noop */ }
      onAcked?.({ alertId: alert.alertId, offline: true });
    } finally {
      setAcking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={style.label}
    >
      <motion.div
        initial={{ scale: 0.92, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 25, damping: 350 }}
        className={`w-full max-w-md rounded-2xl border-2 ${style.ring} bg-slate-900 overflow-hidden`}
      >
        <div className={`${style.banner} px-4 py-2 flex items-center justify-between`}>
          <span className="text-white font-bold tracking-widest text-sm animate-pulse">{style.label}</span>
          <span className="text-white font-mono font-bold tabular-nums">{mm}:{ss}</span>
        </div>
        <div className={`relative px-6 pt-6 pb-4 text-center ${style.glow}`}>
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">{alert.title}</h2>
          {alert.detail ? <p className="mt-1 text-sm text-slate-300">{alert.detail}</p> : null}
        </div>
        <div className="px-4 pb-5 space-y-2">
          {alert.actionLabel ? (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5"
              onClick={() => { onAction?.(alert); }}
            >
              <Zap className="w-4 h-4 mr-2" /> {alert.actionLabel}
            </Button>
          ) : null}
          <Button
            className="w-full bg-white text-slate-900 font-bold py-5"
            onClick={ack}
            disabled={acking}
          >
            <CheckCheck className="w-4 h-4 mr-2" /> {acking ? 'ACKNOWLEDGING…' : 'ACKNOWLEDGE — STOP ALARM'}
          </Button>
          <p className="text-center text-[11px] text-slate-500">UI locked until acknowledged · timer keeps running</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
