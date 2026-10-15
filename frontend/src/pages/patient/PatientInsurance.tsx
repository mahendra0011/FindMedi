import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, FileText, CheckCircle2, Clock, AlertCircle, Building2,
  Download, ArrowRight, ExternalLink, Plus, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const fmtDate = (iso: any) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtINR = (n: any) => (n === null || n === undefined || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

export default function PatientInsurance() {
  interface PolicyRow {
    id: string;
    type: string;
    insurer: string;
    policyNo: string;
    status: string;
    insuredMembers: string;
    validTill: string;
    tpa: string;
  }
  interface ClaimRow {
    id: string;
    procedure: string;
    status: string;
    claimRef: string;
    date: string;
    amountApproved: string;
    amountClaimed: string;
  }
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Live data only (GET /patient/insurance/policies + GET /insurance,
  // both session-scoped). Empty lists render empty states, never fixtures.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.getMyInsurancePolicies(), api.getMyInsuranceClaims()])
      .then(([pol, clm]) => {
        if (cancelled) return;
        const prow = pol.status === 'fulfilled' ? pol.value : null;
        const crows = clm.status === 'fulfilled' ? clm.value : null;
        const livePolicies = Array.isArray(prow?.policies) ? prow.policies : [];
        const liveClaims = Array.isArray(crows?.claims) ? crows.claims : [];
        setPolicies(livePolicies.map((r: any) => ({
          id: String(r._id || r.id),
          type: r.scheme || 'Health Insurance',
          insurer: r.insurer || '—',
          policyNo: r.policyNumber || '—',
          status: r.status || 'active',
          insuredMembers: Array.isArray(r.memberIds) && r.memberIds.length ? r.memberIds.join(', ') : 'Self',
          validTill: fmtDate(r.validTo),
          tpa: r.tpa || '—',
        })));
        setClaims(liveClaims.map((c: any) => ({
          id: String(c._id || c.claimId || c.id),
          procedure: c.claimId ? `Claim ${c.claimId}` : 'Insurance Claim',
          status: c.claimStatus || c.status || 'Filed',
          hospital: '',
          claimRef: c.claimId || '',
          date: fmtDate(c.createdAt || c.updatedAt),
          amountApproved: fmtINR(c.approvedAmount),
          amountClaimed: fmtINR(c.claimAmount),
        })));
      })
      .catch(() => {
        if (!cancelled) {
          setPolicies([]);
          setClaims([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {loading && <p className="text-xs text-muted-foreground py-6 text-center">Loading your policies…</p>}
        {!loading && policies.length === 0 && (
          <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-2">
            <p className="font-bold text-sm text-foreground">No policies linked yet</p>
            <p className="text-xs text-muted-foreground">Link your health insurance card or PM-JAY/CGHS scheme to track cashless claims here.</p>
          </div>
        )}
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {p.status === 'active' ? 'Active' : 'Expired'}
                  </span>
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
          {!loading && claims.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center">No cashless claims yet — your hospital claims will appear here.</p>
          )}
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
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Ref: {c.claimRef}
                </p>
                <p className="text-[11px] text-muted-foreground">Filed: {c.date}</p>
              </div>

              <div className="text-right sm:shrink-0 space-y-0.5">
                <span className="text-xs text-muted-foreground block">Approved Cashless Amount</span>
                <span className="text-base font-extrabold text-foreground">{c.amountApproved}</span>
                <span className="text-[10px] text-muted-foreground block">Claimed: {c.amountClaimed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
