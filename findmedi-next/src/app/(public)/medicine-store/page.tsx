/**
 * Medicine Store listing — Server Component (SEO-critical).
 * Ported from client/src/pages/BuyMedicine.jsx.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';
import type { ListParams } from '@/types/api';

async function fetchPharmacies(): Promise<Facility[]> {
  try {
    const res = await api.facilities.get({ type: 'pharmacy' } as ListParams);
    if (Array.isArray(res)) return res;
    return (res as any)?.facilities || (res as any)?.data || [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: 'Buy Medicines Online | FindMedi Pharmacy',
  description: 'Order medicines with home delivery from verified pharmacies across India.',
};

export default async function MedicineStorePage() {
  const pharmacies = await fetchPharmacies().catch(() => []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Medicine Store</h1>
        <p className="text-muted-foreground mt-1">
          Order medicines with home delivery from verified pharmacies
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pharmacies.map((pharmacy: Facility) => (
          <Card key={pharmacy._id} className="h-full">
            <CardHeader>
              <CardTitle>{pharmacy.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {pharmacy.city || pharmacy.state}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pharmacy.rating && (
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 text-sm">{pharmacy.rating}</span>
                </div>
              )}
              <Button className="w-full" size="sm" asChild>
                <a href={`/medicine-store/${pharmacy._id}`}>View Store</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {pharmacies.length === 0 && (
        <div className="text-center py-12">
          <Pill className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No pharmacies found.</p>
        </div>
      )}
    </div>
  );
}
