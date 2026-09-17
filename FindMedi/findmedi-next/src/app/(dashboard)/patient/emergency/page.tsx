/**
 * Emergency Services — ported from client/src/pages/patient/PatientEmergency.jsx (Phase 4).
 * Report emergencies and track the patient's own cases.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertTriangle, Phone, Clock, Activity, CheckCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { emergencyApi } from '@/features/emergency/api';
import { useCreateEmergency } from '@/features/emergency/hooks';
import type { EmergencyCase } from '@/features/emergency/types';

const severityColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: 'bg-red-500/10', text: 'text-red-600' },
  Serious: { bg: 'bg-orange-500/10', text: 'text-orange-600' },
  Stable: { bg: 'bg-green-500/10', text: 'text-green-600' },
};

export default function EmergencyPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ condition: '', severity: 'Serious', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const createMut = useCreateEmergency();

  const userId = user?._id || (user as unknown as { id?: string })?.id;
  const userName = user?.name ?? '';

  const { data: casesData, isLoading: loading } = useQuery({
    queryKey: ['patient-emergency', userId ?? ''],
    queryFn: async (): Promise<EmergencyCase[]> => {
      const list = await emergencyApi.get({ status: 'All' });
      return (Array.isArray(list) ? list : []) as unknown as EmergencyCase[];
    },
    staleTime: 15_000,
  });

  const myCases = (casesData ?? []).filter(
    (e) => String(e.patientId || '') === String(userId || '') || e.patientName === userName,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    createMut.mutate(
      {
        patientName: userName || 'Patient',
        patientId: userId ?? '',
        condition: form.condition,
        severity: form.severity,
        phone: form.phone || user?.phone || '',
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({ condition: '', severity: 'Serious', phone: '' });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to submit'),
        onSettled: () => setSubmitting(false),
      },
    );
  };

  const activeCases = myCases.filter((c) => !['Discharged', 'Transferred', 'Rejected'].includes(c.status ?? ''));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" /> Emergency Services
          </h1>
          <p className="text-muted-foreground">Report an emergency or view your cases</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 gap-2 w-full sm:w-auto" onClick={() => setShowForm(true)}>
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
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>No active emergency cases</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCases.map((c) => (
              <div key={c._id} className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${severityColors[c.severity ?? '']?.bg ?? 'bg-muted'} ${severityColors[c.severity ?? '']?.text ?? 'text-muted-foreground'}`}
                    >
                      {c.severity}
                    </Badge>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <h4 className="font-medium text-foreground">{c.condition}</h4>
                {c.assignedDoctorName && (
                  <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Doctor: {c.assignedDoctorName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4">Report Emergency</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Condition</label>
                <Input
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  placeholder="e.g. Chest pain, Accident"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="Critical">Critical</option>
                  <option value="Serious">Serious</option>
                  <option value="Stable">Stable</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Your phone" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
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
