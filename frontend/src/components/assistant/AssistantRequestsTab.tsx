import React from 'react';
import {
  Bell,
  Briefcase,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AssistantRequestsTabProps {
  incomingRequests: any[];
  filteredRequests: any[];
  requestFilter: 'all' | 'urgent' | 'scheduled';
  setRequestFilter: (filter: 'all' | 'urgent' | 'scheduled') => void;
  setActiveTab: (tab: string) => void;
  getAssistantGross: (booking: any) => number;
  getAssistantNet: (booking: any) => number;
  serviceCategories: Array<{ id: string; label: string; icon: string }>;
  setDeclineTargetId: (id: string) => void;
  handleAcceptRequest: (id: string) => void;
}

export const AssistantRequestsTab: React.FC<AssistantRequestsTabProps> = ({
  incomingRequests,
  filteredRequests,
  requestFilter,
  setRequestFilter,
  setActiveTab,
  getAssistantGross,
  getAssistantNet,
  serviceCategories,
  setDeclineTargetId,
  handleAcceptRequest,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" />
            Incoming Patient Shift Requests
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and accept requests from patients in your service areas
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-stretch sm:self-auto">
          {[
            { id: 'all', label: `All (${incomingRequests.length})` },
            { id: 'urgent', label: '🚨 Urgent Only' },
            { id: 'scheduled', label: '📅 Scheduled' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRequestFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                requestFilter === f.id
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No Pending Requests Available
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Keep your status toggled <strong className="text-emerald-600">"Online"</strong> to receive incoming requests. Also ensure you have added all nearby hospitals in your profile.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="rounded-xl text-xs font-bold"
          >
            Manage Service Areas & Rates
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const gross = getAssistantGross(req);
            const net = getAssistantNet(req);
            return (
              <div
                key={req._id}
                className="p-5 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/40 bg-white dark:bg-slate-900 shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {req.isUrgent && (
                        <Badge className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide">
                          🚨 URGENT DISPATCH
                        </Badge>
                      )}
                      <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold uppercase">
                        {req.durationType?.toUpperCase()} SHIFT
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">
                        #{req.bookingNumber || req._id.slice(-6)}
                      </span>
                    </div>

                    <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5 pt-0.5">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      {req.hospital}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Patient: <strong className="text-slate-900 dark:text-slate-200">{req.patientId?.name || 'Verified Patient'}</strong> • Reporting: {new Date(req.scheduledDate).toLocaleDateString()} at {req.startTime}
                    </p>
                  </div>

                  {/* Financial summary */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-right min-w-[140px] self-end sm:self-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Your Net Earning
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{net}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Gross: ₹{gross} (10% fee)
                    </span>
                  </div>
                </div>

                {/* Required Services & Instructions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {req.serviceCategories?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-semibold mr-1">Required:</span>
                      {req.serviceCategories.map((c: string) => {
                        const cat = serviceCategories.find((s) => s.id === c);
                        return (
                          <Badge
                            key={c}
                            variant="secondary"
                            className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800"
                          >
                            {cat ? `${cat.icon} ${cat.label}` : c}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {req.specialInstructions && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900 dark:text-amber-200 text-xs italic">
                      <span className="font-bold not-italic">Patient Note: </span>
                      "{req.specialInstructions}"
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeclineTargetId(req._id)}
                    className="text-xs text-rose-600 hover:text-rose-700 border-slate-200 dark:border-slate-800 font-bold px-4 h-9 rounded-xl"
                  >
                    Decline Request
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAcceptRequest(req._id)}
                    className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-black px-6 h-9 rounded-xl shadow-md shadow-teal-600/20"
                  >
                    Accept & Confirm Shift
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
