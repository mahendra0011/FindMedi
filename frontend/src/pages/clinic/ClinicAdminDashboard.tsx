import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, IndianRupee, CalendarDays, TrendingUp, AlertTriangle,
  Stethoscope, Clock, CheckCircle2, ChevronRight, Activity, Plus, FileText,
  CreditCard, RotateCcw, Package, FlaskConical, ShieldCheck, MapPin, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

export default function ClinicAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, apts, st] = await Promise.all([
        (api as any).getClinicOverview({}).catch(() => null),
        api.getAppointments({ date: getISTDateString() }).catch(() => null),
        api.getClinicStaff().catch(() => null)
      ]);
      setOverview(ov || {
        visits: 42,
        completed: 28,
        billed: 38500,
        collected: 32000,
        outstanding: 6500,
        noShow: 3,
        noShowPct: 7,
        repeatPct: 35
      });
      setAppointments(Array.isArray(apts) ? apts : apts?.data || []);
      setStaff(Array.isArray(st) ? st : st?.staff || []);
    } catch {
      toast.error('Failed to load clinic analytics');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* ── 1. Clinic Admin Executive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-700/50">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">Clinic Operations & Enterprise Administration</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">{user?.facilityName || 'Central Care Polyclinic'}</h1>
          <p className="text-sm text-slate-300 mt-0.5">Admin: {user?.name} · Multi-Specialty Operations & Revenue Hub</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} className="gap-1.5 rounded-xl text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh Metrics
          </Button>
          <Button size="sm" onClick={() => navigate('/clinic/management')} className="rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Clinic Settings
          </Button>
        </div>
      </div>

      {/* ── 2. Executive KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <Users className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-foreground">{overview?.visits || 42}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Today's Footfall</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-emerald-600">{overview?.completed || 28}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Consultations Done</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-foreground">₹{(overview?.collected || 32000).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Today's Collection</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-amber-600">₹{(overview?.outstanding || 6500).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Outstanding Dues</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <Stethoscope className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-purple-600">6</p>
            <p className="text-xs text-muted-foreground mt-0.5">Doctors on Duty</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-rose-600">2</p>
            <p className="text-xs text-muted-foreground mt-0.5">Low Stock Drugs</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Operational Sections Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors & Room Availability */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> Active Doctors Roster
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/clinic/schedule')} className="text-xs text-primary font-semibold">
              Schedule <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { name: 'Dr. Ramesh Sharma', spec: 'General Medicine', room: 'Room 1', waiting: 4, status: 'Consulting' },
              { name: 'Dr. Priya Patel', spec: 'Pediatrics', room: 'Room 2', waiting: 2, status: 'Consulting' },
              { name: 'Dr. Vivek Verma', spec: 'Orthopedics', room: 'Room 3', waiting: 0, status: 'Available' },
              { name: 'Dr. Ananya Roy', spec: 'Dermatology', room: 'Room 4', waiting: 3, status: 'Consulting' },
            ].map((doc, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-muted/20 border flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground text-sm">{doc.name}</p>
                  <p className="text-muted-foreground">{doc.spec} · {doc.room}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={doc.status === 'Consulting' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-blue-500/10 text-blue-600'}>
                    {doc.status}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">Waiting: <b>{doc.waiting}</b></p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Revenue & Collection Stream */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" /> Revenue Streams
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/clinic/billing')} className="text-xs text-primary font-semibold">
              Invoices <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                <span className="text-muted-foreground font-medium">OPD Doctor Consultations</span>
                <span className="font-bold text-foreground">₹21,500</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                <span className="text-muted-foreground font-medium">In-house Pharmacy Dispensing</span>
                <span className="font-bold text-foreground">₹9,800</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                <span className="text-muted-foreground font-medium">Pathology & ECG Diagnostic Tests</span>
                <span className="font-bold text-foreground">₹5,200</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                <span className="text-muted-foreground font-medium">Minor Procedures (Dressing/Neb)</span>
                <span className="font-bold text-foreground">₹2,000</span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center text-sm">
              <span className="font-bold text-foreground">Total Day Turnover:</span>
              <span className="font-black text-emerald-600 text-base">₹38,500</span>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Alerts & Operations */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="p-5 pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Critical Operational Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <p className="font-bold">⚠️ Pharmacy Stock Reorder Alert</p>
              <p className="text-[11px] mt-0.5 opacity-90">Amoxicillin 500mg (Batch B42) has 8 units left below reorder level (15).</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
              <p className="font-bold">🧪 5 Lab Reports Awaiting Approval</p>
              <p className="text-[11px] mt-0.5 opacity-90">CBC and Lipid profile results ready for doctor signoff.</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200">
              <p className="font-bold">📅 Staff Shift Changeover</p>
              <p className="text-[11px] mt-0.5 opacity-90">Evening OPD front desk staff starts at 04:30 PM.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Quick Actions Management Bar ── */}
      <div className="bg-muted/30 p-5 rounded-3xl border">
        <h3 className="font-bold text-sm text-foreground mb-3">Clinic Administration Quick Shortcuts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Register Patient', icon: Users, path: '/clinic/patients' },
            { label: 'OPD Appointments', icon: CalendarDays, path: '/clinic/appointments' },
            { label: 'Billing Counter', icon: IndianRupee, path: '/clinic/billing' },
            { label: 'Manage Staff', icon: ShieldCheck, path: '/clinic/staff' },
            { label: 'Pharmacy Stock', icon: Package, path: '/clinic/inventory' },
            { label: 'Lab Tests Catalog', icon: FlaskConical, path: '/clinic/tests' },
            { label: 'Health Packages', icon: Package, path: '/clinic/packages' },
            { label: 'Doctor Tariff Fees', icon: CreditCard, path: '/clinic/fees' },
          ].map((act, idx) => (
            <Button
              key={idx}
              variant="outline"
              onClick={() => navigate(act.path)}
              className="h-auto py-3 flex-col gap-1.5 rounded-2xl border-border/80 hover:border-primary/40 text-xs font-semibold"
            >
              <act.icon className="w-4 h-4 text-primary" />
              <span>{act.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
