/**
 * Order tracking page — Server Component.
 * Shows order status and delivery progress for a given order ID.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orderId } = await params;
  return {
    title: `Order #${orderId} Tracking | FindMedi`,
    description: `Track your order #${orderId} status and delivery progress.`,
  };
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Order #{orderId}</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span>Ordered</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span>Processing</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <Truck className="h-5 w-5 text-blue-500" />
              <span>Out for delivery</span>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Delivered</span>
            </div>
          </CardContent>
        </Card>

        <Button asChild variant="outline">
          <Link href="/medicine-store">Back to Medicine Store</Link>
        </Button>
      </div>
    </div>
  );
}
