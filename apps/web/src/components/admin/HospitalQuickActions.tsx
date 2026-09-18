'use client';

import React from 'react';
import Link from 'next/link';
import { Stethoscope, Bed, Hospital, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HospitalQuickActionsProps {
  occupiedBeds?: number;
  totalBeds?: number;
}

export default function HospitalQuickActions({
  occupiedBeds = 28,
  totalBeds = 60,
}: HospitalQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Link href="/admin/doctors" className="block">
        <Card className="hover:border-primary/50 transition-all cursor-pointer">
          <CardContent className="p-4 text-center">
            <Stethoscope className="w-6 h-6 mx-auto text-primary mb-1.5" />
            <p className="font-semibold text-sm text-foreground">Doctor Roster</p>
            <p className="text-xs text-muted-foreground">Manage shifts</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/beds" className="block">
        <Card className="hover:border-primary/50 transition-all cursor-pointer">
          <CardContent className="p-4 text-center">
            <Bed className="w-6 h-6 mx-auto text-emerald-500 mb-1.5" />
            <p className="font-semibold text-sm text-foreground">Bed Management</p>
            <p className="text-xs text-muted-foreground">
              {occupiedBeds}/{totalBeds} Occupied
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/departments" className="block">
        <Card className="hover:border-primary/50 transition-all cursor-pointer">
          <CardContent className="p-4 text-center">
            <Hospital className="w-6 h-6 mx-auto text-purple-500 mb-1.5" />
            <p className="font-semibold text-sm text-foreground">Departments</p>
            <p className="text-xs text-muted-foreground">OPD & IPD wards</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/analytics" className="block">
        <Card className="hover:border-primary/50 transition-all cursor-pointer">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto text-amber-500 mb-1.5" />
            <p className="font-semibold text-sm text-foreground">Analytics</p>
            <p className="text-xs text-muted-foreground">Reports & metrics</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
