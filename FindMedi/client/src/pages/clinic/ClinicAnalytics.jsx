import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DoctorAnalyticsView from '@/components/DoctorAnalyticsView';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ClinicAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState({ appointments: [], patients: [], bills: [], labBookings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDoctorAnalytics();
        if (res?.success) {
          setData({
            appointments: res.appointments || [],
            patients: res.patients || [],
            bills: res.bills || [],
            labBookings: res.labBookings || [],
          });
        }
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    if (user?.name) {
      load();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-1"
    >
      <DoctorAnalyticsView
        appointments={data.appointments}
        patients={data.patients}
        bills={data.bills}
        labBookings={data.labBookings}
        title="My Analytics"
      />
    </motion.div>
  );
}
