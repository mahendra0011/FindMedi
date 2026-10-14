import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, FileText, CheckCircle2, Clock, AlertCircle, Building2,
  Download, ArrowRight, ExternalLink, Plus, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientInsurance() {
  const [policies, setPolicies] = useState([
    {
      id: 'pol-1',
      insurer: 'HDFC ERGO Health Optima Restore',
      tpa: 'Direct In-House Cashless Desk',
      policyNo: 'POL-2819-HDFC-991',
      insuredMembers: 'Aarav Sharma (Self), Sneha Sharma (Spouse)',
      sumInsured: '₹10,00,000',
      validTill: '14 May 2027',
      status: 'Active',
      type: 'Private Health Insurance',
    },
    {
      id: 'pol-2',
      insurer: 'Ayushman Bharat PM-JAY',
      tpa: 'National Health Authority (NHA)',
      policyNo: 'AB-PMJAY-DEL-491028',
      insuredMembers: 'Family Floater PM-JAY',
      sumInsured: '₹5,00,000 / year',
      validTill: 'Lifetime / Annual Verification',
      status: 'Active & Linked',
      type: 'Government Health Scheme',
    },
  ]);

  const [claims, setClaims] = useState([
    {
      id: 'clm-1',
      hospital: 'Apex Super Specialty Hospital, Sector 62',
      procedure: 'Emergency Appendectomy & Laparoscopy',
      amountClaimed: '₹84,500',
      amountApproved: '₹82,000',
      status: 'Cashless Settled',
      date: '18 Sep 2026',
      claimRef: 'CLM-HDFC-2026-991',
    },
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Insurance Policies & Cashless Claims</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store health insurance cards, link PM-JAY/CGHS schemes, and track real-time hospital cashless pre-authorizations.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('Opening add policy dialog...')}
          className="rounded-xl text-xs font-semibold gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Link New Policy / TPA Card
        </Button>
      </div>

      {/* Active Policies Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Health Coverage</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    {p.type}
                  </Badge>
                  <h3 className="font-heading text-base font-bold text-foreground leading-tight">{p.insurer}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{p.policyNo}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Sum Insured</span>
                  <span className="text-base font-black text-emerald-600">{p.sumInsured}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Covered:</span>
                  <strong className="text-foreground truncate max-w-[200px]">{p.insuredMembers}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until:</span>
                  <strong className="text-foreground">{p.validTill}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TPA / Desk:</span>
                  <strong className="text-foreground">{p.tpa}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cashless Empanelled
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.success('E-Card downloaded to device.')}
                  className="h-7 text-xs font-semibold gap-1 text-primary"
                >
                  <Download className="w-3 h-3" /> E-Health Card
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cashless Claim Tracker */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hospital Cashless Claim Tracker</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Connecting to TPA cashless desk executive...')}
            className="h-7 text-xs rounded-lg gap-1"
          >
            <Clock className="w-3 h-3" /> Request Pre-Auth Assistance
          </Button>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-xs divide-y divide-border/40">
          {claims.map((c) => (
            <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">{c.procedure}</h3>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> {c.hospital} • Ref: {c.claimRef}
                </p>
                <p className="text-[11px] text-muted-foreground">Discharge Date: {c.date}</p>
              </div>

              <div className="text-right sm:shrink-0 space-y-0.5">
                <span className="text-xs text-muted-foreground block">Approved Cashless Amount</span>
                <span className="text-base font-extrabold text-foreground">{c.amountApproved}</span>
                <span className="text-[10px] text-muted-foreground block line-through">Claimed: {c.amountClaimed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
