'use client';

import React from 'react';
import { DollarSign, Clock, Stethoscope, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FinancialMetricsCardsProps {
  totalEarnings?: number;
  pendingPayoutAmount?: number;
  totalDoctors?: number;
  pendingCount?: number;
}

export default function FinancialMetricsCards({
  totalEarnings = 0,
  pendingPayoutAmount = 0,
  totalDoctors = 0,
  pendingCount = 0,
}: FinancialMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">₹{totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Platform Commission</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">₹{pendingPayoutAmount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pending Payouts</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-3">
            <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDoctors.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Doctors</p>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pending Approvals</p>
        </CardContent>
      </Card>
    </div>
  );
}
