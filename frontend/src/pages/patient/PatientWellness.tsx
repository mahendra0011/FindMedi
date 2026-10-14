import React, { useState } from 'react';
import {
  Activity, Heart, Droplets, Moon, Smile, Sparkles,
  PhoneCall, ShieldCheck, Flame, Trophy, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientWellness() {
  const [waterGlasses, setWaterGlasses] = useState(6);
  const [selectedMood, setSelectedMood] = useState<string | null>('Calm');

  const moods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '😰', label: 'Anxious' },
    { emoji: '😔', label: 'Low' },
  ];

  const handleAddWater = () => {
    setWaterGlasses((w) => w + 1);
    toast.success('Glass of water logged! Stay hydrated.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Holistic Wellness & Daily Habits</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track daily movement, nutrition, hydration, and check in on your mental wellbeing in a 100% private space.
          </p>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs font-semibold flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> 100% On-Device Private Data
        </Badge>
      </div>

      {/* Wellness Cards Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Fitness Card */}
        <div className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Movement</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>

          <div className="space-y-1">
            <span className="text-3xl font-black text-foreground">7,420</span>
            <span className="text-xs text-muted-foreground block">of 10,000 steps goal</span>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '74%' }} />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>🔥 420 kcal burned</span>
            <span>⏱️ 45m active</span>
          </div>
        </div>

        {/* Hydration Card */}
        <div className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hydration</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>

          <div className="space-y-1">
            <span className="text-3xl font-black text-foreground">{waterGlasses} <span className="text-sm font-normal text-muted-foreground">/ 10 glasses</span></span>
            <span className="text-xs text-muted-foreground block">{(waterGlasses * 250) / 1000}L consumed today</span>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(waterGlasses * 10, 100)}%` }} />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddWater}
            className="w-full rounded-xl text-xs h-8 font-semibold gap-1"
          >
            <Droplets className="w-3.5 h-3.5 text-blue-500" /> + Add 1 Glass (250ml)
          </Button>
        </div>

        {/* Sleep Card */}
        <div className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sleep Quality</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="space-y-1">
            <span className="text-3xl font-black text-foreground">7h 25m</span>
            <span className="text-xs text-muted-foreground block">Restorative Sleep</span>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '92%' }} />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>💤 92% Sleep Efficiency</span>
            <span>Deep: 1h 40m</span>
          </div>
        </div>
      </div>

      {/* Mental Wellbeing Mood Check-In */}
      <div className="p-6 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Daily Emotional Wellbeing Check-In</h2>
            <p className="text-xs text-muted-foreground">
              How are you feeling right now? Your logs remain strictly private on your profile.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {moods.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => {
                setSelectedMood(m.label);
                toast.success(`Mood logged as ${m.label}.`);
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-2xl border text-xs font-semibold transition-all ${
                selectedMood === m.label
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-border'
              }`}
            >
              <span className="text-lg">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* 24x7 Mental Health Crisis Hotline Callout */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <PhoneCall className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-400">Need someone to talk to right now?</p>
              <p className="text-muted-foreground text-[11px]">
                Govt. of India 24x7 National Tele-Mental Health Helpline: <strong className="text-rose-700 dark:text-rose-300">Tele-MANAS: 14416 (Toll-Free)</strong> or dial <strong className="text-rose-700 dark:text-rose-300">112</strong>.
              </p>
            </div>
          </div>

          <a
            href="tel:14416"
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Call 14416
          </a>
        </div>
      </div>
    </div>
  );
}
