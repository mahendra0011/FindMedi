import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2 } from 'lucide-react';

interface LawyerEarningsTabProps {
  earnings: any;
  history: any[];
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  withdrawing: boolean;
  handleWithdrawDemo: () => Promise<void>;
}

export const LawyerEarningsTab: React.FC<LawyerEarningsTabProps> = ({
  earnings,
  history,
  withdrawAmount,
  setWithdrawAmount,
  withdrawing,
  handleWithdrawDemo,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
          <div className="text-xs font-medium text-slate-100 uppercase tracking-wider">
            Available Wallet Balance
          </div>
          <div className="text-3xl font-black mt-1">
            ₹{earnings?.walletBalance?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-200 mt-2">
            Net earnings ready for simulated demo payout
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Gross Earnings
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            ₹{(earnings?.totalEarnings ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Commission: ₹{(earnings?.platformCommission ?? 0).toLocaleString()} (10%) • Net: ₹
            {(earnings?.netPayable ?? 0).toLocaleString()} • This month: ₹
            {(earnings?.thisMonthEarnings ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Completed Cases
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {earnings?.completedConsultationsCount ?? history.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            100% Paid & Settled Consultations
          </div>
        </div>
      </div>

      {/* Withdraw Simulation Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Simulate Payout Withdrawal (Demo)
        </h4>
        <p className="text-xs text-slate-500">
          Withdraw your consultation fees to your registered bank account or UPI ID. In DEMO MODE, no actual banking transfer occurs.
        </p>

        <div className="flex gap-3 max-w-md">
          <Input
            type="number"
            min={100}
            step={100}
            placeholder="Enter Amount (₹)"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="rounded-xl text-xs"
          />
          <Button
            type="button"
            disabled={withdrawing}
            onClick={handleWithdrawDemo}
            className="bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shrink-0"
          >
            {withdrawing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
            {withdrawing ? 'Processing...' : 'Withdraw (Demo)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
