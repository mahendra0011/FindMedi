/**
 * Lab detail page — Server Component (SEO-critical).
 * Shows a single diagnostic lab with available tests.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Phone, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchLab(id: string): Promise<Facility | null> {
  try {
    return await api.facilities.getOne(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const lab = await fetchLab(id);
  if (!lab) return { title: 'Lab Not Found' };
  return {
    title: `${lab.name} | FindMedi Labs`,
    description: `${lab.name} - ${lab.address || ''}`,
  };
}

export default async function LabDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lab = await fetchLab(id);

  if (!lab) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {lab.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{lab.name}</h1>
            <div className="flex items-center mt-2 gap-4">
              {lab.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1">{lab.rating} rating</span>
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {lab.city || lab.state}
              </div>
            </div>
            {lab.phone && (
              <div className="flex items-center mt-1 text-muted-foreground">
                <Phone className="h-4 w-4 mr-1" />
                {lab.phone}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Test
            </Button>
          </div>

          {lab.nablNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm"><strong>NABL Number:</strong> {lab.nablNumber}</p>
                {lab.pathologistName && <p className="text-sm"><strong>Pathologist:</strong> {lab.pathologistName}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Blood Tests</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Urine Tests</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Biopsy</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">Histopathology</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
