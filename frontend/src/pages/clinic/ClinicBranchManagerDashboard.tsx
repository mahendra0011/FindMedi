import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  IndianRupee,
  Activity,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface ClinicBranchRow {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  manager?: { name?: string; email?: string } | string;
  active?: boolean;
  createdAt?: string;
}

export const ClinicBranchManagerDashboard: React.FC = () => {
  useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<ClinicBranchRow[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBranches = async () => {
    try {
      const res: any = await api.get('/clinic-branches').catch(() => null);
      const rows: ClinicBranchRow[] = Array.isArray(res?.branches) ? res.branches : [];
      setBranches(rows);
      setSelectedBranch((cur) => (cur && rows.some((r) => r._id === cur) ? cur : rows[0]?._id ?? ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const activeBranch = branches.find((b) => b._id === selectedBranch) || branches[0];

  const handleSyncData = async () => {
    setIsSyncing(true);
    await loadBranches();
    setIsSyncing(false);
    toast.success('Branch list refreshed');
  };

  const handleExportCsv = () => {
    if (branches.length === 0) {
      toast.info('No branches to export yet');
      return;
    }
    const header = 'Branch,City,Address,Phone,Manager,Status,Created';
    const rows = branches.map((b) => {
      const manager = typeof b.manager === 'string' ? b.manager : b.manager?.name ?? '';
      const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [cell(b.name), cell(b.city), cell(b.address), cell(b.phone), cell(manager), b.active ? 'active' : 'inactive', cell(b.createdAt?.slice(0, 10))].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic-branches.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Branch CSV downloaded');
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
                Branch Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Branch Manager
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Branch directory & consolidated status across this facility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid — per-branch live telemetry has no source yet; shown honestly */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Footfall</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">—</p>
            <span className="text-xs text-slate-400 font-medium mt-1 block">Per-branch counter not yet wired</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Collections</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">—</p>
            <span className="text-xs text-slate-400 font-medium mt-1 block">Per-branch ledger not yet wired</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Wait Time</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">—</p>
            <span className="text-xs text-slate-400 font-medium mt-1 block">Token analytics pending</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Status</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeBranch ? (activeBranch.active ? 'Active' : 'Inactive') : '—'}</p>
            <span className="text-xs text-indigo-500 font-medium mt-1 block">{activeBranch ? 'Operator-managed' : 'No branch selected'}</span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Branch Directory */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered Branches</h3>
            <p className="text-xs text-slate-500">Live list from the clinic branch registry</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={() => navigate('/clinic/branches')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Manage Branches
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading branches…</p>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No branches registered yet</p>
              <p className="text-xs text-slate-500">Create your first branch to compare performance across locations.</p>
              <button
                onClick={() => navigate('/clinic/branches')}
                className="mt-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Add Branch
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {branches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {b.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.city ?? '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.address ?? '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{typeof b.manager === 'string' ? b.manager : b.manager?.name ?? '—'}</td>
                    <td className="py-3.5 px-4">
                      {b.active ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicBranchManagerDashboard;
