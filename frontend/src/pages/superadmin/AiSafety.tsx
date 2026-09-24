import React, { useState, useEffect, useCallback } from 'react';
import { BrainCircuit, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

// SA-M4: every row below is a REAL event logged by the AI chat route.
// Token counts are provider estimates (chars/4) and labelled as such.
export default function AiSafety() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [kind, setKind] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        api.getAiSafetyStats(),
        api.getAiSafetyEvents({ kind, limit: 100 }),
      ]);
      setStats(s);
      setEvents(e.events || []);
    } catch { toast.error('Failed to load AI safety monitor'); }
    setLoading(false);
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary" /> AI Safety Monitor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Red-flag triggers, latency and token usage — logged live by the chat route</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Requests (24h)', value: stats?.last24h ?? 0, color: '' },
          { label: 'Red flags (24h)', value: stats?.redFlags24h ?? 0, color: (stats?.redFlags24h || 0) > 0 ? 'text-destructive' : 'text-success' },
          { label: 'Avg latency (24h)', value: `${stats?.avgLatencyMs ?? 0} ms`, color: '' },
          { label: 'Tokens est. (24h)', value: Number(stats?.promptTokensEst24h || 0) + Number(stats?.replyTokensEst24h || 0), color: '' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${s.color || 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">Lifetime: {stats?.total ?? 0} requests · {stats?.redFlags ?? 0} red flags · max latency {stats?.maxLatencyMs ?? 0} ms. {stats?.note}</p>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted-foreground">Show:</span>
        {['all', 'red_flag', 'request'].map((k) => (
          <Button key={k} size="sm" variant={kind === k ? 'default' : 'outline'} onClick={() => setKind(k)}>
            {k === 'all' ? 'All' : k === 'red_flag' ? 'Red flags' : 'Requests'}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No events recorded yet — rows appear here as users chat.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Card key={e._id || e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {e.kind === 'red_flag'
                      ? <AlertOctagon className="w-4 h-4 text-destructive shrink-0" />
                      : <BrainCircuit className="w-4 h-4 text-primary shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold">
                        {e.kind === 'red_flag' ? `Red flag: ${e.trigger || 'unknown trigger'}` : `Chat request · ${e.model || 'unknown model'}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : ''}
                        {` · ${e.latencyMs ?? 0} ms · ~${e.promptTokensEst ?? 0}+${e.replyTokensEst ?? 0} tokens (est.)`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={e.kind === 'red_flag' ? 'destructive' : 'outline'} className="text-[11px] shrink-0">
                    {e.kind === 'red_flag' ? 'RED FLAG' : 'request'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Human review queue</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Open any red-flag row above, verify the assistant response in the chat logs, and record the clinical verdict
            in audit notes. Target: review 100% of red flags within 24 hours. (Sampling automation is a follow-up.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
