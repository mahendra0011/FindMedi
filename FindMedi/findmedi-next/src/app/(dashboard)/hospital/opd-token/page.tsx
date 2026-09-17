/**
 * OPD Token System — ported from client/src/pages/OPDToken.jsx (Phase 4).
 * Live token queue: call, skip, recall, consult, complete.
 */
'use client';

import { useState } from 'react';
import { Search, Clock, User, Plus, X, CheckCircle, SkipForward, Phone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  useTokenQueue,
  useTokenStats,
  useGenerateToken,
  useCallToken,
  useStartConsultation,
  useCompleteToken,
  useSkipToken,
  useRecallToken,
} from '@/features/opd/hooks';
import type { OPDToken, TokenStats } from '@/features/opd/types';

const triageColors: Record<string, string> = {
  Emergency: 'bg-destructive text-destructive-foreground',
  Urgent: 'bg-orange-500 text-white',
  Normal: 'bg-primary text-primary-foreground',
  FollowUp: 'bg-info text-info-foreground',
};

const departments = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT', 'Ophthalmology', 'Dermatology'];

const emptyStats: TokenStats = { waiting: 0, inConsultation: 0, completed: 0, skipped: 0, total: 0 };

export default function OPDTokenPage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showGenerate, setShowGenerate] = useState(false);
  const [newToken, setNewToken] = useState({
    patientName: '',
    patientId: '',
    uhid: '',
    doctorName: '',
    department: 'General',
    type: 'OPD',
    priority: 'Normal',
  });
  const [displayToken, setDisplayToken] = useState<OPDToken | null>(null);

  const { data: tokensData, isLoading } = useTokenQueue(search, deptFilter);
  const { data: statsData } = useTokenStats();

  const generateMut = useGenerateToken();
  const callMut = useCallToken();
  const startMut = useStartConsultation();
  const completeMut = useCompleteToken();
  const skipMut = useSkipToken();
  const recallMut = useRecallToken();

  const tokens: OPDToken[] = tokensData ?? [];
  const stats: TokenStats = { ...emptyStats, ...((statsData as Partial<TokenStats> | undefined) ?? {}) };
  const onError = (e: Error) => toast.error(e.message);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Loading token queue…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">OPD Token System</h1>
        <p className="text-sm text-muted-foreground">
          {stats.waiting} waiting · {stats.inConsultation} in consultation
        </p>
      </div>

      {displayToken && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 mb-6 text-center animate-in slide-in-from-top">
          <p className="text-xs text-muted-foreground mb-1">Token Generated</p>
          <p className="text-4xl font-bold text-primary mb-1">{displayToken.tokenNumber}</p>
          <p className="text-sm font-medium">
            {displayToken.patientName} · {displayToken.department}
          </p>
          <p className="text-xs text-muted-foreground">
            Queue Position: #{displayToken.queuePosition} · Est. Wait: {displayToken.estimatedWaitTime} min
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { l: 'Waiting', v: stats.waiting, c: 'text-warning' },
          { l: 'In Consultation', v: stats.inConsultation, c: 'text-primary' },
          { l: 'Completed', v: stats.completed, c: 'text-success' },
          { l: 'Skipped', v: stats.skipped, c: 'text-destructive' },
          { l: 'Total Today', v: stats.total, c: 'text-foreground' },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tokens..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
        >
          <option value="All">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Generate Token
        </Button>
      </div>

      <div className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token._id}
            className={`bg-card rounded-xl border p-4 ${token.status === 'Called' ? 'border-warning/50 bg-warning/5' : token.status === 'In Consultation' ? 'border-primary/50 bg-primary/5' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[60px]">
                <p className="text-2xl font-bold text-foreground">{token.tokenNumber?.split('-').pop()}</p>
                <p className={`text-[10px] font-medium px-1 py-0.5 rounded ${triageColors[token.priority ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                  {token.priority}
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">{token.patientName}</p>
                  {token.uhid && <span className="text-[10px] text-muted-foreground">{token.uhid}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {token.department} · {token.doctorName || 'Unassigned'} · #{token.queuePosition} in queue
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {token.createdAt ? new Date(token.createdAt).toLocaleTimeString() : ''}
                </p>
                {token.estimatedWaitTime !== undefined && <p>~{token.estimatedWaitTime} min wait</p>}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${token.status === 'Waiting' ? 'bg-warning/10 text-warning' : token.status === 'Called' ? 'bg-info/10 text-info' : token.status === 'In Consultation' ? 'bg-primary/10 text-primary' : token.status === 'Completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
              >
                {token.status}
              </span>
            </div>
            {token.status === 'Waiting' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => callMut.mutate(token._id, { onError })}>
                  <Phone className="w-3 h-3 mr-1" /> Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => skipMut.mutate({ id: token._id, reason: 'Not present' }, { onError })}
                >
                  <SkipForward className="w-3 h-3 mr-1" /> Skip
                </Button>
              </div>
            )}
            {token.status === 'Called' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => startMut.mutate(token._id, { onError })}>
                  Start Consultation
                </Button>
                <Button size="sm" variant="outline" onClick={() => recallMut.mutate(token._id, { onError })}>
                  Recall
                </Button>
              </div>
            )}
            {token.status === 'In Consultation' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => completeMut.mutate(token._id, { onError })}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Complete
                </Button>
              </div>
            )}
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="text-center py-20">
            <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No tokens for today</p>
          </div>
        )}
      </div>

      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Generate Token</h2>
              <button onClick={() => setShowGenerate(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Patient Name *</label>
                <Input value={newToken.patientName} onChange={(e) => setNewToken({ ...newToken, patientName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">UHID (optional)</label>
                <Input
                  value={newToken.uhid}
                  onChange={(e) => setNewToken({ ...newToken, uhid: e.target.value })}
                  placeholder="Search existing patient"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department *</label>
                <select
                  value={newToken.department}
                  onChange={(e) => setNewToken({ ...newToken, department: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Doctor</label>
                <Input
                  value={newToken.doctorName}
                  onChange={(e) => setNewToken({ ...newToken, doctorName: e.target.value })}
                  placeholder="Doctor name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <select
                    value={newToken.type}
                    onChange={(e) => setNewToken({ ...newToken, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    <option>OPD</option>
                    <option>Follow-up</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newToken.priority}
                    onChange={(e) => setNewToken({ ...newToken, priority: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Emergency</option>
                    <option>FollowUp</option>
                  </select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  generateMut.mutate(
                    { ...newToken },
                    {
                      onSuccess: (d) => {
                        setShowGenerate(false);
                        setDisplayToken(d as unknown as OPDToken);
                        setTimeout(() => setDisplayToken(null), 5000);
                      },
                      onError,
                    },
                  )
                }
                disabled={generateMut.isPending || !newToken.patientName}
              >
                Generate Token
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
