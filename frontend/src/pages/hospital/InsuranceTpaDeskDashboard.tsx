import React, { useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  DollarSign,
  Download,
  Upload,
  Calendar,
  Send,
  ShieldCheck,
  CreditCard,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PreAuthClaim {
  id: string;
  claimNumber: string;
  patientName: string;
  uhid: string;
  insuranceCompany: string;
  tpaName: string;
  policyNumber: string;
  diagnosis: string;
  requestedAmount: number;
  approvedAmount: number;
  status: 'PRE_AUTH_PENDING' | 'PRE_AUTH_APPROVED' | 'ENHANCEMENT_REQUESTED' | 'DISCHARGE_CLEARANCE_READY' | 'SETTLED' | 'QUERY_RAISED';
  submittedAt: string;
  slaHoursRemaining: number;
  documents: string[];
}

export const InsuranceTpaDeskDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRE_AUTH' | 'DISCHARGE' | 'QUERIES'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<PreAuthClaim | null>(null);

  const [claims, setClaims] = useState<PreAuthClaim[]>([
    {
      id: 'CLM-101',
      claimNumber: 'TPA-2026-8812',
      patientName: 'Anand Kumar',
      uhid: 'UHID-55019',
      insuranceCompany: 'Star Health & Allied Insurance',
      tpaName: 'Medi Assist TPA',
      policyNumber: 'POL-99210-2025',
      diagnosis: 'Acute Appendicitis (Laparoscopic Appendectomy)',
      requestedAmount: 75000,
      approvedAmount: 50000,
      status: 'PRE_AUTH_APPROVED',
      submittedAt: 'Today, 08:30 AM',
      slaHoursRemaining: 4,
      documents: ['E-Card.pdf', 'DoctorEstimate.pdf', 'USG_Report.pdf']
    },
    {
      id: 'CLM-102',
      claimNumber: 'TPA-2026-8815',
      patientName: 'Kavita Chawla',
      uhid: 'UHID-55034',
      insuranceCompany: 'HDFC ERGO General Insurance',
      tpaName: 'Vidal Health TPA',
      policyNumber: 'HDFC-MED-7712',
      diagnosis: 'Type 2 Diabetes Mellitus with Foot Ulcer debridement',
      requestedAmount: 120000,
      approvedAmount: 0,
      status: 'QUERY_RAISED',
      submittedAt: 'Yesterday, 04:15 PM',
      slaHoursRemaining: 2,
      documents: ['AdmissionNote.pdf', 'PastMedicalHistory.pdf']
    },
    {
      id: 'CLM-103',
      claimNumber: 'TPA-2026-8819',
      patientName: 'Suresh Menon',
      uhid: 'UHID-55088',
      insuranceCompany: 'Niva Bupa Health Insurance',
      tpaName: 'In-House TPA Desk',
      policyNumber: 'NIVA-GOLD-1002',
      diagnosis: 'Coronary Angioplasty (Single Stent)',
      requestedAmount: 240000,
      approvedAmount: 220000,
      status: 'DISCHARGE_CLEARANCE_READY',
      submittedAt: 'Today, 11:00 AM',
      slaHoursRemaining: 1,
      documents: ['CathLabNotes.pdf', 'FinalBreakupBill.pdf', 'DischargeSummary.pdf']
    }
  ]);

  const filtered = claims.filter(c => {
    const matchSearch = c.patientName.toLowerCase().includes(search.toLowerCase()) ||
                        c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
                        c.insuranceCompany.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'PRE_AUTH') return matchSearch && (c.status === 'PRE_AUTH_PENDING' || c.status === 'PRE_AUTH_APPROVED');
    if (activeTab === 'DISCHARGE') return matchSearch && c.status === 'DISCHARGE_CLEARANCE_READY';
    if (activeTab === 'QUERIES') return matchSearch && c.status === 'QUERY_RAISED';
    return matchSearch;
  });

  const active = selectedClaim || filtered[0] || null;

  const handleApproveDischargeClearance = (id: string) => {
    toast.success(`Discharge authorization clearance issued for ${active?.patientName}. Hospital Billing Desk notified.`);
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'SETTLED' } : c));
  };

  const handleSendEnhancement = (id: string) => {
    const amt = prompt('Enter enhancement amount needed (INR):', '30000');
    if (amt) {
      toast.info(`Enhancement request of ₹${amt} dispatched to TPA portal`);
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'ENHANCEMENT_REQUESTED' } : c));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-600/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-2xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Insurance / TPA Cashless Helpdesk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Hospital Cashless Cell
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cashless Pre-Auth tracking, initial sanction, enhancement requests & final discharge clearance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => {
              const p = prompt('Patient UHID for new Cashless Pre-Auth:');
              if (p) toast.success(`Pre-Auth form wizard initiated for UHID: ${p}`);
            }}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
          >
            + New Pre-Auth Request
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Active Cashless Claims</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{claims.length}</p>
          <span className="text-xs text-sky-600 font-medium">Inpatient cases</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Pre-Auth Value</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹4,35,000</p>
          <span className="text-xs text-slate-400">Sanctioned limit</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending TPA Queries</p>
          <p className="text-2xl font-black text-amber-600 mt-1">1 Case</p>
          <span className="text-xs text-amber-500 font-medium">SLA expiring in 2 hrs</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Discharge Clearances Ready</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">1 Case</p>
          <span className="text-xs text-indigo-500 font-medium">Billing gate unlocked</span>
        </div>
      </div>

      {/* Main View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Claims Queue */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search claim, patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-900 shadow-sm text-sky-600' : 'text-slate-600 dark:text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('PRE_AUTH')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'PRE_AUTH' ? 'bg-white dark:bg-slate-900 shadow-sm text-sky-600' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Pre-Auth
            </button>
            <button
              onClick={() => setActiveTab('QUERIES')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'QUERIES' ? 'bg-white dark:bg-slate-900 shadow-sm text-sky-600' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Queries
            </button>
            <button
              onClick={() => setActiveTab('DISCHARGE')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'DISCHARGE' ? 'bg-white dark:bg-slate-900 shadow-sm text-sky-600' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Discharge
            </button>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClaim(c)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  active?.id === c.id
                    ? 'border-sky-500 bg-sky-50/20 dark:bg-sky-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">{c.claimNumber}</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{c.patientName}</h3>
                    <p className="text-xs text-slate-500">{c.tpaName}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    c.status === 'PRE_AUTH_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'DISCHARGE_CLEARANCE_READY' ? 'bg-indigo-100 text-indigo-700' :
                    c.status === 'QUERY_RAISED' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                  <span>Req: ₹{c.requestedAmount.toLocaleString('en-IN')}</span>
                  <span className="font-bold text-emerald-600">Sanction: ₹{c.approvedAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Claim Inspector */}
        <div className="lg:col-span-2">
          {active ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{active.patientName}</h2>
                  <p className="text-xs text-slate-500">
                    {active.uhid} · Policy: <strong className="text-slate-700 dark:text-slate-300">{active.policyNumber}</strong> ({active.insuranceCompany})
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendEnhancement(active.id)}
                    className="text-xs text-sky-600 border-sky-200"
                  >
                    Request Enhancement
                  </Button>
                  {active.status === 'DISCHARGE_CLEARANCE_READY' && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveDischargeClearance(active.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      Issue Discharge Clearance
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                  <span className="text-slate-400">Diagnosis / Clinical Treatment</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{active.diagnosis}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                  <span className="text-slate-400">TPA Servicing Agency</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{active.tpaName}</p>
                </div>
              </div>

              {/* Sanction Financials */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">Total Approved Pre-Auth Sanction</span>
                  <p className="text-2xl font-black text-emerald-800 dark:text-emerald-200">
                    ₹{active.approvedAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right text-xs text-emerald-700">
                  <span>Initial Requested: ₹{active.requestedAmount.toLocaleString('en-IN')}</span>
                  <p className="font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                    Co-pay/Deductible: ₹{(active.requestedAmount - active.approvedAmount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Docket Documents Attached</h4>
                <div className="flex gap-2 flex-wrap">
                  {active.documents.map((d, i) => (
                    <span
                      key={i}
                      onClick={() => toast.info(`Viewing ${d}`)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium cursor-pointer hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      {d}
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      const f = prompt('Upload filename:');
                      if (f) toast.success(`Attached ${f} to claim docket`);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
                  >
                    + Add Docket File
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 border border-slate-200 rounded-2xl">
              Select a claim to review details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsuranceTpaDeskDashboard;
