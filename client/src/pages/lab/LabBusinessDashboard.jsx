import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, FlaskConical, CheckCircle, DollarSign,
  Clock, AlertTriangle, Microscope, Activity, TrendingUp,
  CalendarDays, Search, Package, CreditCard, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = {
  Pending: 'bg-warning/10 text-warning',
  Processing: 'bg-info/10 text-info',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
  Confirmed: 'bg-success/10 text-success',
  'Sample Collected': 'bg-info/10 text-info',
  'Under Verification': 'bg-warning/10 text-warning',
  Operational: 'bg-success/10 text-success',
  'Under Maintenance': 'bg-warning/10 text-warning',
  'Out of Service': 'bg-destructive/10 text-destructive',
};

const defaultOrders = [
  { _id: 'o1', orderId: 'ORD-001', patientName: 'Ravi Sharma', tests: [{ testName: 'CBC' }, { testName: 'Lipid Profile' }], status: 'Completed', amount: 1800, orderDate: new Date().toISOString(), doctorName: 'Dr. Verma' },
  { _id: 'o2', orderId: 'ORD-002', patientName: 'Priya Patel', tests: [{ testName: 'Thyroid' }, { testName: 'Blood Sugar' }], status: 'Pending', amount: 1200, orderDate: new Date().toISOString(), doctorName: 'Dr. Sethi' },
  { _id: 'o3', orderId: 'ORD-003', patientName: 'Amit Verma', tests: [{ testName: 'ECG' }, { testName: 'X-Ray Chest' }], status: 'Processing', amount: 2500, orderDate: new Date().toISOString(), doctorName: 'Dr. Mehta' },
  { _id: 'o4', orderId: 'ORD-004', patientName: 'Sunita Gupta', tests: [{ testName: 'Urine Routine' }, { testName: 'Liver Function' }], status: 'Completed', amount: 2200, orderDate: new Date(Date.now() - 86400000).toISOString(), doctorName: 'Dr. Kapoor' },
  { _id: 'o5', orderId: 'ORD-005', patientName: 'Vikas Yadav', tests: [{ testName: 'MRI Brain' }], status: 'Confirmed', amount: 15000, orderDate: new Date(Date.now() - 86400000).toISOString(), doctorName: 'Dr. Sharma' },
  { _id: 'o6', orderId: 'ORD-006', patientName: 'Neha Kapoor', tests: [{ testName: 'CBC' }], status: 'Pending', amount: 299, orderDate: new Date().toISOString(), doctorName: 'Dr. Gupta' },
  { _id: 'o7', orderId: 'ORD-007', patientName: 'Rohit Singh', tests: [{ testName: 'Lipid Profile' }, { testName: 'Blood Sugar' }], status: 'Completed', amount: 1100, orderDate: new Date().toISOString(), doctorName: 'Dr. Jain' },
];

const defaultEquipment = [
  { _id: 'e1', name: 'Siemens MRI 3T', type: 'MRI', status: 'Operational', nextMaintenanceDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] },
  { _id: 'e2', name: 'GE CT Scanner', type: 'CT Scan', status: 'Operational', nextMaintenanceDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] },
  { _id: 'e3', name: 'Philips X-Ray', type: 'X-Ray', status: 'Under Maintenance', nextMaintenanceDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
  { _id: 'e4', name: 'Samsung Ultrasound', type: 'Ultrasound', status: 'Operational', nextMaintenanceDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] },
  { _id: 'e5', name: 'Schiller ECG', type: 'ECG', status: 'Operational', nextMaintenanceDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function LabBusinessDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [equipment, setEquipment] = useState(defaultEquipment);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('medicore_lab_orders');
    if (stored) {
      setOrders(JSON.parse(stored));
    } else {
      localStorage.setItem('medicore_lab_orders', JSON.stringify(defaultOrders));
      setOrders(defaultOrders);
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayOrders = orders.filter(o => o.orderDate?.startsWith(todayStr));
    const pendingSamples = orders.filter(o => o.status === 'Pending' || o.status === 'Processing');
    const completedToday = todayOrders.filter(o => o.status === 'Completed');
    const revenueToday = completedToday.reduce((s, o) => s + (o.amount || 0), 0);
    return {
      todayOrders: todayOrders.length,
      pendingSamples: pendingSamples.length,
      completedToday: completedToday.length,
      revenueToday,
    };
  }, [orders, todayStr]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.patientName?.toLowerCase().includes(q) ||
      o.orderId?.toLowerCase().includes(q) ||
      o.doctorName?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const equipmentStatusCounts = useMemo(() => {
    const operational = equipment.filter(e => e.status === 'Operational').length;
    const underMaintenance = equipment.filter(e => e.status === 'Under Maintenance').length;
    const outOfService = equipment.filter(e => e.status === 'Out of Service').length;
    return { operational, underMaintenance, outOfService, total: equipment.length };
  }, [equipment]);

  const statCards = [
    { label: "Today's Orders", value: stats.todayOrders, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pending Samples', value: stats.pendingSamples, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Revenue Today', value: `₹${stats.revenueToday.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
          <h1 className="font-heading text-2xl font-bold">Lab Dashboard</h1>
          <p className="opacity-90">Welcome, {user?.name || 'Lab Admin'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <motion.div key={s.label} variants={item} whileHover={{ scale: 1.02 }}
            className="bg-card rounded-2xl border border-border/60 p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Recent Orders
            </h2>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9 h-9 text-sm" />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left pb-3 font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Tests</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-center pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 5).map((o, i) => (
                    <motion.tr key={o._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium text-foreground">{o.orderId}</td>
                      <td className="py-3 text-foreground">{o.patientName}</td>
                      <td className="py-3 text-muted-foreground">{o.tests?.map(t => t.testName).join(', ')}</td>
                      <td className="py-3 text-right font-medium">₹{o.amount?.toLocaleString()}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-muted text-muted-foreground'}`}>
                          {o.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="bg-card rounded-2xl border border-border/60 p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Microscope className="w-5 h-5 text-warning" /> Equipment Status
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-success/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-success">{equipmentStatusCounts.operational}</p>
              <p className="text-[10px] text-muted-foreground">Operational</p>
            </div>
            <div className="bg-warning/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-warning">{equipmentStatusCounts.underMaintenance}</p>
              <p className="text-[10px] text-muted-foreground">Maintenance</p>
            </div>
            <div className="bg-destructive/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-destructive">{equipmentStatusCounts.outOfService}</p>
              <p className="text-[10px] text-muted-foreground">Out of Service</p>
            </div>
          </div>

          <div className="space-y-3">
            {equipment.filter(e => e.status !== 'Operational').slice(0, 3).map(e => (
              <div key={e._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[e.status] || 'bg-muted text-muted-foreground'}`}>
                  {e.status}
                </span>
              </div>
            ))}
            {equipment.filter(e => e.status !== 'Operational').length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-success opacity-50" />
                <p className="text-sm">All equipment operational</p>
              </div>
            )}
          </div>

          {equipmentStatusCounts.total > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total equipment</span>
                <span className="font-semibold text-foreground">{equipmentStatusCounts.total}</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${(equipmentStatusCounts.operational / Math.max(equipmentStatusCounts.total, 1)) * 100}%` }} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
