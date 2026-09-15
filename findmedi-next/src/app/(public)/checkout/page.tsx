/**
 * Checkout page — Client Component.
 * Ported from client/src/pages/Checkout.jsx.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { stores, totalItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect to cart when empty.  Guarded inside useEffect so the router call
  // only runs client-side — calling it during render breaks static prerendering
  // with "ReferenceError: location is not defined".
  useEffect(() => {
    if (totalItems === 0) {
      router.replace('/cart');
    }
  }, [totalItems, router]);

  if (totalItems === 0) {
    return null;
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      await api.appointments.create({});
      router.push('/order-confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Full Name" />
              <Input placeholder="Phone Number" type="tel" />
              <Input placeholder="Address" />
              <Input placeholder="City" />
              <Input placeholder="State" />
              <Input placeholder="Pincode" />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {stores.map((store) => (
                <div key={store.storeId} className="mb-4 last:mb-0">
                  <p className="font-medium">{store.storeId}</p>
                  <p className="text-sm text-muted-foreground">
                    {store.items.length} items — ₹{store.subtotal}
                  </p>
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <p className="font-semibold text-lg">Total: ₹0</p>
              </div>
              {error && <p className="text-sm text-destructive mt-4">{error}</p>}
              <Button className="w-full mt-4" onClick={handleCheckout} disabled={loading}>
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
