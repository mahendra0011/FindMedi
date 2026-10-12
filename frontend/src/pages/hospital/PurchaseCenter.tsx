import { useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileText, Link2, Loader2, PackageCheck, Plus, ReceiptText, RefreshCw, Send, Trash2, Truck } from 'lucide-react';

type TabKey = 'indents' | 'purchase-orders' | 'grn' | 'bills' | 'suppliers';
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'indents', label: 'Indents', icon: ClipboardList }, { key: 'purchase-orders', label: 'Purchase Orders', icon: FileText },
  { key: 'grn', label: 'Goods Receipt', icon: Truck }, { key: 'bills', label: 'Vendor Bills', icon: ReceiptText },
  { key: 'suppliers', label: 'Suppliers', icon: Building2 },
];
type Supplier = { _id: string; name: string; contactPerson?: string; email?: string; phone?: string; address?: string; gstNumber?: string; category?: string; onboardingStatus?: string };
type InventoryItem = { _id: string; itemName: string; category?: string; unit?: string; currentStock?: number; unitPrice?: number };
type PoLine = { inventoryItemId: string; itemName: string; category: string; quantity: number; unitPrice: number; discount: number };
type PurchaseOrder = { _id: string; poNumber: string; supplierId?: any; supplierName?: string; items: PoLine[]; grandTotal?: number; status: string; expectedDelivery?: string };
type StoreRow = { _id: string; name: string };
type IndentLine = { itemId: string; name: string; batch?: string; qty: number; issuedQty?: number };
type IndentRow = { _id: string; fromStoreId: string; toStoreId: string; items: IndentLine[]; status: string; department?: string };
type GrnLine = { itemId: string; name: string; qty: number; rate?: number };
type GrnRow = { _id: string; poId?: string; invoiceNo?: string; qcStatus: string; items: GrnLine[] };
type VendorBill = { _id: string; billNo: string; supplierId?: any; lines: any[]; grandTotal?: number; matchStatus?: string; status: string };
const TONES: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground', Cancelled: 'bg-red-500/15 text-red-600 border-red-500/20',
  Submitted: 'bg-amber-500/15 text-amber-600 border-amber-500/20', Requested: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  Pending: 'bg-amber-500/15 text-amber-600 border-amber-500/20', Short: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  Approved: 'bg-blue-500/15 text-blue-600 border-blue-500/20', Issued: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  Posted: 'bg-blue-500/15 text-blue-600 border-blue-500/20', Ordered: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/20',
  'Partially Received': 'bg-violet-500/15 text-violet-600 border-violet-500/20',
  Received: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20', Paid: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  Matched: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20', Passed: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  Excess: 'bg-orange-500/15 text-orange-600 border-orange-500/20', Rejected: 'bg-red-500/15 text-red-600 border-red-500/20',
  Unmatched: 'bg-red-500/15 text-red-600 border-red-500/20',
};
const tone = (v?: string) => TONES[v || ''] || 'bg-muted text-muted-foreground';
const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;
const supName = (ref: any) => (typeof ref === 'object' && ref ? ref.name || '' : '');
const money = (v?: number) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const cell = 'p-3';
const head = 'bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b';
const rowCls = 'hover:bg-muted/30 transition-colors';
const emptyRow = (text: string) => <p className="p-6 text-center text-xs text-muted-foreground">{text}</p>;
const badge = (value?: string) => <Badge className={`${tone(value)} text-[10px] border`}>{value || '—'}</Badge>;
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>
);
const Select = ({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder?: string; children: ReactNode }) => (
  <select className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder ? <option value="">{placeholder}</option> : null}{children}
  </select>
);
const Panel = ({ title, desc, children }: { title: ReactNode; desc?: string; children: ReactNode }) => (
  <Card className="border-border/60 shadow-sm">
    <CardHeader className="p-4 border-b">
      <CardTitle className="text-base flex items-center gap-2">{title}</CardTitle>
      {desc ? <CardDescription className="text-xs">{desc}</CardDescription> : null}
    </CardHeader>
    <CardContent className="p-0 overflow-x-auto">{children}</CardContent>
  </Card>
);
const SidePanel = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card className="border-border/60 shadow-sm h-fit">
    <CardHeader className="p-4 border-b"><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> {title}</CardTitle></CardHeader>
    <CardContent className="p-4 space-y-3">{children}</CardContent>
  </Card>
);
const Go = ({ busy, icon, label }: { busy: boolean; icon: ReactNode; label: string }) => (
  <>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon} {label}</>
);
const emptyIndent = { fromStoreId: '', toStoreId: '', itemId: '', itemName: '', batch: '', qty: '', note: '' };
const emptyPo = { supplierId: '', taxRate: '0', expectedDelivery: '', notes: '', lines: [] as PoLine[] };
const emptyGrn = { poId: '', supplierId: '', storeId: '', invoiceNo: '', qcStatus: 'Pending', items: [] as GrnLine[] };
const emptyMatch = { poNumber: '', vendorInvoiceNo: '', invoiceAmount: '', poTotalAmount: '' };
const emptySupplier = { name: '', contactPerson: '', phone: '', email: '', category: 'General', gstNumber: '', address: '' };
const SUPPLIER_CATEGORIES = ['General', 'Medical Supplies', 'Pharmaceuticals', 'Surgical Instruments', 'Equipment', 'Reagents', 'Implants', 'Linen', 'Medical Gases', 'Food', 'IT', 'OT Consumables'];

