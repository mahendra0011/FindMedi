import React, { useState } from 'react';
import {
  ShieldCheck, Lock, Eye, AlertCircle, Clock, CheckCircle2,
  XCircle, FileText, UserCheck, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientConsents() {
  const [consents, setConsents] = useState([
    {
      id: 'c1',
      title: 'Treating Doctors & Hospital OPD Access',
      description: 'Allow consulted doctors to view your prescriptions, test reports, and past diagnoses during clinical visits.',
      granted: true,
      expiry: 'Active (Revocable anytime)',
    },
    {
      id: 'c2',
      title: 'Family Member Shared Caregiver Access',
      description: 'Allow linked primary caregivers in your family account to book consultations and review shared lab reports.',
      granted: true,
      expiry: 'Active until revoked',
    },
    {
      id: 'c3',
      title: 'Ayushman Bharat Digital Mission (ABDM / ABHA)',
      description: 'Consent to fetch and link external health records via National Health Authority ABHA M1/M2/M3 bridges.',
      granted: true,
      expiry: 'Verified via ABHA OTP',
    },
    {
      id: 'c4',
      title: 'Anonymised Population Health Research',
      description: 'Contribute completely de-identified health metrics for epidemiological and preventative care research.',
      granted: false,
      expiry: 'Not granted',
    },
  ]);

  const [accessLog, setAccessLog] = useState([
    {
      id: 'log-1',
      accessor: 'Dr. Aarav Sharma (Consultant Physician)',
      action: 'Viewed Lipid Profile & HbA1c Lab Report',
      timestamp: 'Today at 10:45 AM',
      purpose: 'Active In-Clinic Consultation Review',
    },
    {
      id: 'log-2',
      accessor: 'Apex Super Specialty Hospital (TPA Desk)',
      action: 'Verified Insurance Empanelment & Pre-Auth Claim Slip',
      timestamp: 'Yesterday at 04:12 PM',
      purpose: 'Cashless Hospital Admission Pre-Authorization',
    },
    {
      id: 'log-3',
      accessor: 'Max Labs Phlebotomist (Ramesh Kumar)',
      action: 'Verified Patient Identity & Lab Test Requisition Order',
      timestamp: '18 Oct 2026 at 07:30 AM',
      purpose: 'Home Sample Collection Verification',
    },
  ]);

  const handleToggleConsent = (id: string) => {
    setConsents((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextState = !c.granted;
          toast.success(nextState ? 'Consent granted and updated in audit ledger.' : 'Consent revoked immediately.');
          return { ...c, granted: nextState };
        }
        return c;
      })
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Consent Manager & Data Access Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            You own your healthcare records. Control who can access your medical data and monitor every access audit event in real time.
          </p>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> DPDP & ABDM Compliant
        </Badge>
      </div>

      {/* Consents Preferences */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Data Sharing Consents</h2>
        <div className="space-y-3">
          {consents.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
                  <Badge variant="outline" className={`text-[10px] font-bold ${
                    item.granted
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border/40'
                  }`}>
                    {item.granted ? 'Granted' : 'Revoked'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <span className="text-[11px] text-muted-foreground block font-medium">Status: {item.expiry}</span>
              </div>

              <div className="sm:shrink-0">
                <Button
                  variant={item.granted ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleToggleConsent(item.id)}
                  className={`rounded-xl text-xs h-9 font-semibold ${
                    item.granted ? 'text-destructive hover:bg-destructive/10' : ''
                  }`}
                >
                  {item.granted ? 'Revoke Consent' : 'Grant Consent'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Access Audit Log */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Record Access Audit Log</h2>
          <span className="text-xs text-muted-foreground">Tamper-evident log</span>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-xs divide-y divide-border/40">
          {accessLog.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary shrink-0" />
                  <strong className="text-sm text-foreground">{log.accessor}</strong>
                </div>
                <p className="text-xs text-muted-foreground pl-6">{log.action}</p>
                <p className="text-[11px] text-muted-foreground pl-6 font-medium">Purpose: {log.purpose}</p>
              </div>

              <div className="text-right sm:shrink-0 pl-6 sm:pl-0">
                <span className="text-xs font-semibold text-muted-foreground">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
