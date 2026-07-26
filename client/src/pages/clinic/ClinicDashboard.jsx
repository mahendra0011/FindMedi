import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, CheckCircle, AlertCircle, Stethoscope, DollarSign, TrendingUp, Activity, Star, Users, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { getISTDateString } from '@/lib/dateUtils';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';

const statusColors = {
  Confirmed: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Completed: 'bg-primary/10 text-primary',
  Cancelled: 'bg-destructive/10 text-destructive',
};

export default function ClinicDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getAppointments(),
          api.getBilling(),
          api.getReviews(),
          api.getRefunds(),
        ]);
        if (!mounted.current) return;
        const [a, b, r, rf] = results.map(res => res.status === 'fulfilled' ? res.value : []);
        const appts = a?.data || a || [];
        const myAppts = appts?.filter(apt => apt.doctor?.toLowerCase().includes(user?.name?.toLowerCase())) || [];
        setAppointments(myAppts);
        const billsArray = b?.data || b?.bills || b || [];
        setBills(billsArray.filter(bill => bill.doctor?.toLowerCase().includes(user?.name?.toLowerCase())));
        setReviews(r?.filter(rv => rv.doctorName === user?.name) || []);
        const refundArray = rf?.payments || rf?.data || rf || [];
        setRefunds(refundArray.filter(rf => rf.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) || rf.patient?.toLowerCase().includes(user?.name?.toLowerCase())));
        const failed = results.filter(res => res.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => { mounted.current = false; };
  }, [user?.name]);

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today);
  const pendingAppts = appointments.filter(a => a.status === 'Pending');
  const completedAppts = appointments.filter(a => a.status === 'Completed');
  const todayRevenue = bills.filter(b => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const totalEarned = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
        <p className="opacity-90">Clinic overview for today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{todayAppts.length}</p>
          <p className="text-sm text-muted-foreground">Today's Appointments</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingAppts.length}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{todayRevenue.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Today's Revenue</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Earned</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Today's Schedule
            </h2>
            <Link to="/clinic/appointments" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          {todayAppts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppts.slice(0, 5).map(apt => (
                <motion.div key={apt._id} whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.patient}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{apt.time}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[apt.status] || statusColors.Pending}`}>
                      {apt.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Recent Reviews
            </h2>
            <Link to="/clinic/reviews" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map(rv => (
                <div key={rv._id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{rv.patientName}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                  {rv.comment && <p className="text-sm text-muted-foreground line-clamp-2">{rv.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="font-bold text-lg text-success">₹{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center">
          <Stethoscope className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-primary">{completedAppts.length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="font-bold text-lg text-info">{new Set(appointments.map(a => a.patient)).size}</p>
          <p className="text-xs text-muted-foreground">Total Patients</p>
        </div>
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4 text-center">
          <Activity className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="font-bold text-lg text-warning">{reviews.length}</p>
          <p className="text-xs text-muted-foreground">Reviews</p>
        </div>
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
            <span className="text-warning font-medium">{pendingRefunds} Pending</span>
          </div>
        </div>
        {refunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No refunds found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.slice(0, 5).map(rf => (
              <div key={rf._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{rf.patient || rf.patientName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{rf.reason || rf.description || 'Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rf.status === 'Refunded' || rf.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {rf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
