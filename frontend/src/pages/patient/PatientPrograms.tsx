import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Calendar, Clock, QrCode, PauseCircle, PlayCircle,
  RotateCcw, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientPrograms() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const [programs, setPrograms] = useState([
    {
      id: 'prg-1',
      title: 'Diabetes Remission & Lifestyle Management Program',
      provider: 'Apollo Sugar Clinics & Health',
      type: 'Chronic Care',
      plan: '3-Month Guided Plan',
      status: 'Active',
      startDate: '1 Oct 2026',
      endDate: '31 Dec 2026',
      daysLeft: 78,
      coach: 'Dr. Neha Varma (Diabetologist) & Ritu Saxena (Dietitian)',
      progressPercent: 35,
      sessionsCompleted: '4 of 12 consults',
      nextMilestone: 'HbA1c Mid-Term Review on 15 Nov 2026',
    },
    {
      id: 'prg-2',
      title: 'Unlimited Studio & Yoga Pass',
      provider: 'Cult.Fit Partner Studio, Green Park',
      type: 'Fitness / Yoga',
      plan: 'Annual Pass',
      status: 'Active',
      startDate: '15 Aug 2026',
      endDate: '14 Aug 2027',
      daysLeft: 304,
      freezeDaysLeft: 25,
      isFrozen: false,
      progressPercent: 20,
      sessionsCompleted: '28 sessions attended',
      nextMilestone: 'Class tomorrow: Hatha Yoga (07:00 AM)',
    },
    {
      id: 'prg-3',
      title: 'Post-Op Knee Rehab Package (10 Sessions)',
      provider: 'Dr. Vivek Physio Rehab Center',
      type: 'Physiotherapy Series',
      plan: '10 Sessions Pack',
      status: 'Active',
      startDate: '5 Oct 2026',
      endDate: '5 Nov 2026',
      daysLeft: 22,
      progressPercent: 60,
      sessionsCompleted: '6 of 10 completed',
      nextMilestone: 'Home Session #7 on Thursday (04:30 PM)',
    },
  ]);

  const handleToggleFreeze = (id: string) => {
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextState = !p.isFrozen;
          toast.success(nextState ? 'Membership frozen for 14 days.' : 'Membership resumed successfully.');
          return { ...p, isFrozen: nextState };
        }
        return p;
      })
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Programs & Memberships</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your chronic care plans, fitness passes, recurring dialysis/physio packs, and subscriptions.
          </p>
        </div>

        <Link to="/patient/services">
          <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Explore New Programs
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Active Subscriptions ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Past / Completed
        </button>
      </div>

      {/* Programs List */}
      <div className="space-y-4">
        {programs.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    {item.type}
                  </Badge>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.isFrozen
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {item.isFrozen ? 'Temporarily Frozen' : 'Active'}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">{item.title}</h2>
                <p className="text-xs text-muted-foreground">{item.provider} • <strong className="text-foreground">{item.plan}</strong></p>
              </div>

              <div className="text-right sm:shrink-0">
                <span className="text-xs text-muted-foreground block">Validity</span>
                <span className="text-sm font-extrabold text-foreground">{item.daysLeft} days remaining</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress: {item.sessionsCompleted}</span>
                <span className="font-bold text-foreground">{item.progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Milestone callout */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Next Milestone: {item.nextMilestone}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.freezeDaysLeft != null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleFreeze(item.id)}
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    {item.isFrozen ? (
                      <><PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> Resume Pass</>
                    ) : (
                      <><PauseCircle className="w-3.5 h-3.5 text-amber-600" /> Freeze Pass ({item.freezeDaysLeft}d left)</>
                    )}
                  </Button>
                )}

                <Button
                  size="sm"
                  className="h-7 text-xs rounded-lg font-semibold"
                  onClick={() => toast.info('Navigating to program session scheduler...')}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
