import React from 'react';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RiderEarningsTabProps {
  earnings: any;
  profile: any;
  user: any;
  setWithdrawModalOpen: (open: boolean) => void;
  navigate: (path: string) => void;
}

export const RiderEarningsTab: React.FC<RiderEarningsTabProps> = ({
  earnings,
  profile,
  user,
  setWithdrawModalOpen,
  navigate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rider/dashboard')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
          <h3 className="font-bold text-base text-foreground">Earnings & Payout Overview</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['Metric', 'Amount (INR)'];
              const rows = [
                ['Total Lifetime Earnings', earnings?.totalEarnings || 0],
                ['Month Net Payable', earnings?.monthNet || 0],
                ['Platform Commission Month (10%)', earnings?.platformCommissionMonth || 0],
                ['Wallet Balance Available', earnings?.walletBalance || 0],
              ];
              const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `rider_earnings_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="rounded-xl text-xs font-bold gap-1.5 h-8 border-border"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setWithdrawModalOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 h-8"
          >
            <Wallet className="w-3.5 h-3.5" /> Withdraw Balance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Lifetime Earnings</p>
          <p className="text-3xl font-extrabold text-foreground">
            ₹{earnings?.totalEarnings || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">This Month Net Payable</p>
          <p className="text-3xl font-extrabold text-success">
            ₹{earnings?.monthNet || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Platform Commission (10%): -₹{earnings?.platformCommissionMonth || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Available Wallet Balance</p>
            <p className="text-3xl font-extrabold text-primary">
              ₹{earnings?.walletBalance || 0}
            </p>
          </div>

          <Button
            onClick={() => setWithdrawModalOpen(true)}
            className="w-full rounded-xl text-xs font-bold gap-1.5 h-10 shadow-sm"
          >
            <Wallet className="w-4 h-4" /> Withdraw (Demo Payout)
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
        <h4 className="font-bold text-sm text-foreground">Settlement Bank & UPI Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Account Holder</p>
            <p className="font-semibold text-foreground mt-0.5">
              {profile?.bankDetails?.accountHolder || user?.name}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Account Number</p>
            <p className="font-mono font-semibold text-foreground mt-0.5">
              {profile?.bankDetails?.accountNumber || '••••••••••••'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">IFSC / UPI ID</p>
            <p className="font-mono font-semibold text-foreground mt-0.5">
              {profile?.bankDetails?.upiId || profile?.bankDetails?.ifsc || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
