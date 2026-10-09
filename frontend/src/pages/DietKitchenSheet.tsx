import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §06.6 — kitchen production sheet from census: active diet orders
 * grouped by ward × diet type with totals.
 */
export default function DietKitchenSheet() {
  const [sheet, setSheet] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await (api as any).getKitchenSheet();
        setSheet(r?.sheet || []);
        setTotal(r?.total || 0);
      } catch { toast.error('Failed to load production sheet'); }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Kitchen Sheet <span className="text-base font-normal text-muted-foreground">({total} meals)</span></h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sheet.map((s: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div>
                <p className="font-bold">{s._id?.ward || 'Ward —'}</p>
                <p className="text-xs text-muted-foreground">{s._id?.dietType || 'Regular'}</p>
              </div>
              <span className="flex-1" />
              <span className="text-2xl font-black text-primary">{s.count}</span>
            </CardContent>
          </Card>
        ))}
        {sheet.length === 0 && <p className="text-sm text-muted-foreground">No active diet orders.</p>}
      </div>
    </div>
  );
}
