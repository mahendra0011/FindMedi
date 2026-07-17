import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, CheckCircle, AlertCircle, TrendingUp, DollarSign, Beaker, FileText, Plus, Search, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const statusColors = {
  Pending: { bg: 'bg-warning/10', text: 'text-warning' },
  Confirmed: { bg: 'bg-success/10', text: 'text-success' },
  Completed: { bg: 'bg-primary/10', text: 'text-primary' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

const STORAGE_KEY = 'medicore_labcenter_bookings';

const defaultBookings = [
  { id: 1, patient: 'Ravi Sharma', age: 45, gender: 'Male', tests: ['CBC', 'Lipid Profile'], date: new Date().toISOString().split('T')[0], time: '9:30 AM', status: 'Confirmed', phone: '9876543210', amount: 1800 },
  { id: 2, patient: 'Priya Patel', age: 32, gender: 'Female', tests: ['Thyroid', 'Blood Sugar'], date: new Date().toISOString().split('T')[0], time: '10:00 AM', status: 'Pending', phone: '9876543211', amount: 1200 },
  { id: 3, patient: 'Amit Verma', age: 58, gender: 'Male', tests: ['ECG', 'X-Ray Chest'], date: new Date().toISOString().split('T')[0], time: '11:30 AM', status: 'Completed', phone: '9876543212', amount: 2500 },
  { id: 4, patient: 'Sunita Gupta', age: 28, gender: 'Female', tests: ['Urine Routine', 'Liver Function'], date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '2:00 PM', status: 'Confirmed', phone: '9876543213', amount: 2200 },
  { id: 5, patient: 'Vikas Yadav', age: 50, gender: 'Male', tests: ['MRI Brain', 'CT Abdomen'], date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], time: '9:00 AM', status: 'Pending', phone: '9876543214', amount: 15000 },
];

export default function LabCenterDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setBookings(JSON.parse(stored));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBookings));
      setBookings(defaultBookings);
    }
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const pendingReports = bookings.filter(b => b.status === 'Confirmed');
  const totalEarned = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.amount || 0), 0);
  const todayRevenue = todayBookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Lab Center Dashboard</h1>
        <p className="opacity-90">Welcome, {user?.name || 'Lab Admin'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{todayBookings.length}</p>
          <p className="text-sm text-muted-foreground">Today's Bookings</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingReports.length}</p>
          <p className="text-sm text-muted-foreground">Pending Reports</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">Rs {todayRevenue.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Revenue Today</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-info" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{bookings.reduce((s, b) => s + b.tests.length, 0)}</p>
          <p className="text-sm text-muted-foreground">Total Tests</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Recent Bookings
            </h2>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>

          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No bookings today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.slice(0, 5).map(b => {
                const colors = statusColors[b.status] || statusColors.Pending;
                return (
                  <motion.div key={b.id} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <User className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{b.patient}</p>
                        <p className="text-xs text-muted-foreground">{b.tests.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{b.time}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                        {b.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" /> Pending Reports
            </h2>
          </div>

          {pendingReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReports.slice(0, 5).map(b => (
                <div key={b.id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{b.patient}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">In Progress</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{b.tests.join(', ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{b.time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/labcenter/test-catalog" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center cursor-pointer">
            <Microscope className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="font-semibold text-sm text-foreground">Test Catalog</p>
            <p className="text-xs text-muted-foreground">Manage tests</p>
          </motion.div>
        </Link>
        <Link to="/labcenter/bookings" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-4 text-center cursor-pointer">
            <CalendarDays className="w-6 h-6 mx-auto text-success mb-1" />
            <p className="font-semibold text-sm text-foreground">Bookings</p>
            <p className="text-xs text-muted-foreground">Manage bookings</p>
          </motion.div>
        </Link>
        <Link to="/labcenter/prescription-queue" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4 text-center cursor-pointer">
            <FileText className="w-6 h-6 mx-auto text-warning mb-1" />
            <p className="font-semibold text-sm text-foreground">Rx Queue</p>
            <p className="text-xs text-muted-foreground">Verify prescriptions</p>
          </motion.div>
        </Link>
        <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-4 text-center cursor-pointer">
          <TrendingUp className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="font-semibold text-sm text-foreground">Rs {totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </motion.div>
      </div>
    </div>
  );
}
