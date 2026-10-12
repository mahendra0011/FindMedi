import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { Cpu, Send, Radio, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';

const ANALYZERS = [
  { id: 'biochem-xl-640', model: 'Erba Lachema XL-640', dept: 'Biochemistry', protocol: 'ASTM' },
  { id: 'hematology-xn-1000', model: 'Sysmex XN-1000', dept: 'Hematology', protocol: 'HL7' },
  { id: 'immunoassay-access-2', model: 'Bio-Rad Access 2', dept: 'Immunoassay', protocol: 'HL7' },
];

/**
 * Device Integration Module: LIS analyzer emulator — generates real-format
 * ASTM/HL7 packets from named analyzers, previews parser output, then pushes
 * the packet through the actual ingest pipeline (bidirectional bridge test).
 */
export default function LabAnalyzerEmulatorPage() {
  const [analyzer, setAnalyzer] = useState(ANALYZERS[0].id);
  const [sampleId, setSampleId] = useState('');
  const [emulated, setEmulated] = useState<any>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<any>(null);

  const profile = ANALYZERS.find((a) => a.id === analyzer)!;

  const generate = async () => {
    try {
      setGenLoading(true);
      setIngestResult(null);
      const r: any = await api.post('/lab/ingest/emulate', { analyzer, sampleId: sampleId || undefined });
      setEmulated(r);
      toast.success(`Packet generated for ${r.analyzerModel} (${r.protocol}) — ${r.preview?.results?.length ?? 0} results parsed`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Emulation failed');
    } finally { setGenLoading(false); }
  };

  const sendToIngest = async () => {
    if (!emulated) return;
    try {
      setSendLoading(true);
      const r: any = emulated.protocol === 'HL7'
        ? await api.post('/lab/ingest/hl7', { message: emulated.rawPacket })
        : await api.post('/lab/ingest/astm', { frame: emulated.rawPacket });
      setIngestResult(r);
      toast.success(r?.message || `Ingested: ${r?.applied ?? r?.matched ?? 0} applied, ${r?.critical ?? 0} critical`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ingest failed');
    } finally { setSendLoading(false); }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-6 w-6 text-primary" />
          LIS Analyzer Emulator
          <Badge variant="outline">Device Integration · ASTM / HL7</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate a benchtop analyzer: generate a protocol-correct packet, preview parsing, then push it through the real ingest pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analyzer selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Analyzer
            </CardTitle>
            <CardDescription className="text-xs">Pick an instrument profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ANALYZERS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAnalyzer(a.id)}
                className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${analyzer === a.id ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.model}</span>
                  <Badge variant="outline" className="text-[10px]">{a.protocol}</Badge>
                </div>
                <div className="text-muted-foreground mt-0.5">{a.dept} · {a.id}</div>
              </button>
            ))}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-muted-foreground">Sample / Accession ID (optional)</label>
              <Input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="auto-generated if blank" className="text-xs font-mono" />
            </div>
            <Button className="w-full" disabled={genLoading} onClick={generate}>
              <Radio className="h-4 w-4 mr-2" /> {genLoading ? 'Generating…' : 'Generate packet'}
            </Button>
          </CardContent>
        </Card>

        {/* Raw packet */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" /> Raw wire packet
              {emulated && <Badge variant="outline" className="text-[10px]">{emulated.protocol}</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">
              {emulated ? `${emulated.analyzerModel} · sample ${emulated.sampleId}` : 'Generate to see the packet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-64 overflow-auto rounded-lg bg-black/90 text-green-400 p-3 text-[11px] font-mono whitespace-pre-wrap break-all">
              {emulated?.rawPacket?.replace(/\r/g, '␍\n') || '— no packet yet —'}
            </pre>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={!emulated || sendLoading} onClick={sendToIngest}>
                <Send className="h-3.5 w-3.5 mr-1" /> {sendLoading ? 'Sending…' : `Send to ${emulated?.ingestEndpoint || 'ingest'}`}
              </Button>
              {ingestResult && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> applied {ingestResult.applied ?? ingestResult.matched ?? 0}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parsed preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Parser preview
            </CardTitle>
            <CardDescription className="text-xs">
              {emulated ? `${emulated.preview?.results?.length ?? 0} result(s) via ${emulated.preview?.protocol}` : 'Parsed output appears here.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emulated?.preview?.results?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No parsed results yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1.5 pr-2">Test</th>
                    <th className="py-1.5 pr-2">Value</th>
                    <th className="py-1.5 pr-2">Ref</th>
                    <th className="py-1.5">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {emulated.preview.results.map((r: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 font-mono">{r.testCode}</td>
                      <td className="py-1.5 pr-2">{r.value} <span className="text-muted-foreground">{r.units}</span></td>
                      <td className="py-1.5 pr-2 text-muted-foreground">{r.referenceRange}</td>
                      <td className="py-1.5">
                        <Badge variant="outline" className={`text-[10px] ${r.flag === 'N' ? 'text-emerald-600 border-emerald-500/30' : 'text-red-600 border-red-500/30'}`}>
                          {r.flag === 'N' ? <CheckCircle2 className="h-3 w-3 inline mr-0.5" /> : <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                          {r.flag}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
