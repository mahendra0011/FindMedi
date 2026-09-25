import React from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Star } from 'lucide-react';

interface LawyerCasesTabProps {
  filteredHistory: any[];
  history: any[];
  caseSearch: string;
  setCaseSearch: (val: string) => void;
  caseStatusFilter: string;
  setCaseStatusFilter: (val: string) => void;
  setCasePage: React.Dispatch<React.SetStateAction<number>>;
  pagedHistory: any[];
  safeCasePage: number;
  totalCasePages: number;
}

export const LawyerCasesTab: React.FC<LawyerCasesTabProps> = ({
  filteredHistory,
  history,
  caseSearch,
  setCaseSearch,
  caseStatusFilter,
  setCaseStatusFilter,
  setCasePage,
  pagedHistory,
  safeCasePage,
  totalCasePages,
}) => {
  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Consultation Case History ({filteredHistory.length})
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search client / category / booking no..."
            value={caseSearch}
            onChange={(e) => {
              setCaseSearch(e.target.value);
              setCasePage(1);
            }}
            className="h-9 text-xs w-56"
          />
          <select
            value={caseStatusFilter}
            onChange={(e) => {
              setCaseStatusFilter(e.target.value);
              setCasePage(1);
            }}
            className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
          >
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          {history.length === 0
            ? 'No past consultations found.'
            : 'No cases match your search.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="pb-3 font-semibold">Booking</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Client</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Mode</th>
                <th className="pb-3 font-semibold">Fee</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {pagedHistory.map((h) => (
                <tr key={h._id}>
                  <td className="py-3 font-mono text-slate-500">
                    #{h.bookingNumber || h._id?.slice(-6)}
                  </td>
                  <td className="py-3">
                    {new Date(h.scheduledDate || h.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                    {h.userId?.name || 'Client'}
                  </td>
                  <td className="py-3 capitalize">
                    {h.category?.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 capitalize">
                    {h.consultationMode?.replace('_', ' ')}
                  </td>
                  <td className="py-3 font-bold">₹{h.fee}</td>
                  <td className="py-3">
                    <Badge
                      className={
                        h.status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-500 text-white'
                      }
                    >
                      {h.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {h.ratingByUser?.stars ? (
                      <span className="text-amber-500 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {h.ratingByUser.stars}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filteredHistory.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Page {safeCasePage} of {totalCasePages} • {filteredHistory.length} cases
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCasePage <= 1}
              onClick={() => setCasePage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCasePage >= totalCasePages}
              onClick={() => setCasePage((p) => Math.min(totalCasePages, p + 1))}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
