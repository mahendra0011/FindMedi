/**
 * Hospitals listing page — Server Component (SEO-critical).
 * Ported from client/src/pages/HospitalDirectory.jsx.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { Hospital } from '@/types/models/hospital';
import type { ListParams } from '@/types/api';

interface SearchParams {
  search?: string;
  city?: string;
  page?: string;
  limit?: string;
}

export const metadata = {
  title: 'Find Hospitals Near You | FindMedi',
  description: 'Browse and find the best hospitals and clinics across India with verified doctors and facilities.',
};

async function fetchHospitals(searchParams: SearchParams): Promise<Hospital[]> {
  const params: ListParams = {};
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.city) params.city = searchParams.city;
  if (searchParams.page) params.page = parseInt(searchParams.page, 10);
  if (searchParams.limit) params.limit = parseInt(searchParams.limit, 10);
  try {
    const res = await api.hospitals.get(params);
    if (Array.isArray(res)) return res;
    return (res as any)?.hospitals || (res as any)?.data || [];
  } catch {
    return [];
  }
}

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const hospitals = await fetchHospitals(params).catch(() => []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Find Hospitals & Clinics</h1>
        <p className="text-muted-foreground mt-1">
          {hospitals.length} hospitals and clinics found
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hospitals.map((hospital: Hospital) => (
          <Card key={hospital._id} className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">{hospital.name}</CardTitle>
                {hospital.rating && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm">{hospital.rating}</span>
                  </div>
                )}
              </div>
              <CardDescription>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {hospital.address || hospital.city || hospital.state}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-4">
              <Button className="w-full" size="sm" asChild>
                <a href={`/hospitals/${hospital._id}`}>View Details</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {hospitals.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No hospitals found. Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
