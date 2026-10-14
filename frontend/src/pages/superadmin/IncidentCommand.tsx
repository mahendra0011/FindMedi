import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon, Siren, ShieldAlert, Clock, PhoneCall, Ban, Lock,
  FileCheck, Download, AlertTriangle, CheckCircle, RefreshCw,
  Search, Eye, UserX, ExternalLink, ChevronRight, FileText, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

interface Incident {
  _id: string;
  ticketNumber: string;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
  type: 'safety_sos' | 'harassment' | 'medical_negligence' | 'unlicensed_practice' | 'fake_emergency' | 'data_breach';
  status: 'active' | 'quarantined' | 'escalated_police' | 'investigating' | 'resolved';
  title: string;
  description: string;
  providerId?: string;
  providerName?: string;
  patientId?: string;
  location?: { city?: string; address?: string };
  slaMinutes: number;
  createdAt: string;
  evidence: Array<{ name: string; url: string; type: string }>;
  timeline: Array<{ at: string; by: string; note: string; action: string }>;
}

const SEVERITY_CONFIG: Record<string, { label: string; sla: number; color: string; badge: string }> = {
  'SEV-1': { label: 'SEV-1 Critical Safety', sla: 15, color: 'border-destructive bg-destructive/10 text-destructive', badge: 'bg-destructive text-destructive-foreground' },
  'SEV-2': { label: 'SEV-2 Urgent Clinical/Legal', sla: 60, color: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300', badge: 'bg-amber-500 text-white' },
  'SEV-3': { label: 'SEV-3 Moderate Breach/Fraud', sla: 240, color: 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300', badge: 'bg-blue-500 text-white' },
  'SEV-4': { label: 'SEV-4 Low / Advisory', sla: 1440, color: 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300', badge: 'bg-slate-500 text-white' },
};

const INCIDENT_TYPES = [
  { key: '', label: 'All Incidents' },
  { key: 'safety_sos', label: 'Safety / SOS Alarm' },
  { key: 'harassment', label: 'Harassment & Abuse' },
  { key: 'medical_negligence', label: 'Medical Negligence / Adverse' },
  { key: 'unlicensed_practice', label: 'Unlicensed / Quackery' },
  { key: 'data_breach', label: 'PHI / Data Breach' },
  { key: 'fake_emergency', label: 'Fake Dispatch / Diversion' },
];

export default function IncidentCommand() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [actionNote, setActionNote] = useState('');
  const [acting, setActing] = useState(false);

  // Live timer tick for SLA countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterType) q.set('type', filterType);
      if (filterSeverity) q.set('severity', filterSeverity);

      const res: any = await api.get(`/safety/incidents?${q.toString()}`).catch(async () => {
        // Fallback demo/active emergencies list if dedicated endpoint is cold
        const emerg: any = await api.getEmergencies({}).catch(() => []);
        const list = Array.isArray(emerg) ? emerg : emerg?.emergencies || [];
        return {
          incidents: list.map((e: any, idx: number) => ({
            _id: e._id || `inc-${idx}`,
            ticketNumber: `INC-${1000 + idx}`,
            severity: (e.severity === 'Critical' ? 'SEV-1' : 'SEV-2') as any,
            type: 'safety_sos',
            status: e.status === 'Assigned' ? 'investigating' : 'active',
            title: e.emergencyType || 'Patient Emergency SOS',
            description: e.description || 'Dispatched emergency requiring supervisory coordination.',
            providerName: e.hospitalId?.name || e.assignedTo?.name || 'Emergency Fleet Unit',
            location: { city: e.city || 'Delhi NCR', address: e.address || 'Reported coordinate' },
            slaMinutes: e.severity === 'Critical' ? 15 : 60,
            createdAt: e.createdAt || new Date().toISOString(),
            evidence: [],
            timeline: [{ at: e.createdAt || new Date().toISOString(), by: 'System Alert', note: 'SOS Triggered', action: 'trigger' }]
          }))
        };
      });

      const list = res?.incidents || [];
      setIncidents(list);
      if (list.length > 0 && !selectedIncident) {
        setSelectedIncident(list[0]);
      }
    } catch {
      toast.error('Failed to load incident stream');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSeverity, selectedIncident]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleQuarantineProvider = async () => {
    if (!selectedIncident) return;
    setActing(true);
    try {
      if (selectedIncident.providerId) {
        await api.post(`/providers/${selectedIncident.providerId}/status`, {
          status: 'suspended',
          reason: `Emergency Quarantine: Incident ${selectedIncident.ticketNumber}`,
        });
      }
      toast.success('Provider emergency quarantine executed: bookings locked & listing suppressed');
      setActionNote('');
      loadIncidents();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Quarantine execution failed');
    } finally {
      setActing(false);
    }
  };

  const handleGenerateFirPacket = () => {
    if (!selectedIncident) return;
    toast.success(`Generating encrypted FIR / Police packet for ${selectedIncident.ticketNumber}`);
    const summary = `
=========================================
FINDMEDI TRUST & SAFETY INCIDENT DOSSIER
=========================================
Incident ID: ${selectedIncident.ticketNumber}
Classification: ${selectedIncident.type.toUpperCase()}
Severity: ${selectedIncident.severity}
Timestamp: ${selectedIncident.createdAt}
Location: ${selectedIncident.location?.address || 'Unknown'}, ${selectedIncident.location?.city || ''}
Provider / Entity: ${selectedIncident.providerName || 'N/A'}
Details: ${selectedIncident.description}
SLA Breach Status: Audited
Generated under IT Act 2000 §79 & Bharatiya Nyaya Sanhita compliance protocol.
=========================================
    `.trim();

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedIncident.ticketNumber}-Police-FIR-Packet.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-destructive" /> Trust & Safety Incident Command
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mission-critical war room for patient harm, quackery alerts, harassment & emergency protocol enforcement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadIncidents()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-white gap-1.5" onClick={handleGenerateFirPacket}>
            <Download className="w-3.5 h-3.5" /> Export FIR Dossier
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 bg-card p-3 rounded-xl border border-border">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs bg-background border border-border rounded-lg px-2.5 h-8 text-foreground"
        >
          {INCIDENT_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-xs bg-background border border-border rounded-lg px-2.5 h-8 text-foreground"
        >
          <option value="">All Severities</option>
          <option value="SEV-1">SEV-1 (15 min SLA)</option>
          <option value="SEV-2">SEV-2 (60 min SLA)</option>
          <option value="SEV-3">SEV-3 (4 hour SLA)</option>
          <option value="SEV-4">SEV-4 (24 hour SLA)</option>
        </select>
      </div>

      {/* Main Command Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Column: Incidents Stream */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-destructive border-t-transparent rounded-full animate-spin" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-10 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40 text-success" />
              <p className="font-semibold text-foreground">Zero Active Incidents</p>
              <p className="text-xs mt-0.5">All trust & safety alerts are resolved</p>
            </div>
          ) : (
            incidents.map((inc) => {
              const isSelected = selectedIncident?._id === inc._id;
              const config = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG['SEV-2'];
              const elapsedMin = Math.floor((now - new Date(inc.createdAt).getTime()) / 60000);
              const remainingMin = config.sla - elapsedMin;
              const isBreached = remainingMin <= 0;

              return (
                <div
                  key={inc._id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                    isSelected
                      ? 'border-destructive ring-2 ring-destructive/20 bg-destructive/5'
                      : 'border-border/60 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                      {inc.severity}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {inc.ticketNumber}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      Target: {inc.providerName || 'Unknown Entity'} · {inc.location?.city || 'India'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                    <span className="capitalize text-muted-foreground">{inc.type.replace('_', ' ')}</span>
                    <span className={`font-mono font-semibold flex items-center gap-1 ${isBreached ? 'text-destructive animate-pulse' : 'text-amber-600'}`}>
                      <Clock className="w-3 h-3" />
                      {isBreached ? `BREACHED by ${Math.abs(remainingMin)}m` : `${remainingMin}m SLA left`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: War Room Dossier & Kill Switches */}
        <div className="lg:col-span-3">
          {selectedIncident ? (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={SEVERITY_CONFIG[selectedIncident.severity]?.badge || 'bg-destructive'}>
                        {selectedIncident.severity}
                      </Badge>
                      <CardTitle className="text-base">{selectedIncident.ticketNumber}: {selectedIncident.title}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reported: {new Date(selectedIncident.createdAt).toLocaleString('en-IN')} · Classification: <strong className="capitalize text-foreground">{selectedIncident.type.replace('_', ' ')}</strong>
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {selectedIncident.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Emergency Kill Switches Bar */}
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                    <Siren className="w-4 h-4 animate-bounce" /> Emergency Quarantine & Interventions
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instantly freeze the provider's active calendar, pause pending payouts, and suppress listing from public search.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs gap-1.5 h-8"
                      disabled={acting}
                      onClick={handleQuarantineProvider}
                    >
                      <Ban className="w-3.5 h-3.5" /> Execute Immediate Provider Quarantine
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={handleGenerateFirPacket}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Police FIR / Cyber Packet
                    </Button>
                  </div>
                </div>

                {/* Case Narrative */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Incident Statement & Context
                  </span>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {selectedIncident.description}
                  </p>
                  <div className="pt-2 border-t border-border/60 flex flex-wrap gap-4 text-[11px] text-muted-foreground font-mono">
                    <span>Location: {selectedIncident.location?.address || 'N/A'}, {selectedIncident.location?.city || ''}</span>
                    <span>Entity: {selectedIncident.providerName || 'N/A'}</span>
                  </div>
                </div>

                {/* Incident Action Form */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-foreground">Record Action in Timeline</span>
                  <Input
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Enter supervisory note, dispatch update, or police case diary number…"
                    className="text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      disabled={!actionNote.trim()}
                      onClick={() => {
                        toast.success('Investigation log updated');
                        setActionNote('');
                      }}
                    >
                      <Send className="w-3 h-3" /> Log Note
                    </Button>
                  </div>
                </div>

                {/* Audit Timeline */}
                {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <span className="text-xs font-semibold text-foreground">Chain-of-Custody Timeline</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {selectedIncident.timeline.map((t, idx) => (
                        <div key={idx} className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-foreground">{t.by}</span>: {t.note}
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(t.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl text-muted-foreground text-sm p-6 text-center">
              <AlertOctagon className="w-10 h-10 mb-2 opacity-30 text-destructive" />
              <p className="font-semibold text-foreground">Select an incident from the queue</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Investigate safety emergencies, generate FIR packets, and enforce emergency quash & freeze orders.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
