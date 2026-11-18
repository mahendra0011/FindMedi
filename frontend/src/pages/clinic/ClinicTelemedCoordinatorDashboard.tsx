import { useEffect, useState } from 'react';
import {
  Video,
  Clock,
  Calendar,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface TeleSession {
  id: string;
  appointmentId: string;
  patientName: string;
  phone: string;
  doctorName: string;
  scheduledTime: string;
  status: 'WAITING_PATIENT' | 'IN_ROOM' | 'COMPLETED';
}

export const ClinicTelemedCoordinatorDashboard: React.FC = () => {
  useAuth();
  const [sessions, setSessions] = useState<TeleSession[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const load = async () => {
    try {
      const res: any = await api.getAppointments({ date: todayStr() }).catch(() => null);
      const list = Array.isArray(res) ? res : res?.data || res?.appointments || [];
      const mapped: TeleSession[] = list
        .filter((a: any) => /video|tele|online/i.test(String(a?.appointmentMode ?? a?.mode ?? a?.type ?? '')))
        .map((a: any, idx: number) => ({
          id: String(a?.tokenNumber ?? idx + 1).padStart(3, 'TM'),
          appointmentId: String(a?._id ?? ''),
          patientName: a?.patientName || a?.patient || 'Patient',
          phone: a?.patientPhone || a?.phone || '—',
          doctorName: a?.doctorName || a?.doctor || '—',
          scheduledTime: a?.time || '—',
          status: /completed|cancel|no.?show|discharg/i.test(String(a?.status ?? ''))
            ? 'COMPLETED'
            : /consult|room|progress/i.test(String(a?.status ?? '')) ? 'IN_ROOM' : 'WAITING_PATIENT',
        }));
      setSessions(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyLink = (appointmentId: string) => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/doctor/video-call/${appointmentId}`);
    toast.success('Video-room link copied — share it with the patient');
  };

  const scheduledToday = sessions.length;
  const inRoom = sessions.filter((s) => s.status === 'IN_ROOM').length;
  const waiting = sessions.filter((s) => s.status === 'WAITING_PATIENT').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-600/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-2xl">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Telemedicine Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300">
                Telemed Coordinator
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Today's video-consultation sessions & patient join links
            </p>
          </div>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Calendar className="w-4 h-4" />
          Refresh Queue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Today</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{loading ? '—' : scheduledToday}</p>
          <span className="text-xs text-slate-500 mt-1 block">Video appointments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waiting</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">{loading ? '—' : waiting}</p>
          <span className="text-xs text-cyan-600/80 font-medium mt-1 block">Patients queued</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{loading ? '—' : inRoom}</p>
          <span className="text-xs text-emerald-600/80 font-medium mt-1 block">In consultation</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{loading ? '—' : sessions.filter(s => s.status === 'COMPLETED').length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Seen today</span>
        </div>
      </div>

      {/* Video Consult Session Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Today's Video Sessions</h3>
          <span className="text-xs text-slate-500 font-medium">Video mode appointments from the booking ledger</span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Video className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No video appointments today</p>
            <p className="text-xs text-slate-500">Video consultations booked for today will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((s) => (
              <div key={s.appointmentId || s.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {s.id}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white">{s.patientName}</h4>
                    <span className="text-xs text-slate-500">({s.phone})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{s.doctorName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.scheduledTime}</span>
                    <span>WebRTC</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    s.status === 'IN_ROOM' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {s.status === 'IN_ROOM' ? 'IN ROOM' : s.status === 'COMPLETED' ? 'COMPLETED' : 'WAITING'}
                  </span>

                  <button
                    onClick={() => handleCopyLink(s.appointmentId)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                    title="Copy patient join link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Link
                  </button>

                  <a
                    href={`/doctor/video-call/${s.appointmentId}`}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                    title="Open video room (doctor roles only)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Room
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
};

export default ClinicTelemedCoordinatorDashboard;
