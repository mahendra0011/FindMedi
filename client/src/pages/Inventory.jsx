import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Package, CheckCircle, AlertTriangle, Truck, FileText, ShoppingCart, ArrowRight, AlertOctagon, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const invApi = {
  getItems: (p) => api.dispatch(() => Promise.resolve({ items: [] }), '/inventory?' + new URLSearchParams(p)),
  createItem: (b) => api.dispatch(() => Promise.resolve({}), '/inventory', { method: 'POST', body: JSON.stringify(b) }),
  addStock: (id, b) => api.dispatch(() => Promise.resolve({}), `/inventory/${id}/stock`, { method: 'PUT', body: JSON.stringify(b) }),
  issueItem: (id, b) => api.dispatch(() => Promise.resolve({}), `/inventory/${id}/issue`, { method: 'PUT', body: JSON.stringify(b) }),
  createPR: (b) => api.dispatch(() => Promise.resolve({}), '/inventory/pr', { method: 'POST', body: JSON.stringify(b) }),
  createPO: (b) => api.dispatch(() => Promise.resolve({}), '/inventory/po', { method: 'POST', body: JSON.stringify(b) }),
  receiveGRN: (id, b) => api.dispatch(() => Promise.resolve({}), `/inventory/po/${id}/receive`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, lowStock: 0, expiring: 0, deadStock: 0 }), '/inventory/stats'),
};

