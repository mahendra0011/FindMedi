import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LawyerRequestsTabProps {
  incomingRequests: any[];
  handleAcceptRequest: (bookingId: string) => Promise<boolean>;
  handleDeclineRequest: (bookingId: string) => Promise<void>;
  proposingId: string | null;
  setProposingId: (id: string | null) => void;
  proposedTime: string;
  setProposedTime: (val: string) => void;
  handleProposeTime: (bookingId: string) => Promise<void>;
}

export const LawyerRequestsTab: React.FC<LawyerRequestsTabProps> = ({
  incomingRequests,
  handleAcceptRequest,
  handleDeclineRequest,
  proposingId,
  setProposingId,
  proposedTime,
  setProposedTime,
  handleProposeTime,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Incoming Consultation Requests
      </h3>

      {incomingRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No pending requests. When clients book consultations in your practice categories, they will appear here in real time.
        </div>
      ) : (
        <div className="space-y-3">
          {incomingRequests.map((req) => (
            <div
              key={req._id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    {(req.userId?.name || 'Client').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {req.userId?.name || 'Client'}
                    </h4>
                    <div className="text-xs text-slate-500 capitalize">
                      Category: {req.category?.replace(/_/g, ' ')} • Mode: {req.consultationMode?.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-slate-900 dark:text-slate-100">
                    ₹{req.fee || 500}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {req.urgency === 'urgent' ? '⚡ Urgent Request' : 'Scheduled'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
                <strong>Issue Summary:</strong> "{req.caseDescription}"
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeclineRequest(req._id)}
                  className="rounded-xl text-xs text-rose-600"
                >
                  Decline
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProposingId(proposingId === req._id ? null : req._id)}
                  className="rounded-xl text-xs"
                >
                  Propose New Time
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAcceptRequest(req._id)}
                  className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold"
                >
                  Accept Consultation
                </Button>
              </div>

              {/* Propose Alternate Time Input */}
              {proposingId === req._id && (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center gap-2 text-xs">
                  <Input
                    type="datetime-local"
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleProposeTime(req._id)}
                    className="bg-slate-900 text-white rounded-xl text-xs h-8 shrink-0"
                  >
                    Send Offer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
