import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, Phone, Mail, Clock, Store, BadgeCheck, Truck, ShoppingBag, ArrowRight, Home, FileText, Printer, Share2, AlertTriangle, RotateCcw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIds = searchParams.get('orderIds')?.split(',') || [];
  const storeIds  = searchParams.get('stores')?.split(',') || [];
  const hasRx     = searchParams.get('rx') === 'true';
  const flowType  = searchParams.get('type') || 'medicine';
  const { entries, stores, clearCart } = useCart();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(30);
  const [confirmed, setConfirmed] = useState(false);
  const [snapshotStores, setSnapshotStores] = useState(null);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const [storeNames, setStoreNames] = useState({});

  const getStore = (storeId) => {
    const name = storeNames[storeId];
    return name ? { id: storeId, name } : { id: storeId, name: 'Store' };
  };

  useEffect(() => {
    const load = async () => {
      if (storeIds.length > 0) {
        try {
          const facilities = await api.getFacilities({ type: 'pharmacy' });
          const list = Array.isArray(facilities) ? facilities : facilities?.facilities || [];
          const map = {};
          list.forEach(f => { map[f._id] = f.name; map[f.id] = f.name; });
          storeIds.forEach(sid => {
            if (sid) {
              const found = list.find(f => f._id === sid || f.id === sid);
              if (found) map[sid] = found.name;
            }
          });
          setStoreNames(map);
        } catch {}
      }
    };
    load();
  }, []);

  const displayStores = snapshotStores ?? stores;
  const displayTotal = snapshotStores !== null ? snapshotTotal : entries.reduce((s, e) => s + e.item.price * e.qty, 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(timer); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/10 dark:to-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        {/* Success Animation */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Order Placed Successfully!</h1>
        <p className="text-muted-foreground mb-2">Thank you for your order. Your medicines are on their way.</p>

        {/* Per-store order IDs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {displayStores.map((st, i) => {
            const store = getStore(st.storeId);
            return (
              <Badge key={st.storeId} className="text-sm px-4 py-1.5 bg-primary/10 text-primary border-primary/20 font-mono">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> {orderIds[i] || `ORD${i + 1}`} — {store?.name}
              </Badge>
            );
          })}
        </div>

        {/* Notification Simulation */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 mb-6 text-left flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-600 shrink-0 animate-pulse" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold">Confirmation sent</p>
            <p>Email to <strong>{user?.email || 'your email'}</strong> &bull; SMS to <strong>{user?.phone || 'your phone'}</strong></p>
          </div>
        </div>

        {/* Delivery Countdown */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 mb-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Estimated Delivery</p>
              <p className="text-sm text-muted-foreground">
                {countdown > 0
                  ? `Your order will be delivered in approximately ${countdown} minutes`
                  : 'Your order has been delivered!'}
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${((30 - countdown) / 30) * 100}%` }} />
          </div>
        </div>

        {/* Store-wise Items */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 text-left">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Order Items
          </h3>
          {displayStores.map((st, i) => {
            const store = getStore(st.storeId);
            return (
              <div key={st.storeId} className={cn('pb-3', i < displayStores.length - 1 && 'mb-3 border-b border-border/30')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{store?.name}</span>
                  </div>
                  <Badge className="text-[10px] bg-primary/10 text-primary font-mono">{orderIds[i]}</Badge>
                </div>
                {st.items.map(e => (
                  <div key={e.key} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground">{e.item.name} x{e.qty}</span>
                    <span className="font-medium text-foreground">₹{e.item.price * e.qty}</span>
                  </div>
                ))}
                <div className="flex justify-between mt-2 pt-2 border-t border-border/20">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-semibold text-foreground">₹{st.subtotal}</span>
                </div>
              </div>
            );
          })}
          <Separator className="my-3" />
          <div className="flex justify-between text-base font-bold">
            <span>Total Paid</span>
            <span className="text-primary">₹{displayTotal}</span>
          </div>
        </div>

        {/* Partial Fulfillment Refund Notice */}
        {searchParams.get('refunded') === 'true' && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Partial Refund Processed</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Some prescription-required items could not be processed due to prescription issues. 
                  Refund of <strong>₹{searchParams.get('refundAmount') || '0'}</strong> has been initiated for the following items:
                </p>
                <ul className="mt-2 space-y-1">
                  {searchParams.get('refundItems')?.split(',').map((item, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {item.trim()}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Refund will be credited within 3-5 business days to your original payment method.</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 text-left">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Delivery Address</h4>
              <p className="text-sm text-muted-foreground mt-1">123, Health Avenue, Block C, Downtown, New York, NY 10001</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-center">
          {displayStores.map((st, i) => {
            const tid = orderIds[i];
            return (
              <Button key={st.storeId} className="gap-2 rounded-xl flex-1" onClick={() =>               navigate(`/order-tracking/${tid}?rx=${hasRx}&storeId=${st.storeId}&type=${flowType}`)}>
                <Truck className="w-4 h-4" /> Track {storeIds.length > 1 ? `Order ${i + 1}` : 'Order'}
              </Button>
            );
          })}
          <Button variant="outline" className="gap-2 rounded-xl flex-1" onClick={() => navigate('/buy-medicine')}>
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl flex-1" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          A confirmation email and SMS has been sent to your registered contact.
        </p>
      </div>
    </div>
  );
}
