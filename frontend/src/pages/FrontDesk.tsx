import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Ticket, Receipt, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import PatientBanner from '@/components/clinical/PatientBanner';

/**
 * File 09 §5.1 — front-desk stub: quick patient search (UHID/phone/name),
 * links to registration, tokens, OPD billing counter and queue display.
 */
export default function FrontDesk() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [enq, setEnq] = useState({ name: '', phone: '', interest: '' });

  const loadEnquiries = async () => {
    try {
      const r: any = await api.enquiries({ status: 'Open' });
      setEnquiries(r?.enquiries || []);
    } catch { /* optional */ }
  };

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res: any = await (api as any).getPatients({ search: q, limit: 10 });
      setRows(res?.data || res?.patients || []);
    } catch { setRows([]); }
    setLoading(false);
    loadEnquiries();
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
            <div key={p._id || p.id} onClick={() => setSelectedId(p._id || p.id || '')}
              className={`text-sm rounded-lg border p-2.5 cursor-pointer ${selectedId === (p._id || p.id) ? 'border-primary' : 'border-border/50'}`}>
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground"> · {p.uhid || p.phone || ''}</span>
            </div>
          ))}
          {/* File 22 P0-2: flag chips for the selected patient */}
          {selectedId && <PatientBanner patientId={selectedId} />}
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
      {/* File 22 P0-6: walk-in enquiry log */}
      <Card>
        <CardHeader><CardTitle className="text-base">Open enquiries ({enquiries.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input className="w-40" placeholder="Name" value={enq.name} onChange={(e) => setEnq({ ...enq, name: e.target.value })} />
            <Input className="w-36" placeholder="Phone" value={enq.phone} onChange={(e) => setEnq({ ...enq, phone: e.target.value })} />
            <Input className="w-48" placeholder="Interested in…" value={enq.interest} onChange={(e) => setEnq({ ...enq, interest: e.target.value })} />
            <Button onClick={async () => {
              try { await api.createEnquiry(enq); setEnq({ name: '', phone: '', interest: '' }); loadEnquiries(); }
              catch { /* toast? keep silent-fail minimal */ }
            }}>Log enquiry</Button>
          </div>
          {enquiries.slice(0, 8).map((e: any) => (
            <div key={e._id} className="flex items-center justify-between gap-2 text-sm rounded-lg border border-border/50 p-2">
              <span><b>{e.name}</b> <span className="text-muted-foreground">· {e.phone} · {e.interest}</span></span>
              <Button size="sm" variant="outline" onClick={async () => { await api.patchEnquiry(e._id, { status: 'Dropped' }); loadEnquiries(); }}>Drop</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
