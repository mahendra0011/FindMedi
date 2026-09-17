/**
 * Payment gateway page — Client Component.
 * Handles payment selection and processing for orders/appointments.
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Banknote, Wallet } from 'lucide-react';

export default function PaymentGatewayPage() {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'upi' | 'cash'>('card');

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Payment</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === 'card' ? 'border-primary bg-muted' : 'border-border'
            }`}
            onClick={() => setSelectedMethod('card')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              <span>Credit / Debit Card</span>
            </div>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === 'upi' ? 'border-primary bg-muted' : 'border-border'
            }`}
            onClick={() => setSelectedMethod('upi')}
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5" />
              <span>UPI Payment</span>
            </div>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === 'cash' ? 'border-primary bg-muted' : 'border-border'
            }`}
            onClick={() => setSelectedMethod('cash')}
          >
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5" />
              <span>Cash on Delivery</span>
            </div>
          </div>

          <Button className="w-full mt-4">
            Pay Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
