import { useState, useEffect } from 'react';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ClinicEarnings() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getBilling(),
          api.getPayments({}),
        ]);
        const [b, p] = results.map(res => res.status === 'fulfilled' ? res.value : []);
        const ba = b?.data || b?.bills || b || [];
        setBills(ba.filter(bill =>
          bill.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) ||
          bill.doctorId?.name?.toLowerCase().includes(user?.name?.toLowerCase())
        ));
        setPayments(p?.payments || p?.data || p || []);
        if (results.some(r => r.status === 'rejected')) {
          toast.error('Failed to load some earnings data');
        }
      } catch (e) {
        toast.error(e.message || 'Failed to load earnings');
      }
      setLoading(false);
    };
    load();
  }, [user?.name]);

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return <EarningsAnalytics bills={bills} payments={payments} title="My Earnings" />;
}
