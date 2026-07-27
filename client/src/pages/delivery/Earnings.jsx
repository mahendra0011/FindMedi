import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';

export default function Earnings() {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get('/delivery-partners/profile/me');
      setPartner(data);
    } catch {
      toast.error('Failed to load earnings');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Earnings & Payout</h1>
        <p className="page-subtitle">Track your earnings and payout history</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Today"
          value="₹0"
          change="No deliveries yet"
          changeType="neutral"
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="This Week"
          value="₹0"
          change="Starting fresh"
          changeType="neutral"
          icon={Clock}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
        <StatCard
          title="Total Earnings"
          value="₹0"
          change="+0% from last month"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Rating"
          value={partner?.rating || '—'}
          change="Based on deliveries"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Payout Method</h3>
        <div className="space-y-3">
          {partner?.bankDetails?.accountNo && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">Bank Transfer</p>
                <p className="text-xs text-muted-foreground">
                  A/c: {partner.bankDetails.accountNo} | IFSC: {partner.bankDetails.ifsc}
                </p>
              </div>
              <span className="text-xs text-success font-medium">Active</span>
            </div>
          )}
          {partner?.bankDetails?.upiId && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">UPI</p>
                <p className="text-xs text-muted-foreground">{partner.bankDetails.upiId}</p>
              </div>
              <span className="text-xs text-success font-medium">Active</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Payout History</h3>
        <p className="text-sm text-muted-foreground">No payouts yet. Payouts are processed weekly after approval.</p>
      </div>
    </div>
  );
}
