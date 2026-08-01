import { useState, useEffect } from 'react';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function DoctorEarnings() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const b = await api.getBilling();
        const ba = b?.data || b?.bills || b || [];
        setBills(ba.filter(bill =>
          bill.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) ||
          bill.doctorId?.name?.toLowerCase().includes(user?.name?.toLowerCase())
        ));
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

  return <EarningsAnalytics bills={bills} title="My Earnings" />;
}
