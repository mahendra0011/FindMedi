import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Ticket, Clock, Users, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface QueueTicket {
  _id: string;
  tokenNumber: number;
  patientName?: string;
  department?: string;
  doctorName?: string;
  priority: string;
  status: string;
  createdAt: string;
  waitingMinutes: number;
}

interface QueueStats {
  totalWaiting: number;
  avgWaitMinutes: number;
  priorityCount: number;
  overdueCount: number;
}

export default function QueueAgingDashboard() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadQueue(); }, []);

  const loadQueue = async () => {
    try {
      const res = await api.get('/queues');
      const data = res.data;
      const allTickets = data.tickets || data || [];

      // Calculate waiting time and aging
      const now = Date.now();
      const enriched = allTickets.map((t: any) => ({
        ...t,
        waitingMinutes: t.createdAt ? Math.floor((now - new Date(t.createdAt).getTime()) / 60000) : 0,
      }));

      setTickets(enriched);
      setStats({
        totalWaiting: enriched.length,
        avgWaitMinutes: enriched.length > 0
          ? Math.floor(enriched.reduce((s: number, t: any) => s + t.waitingMinutes, 0) / enriched.length)
          : 0,
        priorityCount: enriched.filter((t: any) => t.priority === 'High' || t.priority === 'Emergency').length,
        overdueCount: enriched.filter((t: any) => t.waitingMinutes > 30).length,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const getAgingColor = (minutes: number) => {
    if (minutes > 45) return 'text-red-600';
    if (minutes > 30) return 'text-orange-600';
    if (minutes > 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAgingBadge = (minutes: number) => {
    if (minutes > 45) return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    if (minutes > 30) return <Badge className="bg-orange-100 text-orange-800">Overdue</Badge>;
    if (minutes > 15) return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge className="bg-green-100 text-green-800">OK</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="w-6 h-6 text-blue-600" />
          Queue Aging Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Real-time queue wait times and priority aging</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Waiting', value: stats.totalWaiting, icon: Users, color: 'text-blue-600' },
            { label: 'Avg Wait (min)', value: stats.avgWaitMinutes, icon: Clock, color: 'text-yellow-600' },
            { label: 'Priority Cases', value: stats.priorityCount, icon: AlertTriangle, color: 'text-orange-600' },
            { label: 'Overdue (>30m)', value: stats.overdueCount, icon: TrendingUp, color: 'text-red-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Queue</CardTitle>
          <CardDescription>Tickets sorted by wait time (longest waiting first)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading queue...</p>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No patients waiting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets
                .sort((a, b) => b.waitingMinutes - a.waitingMinutes)
                .map((t) => (
                  <div key={t._id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold">#{t.tokenNumber}</p>
                      </div>
                      <div>
                        <p className="font-medium">{t.patientName || 'Patient'}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.department || 'OPD'} {t.doctorName ? `· Dr. ${t.doctorName}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${getAgingColor(t.waitingMinutes)}`}>
                        {t.waitingMinutes}m
                      </span>
                      {getAgingBadge(t.waitingMinutes)}
                      {t.priority === 'Emergency' && (
                        <Badge className="bg-red-100 text-red-800">Emergency</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
