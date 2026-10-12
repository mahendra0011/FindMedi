import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  SunMedium,
  Contrast,
  Sliders,
  Eye,
  Layers,
  Ruler,
  FileText,
  Mic,
  MicOff,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

interface PacsDicomViewerProps {
  orderId?: string;
  patientName?: string;
  modality?: string;
  bodyPart?: string;
  imageUrl?: string;
  onClose?: () => void;
}

export default function PacsDicomViewer({
  orderId = 'RAD-CT-0921',
  patientName = 'Rahul Sharma',
  modality = 'CT Scan',
  bodyPart = 'Thorax / Chest (Axial)',
  imageUrl = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
  onClose,
}: PacsDicomViewerProps) {
  // DICOM Windowing presets (Hounsfield Units: Window Width & Window Level)
  const [windowPreset, setWindowPreset] = useState<'lung' | 'bone' | 'mediastinum' | 'brain'>('lung');
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [sliceIndex, setSliceIndex] = useState<number>(24);
  const totalSlices = 64;

  // Radiologist Voice Dictation State
  const [isRecording, setIsRecording] = useState(false);
  const [dictatedFindings, setDictatedFindings] = useState(
    'Bilateral lung parenchyma reveals clear airspace. Tracheobronchial tree is normal without endobronchial lesions. No mediastinal or hilar lymphadenopathy. Cardiac chambers within normal limits.'
  );
  const [impression, setImpression] = useState('No acute pulmonary pathology detected.');

  // Windowing filters mapping
  const getFilterStyle = () => {
    switch (windowPreset) {
      case 'bone':
        return 'contrast(200%) brightness(130%) grayscale(100%)';
      case 'mediastinum':
        return 'contrast(150%) brightness(90%) grayscale(100%)';
      case 'brain':
        return 'contrast(180%) brightness(110%) grayscale(100%)';
      case 'lung':
      default:
        return 'contrast(120%) brightness(100%) grayscale(100%)';
    }
  };

  const handleToggleDictation = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info('Voice dictation active: Speak clinical findings clearly...');
    } else {
      setIsRecording(false);
      toast.success('Voice dictation transcribed to structured report');
    }
  };

  return (
    <div className="flex flex-col h-[85vh] bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top DICOM Metadata Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/20 text-primary border-primary/30 uppercase font-mono">
            {modality}
          </Badge>
          <span className="font-semibold text-slate-200">{patientName}</span>
          <span className="text-slate-500 font-mono">[{orderId}]</span>
          <span className="text-slate-400 font-medium">• {bodyPart}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400">
            Slice: {sliceIndex} / {totalSlices}
          </span>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs text-slate-400 hover:text-white">
              Exit Viewer
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace (Viewport + Sidebar) */}
      <div className="flex flex-1 overflow-hidden">
        {/* DICOM Image Viewport Canvas */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden select-none">
          {/* Overlay Corner Annotations (Standard DICOM format) */}
          <div className="absolute top-3 left-3 text-[11px] font-mono text-cyan-400 space-y-0.5 pointer-events-none drop-shadow">
            <p>HOSPITAL CENTRAL PACS</p>
            <p>Series 2 • Axial 5.0mm</p>
            <p>kVp 120 • mA 250</p>
          </div>

          <div className="absolute top-3 right-3 text-[11px] font-mono text-cyan-400 text-right space-y-0.5 pointer-events-none drop-shadow">
            <p>WL: {windowPreset === 'lung' ? '-600' : '40'} WW: {windowPreset === 'lung' ? '1500' : '400'}</p>
            <p>Zoom: {zoom}%</p>
            <p>Rot: {rotation}°</p>
          </div>

          <div className="absolute bottom-3 left-3 text-[11px] font-mono text-cyan-400 pointer-events-none">
            <p>FOV: 350 mm</p>
            <p>Matrix: 512 x 512</p>
          </div>

          {/* Interactive Rendering Image with DICOM Filters */}
          <div
            className="transition-transform duration-100 ease-out flex items-center justify-center cursor-crosshair"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={imageUrl}
              alt="DICOM Slice"
              className="max-h-[60vh] max-w-[80vw] object-contain rounded"
              style={{
                filter: getFilterStyle(),
              }}
            />
          </div>

          {/* Slice Navigation Slider Overlay at Bottom */}
          <div className="absolute bottom-4 left-1/4 right-1/4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700/60 flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400">Slice</span>
            <Slider
              value={[sliceIndex]}
              max={totalSlices}
              min={1}
              step={1}
              onValueChange={(val) => setSliceIndex(val[0])}
              className="flex-1"
            />
            <span className="text-[10px] font-mono text-cyan-400">{sliceIndex}</span>
          </div>
        </div>

        {/* Right Tooling & Voice Reporting Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* DICOM Toolbar */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Window Presets (WW/WL)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['lung', 'bone', 'mediastinum', 'brain'] as const).map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={windowPreset === preset ? 'default' : 'outline'}
                  onClick={() => setWindowPreset(preset)}
                  className={`text-xs h-7 capitalize ${
                    windowPreset === preset ? 'bg-cyan-600 text-white' : 'border-slate-700 text-slate-300'
                  }`}
                >
                  {preset} Window
                </Button>
              ))}
            </div>
          </div>

          {/* Transform Tools */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Image Manipulations
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.min(250, z + 20))}
                className="h-7 px-2 border-slate-700 text-slate-300"
              >
                <ZoomIn className="h-3.5 w-3.5 mr-1" /> Zoom +
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.max(50, z - 20))}
                className="h-7 px-2 border-slate-700 text-slate-300"
              >
                <ZoomOut className="h-3.5 w-3.5 mr-1" /> Zoom -
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="h-7 px-2 border-slate-700 text-slate-300"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" /> 90°
              </Button>
            </div>
          </div>

          {/* Voice Dictation & Structured Report */}
          <div className="border-t border-slate-800 pt-3 space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                Radiology Reporting
              </span>
              <Button
                size="sm"
                variant={isRecording ? 'destructive' : 'outline'}
                onClick={handleToggleDictation}
                className={`h-7 px-2.5 text-xs flex items-center gap-1 ${
                  isRecording ? 'animate-pulse' : 'border-slate-700 text-slate-300'
                }`}
              >
                {isRecording ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                {isRecording ? 'Dictating...' : 'Voice Mic'}
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold">Observations & Findings</label>
              <textarea
                value={dictatedFindings}
                onChange={(e) => setDictatedFindings(e.target.value)}
                className="w-full h-24 p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold">Impression / Conclusion</label>
              <Input
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-slate-200 h-8"
              />
            </div>

            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8 mt-auto flex items-center justify-center gap-1.5"
              onClick={() => toast.success('Radiology report verified & digitally signed')}
            >
              <CheckCircle2 className="h-4 w-4" />
              Sign & Publish DICOM Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
