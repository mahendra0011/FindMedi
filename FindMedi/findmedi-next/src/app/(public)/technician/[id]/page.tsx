/**
 * Technician profile page — Server Component (SEO-critical).
 * Shows a single lab technician's profile and availability.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Award, Calendar } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Technician Profile | FindMedi`,
    description: `View technician profile and book appointments.`,
  };
}

export default async function TechnicianProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              Tech
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Lab Technician</h1>
            <p className="text-muted-foreground mt-1">ID: {id}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Qualifications</h3>
            <p className="text-sm text-muted-foreground">
              Certified Medical Laboratory Technician with 5+ years of experience.
            </p>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
