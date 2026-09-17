'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeeklyAppointmentsItem {
  day: string;
  count: number;
}

interface WeeklyActivityChartProps {
  weeklyAppointments: WeeklyAppointmentsItem[];
}

export default function WeeklyActivityChart({ weeklyAppointments }: WeeklyActivityChartProps) {
  const maxWeekly = Math.max(...weeklyAppointments.map((w) => w.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Weekly Appointments Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-44 pt-4">
          {weeklyAppointments.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-foreground">{w.count}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(w.count / maxWeekly) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full bg-primary/25 hover:bg-primary/40 rounded-t-lg transition-colors cursor-pointer"
                style={{ minHeight: w.count > 0 ? '8px' : '4px' }}
              />
              <span className="text-[10px] text-muted-foreground">{w.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
