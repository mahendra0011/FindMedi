import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AmbulanceJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const r: any = await api.get(`/ambulance/me/jobs?page=${p}&limit=${LIMIT}`);
      setJobs(r.jobs || []);
      setTotal(r.total || 0);
      setPage(r.page || p);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  const maxPage = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-xl mx-auto p-4 space-y-2 pb-16">
      <h2 className="text-lg font-black mb-2">Job History ({total})</h2>
      {jobs.map((j, i) => (
        <motion.div key={j._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
          <Card>
            <CardContent className="p-3 flex justify-between text-sm gap-2">
              <div>
                <p className="font-bold">{j.category || 'Emergency'} · {j.patientDetails?.name || 'Patient'}</p>
                <p className="text-xs text-muted-foreground">{j.location?.address || ''}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs font-bold ${j.status === 'completed' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {j.status}
                </span>
                <p className="text-xs text-muted-foreground">{j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : ''}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      {!jobs.length && <p className="text-sm text-muted-foreground text-center py-8">No job history yet.</p>}
      {maxPage > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
          <span className="text-xs text-muted-foreground">Page {page} / {maxPage}</span>
          <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => load(page + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
