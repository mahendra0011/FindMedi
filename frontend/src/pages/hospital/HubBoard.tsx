import { useEffect, useState } from 'react';
import { Plug, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';

/** File 18 §18.2/§18.3: hub board + message inspector + outbound webhooks. */
export default function HubBoard() {
  const [tab, setTab] = useState<'board' | 'webhooks'>('board');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [intForm, setIntForm] = useState({ key: '', kind: 'sms', transport: 'rest', status: 'disabled' });
  const [mapForm, setMapForm] = useState({ integrationKey: '', domain: 'test-code', external: '', internal: '' });
  const [subForm, setSubForm] = useState({ url: '', events: 'billing.paid' });
  const [newSecret, setNewSecret] = useState('');

  const load = async () => {
    try {
      const [i, m, mp, s, d]: any[] = await Promise.all([
        api.hubIntegrations(), api.hubMessages({}), api.hubMappings(), api.hubSubs(), api.hubDeliveries({}),
      ]);
      setIntegrations(i?.integrations || []);
      setMessages(m?.messages || []);
      setMappings(mp?.mappings || []);
      setSubs(s?.subs || []);
      setDeliveries(d?.deliveries || []);
    } catch { toast.error('Failed to load hub'); }
  };
  useEffect(() => { load(); }, []);

  const saveInt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.hubSaveIntegration({ ...intForm, config: {} });
      toast.success('Integration saved');
      load();
    } catch { toast.error('Save failed'); }
  };

  const saveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = mappings.find((x) => x.integrationKey === mapForm.integrationKey && x.domain === mapForm.domain);
      await api.hubSaveMapping({
        integrationKey: mapForm.integrationKey, domain: mapForm.domain,
        mappings: { ...(existing?.mappings || {}), [mapForm.external]: mapForm.internal },
      });
      toast.success('Mapping saved');
      load();
    } catch { toast.error('Save failed'); }
  };

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r: any = await api.hubCreateSub({ url: subForm.url, events: subForm.events.split(',').map((s) => s.trim()).filter(Boolean) });
      setNewSecret(r?.secret || '');
      toast.success('Subscription created — copy the secret now');
      load();
    } catch (e: any) { toast.error(e?.message || 'Create failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-1">
        <Button size="sm" variant={tab === 'board' ? 'default' : 'outline'} onClick={() => setTab('board')}><Plug size={14} /> Integrations</Button>
        <Button size="sm" variant={tab === 'webhooks' ? 'default' : 'outline'} onClick={() => setTab('webhooks')}><Webhook size={14} /> Webhooks</Button>
      </div>

      {tab === 'board' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <Card><CardHeader><CardTitle className="text-sm">Integrations ({integrations.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {integrations.map((x) => (
                  <p key={x._id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <span><b>{x.key}</b> · {x.kind}/{x.transport}</span><StatusPill status={x.status} />
                  </p>
                ))}
                <form onSubmit={saveInt} className="flex flex-wrap gap-1 border-t pt-2">
                  <Input className="h-8 w-32 text-xs" placeholder="key" value={intForm.key} onChange={(e) => setIntForm({ ...intForm, key: e.target.value })} required />
                  <select className="rounded-md border px-2 py-1.5 text-xs" value={intForm.kind} onChange={(e) => setIntForm({ ...intForm, kind: e.target.value })}>
                    <option>lis</option><option>pacs</option><option>telephony</option><option>sms</option><option>email</option><option>payment</option><option>insurance</option><option>other</option>
                  </select>
                  <select className="rounded-md border px-2 py-1.5 text-xs" value={intForm.status} onChange={(e) => setIntForm({ ...intForm, status: e.target.value })}>
                    <option>disabled</option><option>connected</option><option>degraded</option><option>down</option>
                  </select>
                  <Button size="sm" type="submit">Save</Button>
                </form>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Mapping profiles ({mappings.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {mappings.map((x) => (
                  <p key={x._id} className="rounded border p-2 font-mono text-[11px]">{x.integrationKey}/{x.domain}: {Object.keys(x.mappings || {}).length} codes</p>
                ))}
                <form onSubmit={saveMapping} className="flex flex-wrap gap-1 border-t pt-2">
                  <Input className="h-8 w-28 text-xs" placeholder="int key" value={mapForm.integrationKey} onChange={(e) => setMapForm({ ...mapForm, integrationKey: e.target.value })} required />
                  <Input className="h-8 w-24 text-xs" placeholder="external" value={mapForm.external} onChange={(e) => setMapForm({ ...mapForm, external: e.target.value })} required />
                  <Input className="h-8 w-24 text-xs" placeholder="internal" value={mapForm.internal} onChange={(e) => setMapForm({ ...mapForm, internal: e.target.value })} required />
                  <Button size="sm" type="submit">Map</Button>
                </form>
              </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-sm">Message inspector ({messages.length})</CardTitle></CardHeader>
            <CardContent className="max-h-[560px] space-y-1 overflow-auto">
              {messages.map((m) => (
                <div key={m._id} className="rounded border p-2 text-xs">
                  <p className="flex items-center justify-between">
                    <span><b>{m.direction}</b> · {m.integrationKey} · {m.kind}</span>
                    <span className="flex items-center gap-1"><StatusPill status={m.status} />
                      {m.status === 'failed' ? <Button size="sm" variant="outline" onClick={() => api.hubRetryMessage(m._id).then(load)}>Retry</Button> : null}
                    </span>
                  </p>
                  {m.error ? <p className="text-red-700">{m.error}</p> : null}
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted/40 p-1 font-mono text-[10px]">{JSON.stringify(m.payload, null, 1)}</pre>
                </div>
              ))}
              {messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : null}
            </CardContent></Card>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-sm">Subscriptions ({subs.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {subs.map((s) => (
                <div key={s._id} className="flex items-center justify-between rounded border p-2 text-xs">
                  <span><b>{s.url}</b><br /><span className="font-mono text-muted-foreground">{(s.events || []).join(', ')}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => api.hubDeleteSub(s._id).then(load)}>Delete</Button>
                </div>
              ))}
              {newSecret ? <p className="rounded border border-amber-300 bg-amber-50 p-2 font-mono text-xs">Secret (once): {newSecret}</p> : null}
              <form onSubmit={addSub} className="flex gap-1 border-t pt-2">
                <Input className="h-8 text-xs" placeholder="https://…" value={subForm.url} onChange={(e) => setSubForm({ ...subForm, url: e.target.value })} required />
                <Input className="h-8 w-40 text-xs" placeholder="events csv" value={subForm.events} onChange={(e) => setSubForm({ ...subForm, events: e.target.value })} />
                <Button size="sm" type="submit">Add</Button>
              </form>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Deliveries ({deliveries.length})</CardTitle></CardHeader>
            <CardContent className="max-h-96 space-y-1 overflow-auto">
              {deliveries.map((d) => (
                <p key={d._id} className="flex items-center justify-between rounded border px-2 py-1 font-mono text-[11px]">
                  <span>{d.event} · try {d.attempts}</span><StatusPill status={d.status} />
                </p>
              ))}
              {deliveries.length === 0 ? <p className="text-sm text-muted-foreground">No deliveries yet.</p> : null}
            </CardContent></Card>
        </div>
      )}
    </div>
  );
}
