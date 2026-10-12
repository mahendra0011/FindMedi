import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Settings2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import {
  Modal, Field, StatusBadge, errMessage, inputCls, selectCls, textareaCls,
  parseList, listToText, RAD_MODALITY_TYPES,
} from '@/components/radiology/radShared';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emptyForm = {
  name: '', code: '', modalityType: 'X-Ray', roomNumber: '', machineModel: '', manufacturer: '',
  dicomAETitle: '', dicomPort: '4242', slotDurationMinutes: '30', status: 'Available',
  requiresContrastScreening: false, requiresImplantCheck: false,
  supportedStudies: '', prepRules: '', reportTemplates: '',
  price: '0', insuranceRate: '0',
  workingHoursOpen: '08:00', workingHoursClose: '20:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as string[],
  maintenanceScheduleDays: '90', dailyCapacity: '20', assignedStaff: '',
};

export default function ModalityMaster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const modsQ = useQuery({ queryKey: ['radiology', 'modalities'], queryFn: () => radApi.getModalities() });
  const all: any[] = modsQ.data?.modalities || [];

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const saveMut = useMutation({
    mutationFn: (b: any) => (editing ? radApi.updateModality(editing._id, b) : radApi.createModality(b)),
    onSuccess: () => {
      toast.success(editing ? 'Modality updated' : 'Modality created');
      invalidate();
      setShowDialog(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to save modality')),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => radApi.deleteModality(id),
    onSuccess: () => { toast.success('Modality deactivated'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to deactivate')),
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowDialog(true); };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      name: m.name || '', code: m.code || '', modalityType: m.modalityType || 'X-Ray',
      roomNumber: m.roomNumber || '', machineModel: m.machineModel || '', manufacturer: m.manufacturer || '',
      dicomAETitle: m.dicomAETitle || '', dicomPort: String(m.dicomPort ?? 4242),
      slotDurationMinutes: String(m.slotDurationMinutes ?? 30), status: m.status || 'Available',
      requiresContrastScreening: Boolean(m.requiresContrastScreening), requiresImplantCheck: Boolean(m.requiresImplantCheck),
      supportedStudies: listToText(m.supportedStudies), prepRules: listToText(m.prepRules),
      reportTemplates: listToText(m.reportTemplates),
      price: String(m.price ?? 0), insuranceRate: String(m.insuranceRate ?? 0),
      workingHoursOpen: m.workingHours?.open || '08:00', workingHoursClose: m.workingHours?.close || '20:00',
      workingDays: m.workingHours?.days?.length ? [...m.workingHours.days] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      maintenanceScheduleDays: String(m.maintenanceScheduleDays ?? 90), dailyCapacity: String(m.dailyCapacity ?? 20),
      assignedStaff: listToText(m.assignedStaff),
    });
    setShowDialog(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      name: form.name,
      code: form.code,
      modalityType: form.modalityType,
      roomNumber: form.roomNumber,
      machineModel: form.machineModel,
      manufacturer: form.manufacturer,
      dicomAETitle: form.dicomAETitle,
      dicomPort: Number(form.dicomPort) || undefined,
      slotDurationMinutes: Number(form.slotDurationMinutes) || 30,
      status: form.status,
      requiresContrastScreening: form.requiresContrastScreening,
      requiresImplantCheck: form.requiresImplantCheck,
      supportedStudies: parseList(form.supportedStudies),
      prepRules: parseList(form.prepRules),
      reportTemplates: parseList(form.reportTemplates),
      price: Number(form.price) || 0,
      insuranceRate: Number(form.insuranceRate) || 0,
      workingHours: { open: form.workingHoursOpen, close: form.workingHoursClose, days: form.workingDays },
      maintenanceScheduleDays: Number(form.maintenanceScheduleDays) || 90,
      dailyCapacity: Number(form.dailyCapacity) || 20,
      assignedStaff: parseList(form.assignedStaff),
    });
  };

  const filtered = all.filter((m: any) => {
    if (!showInactive && m.status === 'Inactive') return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [m.name, m.code, m.modalityType, m.roomNumber, m.machineModel].some((v: any) => String(v || '').toLowerCase().includes(s));
  });

  const flag = (on: boolean) => (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${on ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{on ? 'ON' : 'OFF'}</span>
  );

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Modality Master</h1>
          <p className="page-subtitle">{filtered.length} machines & rooms configured</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Modality</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, code, room..." className="pl-10" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="p-3 font-medium">Machine</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Room</th>
              <th className="p-3 font-medium">Model</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Price</th>
              <th className="p-3 font-medium text-right">Slot</th>
              <th className="p-3 font-medium text-center">Flags</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.code}{m.manufacturer ? ` · ${m.manufacturer}` : ''}</p>
                </td>
                <td className="p-3">{m.modalityType}</td>
                <td className="p-3">{m.roomNumber || '-'}</td>
                <td className="p-3">{m.machineModel || '-'}</td>
                <td className="p-3"><StatusBadge value={m.status} /></td>
                <td className="p-3 text-right">₹{m.price ?? 0}{m.insuranceRate ? <span className="text-[11px] text-muted-foreground"> ({m.insuranceRate}% ins)</span> : null}</td>
                <td className="p-3 text-right">{m.slotDurationMinutes || 30}m</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-center flex-wrap">
                    <span title="Requires contrast screening" className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">C {flag(m.requiresContrastScreening)}</span>
                    <span title="Requires implant check" className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">I {flag(m.requiresImplantCheck)}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(m)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                    {m.status !== 'Inactive' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive"
                        onClick={() => { if (window.confirm(`Deactivate ${m.name}? This is a soft delete.`)) deleteMut.mutate(m._id); }}>
                        <Trash2 className="w-3 h-3 mr-1" /> Deactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No modalities found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showDialog} onClose={() => setShowDialog(false)} title={editing ? 'Edit Modality' : 'Add Modality'} wide>
        <form onSubmit={onSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Name *"><Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)} placeholder="Siemens Magnetom 3T" /></Field>
            <Field label="Code *"><Input required value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('code', e.target.value.toUpperCase())} placeholder="MRI-01" /></Field>
            <Field label="Modality Type *">
              <select required value={form.modalityType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('modalityType', e.target.value)} className={selectCls}>
                {RAD_MODALITY_TYPES.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Room"><Input value={form.roomNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('roomNumber', e.target.value)} placeholder="Room 12" /></Field>
            <Field label="Machine Model"><Input value={form.machineModel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('machineModel', e.target.value)} /></Field>
            <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('manufacturer', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="DICOM AE Title"><Input value={form.dicomAETitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('dicomAETitle', e.target.value)} /></Field>
            <Field label="DICOM Port"><Input type="number" value={form.dicomPort} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('dicomPort', e.target.value)} /></Field>
            <Field label="Slot minutes"><Input type="number" min={5} max={480} value={form.slotDurationMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('slotDurationMinutes', e.target.value)} /></Field>
            <Field label="Daily capacity"><Input type="number" min={1} value={form.dailyCapacity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('dailyCapacity', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Status">
              <select value={form.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('status', e.target.value)} className={selectCls}>
                {['Available', 'In Use', 'Under Maintenance', 'Out of Service'].map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Price (₹)"><Input type="number" min={0} value={form.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('price', e.target.value)} /></Field>
            <Field label="Insurance rate (%)"><Input type="number" min={0} max={100} value={form.insuranceRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('insuranceRate', e.target.value)} /></Field>
            <Field label="Service every (days)"><Input type="number" min={1} value={form.maintenanceScheduleDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('maintenanceScheduleDays', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiresContrastScreening} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('requiresContrastScreening', e.target.checked)} className="rounded" />
              <span className="text-xs font-medium">Requires contrast screening</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiresImplantCheck} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('requiresImplantCheck', e.target.checked)} className="rounded" />
              <span className="text-xs font-medium">Requires implant check</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Working hours — open"><Input type="time" value={form.workingHoursOpen} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('workingHoursOpen', e.target.value)} /></Field>
            <Field label="Working hours — close"><Input type="time" value={form.workingHoursClose} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('workingHoursClose', e.target.value)} /></Field>
            <Field label="Assigned staff IDs" hint="Comma-separated user IDs">
              <Input value={form.assignedStaff} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('assignedStaff', e.target.value)} placeholder="id1, id2" />
            </Field>
          </div>
          <Field label="Working days">
            <div className="flex gap-1.5 flex-wrap">
              {WEEK_DAYS.map((d: string) => (
                <button key={d} type="button"
                  onClick={() => set('workingDays', form.workingDays.includes(d) ? form.workingDays.filter((x: string) => x !== d) : [...form.workingDays, d])}
                  className={`px-3 h-8 rounded-lg text-xs font-medium border ${form.workingDays.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'}`}>
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Supported studies" hint="Comma-separated, e.g. Brain, Spine, Knee MR">
            <textarea className={textareaCls} value={form.supportedStudies} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('supportedStudies', e.target.value)} />
          </Field>
          <Field label="Preparation rules" hint="Comma or newline separated">
            <textarea className={textareaCls} value={form.prepRules} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('prepRules', e.target.value)} />
          </Field>
          <Field label="Report templates" hint="Comma-separated template names">
            <textarea className={textareaCls} value={form.reportTemplates} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('reportTemplates', e.target.value)} />
          </Field>
          <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-card">
            <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMut.isPending}><Settings2 className="w-4 h-4 mr-1" />{saveMut.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Modality'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
