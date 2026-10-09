import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Ticket, Receipt, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

/**
 * File 09 §5.1 — front-desk stub: quick patient search (UHID/phone/name),
 * links to registration, tokens, OPD billing counter and queue display.
 */
export default function FrontDesk() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res: any = await (api as any).getPatients({ search: q, limit: 10 });
      setRows(res?.data || res?.patients || []);
    } catch { setRows([]); }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Front Desk</h1>
        <p className="text-sm text-muted-foreground">Registration · tokens · OPD billing · queue display.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4" />Quick patient search</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="UHID / phone / name" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
            <Button onClick={search} disabled={loading}>Search</Button>
          </div>
          {rows.map((p: any) => (
            <div key={p._id || p.id} className="text-sm rounded-lg border border-border/50 p-2.5">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground"> · {p.uhid || p.phone || ''}</span>
            </div>
          ))}
          {q && !loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No match — register as new patient.</p>}
        </CardContent>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: '/patient-registration', icon: UserPlus, label: 'New registration' },
          { to: '/opd-token', icon: Ticket, label: 'Tokens & queue' },
          { to: '/billing', icon: Receipt, label: 'OPD billing counter' },
          { to: '/display/queue', icon: MonitorPlay, label: 'Queue display (TV)' },
        ].map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <c.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{c.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
