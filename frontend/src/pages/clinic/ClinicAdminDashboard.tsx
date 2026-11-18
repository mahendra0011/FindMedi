import { useState, useEffect } from 'react';
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

export default function ClinicAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const loadData = async () => {
    try {
      const [ov, ro, inv] = await Promise.all([
        (api as any).getClinicOverview({}).catch(() => null),
        (api as any).getClinicRosterToday().catch(() => null),
        api.get('/inventory/items').catch(() => null),
      ]);
      setOverview(ov || null);
      setRoster(Array.isArray(ro?.roster) ? ro.roster : []);
      const invList: any[] = Array.isArray(inv) ? inv : inv?.data || inv?.items || [];
      const lows = invList.filter((it) => {
        const qty = Number(it?.currentStock ?? it?.quantity ?? it?.stock ?? NaN);
        const min = Number(it?.reorderLevel ?? it?.minStock ?? NaN);
        return Number.isFinite(qty) && Number.isFinite(min) ? qty <= min : /low|reorder/i.test(String(it?.status ?? ''));
      });
      setLowStock(lows.slice(0, 5));
    } catch {
      toast.error('Failed to load clinic analytics');
    }
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
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">{user?.facilityName || 'Clinic Operations Hub'}</h1>
          <p className="text-sm text-slate-300 mt-0.5">Admin: {user?.name} · Live clinic performance console</p>
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
            <p className="text-xl font-black text-foreground">{overview == null ? '�' : overview.visits ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Today's Footfall</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-emerald-600">{overview == null ? '�' : overview.completed ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Consultations Done</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-foreground">₹{overview == null ? '�' : Number(overview.collected ?? 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Today's Collection</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-amber-600">₹{overview == null ? '�' : Number(overview.outstanding ?? 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Outstanding Dues</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <Stethoscope className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-purple-600">{roster.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Doctors on Duty</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-rose-600">{lowStock.length}</p>
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
            {roster.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No doctors on roster for this facility yet.</p>
            ) : roster.map((doc: any, idx: number) => (
              <div key={doc._id ?? idx} className="p-3 rounded-2xl bg-muted/20 border flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground text-sm">{doc.name}</p>
                  <p className="text-muted-foreground">{doc.specialization}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    On duty
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">Waiting: <b>{doc.waiting ?? 0}</b></p>
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
            {overview == null ? (
              <p className="text-xs text-muted-foreground p-3">Billing ledger unavailable — figures will appear once the billing API responds.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                  <span className="text-muted-foreground font-medium">Billed</span>
                  <span className="font-bold text-foreground">₹{Number(overview.billed ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                  <span className="text-muted-foreground font-medium">Collected</span>
                  <span className="font-bold text-foreground">₹{Number(overview.collected ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20">
                  <span className="text-muted-foreground font-medium">Outstanding</span>
                  <span className="font-bold text-foreground">₹{Number(overview.outstanding ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t flex justify-between items-center text-sm">
              <span className="font-bold text-foreground">Total Day Turnover:</span>
              <span className="font-black text-emerald-600 text-base">₹{overview == null ? '—' : Number(overview.billed ?? 0).toLocaleString('en-IN')}</span>
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
            {lowStock.length === 0 ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                <p className="font-bold">Stock levels OK</p>
                <p className="text-[11px] mt-0.5 opacity-90">No items below reorder level — inventory feed healthy.</p>
              </div>
            ) : lowStock.slice(0, 3).map((it: any, idx: number) => (
              <div key={it._id ?? it.sku ?? idx} className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <p className="font-bold">Stock reorder — {it.name ?? it.itemName ?? 'Item'}</p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {Number(it.currentStock ?? it.quantity ?? it.stock ?? 0)} units left (reorder at {Number(it.reorderLevel ?? it.minStock ?? 0)}).
                </p>
              </div>
            ))}
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
