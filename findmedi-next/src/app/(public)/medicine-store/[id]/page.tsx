/**
 * Pharmacy detail page — Server Component (SEO-critical).
 * Shows a single pharmacy / medicine store with its medicines.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Phone, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchPharmacy(id: string): Promise<Facility | null> {
  try {
    return await api.facilities.getOne(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const pharmacy = await fetchPharmacy(id);
  if (!pharmacy) return { title: 'Pharmacy Not Found' };
  return {
    title: `${pharmacy.name} | FindMedi Pharmacy`,
    description: `${pharmacy.name} - ${pharmacy.address || ''}`,
  };
}

export default async function PharmacyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pharmacy = await fetchPharmacy(id);

  if (!pharmacy) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {pharmacy.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{pharmacy.name}</h1>
            <div className="flex items-center mt-2 gap-4">
              {pharmacy.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1">{pharmacy.rating} rating</span>
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {pharmacy.city || pharmacy.state}
              </div>
            </div>
            {pharmacy.phone && (
              <div className="flex items-center mt-1 text-muted-foreground">
                <Phone className="h-4 w-4 mr-1" />
                {pharmacy.phone}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Order Medicines
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{pharmacy.description || 'No description available'}</p>
              {pharmacy.address && <p className="text-sm"><strong>Address:</strong> {pharmacy.address}</p>}
              {pharmacy.licenseNumber && <p className="text-sm"><strong>License:</strong> {pharmacy.licenseNumber}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
