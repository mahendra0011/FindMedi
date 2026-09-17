/**
 * Hospital detail page — Server Component (SEO-critical).
 * Ported from client/src/pages/HospitalProfile.jsx.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Phone, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import type { Hospital } from '@/types/models/hospital';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchHospital(slug: string): Promise<Hospital | null> {
  try {
    return await api.hospitals.getOne(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const hospital = await fetchHospital(slug);
  if (!hospital) return { title: 'Hospital Not Found' };
  return {
    title: `${hospital.name} | FindMedi`,
    description: `${hospital.name} - ${hospital.address || ''}`,
  };
}

export default async function HospitalProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const hospital = await fetchHospital(slug);

  if (!hospital) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {hospital.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{hospital.name}</h1>
            <div className="flex items-center mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 font-medium">{hospital.rating ?? 4.0} rating</span>
            </div>
            <div className="flex items-center mt-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              {hospital.address || hospital.city || hospital.state}
            </div>
            {hospital.phone && (
              <div className="flex items-center mt-1 text-muted-foreground">
                <Phone className="h-4 w-4 mr-1" />
                {hospital.phone}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              {hospital.specialties && hospital.specialties.length > 0 ? (
                <ul className="space-y-2">
                  {hospital.specialties.map((service: string, i: number) => (
                    <li key={i} className="text-sm">• {service}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No services listed</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
