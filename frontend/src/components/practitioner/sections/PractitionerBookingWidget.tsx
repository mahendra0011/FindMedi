import React, { useState } from 'react';
import {
  Calendar, Clock, Video, Building2, Phone, MessageSquare, Home,
  ShieldCheck, Check, ArrowRight, UserCheck, Users, Zap, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerBookingWidgetProps {
  practitioner: PractitionerDTO;
  selectedMode?: string;
  onSelectMode?: (mode: string) => void;
  onBookNow: (bookingDetails: {
    mode: string;
    date: string;
    time: string;
    patientType: 'self' | 'family' | 'other';
    fee: number;
  }) => void;
}

export default function PractitionerBookingWidget({
  practitioner,
  selectedMode: externalMode,
  onSelectMode,
  onBookNow,
}: PractitionerBookingWidgetProps) {
  const [internalMode, setInternalMode] = useState<string>('in_clinic');
  const activeMode = externalMode || internalMode;

  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM');
  const [patientType, setPatientType] = useState<'self' | 'family' | 'other'>('self');

  const baseFee = practitioner.fee ?? practitioner.consultation_fees ?? 500;

  // Available modes configuration
  const availableModes = practitioner.modes && practitioner.modes.length > 0
    ? practitioner.modes
    : [
        { mode: 'in_clinic', label: 'In-Clinic', fee: baseFee },
        { mode: 'video', label: 'Video Call', fee: baseFee },
        { mode: 'audio', label: 'Audio Call', fee: Math.round(baseFee * 0.8) },
        { mode: 'chat', label: 'Chat', fee: Math.round(baseFee * 0.6) },
      ];

  const currentModeObj = availableModes.find((m: any) => m.mode === activeMode) || availableModes[0];
  const consultFee = currentModeObj.fee != null ? currentModeObj.fee : baseFee;
  const platformFee = 0; // Free convenience fee on FindMedi
  const gst = 0; // Healthcare clinical consultation exempt from GST
  const totalAmount = consultFee + platformFee + gst;

  // Generate 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      index: i,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      isoString: d.toISOString().split('T')[0],
      isToday: i === 0,
      isTomorrow: i === 1,
      isOff: i === 6 || i === 13,
    };
  });

  const timeSlots = {
    morning: ['09:30 AM', '10:00 AM', '10:30 AM', '11:15 AM'],
    afternoon: ['01:00 PM', '02:30 PM', '03:15 PM'],
    evening: ['05:30 PM', '06:15 PM', '07:00 PM', '07:45 PM'],
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video className="w-3.5 h-3.5" />;
      case 'audio':
        return <Phone className="w-3.5 h-3.5" />;
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5" />;
      case 'home_visit':
        return <Home className="w-3.5 h-3.5" />;
      case 'in_clinic':
      default:
        return <Building2 className="w-3.5 h-3.5" />;
    }
  };

  const handleModeChange = (mode: string) => {
    setInternalMode(mode);
    onSelectMode?.(mode);
  };

  const handleProceed = () => {
    onBookNow({
      mode: activeMode,
      date: days[selectedDayIdx].isoString,
      time: selectedTimeSlot,
      patientType,
      fee: totalAmount,
    });
  };

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-5 shadow-lg sticky top-20">
      {/* Widget Header & Instant Confirm Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Instant Consultation Booking
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-foreground">₹{consultFee}</span>
            <span className="text-xs text-muted-foreground">per consultation</span>
          </div>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[10px] font-bold flex items-center gap-1">
          <Zap className="w-3 h-3 fill-emerald-600" />
          Instant Confirm
        </Badge>
      </div>

      {/* Mode Selector Tabs */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">Select Mode</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40">
          {availableModes.map((m: any) => {
            const isSelected = activeMode === m.mode;
            return (
              <button
                key={m.mode}
                type="button"
                onClick={() => handleModeChange(m.mode)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-card text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {getModeIcon(m.mode)}
                <span className="truncate">{m.label || m.mode.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Carousel (Next 14 days) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>Choose Date</span>
          <span className="text-primary text-[11px] font-medium">14 days open</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {days.map((d) => (
            <button
              key={d.index}
              type="button"
              onClick={() => setSelectedDayIdx(d.index)}
              className={`flex flex-col items-center justify-center min-w-[56px] py-2 px-1 rounded-2xl border text-xs transition-all ${
                selectedDayIdx === d.index
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : d.isOff
                  ? 'bg-muted/30 text-muted-foreground border-border/40 opacity-60'
                  : 'bg-card text-foreground border-border/50 hover:border-primary/40'
              }`}
            >
              <span className="text-[9px] uppercase font-semibold">
                {d.isToday ? 'Today' : d.isTomorrow ? 'Tmrw' : d.dayName}
              </span>
              <span className="text-sm font-black my-0.5">{d.dateNum}</span>
              <span className="text-[9px] opacity-80">{d.month}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Slot Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary" /> Available Slots
        </label>

        {days[selectedDayIdx].isOff ? (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center text-xs text-muted-foreground">
            No slots scheduled on this date.
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1.5">
              {[...timeSlots.morning, ...timeSlots.afternoon, ...timeSlots.evening].map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    selectedTimeSlot === slot
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'bg-card text-foreground border-border/50 hover:border-primary/40'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking For Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">Booking For</label>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {[
            { key: 'self', label: 'Myself' },
            { key: 'family', label: 'Family' },
            { key: 'other', label: 'Other' },
          ].map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => setPatientType(type.key as any)}
              className={`py-1.5 px-2 rounded-xl border text-center font-semibold transition-all ${
                patientType === type.key
                  ? 'bg-secondary text-secondary-foreground border-border shadow-xs'
                  : 'bg-card text-muted-foreground border-border/40 hover:text-foreground'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fee Breakdown & Follow-Up Window Callout */}
      <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Consultation Fee</span>
          <span>₹{consultFee}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Booking & Convenience Fee</span>
          <span className="text-emerald-600 font-bold">FREE</span>
        </div>
        <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border/30">
          <span>Total Payable</span>
          <span className="text-primary text-base">₹{totalAmount}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>Includes free 7-day follow-up consultation</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <Button
        onClick={handleProceed}
        className="w-full h-11 rounded-2xl font-bold text-sm shadow-md gap-2"
      >
        <span>Confirm & Book Slot</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-[10px] text-center text-muted-foreground">
        Free cancellation up to 2 hours before the slot time.
      </p>
    </div>
  );
}
