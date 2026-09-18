/**
 * Nursing Charts — ported from client/src/pages/NursingCharts.jsx (Phase 4).
 * Vitals / MAR / Input-Output / Wound Dressing charting.
 */
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Activity, Droplets, Bandage, Plus, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useNursingCharts,
  useNursingStats,
  useCreateVitalsChart,
  useCreateMARChart,
  useCreateIOChart,
  useCreateWoundChart,
} from '@/features/nursing/hooks';
import type { NursingChart, NursingChartType, NursingStats } from '@/features/nursing/types';

const CHART_TABS: { key: NursingChartType; label: string; icon: typeof Heart }[] = [
  { key: 'Vitals', label: 'Vitals', icon: Heart },
  { key: 'MAR', label: 'Medication Admin', icon: Activity },
  { key: 'InputOutput', label: 'Input/Output', icon: Droplets },
  { key: 'WoundDressing', label: 'Wound Dressing', icon: Bandage },
];

const SHIFTS = ['Morning', 'Afternoon', 'Night'];

const emptyStats: NursingStats = { vitals: 0, mar: 0, io: 0, woundDressing: 0 };

export default function NursingChartsPage() {
  const [tab, setTab] = useState<NursingChartType>('Vitals');
  const [search, setSearch] = useState('');
  const [chartDialog, setChartDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    patientId: '',
    patientName: '',
    admissionId: '',
    shift: 'Morning',
    vitals: { bp: '', pulse: '', temp: '', resp: '', spo2: '', sugar: '' },
    medicationAdmin: { medication: '', dose: '', route: '', time: '' },
    woundDressing: { woundType: '', site: '', size: '', dressingType: '' },
  });

  const { data: chartsData, isLoading, refetch } = useNursingCharts(tab);
  const { data: statsData } = useNursingStats();

  const createVitalsMut = useCreateVitalsChart();
  const createMARMut = useCreateMARChart();
  const createIOMut = useCreateIOChart();
  const createWoundMut = useCreateWoundChart();

  const charts = ((chartsData ?? []) as NursingChart[]).filter((c) =>
    (c.patientName ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const stats: NursingStats = { ...emptyStats, ...((statsData as Partial<NursingStats> | undefined) ?? {}) };

  const statCards = [
    { label: 'Vitals', value: stats.vitals, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'MAR', value: stats.mar, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'I/O', value: stats.io, icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Wound', value: stats.woundDressing, icon: Bandage, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const isCreating =
    createVitalsMut.isPending || createMARMut.isPending || createIOMut.isPending || createWoundMut.isPending;

  const closeAndRefresh = () => {
    setChartDialog(false);
    void refetch();
  };

  const handleSubmit = () => {
    const base = { patientId: newEntry.patientId, patientName: newEntry.patientName, admissionId: newEntry.admissionId };
    const onSuccess = () => {
      toast.success(`${tab} entry recorded`);
      closeAndRefresh();
    };
    const onError = (e: Error) => toast.error(e.message);
    if (tab === 'Vitals')
      createVitalsMut.mutate({ ...base, vitals: { ...newEntry.vitals, shift: newEntry.shift } }, { onSuccess, onError });
    else if (tab === 'MAR')
      createMARMut.mutate(
        { ...base, medicationAdmin: { ...newEntry.medicationAdmin, shift: newEntry.shift } },
        { onSuccess, onError },
      );
    else if (tab === 'InputOutput')
      createIOMut.mutate({ ...base, vitals: { shift: newEntry.shift } }, { onSuccess, onError });
    else if (tab === 'WoundDressing')
      createWoundMut.mutate(
        { ...base, woundDressing: { ...newEntry.woundDressing, shift: newEntry.shift } },
        { onSuccess, onError },
      );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Nursing Charts</h1>
        <Dialog open={chartDialog} onOpenChange={setChartDialog}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="w-4 h-4" /> New {tab} Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New {tab} Entry</DialogTitle>
              <DialogDescription className="sr-only">Enter details for a new {tab} chart entry</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                value={newEntry.patientId}
                onChange={(e) => setNewEntry((p) => ({ ...p, patientId: e.target.value }))}
                placeholder="Patient ID"
              />
              <Input
                value={newEntry.patientName}
                onChange={(e) => setNewEntry((p) => ({ ...p, patientName: e.target.value }))}
                placeholder="Patient Name"
              />
              <Input
                value={newEntry.admissionId}
                onChange={(e) => setNewEntry((p) => ({ ...p, admissionId: e.target.value }))}
                placeholder="Admission ID"
              />
              <select
                value={newEntry.shift}
                onChange={(e) => setNewEntry((p) => ({ ...p, shift: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {tab === 'Vitals' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newEntry.vitals.bp}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, bp: e.target.value } }))}
                    placeholder="BP (120/80)"
                  />
                  <Input
                    value={newEntry.vitals.pulse}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, pulse: e.target.value } }))}
                    placeholder="Pulse (72)"
                  />
                  <Input
                    value={newEntry.vitals.temp}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, temp: e.target.value } }))}
                    placeholder="Temp (98.6)"
                  />
                  <Input
                    value={newEntry.vitals.resp}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, resp: e.target.value } }))}
                    placeholder="Resp (16)"
                  />
                  <Input
                    value={newEntry.vitals.spo2}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, spo2: e.target.value } }))}
                    placeholder="SpO2 (98%)"
                  />
                  <Input
                    value={newEntry.vitals.sugar}
                    onChange={(e) => setNewEntry((p) => ({ ...p, vitals: { ...p.vitals, sugar: e.target.value } }))}
                    placeholder="Blood Sugar"
                  />
                </div>
              )}
              {tab === 'MAR' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newEntry.medicationAdmin.medication}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, medicationAdmin: { ...p.medicationAdmin, medication: e.target.value } }))
                    }
                    placeholder="Medication"
                  />
                  <Input
                    value={newEntry.medicationAdmin.dose}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, medicationAdmin: { ...p.medicationAdmin, dose: e.target.value } }))
                    }
                    placeholder="Dose"
                  />
                  <Input
                    value={newEntry.medicationAdmin.route}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, medicationAdmin: { ...p.medicationAdmin, route: e.target.value } }))
                    }
                    placeholder="Route (PO/IV)"
                  />
                  <Input
                    value={newEntry.medicationAdmin.time}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, medicationAdmin: { ...p.medicationAdmin, time: e.target.value } }))
                    }
                    placeholder="Time"
                  />
                </div>
              )}
              {tab === 'WoundDressing' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newEntry.woundDressing.woundType}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, woundDressing: { ...p.woundDressing, woundType: e.target.value } }))
                    }
                    placeholder="Wound Type"
                  />
                  <Input
                    value={newEntry.woundDressing.site}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, woundDressing: { ...p.woundDressing, site: e.target.value } }))
                    }
                    placeholder="Site"
                  />
                  <Input
                    value={newEntry.woundDressing.size}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, woundDressing: { ...p.woundDressing, size: e.target.value } }))
                    }
                    placeholder="Size (cm)"
                  />
                  <Input
                    value={newEntry.woundDressing.dressingType}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, woundDressing: { ...p.woundDressing, dressingType: e.target.value } }))
                    }
                    placeholder="Dressing Type"
                  />
                </div>
              )}
              <Button className="w-full" onClick={handleSubmit} disabled={isCreating || !newEntry.patientId}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isCreating ? 'Saving...' : `Save ${tab} Entry`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit">
        {CHART_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : charts.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No {tab.toLowerCase()} entries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {charts.map((chart, i) => (
            <motion.div
              key={chart._id ?? i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">{chart.patientName || 'Unknown'}</p>
                <span className="text-xs text-muted-foreground capitalize">{chart.shift}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {chart.recordedByName} &middot; {chart.createdAt ? new Date(chart.createdAt).toLocaleString() : ''}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
