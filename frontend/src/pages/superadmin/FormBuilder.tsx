import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import FormRenderer from '@/components/forms/FormRenderer';

/**
 * File 14 §14.1 — form builder: palette → canvas (sortable), property
 * panel, live preview, save draft + publish. framer-motion deliberately
 * unused here: dnd-kit handles drag ghosts + drop lines itself.
 */
const PALETTE = ['text', 'textarea', 'number', 'select', 'radio', 'checkbox', 'yesno', 'scale', 'date', 'signature', 'info'];

let seq = 0;
const nid = (type: string) => `${type}_${Date.now().toString(36)}_${(seq += 1)}`;

function SortableField({ field, selected, onSelect, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${selected ? 'border-primary' : 'border-border/50'}`}>
      <button aria-label="drag" className="cursor-grab px-1 text-muted-foreground" {...attributes} {...listeners}>⋮⋮</button>
      <span className="flex-1" onClick={() => onSelect(field.id)}><b>{field.label || field.type}</b> <span className="text-muted-foreground">· {field.type}</span></span>
      <Button size="sm" variant="ghost" onClick={() => onRemove(field.id)}>✕</Button>
    </div>
  );
}

export default function FormBuilder() {
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const sel = fields.find((f) => f.id === selId) || null;

  const add = (type: string) => setFields((p) => [...p, { id: nid(type), type, label: type, required: false, options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [] }]);
  const patch = (patchObj: any) => setFields((p) => p.map((f) => (f.id === selId ? { ...f, ...patchObj } : f)));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setFields((p) => {
        const from = p.findIndex((f) => f.id === active.id);
        const to = p.findIndex((f) => f.id === over.id);
        return arrayMove(p, from, to);
      });
    }
  };

  const payload = () => ({
    key, title,
    schema: { sections: [{ id: 's1', title: 'Section 1', fields }] },
    scoring: [], contexts: [],
  });

  const save = async (publish: boolean) => {
    try {
      if (!key || !title || !fields.length) { toast.error('Key, title and at least one field required'); return; }
      const r: any = await (api as any).createFormTemplate(payload());
      if (publish) await (api as any).publishFormTemplate(r.id);
      toast.success(publish ? 'Published' : `Saved (v${r.version})`);
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const template = { schema: { sections: [{ id: 's1', fields }] } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-heading font-bold mr-auto">Form Builder</h1>
        <Input className="w-40" placeholder="key (e.g. nursing-admit)" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input className="w-56" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button variant="outline" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</Button>
        <Button variant="outline" onClick={() => save(false)}>Save</Button>
        <Button onClick={() => save(true)}>Publish</Button>
      </div>

      {preview ? (
        <Card><CardContent className="p-4">
          <FormRenderer template={template} values={answers} onChange={setAnswers} onSubmit={() => toast.success('Preview only — publish to use live')} submitLabel="Test submit" />
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-[180px_1fr_240px] gap-3">
          <Card><CardHeader><CardTitle className="text-sm">Fields</CardTitle></CardHeader>
            <CardContent className="grid gap-1.5">
              {PALETTE.map((t) => <Button key={t} size="sm" variant="outline" onClick={() => add(t)}>{t}</Button>)}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-sm">Canvas ({fields.length})</CardTitle></CardHeader>
            <CardContent>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {fields.map((f) => (
                      <SortableField key={f.id} field={f} selected={f.id === selId} onSelect={setSelId} onRemove={(id: string) => setFields((p) => p.filter((x) => x.id !== id))} />
                    ))}
                    {fields.length === 0 && <p className="text-sm text-muted-foreground">Add fields from the palette.</p>}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-sm">Properties</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!sel && <p className="text-sm text-muted-foreground">Select a field.</p>}
              {sel && (
                <>
                  <Input placeholder="Label" value={sel.label || ''} onChange={(e) => patch({ label: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!sel.required} onChange={(e) => patch({ required: e.target.checked })} /> Required</label>
                  {(sel.type === 'select' || sel.type === 'radio') && (
                    <Input placeholder="Options (comma separated)" value={(sel.options || []).join(', ')} onChange={(e) => patch({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                  )}
                  {(sel.type === 'number' || sel.type === 'scale') && (
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Min" value={sel.min ?? ''} onChange={(e) => patch({ min: e.target.value === '' ? undefined : Number(e.target.value) })} />
                      <Input type="number" placeholder="Max" value={sel.max ?? ''} onChange={(e) => patch({ max: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
