import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Pill,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const TodayHealthWidget: React.FC = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [adherenceScore, setAdherenceScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [remRes, adhRes, cpRes] = await Promise.allSettled([
        api.getMedicineReminders({ status: 'active' }),
        api.getMedicineAdherence({ days: 30 }),
        api.getCarePlans(),
      ]);

      if (remRes.status === 'fulfilled') {
        setReminders(remRes.value.reminders || []);
      }
      if (adhRes.status === 'fulfilled') {
        setAdherenceScore(adhRes.value.adherenceScore);
      }
      if (cpRes.status === 'fulfilled') {
        setCarePlans(cpRes.value.carePlans || []);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickMarkTaken = async (remId: string, time: string) => {
    try {
      await api.respondMedicineDose(remId, {
        status: 'taken',
        scheduledAt: new Date().toISOString(),
      });
      toast.success('Dose marked as taken');
      loadData();
    } catch {
      toast.error('Failed to mark dose');
    }
  };

  if (loading || (reminders.length === 0 && carePlans.length === 0)) {
    return null; // Don't take up space if user hasn't set up health tracking
  }

  // Get active doses due
  const todayDueMeds = reminders.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-card to-card p-5 sm:p-6 shadow-sm relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 border border-teal-500/20 shadow-sm">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                Today's Health & Care Plan Tasks
              </h3>
              {adherenceScore != null && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  {adherenceScore}% Adherence
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily medicine schedule and home vitals check
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/patient/medicine-reminders')}
            className="rounded-xl text-xs gap-1 border-border/80"
          >
            <Pill className="h-3.5 w-3.5 text-blue-500" />
            Reminders
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/patient/vitals')}
            className="rounded-xl text-xs gap-1 border-border/80"
          >
            <Activity className="h-3.5 w-3.5 text-rose-500" />
            Log Vitals
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patient/care-plans')}
            className="rounded-xl text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 gap-1 font-semibold"
          >
            Care Plans <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Grid of Today's Doses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {todayDueMeds.map((rem) => {
          const firstTime = rem.times?.[0] || '08:00';
          return (
            <div
              key={rem._id}
              className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <p className="font-bold text-sm text-foreground truncate">
                  {rem.medicineName}
                </p>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-primary" /> {firstTime} · {rem.dosage}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickMarkTaken(rem._id, firstTime)}
                className="h-8 rounded-xl px-2.5 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Taken
              </Button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
