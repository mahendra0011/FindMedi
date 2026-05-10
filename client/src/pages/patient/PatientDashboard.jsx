import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, User, Star, FileText, CreditCard, TestTube, Activity, Bell, Search, AlertTriangle, IndianRupee, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};

const isPatientBill = (bill, user) => {
  const userId = String(user?.id || user?._id || '');
  const patientId = bill?.patientId?._id || bill?.patientId;
  if (userId && patientId && String(patientId) === userId) return true;
  if (user?.name && (bill?.patient === user.name || bill?.patientId?.name === user.name)) return true;
  return !bill?.patient && !patientId;
};

const splitServiceNames = (service = '') => service
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const isLabBill = (bill, catalog) => {
  if (bill?.source === 'lab') return true;
  if (Array.isArray(bill?.services) && bill.services.length > 0) return true;
  if (String(bill?.doctor || '').toLowerCase() === 'lab services') return true;

  const serviceText = String(bill?.service || '').toLowerCase();
  return catalog.some(service => serviceText.includes(String(service.name || '').toLowerCase()));
};

const buildLabBookings = (bills, catalog, user) => bills
  .filter(bill => isPatientBill(bill, user))
  .filter(bill => isLabBill(bill, catalog))
  .map((bill) => {
    const serviceNames = splitServiceNames(bill.service);
    const services = Array.isArray(bill.services) && bill.services.length > 0
      ? bill.services
      : (catalog.filter(service => serviceNames.includes(service.name)).length > 0
        ? catalog.filter(service => serviceNames.includes(service.name))
        : serviceNames.map(name => ({ name, price: serviceNames.length === 1 ? bill.amount : 0, category: 'Lab' })));

    return {
      id: bill._id || bill.invoiceId || bill.service,
      invoiceId: bill.invoiceId,
      date: bill.date,
      dueDate: bill.dueDate,
      status: bill.status,
      amount: bill.amount || services.reduce((sum, service) => sum + (Number(service.price) || 0), 0),
      paid: bill.paid || 0,
      services,
    };
  });

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [labBookings, setLabBookings] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a, r, b, d, n, services, emergencyList] = await Promise.all([
          api.getAppointments(),
          api.getRecords(),
          api.getBilling(),
          api.getDoctors({ available: 'true' }),
          api.getNotifications(),
          api.getLabServices(),
          api.getEmergencies({ status: 'All' }),
        ]);
        setAppointments(a?.slice(0, 5) || []);
        setRecords(r?.records || r || []);
        
        const billsArray = b?.bills || b || [];
        const patientBills = billsArray.filter(bill => isPatientBill(bill, user));
        const serviceCatalog = services || [];
        setBills(patientBills.filter(bill => bill.status === 'Pending').slice(0, 3));
        setLabBookings(buildLabBookings(patientBills, serviceCatalog, user).slice(0, 4));
        
        setDoctors(d?.slice(0, 4) || []);
        
        setNotifications(n?.slice(0, 5) || []);

        const userId = user?.id || user?._id;
        setEmergencies((emergencyList || [])
          .filter(e => String(e.patientId || '') === String(userId || '') || e.patientName === user?.name)
          .slice(0, 4));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'Completed');
  const pendingBills = bills.length;
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const activeEmergencies = emergencies.filter(e => !['Discharged', 'Transferred', 'Rejected'].includes(e.status));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="opacity-90">Here's your health overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{upcomingAppts.length}</p>
          <p className="text-sm text-muted-foreground">Upcoming</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingBills}</p>
          <p className="text-sm text-muted-foreground">Pending Bills</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-info" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-sm text-muted-foreground">Medical Records</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{unreadNotifs}</p>
          <p className="text-sm text-muted-foreground">Notifications</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{activeEmergencies.length}</p>
          <p className="text-sm text-muted-foreground">Emergencies</p>
        </motion.div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-success" /> Upcoming Appointments
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">View All</Button>
          </div>
          
          {upcomingAppts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.slice(0, 3).map(apt => (
                <div key={apt._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.doctor}</p>
                      <p className="text-xs text-muted-foreground">{apt.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{apt.date}</p>
                    <p className="text-xs text-muted-foreground">{apt.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Records */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-info" /> Recent Records
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">View All</Button>
          </div>
          
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No medical records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.slice(0, 3).map((rec, i) => (
                <div key={rec._id || i} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{rec.type}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{rec.diagnosis}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{rec.date}</p>
                    <Badge className="text-xs bg-success/10 text-success">{rec.doctor}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lab Services and Emergency Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <TestTube className="w-5 h-5 text-warning" /> Booked Lab Services
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/patient/billing">View Billing</Link>
            </Button>
          </div>

          {labBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No lab services booked yet</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/patient/services">Book Lab Services</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {labBookings.map(booking => (
                <Link key={booking.id} to="/patient/billing" className="block p-4 bg-muted/30 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{booking.invoiceId || 'Lab booking'}</p>
                      <p className="font-medium text-foreground">{booking.services.map(service => service.name).join(', ')}</p>
                      <p className="text-xs text-muted-foreground">Booked on {booking.date || 'Today'}{booking.dueDate ? ` | Due ${booking.dueDate}` : ''}</p>
                    </div>
                    <Badge className={`text-xs ${statusColors[booking.status] || 'bg-muted text-muted-foreground'}`}>{booking.status || 'Pending'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {booking.services.map((service, index) => (
                      <span key={`${booking.id}-${service.id || service.name || index}`} className="px-2.5 py-1 rounded-full bg-background text-xs text-foreground border border-border/60">
                        {service.name}
                        {service.price ? ` - Rs ${service.price}` : ''}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-semibold text-warning flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" />{Math.max((booking.amount || 0) - (booking.paid || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Emergency Status
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/patient/emergency">View All</Link>
            </Button>
          </div>

          {emergencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No emergency cases reported</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emergencies.map(item => (
                <Link key={item._id} to="/patient/emergency" className="block p-4 bg-muted/30 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.condition}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      {item.assignedDoctorName && <p className="text-xs text-info mt-1">Doctor: {item.assignedDoctorName}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className="bg-destructive/10 text-destructive">{item.severity}</Badge>
                      <p className="text-xs font-medium text-foreground">{item.status}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-20 flex-col gap-2 py-4">
            <Link to="/patient/doctors">
            <Search className="w-6 h-6 text-primary" />
            <span className="text-sm">Find Doctors</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 py-4">
            <Link to="/patient/services">
            <TestTube className="w-6 h-6 text-warning" />
            <span className="text-sm">Lab Services</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 py-4">
            <Link to="/patient/billing">
            <CreditCard className="w-6 h-6 text-success" />
            <span className="text-sm">My Bills</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 py-4">
            <Link to="/patient/records">
            <ClipboardList className="w-6 h-6 text-info" />
            <span className="text-sm">Medical History</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Available Doctors Preview */}
      {doctors.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Top Doctors
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">View All</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.slice(0, 4).map((doc, i) => (
              <motion.div 
                key={doc._id || i}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-muted/30 rounded-xl text-center cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-sm font-medium">{doc.rating || '4.5'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
