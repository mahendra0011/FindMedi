/**
 * Emergency Control Center — ported from client/src/pages/admin/AdminEmergency.jsx
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertTriangle, Users, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { emergency as emergencyApi, doctors as doctorsApi } from '@/lib/api';

interface EmergencyRow {
  _id: string;
  severity?: string;
  status?: string;
  condition?: string;
  patientName?: string;
  age?: number;
  gender?: string;
  createdAt?: string;
}

export default function EmergencyPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedCase, setSelectedCase] = useState<EmergencyRow | null>(null);

  const { data: emergenciesData, isLoading: loading } = useQuery({
    queryKey: ['admin-emergencies'],
    queryFn: async (): Promise<EmergencyRow[]> => {
      const res = await emergencyApi.get({ status: 'All' });
      return (Array.isArray(res) ? res : []) as unknown as EmergencyRow[];
    },
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['admin-emergency-doctors'],
    queryFn: async () => {
      const res = await doctorsApi.get({});
      const arr = (res as unknown as { data?: unknown[] })?.data ?? res;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ caseId, doctorId, doctorName }: { caseId: string; doctorId: string; doctorName: string }) =>
      emergencyApi.assignDoctor(caseId, doctorId, doctorName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-emergencies'] });
      toast.success('Doctor assigned');
    },
    onError: () => toast.error('Failed to assign doctor'),
  });

  const emergencies = emergenciesData ?? [];
  const doctors = (doctorsData as { _id: string; name: string }[]) ?? [];

  const filteredCases = emergencies.filter((em) => {
    if (filter !== 'All' && em.status !== filter) return false;
    if (severityFilter !== 'All' && em.severity !== severityFilter) return false;
    return true;
  });

  const stats = {
    total: emergencies.length,
    critical: emergencies.filter((e) => e.severity === 'Critical' && !['Discharged', 'Transferred', 'Rejected'].includes(e.status ?? '')).length,
    pending: emergencies.filter((e) => e.status === 'Pending').length,
    underTreatment: emergencies.filter((e) => e.status === 'Under Treatment').length,
  };

  const severityColors: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-600',
    Serious: 'bg-orange-500/10 text-orange-600',
    Stable: 'bg-green-500/10 text-green-600',
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-500/10 text-yellow-600',
    Assigned: 'bg-blue-500/10 text-blue-600',
    'Under Treatment': 'bg-purple-500/10 text-purple-600',
    Stable: 'bg-green-500/10 text-green-600',
    Discharged: 'bg-green-500/10 text-green-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" /> Emergency Control Center
          </h1>
          <p className="text-muted-foreground">Real-time emergency case management</p>
        </div>
        <Button onClick={() => qc.invalidateQueries({ queryKey: ['admin-emergencies'] })} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={stats.critical > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-card'}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500/50" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500/50" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Treatment</p>
              <p className="text-2xl font-bold">{stats.underTreatment}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500/50" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-muted-foreground/50" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1 bg-card rounded-xl border border-border/60 p-1">
          {['All', 'Pending', 'Assigned', 'Under Treatment', 'Stable', 'Discharged'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/80'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-card rounded-xl border border-border/60 p-1">
          {['All', 'Critical', 'Serious', 'Stable'].map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${severityFilter === f ? 'bg-red-500 text-white' : 'text-muted-foreground hover:bg-muted/80'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border/60">No emergency cases</div>
          ) : (
            filteredCases.map((em, i) => (
              <motion.div
                key={em._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedCase(em)}
                className={`bg-card rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${selectedCase?._id === em._id ? 'border-primary' : 'border-border/60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={severityColors[em.severity ?? ''] ?? 'bg-muted'}>{em.severity ?? 'Unknown'}</Badge>
                      <Badge className={statusColors[em.status ?? ''] ?? 'bg-muted'}>{em.status ?? 'Pending'}</Badge>
                    </div>
                    <h3 className="font-semibold text-foreground">{em.condition ?? 'Emergency Case'}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{em.patientName || 'Unknown'}</span>
                      {em.age && <span>{em.age} yrs</span>}
                      {em.gender && <span>{em.gender}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-5 h-fit">
          {selectedCase ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Case Details</h3>
              <p className="text-sm text-muted-foreground">{selectedCase.condition}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient</span>
                  <span className="font-medium">{selectedCase.patientName ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <span className="font-medium">{selectedCase.severity ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{selectedCase.status ?? '-'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Assign Doctor</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {doctors.map((d) => (
                    <button
                      key={d._id}
                      onClick={() => assignMut.mutate({ caseId: selectedCase._id, doctorId: d._id, doctorName: d.name })}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border/40 hover:bg-muted text-sm"
                    >
                      {d.name}
                    </button>
                  ))}
                  {doctors.length === 0 && <p className="text-xs text-muted-foreground">No doctors available</p>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Select a case to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
