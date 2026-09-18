'use client';

import React from 'react';
import { AlertCircle, FileText, Clock } from 'lucide-react';
import type { LabBookingRecord } from './BookingsHub';

interface PendingReportsSectionProps {
  bookings: LabBookingRecord[];
}

export default function PendingReportsSection({ bookings }: PendingReportsSectionProps) {
  const pendingList = bookings.filter((b) => b.status !== 'Completed');

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Reports
        </h2>
      </div>

      {pendingList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No pending reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingList.slice(0, 5).map((b) => (
            <div key={b._id || b.id} className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">{b.patientName || b.patient}</p>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  In Progress
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{(b.tests || []).join(', ')}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {b.timeSlot || b.time || 'Scheduled'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
