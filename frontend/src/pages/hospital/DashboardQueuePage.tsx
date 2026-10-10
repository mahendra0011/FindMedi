import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface QueueDept { dept: string; waiting: number; longestMin: number }
interface QueueSample {
  _id?: string;
  tokenNo?: number | string;
  department?: string;
  checkedInAt?: string;
  queuePosition?: number;
}
interface QueueData {
  total: number;
  longestMin: number;
  departments: QueueDept[];
  sample: QueueSample[];
}

export default function DashboardQueuePage() {
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.getDashQueue();
      setQueue(res as QueueData);
      setError('');
      setUpdatedAt(new Date().toLocaleTimeString('en-IN'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Queue unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Live OPD Queue</h1>
          <p className="text-sm text-muted-foreground">
            Today's in-queue patients by department — refreshes every minute{updatedAt ? ` (last ${updatedAt})` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }}><RefreshCw size={13} /> Refresh</Button>
          <Link to="/dashboard/v2"><Button variant="outline" size="sm"><ArrowLeft size={13} /> Dashboard</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {error ? `Queue could not be loaded — ${error}.` : loading ? 'Loading live queue…' : 'Connected — live queue feed active.'}
        </CardContent>
      </Card>

      {queue ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Patients waiting</p>
              <p className="text-2xl font-bold">{Number(queue.total || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Longest wait</p>
              <p className="text-2xl font-bold">{Number(queue.longestMin || 0)} min</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Departments with a queue</p>
              <p className="text-2xl font-bold">{Number(queue.departments?.length || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">By department</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(queue.departments || []).map((d) => (
                <div key={d.dept} className="rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{d.dept}</span>
                  <span className="ml-2 text-muted-foreground">{d.waiting} waiting · longest {d.longestMin}m</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Next up</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 font-medium">Token</th>
                    <th className="py-2 font-medium">Department</th>
                    <th className="py-2 font-medium">Checked in</th>
                    <th className="py-2 font-medium">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {(queue.sample || []).map((s, i) => (
                    <tr key={s._id || `${s.tokenNo ?? i}-${i}`} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.tokenNo ?? '—'}</td>
                      <td className="py-2">{s.department || 'General'}</td>
                      <td className="py-2 text-muted-foreground">
                        {s.checkedInAt ? new Date(s.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-2 text-muted-foreground">{s.queuePosition ?? i + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
