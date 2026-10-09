import { useState } from 'react';
import { Inbox, WifiOff, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCountUp } from '@/lib/motion';

/** File 19 §19.2: shared empty / error / offline states — one look everywhere. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <Inbox className="text-muted-foreground" size={28} />
      <p className="font-semibold">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50/50 py-10 text-center">
      <AlertOctagon className="text-red-500" size={28} />
      <p className="font-semibold text-red-900">Something went wrong</p>
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function OfflineBar({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
      <WifiOff size={15} /> Offline — actions will queue and sync when you reconnect.
    </div>
  );
}

/** File 19 §19.4: destructive confirm with typed intent (no silent wipes). */
export function ConfirmDangerDialog({ open, title, body, requireText, onClose, onConfirm }: {
  open: boolean; title: string; body: string; requireText?: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ok = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setTyped(''); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-red-700">{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
        {requireText ? (
          <input
            className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={`Type "${requireText}" to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!ok} onClick={() => { setTyped(''); onConfirm(); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** File 19: animated hero number. */
export function CountUp({ value, suffix }: { value: number; suffix?: string }) {
  const v = useCountUp(Number(value) || 0);
  return <span>{Math.round(v).toLocaleString('en-IN')}{suffix || ''}</span>;
}

/** File 19 §19.2: inline JSON diff for audit/version views. */
export function DiffView({ before, after }: { before: any; after: any }) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  const changed = keys.filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
  if (!changed.length) return <p className="text-sm text-muted-foreground">No changes.</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead><tr className="bg-muted"><th className="p-2 text-left">Field</th><th className="p-2 text-left">Before</th><th className="p-2 text-left">After</th></tr></thead>
        <tbody>
          {changed.map((k) => (
            <tr key={k} className="border-t">
              <td className="p-2 font-mono font-semibold">{k}</td>
              <td className="p-2 font-mono text-red-700 line-through">{JSON.stringify(before?.[k])}</td>
              <td className="p-2 font-mono text-green-700">{JSON.stringify(after?.[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
