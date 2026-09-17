/**
 * All tests listing page — Server Component (SEO-critical).
 * Lists all diagnostic tests available on the platform.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Microscope, Search, MapPin } from 'lucide-react';

interface TestCategory {
  id: string;
  name: string;
  description: string;
  tests: string[];
}

const testCategories: TestCategory[] = [
  {
    id: 'blood',
    name: 'Blood Tests',
    description: 'Complete blood count, glucose, lipid profile & more',
    tests: ['CBC', 'Glucose Fasting', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test'],
  },
  {
    id: 'imaging',
    name: 'Imaging Tests',
    description: 'X-ray, Ultrasound, CT Scan, MRI & other imaging',
    tests: ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography'],
  },
  {
    id: 'urine',
    name: 'Urine Tests',
    description: 'Urine routine, culture & other urine analyses',
    tests: ['Urine Routine', 'Urine Culture', 'Urine Microscopic'],
  },
  {
    id: 'cardiac',
    name: 'Cardiac Tests',
    description: 'ECG, TMT, Echo & other cardiac assessments',
    tests: ['ECG', 'TMT Test', 'Echocardiogram', 'Stress Test'],
  },
];

export const metadata = {
  title: 'All Diagnostic Tests | FindMedi',
  description: 'Browse all diagnostic tests and find the nearest lab with accurate, affordable testing.',
};

export default async function AllTestsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">All Diagnostic Tests</h1>
        <p className="text-muted-foreground mt-1">
          Browse all available diagnostic tests and find affordable testing near you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {testCategories.map((category: TestCategory) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Microscope className="h-5 w-5 text-primary" />
                <CardTitle>{category.name}</CardTitle>
              </div>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {category.tests.map((test: string) => (
                  <span
                    key={test}
                    className="text-sm px-3 py-1 bg-muted rounded-full"
                  >
                    {test}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
