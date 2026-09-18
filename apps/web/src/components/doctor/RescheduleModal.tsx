'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getISTDateString } from '@/lib/dateUtils';

export interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  timeSlots?: string[];
  bookedSlots?: string[];
  dateDisabledSlots?: string[];
}

const DEFAULT_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
];

export default function RescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  timeSlots = DEFAULT_TIME_SLOTS,
  bookedSlots = [],
  dateDisabledSlots = [],
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!newDate || !newTime) return;
    onConfirm(newDate, newTime);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Reschedule Appointment</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">New Date</label>
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={getISTDateString()}
            />
          </div>
          {newDate && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">New Time</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map(t => {
                  const isBooked = bookedSlots.includes(t);
                  const isDisabled = dateDisabledSlots.includes(t);
                  const isUnavailable = isBooked || isDisabled;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => !isUnavailable && setNewTime(t)}
                      disabled={isUnavailable}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        newTime === t
                          ? 'bg-primary text-primary-foreground'
                          : isUnavailable
                          ? 'bg-muted/40 text-muted-foreground cursor-not-allowed'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {t}
                      {isBooked && <span className="ml-1 text-[9px]">(full)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!newDate || !newTime}>
            Confirm
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
