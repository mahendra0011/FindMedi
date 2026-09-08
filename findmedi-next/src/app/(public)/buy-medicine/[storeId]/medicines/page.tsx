/**
 * Buy medicine — medicines listing page — Server Component (SEO-critical).
 * Shows the medicine inventory for a given pharmacy store.
 */
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
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
  return {
    title: `Medicines | FindMedi Pharmacy`,
    description: 'Browse all available medicines from this pharmacy.',
  };
}

export default async function MedicinesPage({ params }: PageProps) {
  const { storeId } = await params;
  const pharmacy = await fetchPharmacy(storeId);

  if (!pharmacy) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Medicines — {pharmacy.name}</h1>
        <Button asChild variant="outline">
          <Link href={`/buy-medicine/${storeId}`}>
            Back to Store
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medicine Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Loading medicine listings from {pharmacy.name}...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
