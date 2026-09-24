import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateUtils';

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAppointments({ limit: 100 }).then((res) => {
      setAppointments(res?.appointments || res?.data || res || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6" /> My Appointments</h1>
        <Link to="/patient/booking-history"><Button variant="outline" size="sm">Booking History</Button></Link>
      </div>
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appointments yet.</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a._id} className="rounded-xl border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{a.doctor || a.doctorName || 'Doctor'}</p>
                <p className="text-xs text-muted-foreground">{formatDisplayDate(a.date)} · {a.time || a.timeSlot || ''} · {a.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
