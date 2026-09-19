import React from 'react';
import { User, Users } from 'lucide-react';

interface SOSReporterModeSelectProps {
  selected: 'self' | 'other' | null;
  onSelect: (mode: 'self' | 'other') => void;
}

export default function SOSReporterModeSelect({ selected, onSelect }: SOSReporterModeSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      {/* Option 1: For Myself */}
      <button
        type="button"
        onClick={() => onSelect('self')}
        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
          selected === 'self'
            ? 'border-red-600 bg-red-500/10 dark:bg-red-500/15 ring-2 ring-red-500/30'
            : 'border-border/80 bg-card hover:border-red-400 hover:bg-muted/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          {selected === 'self' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
              Selected
            </span>
          )}
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">For Myself</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Auto-fills your medical details, blood group, allergies, and current GPS.
          </p>
        </div>
      </button>

      {/* Option 2: For Someone Else */}
      <button
        type="button"
        onClick={() => onSelect('other')}
        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
          selected === 'other'
            ? 'border-red-600 bg-red-500/10 dark:bg-red-500/15 ring-2 ring-red-500/30'
            : 'border-border/80 bg-card hover:border-red-400 hover:bg-muted/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          {selected === 'other' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
              Selected
            </span>
          )}
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">For Someone Else</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Report an accident, bystander emergency, or family member in distress.
          </p>
        </div>
      </button>
    </div>
  );
}
