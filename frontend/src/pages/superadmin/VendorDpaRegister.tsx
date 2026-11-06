import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

type VendorRow = {
  _id: string; vendorName: string; serviceDescription: string; dataCategories: string[];
  processingRegions: string[]; subprocessors: string[]; dpaStatus: string;
  signedAt?: string | null; expiresAt?: string | null; nextReviewAt?: string | null; reviewNote?: string;
};

const initialForm = {
  vendorName: '', serviceDescription: '', dataCategories: '', processingRegions: '', subprocessors: '',
  dpaStatus: 'not_started', signedAt: '', expiresAt: '', nextReviewAt: '', reviewNote: '',
};
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const localDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '—';

export default function VendorDpaRegister() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowSaving, setRowSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result: any = await api.get('/admin/vendor-dpas');
      setVendors(result?.vendors || []);
    } catch (error: any) { toast.error(error?.message || 'Could not load vendor register'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createVendor = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/vendor-dpas', {
        vendorName: form.vendorName,
        serviceDescription: form.serviceDescription,
        dataCategories: splitList(form.dataCategories),
        processingRegions: splitList(form.processingRegions),
        subprocessors: splitList(form.subprocessors),
        dpaStatus: form.dpaStatus,
        signedAt: form.signedAt ? new Date(form.signedAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        nextReviewAt: form.nextReviewAt ? new Date(form.nextReviewAt).toISOString() : null,
        reviewNote: form.reviewNote,
      });
      setForm(initialForm);
      toast.success('Vendor record added');
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || 'Could not add vendor'); }
    finally { setSaving(false); }
  };

  const updateVendor = async (vendor: VendorRow, dpaStatus: string, nextReviewAt: string, reviewNote: string) => {
    setRowSaving(vendor._id);
    try {
      await api.patch(`/admin/vendor-dpas/${vendor._id}`, {
        dpaStatus,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
        reviewNote,
      });
      toast.success('Vendor review updated');
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || 'Could not update vendor'); }
    finally { setRowSaving(null); }
  };

  return <div className="space-y-5">
    <div className="flex items-center gap-3">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <div><h1 className="text-2xl font-heading font-bold">Vendor & DPA Register</h1><p className="text-sm text-muted-foreground">Track processors, data categories, DPA status and review dates.</p></div>
      <Button className="ml-auto" variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Add vendor</CardTitle></CardHeader>
      <CardContent><form onSubmit={createVendor} className="grid gap-3 md:grid-cols-2">
        <Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor name" required maxLength={160} />
        <select aria-label="DPA status" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.dpaStatus} onChange={(e) => setForm({ ...form, dpaStatus: e.target.value })}>
          {['not_started', 'in_review', 'signed', 'not_required', 'expired'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
        <Input value={form.serviceDescription} onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })} placeholder="Service / processing purpose" required maxLength={1000} />
        <Input value={form.dataCategories} onChange={(e) => setForm({ ...form, dataCategories: e.target.value })} placeholder="Data categories (comma separated)" />
        <Input value={form.processingRegions} onChange={(e) => setForm({ ...form, processingRegions: e.target.value })} placeholder="Processing regions (comma separated)" />
        <Input value={form.subprocessors} onChange={(e) => setForm({ ...form, subprocessors: e.target.value })} placeholder="Subprocessors (comma separated)" />
        <label className="text-xs text-muted-foreground">DPA signed<input className="mt-1 block h-10 w-full rounded-md border bg-background px-3" type="date" value={form.signedAt} onChange={(e) => setForm({ ...form, signedAt: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">DPA expires<input className="mt-1 block h-10 w-full rounded-md border bg-background px-3" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Next review<input className="mt-1 block h-10 w-full rounded-md border bg-background px-3" type="date" value={form.nextReviewAt} onChange={(e) => setForm({ ...form, nextReviewAt: e.target.value })} /></label>
        <Input value={form.reviewNote} onChange={(e) => setForm({ ...form, reviewNote: e.target.value })} placeholder="Review note" maxLength={1000} />
        <div className="md:col-span-2"><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Add vendor record'}</Button></div>
      </form></CardContent>
    </Card>

    <Card><CardHeader><CardTitle className="text-base">Registered vendors ({vendors.length})</CardTitle></CardHeader><CardContent>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && vendors.length === 0 && <p className="text-sm text-muted-foreground">No vendors registered.</p>}
      <div className="space-y-3">{vendors.map((vendor) => <div key={vendor._id} className="rounded-lg border p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2"><strong>{vendor.vendorName}</strong><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{vendor.dpaStatus.replaceAll('_', ' ')}</span><span className="ml-auto text-xs text-muted-foreground">Review {localDate(vendor.nextReviewAt)} · Expires {localDate(vendor.expiresAt)}</span></div>
        <p className="mt-1 text-muted-foreground">{vendor.serviceDescription}</p>
        <p className="mt-1 text-xs text-muted-foreground">Data: {(vendor.dataCategories || []).join(', ') || 'unspecified'} · Regions: {(vendor.processingRegions || []).join(', ') || 'unspecified'} · Subprocessors: {(vendor.subprocessors || []).join(', ') || 'none recorded'}</p>
        {vendor.reviewNote && <p className="mt-1 text-xs">Review note: {vendor.reviewNote}</p>}
        <VendorReviewEditor key={`${vendor._id}:${vendor.dpaStatus}:${vendor.nextReviewAt || ''}:${vendor.reviewNote || ''}`} vendor={vendor} saving={rowSaving === vendor._id} onSave={updateVendor} />
      </div>)}</div>
    </CardContent></Card>
  </div>;
}

function VendorReviewEditor({ vendor, saving, onSave }: {
  vendor: VendorRow;
  saving: boolean;
  onSave: (vendor: VendorRow, status: string, reviewAt: string, note: string) => void;
}) {
  const [status, setStatus] = useState(vendor.dpaStatus);
  const [reviewAt, setReviewAt] = useState(vendor.nextReviewAt ? new Date(vendor.nextReviewAt).toISOString().slice(0, 10) : '');
  const [note, setNote] = useState(vendor.reviewNote || '');
  return <div className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-4">
    <select aria-label={`DPA status for ${vendor.vendorName}`} className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
      {['not_started', 'in_review', 'signed', 'not_required', 'expired'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
    </select>
    <label className="text-xs text-muted-foreground">Next review<input aria-label={`Next review for ${vendor.vendorName}`} className="mt-1 block h-10 w-full rounded-md border bg-background px-3" type="date" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label>
    <Input aria-label={`Review note for ${vendor.vendorName}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note" maxLength={1000} />
    <Button type="button" variant="outline" disabled={saving} onClick={() => onSave(vendor, status, reviewAt, note)}>{saving ? 'Saving…' : 'Save review'}</Button>
  </div>;
}
