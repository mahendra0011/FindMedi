import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import FormRenderer from '@/components/forms/FormRenderer';
import { saveDraft, loadDraft, clearDraft, queueWrite, syncNow, pendingWrites } from '@/lib/offlineQueue';

/**
 * File 14 §14.1 + file 15 §15.5 — form fill: pick a published template,
 * fill (autosaved draft locally), submit; offline failures queue and sync.
 */
export default function FormsFill() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [pending, setPending] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await (api as any).getFormTemplates({});
        setTemplates((r?.templates || []).filter((t: any) => t.status === 'Published'));
      } catch { toast.error('Failed to load templates'); }
      setPending((await pendingWrites().catch(() => [] as any[])).length);
    })();
  }, []);

  useEffect(() => {
    if (!sel) return;
    setValues(loadDraft(`form:${sel.key}:v${sel.version}`) || {});
  }, [sel]);

  const change = (v: Record<string, any>) => {
    setValues(v);
    if (sel) saveDraft(`form:${sel.key}:v${sel.version}`, v);
  };

  const submit = async () => {
    if (!sel) return;
    const payload = { templateKey: sel.key, values };
    try {
      await (api as any).submitFormResponse(payload);
      clearDraft(`form:${sel.key}:v${sel.version}`);
      toast.success('Submitted');
      setValues({});
    } catch {
      await queueWrite('/forms/responses', 'POST', payload);
      setPending((await pendingWrites().catch(() => [] as any[])).length);
      toast.success('Offline — queued, will sync');
    }
  };

  const sync = async () => {
    const r = await syncNow(async (w) => {
      const res = await fetch(w.url, {
        method: w.method,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': w.idempotencyKey },
        body: JSON.stringify(w.body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
    }).catch(() => ({ synced: 0, pending: 0 }));
    setPending(r.pending);
    toast.success(`Synced ${r.synced}, ${r.pending} pending`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-heading font-bold mr-auto">Forms</h1>
        {pending > 0 && <Button size="sm" variant="outline" onClick={sync}>Sync now ({pending})</Button>}
      </div>
      {!sel ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {templates.map((t: any) => (
            <Card key={t._id}>
              <CardContent className="p-4 flex items-center gap-2">
                <div><p className="font-bold">{t.title}</p><p className="text-xs text-muted-foreground">v{t.version} · {t.category}</p></div>
                <span className="flex-1" />
                <Button size="sm" onClick={() => setSel(t)}>Open</Button>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && <p className="text-sm text-muted-foreground">No published templates.</p>}
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">{sel.title}<span className="flex-1" /><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Back</Button></CardTitle></CardHeader>
          <CardContent>
            <FormRenderer template={sel} values={values} onChange={change} onSubmit={submit} submitLabel="Submit response" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
