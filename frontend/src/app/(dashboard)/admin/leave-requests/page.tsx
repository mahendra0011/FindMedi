/**
 * Leave Requests — ported from client/src/pages/admin/AdminLeaveRequests.jsx (Phase 4).
 * Review and approve/reject doctor leave requests.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Calendar, Clock, CheckCircle, XCircle, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { leaveRequests } from '@/lib/api';

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning border-warning/20',
  Approved: 'bg-success/10 text-success border-success/20',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const fallbackStatus = 'bg-warning/10 text-warning border-warning/20';

interface LeaveRow {
  _id: string;
  doctorName?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: string;
  createdAt?: string;
  adminNotes?: string;
}

const onError = () => toast.error('Failed to update status');

export default function LeaveRequestsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: leavesData, isLoading: loading } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: async (): Promise<LeaveRow[]> => {
      const res = await leaveRequests.get({});
      return (Array.isArray(res) ? res : []) as unknown as LeaveRow[];
    },
    staleTime: 30_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) =>
      leaveRequests.updateStatus(id, { status, adminNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-requests'] }),
  });

  const leaves = leavesData ?? [];

  const handleStatus = (id: string, status: string) => {
    statusMut.mutate(
      { id, status, adminNotes: notes[id] || '' },
      {
        onSuccess: () => {
          toast.success(`Leave request ${status}`);
          setNotes((prev) => ({ ...prev, [id]: '' }));
        },
        onError,
      },
    );
  };

  const filtered = leaves.filter((lv) => {
    if (filter !== 'all' && lv.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (lv.doctorName ?? '').toLowerCase().includes(q) ||
        (lv.leaveType ?? '').toLowerCase().includes(q) ||
        (lv.reason ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
        <p className="text-muted-foreground">Review and manage doctor leave requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-warning">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-xl font-bold text-success">{approvedCount}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-xl font-bold text-destructive">{rejectedCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor, leave type or reason..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Pending', 'Approved', 'Rejected'].map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize">
              {f === 'all' ? 'All' : f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No leave requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lv, i) => (
            <motion.div
              key={lv._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {lv.doctorName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{lv.doctorName}</h3>
                      <Badge className={`${statusColors[lv.status ?? ''] ?? fallbackStatus} px-2 py-0.5 text-xs`}>{lv.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{lv.leaveType}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {lv.startDate} → {lv.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {lv.createdAt ? new Date(lv.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {lv.reason && (
                      <div className="flex items-start gap-2 mt-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{lv.reason}</p>
                      </div>
                    )}
                    {lv.adminNotes && (
                      <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
                        <span className="text-muted-foreground font-medium">Admin notes: </span>
                        <span className="text-foreground">{lv.adminNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {lv.status === 'Pending' && (
                  <div className="flex flex-col gap-2 lg:min-w-[240px]">
                    <Input
                      value={notes[lv._id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [lv._id]: e.target.value }))}
                      placeholder="Admin notes (optional)"
                      className="text-sm h-9"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="gap-1 flex-1" onClick={() => handleStatus(lv._id, 'Approved')}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1 flex-1"
                        onClick={() => {
                          if (confirm('Reject this leave request?')) handleStatus(lv._id, 'Rejected');
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
