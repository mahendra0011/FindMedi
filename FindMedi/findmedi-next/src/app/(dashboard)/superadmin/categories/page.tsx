/**
 * Categories — Dashboard page stub.
 *
 * Migrated from client/src/pages/.
 * Full component implementation will be ported in Phase 4.
 * This stub provides the correct route structure and Client Component wrapper.
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Categories</h1>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is under migration from the legacy Vite app.
            Full implementation coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
