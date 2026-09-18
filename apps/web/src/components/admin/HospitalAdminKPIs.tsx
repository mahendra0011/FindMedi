'use client';

import React from 'react';
import { Users, Stethoscope, CalendarDays, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HospitalAdminKPIsProps {
  totalPatients?: number;
  totalDoctors?: number;
  todayAppointments?: number;
  revenue?: number;
}

export default function HospitalAdminKPIs({
  totalPatients,
  totalDoctors,
  todayAppointments,
  revenue,
}: HospitalAdminKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPatients?.toLocaleString() ?? 0}</p>
          <p className="text-xs text-muted-foreground">Registered Patients</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Stethoscope className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDoctors?.toLocaleString() ?? 0}</p>
          <p className="text-xs text-muted-foreground">Active Specialists</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
            <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{todayAppointments?.toLocaleString() ?? 0}</p>
          <p className="text-xs text-muted-foreground">Today&apos;s Appointments</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">₹{(revenue ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Daily Inflow</p>
        </CardContent>
      </Card>
    </div>
  );
}
