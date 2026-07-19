import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, FlaskConical, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2, Search, ChevronRight, Syringe, FileText,
  Eye, MapPin, Phone, IndianRupee, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BOOKING_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle2 },
  sample_collected: { label: 'Sample Collected', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Syringe },
  report_ready: { label: 'Report Ready', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: FileText },
  completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

const STATUS_FLOW = ['pending', 'confirmed', 'sample_collected', 'report_ready', 'completed'];

const MOCK_BOOKINGS = [
  {
    id: 'b1', type: 'test', source: 'SRL Diagnostics', date: '2026-07-15',
    tests: ['Complete Blood Count (CBC)', 'Lipid Profile', 'Vitamin D Total'],
    amount: 1397, status: 'report_ready', slot: '7:00 AM - 9:00 AM',
    address: '123, Health Avenue, New York', phone: '9876543210',
  },
  {
    id: 'b2', type: 'test', source: 'Thyrocare Technologies', date: '2026-07-12',
    tests: ['Thyroid Profile', 'Blood Glucose (Fasting)'],
    amount: 548, status: 'completed', slot: '9:00 AM - 12:00 PM',
    address: '456, Wellness Road, Los Angeles', phone: '9876543211',
  },
  {
    id: 'b3', type: 'appointment', source: 'Dr. Rajesh Kumar - Cardiologist', date: '2026-07-20',
    tests: [], amount: 500, status: 'confirmed', slot: '10:30 AM',
    address: 'City Hospital, New York', phone: '9876543210',
  },
  {
    id: 'b4', type: 'test', source: 'Metropolis Healthcare', date: '2026-07-08',
    tests: ['HbA1c', 'Kidney Function Test'],
    amount: 748, status: 'sample_collected', slot: '6:00 AM - 8:00 AM',
    address: '789, Market Street, Chicago', phone: '9876543212',
  },
  {
    id: 'b5', type: 'test', source: 'Apollo Diagnostics', date: '2026-07-18',
    tests: ['Full Body Checkup (70 parameters)'],
    amount: 999, status: 'pending', slot: '7:00 AM - 9:00 AM',
    address: '12, Health Hub, Los Angeles', phone: '9876543213',
  },
  {
    id: 'b6', type: 'test', source: 'SRL Diagnostics', date: '2026-06-28',
    tests: ['Liver Function Test', 'Urine Routine'],
    amount: 628, status: 'cancelled', slot: '9:00 AM - 12:00 PM',
    address: '123, Health Avenue, New York', phone: '9876543210',
  },
  {
    id: 'b7', type: 'appointment', source: 'Dr. Priya Sharma - Dermatologist', date: '2026-07-10',
    tests: [], amount: 800, status: 'completed', slot: '2:00 PM',
    address: 'Skin Care Clinic, New York', phone: '9876543215',
  },
  {
    id: 'b8', type: 'test', source: 'Thyrocare Technologies', date: '2026-07-22',
    tests: ['Vitamin B12', 'Iron Studies', 'CRP Quantitative'],
    amount: 1347, status: 'pending', slot: '7:00 AM - 9:00 AM',
    address: '456, Wellness Road, Los Angeles', phone: '9876543211',
  },
];

const STATUS_FILTERS = ['All', 'pending', 'confirmed', 'sample_collected', 'report_ready', 'completed', 'cancelled'];

const getStep = (status) => STATUS_FLOW.indexOf(status);

export default function PatientBookings() {
  const navigate = useNavigate();
  const [bookings] = useState(MOCK_BOOKINGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'All' && b.status !== statusFilter) return false;
    if (typeFilter !== 'All' && b.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.source.toLowerCase().includes(q) && !b.tests.some(t => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const activeBookings = filtered.filter(b => !['completed', 'cancelled'].includes(b.status));
  const pastBookings = filtered.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="text-muted-foreground">Track your lab tests and appointment bookings</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by clinic, test or doctor..." className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-11 px-4 rounded-xl text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="All">All Types</option>
          <option value="test">Lab Tests</option>
          <option value="appointment">Appointments</option>
        </select>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-background text-muted-foreground hover:text-foreground border-border/50'
            )}>
            {s === 'All' ? 'All' : (BOOKING_STATUS[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Active ({activeBookings.length})
          </h2>
          <div className="space-y-4">
            {activeBookings.map((booking, i) => (
              <BookingCard key={booking.id} booking={booking} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Past ({pastBookings.length})
          </h2>
          <div className="space-y-4">
            {pastBookings.map((booking, i) => (
              <BookingCard key={booking.id} booking={booking} index={i} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <CalendarDays className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No bookings found</h3>
          <p className="text-xs text-muted-foreground">Try a different filter or search term</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate('/diagnostic-centers')}>
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Book a Test
          </Button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, index }) {
  const navigate = useNavigate();
  const statusInfo = BOOKING_STATUS[booking.status] || BOOKING_STATUS.pending;
  const StatusIcon = statusInfo.icon;
  const currentStep = getStep(booking.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              booking.type === 'test' ? 'bg-primary/10' : 'bg-amber-500/10'
            )}>
              {booking.type === 'test'
                ? <FlaskConical className="w-5 h-5 text-primary" />
                : <CalendarDays className="w-5 h-5 text-amber-600" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-sm text-foreground truncate">{booking.source}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {booking.date} &bull; {booking.slot}
              </p>
              {booking.tests.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {booking.tests.join(', ')}
                </p>
              )}
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0', statusInfo.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </span>
        </div>

        {/* Status Timeline */}
        {booking.status !== 'cancelled' && (
          <div className="flex items-center gap-1 mb-4 px-1">
            {STATUS_FLOW.map((step, i) => {
              const stepInfo = BOOKING_STATUS[step];
              const StepIcon = stepInfo.icon;
              const isActive = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={cn(
                    'flex items-center gap-1.5 text-[10px] font-medium',
                    isActive ? (isCurrent ? 'text-primary' : 'text-success') : 'text-muted-foreground/40'
                  )}>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all',
                      isActive
                        ? (isCurrent ? 'border-primary bg-primary/10' : 'border-success bg-success/10')
                        : 'border-muted-foreground/20 bg-muted/30'
                    )}>
                      <StepIcon className={cn('w-3 h-3', isActive ? (isCurrent ? 'text-primary' : 'text-success') : 'text-muted-foreground/40')} />
                    </div>
                    <span className="hidden sm:inline whitespace-nowrap">{stepInfo.label}</span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-1.5 rounded-full',
                      i < currentStep ? 'bg-success/40' : 'bg-muted/50'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IndianRupee className="w-3 h-3" />
            <span className="font-semibold text-foreground">₹{booking.amount}</span>
          </div>
          <div className="flex gap-2">
            {booking.status === 'pending' && (
              <Button variant="ghost" size="sm" className="text-xs h-8 text-destructive hover:text-destructive"
                onClick={() => toast.success('Booking cancelled')}>
                <XCircle className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
            {booking.status === 'report_ready' && (
              <Button size="sm" className="text-xs h-8 gap-1" onClick={() => navigate('/patient/reports')}>
                <FileText className="w-3 h-3" /> View Report
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1"
              onClick={() => window.open(`tel:${booking.phone}`)}>
              <Phone className="w-3 h-3" /> Contact
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


