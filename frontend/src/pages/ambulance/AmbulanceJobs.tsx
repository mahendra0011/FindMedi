import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function AmbulanceJobs() {
  const [me, setMe] = useState<any>(null);
  useEffect(() => { api.get('/ambulance/me').then((r: any) => setMe(r.ambulance)).catch(() => {}); }, []);
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-black">Job History</h1>
      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        {me ? `${me.registrationNumber} — historyoondersteuning volgt. Active job dashboard pe dikhta hai.` : 'Loading…'}
      </CardContent></Card>
    </div>
  );
}
