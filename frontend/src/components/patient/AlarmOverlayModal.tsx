import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Pill,
  HeartPulse,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stopAlarmSound, startAlarmSound } from '@/utils/alarmAudio';

export interface AlarmItem {
  id: string;
  type: 'medicine' | 'vital';
  title: string;
  dosageOrContext?: string;
  time: string;
  scheduledAt?: string;
  alarmPreset?: string;
  vitalType?: string;
  carePlanTitle?: string;
}

interface AlarmOverlayModalProps {
  alarm: AlarmItem | null;
  onTaken: (alarm: AlarmItem) => void;
  onSnooze: (alarm: AlarmItem, minutes: number) => void;
  onSkip: (alarm: AlarmItem) => void;
  onLogVital?: (alarm: AlarmItem) => void;
}

export const AlarmOverlayModal: React.FC<AlarmOverlayModalProps> = ({
  alarm,
  onTaken,
  onSnooze,
  onSkip,
  onLogVital,
}) => {
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);

  useEffect(() => {
    if (alarm) {
      // Start looping alarm sound immediately
      startAlarmSound(alarm.alarmPreset || 'classic_alarm');
    } else {
      stopAlarmSound();
    }
    return () => {
      stopAlarmSound();
    };
  }, [alarm]);

  if (!alarm) return null;

  const handleActionTaken = () => {
    stopAlarmSound();
    if (alarm.type === 'vital' && onLogVital) {
      onLogVital(alarm);
    } else {
      onTaken(alarm);
    }
  };

  const handleActionSnooze = (minutes: number) => {
    stopAlarmSound();
    onSnooze(alarm, minutes);
    setShowSnoozePicker(false);
  };

  const handleActionSkip = () => {
    stopAlarmSound();
    onSkip(alarm);
    setConfirmSkip(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/30 bg-card/95 p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl"
        >
          {/* Animated Alarm Sound Wave Glow */}
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-red-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />

          {/* Pulsing Alarm Icon */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/30">
            <motion.div
              animate={{ rotate: [-8, 8, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut' }}
            >
              {alarm.type === 'medicine' ? (
                <Pill className="h-10 w-10" />
              ) : (
                <HeartPulse className="h-10 w-10" />
              )}
            </motion.div>
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
              <Volume2 className="h-3.5 w-3.5 animate-bounce" />
            </div>
          </div>

          {/* Alarm Subtitle */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 uppercase tracking-wider">
            <Bell className="h-3.5 w-3.5 animate-spin" />
            {alarm.type === 'medicine' ? 'Time For Your Medicine' : 'Time To Log Vitals'}
          </span>

          {/* Title & Dosage */}
          <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {alarm.title}
          </h2>
          {alarm.dosageOrContext && (
            <p className="mt-1 text-lg font-medium text-muted-foreground">
              {alarm.dosageOrContext}
            </p>
          )}

          {alarm.carePlanTitle && (
            <p className="mt-1 text-xs text-primary/80 font-medium">
              Care Plan: {alarm.carePlanTitle}
            </p>
          )}

          {/* Scheduled Time Display */}
          <div className="my-5 inline-flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Scheduled for {alarm.time}
          </div>

          {/* Confirm Skip Dialog */}
          {confirmSkip ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-4 text-left"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-foreground/90">
                  <p className="font-semibold text-sm text-foreground">
                    Are you sure you want to skip this dose?
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    This will be logged in your adherence history.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmSkip(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleActionSkip}
                >
                  Yes, Skip Dose
                </Button>
              </div>
            </motion.div>
          ) : showSnoozePicker ? (
            /* Snooze Options Picker */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/80 bg-muted/40 p-4 mb-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Snooze Alarm For
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl py-4 font-semibold text-sm"
                  onClick={() => handleActionSnooze(5)}
                >
                  5 min
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl py-4 font-semibold text-sm"
                  onClick={() => handleActionSnooze(15)}
                >
                  15 min
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl py-4 font-semibold text-sm"
                  onClick={() => handleActionSnooze(30)}
                >
                  30 min
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-muted-foreground"
                onClick={() => setShowSnoozePicker(false)}
              >
                Cancel Snooze
              </Button>
            </motion.div>
          ) : (
            /* Primary Alarm Buttons */
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
                onClick={handleActionTaken}
              >
                <CheckCircle2 className="h-5 w-5" />
                {alarm.type === 'medicine' ? 'Taken' : 'Log Reading Now'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-1.5 rounded-2xl border-border/80 py-5 font-semibold text-sm hover:bg-muted"
                  onClick={() => setShowSnoozePicker(true)}
                >
                  <RotateCcw className="h-4 w-4 text-amber-500" />
                  Snooze
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-2xl py-5 font-medium text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => setConfirmSkip(true)}
                >
                  Skip this dose
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
