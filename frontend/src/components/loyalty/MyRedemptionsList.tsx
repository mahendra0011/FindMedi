import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MyRedemptionsList({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Abhi koi redemption nahi hai.</p>;
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Card key={r._id || r.code}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-mono font-black tracking-widest">{r.code}</p>
              <p className="text-[11px] text-muted-foreground">{r.status} · {r.pointsSpent} pts · exp {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('en-IN') : ''}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(r.code);
                  toast.success('Copied!');
                } catch {}
              }}
            >
              Copy
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
