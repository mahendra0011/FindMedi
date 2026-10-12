import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ShoppingCart, Store, Package, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface StoreInfo {
  _id: string;
  name: string;
  type: string;
  location?: string;
}

interface StockItem {
  _id: string;
  medicineId?: { name: string; genericName?: string };
  productId?: { name: string };
  storeId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  mrp: number;
}

export default function MultiStoreCheckoutPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [cart, setCart] = useState<{ item: StockItem; qty: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStores(); }, []);

  const loadStores = async () => {
    try {
      const res = await api.get('/stores');
      setStores(res.data.stores || res.data || []);
    } catch {
      toast.error('Failed to load stores');
    }
  };

  const loadStock = async (storeId: string) => {
    setSelectedStore(storeId);
    setLoading(true);
    try {
      const res = await api.get(`/inventory?storeId=${storeId}`);
      setStock(res.data.items || res.data.stock || res.data || []);
    } catch {
      toast.error('Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: StockItem) => {
    const name = item.medicineId?.name || item.productId?.name || 'Item';
    const existing = cart.find((c) => c.item._id === item._id);
    if (existing) {
      setCart(cart.map((c) => c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1 }]);
    }
    toast.success(`${name} added to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item._id !== itemId));
  };

  const total = cart.reduce((sum, c) => sum + (c.item.mrp * c.qty), 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      // Check if items span multiple stores
      const storeIds = [...new Set(cart.map((c) => c.item.storeId))];
      if (storeIds.length > 1) {
        toast.warning('Items from multiple stores — processing as split order');
      }
      // Create order via existing checkout
      const orderItems = cart.map((c) => ({
        inventoryId: c.item._id,
        quantity: c.qty,
        price: c.item.mrp,
      }));
      await api.post('/checkout/intents', { items: orderItems, storeIds });
      toast.success('Checkout successful');
      setCart([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.includes('MULTI_STORE')) {
        toast.error('Multi-store checkout requires single-store selection. Please filter by one store.');
      } else {
        toast.error(msg || 'Checkout failed');
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          Multi-Store Checkout
        </h1>
        <p className="text-muted-foreground mt-1">Browse inventory across stores, unified cart checkout</p>
      </div>

      {/* Store Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" /> Select Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stores.map((store) => (
              <Button
                key={store._id}
                variant={selectedStore === store._id ? 'default' : 'outline'}
                onClick={() => loadStock(store._id)}
                className="h-auto p-3 flex-col"
              >
                <span className="font-medium">{store.name}</span>
                <span className="text-xs opacity-70">{store.type}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedStore ? 'Available Stock' : 'Select a store to view stock'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-muted-foreground">Loading stock...</p>}
              {!loading && selectedStore && stock.map((item) => {
                const name = item.medicineId?.name || item.productId?.name || 'Item';
                return (
                  <div key={item._id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{name}</p>
                      {item.batchNumber && (
                        <p className="text-xs text-muted-foreground">
                          Batch: {item.batchNumber} · MRP: ₹{item.mrp} · Qty: {item.quantity}
                        </p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(item)} disabled={item.quantity <= 0}>
                      Add
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-sm">Cart is empty</p>
              ) : (
                <>
                  {cart.map((c) => {
                    const name = c.item.medicineId?.name || c.item.productId?.name || 'Item';
                    return (
                      <div key={c.item._id} className="flex items-center justify-between text-sm">
                        <div>
                          <p>{name}</p>
                          <p className="text-muted-foreground">x{c.qty} · ₹{c.item.mrp * c.qty}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFromCart(c.item._id)}>×</Button>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={checkout} disabled={cart.length === 0}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
