import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, UserPlus, Search, Ticket, CalendarDays, CheckCircle2,
  AlertCircle, Phone, Stethoscope, ChevronRight, RotateCcw, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

export default function ClinicReceptionDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenCounter, setTokenCounter] = useState(14);
  const [quickReg, setQuickReg] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'Male',
    doctor: 'Dr. Ramesh Sharma',
    fee: '500'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await api.getAppointments({ date: getISTDateString() }).catch(() => null);
      const list = Array.isArray(res) ? res : res?.data || [];
      setAppointments(list);
    } catch {
      toast.error('Failed to load reception queue');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReg.name || !quickReg.phone) {
      toast.error('Patient name and phone number required');
      return;
    }
    const nextToken = tokenCounter + 1;
    setTokenCounter(nextToken);
    toast.success(`🎟️ Token #${nextToken} issued for ${quickReg.name}! Patient added to ${quickReg.doctor}'s queue.`);
    setQuickReg({ name: '', phone: '', age: '', gender: 'Male', doctor: 'Dr. Ramesh Sharma', fee: '500' });
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Front Desk Reception Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-200">Patient Registration & Front Desk Console</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Reception / Front Desk</h1>
          <p className="text-sm text-teal-100 mt-0.5">Walk-in Registrations, Token Dispatch & Waiting Queue Management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} className="gap-1.5 rounded-xl text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh Queue
          </Button>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-teal-200 font-medium">LATEST TOKEN</p>
            <p className="text-xl font-bold">#{tokenCounter}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Reception KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-teal-500/20 bg-teal-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Walk-ins Today</p>
              <p className="text-2xl font-bold text-teal-700">18</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Online Booked</p>
              <p className="text-2xl font-bold text-blue-700">24</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Waiting in Lounge</p>
              <p className="text-2xl font-bold text-amber-700">9</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Checked-in</p>
              <p className="text-2xl font-bold text-emerald-700">33</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Quick Walk-in Registration & Live Queue Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Walk-in Form (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Instant Walk-in Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleGenerateToken} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-muted-foreground font-medium block mb-1">Patient Full Name *</label>
                  <Input
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={quickReg.name}
                    onChange={e => setQuickReg({ ...quickReg, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Mobile Number *</label>
                    <Input
                      required
                      placeholder="9876543210"
                      value={quickReg.phone}
                      onChange={e => setQuickReg({ ...quickReg, phone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Age (Years)</label>
                    <Input
                      placeholder="e.g. 28"
                      value={quickReg.age}
                      onChange={e => setQuickReg({ ...quickReg, age: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Gender</label>
                    <select
                      value={quickReg.gender}
                      onChange={e => setQuickReg({ ...quickReg, gender: e.target.value })}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Consulting Doctor</label>
                    <select
                      value={quickReg.doctor}
                      onChange={e => setQuickReg({ ...quickReg, doctor: e.target.value })}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-semibold"
                    >
                      <option value="Dr. Ramesh Sharma">Dr. Ramesh Sharma (Gen Med)</option>
                      <option value="Dr. Priya Patel">Dr. Priya Patel (Pediatrics)</option>
                      <option value="Dr. Vivek Verma">Dr. Vivek Verma (Ortho)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 rounded-2xl flex items-center justify-between">
                  <span className="font-semibold text-foreground">Consultation Fee</span>
                  <span className="font-bold text-base text-emerald-600">₹{quickReg.fee}</span>
                </div>

                <Button type="submit" className="w-full rounded-2xl h-10 font-bold bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  <Ticket className="w-4 h-4" /> Issue Token & Print OPD Slip
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Token TV Queue View (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" /> Active OPD Lounge Queue
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate('/clinic/appointments')} className="text-xs h-8 rounded-xl">
                Full Appointment Roster <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {[
                { token: '01', patient: 'Vikram Singh', doctor: 'Dr. Ramesh Sharma', status: 'In Consultation', room: 'Room 1' },
                { token: '02', patient: 'Meena Gupta', doctor: 'Dr. Priya Patel', status: 'In Consultation', room: 'Room 2' },
                { token: '03', patient: 'Amitav Ghosh', doctor: 'Dr. Ramesh Sharma', status: 'Waiting (Next)', room: 'Room 1' },
                { token: '04', patient: 'Sunita Rao', doctor: 'Dr. Priya Patel', status: 'Waiting', room: 'Room 2' },
                { token: '05', patient: 'Karan Mehra', doctor: 'Dr. Vivek Verma', status: 'Waiting', room: 'Room 3' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border bg-muted/15 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-600 font-black text-sm flex items-center justify-center">
                      #{item.token}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{item.patient}</p>
                      <p className="text-muted-foreground">{item.doctor} · {item.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={item.status.includes('In') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600'}>
                      {item.status}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={() => toast.success(`Calling Token #${item.token} on Lounge Audio`)}>
                      📢
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
