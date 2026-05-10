import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, Clock, Activity, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const severityColors = {
  Critical: { bg: 'bg-red-500/10', text: 'text-red-600' },
  Serious: { bg: 'bg-orange-500/10', text: 'text-orange-600' },
  Stable: { bg: 'bg-green-500/10', text: 'text-green-600' },
};

export default function PatientEmergency() {
  const { user } = useAuth();
  const [myCases, setMyCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ condition: '', severity: 'Serious', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadMyEmergencies(); }, []);

  const loadMyEmergencies = async () => {
    setLoading(true);
    try {
      const list = await api.getEmergencies({ status: 'All' });
      const userId = user?.id || user?._id;
      setMyCases((list || []).filter(e => String(e.patientId || '') === String(userId || '') || e.patientName === user?.name));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createEmergency({
        patientName: user?.name || 'Patient',
        patientId: user?.id || user?._id,
        condition: form.condition,
        severity: form.severity,
        phone: form.phone || user?.phone,
      });
      setShowForm(false);
      setForm({ condition: '', severity: 'Serious', phone: '' });
      loadMyEmergencies();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const activeCases = myCases.filter(c => !['Discharged', 'Transferred', 'Rejected'].includes(c.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" /> Emergency Services
          </h1>
          <p className="text-muted-foreground">Report an emergency or view your cases</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 gap-2" onClick={() => setShowForm(true)}>
          <AlertTriangle className="w-4 h-4" /> Report Emergency
        </Button>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
        <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" /> Emergency Contacts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-3 border border-border/60">
            <p className="text-sm text-muted-foreground">Ambulance</p>
            <p className="font-bold text-foreground">108</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border/60">
            <p className="text-sm text-muted-foreground">Emergency Room</p>
            <p className="font-bold text-foreground">102</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border/60">
            <p className="text-sm text-muted-foreground">Poison Control</p>
            <p className="font-bold text-foreground">104</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> My Emergency Cases
        </h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : activeCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>No active emergency cases</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCases.map(c => (
              <div key={c._id} className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`${severityColors[c.severity]?.bg} ${severityColors[c.severity]?.text}`}>{c.severity}</Badge>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <h4 className="font-medium text-foreground">{c.condition}</h4>
                {c.assignedDoctorName && <p className="text-sm text-blue-600 mt-2">👨‍⚕️ Doctor: {c.assignedDoctorName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Report Emergency</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Condition</label>
                <Input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} 
                  placeholder="e.g. Chest pain, Accident" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Severity</label>
                <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="Critical">Critical</option>
                  <option value="Serious">Serious</option>
                  <option value="Stable">Stable</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Your phone" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Emergency'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
