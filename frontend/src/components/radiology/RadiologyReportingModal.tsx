import React, { useState } from 'react';
import { FileCheck, AlertOctagon, X, Mic, History, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  order: any;
  onClose: () => void;
  onSubmit: (reportData: any) => void;
}

const REPORT_TEMPLATES: Record<string, { findings: string; impression: string; recommendation: string }> = {
  'MRI': {
    findings: 'Multiplanar multi-sequence MRI study has been reviewed. No restricted diffusion to suggest acute infarction. Grey-white differentiation is preserved. No abnormal extra-axial collection. Ventricles and basal cisterns are normal in calibre. No abnormal parenchymal signal. No mass effect or midline shift.',
    impression: 'No acute intracranial abnormality.',
    recommendation: 'Correlate clinically. Follow-up as required.',
  },
  'CT Scan': {
    findings: 'Axial images have been reviewed with appropriate window settings. No acute intracranial haemorrhage, mass effect or midline shift. Paranasal sinuses are clear. Visualised lung parenchyma shows no focal consolidation. No pleural effusion or pneumothorax. Bones are intact.',
    impression: 'No acute abnormality on this study.',
    recommendation: 'No further imaging recommended in the acute setting.',
  },
  'X-Ray': {
    findings: 'The examination includes the standard projections. Lung fields are clear with no focal consolidation. Cardiomediastinal silhouette is within normal limits. No pleural effusion or pneumothorax. Bony thorax is intact. Soft tissues are unremarkable.',
    impression: 'No acute cardiopulmonary abnormality.',
    recommendation: 'Clinical correlation advised. Repeat film if symptoms persist.',
  },
  'Ultrasound': {
    findings: 'The relevant organ has been surveyed in multiple planes. Parenchymal echotexture is homogeneous. No focal lesion is identified. No free fluid in the accessed regions. Visualised portions of adjacent structures are unremarkable.',
    impression: 'Normal study for the area examined.',
    recommendation: 'No sonographic follow-up indicated.',
  },
  'Doppler': {
    findings: 'The vessel is visualised in longitudinal and transverse planes. The lumen is fully compressible with no intraluminal thrombus. Colour Doppler shows laminar flow with normal velocities. No significant stenosis or occlusion identified.',
    impression: 'Patent vessel with normal flow dynamics. No evidence of deep vein thrombosis.',
    recommendation: 'No vascular follow-up required.',
  },
  'Mammography': {
    findings: 'Both breasts have been imaged in standard craniocaudal and mediolateral oblique projections. Fibroglandular tissue is distributed symmetrically. No spiculated mass, architectural distortion or suspicious clustered microcalcifications are seen. Axillary regions are clear.',
    impression: 'BI-RADS 1 - Negative. No suspicious findings.',
    recommendation: 'Routine annual screening as per age-appropriate guidelines.',
  },
  'Echo': {
    findings: 'Transthoracic echocardiography performed. Chambers are of normal size with preserved systolic function. No regional wall motion abnormality. Valves are structurally normal without significant regurgitation. No pericardial effusion.',
    impression: 'Normal transthoracic echocardiogram with preserved LV function.',
    recommendation: 'Correlate with clinical findings.',
  },
  'Default': {
    findings: 'The study has been reviewed in entirety. No significant acute abnormality is identified on the images acquired.',
    impression: 'No acute abnormality.',
    recommendation: 'Clinical correlation advised.',
  },
};

