import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2, Download, Loader2, User, Stethoscope, CalendarDays,
  ClipboardList, PlusCircle, RefreshCw, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { api, apiClient } from '@/lib/api';
import { toast } from 'sonner';

type CertType = 'sick_leave' | 'fitness' | 'referral' | 'immunization' | 'other';

interface Certificate {
  _id: string;
  patient?: string;
  patientId?: { _id: string; name?: string; email?: string };
  doctor?: string;
  doctorId?: { _id: string; name?: string; specialization?: string };
  diagnosis?: string;
  notes?: string;
  date?: string;
  createdAt?: string;
  data?: {
    certificateType?: CertType;
    title?: string;
    daysRest?: number | null;
    validFrom?: string;
    validTo?: string;
    verificationCode?: string;
  };
}

const TYPE_BADGES: Record<CertType, { label: string; cls: string }> = {
  sick_leave: { label: 'Sick Leave', cls: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  fitness: { label: 'Fitness', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  referral: { label: 'Referral', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  immunization: { label: 'Immunization', cls: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  other: { label: 'Medical', cls: 'bg-rose-500/10 text-rose-600 border-rose-200' },
};

const TYPE_OPTIONS: { value: CertType; label: string }[] = [
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'referral', label: 'Referral' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'other', label: 'Other' },
];

export default function ClinicCertificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState<CertType>('sick_leave');
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [daysRest, setDaysRest] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificates');
      const list = res?.data || res?.records || (Array.isArray(res) ? res : []);
      setCerts(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load certificates';
      toast.error(msg);
      setCerts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setPatientId('');
    setTitle('');
    setDiagnosis('');
    setDaysRest('');
    setValidFrom('');
    setValidTo('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim() || !title.trim()) {
      toast.error('Patient ID and title are required');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        patientId: patientId.trim(),
        type,
        title: title.trim(),
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
      };
      if (daysRest) body.daysRest = Number(daysRest);
      if (validFrom) body.validFrom = validFrom;
      if (validTo) body.validTo = validTo;
      await api.post('/certificates', body);
      toast.success('Certificate issued successfully');
      resetForm();
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue certificate';
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert._id);
    try {
      const response = await apiClient.get(`/certificates/${cert._id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (cert.data?.title || 'medical-certificate').replace(/\s+/g, '-').toLowerCase();
      a.download = `${slug}-${cert._id.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download certificate PDF');
    }
    setDownloading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-primary" />
            </span>
            Medical Certificates
          </h1>
          <p className="text-muted-foreground mt-1">Issue sick leave, fitness, referral and immunization certificates</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs h-8" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6 items-start">
        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="w-4 h-4 text-primary" /> Issue Certificate
            </CardTitle>
            <CardDescription>Create a new medical certificate for a patient</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="patientId" className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5" /> Patient ID / UHID
                </Label>
                <Input id="patientId" value={patientId} onChange={e => setPatientId(e.target.value)}
                  placeholder="Enter patient ObjectId or UHID" className="rounded-lg" required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" /> Certificate Type
                </Label>
                <Select value={type} onValueChange={v => setType(v as CertType)}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Sick Leave — 3 days" className="rounded-lg" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diagnosis" className="flex items-center gap-1.5 text-xs">
                  <Stethoscope className="w-3.5 h-3.5" /> Diagnosis
                </Label>
                <Textarea id="diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Clinical diagnosis" className="rounded-lg min-h-[64px]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="daysRest" className="text-xs">Rest Days</Label>
                  <Input id="daysRest" type="number" min={1} max={365} value={daysRest}
                    onChange={e => setDaysRest(e.target.value)} placeholder="e.g. 3" className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validFrom" className="text-xs">Valid From</Label>
                  <Input id="validFrom" type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validTo" className="text-xs">Valid To</Label>
                  <Input id="validTo" type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className="rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Additional instructions" className="rounded-lg min-h-[64px]" />
              </div>
              <Button type="submit" className="w-full rounded-lg gap-1.5" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                Issue Certificate
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${certs.length} certificate${certs.length !== 1 ? 's' : ''} issued`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
              <FileCheck2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg font-medium">No certificates issued yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Issued certificates will appear here with a downloadable PDF</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certs.map(cert => {
                const badge = TYPE_BADGES[cert.data?.certificateType || 'other'] || TYPE_BADGES.other;
                const isDownloading = downloading === cert._id;
                return (
                  <div key={cert._id}
                    className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold text-foreground truncate">
                            {cert.data?.title || 'Medical Certificate'}
                          </h3>
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {cert.patientId?.name || cert.patient || 'Patient'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" /> Dr. {cert.doctorId?.name || cert.doctor || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {new Date(cert.createdAt || cert.date || Date.now()).toLocaleDateString('en-IN')}
                          </span>
                          {cert.data?.verificationCode && (
                            <span className="flex items-center gap-1 text-primary">
                              <ShieldCheck className="w-3 h-3" /> {cert.data.verificationCode}
                            </span>
                          )}
                        </div>
                        {cert.diagnosis && (
                          <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{cert.diagnosis}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
                          {cert.data?.daysRest ? (
                            <span className="bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                              Rest: {cert.data.daysRest} day(s)
                            </span>
                          ) : null}
                          {cert.data?.validFrom || cert.data?.validTo ? (
                            <span className="bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                              Valid: {cert.data?.validFrom || '—'} → {cert.data?.validTo || '—'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs h-8 shrink-0"
                        disabled={isDownloading} onClick={() => handleDownload(cert)}>
                        {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        PDF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
