import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  UtensilsCrossed, Plus, Search, Clock, CheckCircle2, AlertTriangle,
  ChefHat, Package, TrendingUp, Leaf, Flame,
} from 'lucide-react';

interface CanteenItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  stockDailyLimit?: number;
  soldToday: number;
}

interface CanteenOrder {
  _id: string;
  orderNumber: string;
  staffId?: { name: string; employeeId: string };
  items: { name: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  status: string;
  mealTime: string;
  placedAt: string;
}

interface Stats {
  pending: number;
  preparing: number;
  ready: number;
  deliveredToday: number;
  revenueToday: number;
  totalItems: number;
}

const STATUS_COLORS: Record<string, string> = {
  Placed: 'bg-blue-100 text-blue-800',
  Preparing: 'bg-yellow-100 text-yellow-800',
  Ready: 'bg-green-100 text-green-800',
  Delivered: 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export default function CanteenPage() {
  const [tab, setTab] = useState<'menu' | 'orders' | 'kitchen'>('menu');
  const [items, setItems] = useState<CanteenItem[]>([]);
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', category: 'Snacks', price: 0, isVeg: true });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, itemsRes, ordersRes] = await Promise.all([
        api.get('/canteen/stats'),
        api.get('/canteen/items'),
        api.get('/canteen/orders'),
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data.items || []);
      setOrders(ordersRes.data.orders || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load canteen data');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async () => {
    try {
      await api.post('/canteen/items', itemForm);
      toast.success('Menu item added');
      setItemModalOpen(false);
      setItemForm({ name: '', category: 'Snacks', price: 0, isVeg: true });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/canteen/orders/${id}/status`, { status });
      toast.success(`Order ${status}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    }
  };

  const filteredItems = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
            Staff Canteen & Pantry
          </h1>
          <p className="text-muted-foreground mt-1">Menu management, order tracking, kitchen dashboard</p>
        </div>
        <Button onClick={() => setItemModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Menu Item
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-600' },
            { label: 'Preparing', value: stats.preparing, icon: ChefHat, color: 'text-yellow-600' },
            { label: 'Ready', value: stats.ready, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Delivered Today', value: stats.deliveredToday, icon: Package, color: 'text-gray-600' },
            { label: 'Revenue Today', value: `₹${stats.revenueToday}`, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Menu Items', value: stats.totalItems, icon: UtensilsCrossed, color: 'text-orange-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(['menu', 'orders', 'kitchen'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'ghost'} onClick={() => setTab(t)} className="capitalize">
            {t}
          </Button>
        ))}
      </div>

      {tab === 'menu' && (
        <div className="space-y-4">
          <Input placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {item.isVeg ? <Leaf className="w-3 h-3 text-green-600" /> : <Flame className="w-3 h-3 text-red-600" />}
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge variant="outline">₹{item.price}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Sold today: {item.soldToday}{item.stockDailyLimit ? ` / ${item.stockDailyLimit}` : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order._id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.staffId?.name || 'Staff'} · {order.mealTime} · ₹{order.totalAmount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                  {order.status === 'Placed' && (
                    <Button size="sm" onClick={() => updateOrderStatus(order._id, 'Preparing')}>Start</Button>
                  )}
                  {order.status === 'Preparing' && (
                    <Button size="sm" onClick={() => updateOrderStatus(order._id, 'Ready')}>Ready</Button>
                  )}
                  {order.status === 'Ready' && (
                    <Button size="sm" onClick={() => updateOrderStatus(order._id, 'Delivered')}>Deliver</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'kitchen' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Placed', 'Preparing', 'Ready'].map((status) => (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{status} Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orders.filter((o) => o.status === status).map((o) => (
                  <div key={o._id} className="p-2 bg-muted rounded text-sm">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-muted-foreground">{o.items.map((i) => i.name).join(', ')}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Item Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Special Diet', 'Supplements'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Price (₹)" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })} />
            <Select value={itemForm.isVeg ? 'veg' : 'nonveg'} onValueChange={(v) => setItemForm({ ...itemForm, isVeg: v === 'veg' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="nonveg">Non-Vegetarian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>Cancel</Button>
            <Button onClick={createItem} disabled={!itemForm.name || itemForm.price <= 0}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
