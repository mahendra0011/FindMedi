/**
 * Clinic detail page — Server Component (SEO-critical).
 * Shows a single clinic with its doctors and services.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Phone, Calendar, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchClinic(id: string): Promise<Facility | null> {
  try {
    return await api.facilities.getOne(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const clinic = await fetchClinic(id);
  if (!clinic) return { title: 'Clinic Not Found' };
  return {
    title: `${clinic.name} | FindMedi Clinic`,
    description: `${clinic.name} - ${clinic.address || ''}`,
  };
}

export default async function ClinicDetailPage({ params }: PageProps) {
  const { id } = await params;
  const clinic = await fetchClinic(id);

  if (!clinic) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {clinic.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{clinic.name}</h1>
            <div className="flex items-center mt-2 gap-4">
              {clinic.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1">{clinic.rating} rating</span>
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {clinic.city || clinic.state}
              </div>
            </div>
            {clinic.phone && (
              <div className="flex items-center mt-1 text-muted-foreground">
                <Phone className="h-4 w-4 mr-1" />
                {clinic.phone}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" asChild>
              <a href={`/clinic/${clinic._id}#doctors`}>
                <Stethoscope className="h-4 w-4 mr-2" />
                View All Doctors
              </a>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {clinic.description && <p className="text-sm">{clinic.description}</p>}
              {clinic.address && <p className="text-sm"><strong>Address:</strong> {clinic.address}</p>}
              {clinic.licenseNumber && <p className="text-sm"><strong>License:</strong> {clinic.licenseNumber}</p>}
              {clinic.workingHours && <p className="text-sm"><strong>Working Hours:</strong> {clinic.workingHours}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