export const RadiologyReportingModal: React.FC<Props> = ({ order, onClose, onSubmit }) => {
  const [findings, setFindings] = useState(order.findings || '');
  const [impression, setImpression] = useState(order.impression || '');
  const [recommendation, setRecommendation] = useState(order.recommendation || '');
  const [isCritical, setIsCritical] = useState(order.criticalFinding?.isCritical || false);
  const [urgencyLevel, setUrgencyLevel] = useState(order.criticalFinding?.urgencyLevel || 'Orange - Urgent 1hr');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [dictating, setDictating] = useState(false);

  const tpl = REPORT_TEMPLATES[order.modality] || REPORT_TEMPLATES['Default'];
  const versions: any[] = order.reportVersions || [];
  const isAmendment = Boolean(order.findings || order.impression || versions.length > 0);

  const insertTemplate = (field: 'findings' | 'impression' | 'recommendation') => {
    const text = tpl[field];
    if (field === 'findings') setFindings((p: string) => (p ? `${p}\n\n${text}` : text));
    if (field === 'impression') setImpression((p: string) => (p ? `${p}\n${text}` : text));
    if (field === 'recommendation') setRecommendation((p: string) => (p ? `${p} ${text}` : text));
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!dictating) {
      setDictating(true);
      recognition.start();
      recognition.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setFindings(prev => prev ? `${prev} ${text}` : text);
        setDictating(false);
      };
      recognition.onerror = () => setDictating(false);
      recognition.onend = () => setDictating(false);
    } else {
      setDictating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAmendment && !amendmentReason.trim()) {
      alert('Amendment reason is required.');
      return;
    }
    onSubmit({
      findings,
      impression,
      recommendation,
      amendmentReason: isAmendment ? amendmentReason : undefined,
      criticalFinding: {
        isCritical,
        urgencyLevel: isCritical ? urgencyLevel : '',
        findingDetails: isCritical ? impression || findings : '',
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-foreground max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-bold">
                {isAmendment ? 'Amend / Addendum Radiology Report' : 'Sign & Submit Diagnostic Report'}
              </h2>
              <p className="text-xs text-muted-foreground">{order.orderId} - {order.patientName} - {order.modality} ({order.bodyPart})</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {isAmendment && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
            <p className="font-semibold text-amber-600 flex items-center gap-1.5 mb-1">
              <History className="w-3.5 h-3.5" /> Amendment of an existing signed report
            </p>
            <p className="text-muted-foreground">The current version is archived to version history (currently {versions.length} archived). A reason is required.</p>
          </div>
        )}

        {versions.length > 0 && (
          <div className="mt-3 p-3 bg-muted/40 border rounded-xl text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-muted-foreground">
              <History className="w-3.5 h-3.5" /> Previous Versions ({versions.length})
            </p>
            {versions.map((v: any, idx: number) => (
              <p key={idx} className="text-muted-foreground">
                v{v.versionNumber} ({new Date(v.signedAt).toLocaleDateString()}): {v.amendmentReason || 'Signed report'}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-sm">
          {isAmendment && (
            <div>
              <label className="text-xs font-semibold text-amber-600 block mb-1">Reason for Amendment / Addendum *</label>
              <Input
                required
                placeholder="e.g. Second opinion correlation, prior scan comparison update..."
                value={amendmentReason}
                onChange={e => setAmendmentReason(e.target.value)}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Technique & Findings *</label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  title={`Insert a normal ${order.modality} findings template`}
                  onClick={() => insertTemplate('findings')}
                >
                  <Wand2 className="w-3 h-3 mr-1" /> Normal template
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs ${dictating ? 'bg-red-500 text-white animate-pulse' : ''}`}
                  onClick={handleVoiceToggle}
                >
                  <Mic className="w-3 h-3 mr-1" /> {dictating ? 'Listening...' : 'Voice Dictate'}
                </Button>
              </div>
            </div>
            <textarea
              required
              rows={5}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-sans"
              placeholder="Technique, contrast phases, detailed radiological observations across series..."
              value={findings}
              onChange={e => setFindings(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="text-xs font-semibold text-muted-foreground block">Diagnostic Impression *</label>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => insertTemplate('impression')}>
                <Wand2 className="w-3 h-3 mr-1" /> Normal template
              </Button>
            </div>
            <textarea
              required
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-sans"
              placeholder="Primary differential, acute pathology, BIRADS/PIRADS/LI-RADS score..."
              value={impression}
              onChange={e => setImpression(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="text-xs font-semibold text-muted-foreground block">Recommendations & Follow-up</label>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => insertTemplate('recommendation')}>
                <Wand2 className="w-3 h-3 mr-1" /> Normal template
              </Button>
            </div>
            <Input
              placeholder="e.g. Contrast CT correlation recommended, repeat ultrasound in 6 weeks..."
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
            />
          </div>

          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-red-600">
                <input
                  type="checkbox"
                  checked={isCritical}
                  onChange={e => setIsCritical(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" /> Flag as Critical / Panic Finding
                </span>
              </label>
              {isCritical && (
                <select
                  value={urgencyLevel}
                  onChange={e => setUrgencyLevel(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-red-300 bg-background text-xs text-red-600 font-semibold"
                >
                  <option value="Red - Immediate 15min">Red - Immediate (15 min)</option>
                  <option value="Orange - Urgent 1hr">Orange - Urgent (1 hr)</option>
                  <option value="Yellow - Same day">Yellow - Same day</option>
                </select>
              )}
            </div>
            {isCritical && (
              <p className="text-[11px] text-red-600/80">
                This triggers a STAT push notification to the ordering physician (Dr. {order.doctorName}) and opens a row in the Critical Findings queue.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              <FileCheck className="w-4 h-4 mr-1.5" /> {isAmendment ? 'Sign Amendment' : 'Sign & Release Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RadiologyReportingModal;
