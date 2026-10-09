import { useEffect, useState } from 'react';
import { Headset, PhoneCall, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { CountUp, EmptyState } from '@/components/clinical/SharedStates';

/** File 18 §18.1: call-center console — wallboard, queue, disposition, campaigns. */
export default function CallConsole() {
  const [wall, setWall] = useState<any>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [dnd, setDnd] = useState<any[]>([]);
  const [dndPhone, setDndPhone] = useState('');
  const [popPhone, setPopPhone] = useState('');
  const [pop, setPop] = useState<any | null>(null);
  const [presence, setPresence] = useState('available');
  const [dispose, setDispose] = useState({ id: '', disposition: 'callback', notes: '' });
  const [camp, setCamp] = useState({ name: '', channel: 'sms', template: '', consentChecked: false });

  const load = async () => {
    try {
      const [w, q, c, m, d]: any[] = await Promise.all([
        api.ccWallboard(), api.ccQueue(), api.ccInteractions({}), api.ccCampaigns(), api.ccDnd({}),
      ]);
      setWall(w || {});
      setQueue(q?.queue || []);
      setCalls(c?.interactions || []);
      setCampaigns(m?.campaigns || []);
      setDnd(d?.dnd || []);
    } catch { toast.error('Failed to load console'); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (status: string) => {
    try {
      await api.ccAgentSession(status);
      setPresence(status);
      toast.success(`You are ${status}`);
    } catch { toast.error('Presence failed'); }
  };

  const assign = async (id: string) => {
    try { await api.ccAssign(id); toast.success('Assigned to you'); load(); }
    catch (e: any) { toast.error(e?.message || 'Assign failed'); }
  };

  const done = async (id: string, missed: boolean) => {
    try { await api.ccQueueDone(id, missed); load(); }
    catch { toast.error('Update failed'); }
  };

  const saveDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.ccDispose(dispose.id, { disposition: dispose.disposition, notes: dispose.notes });
      toast.success('Disposition saved');
      setDispose({ id: '', disposition: 'callback', notes: '' });
      load();
    } catch (e: any) { toast.error(e?.message || 'Save failed'); }
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camp.consentChecked) { toast.error('Tick the consent confirmation first'); return; }
    try {
      await api.ccCreateCampaign({ ...camp, audience: {} });
      toast.success('Campaign created as draft');
      setCamp({ name: '', channel: 'sms', template: '', consentChecked: false });
      load();
    } catch (e: any) { toast.error(e?.message || 'Create failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold"><Headset size={18} /> Call center</h1>
        <div className="flex-1" />
        {['available', 'on-call', 'wrap-up', 'break', 'offline'].map((s) => (
          <Button key={s} size="sm" variant={presence === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>{s}</Button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {[['Waiting', wall.waiting], ['On call', wall.onCall], ['Agents online', wall.agentsOnline], ['Today', wall.today]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold"><CountUp value={Number(v) || 0} /></p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><PhoneCall size={14} /> Queue ({queue.length})</CardTitle></CardHeader>
          <CardContent className="max-h-72 space-y-1.5 overflow-auto">
            {queue.map((q) => (
              <div key={q._id} className="flex items-center justify-between rounded border p-2 text-xs">
                <span><b>{q.phone}</b> · {q.priority} · <StatusPill status={q.status} /></span>
                <span className="flex gap-1">
                  {q.status === 'waiting' ? <Button size="sm" variant="outline" onClick={() => assign(q._id)}>Take</Button> : null}
                  <Button size="sm" variant="outline" onClick={() => done(q._id, false)}>Done</Button>
                  <Button size="sm" variant="ghost" onClick={() => done(q._id, true)}>Missed</Button>
                </span>
              </div>
            ))}
            {queue.length === 0 ? <EmptyState title="Queue empty" /> : null}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Disposition</CardTitle></CardHeader>          <CardContent>
            <form onSubmit={saveDisposition} className="space-y-1.5">
              <Input className="h-8 text-xs" placeholder="interaction id" value={dispose.id} onChange={(e) => setDispose({ ...dispose, id: e.target.value })} required />
              <div className="flex gap-1">
                <select className="rounded-md border px-2 py-1.5 text-xs" value={dispose.disposition} onChange={(e) => setDispose({ ...dispose, disposition: e.target.value })}>
                  <option>callback</option><option>complaint</option><option>resolved</option><option>booked</option><option>wrong-number</option>
                </select>
                <Input className="h-8 text-xs" placeholder="notes" value={dispose.notes} onChange={(e) => setDispose({ ...dispose, notes: e.target.value })} />
              </div>
              <Button size="sm" type="submit">Save (callback/complaint auto-tickets)</Button>
            </form>
            <div className="mt-2 max-h-40 space-y-1 overflow-auto">
              {calls.slice(0, 20).map((c) => (
                <p key={c._id} className="rounded border px-2 py-1 font-mono text-[11px]">{c._id} · {c.channel}/{c.direction} · {c.phone} · {c.disposition || '—'}</p>
              ))}
            </div>
          </CardContent></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Screen-pop lookup</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1">
              <Input className="h-8 text-xs" placeholder="incoming phone…" value={popPhone} onChange={(e) => setPopPhone(e.target.value)} />
              <Button size="sm" onClick={async () => {
                try { setPop(await api.ccScreenPop(popPhone)); }
                catch { toast.error('Lookup failed'); }
              }}>Pop</Button>
            </div>
            {pop ? (
              <div className="rounded border p-2 text-xs">
                <p><b>{pop.patient?.name || 'Unknown caller'}</b> {pop.patient?.uhid ? `· ${pop.patient.uhid}` : ''}</p>
                <p>Dues ₹{(pop.dues || 0).toLocaleString('en-IN')} · Flags: {(pop.flags || []).map((f: any) => f.kind).join(', ') || '—'} · DND: {pop.dnd ? 'YES — do not call back' : 'no'}</p>
              </div>
            ) : null}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">DND registry ({dnd.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1">
              <Input className="h-8 text-xs" placeholder="phone" value={dndPhone} onChange={(e) => setDndPhone(e.target.value)} />
              <Button size="sm" onClick={async () => {
                try { await api.ccAddDnd({ phone: dndPhone }); setDndPhone(''); load(); }
                catch { toast.error('Add failed'); }
              }}>Add</Button>
            </div>
            <div className="max-h-28 space-y-1 overflow-auto">
              {dnd.slice(0, 20).map((d: any) => (
                <p key={d._id} className="flex items-center justify-between rounded border px-2 py-1 font-mono text-[11px]">
                  <span>{d.phone} · {d.channel}</span>
                  <button className="underline" onClick={() => api.ccRemoveDnd(d._id).then(load)}>remove</button>
                </p>
              ))}
            </div>
          </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Megaphone size={14} /> Campaigns ({campaigns.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {campaigns.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded border p-2 text-xs">
              <span><b>{c.name}</b> · {c.channel} · sent {c.stats?.sent || 0}/{c.stats?.queued || 0} · <StatusPill status={c.status} /></span>
              <span className="flex gap-1">
                {c.status !== 'running' ? <Button size="sm" variant="outline" onClick={() => api.ccCampaignState(c._id, 'running').then(load)}>Run</Button> : null}
                {c.status === 'running' ? <Button size="sm" variant="outline" onClick={() => api.ccCampaignState(c._id, 'paused').then(load)}>Pause</Button> : null}
              </span>
            </div>
          ))}
          <form onSubmit={createCampaign} className="flex flex-wrap gap-1 border-t pt-2">
            <Input className="h-8 w-44 text-xs" placeholder="campaign name" value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} required />
            <select className="rounded-md border px-2 py-1.5 text-xs" value={camp.channel} onChange={(e) => setCamp({ ...camp, channel: e.target.value })}>
              <option>sms</option><option>whatsapp</option><option>call</option>
            </select>
            <Input className="h-8 min-w-52 flex-1 text-xs" placeholder="template" value={camp.template} onChange={(e) => setCamp({ ...camp, template: e.target.value })} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={camp.consentChecked} onChange={(e) => setCamp({ ...camp, consentChecked: e.target.checked })} /> consent checked</label>
            <Button size="sm" type="submit">Create</Button>
          </form>
        </CardContent></Card>
    </div>
  );
}
