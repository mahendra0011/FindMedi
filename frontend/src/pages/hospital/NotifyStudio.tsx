import { useEffect, useState } from 'react';
import { MessageSquare, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/** File 22 P2-35: template registry — edit, lint, preview per channel + DLT. */
export default function NotifyStudio() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ key: '', name: '', channel: 'sms', body: '', dltTemplateId: '' });
  const [previewId, setPreviewId] = useState('');
  const [sample, setSample] = useState('{"name":"Ram","token":"A12"}');
  const [preview, setPreview] = useState<any | null>(null);

  const load = async () => {
    try {
      const r: any = await api.notifyTemplates({});
      setRows(r?.templates || []);
    } catch { toast.error('Failed to load templates'); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r: any = await api.saveNotifyTemplate(form);
      if (r?.lint?.warnings?.length) toast.warning(`Saved with warnings: ${r.lint.warnings.join('; ')}`);
      else toast.success('Template saved');
      setForm({ key: '', name: '', channel: 'sms', body: '', dltTemplateId: '' });
      load();
    } catch (err: any) {
      const d = err?.response?.data;
      toast.error(d?.code === 'TEMPLATE_LINT' ? `Lint: ${(d.lint?.errors || []).join('; ')}` : (d?.message || 'Save failed'));
    }
  };

  const doPreview = async (id: string) => {
    try {
      const values = JSON.parse(sample || '{}');
      const r: any = await api.previewNotifyTemplate(id, values);
      setPreviewId(id);
      setPreview(r);
    } catch { toast.error('Preview failed (bad sample JSON?)'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1 text-sm"><MessageSquare size={14} /> Templates ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map((t) => (
            <div key={t._id} className="rounded-md border p-2 text-xs">
              <p className="flex items-center justify-between">
                <span><b className="font-mono">{t.key}</b> · {t.channel} {t.active ? '' : '(off)'}</span>
                <Button size="sm" variant="outline" onClick={() => doPreview(t._id)}><Eye size={13} /> Preview</Button>
              </p>
              <p className="mt-1 rounded bg-muted/50 p-1.5 font-mono text-[11px]">{t.body}</p>
              <p className="mt-1 text-muted-foreground">vars: {(t.variables || []).join(', ')} {t.dltTemplateId ? `· DLT ${t.dltTemplateId}` : '· no DLT mapped'}</p>
              {previewId === t._id && preview ? (
                <div className="mt-1 rounded border border-primary/30 p-1.5">
                  {preview.lint?.warnings?.map((w: string, i: number) => <p key={i} className="text-amber-700">⚠ {w}</p>)}
                  {preview.rendered ? <p className="font-medium">{preview.rendered}</p> : null}
                  {preview.renderError ? <p className="text-red-700">Missing: {(preview.renderError.missing || []).join(', ')}</p> : null}
                </div>
              ) : null}
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No templates yet.</p> : null}
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">New template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-2">
              <div className="flex gap-1">
                <Input className="h-8 text-xs" placeholder="key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
                <select aria-label="Channel" className="rounded-md border px-2 text-xs" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                  <option>sms</option><option>whatsapp</option><option>email</option><option>push</option><option>inapp</option>
                </select>
              </div>
              <Input className="h-8 text-xs" placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <textarea className="h-24 w-full rounded-md border p-2 font-mono text-xs" placeholder="Hi {{name}}, token {{token}}" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="DLT template id (sms/whatsapp)" value={form.dltTemplateId} onChange={(e) => setForm({ ...form, dltTemplateId: e.target.value })} />
              <Button size="sm" type="submit">Save (linted)</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Preview sample values (JSON)</CardTitle></CardHeader>
          <CardContent>
            <textarea className="h-20 w-full rounded-md border p-2 font-mono text-xs" value={sample} onChange={(e) => setSample(e.target.value)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
