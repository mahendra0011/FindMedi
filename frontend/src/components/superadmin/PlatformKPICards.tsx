'use client';

import React from 'react';
import { Hospital, Building2, Users, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PlatformKPICardsProps {
  hospitalCount: number;
  facilityCount: number;
  userCount: number;
  todayAppointments?: number;
}

export default function PlatformKPICards({
  hospitalCount,
  facilityCount,
  userCount,
  todayAppointments = 0,
}: PlatformKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
            <Hospital className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{(hospitalCount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Hospitals</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{(facilityCount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Clinics, Labs & Pharmacies</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{(userCount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Registered Users</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{(todayAppointments || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Today&apos;s Bookings</p>
        </CardContent>
      </Card>
    </div>
  );
}
