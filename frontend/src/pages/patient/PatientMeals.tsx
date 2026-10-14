import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed, Calendar, Clock, AlertCircle, PauseCircle, PlayCircle,
  SkipForward, ShieldCheck, CheckCircle2, ChevronRight, Sparkles, MapPin, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientMeals() {
  const [subscriptions, setSubscriptions] = useState([
    {
      id: 'sub-meal-1',
      planName: 'Diabetic & Renal-Safe Low-Sodium Meal Plan',
      kitchen: 'NutriCare Clinical Diet Kitchen',
      status: 'Active',
      dietType: 'Vegetarian · Low Glycemic',
      caloriesPerMeal: '450 - 500 kcal',
      daysRemaining: 18,
      startDate: '1 Oct 2026',
      endDate: '31 Oct 2026',
      mealsPerDay: 'Lunch & Dinner (2 Meals/day)',
      nextDelivery: 'Today, 12:45 PM (Lunch)',
      deliveryAddress: 'Flat 402, Green Park Residency, New Delhi',
      allergiesLogged: 'No Peanuts · No Refined Sugar',
      paused: false,
    },
  ]);

  const handlePause = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, paused: !s.paused } : s))
    );
    toast.success('Meal plan delivery status updated.');
  };

  const handleSkipNext = (id: string) => {
    toast.success('Next meal skipped. Your billing cycle has been automatically extended by 1 day.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Clinical Diet & Meal Subscriptions
            </h1>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Flow D: Subscriptions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your daily therapeutic meal plans, pause deliveries, skip days, or adjust dietitian instructions.
          </p>
        </div>

        <Link to="/healthcare?category=diet_kitchen">
          <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Explore Diet Kitchens
          </Button>
        </Link>
      </div>

      {/* Active Subscriptions List */}
      <div className="space-y-4">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="bg-card border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                    {sub.paused ? 'Paused' : 'Active Delivery'}
                  </Badge>
                  <span className="text-xs font-semibold text-primary">{sub.kitchen}</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">{sub.planName}</h3>
                <p className="text-xs text-muted-foreground">{sub.dietType} · {sub.caloriesPerMeal}</p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-[11px] text-muted-foreground block">Subscription Remaining</span>
                <span className="text-lg font-extrabold text-foreground">{sub.daysRemaining} Days</span>
              </div>
            </div>

            {/* Next Delivery Track Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-muted/40 border text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Next Scheduled Drop
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{sub.nextDelivery}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Delivery Pin
                </span>
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground truncate">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate">{sub.deliveryAddress}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Allergen Filter
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{sub.allergiesLogged}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => handleSkipNext(sub.id)}
                >
                  <SkipForward className="w-3 h-3 text-muted-foreground" /> Skip Tomorrow's Meals
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => handlePause(sub.id)}
                >
                  {sub.paused ? (
                    <>
                      <PlayCircle className="w-3 h-3 text-emerald-600" /> Resume Subscription
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-3 h-3 text-amber-600" /> Pause Subscription
                    </>
                  )}
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground">
                FSSAI Lic. #10022011000841 · Strict Clinical Nutrition Standards
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
