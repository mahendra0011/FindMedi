import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

type AccessEntry = {
  _id: string;
  createdAt?: string;
  actorId?: string;
  actorRole?: string;
  patientId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  decision?: string;
  reason?: string;
  accessReason?: string;
  flagged?: boolean;
  flagReason?: string;
};

export default function AccessReview() {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [patientId, setPatientId] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: nextPage, limit };
      if (patientId.trim()) params.patientId = patientId.trim();
      if (actorId.trim()) params.actorId = actorId.trim();
      const result = await api.getIamAccessLog(params);
      setEntries(result.entries || []);
      setTotal(result.total || 0);
      setPage(result.page || nextPage);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load access history');
    } finally {
      setLoading(false);
    }
  }, [actorId, page, patientId]);

  useEffect(() => { void load(1); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-bold">Access Review</h1>
          <p className="text-sm text-muted-foreground">Read-only record of data access decisions and flagged activity.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter access events</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input aria-label="Patient ID" placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="max-w-xs" />
          <Input aria-label="Actor ID" placeholder="Admin / actor ID" value={actorId} onChange={(e) => setActorId(e.target.value)} className="max-w-xs" />
          <Button onClick={() => void load(1)} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{total.toLocaleString()} access event(s)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-3 border-b pb-2 text-xs font-semibold text-muted-foreground md:grid">
            <span>When / actor</span><span>Subject</span><span>Action / resource</span><span>Decision / reason</span><span>Review</span>
          </div>
          {entries.map((entry) => (
            <div key={entry._id} className="grid gap-2 rounded-lg border p-3 text-xs md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] md:gap-3">
              <div><div>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Time unavailable'}</div><div className="text-muted-foreground">{entry.actorRole || 'unknown'} · {entry.actorId || 'unknown actor'}</div></div>
              <div className="break-all">{entry.patientId || 'No patient linked'}</div>
              <div><div>{entry.action || 'unknown action'}</div><div className="text-muted-foreground">{entry.resourceType || 'resource'} · {entry.resourceId || '—'}</div></div>
              <div><Badge variant={entry.decision === 'allow' ? 'outline' : 'secondary'}>{entry.decision || 'unknown'}</Badge><div className="mt-1 text-muted-foreground">{entry.accessReason || entry.reason || 'No reason supplied'}</div></div>
              <div>{entry.flagged ? <div className="flex items-start gap-1 text-destructive"><ShieldAlert className="h-4 w-4 shrink-0" /><span>{entry.flagReason || 'Flagged for review'}</span></div> : <span className="text-muted-foreground">No alert</span>}</div>
            </div>
          ))}
          {!loading && entries.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching access events.</p>}
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Page {page} · {Math.max(1, Math.ceil(total / limit))}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={loading || page * limit >= total} onClick={() => void load(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
