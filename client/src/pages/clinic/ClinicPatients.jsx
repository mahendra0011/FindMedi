import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, FileText, Search, Users, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { subSlotFor } from '@/lib/timeSlots';
import { CompletedCard } from '@/components/TodayAppointmentsSection';

export default function ClinicPatients() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([api.getAppointments(), api.getRecords()]);
      const appts = a?.data || a || [];
      const myAppts = appts?.filter(apt => apt.doctor?.toLowerCase().includes(user?.name?.toLowerCase())) || [];
      setAppointments(myAppts);
      setRecords(r?.data || r?.records || r || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [user?.name]);

  // All patients who have appointments (actual visits)
  const uniquePatients = [...new Map(appointments.map(a => [a.patient, a])).values()];

  const filteredPatients = uniquePatients.filter(p => !search || p.patient?.toLowerCase().includes(search.toLowerCase()));

  const getPatientAppointments = (name) => appointments.filter(a => a.patient === name);
  const getVisitCount = (name) => getPatientAppointments(name).length;
  const getRecordCount = (name) => records.filter(r => r.patient === name).length;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Patients</h1>
          <p className="text-muted-foreground">{filteredPatients.length} patients</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{uniquePatients.length}</p>
          <p className="text-xs text-muted-foreground">Patients</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{appointments.filter(a => a.status === 'Completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <FileText className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-xs text-muted-foreground">Records</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..." className="pl-10" />
      </div>

      {/* Patient Cards (completed appointment card) — shown on top */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No patients yet</p>
          <p className="text-sm text-muted-foreground/70">Patients with appointments will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((apt, i) => {
            const visitCount = getVisitCount(apt.patient);
            const recordCount = getRecordCount(apt.patient);
            const latestAppt = appointments
              .filter(a => a.patient === apt.patient)
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

            return (
              <motion.div
                key={apt._id || apt.patient + i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="scroll-mt-4 flex flex-col"
              >
                <CompletedCard
                  apt={latestAppt || apt}
                  subSlotFor={subSlotFor}
                  onViewFile={(url) => url && window.open(url, '_blank')}
                  stats={{ visits: visitCount, records: recordCount }}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
