/**
 * Medical Records — ported from client/src/pages/MedicalRecords.jsx (Phase 4).
 * Records grouped by doctor, category filters, delete.
 */
'use client';

import { useState } from 'react';
import { Search, FileText, Pill, FlaskConical, Receipt, Wallet, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMedicalRecords, useDeleteRecord } from '@/features/records/hooks';
import type { MedicalRecord, DoctorGroup } from '@/features/records/types';

const categoryConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  prescription: { icon: Pill, color: 'text-success', bg: 'bg-success/10', label: 'Prescriptions' },
  lab_report: { icon: FlaskConical, color: 'text-warning', bg: 'bg-warning/10', label: 'Lab Reports' },
  discharge_summary: { icon: FileText, color: 'text-info', bg: 'bg-info/10', label: 'Discharge Summaries' },
  bill_invoice: { icon: Receipt, color: 'text-primary', bg: 'bg-primary/10', label: 'Bill Invoices' },
  payment_invoice: { icon: Wallet, color: 'text-success', bg: 'bg-success/10', label: 'Payment Invoices' },
};

const CATEGORIES = ['All', 'prescription', 'lab_report', 'discharge_summary', 'bill_invoice', 'payment_invoice'];

const normalizeType = (type?: string) => (type ?? '').toLowerCase().replace(/\s+/g, '_');

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);

  const { data: recordsData, isLoading } = useMedicalRecords(search, categoryFilter);
  const deleteMut = useDeleteRecord();

  const records: MedicalRecord[] = recordsData ?? [];

  const doctorGroups = records.reduce<Record<string, DoctorGroup>>((acc, rec) => {
    const doctorName = rec.doctor ?? 'Unknown';
    if (!acc[doctorName]) {
      const spec = typeof rec.doctorId === 'object' ? (rec.doctorId.specialization ?? '') : '';
      acc[doctorName] = { doctor: doctorName, specialization: spec, records: [] };
    }
    const group = acc[doctorName];
    if (group) group.records.push(rec);
    return acc;
  }, {});

  const doctorList = Object.values(doctorGroups);

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Medical Records</h1>
        <p className="text-sm text-muted-foreground">
          {records.length} records from {doctorList.length} doctors
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search records…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : doctorList.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No records found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctorList.map((group) => {
            const counts = getCategoryCounts(group.records);
            const isExpanded = expandedDoctor === group.doctor;
            return (
              <div key={group.doctor} className="bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info font-bold text-lg">
                    {group.doctor
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{group.doctor}</h3>
                    <p className="text-sm text-muted-foreground">{group.specialization || 'Doctor'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{group.records.length} records</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(categoryConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bg} ${(counts[key] ?? 0) > 0 ? '' : 'opacity-40'}`}>
                        <Icon className={`w-3 h-3 ${cfg.color}`} />
                        <span className={`text-xs font-medium ${cfg.color}`}>{counts[key] ?? 0}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setExpandedDoctor(isExpanded ? null : group.doctor)}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Hide Records' : 'View Records'}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-2 max-h-64 overflow-y-auto">
                    {group.records.map((rec) => {
                      const typeKey = normalizeType(rec.type);
                      const cfg = categoryConfig[typeKey] ?? { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Record' };
                      const Icon = cfg.icon;
                      return (
                        <div key={rec._id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{rec.diagnosis || rec.type}</p>
                            <p className="text-[10px] text-muted-foreground">{rec.date}</p>
                            {rec.prescription && <p className="text-[10px] text-muted-foreground truncate">Rx: {rec.prescription}</p>}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('Delete record?')) deleteMut.mutate(rec._id);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
