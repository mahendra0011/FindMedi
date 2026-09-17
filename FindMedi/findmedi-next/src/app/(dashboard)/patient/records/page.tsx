/**
 * Medical History — ported from client/src/pages/patient/PatientRecords.jsx (Phase 4).
 * Patient summary, visit timeline with per-visit records, detail viewer.
 */
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Calendar,
  Activity,
  FileText,
  Pipette,
  Clock,
  Search,
  AlertCircle,
  Pill,
  FlaskConical,
  Receipt,
  Wallet,
  Eye,
  Download,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { resolveFileUrl } from '@/lib/utils';
import { usePatientRecords } from '@/features/records/hooks';
import type { MedicalRecord, PatientVisit } from '@/features/records/types';

const categoryConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  prescription: { icon: Pill, color: 'text-success', bg: 'bg-success/10', label: 'Prescriptions' },
  lab_report: { icon: FlaskConical, color: 'text-warning', bg: 'bg-warning/10', label: 'Lab Reports' },
  discharge_summary: { icon: FileText, color: 'text-info', bg: 'bg-info/10', label: 'Discharge Summaries' },
  bill_invoice: { icon: Receipt, color: 'text-primary', bg: 'bg-primary/10', label: 'Bill Invoices' },
  payment_invoice: { icon: Wallet, color: 'text-success', bg: 'bg-success/10', label: 'Payment Invoices' },
};

const fallbackCategory = { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Record' };

const CATEGORIES = ['All', 'prescription', 'lab_report', 'discharge_summary', 'bill_invoice', 'payment_invoice'];

const normalizeType = (type?: string) => (type ?? '').toLowerCase().replace(/\s+/g, '_');

const calcAge = (dob?: string) => {
  if (!dob) return '--';
  const a = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return a >= 0 ? a : '--';
};

const recordFileUrl = (rec: MedicalRecord): string =>
  rec.attachments?.[0]?.url || rec.data?.fileUrl || rec.data?.uploadedFile?.url || rec.fileUrl || '';

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewRecord, setViewRecord] = useState<MedicalRecord | null>(null);

  const { data, isLoading } = usePatientRecords();
  const appointments: PatientVisit[] = data?.visits ?? [];
  const records: MedicalRecord[] = data?.records ?? [];

  const filteredAppointments = appointments.filter(
    (a) =>
      search === '' ||
      a.doctor.toLowerCase().includes(search.toLowerCase()) ||
      (a.date ?? '').includes(search),
  );

  const getPatientRecords = (date: string) => records.filter((r) => r.date === date);

  const getCategoryCounts = (recs: MedicalRecord[]) => {
    const counts: Record<string, number> = {};
    Object.keys(categoryConfig).forEach((key) => {
      counts[key] = 0;
    });
    recs.forEach((r) => {
      const type = normalizeType(r.type);
      if (counts[type] !== undefined) counts[type] = (counts[type] ?? 0) + 1;
    });
    return counts;
  };

  const allergiesList =
    (user?.allergies ?? []).map((a) => (typeof a === 'string' ? a : (a.allergen ?? ''))).filter(Boolean).join(', ') ||
    'None';

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Medical History</h1>
        <p className="text-muted-foreground">Your complete medical journey</p>
      </div>

      <div className="bg-gradient-to-br from-primary/5 via-card to-card rounded-3xl border border-border/60 p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{user?.name || 'Patient'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Age: <span className="text-foreground font-medium">{calcAge(user?.dateOfBirth)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Gender: <span className="text-foreground font-medium">{user?.gender || '--'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Pipette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Blood: <span className="text-foreground font-medium">{user?.bloodGroup || '--'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Allergies: <span className="text-foreground font-medium">{allergiesList}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by doctor or date..."
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${categoryFilter === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >
            {c === 'All' ? 'All' : (categoryConfig[c]?.label ?? c)}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Visit History
        </h3>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No visits yet</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {filteredAppointments.map((apt, i) => {
                const visitRecords = getPatientRecords(apt.date);
                const hasRecords = visitRecords.length > 0;

                return (
                  <motion.div
                    key={apt._id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-12"
                  >
                    {(() => {
                      const visitRecs = getPatientRecords(apt.date);
                      if (categoryFilter !== 'All') {
                        const filtered = visitRecs.filter((r) => normalizeType(r.type) === categoryFilter);
                        if (filtered.length === 0) return null;
                      }
                      const counts = getCategoryCounts(visitRecs);
                      const hasAny = Object.values(counts).some((v) => v > 0);
                      if (!hasAny) return null;
                      return (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {Object.entries(categoryConfig).map(([key, cfg]) => {
                            const Icon = cfg.icon;
                            return (
                              <div key={key} className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${cfg.bg} ${(counts[key] ?? 0) > 0 ? '' : 'opacity-40'}`}>
                                <Icon className={`w-3 h-3 ${cfg.color}`} />
                                <span className={`text-[10px] font-medium ${cfg.color}`}>{counts[key] ?? 0}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div
                      className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        apt.status === 'Confirmed'
                          ? 'bg-success/20 text-success'
                          : apt.status === 'Completed'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {hasRecords ? <FileText className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </div>

                    <div className="bg-muted/30 rounded-xl border border-border/40 p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{apt.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {apt.time} • {apt.department}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">{apt.doctor}</p>
                          <p className="text-xs text-muted-foreground">Department</p>
                        </div>
                      </div>

                      {hasRecords &&
                        visitRecords
                          .filter((r) => categoryFilter === 'All' || normalizeType(r.type) === categoryFilter)
                          .map((rec, j) => {
                            const cfg = categoryConfig[normalizeType(rec.type)] ?? fallbackCategory;
                            const Icon = cfg.icon;
                            return (
                              <div key={rec._id || j} className="mt-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-5 h-5 rounded ${cfg.bg} flex items-center justify-center`}>
                                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                                  </div>
                                  <span className="text-xs font-semibold text-foreground">{rec.diagnosis || rec.type}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">{rec.date}</span>
                                </div>
                                {rec.prescription && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 ml-7">Rx: {rec.prescription}</p>
                                )}
                                <div className="flex gap-1 ml-7 mt-1">
                                  {recordFileUrl(rec) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs gap-1"
                                      onClick={() => window.open(resolveFileUrl(recordFileUrl(rec)), '_blank')}
                                    >
                                      <FileText className="w-3 h-3" /> View Document
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setViewRecord(rec)}>
                                    <Eye className="w-3 h-3" /> Details
                                  </Button>
                                </div>
                              </div>
                            );
                          })}

                      {!hasRecords && apt.symptoms && (
                        <div className="mt-2 pt-2 border-t border-border/40">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Symptoms:</span> {apt.symptoms}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{appointments.filter((a) => a.status === 'Completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{records.length}</p>
          <p className="text-xs text-muted-foreground">Records</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-info">{appointments.filter((a) => a.status === 'Confirmed').length}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {viewRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewRecord(null)}>
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">{viewRecord.diagnosis || viewRecord.type}</h3>
              <button onClick={() => setViewRecord(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Type: <span className="text-foreground font-medium">{viewRecord.type}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Date: <span className="text-foreground font-medium">{viewRecord.date}</span>
              </p>
              {viewRecord.diagnosis && (
                <p className="text-sm text-muted-foreground">
                  Diagnosis: <span className="text-foreground font-medium">{viewRecord.diagnosis}</span>
                </p>
              )}
              {viewRecord.prescription && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Prescription:</p>
                  <pre className="text-sm bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{viewRecord.prescription}</pre>
                </div>
              )}
              {viewRecord.notes && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Notes:</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{viewRecord.notes}</p>
                </div>
              )}
              {(viewRecord.data?.medications?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Medications:</p>
                  <div className="space-y-1">
                    {viewRecord.data?.medications?.map((m, i) => (
                      <p key={i} className="text-sm bg-muted/30 rounded-lg p-2">
                        {typeof m === 'string'
                          ? m
                          : `${m.name ?? ''} - ${m.dosage ?? ''} - ${m.frequency ?? ''}${m.instructions ? ` (${m.instructions})` : ''}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {(viewRecord.data?.tests?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Test Results:</p>
                  <div className="space-y-1">
                    {viewRecord.data?.tests?.map((t, i) => (
                      <p key={i} className="text-sm bg-muted/30 rounded-lg p-2">
                        {t.name}: {t.result} {t.unit} (Ref: {t.referenceRange})
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {recordFileUrl(viewRecord) && (
                <Button className="w-full gap-2" onClick={() => window.open(resolveFileUrl(recordFileUrl(viewRecord)), '_blank')}>
                  <Download className="w-4 h-4" /> Download Document
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
