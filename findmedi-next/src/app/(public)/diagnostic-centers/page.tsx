/**
 * Diagnostic Centers listing — Server Component (SEO-critical).
 * Ported from client/src/pages/DiagnosticCenters.jsx.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Microscope, MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { Facility } from '@/types/models/facility';
import type { ListParams } from '@/types/api';

interface SearchParams {
  search?: string;
  city?: string;
  page?: string;
  limit?: string;
}

async function fetchCenters(params: SearchParams): Promise<Facility[]> {
  const p: ListParams = { type: 'lab' };
  if (params.search) p.search = params.search;
  if (params.city) p.city = params.city;
  if (params.page) p.page = parseInt(params.page, 10);
  if (params.limit) p.limit = parseInt(params.limit, 10);
  return api.facilities.get(p);
}

export const metadata = {
  title: 'Find Diagnostic Centers | FindMedi',
  description: 'Book diagnostic tests at NABL-certified labs and imaging centers across India.',
};

export default async function DiagnosticCentersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const centers = await fetchCenters(params);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Diagnostic Centers</h1>
        <p className="text-muted-foreground mt-1">
          {centers.length} labs and imaging centers found
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {centers.map((center: Facility) => (
          <Card key={center._id} className="h-full">
            <CardHeader>
              <CardTitle>{center.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {center.city || center.state}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {center.rating && (
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 text-sm">{center.rating}</span>
                </div>
              )}
              <Button className="w-full" size="sm" asChild>
                <a href={`/diagnostic-centers/${center._id}`}>View Details</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {centers.length === 0 && (
        <div className="text-center py-12">
          <Microscope className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No diagnostic centers found.</p>
        </div>
      )}
    </div>
  );
}
