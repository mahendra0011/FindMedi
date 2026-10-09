import { useEffect, useState } from 'react';
import { Landmark, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';

/**
 * File 16 §16.3: bank recon workbench — accounts, statement paste-import,
 * two-pane automatch review, manual match, rules, guarded close.
 */
export default function ReconWorkbench() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [impId, setImpId] = useState('');
  const [txns, setTxns] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [paste, setPaste] = useState('');
  const [accId, setAccId] = useState('');
  const [onlyUnmatched, setOnlyUnmatched] = useState(true);
  const [manual, setManual] = useState({ txn: '', targetId: '' });

  const load = async () => {
    try {
      const [a, r]: any[] = await Promise.all([api.reconAccounts(), api.reconRules()]);
      setAccounts(a?.accounts || []);
      setRules(r?.rules || []);
      if (a?.accounts?.[0] && !accId) setAccId(a.accounts[0]._id);
    } catch { toast.error('Failed to load recon'); }
  };
  useEffect(() => { load(); }, []);

  const loadTxns = async (id: string) => {
    try {
      const r: any = await api.importTxns(id, onlyUnmatched ? { matched: '0' } : {});
      setTxns(r?.txns || []);
    } catch { toast.error('Failed to load txns'); }
  };

  // Paste CSV: date,narration,utr,debit,credit (one row per line).
  const doImport = async () => {
    const rows = paste.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [date, narration, utr, debit, credit] = l.split(',').map((s) => s.trim());
      return { date, narration, utr, debit: Number(debit) || 0, credit: Number(credit) || 0 };
    }).filter((r) => r.date && (r.debit || r.credit));
    if (!rows.length || !accId) { toast.error('Pick an account and paste valid rows'); return; }
    try {
      const r: any = await api.importStatement({ bankAccountId: accId, fileName: 'paste.csv', rows });
      setImpId(r?.id);
      toast.success(`${r?.rows} rows imported`);
      loadTxns(r?.id);
    } catch (e: any) { toast.error(e?.message || 'Import failed'); }
  };

  const automatch = async () => {
    if (!impId) return;
    try {
      const r: any = await api.automatchImport(impId);
      toast.success(`${r?.matched}/${r?.scanned} matched`);
      loadTxns(impId);
    } catch (e: any) { toast.error(e?.message || 'Automatch failed'); }
  };

  const matchManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.matchTxn(manual.txn, { targetModel: 'Payment', targetId: manual.targetId });
      toast.success('Matched');
      setManual({ txn: '', targetId: '' });
      if (impId) loadTxns(impId);
    } catch (e: any) { toast.error(e?.message || 'Match failed'); }
  };

  const close = async () => {
    if (!impId) return;
    try {
      await api.closeRecon(impId);
      toast.success('Import closed');
    } catch (e: any) { toast.error(e?.message || 'Close blocked — unmatched remain?'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Landmark size={14} /> Import statement</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <select className="w-full rounded-md border px-2 py-2 text-sm" value={accId} onChange={(e) => setAccId(e.target.value)}>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.bankName} ··{String(a.accountNo).slice(-4)}</option>)}
            </select>
            <textarea className="h-32 w-full rounded-md border p-2 font-mono text-xs" placeholder="2026-10-01,NEFT salary,UTR123,0,45000" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <Button size="sm" onClick={doImport}><Upload size={14} /> Import rows</Button>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Manual match</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={matchManual} className="space-y-1.5">
              <Input className="h-8 text-xs" placeholder="txn id" value={manual.txn} onChange={(e) => setManual({ ...manual, txn: e.target.value })} required />
              <Input className="h-8 text-xs" placeholder="payment id" value={manual.targetId} onChange={(e) => setManual({ ...manual, targetId: e.target.value })} required />
              <Button size="sm" type="submit">Match</Button>
            </form>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Narration rules ({rules.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {rules.map((r) => <p key={r._id} className="rounded border px-2 py-1 font-mono text-[11px]">{r.pattern} → {r.targetModel}</p>)}
          </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          Transactions ({txns.length})
          <Button size="sm" variant="outline" onClick={() => impId && loadTxns(impId)}>Reload</Button>
          <Button size="sm" onClick={automatch}><Wand2 size={14} /> Auto-match</Button>
          <label className="flex items-center gap-1 text-xs font-normal"><input type="checkbox" checked={onlyUnmatched} onChange={(e) => setOnlyUnmatched(e.target.checked)} /> unmatched only</label>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={close}>Close import</Button>
        </CardTitle></CardHeader>
        <CardContent className="max-h-[560px] space-y-1 overflow-y-auto">
          {txns.map((t) => (
            <div key={t._id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
              <span className="truncate">{String(t.date).slice(0, 10)} · {t.narration} <span className="font-mono text-muted-foreground">{t.utr}</span></span>
              <span className="flex shrink-0 items-center gap-2">
                {t.credit ? <b className="text-green-700">+{t.credit}</b> : null}{t.debit ? <b className="text-red-700">-{t.debit}</b> : null}
                <StatusPill status={t.matchId ? 'matched' : 'open'} />
              </span>
            </div>
          ))}
          {txns.length === 0 ? <p className="text-sm text-muted-foreground">Import a statement to begin.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
