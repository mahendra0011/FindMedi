import React from 'react';
import { Flame, HeartPulse, Wind, Car, ShieldAlert, Activity, HelpCircle } from 'lucide-react';

interface SOSCategoryPickerProps {
  selected: string;
  onSelect: (cat: string) => void;
}

const CATEGORIES = [
  { id: 'accident', label: 'Accident / Trauma', icon: Car, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  { id: 'heart_attack', label: 'Heart Attack / Chest Pain', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-500/10' },
  { id: 'breathing_issue', label: 'Breathing / Choking', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  { id: 'stroke', label: 'Stroke / Seizure', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  { id: 'burn', label: 'Burn / Fire', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-500/10' },
  { id: 'fall', label: 'Severe Fall / Fracture', icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  { id: 'other', label: 'Other Critical Emergency', icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-500/10' },
];

export default function SOSCategoryPicker({ selected, onSelect }: SOSCategoryPickerProps) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-foreground">
          Emergency Category (Optional — Helps ambulance prepare equipment)
        </label>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selected === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(isSelected ? '' : cat.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'border-red-600 bg-red-500/15 ring-2 ring-red-500/30'
                  : 'border-border/80 bg-card hover:border-red-300 hover:bg-muted/30'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg ${cat.bg} ${cat.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-foreground truncate">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
