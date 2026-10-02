import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CalendarDays, Video, Phone, MessageCircle, MapPin, 
  Search, XCircle, RotateCcw, Clock, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  // APPT-M-01: waitlist queue for full slots. The entry state (esp. the
  // 15-minute offer) is the source of truth; this card renders it with a live
  // countdown, and accepting pays against the hold via the existing checkout
  // before the server marks the entry accepted.
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [offerMethod, setOfferMethod] = useState('upi');
  const [actingId, setActingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchWaitlist = () => {
    api.getMyWaitlist().then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.data || res?.waitlist || []);
      setWaitlist(Array.isArray(list) ? list : []);
    }).catch(() => { /* non-critical - the section just stays hidden */ });
  };

  // APPT-M-02: recurring series. Occurrences are ordinary appointments (they
  // appear in the lists below with working individual cancel/reschedule); this
  // card shows the pattern and cancels EVERY not-yet-terminal occurrence.
  const [seriesList, setSeriesList] = useState<any[]>([]);

  const fetchSeries = () => {
    api.getMyAppointmentSeries().then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSeriesList(Array.isArray(list) ? list : []);
    }).catch(() => { /* non-critical - the section just stays hidden */ });
  };

  const activeSeries = seriesList.filter((s: any) => s.status === 'active');

  const frequencyLabel: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
  };

  useEffect(() => {
    fetchWaitlist();
    fetchSeries();
  }, []);

  const hasLiveOffer = waitlist.some((e: any) => e.status === 'offered');
  useEffect(() => {
    if (!hasLiveOffer) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasLiveOffer]);

  const activeWaitlist = waitlist.filter((e: any) => ['waiting', 'offered', 'accepted'].includes(e.status));
  const offerRemainingMs = (e: any) => new Date(e.offerExpiresAt).getTime() - now;

  const handleAcceptOffer = async (entry: any) => {
    setActingId(entry._id);
    try {
      // 1) money against the hold - the existing checkout auto-confirms it;
      // 2) record the queue decision (server verifies the payment exists).
      await api.payTransaction({
        serviceType: 'appointment',
        amount: Number(entry.offerFee) || 0,
        method: offerMethod,
        referenceId: entry.offerAppointmentId,
        description: `Waitlist offer ${entry.date} ${entry.time}`,
      });
      await api.acceptWaitlistOffer(entry._id);
      toast.success('Slot claimed and paid. It is now in your appointments.');
      fetchWaitlist();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not claim this slot. Please try again.');
    } finally {
      setActingId(null);
    }
  };

  const handleLeaveWaitlist = async (id: string) => {
    setActingId(id);
    try {
      await api.leaveWaitlist(id);
      toast.success('Removed from the waitlist.');
      fetchWaitlist();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not update the waitlist entry.');
    } finally {
      setActingId(null);
    }
  };

  const handleCancelSeries = async (id: string) => {
    if (!confirm('Cancel this recurring series? Every upcoming visit in it will be cancelled.')) return;
    setActingId(id);
    try {
      const res = await api.cancelAppointmentSeries(id);
      const n = res?.cancelledCount || 0;
      toast.success(n > 0 ? `Series cancelled - ${n} upcoming visit${n === 1 ? '' : 's'} released.` : 'Series already had no upcoming visits.');
      fetchSeries();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not cancel the series.');
    } finally {
      setActingId(null);
    }
  };

  const fetchAppointments = () => {
    setLoading(true);
    api.getAppointments({ limit: 200 }).then((res) => {
      setAppointments(res?.appointments || res?.data || res || []);
    }).catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      toast.success("Appointment cancelled successfully");
      fetchAppointments();
    } catch (err) {
      toast.error("Failed to cancel appointment");
    }
  };

  const filtered = appointments.filter(a => {
    const term = search.toLowerCase();
    const match = (a.doctor || a.doctorName || a.clinicName || '').toLowerCase().includes(term);
    if (!match) return false;

    const isPast = ['Completed', 'Cancelled', 'No Show'].includes(a.status) || new Date(a.date) < new Date();
    
    if (activeTab === 'upcoming') return !isPast && a.status !== 'Pending';
    if (activeTab === 'pending') return a.status === 'Pending';
    if (activeTab === 'completed') return isPast;
    return true;
  });

  const getModeDetails = (mode: string) => {
    switch(mode?.toLowerCase()) {
      case 'video': return { icon: Video, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
      case 'voice': return { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'chat': return { icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'home': return { icon: MapPin, color: 'text-violet-500', bg: 'bg-violet-500/10' };
      default: return { icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> My Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your upcoming and past consultations</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/patient/booking-history">
            <Button variant="outline" size="sm" className="hidden sm:flex">Booking History</Button>
          </Link>
          <Button size="sm" onClick={() => navigate('/dashboard')}>Book New</Button>
        </div>
      </div>

      {activeWaitlist.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground">Waitlist</h2>
            <span className="text-xs text-muted-foreground">slots that opened up for you</span>
          </div>
          {activeWaitlist.map((entry) => {
            const remaining = offerRemainingMs(entry);
            return (
              <div key={entry._id} className="flex flex-col md:flex-row gap-3 md:items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">{entry.doctorName || 'Doctor'}</span>
                    <Badge variant="outline">{entry.department || 'Consultation'}</Badge>
                    <Badge variant={entry.status === 'offered' ? 'default' : 'secondary'} className="capitalize">
                      {entry.status === 'offered' ? 'Slot open' : entry.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDisplayDate(entry.date)} at {entry.time}
                  </p>
                </div>

                {entry.status === 'waiting' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Waiting for a slot…</span>
                    <Button size="sm" variant="ghost" disabled={actingId === entry._id} onClick={() => handleLeaveWaitlist(entry._id)}>Leave</Button>
                  </div>
                )}

                {entry.status === 'offered' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium tabular-nums ${remaining > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {remaining > 0
                        ? `Claim in ${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`
                        : 'Expiring…'}
                    </span>
                    <select
                      aria-label="Payment method"
                      value={offerMethod}
                      onChange={(e) => setOfferMethod(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="netbanking">Net Banking</option>
                      <option value="wallet">Wallet</option>
                    </select>
                    <Button size="sm" disabled={actingId === entry._id || remaining <= 0} onClick={() => handleAcceptOffer(entry)}>
                      {actingId === entry._id ? 'Confirming…' : `Claim for ₹${Number(entry.offerFee) || 0}`}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actingId === entry._id} onClick={() => handleLeaveWaitlist(entry._id)}>
                      Decline
                    </Button>
                  </div>
                )}

                {entry.status === 'accepted' && (
                  <span className="text-xs text-emerald-600 font-medium">Claimed - open the appointment above to manage it</span>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {activeSeries.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground">Recurring series</h2>
            <span className="text-xs text-muted-foreground">repeating appointments</span>
          </div>
          {activeSeries.map((s: any) => {
            const upcoming = (s.occurrences || []).filter((o: any) => !['Cancelled', 'Completed', 'Missed'].includes(o.status));
            return (
              <div key={s._id} className="flex flex-col md:flex-row gap-3 md:items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">{s.doctor || 'Doctor'}</span>
                    <Badge variant="outline">{frequencyLabel[s.frequency] || s.frequency} × {s.count}</Badge>
                    <Badge variant="secondary">₹{s.feesPerOccurrence || 0} / visit</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(s.occurrences || []).map((o: any) => (
                      <span
                        key={o._id}
                        title={o.status === 'Cancelled' ? (o.cancellationReason || 'Cancelled') : o.status}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          o.status === 'Cancelled'
                          ? 'text-muted-foreground border-border line-through'
                          : o.status === 'Pending'
                          ? 'text-amber-600 border-amber-300 dark:border-amber-700'
                          : 'text-emerald-600 border-emerald-300 dark:border-emerald-700'
                        }`}
                      >
                        {formatDisplayDate(o.date)} · {o.status === 'Pending' ? 'unpaid' : o.status.toLowerCase()}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {upcoming.length} upcoming visit{upcoming.length === 1 ? '' : 's'} at {s.time} · cancel one-off from the appointment itself
                  </p>
                </div>
                <Button size="sm" variant="destructive" disabled={actingId === s._id} onClick={() => handleCancelSeries(s._id)}>
                  {actingId === s._id ? 'Cancelling…' : 'Cancel series'}
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search doctor or clinic..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-4 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold">No appointments found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {search ? 'Try adjusting your search filters.' : 'You have no appointments in this category.'}
          </p>
          {activeTab === 'upcoming' && !search && (
            <Button className="mt-4" onClick={() => navigate('/dashboard')}>Book Consultation</Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => {
            const mode = getModeDetails(a.mode || 'clinic');
            const ModeIcon = mode.icon;
            const isCancelable = ['Upcoming', 'Confirmed', 'Pending'].includes(a.status);
            
            return (
              <Card key={a._id} className="p-5 hover:border-primary/40 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${mode.bg}`}>
                      <ModeIcon className={`w-6 h-6 ${mode.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-lg">{a.doctor || a.doctorName || 'Doctor'}</h3>
                        <Badge variant="outline" className={mode.color + " capitalize"}>{a.mode || 'Clinic'}</Badge>
                        <Badge variant={a.status === 'Confirmed' ? 'default' : a.status === 'Cancelled' ? 'destructive' : 'secondary'}>
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> {formatDisplayDate(a.date)}
                        <span className="mx-1">•</span>
                        <Clock className="w-3.5 h-3.5" /> {a.time || a.timeSlot}
                      </p>
                      {a.clinicName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> {a.clinicName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end border-t md:border-t-0 pt-3 md:pt-0 mt-3 md:mt-0">
                    {a.mode === 'video' && a.status === 'Confirmed' && (
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white w-full sm:w-auto" onClick={() => navigate('/patient/video-calls')}>
                        Join Video
                      </Button>
                    )}
                    {a.mode === 'voice' && a.status === 'Confirmed' && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" onClick={() => navigate('/patient/calls')}>
                        Join Call
                      </Button>
                    )}
                    {isCancelable && (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/dashboard?reschedule=${a._id}`)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Reschedule
                      </Button>
                    )}
                    {isCancelable && (
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => handleCancel(a._id)}>
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    )}
                    {activeTab === 'completed' && a.status === 'Completed' && (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/patient/reviews/write')}>
                        Leave Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
