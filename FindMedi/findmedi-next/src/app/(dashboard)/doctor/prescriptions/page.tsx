/**
 * Doctor Prescriptions — prescription history for the doctor's patients.
 * Reuses the shared prescriptions feature (list + delete).
 */
'use client';

import { useState } from 'react';
import { Search, FileText, Trash2, Pill } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePrescriptions, useDeletePrescription } from '@/features/prescriptions/hooks';

export default function DoctorPrescriptionsPage() {
  const [search, setSearch] = useState('');

  const { data: prescriptionsData, isLoading } = usePrescriptions(search);
  const deleteMut = useDeletePrescription();

  const prescriptions = (prescriptionsData ?? []).filter((p) =>
    `${p.patientName} ${p.diagnosis ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pendingCount = prescriptions.filter((p) => p.verificationStatus === 'pending').length;
  const verifiedCount = prescriptions.filter((p) => p.verificationStatus === 'verified').length;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Loading prescriptions…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">
          {prescriptions.length} total · {pendingCount} pending verification · {verifiedCount} verified
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { l: 'Total', v: prescriptions.length, c: 'text-foreground' },
          { l: 'Pending Verification', v: pendingCount, c: 'text-warning' },
          { l: 'Verified', v: verifiedCount, c: 'text-success' },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="relative flex-1 max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patient or diagnosis..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No prescriptions found</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  {['Prescription', 'Diagnosis', 'Medicines', 'Status', 'Verification', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {prescriptions.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{p.prescriptionId}</p>
                          <p className="text-xs text-muted-foreground">{p.patientName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">{p.diagnosis || '—'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{p.medicines.length} item(s)</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${
                          p.verificationStatus === 'verified'
                            ? 'bg-success/10 text-success'
                            : p.verificationStatus === 'rejected'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {p.verificationStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          if (confirm('Delete prescription?')) deleteMut.mutate(p._id);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
