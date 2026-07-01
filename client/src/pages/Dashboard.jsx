import { useQuery } from '@tanstack/react-query';
import { UserRound, Stethoscope, CalendarDays, CreditCard, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSelector } from 'react-redux';
import { selectSetting } from '@/store/slices/settingsSlice';
import { applyUserSettings } from '@/lib/settings';

const COLORS = ['hsl(174,62%,38%)','hsl(210,80%,55%)','hsl(38,92%,50%)','hsl(152,60%,42%)','hsl(210,12%,50%)'];

const FALLBACK = {
  stats: { totalPatients: 1247, totalDoctors: 48, todayAppointments: 32, revenue: 62400 },
  weeklyAppointments: [
    { day:'Mon',count:24},{day:'Tue',count:18},{day:'Wed',count:32},
    { day:'Thu',count:27},{day:'Fri',count:20},{day:'Sat',count:15},{day:'Sun',count:8},
  ],
  revenueData: [
    {month:'Jan',revenue:42000},{month:'Feb',revenue:38000},{month:'Mar',revenue:51000},
    {month:'Apr',revenue:47000},{month:'May',revenue:55000},{month:'Jun',revenue:62000},
  ],
  departmentData: [
    {name:'Cardiology',value:30},{name:'Neurology',value:22},{name:'Orthopedics',value:18},
    {name:'Pediatrics',value:15},{name:'Other',value:15},
  ],
  recentAppointments: [
    {_id:1,patient:'Sarah Johnson',doctor:'Dr. Smith',time:'10:00 AM',status:'Confirmed'},
    {_id:2,patient:'Mike Chen',doctor:'Dr. Patel',time:'11:30 AM',status:'Pending'},
    {_id:3,patient:'Emma Wilson',doctor:'Dr. Lee',time:'2:00 PM',status:'Confirmed'},
    {_id:4,patient:'James Brown',doctor:'Dr. Garcia',time:'3:30 PM',status:'Cancelled'},
    {_id:5,patient:'Lisa Davis',doctor:'Dr. Kim',time:'4:00 PM',status:'Confirmed'},
  ],
};

const statusCls = { Confirmed:'bg-success/10 text-success', Pending:'bg-warning/10 text-warning', Cancelled:'bg-destructive/10 text-destructive', Completed:'bg-info/10 text-info' };
const tooltipStyle = { borderRadius:'0.75rem', border:'1px solid hsl(200,20%,90%)', fontSize:12 };

export default function Dashboard() {
  const { user } = useAuth();
  const settings = useSelector(selectSetting) || {};
  const { data = FALLBACK } = useQuery({ queryKey:['dashboard'], queryFn: api.dashboardStats, onError:()=>{} });
  const { stats, weeklyAppointments, revenueData, departmentData, recentAppointments } = data;

  // Apply appearance settings when dashboard mounts or settings change
  if (typeof document !== 'undefined') {
    applyUserSettings(settings);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here's your hospital overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Patients" value={stats?.totalPatients?.toLocaleString() ?? '—'} change="+12% from last month" changeType="positive" icon={UserRound} />
        <StatCard title="Active Doctors" value={stats?.totalDoctors ?? '—'} change="+3 new this month" changeType="positive" icon={Stethoscope} iconColor="text-info" iconBg="bg-info/10" />
        <StatCard title="Appointments Today" value={stats?.todayAppointments ?? '—'} change="5 pending" changeType="neutral" icon={CalendarDays} iconColor="text-warning" iconBg="bg-warning/10" />
        <StatCard title="Revenue (MTD)" value={`Rs ${(stats?.revenue ?? 0).toLocaleString()}`} change="+18% from last month" changeType="positive" icon={CreditCard} iconColor="text-success" iconBg="bg-success/10" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-lg text-card-foreground">Weekly Appointments</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyAppointments}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200,20%,90%)" />
              <XAxis dataKey="day" stroke="hsl(210,12%,50%)" fontSize={12} />
              <YAxis stroke="hsl(210,12%,50%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(174,62%,38%)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-lg text-card-foreground">Revenue Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200,20%,90%)" />
              <XAxis dataKey="month" stroke="hsl(210,12%,50%)" fontSize={12} />
              <YAxis stroke="hsl(210,12%,50%)" fontSize={12} tickFormatter={v => `Rs ${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`Rs ${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(174,62%,38%)" strokeWidth={3} dot={{ fill:'hsl(174,62%,38%)',r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Recent Appointments</h3>
          <div className="space-y-2">
            {recentAppointments?.map((apt, i) => (
              <div key={apt._id ?? i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {apt.patient?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-card-foreground">{apt.patient}</p>
                    <p className="text-xs text-muted-foreground">{apt.doctor}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />{apt.time}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls[apt.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Departments</h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={departmentData} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={4} dataKey="value">
                {departmentData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {departmentData?.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground text-xs">{d.name}</span>
                </div>
                <span className="font-medium text-xs text-card-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}// 4
