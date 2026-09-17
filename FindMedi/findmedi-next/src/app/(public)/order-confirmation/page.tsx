/**
 * Order confirmation page — Client Component.
 * Shows order summary after checkout.
 */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package } from 'lucide-react';
import Link from 'next/link';

export default function OrderConfirmationPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for your order. Your order has been placed successfully.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              An order confirmation email has been sent to your registered email address.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/medicine-store">
              <Package className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/order-tracking">View Order Status</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
