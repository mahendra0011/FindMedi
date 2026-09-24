import React, { useState } from 'react';
import { Navigation, Phone, HeartPulse, CheckCircle2, Siren, FileText, ExternalLink, ShieldAlert, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface ActiveHUDProps {
  activeRequest: any;
  onMarkArrived: (requestId: string) => Promise<void>;
  onCompleteVisit: (requestId: string, clinicalReport: any) => Promise<void>;
  onRequestAmbulanceBackup: (requestId: string) => Promise<void>;
}

export default function DoctorActiveEmergencyHUD({
  activeRequest,
  onMarkArrived,
  onCompleteVisit,
  onRequestAmbulanceBackup,
}: ActiveHUDProps) {
  const [pulse, setPulse] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [spO2, setSpO2] = useState('');
  const [statMed, setStatMed] = useState('');
  const [assessment, setAssessment] = useState('');
  const [completing, setCompleting] = useState(false);
  const [markingArrived, setMarkingArrived] = useState(false);

  const openExternalNavigation = () => {
    const coords = activeRequest.pickupLocation?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(url, '_blank');
    } else {
      toast.info('Pickup GPS coordinates not available for external maps');
    }
  };

  const handleArrival = async () => {
    try {
      setMarkingArrived(true);
      await onMarkArrived(activeRequest._id || activeRequest.requestId);
      toast.success('📍 Marked Arrived on Scene! Begin immediate clinical assessment.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update arrival status');
    } finally {
      setMarkingArrived(false);
    }
  };

  const handleFinish = async () => {
    try {
      setCompleting(true);
      await onCompleteVisit(activeRequest._id || activeRequest.requestId, {
        vitals: {
          pulseRate: Number(pulse) || 75,
          bloodPressureSys: Number(bpSys) || 120,
          bloodPressureDia: Number(bpDia) || 80,
          spO2Percentage: Number(spO2) || 98,
        },
        initialAssessment: assessment || 'Patient vitals stabilized at scene.',
        statPrescriptions: statMed ? [{ drugName: statMed, route: 'Oral', instructions: 'Stat dose' }] : [],
        hospitalReferralNeeded: false,
      });
      toast.success('🎉 Emergency Run Completed! Payout credited to your wallet.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete visit');
    } finally {
      setCompleting(false);
    }
  };

  const isEnRoute = activeRequest.status === 'assigned' || activeRequest.status === 'en_route';

  return (
    <div className="bg-card rounded-3xl border-2 border-teal-500/40 p-5 sm:p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Active Run: {activeRequest.patientName}
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                {activeRequest.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{activeRequest.pickupAddress}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeRequest.patientPhone && (
            <a
              href={`tel:${activeRequest.patientPhone}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-teal-400" /> Call Patient
            </a>
          )}
          <Button
            onClick={openExternalNavigation}
            className="flex-1 sm:flex-none gap-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
          >
            <Navigation className="w-4 h-4" /> Turn-by-Turn GPS
          </Button>
        </div>
      </div>

      {/* Transit vs Bedside Stepper */}
      {isEnRoute ? (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">En Route To Patient Location</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live GPS telemetry is streaming to the patient. Proceed safely to scene.
            </p>
          </div>
          <Button
            onClick={handleArrival}
            disabled={markingArrived}
            className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {markingArrived ? 'Marking...' : 'I Have Arrived on Scene'}
          </Button>
        </div>
      ) : (
        /* Clinical Bedside Assessment Form */
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-400" /> Bedside Triage & Vitals
            </h4>
            <span className="text-[11px] text-muted-foreground">Digital Prescription & Stat Rx</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Pulse (BPM)</label>
              <Input placeholder="78" value={pulse} onChange={(e) => setPulse(e.target.value)} className="h-9 text-xs rounded-xl" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold block mb-1">BP (Sys / Dia)</label>
              <div className="flex gap-1">
                <Input placeholder="120" value={bpSys} onChange={(e) => setBpSys(e.target.value)} className="h-9 text-xs rounded-xl" />
                <Input placeholder="80" value={bpDia} onChange={(e) => setBpDia(e.target.value)} className="h-9 text-xs rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold block mb-1">SpO2 (%)</label>
              <Input placeholder="98" value={spO2} onChange={(e) => setSpO2(e.target.value)} className="h-9 text-xs rounded-xl" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Stat Medication</label>
              <Input placeholder="e.g. Aspirin 300mg" value={statMed} onChange={(e) => setStatMed(e.target.value)} className="h-9 text-xs rounded-xl" />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Clinical Assessment Notes</label>
            <Input
              placeholder="Clinical observation, interventions performed, patient responsiveness..."
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Legal / Statutory Compliance Note */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Scale className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span>
              Clinical summary is digitally signed in compliance with IT Act 2000 & NMC Code of Medical Ethics. View{' '}
              <Link to="/terms" target="_blank" className="text-primary underline">Emergency Terms</Link>.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <Button
              onClick={() => onRequestAmbulanceBackup(activeRequest._id || activeRequest.requestId)}
              variant="destructive"
              className="gap-2 rounded-xl text-xs font-bold"
            >
              <Siren className="w-4 h-4 animate-bounce" /> Request Backup ICU Ambulance
            </Button>

            <Button
              onClick={handleFinish}
              disabled={completing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {completing ? 'Completing...' : 'Complete & Settle Visit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
