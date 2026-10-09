import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 13 §13.3: work-task kanban (Open → InProgress → Blocked → Done). */
const COLS = ['Open', 'InProgress', 'Blocked', 'Done'];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [mine, setMine] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'P2', roleQueue: 'receptionist' });

  const load = async () => {
    try {
      const r: any = await api.workTasks(mine ? { mine: '1' } : {});
      setTasks(r?.tasks || []);
    } catch { toast.error('Failed to load tasks'); }
  };
  useEffect(() => { load(); }, [mine]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWorkTask({ ...form });
      setForm({ title: '', priority: 'P2', roleQueue: 'receptionist' });
      toast.success('Task created');
      load();
    } catch { toast.error('Create failed'); }
  };

  const move = async (t: any, status: string) => {
    try {
      await api.patchWorkTask(t._id, { status });
      load();
    } catch { toast.error('Move failed'); }
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/task-id');
    const t = tasks.find((x) => x._id === id);
    if (t && t.status !== status) move(t, status);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={create} className="flex flex-1 flex-wrap gap-2">
          <Input className="min-w-52 flex-1" placeholder="New task title…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="rounded-md border px-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>P0</option><option>P1</option><option>P2</option><option>P3</option>
          </select>
          <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
        </form>
        <Button size="sm" variant={mine ? 'default' : 'outline'} onClick={() => setMine(!mine)}>Mine only</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {COLS.map((c) => {
          const list = tasks.filter((t) => t.status === c);
          return (
            <Card key={c} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, c)}>
              <CardHeader><CardTitle className="text-xs">{c} ({list.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {list.map((t) => (
                  <div key={t._id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task-id', t._id)}
                    className="cursor-grab rounded-md border bg-card p-2 text-xs">
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-muted-foreground">{t.priority}{t.roleQueue ? ` · ${t.roleQueue}` : ''}{t.dueAt ? ` · due ${String(t.dueAt).slice(0, 10)}` : ''}</p>
                    <div className="mt-1 flex gap-1">
                      {COLS.filter((x) => x !== c).map((x) => (
                        <button key={x} onClick={() => move(t, x)} className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-muted">{x}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {list.length === 0 ? <EmptyState title="Empty" /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
