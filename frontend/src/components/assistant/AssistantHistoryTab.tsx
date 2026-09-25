import React from 'react';
import {
  History,
  Search,
  Building2,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AssistantHistoryTabProps {
  history: any[];
  filteredHistory: any[];
  historySearch: string;
  setHistorySearch: (search: string) => void;
  historyStatusFilter: string;
  setHistoryStatusFilter: (status: string) => void;
  profile: any;
  setHistoryDetailBooking: (booking: any) => void;
  downloadingPdfId: string | null;
  handleDownloadReceipt: (bookingId: string, bookingNumber: string) => void;
}

export const AssistantHistoryTab: React.FC<AssistantHistoryTabProps> = ({
  history,
  filteredHistory,
  historySearch,
  setHistorySearch,
  historyStatusFilter,
  setHistoryStatusFilter,
  profile,
  setHistoryDetailBooking,
  downloadingPdfId,
  handleDownloadReceipt,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            Past Shifts & Performance Records
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete record of your past hospital sessions, patient ratings, and downloadable receipts
          </p>
        </div>

        {/* History Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search patient, hospital..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl w-full sm:w-56"
            />
          </div>

          <select
            value={historyStatusFilter}
            onChange={(e) => setHistoryStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="cancelled_by_patient">Cancelled by Patient</option>
            <option value="cancelled_by_assistant">Cancelled by Me</option>
          </select>
        </div>
      </div>

      {/* History Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Logged Shifts</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">
            {history.length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Completed Successfully</span>
          <span className="text-lg font-black text-emerald-600">
            {history.filter((h) => h.status === 'completed').length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Total Earned</span>
          <span className="text-lg font-black text-teal-600">
            ₹{history
              .filter((h) => h.status === 'completed')
              .reduce((sum, h) => sum + Math.round((h.cost?.total || 0) * 0.9), 0)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-center">
          <span className="text-[11px] text-slate-400 block font-medium">Avg Satisfaction</span>
          <span className="text-lg font-black text-amber-500">
            ⭐ {profile?.rating?.avg?.toFixed(1) || '5.0'}
          </span>
        </div>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2">
          <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
          <p>No past shift records matching your search or filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Hospital</th>
                <th className="py-3.5 px-4">Shift Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Net Payout</th>
                <th className="py-3.5 px-4">Patient Review</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.map((h) => (
                <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {h.bookingNumber || `#${h._id.slice(-6)}`}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">
                      {new Date(h.scheduledDate || h.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] text-slate-400">{h.startTime || 'Standard'}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {h.patientId?.name || 'Patient'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3 h-3 text-teal-600" />
                      {h.hospital}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    {h.durationType?.toUpperCase()}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={`text-[9px] font-bold uppercase ${
                        h.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : h.status.includes('cancelled')
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Math.round((h.cost?.total || 0) * 0.9)}
                  </td>
                  <td className="py-3 px-4">
                    {h.ratingByPatient?.stars ? (
                      <div>
                        <span className="text-amber-500 font-bold flex items-center gap-0.5">
                          ⭐ {h.ratingByPatient.stars}
                        </span>
                        {h.ratingByPatient.comment && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]" title={h.ratingByPatient.comment}>
                            "{h.ratingByPatient.comment}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryDetailBooking(h)}
                        className="h-8 px-2 text-xs font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800"
                        title="View shift breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingPdfId === h._id}
                        onClick={() => handleDownloadReceipt(h._id, h.bookingNumber)}
                        className="h-8 px-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 gap-1 rounded-xl"
                        title="Download PDF Care Receipt"
                      >
                        <Download className={`w-3 h-3 ${downloadingPdfId === h._id ? 'animate-bounce' : ''}`} />
                        Receipt
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
