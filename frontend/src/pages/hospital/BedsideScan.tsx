import { useEffect, useState } from 'react';
import { ScanLine, CloudOff, Cloud, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarcodeScanner } from '@/components/ui/System';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { encryptAndStore, decryptAndLoad, clearEncrypted } from '@/lib/encryptedStorage';

/**
 * File 22 P2-32: nurse bedside station — one screen, three scan targets
 * (MAR dose, lab sample, blood unit). Offline scans are encrypted at rest
 * (AES-GCM via encryptedStorage, key derived from the session PIN/passphrase)
 * and replayed when connectivity returns, so a ward round is never blocked
 * by a dead wifi bar.
 */

type ScanKind = 'mar' | 'sample' | 'blood';
interface QueuedScan {
  kind: ScanKind;
  code: string;
  at: string;
}

const KINDS: { key: ScanKind; label: string; hint: string }[] = [
  { key: 'mar', label: 'MAR dose', hint: 'scan medication Administration Record code' },
  { key: 'sample', label: 'Lab sample', hint: 'scan sample accession / barcode' },
  { key: 'blood', label: 'Blood unit', hint: 'scan blood unit number' },
];

export default function BedsideScan() {
  const [kind, setKind] = useState<ScanKind>('mar');
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
  const [lastResult, setLastResult] = useState<any>(null);

  const QUEUE_KEY = 'bedside-passphrase';

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const persist = async (next: QueuedScan[], pass: string) => {
    if (!pass) return;
    try { await encryptAndStore(pass, { scans: next }); } catch { /* quota */ }
  };

  const unlock = async () => {
    if (passphrase.length < 4) { toast.error('Passphrase must be at least 4 characters'); return; }
    try {
      const stored = await decryptAndLoad(passphrase);
      if (stored?.scans) setQueue(stored.scans);
      setUnlocked(true);
      sessionStorage.setItem(QUEUE_KEY, '1');
      toast.success('Offline vault unlocked');
    } catch { toast.error('Wrong passphrase (or corrupt vault)'); }
  };

  const submitOnline = async (code: string): Promise<boolean> => {
    try {
      const r: any = await api.post('/nursing/scan', { kind, code });
      setLastResult({ code, ok: true, at: new Date().toLocaleTimeString(), entity: r?.entity });
      return true;
    } catch {
      return false;
    }
  };

  const onScan = async (code: string) => {
    if (!unlocked) { toast.error('Unlock the offline vault first'); return; }
    const ok = online ? await submitOnline(code) : false;
    if (ok) { toast.success(`${kind} scan accepted`); return; }
    const next = [...queue, { kind, code, at: new Date().toISOString() }];
    setQueue(next);
    await persist(next, passphrase);
    toast.warning('Offline — scan encrypted and queued');
  };

  const flush = async () => {
    if (!queue.length) return;
    const remaining: QueuedScan[] = [];
    for (const s of queue) {
      const ok = await submitOnline(s.code).catch(() => false);
      if (!ok) remaining.push(s);
    }
    setQueue(remaining);
    await persist(remaining, passphrase);
    toast.success(remaining.length ? `${queue.length - remaining.length} sent, ${remaining.length} still queued` : 'All queued scans sent');
  };

  const wipe = async () => {
    if (!window.confirm('Erase the encrypted offline vault on this device?')) return;
    clearEncrypted();
    setQueue([]);
    setUnlocked(false);
    sessionStorage.removeItem(QUEUE_KEY);
    toast.success('Vault wiped');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <ScanLine className="w-5 h-5" />Bedside scan
        </h1>
        <p className="text-sm text-muted-foreground">MAR / sample / blood unit — offline-first with an encrypted vault.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />Offline vault
            </span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${online ? 'text-green-700' : 'text-amber-600'}`}>
              {online ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {online ? 'online' : 'offline'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!unlocked ? (
            <div className="flex gap-2">
              <Input type="password" className="w-64" placeholder="vault passphrase"
                value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && unlock()} />
              <Button onClick={unlock}>Unlock</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{queue.length} queued scan(s)</span>
              <Button size="sm" variant="outline" onClick={flush} disabled={!queue.length || !online}>
                <Cloud className="w-3.5 h-3.5 mr-1" />Replay queue
              </Button>
              <Button size="sm" variant="ghost" onClick={wipe}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan target</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => setKind(k.key)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  kind === k.key ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/40'
                }`}>{k.label}</button>
            ))}
          </div>
          <BarcodeScanner onScan={onScan} label={KINDS.find((k) => k.key === kind)?.hint || 'scan code'} />
          {lastResult ? (
            <p className="text-sm text-green-700">
              Last accepted: {lastResult.code} at {lastResult.at}
              {lastResult.entity?.patientName ? ` · ${lastResult.entity.patientName}` : ''}
              {lastResult.entity?.status ? ` · ${lastResult.entity.status}` : ''}
            </p>
          ) : null}
          <div className="space-y-1.5">
            {queue.map((s, i) => (
              <div key={`${s.code}-${i}`} className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-sm">
                <span><b className="uppercase text-xs text-muted-foreground">{s.kind}</b> {s.code}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
