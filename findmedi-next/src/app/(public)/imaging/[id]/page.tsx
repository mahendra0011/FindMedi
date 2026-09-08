/**
 * Imaging center detail page — Server Component (SEO-critical).
 * Shows imaging center details and available imaging services.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Phone, Calendar, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchCenter(id: string): Promise<Facility | null> {
  try {
    return await api.facilities.getOne(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const center = await fetchCenter(id);
  if (!center) return { title: 'Center Not Found' };
  return {
    title: `${center.name} | FindMedi Imaging`,
    description: `${center.name} - ${center.address || ''}`,
  };
}

export default async function ImagingCenterPage({ params }: PageProps) {
  const { id } = await params;
  const center = await fetchCenter(id);

  if (!center) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {center.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{center.name}</h1>
            <div className="flex items-center mt-2 gap-4">
              {center.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1">{center.rating} rating</span>
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {center.city || center.state}
              </div>
            </div>
            {center.phone && (
              <div className="flex items-center mt-1 text-muted-foreground">
                <Phone className="h-4 w-4 mr-1" />
                {center.phone}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Scan
            </Button>
          </div>

          {center.aerbNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm"><strong>AERB Number:</strong> {center.aerbNumber}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Imaging Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted rounded-full text-sm">X-Ray</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Ultrasound</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">CT Scan</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">MRI</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Mammography</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
