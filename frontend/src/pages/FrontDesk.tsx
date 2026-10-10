import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Ticket, Receipt, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
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
  // File 22 P1-12: duplicates + ABHA + visitor pass.
  const [dups, setDups] = useState<any[]>([]);
  const [abha, setAbha] = useState('');
  const [visitor, setVisitor] = useState({ visitorName: '', phone: '', relation: '' });
  // File 22 P0-left: check-in + bill collection.
  const [checkInDept, setCheckInDept] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');

  const loadEnquiries = async () => {
    try {
      const r: any = await api.enquiries({ status: 'Open' });
      setEnquiries(r?.enquiries || []);
    } catch { /* optional */ }
  };

  const loadDups = async () => {
    try {
      const r: any = await api.patientDuplicates();
      setDups(r?.groups || []);
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
          {/* File 22 P0-left: quick check-in (token) + bill collection for the selected patient */}
          {selectedId ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-border/50 p-2.5">
              <Input className="w-44 h-8 text-xs" placeholder="Department (e.g. General Medicine)" value={checkInDept} onChange={(e) => setCheckInDept(e.target.value)} />
              <Button size="sm" onClick={async () => {
                try {
                  const sel = rows.find((p: any) => (p._id || p.id) === selectedId);
                  await api.post('/tokens/generate', {
                    patientId: sel?.userId || sel?._id, patientName: sel?.name,
                    uhid: sel?.uhid, department: checkInDept || 'General',
                  });
                  setCheckInDept('');
                  toast.success('Token generated');
                } catch (err: any) { toast.error(err?.response?.data?.message || 'Token failed'); }
              }}>Check in</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const r: any = await api.getBills({ patientId: selectedId, status: 'Unpaid', limit: 1 });
                  const bill = (r?.data || r?.bills || [])[0];
                  if (bill) { setSelectedBillId(bill._id); toast.info(`Bill ${bill.invoiceId} — balance ₹${bill.balance ?? bill.amount}`); }
                  else toast.success('No unpaid bills');
                } catch { toast.error('Billing lookup failed'); }
              }}>Collect bill</Button>
            </div>
          ) : null}
          {/* File 22 P1-12: ABHA link + visitor pass for the selected patient */}
          {selectedId ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-border/50 p-2.5">
              <Input className="w-44 h-8 text-xs" placeholder="user@sbx (ABHA)" value={abha} onChange={(e) => setAbha(e.target.value)} />
              <Button size="sm" variant="outline" onClick={async () => {
                try { await api.linkAbha(selectedId, abha); setAbha(''); search(); } catch { /* invalid format */ }
              }}>Link ABHA</Button>
              <Input className="w-32 h-8 text-xs" placeholder="Visitor name" value={visitor.visitorName} onChange={(e) => setVisitor({ ...visitor, visitorName: e.target.value })} />
              <Input className="w-28 h-8 text-xs" placeholder="Phone" value={visitor.phone} onChange={(e) => setVisitor({ ...visitor, phone: e.target.value })} />
              <Input className="w-28 h-8 text-xs" placeholder="Relation" value={visitor.relation} onChange={(e) => setVisitor({ ...visitor, relation: e.target.value })} />
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const sel = rows.find((p: any) => (p._id || p.id) === selectedId);
                  await api.safetyCreate('visitor-passes', { patientId: sel?.userId || undefined, ...visitor });
                  setVisitor({ visitorName: '', phone: '', relation: '' });
                } catch { /* validation */ }
              }}>Issue pass</Button>
            </div>
          ) : null}
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
      {/* File 22 P1-12: duplicate groups + merge */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">Duplicates
          <Button size="sm" variant="outline" onClick={loadDups}>Scan</Button>
        </CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dups.slice(0, 10).map((g: any, i: number) => (
            <div key={i} className="rounded-lg border border-border/50 p-2 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{g.key}</p>
              {g.patients.map((p: any) => (
                <div key={p._id} className="flex items-center justify-between gap-2 py-0.5">
                  <span>{p.name} <span className="text-muted-foreground">· {p.uhid || ''}</span></span>
                  {g.patients[0]._id !== p._id ? (
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!window.confirm(`Merge ${p.name} into ${g.patients[0].name}? This re-points records and cannot be undone.`)) return;
                      try { await api.mergePatients(g.patients[0]._id, p._id); loadDups(); } catch { /* conflict */ }
                    }}>Merge into first</Button>
                  ) : <span className="text-xs text-muted-foreground">survivor</span>}
                </div>
              ))}
            </div>
          ))}
          {dups.length === 0 ? <p className="text-sm text-muted-foreground">No duplicates found (or not scanned yet).</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
