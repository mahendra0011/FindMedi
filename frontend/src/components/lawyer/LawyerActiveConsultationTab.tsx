import React from 'react';
import { BookingStatusPanel } from './BookingStatusPanel';

export interface LawyerActiveConsultationTabProps {
  activeBooking: any;
  user: any;
  fetchDashboardData: () => Promise<void>;
}

export const LawyerActiveConsultationTab: React.FC<LawyerActiveConsultationTabProps> = ({
  activeBooking,
  user,
  fetchDashboardData,
}) => {
  return (
    <div>
      {activeBooking ? (
        <BookingStatusPanel
          booking={activeBooking}
          currentUser={user}
          isLawyer={true}
          onRefresh={fetchDashboardData}
        />
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No active consultation in progress. Accept an incoming request to start an advisory session.
        </div>
      )}
    </div>
  );
};
