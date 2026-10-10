import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/**
 * File 22 P1-26: webhook delivery log + subscription management.
 * Every outbound delivery shows status/attempts/last error with a manual
 * retry (scheduler also retries on backoff, this is the operator shortcut).
 */
export default function WebhookStudio() {
  const [subs, setSubs] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ url: '', events: '' });
  const [lastSecret, setLastSecret] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [s, d]: any[] = await Promise.all([
        api.webhookSubs({}),
        api.webhookDeliveries(status ? { status } : {}),
      ]);
      setSubs(s?.subs || []);
      setDeliveries(d?.deliveries || []);
    } catch { toast.error('Failed to load webhooks'); }
  };
  useEffect(() => { load(); }, [status]);

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^https?:\/\//.test(form.url)) { toast.error('Valid http(s) URL required'); return; }
    setBusy(true);
    try {
      const r: any = await api.createWebhookSub({
        url: form.url,
        events: form.events.split(',').map((x) => x.trim()).filter(Boolean),
      });
      setLastSecret(r?.secret || '');
      setForm({ url: '', events: '' });
      toast.success('Subscription created — copy the secret now (shown once)');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Create failed'); }
    setBusy(false);
  };

  const removeSub = async (id: string) => {
    if (!window.confirm('Delete this webhook subscription?')) return;
    try { await api.deleteWebhookSub(id); load(); } catch { toast.error('Delete failed'); }
  };

  const retry = async (id: string) => {
    try {
      await api.retryWebhookDelivery(id);
      toast.success('Retry queued');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Retry failed'); }
  };

  const statusColor = (s: string) => (s === 'delivered' ? 'text-green-700'
    : s === 'failed' ? 'text-red-700' : 'text-amber-600');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Webhook Studio</h1>
        <p className="text-sm text-muted-foreground">Signed deliveries (HMAC + timestamp), retry log, subscription secrets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />Add subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addSub} className="flex flex-wrap gap-2">
            <Input className="w-72" placeholder="https://example.com/hooks/findmedi"
              value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input className="w-64" placeholder="events (comma, e.g. claim.updated)"
              value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} />
            <Button type="submit" disabled={busy}>Add</Button>
          </form>
          {lastSecret ? (
            <p className="text-xs rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-2 font-mono break-all">
              Signing secret (copy now, never shown again): {lastSecret}
            </p>
          ) : null}
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2 text-sm">
                <span className="font-mono text-xs break-all">{s.url}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{(s.events || []).join(', ') || 'all events'}</span>
                  <span className={`text-xs ${s.active ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {s.active ? 'active' : 'paused'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeSub(s._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </span>
              </div>
            ))}
            {subs.length === 0 ? <p className="text-sm text-muted-foreground">No subscriptions yet.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Webhook className="w-4 h-4" />Delivery log ({deliveries.length})</span>
            <span className="flex items-center gap-2">
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs">
                <option value="">All statuses</option>
                <option value="pending">pending</option>
                <option value="delivered">delivered</option>
                <option value="failed">failed</option>
              </select>
              <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deliveries.map((d) => (
            <div key={d._id} className="rounded-lg border border-border/50 p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.event}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${statusColor(d.status)}`}>{d.status}</span>
                  <span className="text-xs text-muted-foreground">{d.attempts || 0} attempt(s)</span>
                  {d.status !== 'delivered' ? (
                    <Button size="sm" variant="outline" onClick={() => retry(d._id)}>Retry</Button>
                  ) : null}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {d.nextRetryAt ? `next retry ${new Date(d.nextRetryAt).toLocaleString()}` : ''}
                {d.nextRetryAt ? ' · ' : ''}
                {new Date(d.createdAt).toLocaleString()}
              </p>
              {d.lastError ? <p className="text-xs text-red-600 mt-1">{String(d.lastError).slice(0, 200)}</p> : null}
            </div>
          ))}
          {deliveries.length === 0 ? <p className="text-sm text-muted-foreground">No deliveries yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
