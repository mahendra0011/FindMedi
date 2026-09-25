import React from 'react';
import { DollarSign, Wallet, CheckCircle2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

export interface AssistantEarningsTabProps {
  earnings: any;
  profile: any;
  user: any;
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  withdrawing: boolean;
  withdrawSuccessRef: string | null;
  setWithdrawSuccessRef: (val: string | null) => void;
  handleWithdrawDemo: (e?: React.FormEvent) => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export const AssistantEarningsTab: React.FC<AssistantEarningsTabProps> = ({
  earnings,
  profile,
  user,
  withdrawAmount,
  setWithdrawAmount,
  withdrawing,
  withdrawSuccessRef,
  setWithdrawSuccessRef,
  handleWithdrawDemo,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Earnings, Wallet & Demo Settlement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent fee breakdown and simulated instant bank settlement
            </p>
          </div>

          <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1">
            100% Payout Rate • Zero Hidden Charges
          </Badge>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 border-2 border-teal-500/30">
            <span className="text-xs font-bold text-slate-500 uppercase">Available Wallet Balance</span>
            <div className="text-3xl font-black text-teal-800 dark:text-teal-300 mt-1">
              ₹{profile?.walletBalance || 0}
            </div>
            <span className="text-[10px] text-teal-600 font-semibold block mt-1">
              Available for instant demo bank transfer
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
            <span className="text-xs font-bold text-slate-400 uppercase">Gross Patient Billings</span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
              ₹{earnings?.totalGross || 0}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">Total value of all shifts</span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
            <span className="text-xs font-bold text-slate-400 uppercase">Platform Fee (10%)</span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              -₹{earnings?.platformCommission || 0}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">Covers insurance & 24/7 support</span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border">
            <span className="text-xs font-bold text-slate-400 uppercase">Net Lifetime Payout</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{earnings?.netEarnings || 0}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">This month: ₹{earnings?.thisMonthNet || 0}</span>
          </div>
        </div>

        {/* Demo Bank Withdrawal Module */}
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Request Instant Bank Payout (Demo Simulation)
              </h4>
              <p className="text-xs text-slate-500">
                Simulate direct deposit to your registered bank account or UPI ID
              </p>
            </div>

            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
              INSTANT NEFT / UPI DEMO
            </Badge>
          </div>

          {/* Preset Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Quick Select:</span>
            {[500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setWithdrawAmount(String(amt))}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500"
              >
                ₹{amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWithdrawAmount(String(profile?.walletBalance || 0))}
              className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 font-bold text-xs text-teal-700 dark:text-teal-300"
            >
              Full Balance (₹{profile?.walletBalance || 0})
            </button>
          </div>

          {/* Form Input & Action */}
          <form onSubmit={handleWithdrawDemo} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">₹</span>
              <Input
                type="number"
                placeholder="Enter amount to withdraw"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={profile?.walletBalance || 0}
                min={100}
                className="pl-8 h-11 text-xs font-bold rounded-2xl"
              />
            </div>

            <Button
              type="submit"
              disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (profile?.walletBalance || 0)}
              className="h-11 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-2xl shadow-md shadow-emerald-600/20"
            >
              {withdrawing ? 'Processing Settlement...' : 'Simulate Bank Transfer'}
            </Button>
          </form>

          {/* Target Account Preview */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>
              Linked Bank: <strong>{profile?.bankDetails?.accountNumber ? `••••${profile.bankDetails.accountNumber.slice(-4)}` : 'HDFC Bank Primary (Demo)'}</strong> (IFSC: {profile?.bankDetails?.ifsc || 'HDFC0001234'})
            </span>
            <span>
              Holder: <strong>{profile?.bankDetails?.accountHolder || user?.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline"
            >
              Update Bank Details
            </button>
          </div>
        </div>

        {/* Success Alert if simulated */}
        {withdrawSuccessRef && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold block">Demo Payout Request Processed!</span>
                <span>UTR Reference: <strong className="font-mono">{withdrawSuccessRef}</strong>. In production, NEFT takes 15 minutes.</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWithdrawSuccessRef(null)}
              className="text-emerald-700 hover:bg-emerald-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
