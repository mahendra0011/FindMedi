import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Truck, Store, BadgeCheck, CreditCard, Wallet, Banknote, Percent, Tag, CheckCircle2, AlertCircle, Clock, Shield, Home, Building, Camera, Upload, Image, FileText, X, XCircle, Lock, ShoppingCart, RotateCcw, RefreshCw, ChevronRight, ChevronLeft, Package, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import AutoRetryPanel from '@/components/AutoRetryPanel';
import { useAutoRetry, AUTO_RETRY_STATUS } from '@/hooks/useAutoRetry';
import { usePreferredPharmacies } from '@/context/PreferredPharmacyContext';
import { toast } from 'sonner';

const CROSS_STORE_MEDS = [
  { id:'m1_s2', name:'Paracetamol 500mg', image:'', brand:'PharmaPlus', mrp:48, price:32, discount:33, inStock:true, rx:false, pack:'10 tablets', category:'OTC', storeId:'s2' },
  { id:'m9_s1', name:'Ibuprofen 400mg', image:'', brand:'PharmaPlus', mrp:68, price:48, discount:29, inStock:true, rx:false, pack:'10 tablets', category:'OTC', storeId:'s1' },
  { id:'m3_s3', name:'Cough Syrup 100ml', image:'', brand:'MediCare', mrp:130, price:95, discount:27, inStock:true, rx:false, pack:'100ml bottle', category:'OTC', storeId:'s3' },
];

const SAVED_PRESCRIPTIONS_KEY = 'mediCore_saved_rx';

const SAVED_ADDRESSES = [
  { id:'a1', label:'Home', address:'123, Health Avenue, Block C, Downtown, New York, NY 10001', type:'home', default:true },
  { id:'a2', label:'Work', address:'456, Office Tower, Business District, New York, NY 10002', type:'work', default:false },
];

const DELIVERY_SLOTS = [
  { id:'s1', label:'ASAP (30-40 mins)', value:'asap' },
  { id:'s2', label:'Scheduled - 2PM - 4PM', value:'sched1' },
  { id:'s3', label:'Scheduled - 4PM - 6PM', value:'sched2' },
  { id:'s4', label:'Scheduled - 6PM - 8PM', value:'sched3' },
];

const OFFERS = [
  { title:'Flat 20% off on first order', code:'FIRST20', desc:'Use code FIRST20 on your first order', discount:20, minOrder:200 },
  { title:'Free delivery on orders above ₹200', code:'', desc:'Auto-applied at checkout', discount:0 },
];

const REJECTION_REASONS = [
  { id: 'blurry', label: 'Unclear/blurry prescription image' },
  { id: 'expired', label: 'Prescription has expired' },
  { id: 'name_mismatch', label: 'Medicine name does not match handwriting' },
  { id: 'stamp_missing', label: 'Doctor signature/stamp missing' },
  { id: 'qty_exceeded', label: 'Requested quantity exceeds prescribed amount' },
];

