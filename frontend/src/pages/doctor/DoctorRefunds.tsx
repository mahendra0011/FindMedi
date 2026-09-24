import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

export default function DoctorRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRefunds({ limit: 200, page: 1 }).then((res) => {
      setRefunds(res?.payments || res?.data || res || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><RotateCcw className="w-6 h-6" /> Refunds</h1>
      {refunds.length === 0 ? <p className="text-sm text-muted-foreground">No refunds found</p> : (
        <div className="space-y-2">
          {refunds.map((r) => (
            <div key={r._id} className="rounded-xl border p-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{r.patient || r.patientName || 'Patient'}</p>
              <p className="text-sm font-bold">₹{(r.refund_amount || r.amount || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
