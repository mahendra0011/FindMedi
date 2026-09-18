/**
 * Doctor detail page — Server Component (SEO-critical).
 * Ported from client/src/pages/DoctorProfile.jsx.
 *
 * Fetches a single doctor by ID and renders their profile with SSR.
 */
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Calendar, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Doctor } from '@/types/models/doctor';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchDoctor(id: string): Promise<Doctor | null> {
  try {
    return await api.doctors.getOne(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const doctor = await fetchDoctor(id);
  if (!doctor) return { title: 'Doctor Not Found' };
  return {
    title: `${doctor.name}, ${doctor.specialization} | FindMedi`,
    description: `Book an appointment with Dr. ${doctor.name}, a ${doctor.specialization} specialist.`,
  };
}

export default async function DoctorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const doctor = await fetchDoctor(id);

  if (!doctor) notFound();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground">
              {doctor.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{doctor.name}</h1>
            <p className="text-lg text-muted-foreground">{doctor.specialization}</p>
            <div className="flex items-center mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 font-medium">{doctor.rating ?? 4.5} (rating)</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{doctor.qualifications}</p>
          </div>

          {doctor.consultation_fees && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">₹{doctor.consultation_fees}</p>
                <p className="text-sm text-muted-foreground">Consultation fee</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
