import React, { useState } from 'react';
import {
  FlaskConical,
  Microscope,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FileCheck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Printer,
  Share2,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PendingResult {
  id: string;
  orderNumber: string;
  patientName: string;
  patientUhid: string;
  testName: string;
  department: 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Histopathology' | 'Serology' | 'Clinical Pathology';
  collectedAt: string;
  turnaroundStatus: 'NORMAL' | 'WARNING' | 'CRITICAL_BREACH';
  parameters: {
    param: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: 'NORMAL' | 'HIGH' | 'LOW' | 'PANIC';
  }[];
  criticalAlert: boolean;
  notes?: string;
}

export const PathologistVerificationDashboard: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<PendingResult | null>(null);

  const [resultsList, setResultsList] = useState<PendingResult[]>([
    {
      id: 'RES-801',
      orderNumber: 'ORD-2026-9041',
      patientName: 'Ramesh Sundaram',
      patientUhid: 'UHID-77201',
      testName: 'Complete Blood Count (CBC)',
      department: 'Hematology',
      collectedAt: '10:15 AM',
      turnaroundStatus: 'NORMAL',
      criticalAlert: true,
      parameters: [
        { param: 'Hemoglobin', value: '7.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'PANIC' },
        { param: 'Total Leucocyte Count (TLC)', value: '14,800', unit: '/cumm', referenceRange: '4,000 - 11,000', flag: 'HIGH' },
        { param: 'Platelet Count', value: '85,000', unit: '/cumm', referenceRange: '150,000 - 450,000', flag: 'LOW' },
        { param: 'Packed Cell Volume (PCV)', value: '23.4', unit: '%', referenceRange: '40.0 - 50.0', flag: 'LOW' }
      ],
      notes: 'Automated Analyzer Sysmex XN-550 run verified. Peripheral blood smear shows microcytic hypochromic picture.'
    },
    {
      id: 'RES-802',
      orderNumber: 'ORD-2026-9042',
      patientName: 'Pooja Agarwal',
      patientUhid: 'UHID-77218',
      testName: 'Liver Function Test (LFT)',
      department: 'Biochemistry',
      collectedAt: '10:45 AM',
      turnaroundStatus: 'NORMAL',
      criticalAlert: false,
      parameters: [
        { param: 'Serum Bilirubin (Total)', value: '1.4', unit: 'mg/dL', referenceRange: '0.2 - 1.2', flag: 'HIGH' },
        { param: 'SGOT (AST)', value: '38', unit: 'U/L', referenceRange: '10 - 40', flag: 'NORMAL' },
        { param: 'SGPT (ALT)', value: '42', unit: 'U/L', referenceRange: '10 - 45', flag: 'NORMAL' },
        { param: 'Alkaline Phosphatase (ALP)', value: '110', unit: 'U/L', referenceRange: '30 - 120', flag: 'NORMAL' }
      ]
    },
    {
      id: 'RES-803',
      orderNumber: 'ORD-2026-9045',
      patientName: 'Vikram Malhotra',
      patientUhid: 'UHID-77229',
      testName: 'Kidney Function Test (KFT)',
      department: 'Biochemistry',
      collectedAt: '09:30 AM',
      turnaroundStatus: 'WARNING',
      criticalAlert: true,
      parameters: [
        { param: 'Blood Urea', value: '98', unit: 'mg/dL', referenceRange: '15 - 45', flag: 'HIGH' },
        { param: 'Serum Creatinine', value: '4.8', unit: 'mg/dL', referenceRange: '0.7 - 1.3', flag: 'PANIC' },
        { param: 'Serum Potassium', value: '6.2', unit: 'mEq/L', referenceRange: '3.5 - 5.0', flag: 'PANIC' }
      ],
      notes: 'Severe hyperkalemia & elevated creatinine noted. Stat doctor intimation advised.'
    }
  ]);

  const filtered = resultsList.filter(r => {
    const matchDept = selectedDept === 'All' || r.department === selectedDept;
    const matchSearch = r.patientName.toLowerCase().includes(search.toLowerCase()) ||
                        r.patientUhid.toLowerCase().includes(search.toLowerCase()) ||
                        r.testName.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  const activeResult = selectedResult || filtered[0] || null;

  const handleApproveReport = (id: string) => {
    toast.success(`Report #${id} digitally signed & finalized with NABL verification QR code`);
    setResultsList(prev => prev.filter(r => r.id !== id));
    setSelectedResult(null);
  };

  const handleReturnCorrection = (id: string) => {
    const reason = prompt('Specify reason for returning sample/result to workbench:');
    if (reason) {
      toast.error(`Result #${id} sent back to Technician for re-run / dilution: ${reason}`);
      setResultsList(prev => prev.filter(r => r.id !== id));
      setSelectedResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-2xl">
            <Microscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Pathologist Verification & Sign-Off Desk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                LIMS Medical Desk
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Professional review, delta checks, panic range escalation & authorized digital signatures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            2 Critical Panic Results Pending
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Awaiting Sign-Off</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{resultsList.length}</p>
          <span className="text-xs text-slate-400">Tests in queue</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Panic / Critical Flags</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{resultsList.filter(r => r.criticalAlert).length}</p>
          <span className="text-xs text-rose-500 font-medium">Immediate call required</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Signed Today</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">142</p>
          <span className="text-xs text-slate-400">Reports published</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Average Verification TAT</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">18 mins</p>
          <span className="text-xs text-emerald-600 font-medium">Within SLA target (&lt;30m)</span>
        </div>
      </div>

      {/* Main Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Queue */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Search patient, UHID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="text-xs font-medium px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <option value="All">All Depts</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Histopathology">Histopathology</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedResult(r)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  activeResult?.id === r.id
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">{r.department}</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{r.patientName}</h3>
                    <p className="text-xs text-slate-500">{r.patientUhid} · {r.testName}</p>
                  </div>
                  {r.criticalAlert && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">
                      PANIC
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">No pending reports in this department</p>
            )}
          </div>
        </div>

        {/* Right Result Detail & Digital Sign */}
        <div className="lg:col-span-2">
          {activeResult ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeResult.testName}</h2>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeResult.orderNumber}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Patient: <strong className="text-slate-800 dark:text-slate-200">{activeResult.patientName}</strong> ({activeResult.patientUhid}) · Sampled: {activeResult.collectedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReturnCorrection(activeResult.id)}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-run / Correct
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveReport(activeResult.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify & Sign Report
                  </Button>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Parameter</th>
                      <th className="py-3 px-4">Result Value</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Biological Reference Range</th>
                      <th className="py-3 px-4 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeResult.parameters.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.param}</td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-base">
                          {p.value}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{p.unit}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{p.referenceRange}</td>
                        <td className="py-3 px-4 text-center">
                          {p.flag === 'PANIC' && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">PANIC</span>
                          )}
                          {p.flag === 'HIGH' && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">HIGH ↑</span>
                          )}
                          {p.flag === 'LOW' && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">LOW ↓</span>
                          )}
                          {p.flag === 'NORMAL' && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clinical Notes / Interpretation */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Pathologist Interpretation & Microscopic Notes
                </label>
                <textarea
                  defaultValue={activeResult.notes || ''}
                  rows={3}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add microscopic findings, correlation advice or follow-up recommendation..."
                />
              </div>

              {/* NABL Footer preview */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>NABL ISO 15189:2022 Quality Assured Laboratory Protocol</span>
                </div>
                <span>Authorized Signatory: <strong>Dr. Ananya Sen, MD (Pathology)</strong></span>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 text-sm">Select a test from the queue to review results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathologistVerificationDashboard;
