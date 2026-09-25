import React from 'react';
import { ArrowLeft, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AmbulanceHistoryTabProps {
  allJobs: any[];
  totalJobsCount: number;
  setTab: (tab: string) => void;
}

export const AmbulanceHistoryTab: React.FC<AmbulanceHistoryTabProps> = ({
  allJobs,
  totalJobsCount,
  setTab,
}) => {
  const handleExportCsv = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // A-4: export the FULL history (paginated fetch), not just the 20 preview rows.
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const first: any = await api.get('/ambulance/me/jobs?page=1&limit=1').catch(() => ({ total: 0 }));
      const total = first.total || totalJobsCount || 0;
      const pages = Math.max(1, Math.ceil(total / 100));
      let rows: any[] = [];
      for (let p = 1; p <= pages; p++) {
        const r: any = await api.get(`/ambulance/me/jobs?page=${p}&limit=100`).catch(() => ({ jobs: [] }));
        rows = rows.concat(r.jobs || []);
        if (!(r.jobs || []).length) break;
      }
      const list = rows.length ? rows : allJobs;
      const csvRows = [
        ['Job', 'Patient', 'Pickup', 'Status'],
        ...list.map((j) => [
          j._id,
          j.patientDetails?.name || 'Emergency Patient',
          j.location?.address || '',
          j.status || '',
        ]),
      ];
      const csv = csvRows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'ambulance-jobs.csv';
      a.click();
      toast.success(`Exported ${list.length} missions`);
    } catch {
      toast.error('CSV export failed');
    } finally {
      btn.disabled = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTab('overview')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Button>
        <h3 className="font-bold text-base text-foreground">
          Emergency Mission History ({totalJobsCount})
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto rounded-xl h-8 text-xs"
          onClick={handleExportCsv}
        >
          Export CSV
        </Button>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
        <div className="divide-y divide-border/60">
          {allJobs.map((j: any) => (
            <div
              key={j._id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                  <Siren className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground font-mono">
                      #{j._id?.slice(-8)?.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-foreground text-sm">
                      {j.patientDetails?.name || 'Emergency Patient'}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-destructive/30 text-destructive"
                    >
                      {j.category || 'Emergency'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Pickup: {j.location?.address || 'Recorded Coordinates'}
                  </p>
                  {j.selectedHospitalId?.name && (
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Hospital: {j.selectedHospitalId.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <Badge
                  variant={j.status === 'completed' ? 'default' : 'secondary'}
                  className="text-[10px] font-bold"
                >
                  {j.status?.toUpperCase() || 'COMPLETED'}
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {j.createdAt
                    ? new Date(j.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          ))}

          {!allJobs.length && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No mission records found yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
