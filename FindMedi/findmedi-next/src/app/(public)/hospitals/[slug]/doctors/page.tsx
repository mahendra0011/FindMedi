/**
 * Hospital doctors listing — Server Component (SEO-critical).
 * Lists all doctors affiliated with a hospital.
 */
import { notFound } from 'next/navigation';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import type { Hospital } from '@/types/models/hospital';
import type { Doctor } from '@/types/models/doctor';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchHospital(id: string): Promise<Hospital | null> {
  try {
    return await api.hospitals.getOne(id);
  } catch {
    return null;
  }
}

async function fetchDoctors(hospitalId: string): Promise<Doctor[]> {
  return api.doctors.get({ hospitalId });
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const hospital = await fetchHospital(slug);
  if (!hospital) return { title: 'Doctors Not Found' };
  return {
    title: `Doctors at ${hospital.name} | FindMedi`,
    description: `Browse all doctors affiliated with ${hospital.name}.`,
  };
}

export default async function HospitalDoctorsPage({ params }: PageProps) {
  const { slug } = await params;
  const hospital = await fetchHospital(slug);
  if (!hospital) notFound();

  const doctors = await fetchDoctors(slug).catch(() => []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Doctors at {hospital.name}</h1>
        <p className="text-muted-foreground mt-1">
          {doctors.length} doctors available
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor: Doctor) => (
          <Card key={doctor._id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{doctor.name}</CardTitle>
                  <CardDescription>
                    {doctor.specialization}
                  </CardDescription>
                  <div className="flex items-center mt-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1">{doctor.rating ?? 4.5}</span>
                  </div>
                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <Stethoscope className="h-4 w-4 mr-1" />
                    <span>{doctor.qualifications}</span>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4" size="sm" asChild>
                <a href={`/doctors/${doctor._id}`}>View Profile</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {doctors.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            No doctors found at this hospital.
          </p>
        </div>
      )}
    </div>
  );
}
