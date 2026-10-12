import React, { useState } from 'react';
import {
  Building2,
  Users,
  Calendar,
  IndianRupee,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface BranchKpi {
  branchId: string;
  branchName: string;
  location: string;
  footfallToday: number;
  revenueToday: number;
  avgWaitMins: number;
  doctorAttendance: string;
  inventoryAlerts: number;
  status: 'OPTIMAL' | 'HIGH_LOAD' | 'CRITICAL';
}

export const ClinicBranchManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>('BR-01');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const branches: BranchKpi[] = [
    {
      branchId: 'BR-01',
      branchName: 'Downtown Care Clinic (Main)',
      location: 'MG Road, Central Hub',
      footfallToday: 142,
      revenueToday: 186500,
      avgWaitMins: 14,
      doctorAttendance: '8 / 8 Present',
      inventoryAlerts: 1,
      status: 'OPTIMAL'
    },
    {
      branchId: 'BR-02',
      branchName: 'Westside Super-Specialty Clinic',
      location: 'Ring Road, Sector 4',
      footfallToday: 98,
      revenueToday: 112000,
      avgWaitMins: 28,
      doctorAttendance: '5 / 6 Present',
      inventoryAlerts: 3,
      status: 'HIGH_LOAD'
    },
    {
      branchId: 'BR-03',
      branchName: 'Suburban Family Clinic',
      location: 'North Extension, Block B',
      footfallToday: 54,
      revenueToday: 48200,
      avgWaitMins: 9,
      doctorAttendance: '3 / 3 Present',
      inventoryAlerts: 0,
      status: 'OPTIMAL'
    }
  ];

  const activeBranch = branches.find(b => b.branchId === selectedBranch) || branches[0];

  const handleSyncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Branch operational metrics refreshed in real time');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Multi-Branch Operations Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Branch Manager
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cross-branch surveillance, revenue flow, staff attendance & SLA wait times
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>
                {b.branchName}
              </option>
            ))}
          </select>

          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Feeds
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Footfall</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeBranch.footfallToday}</p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% vs last week
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Collections</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{activeBranch.revenueToday.toLocaleString('en-IN')}
            </p>
            <span className="text-xs text-slate-500 font-medium mt-1 block">Net Settlement Today</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Wait Time</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeBranch.avgWaitMins} mins</p>
            <span className={`text-xs font-medium mt-1 block ${activeBranch.avgWaitMins > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {activeBranch.avgWaitMins > 20 ? 'Queue SLA Warning' : 'Within Target SLA (<15m)'}
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor Roster</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeBranch.doctorAttendance}</p>
            <span className="text-xs text-indigo-500 font-medium mt-1 block">Biometric Verified</span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cross-Branch Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Branches Summary</h3>
            <p className="text-xs text-slate-500">Live operational throughput & inventory alerts</p>
          </div>
          <button
            onClick={() => toast.success('Exporting Branch Consolidated Excel report...')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Consolidated XLS
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Footfall</th>
                <th className="py-3 px-4">Revenue (INR)</th>
                <th className="py-3 px-4">Avg Wait</th>
                <th className="py-3 px-4">Doctors</th>
                <th className="py-3 px-4">Stock Alerts</th>
                <th className="py-3 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {branches.map(b => (
                <tr key={b.branchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {b.branchName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.location}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{b.footfallToday}</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-600">₹{b.revenueToday.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.avgWaitMins}m</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.doctorAttendance}</td>
                  <td className="py-3.5 px-4">
                    {b.inventoryAlerts > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> {b.inventoryAlerts} Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Nominal
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      b.status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-700' :
                      b.status === 'HIGH_LOAD' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClinicBranchManagerDashboard;
