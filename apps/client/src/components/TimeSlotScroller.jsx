import React, { useState, useMemo, useEffect } from 'react';

/**
 * Parses time like "09:15 AM" into a numerical value for sorting.
 */
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let [_, h, m, period] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (period && period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period && period.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Formats a time value like { hour: 9, minute: 0 } to "09:00 AM"
 */
function formatTimeLabel(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Generate all working hours from startHour to endHour.
 * Default: 9:00 AM to 5:00 PM
 */
function generateWorkingHours(startHour = 9, endHour = 17) {
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push({
      label: formatTimeLabel(h, 0),
      hour: h,
    });
  }
  return hours;
}

/**
 * Generate 15-min sub-slots for a given hour.
 * e.g. hour=9 → ["09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM"]
 */
function generateSubSlots(hour) {
  const slots = [];
  for (let m = 0; m < 60; m += 15) {
    slots.push(formatTimeLabel(hour, m));
  }
  return slots;
}

/**
 * TimeSlotScroller - Shows all working hours (9:00 AM - 5:00 PM) with 15-min sub-slots.
 * 
 * Props:
 *   appointments - Array of appointment objects
 *   activeApt - Currently selected appointment
 *   onSelectApt - Callback when an appointment is selected
 *   onSelectHour - Callback when an hour is selected (optional)
 *   selectedHour - Currently selected hour (controlled)
 *   selectedSubSlot - Currently selected sub-slot (controlled)
 *   onSelectSubSlot - Callback when a sub-slot is selected
 */
export default function TimeSlotScroller({ 
  appointments = [], 
  activeApt, 
  onSelectApt,
  selectedHour: externalSelectedHour,
  onSelectHour: externalOnSelectHour,
  selectedSubSlot: externalSelectedSubSlot,
  onSelectSubSlot: externalOnSelectSubSlot,
}) {
  const [internalSelectedHour, setInternalSelectedHour] = useState(null);
  const [internalSelectedSubSlot, setInternalSelectedSubSlot] = useState(null);

  // Use external state if provided, otherwise internal
  const selectedHour = externalSelectedHour !== undefined ? externalSelectedHour : internalSelectedHour;
  const selectedSubSlot = externalSelectedSubSlot !== undefined ? externalSelectedSubSlot : internalSelectedSubSlot;
  
  const setSelectedHour = externalOnSelectHour || setInternalSelectedHour;
  const setSelectedSubSlot = externalOnSelectSubSlot || setInternalSelectedSubSlot;

  // Working hours: 9:00 AM to 5:00 PM
  const workingHours = useMemo(() => generateWorkingHours(9, 17), []);

  // Build a map of time → appointment for quick lookup
  const appointmentMap = useMemo(() => {
    const map = {};
    appointments.forEach(apt => {
      if (apt.time) {
        map[apt.time] = apt;
      }
    });
    return map;
  }, [appointments]);

  // Auto-select first hour on mount
  useEffect(() => {
    if (!selectedHour && workingHours.length > 0) {
      // Find the first hour that has appointments, or use the first hour
      const firstHourWithAppts = workingHours.find(h => {
        const subSlots = generateSubSlots(h.hour);
        return subSlots.some(s => appointmentMap[s]);
      });
      setSelectedHour(firstHourWithAppts?.label || workingHours[0].label);
    }
  }, [appointments, workingHours]);

  // Generate sub-slots for the selected hour
  const subSlots = useMemo(() => {
    if (!selectedHour) return [];
    const hour = workingHours.find(h => h.label === selectedHour);
    if (!hour) return [];
    return generateSubSlots(hour.hour);
  }, [selectedHour, workingHours]);

  // Auto-select sub-slot based on activeApt
  useEffect(() => {
    if (activeApt?.time && subSlots.includes(activeApt.time)) {
      setSelectedSubSlot(activeApt.time);
    }
  }, [activeApt, subSlots]);

  // When hour changes, auto-select first sub-slot with an appointment
  useEffect(() => {
    if (selectedHour && !selectedSubSlot) {
      const firstWithAppt = subSlots.find(s => appointmentMap[s]);
      if (firstWithAppt) {
        setSelectedSubSlot(firstWithAppt);
      }
    }
  }, [selectedHour, subSlots, appointmentMap]);

  const handleHourClick = (hourLabel) => {
    if (selectedHour === hourLabel) {
      setSelectedHour(null);
      setSelectedSubSlot(null);
    } else {
      setSelectedHour(hourLabel);
      setSelectedSubSlot(null);
    }
  };

  const handleSubSlotClick = (time) => {
    const apt = appointmentMap[time];
    if (apt) {
      if (onSelectApt) onSelectApt(apt);
      setSelectedSubSlot(time);
    }
  };

  const getPatientsForSubSlot = (time) => {
    const apt = appointmentMap[time];
    return apt ? [apt] : [];
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hours Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {workingHours.map((hour) => {
          const subSlotsForHour = generateSubSlots(hour.hour);
          const hasAppts = subSlotsForHour.some(s => appointmentMap[s]);
          const apptCount = subSlotsForHour.filter(s => appointmentMap[s]).length;
          
          return (
            <button
              key={hour.label}
              onClick={() => handleHourClick(hour.label)}
              className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                selectedHour === hour.label 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : hasAppts
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
              }`}
            >
              {hour.label}
              {apptCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {apptCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-slots Scroller */}
      {selectedHour && subSlots.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {subSlots.map((time) => {
            const apt = appointmentMap[time];
            const isSelected = selectedSubSlot === time;
            const hasAppt = !!apt;
            
            return (
              <button
                key={time}
                onClick={() => handleSubSlotClick(time)}
                disabled={!hasAppt}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-primary/20 text-primary border-primary/30 shadow-sm'
                    : hasAppt
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                      : 'bg-muted/20 text-muted-foreground/40 border-border/30 cursor-not-allowed'
                }`}
              >
                <span>{time}</span>
                {hasAppt && apt && (
                  <span className="ml-1.5 text-[10px] opacity-75">
                    ({apt.patient?.split(' ')[0] || '?'})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No appointments message */}
      {selectedHour && subSlots.length > 0 && !subSlots.some(s => appointmentMap[s]) && (
        <p className="text-xs text-muted-foreground text-center py-2 italic">
          No appointments for {selectedHour}
        </p>
      )}
    </div>
  );
}