import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 14 §14.2 — print studio: template HTML/CSS editor, variable lint
 * feedback from the server, live preview in a sandboxed iframe, publish.
 */
const DOCTYPES = ['bill', 'token', 'label', 'wristband', 'discharge', 'prescription'];

export default function PrintStudio() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [docType, setDocType] = useState('bill');
  const [name, setName] = useState('');
  const [html, setHtml] = useState('<h1>{{hospital.name}}</h1><p>Total {{bill.amount}} ({{inWords bill.amount}})</p>');
  const [css, setCss] = useState('');
  const [tab, setTab] = useState<'html' | 'css'>('html');
  const [preview, setPreview] = useState('');
  const [lint, setLint] = useState<string[]>([]);

  const load = async () => {
    try {
      const r: any = await (api as any).getPrintTemplates({ docType });
      setTemplates(r?.templates || []);
    } catch { toast.error('Failed to load templates'); }
  };
  useEffect(() => { load(); }, [docType]);

  const save = async () => {
    try {
      await (api as any).createPrintTemplate({ docType, name: name || `${docType} template`, html, css });
      toast.success('Draft saved (publish from the list when reviewed)');
      setName('');
      load();
    } catch (err: any) {
      const unknown = err?.unknown || err?.response?.unknown;
      if (unknown) setLint(unknown);
      toast.error(err?.message || 'Save failed (unknown variables?)');
    }
  };

  const testRender = async () => {
    try {
      const sample: any = { hospital: { name: 'Demo Hospital' }, bill: { amount: 1250, invoiceId: 'INV-1', paid: 1250, balance: 0 }, token: { number: 'A-014', department: 'OPD' }, patient: { name: 'Demo Patient' } };
      const r: any = await (api as any).renderPrint({ docType, data: sample, entityRef: 'preview' });
      setPreview(r?.html || '');
      setLint([]);
    } catch (err: any) { toast.error(err?.message || 'Render failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-heading font-bold mr-auto">Print Studio</h1>
        <select aria-label="Doc type" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOCTYPES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <Input className="w-56" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="outline" onClick={testRender}>Test render</Button>
        <Button onClick={save}>Save draft</Button>
      </div>
      {lint.length > 0 && <p className="text-sm text-destructive">Unknown variables: {lint.join(', ')} — registry me nahi hain.</p>}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <div className="flex gap-1">
              {(['html', 'css'] as const).map((t) => (
                <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>{t.toUpperCase()}</Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              aria-label={`${tab} editor`}
              className="w-full h-96 rounded-md border border-input bg-background p-3 font-mono text-xs"
              value={tab === 'html' ? html : css}
              onChange={(e) => (tab === 'html' ? setHtml(e.target.value) : setCss(e.target.value))}
              spellCheck={false}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Live preview (sandboxed)</CardTitle></CardHeader>
          <CardContent>
            <iframe title="print preview" sandbox="" srcDoc={preview} className="w-full h-96 rounded-md border bg-white" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Versions ({templates.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {templates.slice(0, 10).map((t: any) => (
            <p key={t._id} className="flex justify-between"><span>{t.name} · v{t.version}</span><span className="text-muted-foreground">{t.status}</span></p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
