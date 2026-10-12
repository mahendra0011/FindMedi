import React, { useState } from 'react';
import {
  Video,
  PhoneCall,
  Clock,
  UserCheck,
  Calendar,
  Signal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  Copy,
  PlayCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface TeleSession {
  id: string;
  patientName: string;
  phone: string;
  doctorName: string;
  scheduledTime: string;
  status: 'WAITING_PATIENT' | 'IN_ROOM' | 'DOCTOR_READY' | 'COMPLETED';
  channel: 'WebRTC' | 'WhatsApp Video' | 'Zoom' | 'Jitsi';
  roomUrl: string;
  vitalsCaptured: boolean;
}

export const ClinicTelemedCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TeleSession[]>([
    {
      id: 'TM-901',
      patientName: 'Sunita Sharma',
      phone: '+91 98201 44521',
      doctorName: 'Dr. Aditi Rao (Cardio)',
      scheduledTime: '10:30 AM',
      status: 'DOCTOR_READY',
      channel: 'WebRTC',
      roomUrl: 'https://tele.findmedi.com/room/tm-901',
      vitalsCaptured: true
    },
    {
      id: 'TM-902',
      patientName: 'Kunal Verma',
      phone: '+91 97112 88301',
      doctorName: 'Dr. Sameer Patel (General)',
      scheduledTime: '10:45 AM',
      status: 'WAITING_PATIENT',
      channel: 'WebRTC',
      roomUrl: 'https://tele.findmedi.com/room/tm-902',
      vitalsCaptured: false
    },
    {
      id: 'TM-903',
      patientName: 'Meera Nair',
      phone: '+91 94471 12900',
      doctorName: 'Dr. Aditi Rao (Cardio)',
      scheduledTime: '11:15 AM',
      status: 'IN_ROOM',
      channel: 'WebRTC',
      roomUrl: 'https://tele.findmedi.com/room/tm-903',
      vitalsCaptured: true
    }
  ]);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Patient consultation join link copied to clipboard');
  };

  const handleSendReminderSms = (phone: string, name: string) => {
    toast.success(`WhatsApp / SMS joining prompt sent to ${name} (${phone})`);
  };

  const handleJoinTestRoom = (id: string) => {
    toast(`Opening pre-flight AV test room for ${id}`, { icon: '🎧' });
  };

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
                Telemedicine Queue & Pre-Flight Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300">
                Telemed Coordinator
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Patient digital readiness check, AV hardware ping, E-Prescription dispatch & queue coordinator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            <Signal className="w-4 h-4 text-emerald-500 animate-pulse" />
            WebRTC Gateway: LIVE (12ms ping)
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Today</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">28</p>
          <span className="text-xs text-slate-500 mt-1 block">Video Appointments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Pre-Flight / Ready</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">4</p>
          <span className="text-xs text-cyan-600/80 font-medium mt-1 block">Audio / Cam OK</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Rooms</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">2</p>
          <span className="text-xs text-emerald-600/80 font-medium mt-1 block">Consultation underway</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Call Duration</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">11.4 min</p>
          <span className="text-xs text-slate-500 mt-1 block">Per Tele-encounter</span>
        </div>
      </div>

      {/* Video Consult Session Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Telehealth Encounters</h3>
          <span className="text-xs text-slate-500 font-medium">Real-time room status & dispatch</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => (
            <div key={s.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                  <span>{s.channel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  s.status === 'IN_ROOM' ? 'bg-emerald-100 text-emerald-700' :
                  s.status === 'DOCTOR_READY' ? 'bg-cyan-100 text-cyan-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {s.status}
                </span>

                <button
                  onClick={() => handleCopyLink(s.roomUrl)}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  title="Copy consultation URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Link
                </button>

                <button
                  onClick={() => handleSendReminderSms(s.phone, s.patientName)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Prompt WhatsApp
                </button>

                <button
                  onClick={() => handleJoinTestRoom(s.id)}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Pre-Flight Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClinicTelemedCoordinatorDashboard;
