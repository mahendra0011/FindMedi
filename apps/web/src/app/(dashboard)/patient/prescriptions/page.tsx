/**
 * My Prescriptions — ported from client/src/pages/patient/PatientPrescriptions.jsx (Phase 4).
 * Pharmacy prescriptions with dispense tracking and detail viewer.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  FileText,
  User,
  Search,
  Calendar,
  Eye,
  Clock,
  Pill,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pharmacy } from '@/lib/api';
import type { Prescription } from '@/features/prescriptions/types';

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  Active: { label: 'Active', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  Dispensed: { label: 'Dispensed', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  'Partially Dispensed': {
    label: 'Partially Dispensed',
    icon: Loader2,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  Cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const fallbackStatus = { label: 'Active', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };

const statusFilters = ['All', 'Active', 'Partially Dispensed', 'Dispensed', 'Cancelled'];

export default function MyPrescriptionsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  const { data: prescriptionsData, isLoading } = useQuery({
    queryKey: ['patient-pharmacy-prescriptions'],
    queryFn: async () => {
      const res = await pharmacy.getPrescriptions({});
      const arr = (Array.isArray(res) ? res : []) as unknown as Prescription[];
      return arr;
    },
    staleTime: 30_000,
  });

  const prescriptions = prescriptionsData ?? [];
  const filtered = prescriptions.filter((r) => {
    const ms =
      !search ||
      (r.prescriptionId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.doctorName || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-muted-foreground text-sm">{prescriptions.length} total prescriptions</p>
      </div>

      {prescriptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
        >
          {statusFilters.map((s) => {
            const count = s === 'All' ? prescriptions.length : prescriptions.filter((r) => r.status === s).length;
            const cfg = statusConfig[s] ?? { icon: FileText, color: 'text-foreground bg-muted/30' };
            const StatusIcon = cfg.icon || FileText;
            const colorParts = cfg.color.split(' ');
            if (s === 'All') {
              return (
                <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
              );
            }
            return (
              <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${colorParts[0] ?? ''} flex items-center justify-center`}>
                    <StatusIcon className={`w-4 h-4 ${colorParts[1] ?? ''}`} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{s}</p>
                </div>
                <p className={`text-2xl font-bold ${colorParts[1] ?? ''}`}>{count}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'
              }`}
            >
              {f} ({f === 'All' ? prescriptions.length : prescriptions.filter((r) => r.status === f).length})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or doctor..."
            className="pl-10 h-10 rounded-xl bg-background border-border/50 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            {search ? (
              <Search className="w-8 h-8 text-muted-foreground/30" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
          <p className="text-lg font-semibold text-foreground">{search ? 'No matching prescriptions' : 'No prescriptions yet'}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search ? 'Try a different ID or doctor name.' : 'Your doctor-issued prescriptions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rx, i) => {
            const statusInfo = statusConfig[rx.status] ?? fallbackStatus;
            const StatusIcon = statusInfo.icon;
            const dispensed = rx.medicines?.filter((m) => m.isDispensed).length || 0;
            const total = rx.medicines?.length || 0;

            return (
              <motion.div
                key={rx._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <FileText className="w-6 h-6 text-info" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground text-sm">Dr. {rx.doctorName}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                          {rx.isEmergency && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-red-500/10 text-red-600 border-red-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              Emergency
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <Clock className="w-3 h-3 ml-1" />
                          <span>{new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 inline-block">#{rx.prescriptionId}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-xl h-8 text-xs shrink-0 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                      onClick={() => setSelectedRx(rx)}
                    >
                      <Eye className="w-3 h-3" /> View
                    </Button>
                  </div>

                  {rx.diagnosis && (
                    <div className="mb-3 p-3 bg-muted/10 rounded-xl border border-border/20">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Diagnosis</p>
                      <p className="text-xs text-foreground/80">{rx.diagnosis}</p>
                    </div>
                  )}

                  {total > 0 && (
                    <div className="mb-3 p-3 bg-muted/20 rounded-2xl border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-foreground">Medicines ({total})</p>
                        <span className="text-[10px] text-muted-foreground">
                          {dispensed}/{total} dispensed
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                          style={{ width: `${total > 0 ? (dispensed / total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        {rx.medicines?.slice(0, 3).map((med, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Pill className={`w-3 h-3 shrink-0 ${med.isDispensed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span className="text-muted-foreground truncate">{med.medicineName}</span>
                            </div>
                            <span className={`font-medium shrink-0 ml-2 ${med.isDispensed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {med.dosage} | {med.frequency}
                            </span>
                          </div>
                        ))}
                        {(rx.medicines?.length ?? 0) > 3 && (
                          <p className="text-[10px] text-primary">+{(rx.medicines?.length ?? 0) - 3} more medicines</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-muted/10 rounded-xl">
                    <Stethoscope className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <span>Prescribed by Dr. {rx.doctorName}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedRx && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedRx(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Prescription Details</h3>
                    <p className="text-xs text-muted-foreground font-mono">#{selectedRx.prescriptionId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRx.isEmergency && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-red-500/10 text-red-600 border-red-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Emergency
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${(statusConfig[selectedRx.status] ?? fallbackStatus).color}`}
                  >
                    {selectedRx.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-3 p-3.5 bg-muted/20 rounded-2xl border border-border/30">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Dr. {selectedRx.doctorName}</p>
                    <p className="text-xs text-muted-foreground">Prescribing Doctor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-muted/20 rounded-2xl border border-border/30">
                  <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(selectedRx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground">Prescribed on</p>
                  </div>
                </div>
              </div>

              {selectedRx.diagnosis && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Diagnosis</p>
                  <div className="p-3.5 bg-muted/10 rounded-2xl border border-border/20 text-sm text-foreground/80">
                    {selectedRx.diagnosis}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Medicines ({selectedRx.medicines?.length || 0})
                </p>
                <div className="space-y-2.5">
                  {selectedRx.medicines?.map((med, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        med.isDispensed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/10 border-border/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className={`w-4 h-4 ${med.isDispensed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                        <h4 className="font-semibold text-foreground text-sm">{med.medicineName}</h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            med.isDispensed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {med.isDispensed ? 'Dispensed' : 'Pending'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground ml-6">
                        <span>
                          <span className="font-medium text-foreground">Dosage:</span> {med.dosage}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Frequency:</span> {med.frequency}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Duration:</span> {med.duration}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Route:</span> {med.route || 'Oral'}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">Qty:</span> {med.quantity}
                        </span>
                      </div>
                      {med.instructions && <p className="text-xs text-muted-foreground/70 mt-1.5 ml-6 italic">💡 {med.instructions}</p>}
                      {med.dispensedAt && (
                        <p className="text-xs text-emerald-600 mt-1.5 ml-6 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Dispensed on{' '}
                          {new Date(med.dispensedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full rounded-xl" onClick={() => setSelectedRx(null)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
