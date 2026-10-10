import { useEffect, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/** File 22 P2-33: PDF print/worker page. */
export default function PdfWorker() {
  const [html, setHtml] = useState('<h1>Report</h1><p>Content goes here.</p>');
  const [css, setCss] = useState('body { font-family: sans-serif; padding: 20px; }');
  const [filename, setFilename] = useState('document.pdf');
  const [job, setJob] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  const submit = async () => {
    try {
      const r: any = await api.post('/pdf-worker/render', { html, css, filename });
      setJob(r);
      setPolling(true);
      toast.success('PDF job queued');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  useEffect(() => {
    if (!polling || !job?.jobId) return;
    const timer = setInterval(async () => {
      try {
        const r: any = await api.get(`/pdf-worker/status/${job.jobId}`);
        setJob(r);
        if (r.status === 'done') { setPolling(false); toast.success('PDF ready'); }
      } catch { setPolling(false); }
    }, 1000);
    return () => clearInterval(timer);
  }, [polling, job?.jobId]);

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><FileText size={18} /> PDF worker</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">HTML input</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
          <textarea
            className="h-20 w-full rounded border p-2 font-mono text-xs"
            value={css}
            onChange={(e) => setCss(e.target.value)}
          />
          <Input placeholder="Filename" value={filename} onChange={(e) => setFilename(e.target.value)} />
          <Button size="sm" onClick={submit} disabled={polling}>
            {polling ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {polling ? 'Rendering...' : 'Generate PDF'}
          </Button>
        </CardContent>
      </Card>
      {job ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Job status</CardTitle></CardHeader>
          <CardContent className="text-xs">
            <p>ID: {job.jobId}</p>
            <p>Status: {job.status}</p>
            {job.filename ? <p>File: {job.filename}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Input({ placeholder, value, onChange }: any) {
  return (
    <input
      className="w-full rounded border p-2 text-xs"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}
