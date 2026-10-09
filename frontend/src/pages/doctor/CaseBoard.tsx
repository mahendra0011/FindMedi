import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 11 P2 — case board: tumour-board / M&M / teaching presentations.
 * Rows are de-identified; identity lives behind the linked encounter.
 */
export default function CaseBoard() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('Teaching');

  const load = async () => {
    try {
      const r: any = await (api as any).getCases({});
      setRows(r?.cases || []);
    } catch { toast.error('Failed to load cases'); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await (api as any).createCase({ title, kind });
      toast.success('Case drafted');
      setTitle('');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const present = async (id: string) => {
    try {
      await (api as any).presentCase(id, { discussion: '', decision: '' });
      toast.success('Marked presented');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Case Board</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">New case</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Case title (de-identified)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select aria-label="Kind" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            {['Teaching', 'TumourBoard', 'MM'].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <Button onClick={create} disabled={!title}>Draft</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {rows.map((c: any) => (
          <Card key={c._id}>
            <CardContent className="p-3 flex items-center gap-2 text-sm">
              <span className="font-medium">{c.title}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{c.kind} · {c.status}</span>
              <span className="flex-1" />
              {c.status === 'Draft' && <Button size="sm" variant="outline" onClick={() => present(c._id)}>Mark presented</Button>}
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No cases yet.</p>}
      </div>
    </div>
  );
}
