/**
 * Cart page — Client Component.
 * Ported from client/src/pages/Cart.jsx.
 *
 * Uses the Redux cart store (useCart hook) which persists to localStorage.
 */
'use client';

import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const { entries, totalItems, stores, removeItem, updateQty, clearCart } = useCart();

  if (totalItems === 0) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-semibold mb-4">Your Cart is Empty</h2>
        <Button asChild>
          <Link href="/buy-medicine">Browse Medicine Store</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {stores.map((store) => (
        <Card key={store.storeId} className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">{store.storeId}</CardTitle>
          </CardHeader>
          <CardContent>
            {store.items.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{entry.item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{entry.item.price} × {entry.qty}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={entry.qty}
                    onChange={(e) => entry.key && updateQty(entry.key, parseInt(e.target.value, 10))}
                    className="w-12 text-center border rounded"
                  />
                  <Button variant="ghost" size="sm" onClick={() => entry.key && removeItem(entry.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="mt-4 text-right font-semibold">
              Subtotal: ₹{store.subtotal}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center mt-6">
        <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
        <Button asChild>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
