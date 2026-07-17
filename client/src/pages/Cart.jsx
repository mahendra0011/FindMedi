import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Store, Shield, Truck, AlertCircle, Percent, Bookmark, Clock, RotateCcw, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const MOCK_STORES = [
  { id:'s1', name:'MedPlus Pharmacy', photo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop', verified:true, deliveryCharges:20, freeDeliveryAbove:200 },
  { id:'s2', name:'HealthFirst Medicals', photo:'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=300&fit=crop', verified:true, deliveryCharges:15, freeDeliveryAbove:150 },
  { id:'s3', name:'City Drug House', photo:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', verified:false, deliveryCharges:25, freeDeliveryAbove:300 },
];

export default function Cart() {
  const navigate = useNavigate();
  const { entries, stores, updateQty, removeItem, addItem, totalItems } = useCart();
  const [savedForLater, setSavedForLater] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mediCore_saved')) || {}; } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('mediCore_saved', JSON.stringify(savedForLater));
  }, [savedForLater]);

  const getStore = (storeId) => MOCK_STORES.find(s => s.id === storeId);
  const isRxItem = (item) => item.rx === true;

  const grandTotal = stores.reduce((s, st) => {
    const store = getStore(st.storeId);
    const delivery = store ? (st.subtotal >= (store.freeDeliveryAbove || Infinity) ? 0 : (store.deliveryCharges || 0)) : 0;
    return s + st.subtotal + delivery;
  }, 0);

  const handleSaveForLater = (key) => {
    const entry = entries.find(e => e.key === key);
    if (entry) {
      setSavedForLater(p => ({ ...p, [key]: entry }));
      removeItem(key);
    }
  };

  const handleRestore = (key) => {
    const saved = savedForLater[key];
    if (saved) {
      addItem(saved.item, saved.storeId);
      updateQty(key, saved.qty);
      setSavedForLater(p => { const n = { ...p }; delete n[key]; return n; });
      toast.info(`${saved.item.name} moved to cart`);
    }
  };

  const savedEntries = Object.values(savedForLater);

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">Browse medical stores and add items to get started</p>
            <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate('/buy-medicine')}>
              <Store className="w-4 h-4" /> Browse Stores
            </Button>
          </div>
          {/* Saved for Later visible even when cart is empty */}
          {savedEntries.length > 0 && (
            <div className="mt-12 bg-card rounded-2xl border border-border/60 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-heading font-semibold text-foreground">Saved for Later ({savedEntries.length})</h3>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {savedEntries.map(entry => {
                  const store = getStore(entry.storeId);
                  return (
                    <div key={entry.key} className="p-4 sm:p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 overflow-hidden shrink-0 border border-border/40">
                        <img src={entry.item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-foreground">{entry.item.name}</h4>
                        <p className="text-xs text-muted-foreground">{entry.item.brand} &bull; {entry.item.pack} &bull; Qty: {entry.qty} &bull; ₹{entry.item.price}</p>
                        {store && <p className="text-[10px] text-muted-foreground mt-0.5">{store.name}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs shrink-0" onClick={() => handleRestore(entry.key)}>
                        <RotateCcw className="w-3 h-3" /> Move to Cart
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Your Cart</h1>
            <p className="text-muted-foreground mt-1">{totalItems} item{totalItems > 1 ? 's' : ''} in {stores.length} store{stores.length > 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate('/buy-medicine')}>
            <Plus className="w-4 h-4" /> Add More Items
          </Button>
        </div>

        <div className="space-y-6">
          {stores.map((st) => {
            const store = getStore(st.storeId);
            const hasRx = st.items.some(e => isRxItem(e.item));
            const delivery = store ? (st.subtotal >= (store.freeDeliveryAbove || Infinity) ? 0 : (store.deliveryCharges || 0)) : 0;

            return (
              <div key={st.storeId} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-border/40 shrink-0">
                        <img src={store?.photo} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-heading font-semibold text-foreground">{store?.name}</h3>
                          {store?.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{st.items.length} item{st.items.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs rounded-lg" onClick={() => navigate(`/buy-medicine/${st.storeId}`)}>
                      <Store className="w-3 h-3" /> Add More
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-border/30">
                  {st.items.map((entry) => (
                    <div key={entry.key} className="p-4 sm:p-5 flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-muted/50 overflow-hidden shrink-0 border border-border/40">
                        <img src={entry.item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-heading font-semibold text-sm text-foreground">{entry.item.name}</h4>
                            <p className="text-xs text-muted-foreground">{entry.item.brand} &bull; {entry.item.pack}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-foreground">₹{entry.item.price}</span>
                              <span className="text-xs text-muted-foreground line-through">₹{entry.item.mrp}</span>
                              {entry.item.discount > 0 && (
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                  <Percent className="w-2.5 h-2.5 mr-0.5" />{entry.item.discount}% off
                                </Badge>
                              )}
                              {isRxItem(entry.item) && (
                                <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />Rx
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                          {isRxItem(entry.item) ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                              <Shield className="w-3 h-3 mr-1" /> Prescription needed
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty - 1)} disabled={entry.qty <= 1}><Minus className="w-3 h-3" /></Button>
                              <span className="w-8 text-center text-sm font-semibold">{entry.qty}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty + 1)}><Plus className="w-3 h-3" /></Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">₹{entry.item.price * entry.qty}</span>
                            <button className="text-muted-foreground hover:text-primary transition-colors" title="Save for later" onClick={() => { handleSaveForLater(entry.key); toast.info(`${entry.item.name} saved for later`); }}>
                              <Bookmark className="w-4 h-4" />
                            </button>
                            <button className="text-muted-foreground hover:text-red-500 transition-colors" onClick={() => { removeItem(entry.key); toast.success(`${entry.item.name} removed from cart`); }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Store subtotal + delivery */}
                <div className="p-4 sm:p-5 border-t border-border/40 bg-muted/10 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{st.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Delivery</span>
                    <span className={cn('font-semibold', delivery === 0 ? 'text-emerald-600' : '')}>
                      {delivery === 0 ? 'Free' : `₹${delivery}`}
                    </span>
                  </div>
                  {hasRx && (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Prescription required items will be verified at checkout
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Store Total</span>
                    <span>₹{st.subtotal + delivery}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          {/* Saved for Later Section */}
          {savedEntries.length > 0 && (
            <div className="mt-8 bg-card rounded-2xl border border-border/60 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-heading font-semibold text-foreground">Saved for Later ({savedEntries.length})</h3>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {savedEntries.map(entry => {
                  const store = getStore(entry.storeId);
                  return (
                    <div key={entry.key} className="p-4 sm:p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 overflow-hidden shrink-0 border border-border/40">
                        <img src={entry.item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-foreground">{entry.item.name}</h4>
                        <p className="text-xs text-muted-foreground">{entry.item.brand} &bull; {entry.item.pack} &bull; Qty: {entry.qty} &bull; ₹{entry.item.price}</p>
                        {store && <p className="text-[10px] text-muted-foreground mt-0.5">{store.name}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs shrink-0" onClick={() => handleRestore(entry.key)}>
                        <RotateCcw className="w-3 h-3" /> Move to Cart
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* Bottom sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 shadow-2xl backdrop-blur-xl bg-background/95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <span className="text-base font-bold text-foreground ml-3">₹{grandTotal}</span>
          </div>
          <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20 px-8" onClick={() => navigate('/checkout')}>
            <Shield className="w-4 h-4" /> Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