const STEPS = [
  { key:'address', label:'Address', icon: MapPin },
  { key:'delivery', label:'Delivery', icon: Truck },
  { key:'prescription', label:'Prescription', icon: FileText },
  { key:'summary', label:'Summary', icon: Shield },
  { key:'payment', label:'Payment', icon: CreditCard },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { entries, stores, addItem, removeItem, clearCart } = useCart();
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const autoRetry = useAutoRetry();
  const { autoRetryEnabled, setAutoRetry: setPreferredAutoRetry } = usePreferredPharmacies();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(SAVED_ADDRESSES[0].id);
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [deliverySlot, setDeliverySlot] = useState('asap');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ full: '', city: '', pincode: '' });
  const [addressList, setAddressList] = useState(SAVED_ADDRESSES);
  const [addressVersion, setAddressVersion] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [payOnDelivery, setPayOnDelivery] = useState(true);
  const [saveCard, setSaveCard] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  // rxStatus: per-entry map — 'pending' | 'verified' | 'rejected'
  const [rxStatus, setRxStatus] = useState({});
  const [rxRejection, setRxRejection] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [oosFallback, setOosFallback] = useState(null);
  const [savedPrescriptions, setSavedPrescriptions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_PRESCRIPTIONS_KEY)) || []; } catch { return []; }
  });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [rxConfirmed, setRxConfirmed] = useState(false);

  const [storeMap, setStoreMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getFacilities({ type: 'pharmacy' });
        const list = Array.isArray(res) ? res : res?.facilities || [];
        const map = {};
        list.forEach(f => {
          const id = f._id || f.id;
          map[id] = { id, name: f.name || f.storeName, deliveryCharges: f.deliveryCharges || 20, freeDeliveryAbove: f.freeDeliveryAbove || 200 };
        });
        setStoreMap(map);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const getStore = (storeId) => storeMap[storeId];
  const hasRxItems = entries.some(e => e.item.rx);
  const findAlternatives = (entry, allMeds) => allMeds.filter(m => m.name === entry.item.name && m.storeId !== entry.storeId && m.inStock);

  const subtotalByStore = {};
  entries.forEach(e => {
    if (!subtotalByStore[e.storeId]) subtotalByStore[e.storeId] = 0;
    subtotalByStore[e.storeId] += e.item.price * e.qty;
  });

  const itemTotal = entries.reduce((s, e) => s + e.item.price * e.qty, 0);
  const deliveryTotal = Object.entries(subtotalByStore).reduce((s, [sid, sub]) => {
    const store = getStore(sid);
    const charge = store ? (sub >= (store.freeDeliveryAbove || Infinity) ? 0 : (store.deliveryCharges || 0)) : 0;
    return s + charge;
  }, 0);
  const discount = appliedCoupon ? Math.round(itemTotal * appliedCoupon.discount / 100) : 0;
  const platformFee = 5;
  const gst = Math.round((itemTotal - discount) * 0.05);
  const grandTotal = Math.max(0, itemTotal + deliveryTotal - discount + platformFee + gst);

  const selectedAddress = addressList.find(a => a.id === address);

  const activeSteps = STEPS.filter(s => s.key !== 'prescription' || hasRxItems);

  const handleApplyCoupon = async () => {
    if (!couponCode) { toast.error('Please enter a coupon code'); return; }
    try {
      const res = await api.dispatch(null, '/pharmacy/coupons/validate', { method: 'POST', body: JSON.stringify({ code: couponCode }) });
      if (res?.valid) {
        setAppliedCoupon({ code: couponCode, discount: res.discount || 0, title: res.title || 'Coupon Applied' });
        setShowCouponInput(false);
        toast.success('Coupon applied successfully');
      } else {
        toast.error(res?.message || 'Invalid coupon code');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to validate coupon');
    }
  };

  const handleNext = () => {
    const currentKey = activeSteps[step]?.key;
    if (currentKey === 'address' && !selectedAddress) { toast.error('Please select a delivery address'); return; }
    if (currentKey === 'delivery' && deliveryMode === 'delivery' && !deliverySlot) { toast.error('Please select a delivery slot'); return; }
    if (currentKey === 'prescription' && hasRxItems) {
      // Must have a verified Rx OR auto-retry accepted by a provider
      const allVerified = Object.values(rxStatus).length > 0 && Object.values(rxStatus).every(v => v === 'verified');
      const autoRetryAccepted = autoRetry.status === AUTO_RETRY_STATUS.ACCEPTED;
      if (!allVerified && !autoRetryAccepted) {
        if (Object.keys(rxStatus).length === 0) {
          toast.error('Please upload prescription for Rx items');
        } else if (Object.values(rxStatus).some(v => v === 'pending')) {
          toast.info('Please wait — prescription is being verified...');
        } else if (Object.values(rxStatus).some(v => v === 'rejected') && autoRetry.status !== AUTO_RETRY_STATUS.ACCEPTED) {
          toast.error('Prescription was rejected. Please re-upload or wait for auto-retry to find a provider.');
        }
        return;
      }
    }
    setStep(s => Math.min(s + 1, activeSteps.length - 1));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    if (!user) { toast.error('Please login to place order'); navigate('/login'); return; }
    if (hasRxItems) {
      if (Object.keys(rxStatus).length === 0) { toast.error('Please upload prescription for Rx items'); return; }
      const anyRejected = Object.values(rxStatus).some(v => v === 'rejected');
      if (anyRejected) {
        if (!rxConfirmed) {
          setConfirmDialog({
            title: 'Prescriptions Rejected',
            message: 'Some prescriptions were rejected. Only OTC (non-prescription) items will be ordered. Rx items will be removed. Continue?',
            onConfirm: () => { setRxConfirmed(true); setConfirmDialog(null); handlePlaceOrder(); },
            onCancel: () => setConfirmDialog(null),
          });
          return;
        }
        setRxConfirmed(false);
      }
    }

    const outOfStock = entries.filter(e => !e.item.inStock);
    const oosWithAlts = outOfStock.filter(e => findAlternatives(e, CROSS_STORE_MEDS).length > 0);
    if (oosWithAlts.length > 0) {
      setOosFallback(oosWithAlts);
      return;
    }
    const noAltOos = outOfStock.filter(e => findAlternatives(e, CROSS_STORE_MEDS).length === 0);
    if (noAltOos.length > 0) {
      setConfirmDialog({
        title: 'Items Out of Stock',
        message: `Some items are out of stock:\n${noAltOos.map(e => `- ${e.item.name}`).join('\n')}\n\nThese will be removed. Continue with remaining items?`,
        onConfirm: () => {
          setConfirmDialog(null);
          const orderIds = stores.map((st, i) => `ORD${Date.now().toString(36).toUpperCase()}-${i + 1}`);
          const params = new URLSearchParams({ stores: stores.map(s => s.storeId).join(','), orderIds: orderIds.join(','), rx: hasRxItems ? 'true' : 'false' });
          noAltOos.forEach(e => removeItem(e.key));
          if (payOnDelivery) { navigate(`/order-confirmation?${params}`); }
          else { params.set('total', grandTotal.toString()); params.set('method', paymentMethod); navigate(`/payment-gateway?${params}`); }
        },
        onCancel: () => setConfirmDialog(null),
      });
      return;
    }

    try {
      const orderPayload = {
        patientId: user._id,
        patientName: user.name,
        email: user.email,
        phone: user.phone || '',
        address: selectedAddress?.address || '',
        items: entries.map(e => ({
          medicineId: e.item._id || e.item.id,
          medicineName: e.item.name,
          quantity: e.qty,
          price: e.item.price,
          storeId: e.storeId,
          rx: e.item.rx || false,
        })),
        total: grandTotal,
        deliveryMode,
        deliverySlot,
        paymentMethod: payOnDelivery ? 'cod' : paymentMethod,
        status: payOnDelivery ? 'Confirmed' : 'Pending',
      };
      const res = await api.createPharmacyOrder(orderPayload);
      const orderIds = Array.isArray(res?.orders) ? res.orders.map(o => o._id) : [res?.order?._id || res?._id];
      const orderIdStr = orderIds.join(',');
      const params = new URLSearchParams({ stores: stores.map(s => s.storeId).join(','), orderIds: orderIdStr, rx: hasRxItems ? 'true' : 'false' });

      const rejectedEntries = entries.filter(e => rxStatus[e.key] === 'rejected');
      if (rejectedEntries.length > 0) {
        const refundAmount = rejectedEntries.reduce((s, e) => s + e.item.price * e.qty, 0);
        const refundItems = rejectedEntries.map(e => `${e.item.name} x${e.qty}`);
        params.set('refunded', 'true');
        params.set('refundAmount', refundAmount.toString());
        params.set('refundItems', refundItems.join(','));
        rejectedEntries.forEach(e => removeItem(e.key));
      }

      clearCart();

      if (payOnDelivery) {
        navigate(`/order-confirmation?${params}`);
      } else {
        params.set('total', grandTotal.toString());
        params.set('method', paymentMethod);
        navigate(`/payment-gateway?${params}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to place order');
    }
  };

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Nothing to checkout</h2>
          <p className="text-muted-foreground mb-8">Your cart is empty</p>
          <Button className="gap-2 rounded-xl" onClick={() => navigate('/buy-medicine')}>Browse Stores</Button>
        </div>
      </div>
    );
  }

  const isLastStep = step === activeSteps.length - 1;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate('/cart')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </button>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm overflow-x-auto pb-2">
          {activeSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              <button onClick={() => i < step && setStep(i)}
                className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all', 
                  i < step ? 'bg-primary text-primary-foreground cursor-pointer' :
                  i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground cursor-default')}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
              </button>
              <span className={cn('text-xs font-medium', i <= step ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              {i < activeSteps.length - 1 && <div className={cn('w-6 h-px', i < step ? 'bg-primary' : 'bg-muted-foreground/20')} />}
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: ADDRESS ═══ */}
        {step === 0 && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
              <MapPin className="w-4 h-4 text-primary" /> Delivery Address
            </h3>
            <RadioGroup value={address} onValueChange={setAddress} className="space-y-3" key={addressVersion}>
              {addressList.map(addr => (
                <Label key={addr.id} htmlFor={addr.id}
                  className={cn('flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all', address === addr.id ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-border/60 hover:border-muted-foreground/30')}>
                  <RadioGroupItem value={addr.id} id={addr.id} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {addr.type === 'home' ? <Home className="w-3.5 h-3.5 text-primary" /> : <Building className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="font-semibold text-sm text-foreground">{addr.label}</span>
                      {addr.default && <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{addr.address}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
            <Button variant="outline" size="sm" className="gap-1.5 mt-3 rounded-lg text-xs" onClick={() => setShowNewAddress(!showNewAddress)}>
              <Plus className="w-3.5 h-3.5" /> Add New Address
            </Button>
            {showNewAddress && (
              <div className="mt-3 p-4 rounded-xl border border-border/60 space-y-3">
                <Input placeholder="Full address" className="text-sm rounded-lg" value={newAddress.full} onChange={e => setNewAddress(p => ({ ...p, full: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City" className="text-sm rounded-lg" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} />
                  <Input placeholder="Pincode" className="text-sm rounded-lg" value={newAddress.pincode} onChange={e => setNewAddress(p => ({ ...p, pincode: e.target.value }))} />
                </div>
                <Button size="sm" className="rounded-lg w-full" onClick={async () => {
                 if (!newAddress.full || !newAddress.city) { toast.error('Please fill all fields'); return; }
                 const newId = `a${Date.now()}`;
                 const updated = [...addressList, { id:newId, label:'Other', address:`${newAddress.full}, ${newAddress.city}, ${newAddress.pincode}`, type:'other', default:false }];
                 setAddressList(updated);
                 setAddress(newId);
                 setShowNewAddress(false);
                 setNewAddress({ full:'', city:'', pincode:'' });
                 setAddressVersion(v => v + 1);
                 try {
                   await api.dispatch(null, '/patient/addresses', { method:'POST', body: JSON.stringify({ address: `${newAddress.full}, ${newAddress.city}, ${newAddress.pincode}`, label: 'Other' }) });
                 } catch (e) {
                   console.error('Failed to save address:', e);
                 }
                 toast.success('New address saved'); }}>Save Address</Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: DELIVERY ═══ */}
        {step === 1 && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
              <Truck className="w-4 h-4 text-primary" /> Delivery Mode
            </h3>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setDeliveryMode('delivery')}
                className={cn('flex-1 p-3 rounded-xl border text-sm font-medium transition-all', deliveryMode === 'delivery' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30')}>
                <Truck className="w-4 h-4 mx-auto mb-1" /> Home Delivery
              </button>
              <button onClick={() => setDeliveryMode('pickup')}
                className={cn('flex-1 p-3 rounded-xl border text-sm font-medium transition-all', deliveryMode === 'pickup' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30')}>
                <Store className="w-4 h-4 mx-auto mb-1" /> Store Pickup
              </button>
            </div>
            {deliveryMode === 'delivery' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Select delivery slot</p>
                <RadioGroup value={deliverySlot} onValueChange={setDeliverySlot} className="space-y-2">
                  {DELIVERY_SLOTS.map(slot => (
                    <Label key={slot.id} htmlFor={slot.id}
                      className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm', deliverySlot === slot.value ? 'border-primary bg-primary/5' : 'border-border/60')}>
                      <RadioGroupItem value={slot.value} id={slot.id} />
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{slot.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}
            {deliveryMode === 'pickup' && (
              <p className="text-sm text-muted-foreground">Visit the store to pick up your order. You will be notified when ready.</p>
            )}
          </div>
        )}

        {/* ═══ STEP 3: PRESCRIPTION ═══ */}
        {step === 2 && hasRxItems && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 space-y-4">
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 text-[15px]">
              <FileText className="w-4 h-4 text-amber-500" /> Prescription Verification
            </h3>

            {/* Info banner */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Some items require a valid prescription. Upload below — the pharmacist will verify it.
                  If rejected, auto-retry (if enabled) will forward to your next preferred pharmacy.
                </p>
              </div>
            </div>

            {/* Rx items list */}
            <div className="space-y-2">
              {entries.filter(e => e.item.rx).map(entry => (
                <div key={entry.key} className="flex items-center justify-between p-3 rounded-xl border border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden border border-border/40">
                      <img src={entry.item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.brand} · Qty: {entry.qty}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {rxStatus[entry.key] === 'verified' ? (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />Verified
                      </Badge>
                    ) : rxStatus[entry.key] === 'rejected' ? (
                      <>
                        <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
                          <X className="w-3 h-3 mr-0.5" />Rejected
                        </Badge>
                        {rxRejection[entry.key] && (
                          <p className="text-[10px] text-red-500 text-right max-w-[160px] mt-0.5">{rxRejection[entry.key]}</p>
                        )}
                        <Button size="sm" variant="outline" className="text-[10px] gap-1 rounded-lg h-7 mt-1"
                          onClick={() => { autoRetry.resetRetry(); setRxStatus({}); setRxRejection({}); setShowRxModal(true); }}>
                          <RotateCcw className="w-2.5 h-2.5" /> Re-upload
                        </Button>
                      </>
                    ) : rxStatus[entry.key] === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">Verifying...</Badge>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-lg h-8"
                        onClick={() => setShowRxModal(true)}>
                        <Upload className="w-3 h-3" /> Upload Rx
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Preferred Pharmacy Settings Surface */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/40">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Auto-Fallback (Preferred Pharmacies)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically route your order to your next preferred pharmacy if rejected.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" checked={autoRetryEnabled} onChange={(e) => setPreferredAutoRetry(e.target.checked)} />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Auto-retry status — accepted banner */}
            {autoRetry.status === AUTO_RETRY_STATUS.ACCEPTED && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Prescription Accepted</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    Accepted by {autoRetry.currentStore?.name}. You can proceed to the next step.
                  </p>
                </div>
              </div>
            )}

            {/* AutoRetryPanel — wired with real handlers */}
            <AutoRetryPanel
              orderContext={{ originalTotal: itemTotal, entries, stores }}
              onPriceConfirm={(accepted) => {
                if (!accepted) autoRetry.stopRetry();
              }}
              onStoreSelect={() => setStep(0)}
            />
          </div>
        )}

        {/* ═══ STEP 4: SUMMARY & COUPONS ═══ */}
        {step === (hasRxItems ? 3 : 2) && (
          <div className="space-y-6">
            {/* Notices */}
            {stores.length > 1 && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Store className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Multi-Store Order — Auto Split</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Your items from {stores.length} different stores will be split into separate orders.</p>
                  </div>
                </div>
              </div>
            )}
            {hasRxItems && entries.some(e => !e.item.rx) && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Mixed Order — Partial Shipment</p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">OTC items dispatch immediately. Rx items ship after prescription verification.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Coupons */}
            <div className="bg-card rounded-2xl border border-border/60 p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
                <Tag className="w-4 h-4 text-primary" /> Coupons & Offers
              </h3>
              {appliedCoupon ? (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Coupon Applied</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{appliedCoupon.title}</p>
                  </div>
                  <Badge className="text-xs bg-emerald-500/20 text-emerald-600 border-emerald-300">-{appliedCoupon.discount}%</Badge>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {OFFERS.filter(o => o.code).map((offer, i) => (
                      <div key={i} className="bg-gradient-to-r from-primary/5 to-primary/0 rounded-xl border border-primary/10 p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Percent className="w-4 h-4 text-primary" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{offer.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{offer.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {showCouponInput ? (
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Input value={couponCode} onChange={e => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code" className="text-sm rounded-lg flex-1" />
                        <Button size="sm" className="rounded-lg" onClick={handleApplyCoupon}>Apply</Button>
                      </div>
                      {couponCode.length > 0 && !appliedCoupon && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
                          {OFFERS.filter(o => o.code && (o.code.toLowerCase().includes(couponCode.toLowerCase()) || o.title.toLowerCase().includes(couponCode.toLowerCase()) || o.desc.toLowerCase().includes(couponCode.toLowerCase()))).length > 0 ? (
                            OFFERS.filter(o => o.code && (o.code.toLowerCase().includes(couponCode.toLowerCase()) || o.title.toLowerCase().includes(couponCode.toLowerCase()) || o.desc.toLowerCase().includes(couponCode.toLowerCase()))).map((offer, i) => (
                              <button key={i} onClick={() => { setCouponCode(offer.code); handleApplyCoupon(); }}
                                className="w-full text-left p-3 hover:bg-muted/30 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0">
                                <Percent className="w-4 h-4 text-primary shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground">{offer.code} — {offer.title}</p>
                                  <p className="text-xs text-muted-foreground">{offer.desc}</p>
                                </div>
                                <Badge className="text-[10px] bg-primary/10 text-primary shrink-0">{offer.discount}% OFF</Badge>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground text-center">No matching offers found</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={() => setShowCouponInput(true)}>
                      <Tag className="w-3.5 h-3.5" /> Have a coupon code?
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Bill Summary */}
            <div className="bg-card rounded-2xl border border-border/60 p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
                <Shield className="w-4 h-4 text-primary" /> Order Summary
              </h3>
              <div className="space-y-3 text-sm">
                {stores.map(st => {
                  const store = getStore(st.storeId);
                  const storeDelivery = store ? (st.subtotal >= (store.freeDeliveryAbove || Infinity) ? 0 : (store.deliveryCharges || 0)) : 0;
                  return (
                    <div key={st.storeId} className="bg-muted/20 rounded-xl p-3 mb-3 border border-border/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-foreground text-sm">{store?.name}</span>
                        </div>
                        <Badge className="text-[10px] bg-primary/10 text-primary">Order #{stores.indexOf(st) + 1}</Badge>
                      </div>
                      {st.items.map(e => (
                        <div key={e.key} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground truncate mr-4">{e.item.name} x{e.qty}</span>
                          <span className="font-medium text-foreground shrink-0">₹{e.item.price * e.qty}</span>
                        </div>
                      ))}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className={storeDelivery === 0 ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>{storeDelivery === 0 ? 'Free' : `₹${storeDelivery}`}</span>
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Item Total</span><span className="font-medium">₹{itemTotal}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" />Delivery Charges</span><span className={cn('font-medium', deliveryTotal === 0 ? 'text-emerald-600' : '')}>{deliveryTotal === 0 ? 'Free' : `₹${deliveryTotal}`}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount ({appliedCoupon?.code})</span><span className="font-medium text-emerald-600">-₹{discount}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span className="font-medium">₹{platformFee}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><span className="font-medium">₹{gst}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-bold"><span>To Pay</span><span className="text-primary">₹{grandTotal}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 5: PAYMENT ═══ */}
        {step === (hasRxItems ? 4 : 3) && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
              <CreditCard className="w-4 h-4 text-primary" /> Payment Method
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button onClick={() => { setPayOnDelivery(true); setPaymentMethod('cod'); }}
                  className={cn('flex-1 p-3 rounded-xl border text-sm font-medium transition-all', payOnDelivery ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground')}>
                  <Banknote className="w-5 h-5 mx-auto mb-1" /> Pay on Delivery
                </button>
                <button onClick={() => setPayOnDelivery(false)}
                  className={cn('flex-1 p-3 rounded-xl border text-sm font-medium transition-all', !payOnDelivery ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground')}>
                  <CreditCard className="w-5 h-5 mx-auto mb-1" /> Pay Now
                </button>
              </div>

              {payOnDelivery ? (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-8 h-8 text-muted-foreground/50" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay ₹{grandTotal} when your order is delivered</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-auto" />
                  </div>
                </div>
              ) : (
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                  {[
                    { value:'upi', label:'UPI', icon: Wallet, desc:'Google Pay, PhonePe, Paytm' },
                    { value:'card', label:'Debit / Credit Card', icon: CreditCard, desc:'Visa, MasterCard, RuPay' },
                    { value:'netbanking', label:'Net Banking', icon: Building, desc:'All major banks' },
                    { value:'wallet', label:'MediCore Wallet', icon: Wallet, desc:'Balance: ₹0' },
                  ].map(m => (
                    <Label key={m.value} htmlFor={m.value}
                      className={cn('flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all', paymentMethod === m.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-muted-foreground/30')}>
                      <RadioGroupItem value={m.value} id={m.value} />
                      <m.icon className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      {paymentMethod === m.value && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </Label>
                  ))}
                  {paymentMethod === 'card' && (
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-border/60 cursor-pointer hover:border-muted-foreground/30 transition-all">
                      <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      <span className="text-sm text-muted-foreground">Save card for next time</span>
                    </label>
                  )}
                </RadioGroup>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 mt-6">
          <div>
            {step > 0 && (
              <Button variant="outline" className="gap-2 rounded-xl" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
          </div>
          <div>
            {isLastStep ? (
              <Button className="gap-3 rounded-2xl h-14 text-base font-bold shadow-xl shadow-primary/30 min-w-[220px]"
                onClick={handlePlaceOrder}>
                <Lock className="w-5 h-5" /> Place Order &bull; ₹{grandTotal}
              </Button>
            ) : (
              <Button className="gap-2 rounded-xl" onClick={handleNext}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {isLastStep && (
          <p className="text-xs text-muted-foreground text-center mt-3">By placing this order, you agree to our Terms & Conditions</p>
        )}
      </div>

      {/* OOS Fallback Modal */}
      {oosFallback && oosFallback.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setOosFallback(null)}>
          <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Out of Stock — Alternatives Found</h3>
              <button onClick={() => setOosFallback(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Some items are out of stock in your selected store. Available at other stores:</p>
            <div className="space-y-3 mb-4">
              {oosFallback.map(entry => {
                const alts = findAlternatives(entry, CROSS_STORE_MEDS);
                return alts.map(alt => {
                  const altStore = getStore(alt.storeId);
                  const diff = alt.price - entry.item.price;
                  return (
                    <div key={alt.id} className="border border-border/60 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground">{entry.item.name} x{entry.qty}</p>
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-600">OOS in current store</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Store className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{altStore?.name}</span>
                        <span className="font-medium">₹{alt.price}/unit</span>
                        {diff !== 0 && (
                          <span className={cn('text-xs', diff > 0 ? 'text-red-500' : 'text-emerald-500')}>
                            {diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Price may differ from original. Review before confirming.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl" onClick={() => {
                oosFallback.forEach(entry => {
                  const alts = findAlternatives(entry, CROSS_STORE_MEDS);
                  if (alts.length > 0) {
                    const bestAlt = alts[0];
                    addItem(bestAlt, bestAlt.storeId);
                    removeItem(entry.key);
                    toast.success(`${entry.item.name} switched to ${getStore(bestAlt.storeId)?.name}`);
                  }
                });
                setOosFallback(null);
              }}>
                <CheckCircle2 className="w-4 h-4" /> Switch to Available Store
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => {
                setOosFallback(null);
                const remainingOos = entries.filter(e => !e.item.inStock && findAlternatives(e, CROSS_STORE_MEDS).length === 0);
                if (remainingOos.length > 0) {
                  const msg = `These items are out of stock with no alternatives:\n${remainingOos.map(e => `- ${e.item.name}`).join('\n')}\n\nThey will be removed. Continue?`;
                  setConfirmDialog({
                    title: 'Remove Out of Stock Items',
                    message: msg,
                    onConfirm: () => {
                      setConfirmDialog(null);
                      const orderIds = stores.map((st, i) => `ORD${Date.now().toString(36).toUpperCase()}-${i + 1}`);
                      const params = new URLSearchParams({ stores: stores.map(s => s.storeId).join(','), orderIds: orderIds.join(','), rx: hasRxItems ? 'true' : 'false' });
                      remainingOos.forEach(e => removeItem(e.key));
                      if (payOnDelivery) { navigate(`/order-confirmation?${params}`); }
                      else { params.set('total', grandTotal.toString()); params.set('method', paymentMethod); navigate(`/payment-gateway?${params}`); }
                    },
                    onCancel: () => setConfirmDialog(null),
                  });
                }
              }}>
                <XCircle className="w-4 h-4" /> Skip & Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={confirmDialog.onCancel}>
          <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-semibold text-foreground mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl" onClick={confirmDialog.onConfirm}>Continue</Button>
              <Button variant="outline" className="rounded-xl" onClick={confirmDialog.onCancel}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rx Upload Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowRxModal(false)}>
          <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Upload Prescription</h3>
              <button onClick={() => setShowRxModal(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center mb-4 hover:border-primary/40 transition-colors cursor-pointer relative">
              <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Tap to upload</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF</p>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadedFiles(p => ({ ...p, all: file.name }));
                    toast.success(`Uploaded: ${file.name}`);
                  }
                }} />
            </div>
            {uploadedFiles.all && (
              <p className="text-xs text-emerald-600 mb-3 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {uploadedFiles.all}
              </p>
            )}
            {savedPrescriptions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Saved Prescriptions</p>
                <div className="space-y-1.5">
                  {savedPrescriptions.slice(-3).reverse().map((rx, i) => (
                    <button key={i} onClick={() => {
                      setUploadedFiles(p => ({ ...p, all: rx.name }));
                      toast.info(`Selected: ${rx.name}`);
                    }}
                      className={cn('w-full text-left p-2 rounded-lg border text-xs transition-all', uploadedFiles.all === rx.name ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30')}>
                      <FileText className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                      {rx.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                <Image className="w-4 h-4" /> Gallery
              </Button>
            </div>
            <div className="flex gap-2">
<Button className="flex-1 rounded-xl" onClick={async () => {
                 if (!uploadedFiles.all) { toast.error('Please select a prescription file first'); return; }
                 const rxEntries = entries.filter(e => e.item.rx);

                 // Save prescription to history
                 const saved = [...savedPrescriptions, { name: uploadedFiles.all, date: new Date().toISOString() }];
                 setSavedPrescriptions(saved);
                 localStorage.setItem(SAVED_PRESCRIPTIONS_KEY, JSON.stringify(saved));

                 // Mark all Rx entries as pending
                 const updated = {};
                 rxEntries.forEach(e => { updated[e.key] = 'pending'; });
                 setRxStatus(updated);
                 setRxRejection({});
                 setUploadedFiles({});
                 setShowRxModal(false);
                 toast.success('Prescription uploaded — awaiting pharmacist verification...');

                 // Call backend API for prescription verification
                 try {
                   const res = await api.dispatch(null, '/pharmacy/orders/verify-prescriptions', {
                     method: 'POST',
                     body: JSON.stringify({
                       entries: rxEntries.map(e => ({ medicineId: e.item._id || e.item.id, medicineName: e.item.name })),
                       file: uploadedFiles.all,
                     })
                   });

                   if (res?.verified) {
                     setRxStatus(prev => {
                       const verified = { ...prev };
                       rxEntries.forEach(e => { verified[e.key] = 'verified'; });
                       return verified;
                     });
                     toast.success('✅ Prescription verified by pharmacist!');
} else {
                      const reason = res?.reason || REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)];
                      setRxStatus(prev => {
                        const rejected = { ...prev };
                        rxEntries.forEach(e => { rejected[e.key] = 'rejected'; });
                        return rejected;
                      });
                      setRxRejection(prev => {
                        const r = { ...prev };
                        rxEntries.forEach(e => { r[e.key] = reason; });
                        return r;
                      });
                      toast.error(`❌ Prescription rejected: ${reason}`);
                     const started = autoRetry.startRetry(reason, { originalTotal: itemTotal, entries, stores });
                     if (!started) {
                       toast.info('Enable auto-retry in settings to automatically try your next preferred pharmacy.');
                     }
                   }
} catch {
                    // Backend not available, simulate for demo
                   setTimeout(() => {
                     if (Math.random() < 0.4) {
                       setRxStatus(prev => {
                         const verified = { ...prev };
                         rxEntries.forEach(e => { verified[e.key] = 'verified'; });
                         return verified;
                       });
                       toast.success('✅ Prescription verified by pharmacist!');
                     } else {
                       const reason = REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)].label;
                       setRxStatus(prev => {
                         const rejected = { ...prev };
                         rxEntries.forEach(e => { rejected[e.key] = 'rejected'; });
                         return rejected;
                       });
                       setRxRejection(prev => {
                         const r = { ...prev };
                         rxEntries.forEach(e => { r[e.key] = reason; });
                         return r;
                       });
                       toast.error(`❌ Prescription rejected: ${reason}`);
                       const started = autoRetry.startRetry(reason, { originalTotal: itemTotal, entries, stores });
                       if (!started) {
                         toast.info('Enable auto-retry in settings to automatically try your next preferred pharmacy.');
                       }
                     }
                   }, 2000);
                 }
               }}>
                 Upload & Submit
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowRxModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
