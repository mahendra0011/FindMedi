import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Plus, CheckCircle, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { SlaRing } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/**
 * File 13 §13.1: visual workflow designer (xyflow) + instance viewer + inbox.
 * Graph edits save as a NEW version (never mutate published); publish
 * validates (single start, no orphans, all paths reach end).
 */
let seq = 0;
const nid = () => `s${Date.now() % 100000}_${seq++}`;

export default function WorkflowStudio() {
  const [defs, setDefs] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [meta, setMeta] = useState({ key: 'discharge', name: '', entityModel: 'Admission' });
  const [inbox, setInbox] = useState<any[]>([]);
  const [instance, setInstance] = useState<any | null>(null);
  const [eventName, setEventName] = useState('');

  const load = async () => {
    try {
      const r: any = await api.wfDefinitions();
      setDefs(r?.definitions || []);
      const ib: any = await api.wfInbox();
      setInbox(ib?.inbox || []);
    } catch { toast.error('Failed to load workflows'); }
  };
  useEffect(() => { load(); }, []);

  const openDef = (d: any) => {
    setSel(d);
    setMeta({ key: d.key, name: d.name, entityModel: d.entityModel || '' });
    setNodes((d.states || []).map((s: any, i: number) => ({
      id: s.id, position: { x: 80 + (i % 4) * 180, y: 80 + Math.floor(i / 4) * 140 },
      data: { label: `${s.id}${s.label ? ` — ${s.label}` : ''} [${s.type}]${s.slaMinutes ? ` ⏱${s.slaMinutes}m` : ''}` },
      style: {
        border: '2px solid', borderColor: s.type === 'start' ? 'hsl(var(--status-ok))' : s.type === 'end' ? 'hsl(var(--status-bad))' : 'hsl(var(--border))',
        borderRadius: 8, padding: 10, background: 'hsl(var(--card))', fontSize: 12,
      },
    })));
    setEdges((d.transitions || []).map((t: any, i: number) => ({
      id: t.id || `e${i}`, source: t.from, target: t.to, label: t.event, animated: true,
    })));
  };

  const onConnect = useCallback((c: Connection) => {
    const event = window.prompt('Event name for this transition:', 'approve');
    if (!event) return;
    setEdges((eds) => addEdge({ ...c, label: event, animated: true }, eds));
  }, [setEdges]);

  const addState = (type: string) => {
    const id = window.prompt('State id:', nid());
    if (!id) return;
    const sla = type === 'task' ? Number(window.prompt('SLA minutes (0 = none):', '60') || 0) : 0;
    setNodes((ns) => [...ns, {
      id, position: { x: 120 + ns.length * 40, y: 320 },
      data: { label: `${id} [${type}]${sla ? ` ⏱${sla}m` : ''}` },
      style: { border: '2px solid hsl(var(--border))', borderRadius: 8, padding: 10, background: 'hsl(var(--card))', fontSize: 12 },
      // @ts-expect-error xyflow passthrough
      slaMinutes: sla, nodeType: type,
    }]);
  };

  const graph = useMemo(() => {
    const parse = (label: string) => {
      const m = String(label).match(/^(.*?)\s*\[(start|task|parallel|join|end)\]/);
      return { id: m ? m[1].trim().split(' — ')[0] : label, type: (m ? m[2] : 'task') as string };
    };
    const states = nodes.map((n: any) => {
      const p = parse(String(n.data?.label));
      const slaM = String(n.data?.label).match(/⏱(\d+)m/);
      return { id: n.id, label: p.id === String(n.data?.label) ? '' : p.id, type: p.type, slaMinutes: slaM ? Number(slaM[1]) : (n.slaMinutes || 0) };
    });
    const transitions = edges.map((e, i) => ({ id: e.id || `e${i}`, from: e.source, to: e.target, event: String(e.label || 'go') }));
    return { states, transitions };
  }, [nodes, edges]);

  const saveNew = async () => {
    try {
      const r: any = await api.wfCreateDefinition({ ...meta, ...graph });
      toast.success(`Saved as version ${r?.version}`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Save failed (validation errors?)'); }
  };

  const publish = async () => {
    if (!sel) return;
    try {
      await api.wfPublish(sel._id || sel.id);
      toast.success('Published');
      load();
    } catch (e: any) { toast.error(e?.message || 'Publish failed'); }
  };

  const startInstance = async () => {
    try {
      const r: any = await api.wfStartInstance({ defKey: meta.key, entityRef: {} });
      toast.success('Instance started');
      viewInstance(r?.id);
    } catch (e: any) { toast.error(e?.message || 'Start failed'); }
  };

  const viewInstance = async (id: string) => {
    try {
      const r: any = await api.wfInstance(id);
      setInstance(r);
    } catch { toast.error('Instance not found'); }
  };

  const fire = async () => {
    if (!instance?.instance?._id || !eventName) return;
    try {
      await api.wfFireEvent(instance.instance._id, { event: eventName, version: instance.instance.version });
      toast.success('Event fired');
      setEventName('');
      viewInstance(instance.instance._id);
    } catch (e: any) { toast.error(e?.message || 'Transition rejected'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <Card><CardHeader><CardTitle className="text-sm">Definitions</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {defs.map((d) => (
              <button key={d._id + d.version} onClick={() => openDef(d)}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs hover:bg-muted ${sel?._id === d._id ? 'border-primary' : ''}`}>
                <span className="font-semibold">{d.key}</span> <span className="text-muted-foreground">v{d.version} · {d.status}</span>
              </button>
            ))}
            {defs.length === 0 ? <EmptyState title="No workflows yet" /> : null}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Inbox size={14} /> SLA inbox</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {inbox.map((i) => (
              <button key={i._id} onClick={() => viewInstance(i._id)} className="w-full rounded-md border px-2 py-1.5 text-left text-xs hover:bg-muted">
                <span className="font-semibold">{i.defKey}</span> · {i.state}
              </button>
            ))}
            {inbox.length === 0 ? <p className="text-xs text-muted-foreground">No overdue instances.</p> : null}
          </CardContent></Card>
      </div>

      <div className="space-y-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Designer {sel ? `— ${sel.key} v${sel.version} (${sel.status})` : '(pick or create)'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input className="w-40" placeholder="key" value={meta.key} onChange={(e) => setMeta({ ...meta, key: e.target.value })} />
              <Input className="w-56" placeholder="name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              <Button size="sm" variant="outline" onClick={() => addState('task')}><Plus size={14} /> task</Button>
              <Button size="sm" variant="outline" onClick={() => addState('start')}>start</Button>
              <Button size="sm" variant="outline" onClick={() => addState('end')}>end</Button>
              <Button size="sm" variant="outline" onClick={() => addState('parallel')}>parallel</Button>
              <Button size="sm" variant="outline" onClick={() => addState('join')}>join</Button>
              <Button size="sm" onClick={saveNew}><CheckCircle size={14} /> Save new version</Button>
              {sel?.status === 'Draft' ? <Button size="sm" variant="secondary" onClick={publish}>Publish</Button> : null}
              <Button size="sm" variant="secondary" onClick={startInstance}><Play size={14} /> Start instance</Button>
            </div>
            <div className="h-[380px] rounded-md border">
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
                <Background /><Controls /><MiniMap />
              </ReactFlow>
            </div>
            <p className="text-xs text-muted-foreground">Drag between nodes to add a transition (you'll be asked for the event name). Click a node + Del to remove.</p>
          </CardContent>
        </Card>

        {instance ? (
          <Card>
            <CardHeader><CardTitle className="text-sm">Instance {instance.instance?._id} — {instance.instance?.state} ({instance.instance?.status})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(instance.definition?.transitions || []).filter((t: any) => (instance.instance?.activeStates || [instance.instance?.state]).includes(t.from))
                  .map((t: any) => (
                    <Button key={t.id || t.event} size="sm" variant="outline" onClick={() => { setEventName(t.event); }}>
                      {t.event} →
                    </Button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input className="w-48" placeholder="event" value={eventName} onChange={(e) => setEventName(e.target.value)} />
                <Button size="sm" onClick={fire}>Fire</Button>
              </div>
              {(instance.instance?.timers || []).map((t: any, i: number) => (
                <div key={i}><SlaRing dueAt={t.dueAt} label={`state ${t.state}`} /></div>
              ))}
              <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {(instance.instance?.history || []).slice().reverse().map((h: any, i: number) => (
                  <p key={i} className="rounded border px-2 py-1">{h.from} —[{h.event}]→ {h.to} <span className="text-muted-foreground">{h.note}</span></p>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
        {sel && !instance ? (
          <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={13} /> Published versions are immutable — edits always save as a new version.</p>
        ) : null}
      </div>
    </div>
  );
}
