import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Stethoscope, CalendarDays, IndianRupee, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import StatCard from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminAnalytics() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useApiQuery(['admin', 'stats'], () => api.dashboardStats());
  const { data: users = [], isLoading: usersLoading } = useApiQuery(['admin', 'users'], () => api.getUsers());

  if (statsLoading || usersLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">System-wide metrics and insights</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={users.filter(u => u.role === 'patient').length} icon={Users} change="Registered patients" />
        <StatCard title="Total Doctors" value={users.filter(u => u.role === 'doctor').length} icon={Stethoscope} change="Onboard doctors" />
        <StatCard title="Appointments" value={stats?.stats?.todayAppointments || 0} icon={CalendarDays} change="Today" />
        <StatCard title="Revenue" value={`Rs ${(stats?.stats?.revenue || 0).toLocaleString()}`} icon={IndianRupee} change="Month to date" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Appointments */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Weekly Appointments</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.weeklyAppointments || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.revenueData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats?.departmentData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {(stats?.departmentData || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Distribution */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={[
                { name: 'Patients', value: users.filter(u => u.role === 'patient').length },
                { name: 'Doctors', value: users.filter(u => u.role === 'doctor').length },
                { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
              ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                <Cell fill="#10b981" />
                <Cell fill="#3b82f6" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}