export default function PurchaseCenter() {
  const [tab, setTab] = useState<TabKey>('purchase-orders'), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]), [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]), [stores, setStores] = useState<StoreRow[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]), [indents, setIndents] = useState<IndentRow[]>([]);
  const [grns, setGrns] = useState<GrnRow[]>([]), [indentListAvailable, setIndentListAvailable] = useState(true);
  const [indentForm, setIndentForm] = useState(emptyIndent), [poForm, setPoForm] = useState(emptyPo);
  const [grnForm, setGrnForm] = useState(emptyGrn), [matchForm, setMatchForm] = useState(emptyMatch);
  const [matchResult, setMatchResult] = useState<any>(null), [supplierForm, setSupplierForm] = useState(emptySupplier);
  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try { await fn(); } catch (err: any) { toast.error(errMsg(err, fallback)); } finally { setBusy(false); }
  };
  const loadAll = async () => {
    setLoading(true);
    let failed = 0;
    await Promise.all([
      api.get('/inventory/purchase-orders').then((r: any) => setOrders(r?.orders || [])).catch(() => { failed += 1; }),
      api.get('/inventory/suppliers').then((r: any) => setSuppliers(r?.suppliers || [])).catch(() => { failed += 1; }),
      api.get('/inventory/items').then((r: any) => setItems(r?.items || [])).catch(() => { failed += 1; }),
      api.get('/finance/vendor-bills').then((r: any) => setBills(r?.bills || [])).catch(() => { failed += 1; }),
      api.get('/stores/stores').then((r: any) => setStores(r?.stores || [])).catch(() => { failed += 1; }),
      api.get('/stores/indents').then((r: any) => { setIndents(Array.isArray(r) ? r : r?.indents || r?.rows || []); setIndentListAvailable(true); })
        .catch(() => setIndentListAvailable(false)),
    ]);
    setLoading(false);
    if (failed) toast.error('Some procurement data could not be loaded');
  };
  useEffect(() => { loadAll(); }, []);
  const createIndent = async () => {
    if (!indentForm.fromStoreId || !indentForm.toStoreId) return toast.error('Select source and destination stores');
    if (!indentForm.itemId && !indentForm.itemName.trim()) return toast.error('Pick or type an item');
    if (!(Number(indentForm.qty) > 0)) return toast.error('Quantity must be greater than zero');
    await run(async () => {
      const line = { itemId: indentForm.itemId, name: indentForm.itemName, batch: indentForm.batch, qty: Number(indentForm.qty) };
      const res: any = await api.post('/stores/indents', { fromStoreId: indentForm.fromStoreId, toStoreId: indentForm.toStoreId, items: [line], notes: indentForm.note });
      setIndents((prev) => [{ _id: res?.id || `local-${Date.now()}`, fromStoreId: indentForm.fromStoreId, toStoreId: indentForm.toStoreId, items: [{ ...line, issuedQty: 0 }], status: res?.status || 'Requested', department: indentForm.note }, ...prev]);
      setIndentForm(emptyIndent);
      toast.success('Indent raised');
    }, 'Failed to raise indent');
  };
  const indentAction = async (id: string, action: 'issue' | 'receive') => {
    await run(async () => {
      const res: any = await api.post(`/stores/indents/${id}/${action}`);
      setIndents((prev) => prev.map((r) => (r._id === id ? { ...r, status: res?.status || (action === 'issue' ? 'Issued' : 'Received') } : r)));
      toast.success(action === 'issue' ? 'Indent issued from source store' : 'Indent received at destination');
    }, 'Indent update failed');
  };
  const setPoLine = (i: number, patch: Partial<PoLine>) => setPoForm((prev) => ({ ...prev, lines: prev.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const dropPoLine = (i: number) => setPoForm((prev) => ({ ...prev, lines: prev.lines.filter((_, k) => k !== i) }));
  const pickPoItem = (i: number, itemId: string) => {
    const it = items.find((x) => x._id === itemId);
    setPoLine(i, { inventoryItemId: itemId, itemName: it?.itemName || '', category: it?.category || 'Others', unitPrice: Number(it?.unitPrice) || 0 });
  };
  const createPo = async () => {
    const lines = poForm.lines.filter((l) => l.itemName.trim() && Number(l.quantity) > 0);
    if (!poForm.supplierId) return toast.error('Select a supplier');
    if (!lines.length) return toast.error('Add at least one item line with a quantity');
    const supplier = suppliers.find((s) => String(s._id) === poForm.supplierId);
    if (supplier?.onboardingStatus && supplier.onboardingStatus !== 'Approved') return toast.error(`Supplier is ${supplier.onboardingStatus} — approval required before ordering`);
    await run(async () => {
      const body: any = {
        supplierId: poForm.supplierId, supplierName: supplier?.name || '', taxRate: Number(poForm.taxRate) || 0, notes: poForm.notes,
        items: lines.map((l) => ({ inventoryItemId: l.inventoryItemId || undefined, itemName: l.itemName, category: l.category || 'Others', quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0, discount: Number(l.discount) || 0 })),
      };
      if (poForm.expectedDelivery) body.expectedDelivery = poForm.expectedDelivery;
      const res: any = await api.post('/inventory/purchase-orders', body);
      const warnings = res?.rateWarnings || [];
      if (warnings.length) toast.warning(`${warnings.length} line(s) above contract rate — review ${res?.poNumber || 'the PO'}`);
      else toast.success(`PO ${res?.poNumber || ''} created`);
      setPoForm(emptyPo);
      loadAll();
    }, 'Failed to create purchase order');
  };
  const advancePo = async (po: PurchaseOrder) => {
    const target = ({ Draft: 'Submitted', Submitted: 'Approved', Approved: 'Ordered' } as Record<string, string>)[po.status];
    if (!target) return;
    await run(async () => {
      await api.put(`/inventory/purchase-orders/${po._id}/status`, { status: target });
      setOrders((prev) => prev.map((r) => (r._id === po._id ? { ...r, status: target } : r)));
      toast.success(`${po.poNumber} → ${target}`);
    }, 'Status update failed');
  };
  const receivePo = async (po: PurchaseOrder) => {
    await run(async () => {
      await api.put(`/inventory/purchase-orders/${po._id}/receive`, { receivedNotes: 'Received via Purchase Center' });
      setOrders((prev) => prev.map((r) => (r._id === po._id ? { ...r, status: 'Received' } : r)));
      toast.success(`${po.poNumber} received — stock updated`);
    }, 'Receipt failed');
  };
  const pickGrnPo = (poId: string) => {
    const po = orders.find((o) => o._id === poId);
    if (!po) return setGrnForm((prev) => ({ ...prev, poId: '', supplierId: '' }));
    setGrnForm((prev) => ({
      ...prev, poId,
      supplierId: typeof po.supplierId === 'object' && po.supplierId ? po.supplierId._id : po.supplierId || '',
      items: (po.items || []).map((l) => ({ itemId: l.inventoryItemId || '', name: l.itemName, qty: Number(l.quantity) || 0, rate: Number(l.unitPrice) || 0 })),
    }));
    setMatchForm((prev) => ({ ...prev, poNumber: po.poNumber, poTotalAmount: String(po.grandTotal || 0) }));
  };
  const setGrnItem = (i: number, patch: Partial<GrnLine>) => setGrnForm((prev) => ({ ...prev, items: prev.items.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const pickGrnItem = (i: number, itemId: string) => setGrnItem(i, { itemId, name: items.find((x) => x._id === itemId)?.itemName || '' });
  const createGrn = async () => {
    const lines = grnForm.items.filter((l) => l.name.trim() && Number(l.qty) >= 0);
    if (!lines.length) return toast.error('Add at least one received item line');
    await run(async () => {
      const res: any = await api.post('/stores/grn', {
        poId: grnForm.poId || undefined, supplierId: grnForm.supplierId || undefined, storeId: grnForm.storeId || undefined,
        invoiceNo: grnForm.invoiceNo, qcStatus: grnForm.qcStatus,
        items: lines.map((l) => ({ itemId: l.itemId, name: l.name, qty: Number(l.qty) || 0, rate: Number(l.rate) || 0 })),
      });
      setGrns((prev) => [{ _id: res?.id || `local-${Date.now()}`, poId: grnForm.poId, invoiceNo: grnForm.invoiceNo, qcStatus: res?.qcStatus || grnForm.qcStatus, items: lines.map((l) => ({ itemId: l.itemId, name: l.name, qty: Number(l.qty) || 0 })) }, ...prev]);
      setGrnForm({ ...emptyGrn, storeId: grnForm.storeId });
      toast.success('Goods receipt recorded');
    }, 'GRN failed');
  };
  const runMatch = async () => {
    if (!matchForm.poNumber.trim() || !(Number(matchForm.invoiceAmount) > 0)) return toast.error('PO number and invoice amount are required');
    await run(async () => {
      const expected = Number(matchForm.poTotalAmount) || Number(matchForm.invoiceAmount);
      const res: any = await api.post('/stores/three-way-match', {
        poNumber: matchForm.poNumber, vendorInvoiceNo: matchForm.vendorInvoiceNo,
        invoiceAmount: Number(matchForm.invoiceAmount), poTotalAmount: expected,
      });
      setMatchResult(res);
      if (res?.matchStatus === 'MATCHED_AND_VERIFIED') toast.success('3-way match verified');
      else toast.warning('Variance flagged for audit');
    }, 'Three-way match failed');
  };
  const postBill = async (bill: VendorBill) => {
    await run(async () => {
      await api.post(`/finance/vendor-bills/${bill._id}/post`);
      setBills((prev) => prev.map((r) => (r._id === bill._id ? { ...r, status: 'Posted' } : r)));
      toast.success(`Bill ${bill.billNo} posted to ledger`);
    }, 'Posting failed');
  };
  const createSupplier = async () => {
    if (!supplierForm.name.trim()) return toast.error('Supplier name is required');
    if (!supplierForm.phone.trim()) return toast.error('Phone is required');
    await run(async () => {
      await api.post('/inventory/suppliers', {
        name: supplierForm.name, contactPerson: supplierForm.contactPerson, phone: supplierForm.phone,
        email: supplierForm.email || undefined, category: supplierForm.category, gstNumber: supplierForm.gstNumber, address: supplierForm.address,
      });
      setSupplierForm(emptySupplier);
      toast.success('Supplier added — onboarding starts as Pending');
      loadAll();
    }, 'Failed to add supplier');
  };
  const pendingGRNs = orders.filter((o) => ['Approved', 'Ordered', 'Partially Received'].includes(o.status)).length;
  const unpaidBills = bills.filter((b) => b.status === 'Draft' || b.status === 'Posted').length;
  const eligiblePOs = orders.filter((o) => o.status !== 'Cancelled');
  const storeName = (id: string) => stores.find((s) => s._id === id)?.name || '—';
  const supLabel = (po: PurchaseOrder) => po.supplierName || supName(po.supplierId);
  const KPIS = [
    { label: 'Total POs', value: orders.length, icon: FileText, tint: 'bg-indigo-500/10 text-indigo-600' },
    { label: 'Pending GRNs', value: pendingGRNs, icon: Truck, tint: 'bg-amber-500/10 text-amber-600' },
    { label: 'Unpaid Vendor Bills', value: unpaidBills, icon: ReceiptText, tint: 'bg-rose-500/10 text-rose-600' },
    { label: 'Active Suppliers', value: suppliers.length, icon: Building2, tint: 'bg-emerald-500/10 text-emerald-600' },
  ];
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2"><PackageCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> Procurement & Purchase Center</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Indent → PO → GRN → Bill</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Store indents, purchase orders, goods receipts with three-way matching, and vendor payables.</p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading} className="flex items-center gap-2"><Go busy={loading} icon={<RefreshCw className="h-4 w-4" />} label="Refresh" /></Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${k.tint}`}><k.icon className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">{k.label}</p><p className="text-xl font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key)} className="flex items-center gap-1.5"><Icon size={14} /> {label}</Button>
        ))}
      </div>
      {tab === 'indents' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel title={<><ClipboardList className="h-4 w-4 text-indigo-600" /> Store Indents ({indents.length})</>}
            desc="Requested → Issued → Received. Issue posts stock out of the source store and in to the destination.">
            {!indentListAvailable ? emptyRow('Indent listing is unavailable (no GET endpoint) — indents raised in this session appear here.')
              : indents.length === 0 ? emptyRow('No indents yet. Raise the first one from the form.') : (
              <table className="w-full text-xs text-left">
                <thead className={head}><tr><th className={cell}>Items</th><th className={cell}>Stores</th><th className={cell}>Status</th><th className={`${cell} text-right`}>Actions</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {indents.map((row) => (
                    <tr key={row._id} className={rowCls}>
                      <td className={cell}>
                        <div className="flex flex-wrap gap-1">{row.items?.map((it, idx) => <Badge key={idx} variant="outline" className="text-[10px]">{it.name || it.itemId} × {it.qty}</Badge>)}</div>
                        {row.department ? <p className="text-[11px] text-muted-foreground mt-1">{row.department}</p> : null}
                      </td>
                      <td className={`${cell} text-muted-foreground`}>{storeName(row.fromStoreId)} → {storeName(row.toStoreId)}</td>
                      <td className={cell}>{badge(row.status)}</td>
                      <td className={`${cell} text-right`}>
                        {row.status === 'Requested' && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => indentAction(row._id, 'issue')}>Issue</Button>}
                        {row.status === 'Issued' && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={() => indentAction(row._id, 'receive')}>Receive</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <SidePanel title="Raise Indent">
            <Field label="Source store *"><Select value={indentForm.fromStoreId} onChange={(v) => setIndentForm({ ...indentForm, fromStoreId: v })} placeholder="Select store">{stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select></Field>
            <Field label="Destination store *"><Select value={indentForm.toStoreId} onChange={(v) => setIndentForm({ ...indentForm, toStoreId: v })} placeholder="Select store">{stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select></Field>
            <Field label="Item *">
              {items.length ? (
                <Select value={indentForm.itemId} onChange={(v) => setIndentForm({ ...indentForm, itemId: v, itemName: items.find((it) => it._id === v)?.itemName || '' })} placeholder="Select item">
                  {items.map((it) => <option key={it._id} value={it._id}>{it.itemName} ({it.currentStock ?? 0} {it.unit || 'Pcs'})</option>)}
                </Select>
              ) : <Input placeholder="Item name" value={indentForm.itemName} onChange={(e) => setIndentForm({ ...indentForm, itemName: e.target.value })} />}
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Qty *"><Input type="number" min={1} placeholder="0" value={indentForm.qty} onChange={(e) => setIndentForm({ ...indentForm, qty: e.target.value })} /></Field>
              <Field label="Batch"><Input placeholder="Batch no" value={indentForm.batch} onChange={(e) => setIndentForm({ ...indentForm, batch: e.target.value })} /></Field>
            </div>
            <Field label="Department / note"><Input placeholder="e.g. ICU emergency restock" value={indentForm.note} onChange={(e) => setIndentForm({ ...indentForm, note: e.target.value })} /></Field>
            <Button className="w-full" onClick={createIndent} disabled={busy}><Go busy={busy} icon={<Send className="h-4 w-4" />} label="Raise Indent" /></Button>
            {!stores.length ? <p className="text-[11px] text-muted-foreground">No stores returned — create a store first.</p> : null}
          </SidePanel>
        </div>
      )}
      {tab === 'purchase-orders' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel title={<><FileText className="h-4 w-4 text-indigo-600" /> Purchase Orders ({orders.length})</>}
            desc="Draft → Submitted → Approved → Ordered → Received. Receiving increments inventory stock.">
            {orders.length === 0 ? emptyRow('No purchase orders yet.') : (
              <table className="w-full text-xs text-left">
                <thead className={head}><tr><th className={cell}>PO</th><th className={cell}>Supplier</th><th className={cell}>Lines</th><th className={cell}>Total</th><th className={cell}>Status</th><th className={`${cell} text-right`}>Actions</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((po) => (
                    <tr key={po._id} className={rowCls}>
                      <td className={`${cell} font-mono font-bold text-indigo-600 dark:text-indigo-400`}>{po.poNumber}</td>
                      <td className={cell}>
                        <p className="font-semibold text-foreground">{supLabel(po)}</p>
                        <p className="text-[11px] text-muted-foreground">{po.expectedDelivery ? `ETA ${String(po.expectedDelivery).slice(0, 10)}` : 'No ETA'}</p>
                      </td>
                      <td className={cell}>
                        <div className="flex flex-wrap gap-1">
                          {(po.items || []).slice(0, 3).map((l, i) => <Badge key={i} variant="outline" className="text-[10px]">{l.itemName} × {l.quantity}</Badge>)}
                          {(po.items || []).length > 3 ? <span className="text-[10px] text-muted-foreground">+{(po.items || []).length - 3}</span> : null}
                        </div>
                      </td>
                      <td className={`${cell} font-semibold`}>{money(po.grandTotal)}</td>
                      <td className={cell}>{badge(po.status)}</td>
                      <td className={`${cell} text-right`}>
                        <div className="flex justify-end gap-1">
                          {['Draft', 'Submitted', 'Approved'].includes(po.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => advancePo(po)}>
                              {po.status === 'Draft' ? 'Mark Sent' : po.status === 'Submitted' ? 'Approve' : 'Mark Ordered'}
                            </Button>
                          )}
                          {['Ordered', 'Partially Received'].includes(po.status) && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={() => receivePo(po)}>Receive</Button>}
                          {po.status === 'Received' && <span className="text-[11px] text-emerald-600">Received</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <SidePanel title="New Purchase Order">
            <Field label="Supplier *"><Select value={poForm.supplierId} onChange={(v) => setPoForm({ ...poForm, supplierId: v })} placeholder="Select supplier">
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}{s.onboardingStatus ? ` · ${s.onboardingStatus}` : ''}</option>)}</Select></Field>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Item lines *</span>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setPoForm((prev) => ({ ...prev, lines: [...prev.lines, { inventoryItemId: '', itemName: '', category: 'Others', quantity: 1, unitPrice: 0, discount: 0 }] }))}><Plus size={12} /> Add line</Button>
              </div>
              {!poForm.lines.length ? <p className="text-[11px] text-muted-foreground">No lines yet.</p> : null}
              {poForm.lines.map((line, index) => (
                <div key={index} className="space-y-1 rounded-md border p-2">
                  <div className="flex gap-1">
                    {items.length ? (
                      <select className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs" value={line.inventoryItemId} onChange={(e) => pickPoItem(index, e.target.value)}>
                        <option value="">Select item</option>{items.map((it) => <option key={it._id} value={it._id}>{it.itemName}</option>)}
                      </select>
                    ) : <Input className="flex-1 h-7 text-xs" placeholder="Item name" value={line.itemName} onChange={(e) => setPoLine(index, { itemName: e.target.value })} />}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => dropPoLine(index)}><Trash2 size={13} /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Input className="h-7 text-xs" type="number" min={1} placeholder="Qty" value={line.quantity} onChange={(e) => setPoLine(index, { quantity: Number(e.target.value) })} />
                    <Input className="h-7 text-xs" type="number" min={0} placeholder="Rate" value={line.unitPrice} onChange={(e) => setPoLine(index, { unitPrice: Number(e.target.value) })} />
                    <Input className="h-7 text-xs" type="number" min={0} placeholder="Disc" value={line.discount} onChange={(e) => setPoLine(index, { discount: Number(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tax rate %"><Input type="number" min={0} value={poForm.taxRate} onChange={(e) => setPoForm({ ...poForm, taxRate: e.target.value })} /></Field>
              <Field label="Expected delivery"><Input type="date" value={poForm.expectedDelivery} onChange={(e) => setPoForm({ ...poForm, expectedDelivery: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Input placeholder="Delivery instructions" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} /></Field>
            <Button className="w-full" onClick={createPo} disabled={busy}><Go busy={busy} icon={<Send className="h-4 w-4" />} label="Create PO" /></Button>
            <p className="text-[11px] text-muted-foreground">Only Approved suppliers can be ordered against.</p>
          </SidePanel>
        </div>
      )}
      {tab === 'grn' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel title={<><Truck className="h-4 w-4 text-indigo-600" /> Goods Receipt Note</>}
            desc="Stock posts to the selected store only when QC status is Passed.">
            <div className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Purchase order"><Select value={grnForm.poId} onChange={pickGrnPo} placeholder="Free GRN (no PO)">{eligiblePOs.map((po) => <option key={po._id} value={po._id}>{po.poNumber} · {supLabel(po)} · {po.status}</option>)}</Select></Field>
                <Field label="Store"><Select value={grnForm.storeId} onChange={(v) => setGrnForm({ ...grnForm, storeId: v })} placeholder="No store posting">{stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select></Field>
                <Field label="Vendor invoice no"><Input placeholder="Invoice number" value={grnForm.invoiceNo} onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })} /></Field>
                <Field label="QC status"><Select value={grnForm.qcStatus} onChange={(v) => setGrnForm({ ...grnForm, qcStatus: v })}><option>Pending</option><option>Passed</option><option>Rejected</option></Select></Field>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Received lines *</span>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setGrnForm((prev) => ({ ...prev, items: [...prev.items, { itemId: '', name: '', qty: 1, rate: 0 }] }))}><Plus size={12} /> Add line</Button>
                </div>
                {!grnForm.items.length ? <p className="text-[11px] text-muted-foreground">Select a PO to prefill ordered lines, or add lines manually.</p> : null}
                {grnForm.items.map((line, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                    {items.length ? (
                      <select className="min-w-[160px] flex-1 rounded-md border bg-background px-2 py-1.5 text-xs" value={line.itemId} onChange={(e) => pickGrnItem(index, e.target.value)}>
                        <option value="">Select item</option>{items.map((it) => <option key={it._id} value={it._id}>{it.itemName}</option>)}
                      </select>
                    ) : <Input className="min-w-[160px] flex-1 h-7 text-xs" placeholder="Item name" value={line.name} onChange={(e) => setGrnItem(index, { name: e.target.value })} />}
                    <Input className="w-20 h-7 text-xs" type="number" min={0} placeholder="Qty" value={line.qty} onChange={(e) => setGrnItem(index, { qty: Number(e.target.value) })} />
                    <Input className="w-20 h-7 text-xs" type="number" min={0} placeholder="Rate" value={line.rate} onChange={(e) => setGrnItem(index, { rate: Number(e.target.value) })} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setGrnForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}><Trash2 size={13} /></Button>
                  </div>
                ))}
              </div>
              <Button onClick={createGrn} disabled={busy}><Go busy={busy} icon={<PackageCheck className="h-4 w-4" />} label="Record GRN" /></Button>
              {grns.length ? (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Receipts this session ({grns.length})</span>
                  {grns.slice(0, 5).map((g) => (
                    <div key={g._id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                      <span className="font-mono truncate">{String(g._id).slice(-6)} · {g.invoiceNo || 'no invoice'} · {g.items?.length || 0} line(s)</span>{badge(g.qcStatus)}
                    </div>
                  ))}
                </div>
              ) : <p className="text-[11px] text-muted-foreground">No GRN list endpoint — receipts raised this session appear here.</p>}
            </div>
          </Panel>
          <SidePanel title="Three-Way Match">
            <p className="text-xs text-muted-foreground">PO ↔ GRN ↔ vendor invoice. Tolerance 1%.</p>
            <Field label="PO number *"><Input placeholder="PO-20261012..." value={matchForm.poNumber} onChange={(e) => setMatchForm({ ...matchForm, poNumber: e.target.value })} /></Field>
            <Field label="Vendor invoice no"><Input placeholder="Invoice number" value={matchForm.vendorInvoiceNo} onChange={(e) => setMatchForm({ ...matchForm, vendorInvoiceNo: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Invoiced amount *"><Input type="number" min={0} placeholder="0" value={matchForm.invoiceAmount} onChange={(e) => setMatchForm({ ...matchForm, invoiceAmount: e.target.value })} /></Field>
              <Field label="PO amount"><Input type="number" min={0} placeholder="0" value={matchForm.poTotalAmount} onChange={(e) => setMatchForm({ ...matchForm, poTotalAmount: e.target.value })} /></Field>
            </div>
            <Button className="w-full" variant="outline" onClick={runMatch} disabled={busy}><Go busy={busy} icon={<Link2 className="h-4 w-4" />} label="Run Match" /></Button>
            {matchResult ? (
              <div className="space-y-1 rounded-md border p-2 text-xs">
                <p className="flex items-center gap-1 font-semibold">
                  {matchResult.matchStatus === 'MATCHED_AND_VERIFIED' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}{matchResult.matchStatus}
                </p>
                <p className="text-muted-foreground">Expected {money(matchResult.expectedPoAmount)} · Invoiced {money(matchResult.actualInvoicedAmount)}</p>
                <p className="text-muted-foreground">Variance {money(matchResult.priceVariance)} ({matchResult.variancePercentage}%)</p>
                <p className="text-muted-foreground">GRN: {matchResult.grnRecord ? `${matchResult.grnRecord.qcStatus} · ${matchResult.grnRecord.receivedItemsCount} line(s)` : 'not found'}</p>
              </div>
            ) : null}
          </SidePanel>
        </div>
      )}
      {tab === 'bills' && (
        <Panel title={<><ReceiptText className="h-4 w-4 text-indigo-600" /> Vendor Bills ({bills.length})</>}
          desc="Draft bills accrue on post; unmatched lines never reach the ledger.">
          {bills.length === 0 ? emptyRow('No vendor bills booked yet.') : (
            <table className="w-full text-xs text-left">
              <thead className={head}><tr><th className={cell}>Bill</th><th className={cell}>Supplier</th><th className={cell}>Grand Total</th><th className={cell}>Match</th><th className={cell}>Status</th><th className={`${cell} text-right`}>Actions</th></tr></thead>
              <tbody className="divide-y divide-border/60">
                {bills.map((bill) => (
                  <tr key={bill._id} className={rowCls}>
                    <td className={`${cell} font-mono font-bold`}>{bill.billNo}</td>
                    <td className={cell}>{supName(bill.supplierId) || '—'}</td>
                    <td className={`${cell} font-semibold`}>{money(bill.grandTotal)}</td>
                    <td className={cell}>{badge(bill.matchStatus)}</td>
                    <td className={cell}>{badge(bill.status)}</td>
                    <td className={`${cell} text-right`}>
                      {bill.status === 'Draft'
                        ? <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={() => postBill(bill)}>Post</Button>
                        : <span className="text-[11px] text-muted-foreground">{bill.status === 'Paid' ? 'Settled' : 'Accrued'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
      {tab === 'suppliers' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel title={<><Building2 className="h-4 w-4 text-indigo-600" /> Suppliers ({suppliers.length})</>}
            desc="New vendors land as Pending and must be approved before they can receive a PO.">
            {suppliers.length === 0 ? emptyRow('No active suppliers.') : (
              <table className="w-full text-xs text-left">
                <thead className={head}><tr><th className={cell}>Supplier</th><th className={cell}>Contact</th><th className={cell}>GSTIN</th><th className={cell}>Category</th><th className={cell}>Onboarding</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {suppliers.map((s) => (
                    <tr key={s._id} className={rowCls}>
                      <td className={cell}>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.contactPerson || '—'}</p>
                      </td>
                      <td className={`${cell} text-muted-foreground`}>{s.phone || '—'}{s.email ? <><br />{s.email}</> : null}</td>
                      <td className={`${cell} font-mono text-muted-foreground`}>{s.gstNumber || '—'}</td>
                      <td className={cell}>{s.category || 'General'}</td>
                      <td className={cell}>{badge(s.onboardingStatus || 'Approved')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <SidePanel title="Add Supplier">
            <Field label="Name *"><Input placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Contact person"><Input placeholder="Name" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} /></Field>
              <Field label="Phone *"><Input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></Field>
            </div>
            <Field label="Email"><Input type="email" placeholder="billing@vendor.com" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category"><Select value={supplierForm.category} onChange={(v) => setSupplierForm({ ...supplierForm, category: v })}>{SUPPLIER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="GSTIN"><Input placeholder="22AAAAA0000A1Z5" value={supplierForm.gstNumber} onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })} /></Field>
            </div>
            <Field label="Address"><Input placeholder="City / state" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} /></Field>
            <Button className="w-full" onClick={createSupplier} disabled={busy}><Go busy={busy} icon={<Plus className="h-4 w-4" />} label="Add Supplier" /></Button>
            <p className="text-[11px] text-muted-foreground">GSTIN is format-validated on save when provided.</p>
          </SidePanel>
        </div>
      )}
    </div>
  );
}
