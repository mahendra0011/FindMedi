import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { Calculator, Package, Layers, Plus, Trash2, Receipt } from 'lucide-react';

const BED_CATEGORIES = [
  { key: 'general', label: 'General Ward', mult: 1.0 },
  { key: 'semi_private', label: 'Semi-Private', mult: 1.3 },
  { key: 'deluxe_private', label: 'Deluxe Private', mult: 1.8 },
  { key: 'super_deluxe', label: 'Super Deluxe', mult: 2.5 },
  { key: 'icu', label: 'ICU', mult: 2.0 },
];

interface ServiceRow { code: string; price: string; label: string }

/**
 * Modules #61 & #62: bed-category tariff multiplier matrix calculator +
 * package inclusions/exclusions auto-billing engine.
 */
export default function PackageBillingEngine() {
  // ── Module #61: tariff multiplier ──
  const [serviceCode, setServiceCode] = useState('GEN-SERVICE');
  const [basePrice, setBasePrice] = useState('1000');
  const [bedCategory, setBedCategory] = useState('general');
  const [tariffResult, setTariffResult] = useState<any>(null);
  const [tariffLoading, setTariffLoading] = useState(false);

  // ── Module #62: package exclusions engine ──
  const [packageCode, setPackageCode] = useState('PKG-MATERNITY-NORMAL');
  const [services, setServices] = useState<ServiceRow[]>([
    { code: 'ROOM-GEN-2D', price: '4000', label: 'General room 2 days' },
    { code: 'DOC-DELIVERY-FEE', price: '6000', label: 'Delivery fee' },
    { code: 'BLOOD-PRBC', price: '1200', label: '2 units PRBC' },
  ]);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // ── Package definitions (DB) ──
  const [defs, setDefs] = useState<any[]>([]);
  const [newDef, setNewDef] = useState({ code: '', name: '', bundledPrice: '', includedCodes: '', excludedCodes: '' });

  const loadDefs = async () => {
    try {
      const r: any = await api.get('/finance/packages/definitions');
      setDefs(r?.packages || []);
    } catch { /* non-critical */ }
  };
  useEffect(() => { loadDefs(); }, []);

  const calcTariff = async () => {
    try {
      setTariffLoading(true);
      const r: any = await api.get(`/finance/tariffs/calculate?serviceCode=${encodeURIComponent(serviceCode)}&bedCategory=${bedCategory}&basePrice=${basePrice}`);
      setTariffResult(r);
      toast.success(`Fee: ₹${r.calculatedFee} (${r.multiplier}x for ${r.bedCategory})`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Tariff calculation failed');
    } finally { setTariffLoading(false); }
  };

  const evaluatePkg = async () => {
    try {
      setEvalLoading(true);
      const orderedServices = services
        .filter((s) => s.code.trim())
        .map((s) => ({ code: s.code.trim().toUpperCase(), price: Number(s.price) || 0, label: s.label }));
      const r: any = await api.post('/finance/packages/evaluate-exclusions', { packageCode, orderedServices });
      setEvalResult(r);
      toast.success(`Bundle ₹${r.baseBundleAmount} + extras ₹${r.additionalExtraTotal} = ₹${r.finalEstimatedTotal}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Evaluation failed');
    } finally { setEvalLoading(false); }
  };

  const createDef = async () => {
    try {
      await api.post('/finance/packages/definitions', {
        code: newDef.code,
        name: newDef.name,
        bundledPrice: Number(newDef.bundledPrice) || 0,
        includedCodes: newDef.includedCodes.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
        excludedCodes: newDef.excludedCodes.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
      });
      toast.success('Package definition saved');
      setNewDef({ code: '', name: '', bundledPrice: '', includedCodes: '', excludedCodes: '' });
      loadDefs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const addService = () => setServices([...services, { code: '', price: '', label: '' }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, patch: Partial<ServiceRow>) =>
    setServices(services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Tariff Multiplier & Package Billing Engine
          <Badge variant="outline">Modules #61 · #62</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bed-category multiplier matrix pricing and package inclusion/exclusion auto-billing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Module #61: Bed Category Tariff Multiplier Matrix ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Bed Category Tariff Multiplier Matrix
            </CardTitle>
            <CardDescription className="text-xs">Effective fee = base price × bed-category multiplier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5">Bed Category</th>
                  <th className="py-1.5">Multiplier</th>
                  <th className="py-1.5 text-right">Fee on ₹{Number(basePrice) || 0}</th>
                </tr>
              </thead>
              <tbody>
                {BED_CATEGORIES.map((c) => (
                  <tr
                    key={c.key}
                    className={`border-b last:border-0 cursor-pointer ${bedCategory === c.key ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}
                    onClick={() => setBedCategory(c.key)}
                  >
                    <td className="py-1.5">{c.label}</td>
                    <td className="py-1.5 font-mono">{c.mult.toFixed(2)}×</td>
                    <td className="py-1.5 text-right font-mono">₹{Math.round((Number(basePrice) || 0) * c.mult).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Service code</label>
                <Input value={serviceCode} onChange={(e) => setServiceCode(e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Base price (₹)</label>
                <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="text-xs" />
              </div>
              <Button size="sm" disabled={tariffLoading} onClick={calcTariff}>
                <Calculator className="h-3.5 w-3.5 mr-1" /> {tariffLoading ? '…' : 'Calculate'}
              </Button>
            </div>

            {tariffResult && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <div className="font-semibold text-primary text-lg">₹{Number(tariffResult.calculatedFee).toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tariffResult.ruleApplied} · base ₹{Number(tariffResult.baseFee).toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Module #62: Package inclusions/exclusions evaluator ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Package Inclusions — Auto-Billing Evaluator
            </CardTitle>
            <CardDescription className="text-xs">
              In-package codes bundle at package price; everything else bills extra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Package code</label>
              <Input value={packageCode} onChange={(e) => setPackageCode(e.target.value)} className="text-xs font-mono" list="pkg-defs" />
              <datalist id="pkg-defs">
                <option value="PKG-MATERNITY-NORMAL" />
                <option value="PKG-CARDIO-ANGIO" />
                {defs.map((d) => <option key={d._id} value={d.code} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Ordered services</span>
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_1fr_28px] gap-1.5">
                  <Input placeholder="code" value={s.code} onChange={(e) => updateService(i, { code: e.target.value })} className="h-8 text-xs font-mono" />
                  <Input placeholder="price" type="number" value={s.price} onChange={(e) => updateService(i, { price: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="description" value={s.label} onChange={(e) => updateService(i, { label: e.target.value })} className="h-8 text-xs" />
                  <Button size="sm" variant="ghost" className="h-8 w-7 p-0" onClick={() => removeService(i)} disabled={services.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addService}><Plus className="h-3.5 w-3.5 mr-1" /> Add service</Button>
                <Button size="sm" disabled={evalLoading} onClick={evaluatePkg}>
                  {evalLoading ? '…' : 'Evaluate billing split'}
                </Button>
              </div>
            </div>

            {evalResult && (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted border">
                  <div className="font-semibold">{evalResult.packageName} <span className="font-mono text-muted-foreground">({evalResult.packageCode})</span></div>
                  <div className="text-muted-foreground">Bundle: ₹{Number(evalResult.baseBundleAmount).toLocaleString('en-IN')}</div>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {evalResult.bundledItems?.map((it: any) => (
                    <div key={it.code} className="flex justify-between rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5">
                      <span className="font-mono">{it.code} <span className="text-muted-foreground font-sans">{it.label}</span></span>
                      <span className="text-emerald-700 font-semibold">Included (₹0)</span>
                    </div>
                  ))}
                  {evalResult.excludedBillableItems?.map((it: any) => (
                    <div key={it.code} className="flex justify-between rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
                      <span className="font-mono">{it.code} <span className="text-muted-foreground font-sans">{it.label}</span></span>
                      <span className="text-amber-700 font-semibold">+ ₹{Number(it.charge).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-sm">
                  <span>Final estimated total</span>
                  <span className="text-primary">₹{Number(evalResult.finalEstimatedTotal).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Package definitions manager */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hospital Package Definitions ({defs.length})</CardTitle>
          <CardDescription className="text-xs">Stored definitions take priority over demo packages in the billing engine.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end text-xs">
            <div><label className="text-muted-foreground">Code</label>
              <Input placeholder="PKG-CATARACT" value={newDef.code} onChange={(e) => setNewDef({ ...newDef, code: e.target.value })} className="font-mono" /></div>
            <div><label className="text-muted-foreground">Name</label>
              <Input placeholder="Cataract Package" value={newDef.name} onChange={(e) => setNewDef({ ...newDef, name: e.target.value })} /></div>
            <div><label className="text-muted-foreground">Bundle ₹</label>
              <Input type="number" placeholder="20000" value={newDef.bundledPrice} onChange={(e) => setNewDef({ ...newDef, bundledPrice: e.target.value })} /></div>
            <div><label className="text-muted-foreground">Included codes (comma)</label>
              <Input placeholder="ROOM-GEN-1D, DOC-FEE" value={newDef.includedCodes} onChange={(e) => setNewDef({ ...newDef, includedCodes: e.target.value })} /></div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1"><label className="text-muted-foreground">Excluded codes (comma)</label>
                <Input placeholder="LENS-IOL, MED-EXTRA" value={newDef.excludedCodes} onChange={(e) => setNewDef({ ...newDef, excludedCodes: e.target.value })} /></div>
              <Button size="sm" onClick={createDef}>Save</Button>
            </div>
          </div>
          {defs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1.5 pr-2">Code</th>
                    <th className="py-1.5 pr-2">Name</th>
                    <th className="py-1.5 pr-2">Bundle</th>
                    <th className="py-1.5 pr-2">Included</th>
                    <th className="py-1.5">Excluded</th>
                  </tr>
                </thead>
                <tbody>
                  {defs.map((d) => (
                    <tr key={d._id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 font-mono text-primary">{d.code}</td>
                      <td className="py-1.5 pr-2">{d.name}</td>
                      <td className="py-1.5 pr-2 font-mono">₹{Number(d.bundledPrice).toLocaleString('en-IN')}</td>
                      <td className="py-1.5 pr-2">{(d.includedCodes || []).length} codes</td>
                      <td className="py-1.5">{(d.excludedCodes || []).length} codes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
