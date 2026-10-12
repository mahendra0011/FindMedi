import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  order: any;
  onClose: () => void;
  onSave: (screeningData: any) => void;
}

export const RadiologySafetyScreeningModal: React.FC<Props> = ({ order, onClose, onSave }) => {
  const isMri = order.modality === 'MRI';
  const isCt = order.modality === 'CT Scan';

  const [hasPacemaker, setHasPacemaker] = useState(order.safetyScreening?.hasPacemakerOrMetalImplant || false);
  const [hasRenal, setHasRenal] = useState(order.safetyScreening?.hasRenalImpairment || false);
  const [creatinine, setCreatinine] = useState(order.safetyScreening?.serumCreatinine || '');
  const [eGfr, setEGfr] = useState(order.safetyScreening?.eGfr || '');
  const [contrastAllergy, setContrastAllergy] = useState(order.safetyScreening?.contrastAllergyHistory || false);
  const [isPregnant, setIsPregnant] = useState(order.safetyScreening?.isPregnant || false);
  const [notes, setNotes] = useState(order.safetyScreening?.clearanceNotes || '');
  const [cleared, setCleared] = useState(order.safetyScreening?.clearedForScan || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      hasPacemakerOrMetalImplant: hasPacemaker,
      hasRenalImpairment: hasRenal,
      serumCreatinine: creatinine ? Number(creatinine) : undefined,
      eGfr: eGfr ? Number(eGfr) : undefined,
      contrastAllergyHistory: contrastAllergy,
      isPregnant,
      clearedForScan: cleared,
      clearanceNotes: notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-xl w-full p-6 text-foreground">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold">{order.modality} Pre-Procedure Safety & Screening</h2>
              <p className="text-xs text-muted-foreground">Patient: {order.patientName} · {order.bodyPart}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-sm">
          {isMri && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
              <p className="font-semibold text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> MRI Magnetic Safety Checklist (AERB/ACR)
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPacemaker}
                  onChange={e => setHasPacemaker(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-xs">Cardiac Pacemaker, Defibrillator, or Ferromagnetic Implants?</span>
              </label>
            </div>
          )}

          {isCt && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <p className="font-semibold text-amber-600 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> CT Contrast & Renal Function Assessment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Serum Creatinine (mg/dL)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1.0"
                    value={creatinine}
                    onChange={e => setCreatinine(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">eGFR (mL/min/1.73m²)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 90"
                    value={eGfr}
                    onChange={e => setEGfr(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={contrastAllergy}
                  onChange={e => setContrastAllergy(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs">Previous Adverse Reaction to Iodinated Contrast Media?</span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={e => setIsPregnant(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="text-xs">Pregnancy Screening: Patient confirmed or suspected pregnant?</span>
            </label>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Staff Clearance Notes & Vitals</label>
            <textarea
              className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Fasting verified, jewelry removed, ear protection provided..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="p-3 bg-muted/30 border rounded-xl flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs">Authorize Scan Readiness</p>
              <p className="text-[11px] text-muted-foreground">Mark study as &quot;Ready for Imaging&quot;</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input
                type="checkbox"
                checked={cleared}
                onChange={e => setCleared(e.target.checked)}
                className="rounded text-emerald-600 w-4 h-4"
              />
              <span className={cleared ? 'text-emerald-600' : 'text-slate-500'}>
                {cleared ? 'CLEARED FOR SCAN' : 'NOT CLEARED'}
              </span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Clearance
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RadiologySafetyScreeningModal;
