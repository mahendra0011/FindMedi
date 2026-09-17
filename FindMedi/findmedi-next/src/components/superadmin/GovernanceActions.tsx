'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Clock, Users, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GovernanceActionsProps {
  pendingCount: number;
}

export default function GovernanceActions({ pendingCount }: GovernanceActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Superadmin Governance & Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/superadmin/pending"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
          >
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Review Pending{pendingCount > 0 && ` (${pendingCount})`}
            </span>
          </Link>
          <Link
            href="/superadmin/users"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Manage Users</span>
          </Link>
          <Link
            href="/superadmin/revenue"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
          >
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Revenue Details</span>
          </Link>
          <Link
            href="/superadmin/tickets"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors"
          >
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Support Tickets</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
