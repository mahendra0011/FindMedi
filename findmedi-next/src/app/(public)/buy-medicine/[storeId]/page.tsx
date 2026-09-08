/**
 * Buy medicine store page — Server Component (SEO-critical).
 * Shows a single pharmacy's medicines for browsing.
 */
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, MapPin } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';

interface PageProps {
  params: Promise<{ storeId: string }>;
}

async function fetchPharmacy(storeId: string): Promise<Facility | null> {
  try {
    return await api.facilities.getOne(storeId);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { storeId } = await params;
  const pharmacy = await fetchPharmacy(storeId);
  if (!pharmacy) return { title: 'Pharmacy Not Found' };
  return {
    title: `${pharmacy.name} | FindMedi Pharmacy`,
    description: `${pharmacy.name} - ${pharmacy.address || ''}`,
  };
}

export default async function BuyMedicineStorePage({ params }: PageProps) {
  const { storeId } = await params;
  const pharmacy = await fetchPharmacy(storeId);

  if (!pharmacy) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{pharmacy.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span>{pharmacy.city || pharmacy.state}</span>
            {pharmacy.rating && (
              <>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{pharmacy.rating}</span>
              </>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href="/cart">
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Medicines</CardTitle>
          <CardDescription>
            Browse and add medicines to your cart for home delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Medicine listings are loaded from the pharmacy inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
