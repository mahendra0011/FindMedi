import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

/**
 * File 13 §13.7: master search (⌘K). Prefix grammar: bill: pt: rx: bed:
 * staff: ticket: appt:. Arrow keys + Enter to jump; every group navigates
 * to the record's home module.
 */
const DEST: Record<string, (id: string) => string> = {
  patients: (id) => `/patients/${id}`,
  bills: (id) => `/billing/${id}`,
  appointments: (id) => `/appointments`,
  beds: (id) => `/hospital/beds`,
  staff: (id) => `/admin/staff`,
  pharmacy: (id) => `/pharmacy`,
  tasks: (id) => `/hospital/tasks`,
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [active, setActive] = useState(0);
  const timer = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open ]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setGroups([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r: any = await api.masterSearch(q);
        setGroups(r?.groups || []);
      } catch { setGroups([]); }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [q]);

  const flat = groups.flatMap((g) => g.items.map((it: any) => ({ ...it, group: g.key })));

  const go = (item: any) => {
    const fn = DEST[item.group];
    if (fn) window.location.href = fn(item.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && flat[active]) go(flat[active]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-lg hover:bg-muted"
        aria-label="Master search (Ctrl+K)"
      >
        <Search size={15} /> <kbd className="rounded border px-1 text-[11px]">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] max-w-xl translate-y-0">
          <div className="flex items-center gap-2 border-b pb-2">
            <Search size={16} />
            <Input ref={inputRef} placeholder="bill:123 · pt:sharma · bed:12 · plain text searches all…" value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown} />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase text-muted-foreground">{g.label}</p>
                {g.items.map((it: any) => {
                  const idx = flat.findIndex((f) => f.id === it.id && f.group === g.key);
                  return (
                    <button key={it.id} onClick={() => go({ ...it, group: g.key })}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${idx === active ? 'bg-muted' : ''}`}>
                      <span className="font-medium">{it.title}</span>
                      <span className="text-xs text-muted-foreground">{it.sub}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {q.trim().length >= 2 && groups.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No matches.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
