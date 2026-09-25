import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, User, Clock, MessageSquare, CheckCircle, XCircle, Activity, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ProviderIncomingCall from '@/components/emergency/ProviderIncomingCall';

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500' },
  Serious: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500' },
  Stable: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500' },
};

const statusFlow = ['Pending', 'Assigned', 'Under Treatment', 'Stable', 'Transferred', 'Discharged'];

export default function DoctorEmergency() {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  // File 04 — full-screen incoming-call alert for the newest pending case.
  // List UI below stays as the queue; the overlay guarantees the alert is never missed.
  const [showIncoming, setShowIncoming] = useState(true);
  const prevPendingCount = useRef(0);

  useEffect(() => { loadEmergencies(); }, []);

  const loadEmergencies = async () => {
    setLoading(true);
    try {
      const list = await api.getEmergencies({ status: 'All' });
      setEmergencies(list || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    try {
      await api.assignEmergencyDoctor(id, user?.id || user?._id, user?.name);
      toast.success('Emergency case accepted');
      loadEmergencies();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.updateEmergencyStatus(id, 'Rejected');
      toast.success('Emergency case rejected');
      loadEmergencies();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateEmergencyStatus(id, status);
      toast.success(`Status updated to ${status}`);
      loadEmergencies();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedCase) return;
    try {
      await api.addEmergencyNote(selectedCase._id, noteText);
      setNoteText('');
      toast.success('Note added');
      loadEmergencies();
    } catch (e: any) { toast.error(e.message); }
  };

  const pendingCases = emergencies.filter(e => e.status === 'Pending');
  const myCases = emergencies.filter(e => e.assignedDoctorName === user?.name);
  const incomingCase = pendingCases[0] || null;

  // Re-raise the full-screen alert whenever a NEW pending case arrives.
  useEffect(() => {
    if (pendingCases.length > prevPendingCount.current) {
      setShowIncoming(true);
    }
    prevPendingCount.current = pendingCases.length;
  }, [pendingCases.length]);

  const handleIncomingAccept = async (requestId: string) => {
    await handleAccept(requestId);
    setShowIncoming(false);
  };

  const handleIncomingReject = async (requestId: string) => {
    await handleReject(requestId);
    setShowIncoming(false);
  };

  return (
    <div className="space-y-6">
      {/* File 04 — full-screen accept/reject, never a toast-only alert */}
      {incomingCase && showIncoming && !loading && (
        <ProviderIncomingCall
          data={{
            requestId: String(incomingCase._id),
            providerType: 'emergency_doctor',
            title: incomingCase.condition || 'Emergency Case',
            subtitle: `${incomingCase.severity || 'Critical'} — ${incomingCase.patientName || 'Unknown patient'}. Review and accept before the timer ends.`,
            patient: { name: incomingCase.patientName, phone: incomingCase.phone },
            windowSeconds: 30,
          }}
          onAccept={handleIncomingAccept}
          onReject={handleIncomingReject}
          onTimeout={handleIncomingReject}
        />
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" /> Emergency Cases
          </h1>
          <p className="text-muted-foreground">Fast-response for critical patients</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-red-600">{pendingCases.length}</p>
            <p className="text-xs text-red-600">Pending</p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-foreground">{myCases.length}</p>
            <p className="text-xs text-muted-foreground">My Cases</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {pendingCases.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> New Alerts ({pendingCases.length})
              </h3>
              <div className="space-y-3">
                {pendingCases.map(em => (
                  <motion.div key={em._id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className={`bg-card rounded-xl border-2 ${severityColors[em.severity]?.border || 'border-border'} p-4`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${severityColors[em.severity]?.bg} ${severityColors[em.severity]?.text}`}>{em.severity}</Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(em.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground">{em.condition}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="w-3 h-3" /> {em.patientName || 'Unknown'}
                        </div>
                        {em.phone && <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Phone className="w-3 h-3" /> {em.phone}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 gap-1" onClick={() => handleAccept(em._id)}>
                          <CheckCircle className="w-4 h-4" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleReject(em._id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border/60 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> My Emergency Cases
            </h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : myCases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active emergency cases</p>
            ) : (
              <div className="space-y-3">
                {myCases.map(em => (
                  <div key={em._id} onClick={() => setSelectedCase(em)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedCase?._id === em._id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${severityColors[em.severity]?.bg} ${severityColors[em.severity]?.text}`}>{em.severity}</Badge>
                          <span className="text-xs font-medium text-muted-foreground">{em.status}</span>
                        </div>
                        <h4 className="font-medium text-foreground mt-1">{em.condition}</h4>
                        <p className="text-sm text-muted-foreground">{em.patientName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-4">
          <h3 className="font-semibold text-foreground mb-4">Case Details</h3>
          {selectedCase ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${severityColors[selectedCase.severity]?.bg} ${severityColors[selectedCase.severity]?.text}`}>{selectedCase.severity}</Badge>
                <Badge variant="outline">{selectedCase.status}</Badge>
              </div>
              <div><p className="text-sm text-muted-foreground">Patient</p><p className="font-medium">{selectedCase.patientName || 'Unknown'}</p></div>
              <div><p className="text-sm text-muted-foreground">Condition</p><p className="font-medium">{selectedCase.condition}</p></div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Update Status</p>
                <div className="flex flex-wrap gap-1">
                  {statusFlow.map(s => (
                    <button key={s} onClick={() => handleStatusChange(selectedCase._id, s)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedCase.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Notes</p>
                <div className="flex gap-2">
                  <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Quick note..." className="flex-1" />
                  <Button size="sm" onClick={handleAddNote}>Add</Button>
                </div>
                {selectedCase.notes?.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {selectedCase.notes.map((n: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-2 text-sm">
                        <p className="text-foreground">{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.doctorName} • {new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Select a case</p>
          )}
        </div>
      </div>
    </div>
  );
}