/**
 * Doctors listing — Server Component (SEO-critical).
 * Ported from client/src/pages/Doctors.jsx.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, MapPin, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import type { Doctor } from '@/types/models/doctor';
import type { ListParams } from '@/types/api';

interface SearchParams {
  search?: string;
  specialization?: string;
  page?: string;
  limit?: string;
}

export const metadata = {
  title: 'Find Doctors Near You | FindMedi',
  description: 'Browse and book appointments with verified doctors across all specialties in India.',
};

async function fetchDoctors(searchParams: SearchParams): Promise<Doctor[]> {
  const params: ListParams = {};
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.specialization) params.specialization = searchParams.specialization;
  if (searchParams.page) params.page = parseInt(searchParams.page, 10);
  if (searchParams.limit) params.limit = parseInt(searchParams.limit, 10);
  try {
    const res = await api.doctors.get(params);
    const r = res as { doctors?: Doctor[]; data?: Doctor[] };
    return r?.doctors || r?.data || [];
  } catch {
    return [];
  }
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const doctors = await fetchDoctors(params).catch(() => []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Find Doctors</h1>
        <p className="text-muted-foreground mt-1">
          {doctors.length} verified doctors available for consultation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {doctors.map((doctor: Doctor) => (
          <Card key={doctor._id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{doctor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{doctor.specialization}</p>
                  <div className="flex items-center mt-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1">{doctor.rating ?? 4.5}</span>
                  </div>
                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="ml-1">{doctor.hospitalId || 'Multiple locations'}</span>
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
          <p className="text-muted-foreground mt-4">No doctors found. Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
