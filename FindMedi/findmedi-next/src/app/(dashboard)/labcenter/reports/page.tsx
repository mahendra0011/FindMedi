/**
 * Report Upload & Management — ported from client/src/pages/labcenter/LabReports.jsx (Phase 4).
 * Upload reports, notify patients, track delivery state.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { FileText, Upload, CheckCircle, Send, Search, Download, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { lab, notifications } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api/client';

const statusColors: Record<string, string> = {
  'Pending Upload': 'bg-warning/10 text-warning',
  Uploaded: 'bg-info/10 text-info',
  Delivered: 'bg-success/10 text-success',
};

interface ReportRow {
  _id: string;
  patient?: string;
  tests?: string[];
  date?: string;
  status?: string;
  notified?: boolean;
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const { data: reportsData, isLoading: loading } = useQuery({
    queryKey: ['lab-reports'],
    queryFn: async (): Promise<ReportRow[]> => {
      try {
        const data = await lab.getBookings({});
        return (Array.isArray(data) ? data : []) as unknown as ReportRow[];
      } catch (e) {
        console.error(e);
        return [];
      }
    },
    staleTime: 15_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => lab.updateBooking(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-reports'] }),
  });

  const reports = reportsData ?? [];
  const filtered = reports.filter((r) => {
    const ms = !search || (r.patient || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  const handleUpload = (id: string) => {
    updateMut.mutate({ id, status: 'Uploaded', notes: 'Report uploaded', notified: false });
  };

  const handleDownload = (id: string) => {
    updateMut.mutate({ id, notified: true });
    window.open(`${getApiBaseUrl()}/lab/bookings/${id}/report`, '_blank');
  };

  const handleNotify = (id: string) => {
    updateMut.mutate(
      { id, status: 'Delivered', notified: true },
      {
        onSuccess: () => {
          notifications
            .create({ title: 'Report Ready', message: 'Your lab report is ready for download', type: 'records' })
            .catch((e: unknown) => console.error(e));
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Report Upload & Management</h1>
        <p className="text-muted-foreground">{reports.filter((r) => r.status === 'Pending Upload').length} pending uploads</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'Pending Upload', 'Uploaded', 'Delivered'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {f} ({f === 'All' ? reports.length : reports.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${statusColors[r.status ?? ''] ?? 'bg-muted'} flex items-center justify-center`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{r.patient}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.tests?.map((t, j) => (
                        <Badge key={j} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {r.date}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusColors[r.status ?? ''] ?? 'bg-muted'}>{r.status}</Badge>
                  {r.status === 'Uploaded' && !r.notified && (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <AlertCircle className="w-3 h-3" /> Not notified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                {r.status === 'Pending Upload' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => handleUpload(r._id)}>
                    <Upload className="w-4 h-4" /> Upload Report
                  </Button>
                )}
                {r.status === 'Uploaded' && !r.notified && (
                  <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90" onClick={() => handleNotify(r._id)}>
                    <Send className="w-4 h-4" /> Notify Patient
                  </Button>
                )}
                {r.status === 'Uploaded' && r.notified && (
                  <Button size="sm" variant="outline" className="flex-1 gap-1" disabled>
                    <CheckCircle className="w-4 h-4" /> Notified
                  </Button>
                )}
                {(r.status === 'Uploaded' || r.status === 'Delivered') && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(r._id)}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