export default function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('items');
  const [expandedId, setExpandedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showIssue, setShowIssue] = useState(null);
  const [issueData, setIssueData] = useState({ department: '', quantity: '1', issuedTo: '', purpose: '' });
  const [showPR, setShowPR] = useState(false);
  const [prData, setPrData] = useState({ itemName: '', quantity: '1', urgency: 'Routine', reason: '' });
  const [showPO, setShowPO] = useState(false);
  const [poData, setPoData] = useState({ supplier: '', itemName: '', quantity: '1', unitPrice: '', expectedDate: '' });
  const [showGRN, setShowGRN] = useState(null);
  const [grnData, setGrnData] = useState({ receivedQty: '0', condition: 'Good', batchNo: '', expiryDate: '' });
  const [newItem, setNewItem] = useState({ itemName: '', category: 'Consumable', unit: 'Pieces', currentStock: '0', minStockLevel: '10', unitPrice: '', supplier: '', location: '' });

  const { data } = useQuery({ queryKey: ['inventory', search], queryFn: () => invApi.getItems({ search }) });
  const { data: stats } = useQuery({ queryKey: ['inv-stats'], queryFn: invApi.getStats });
  const items = data?.items || [];

  const createMut = useMutation({ mutationFn: invApi.createItem, onSuccess: () => { qc.invalidateQueries(['inventory']); setShowAdd(false); } });
  const stockMut = useMutation({ mutationFn: ({ id, ...b }) => invApi.addStock(id, b), onSuccess: () => qc.invalidateQueries(['inventory']) });
  const issueMut = useMutation({ mutationFn: ({ id, ...b }) => invApi.issueItem(id, b), onSuccess: () => { qc.invalidateQueries(['inventory']); setShowIssue(null); } });
  const prMut = useMutation({ mutationFn: invApi.createPR, onSuccess: () => { qc.invalidateQueries(['inventory']); setShowPR(false); } });
  const poMut = useMutation({ mutationFn: invApi.createPO, onSuccess: () => { qc.invalidateQueries(['inventory']); setShowPO(false); } });
  const grnMut = useMutation({ mutationFn: ({ id, ...b }) => invApi.receiveGRN(id, b), onSuccess: () => { qc.invalidateQueries(['inventory']); setShowGRN(null); } });

  const isLowStock = (item) => item.currentStock <= item.minStockLevel;
  const isExpiring = (item) => item.expiryDate && new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isDeadStock = (item) => item.lastIssued && new Date(item.lastIssued) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory & Store</h1>
        <p className="page-subtitle">{stats?.total || 0} items · {stats?.lowStock || 0} low stock · {stats?.expiring || 0} expiring soon</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Total Items', v: stats?.total || 0, c: 'text-foreground', ic: Package },
          { l: 'Low Stock', v: stats?.lowStock || 0, c: 'text-warning', ic: AlertTriangle },
          { l: 'Expiring Soon', v: stats?.expiring || 0, c: 'text-destructive', ic: AlertOctagon },
          { l: 'Dead Stock', v: stats?.deadStock || 0, c: 'text-muted-foreground', ic: ClipboardList },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <s.ic className={`w-5 h-5 mx-auto mb-1 ${s.c}`} />
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {['items', 'purchase'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'items' ? 'Inventory Items' : 'Purchase Management'}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search items..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item._id} className={`bg-card rounded-xl border p-4 ${isLowStock(item) ? 'border-warning/50 ring-1 ring-warning/20' : isExpiring(item) ? 'border-destructive/30' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-heading font-semibold text-foreground">{item.itemName}</span>
                  </div>
                  <div className="flex gap-1">
                    {isLowStock(item) && <AlertTriangle className="w-4 h-4 text-warning" title="Low Stock" />}
                    {isExpiring(item) && <AlertOctagon className="w-4 h-4 text-destructive" title="Expiring Soon" />}
                    {isDeadStock(item) && <Clock className="w-4 h-4 text-muted-foreground" title="Dead Stock" />}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Stock</span>
                    <span className={`font-medium ${isLowStock(item) ? 'text-warning' : 'text-foreground'}`}>{item.currentStock} {item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Level</span>
                    <span className="font-medium">{item.minStockLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="font-medium">{item.category}</span>
                  </div>
                  {item.unitPrice && <div className="flex justify-between"><span>Unit Price</span><span className="font-medium">₹{item.unitPrice}</span></div>}
                  {item.supplier && <div className="flex justify-between"><span>Supplier</span><span className="font-medium">{item.supplier}</span></div>}
                  {item.expiryDate && <div className="flex justify-between"><span>Expiry</span><span className={`font-medium ${isExpiring(item) ? 'text-destructive' : ''}`}>{new Date(item.expiryDate).toLocaleDateString()}</span></div>}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    const qty = prompt('Add stock quantity:', '10');
                    if (qty) stockMut.mutate({ id: item._id, quantity: parseInt(qty), batchNo: prompt('Batch/Lot no:') || '', expiryDate: prompt('Expiry date (YYYY-MM-DD):') || '' });
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> Add Stock
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    setIssueData({ department: '', quantity: '1', issuedTo: '', purpose: '' });
                    setShowIssue(item);
                  }}>
                    <ArrowRight className="w-3 h-3 mr-1" /> Issue
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'purchase' && (
        <div className="space-y-4">
          <div className="flex gap-3 mb-6">
            <Button onClick={() => setShowPR(true)}><ShoppingCart className="w-4 h-4 mr-1" /> Purchase Request</Button>
            <Button onClick={() => setShowPO(true)} variant="outline"><Truck className="w-4 h-4 mr-1" /> Purchase Order</Button>
          </div>
          <div className="text-center py-20 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>Purchase Request and Order management</p>
            <p className="text-sm">Create PR → Approve → Convert to PO → Receive via GRN</p>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowIssue(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Issue Item</h3>
            <p className="text-sm text-muted-foreground mb-4">{showIssue.itemName} · Available: {showIssue.currentStock} {showIssue.unit}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <select value={issueData.department} onChange={e => setIssueData(d => ({ ...d, department: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Select...</option>
                  {['Cardiology', 'Neurology', 'Orthopedics', 'ICU', 'Emergency', 'OT', 'Lab', 'Pharmacy', 'General Ward'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Quantity</label><Input type="number" value={issueData.quantity} onChange={e => setIssueData(d => ({ ...d, quantity: e.target.value }))} max={showIssue.currentStock} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Issued To</label><Input value={issueData.issuedTo} onChange={e => setIssueData(d => ({ ...d, issuedTo: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Purpose</label>
                <textarea value={issueData.purpose} onChange={e => setIssueData(d => ({ ...d, purpose: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <Button className="w-full" onClick={() => issueMut.mutate({ id: showIssue._id, ...issueData })} disabled={parseInt(issueData.quantity) > showIssue.currentStock}>
                Issue Item (FIFO)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PR Modal */}
      {showPR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPR(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Purchase Request</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Item Name</label><Input value={prData.itemName} onChange={e => setPrData(d => ({ ...d, itemName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Quantity</label><Input type="number" value={prData.quantity} onChange={e => setPrData(d => ({ ...d, quantity: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Urgency</label>
                  <select value={prData.urgency} onChange={e => setPrData(d => ({ ...d, urgency: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Routine</option><option>Urgent</option><option>Emergency</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                <textarea value={prData.reason} onChange={e => setPrData(d => ({ ...d, reason: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <Button className="w-full" onClick={() => prMut.mutate(prData)}>Submit PR</Button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPO(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Purchase Order</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Supplier</label><Input value={poData.supplier} onChange={e => setPoData(d => ({ ...d, supplier: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Item Name</label><Input value={poData.itemName} onChange={e => setPoData(d => ({ ...d, itemName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Quantity</label><Input type="number" value={poData.quantity} onChange={e => setPoData(d => ({ ...d, quantity: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Unit Price (₹)</label><Input type="number" value={poData.unitPrice} onChange={e => setPoData(d => ({ ...d, unitPrice: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Expected Date</label><Input type="date" value={poData.expectedDate} onChange={e => setPoData(d => ({ ...d, expectedDate: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => poMut.mutate(poData)}>Create PO</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Add Inventory Item</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Item Name *</label><Input value={newItem.itemName} onChange={e => setNewItem({ ...newItem, itemName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Category</label>
                <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {['Consumable', 'Medicine', 'Equipment', 'Instrument', 'Stationery', 'Cleaning', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Unit</label>
                <select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {['Pieces', 'Box', 'Bottle', 'Strip', 'Packet', 'Kg', 'Liter', 'Pair'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Initial Stock</label><Input type="number" value={newItem.currentStock} onChange={e => setNewItem({ ...newItem, currentStock: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Min Stock Level</label><Input type="number" value={newItem.minStockLevel} onChange={e => setNewItem({ ...newItem, minStockLevel: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Unit Price (₹)</label><Input type="number" value={newItem.unitPrice} onChange={e => setNewItem({ ...newItem, unitPrice: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Supplier</label><Input value={newItem.supplier} onChange={e => setNewItem({ ...newItem, supplier: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Storage Location</label><Input value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} placeholder="e.g. Shelf A-12" /></div>
            </div>
            <Button className="w-full mt-6" onClick={() => createMut.mutate(newItem)} disabled={createMut.isPending || !newItem.itemName}>Add Item</Button>
          </div>
        </div>
      )}
    </div>
  );
}