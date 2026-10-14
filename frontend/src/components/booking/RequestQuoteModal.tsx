import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Upload, Calendar, Clock, MapPin, ShieldCheck, CheckCircle2,
  AlertCircle, ArrowRight, X, Sparkles, Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName?: string;
  providerName?: string;
  category?: string;
  onSuccess?: (quoteRequest: any) => void;
}

export default function RequestQuoteModal({
  open,
  onOpenChange,
  serviceName = 'Custom Healthcare Service',
  providerName = 'Verified Provider',
  category = 'Care Service',
  onSuccess,
}: RequestQuoteModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('15 Days');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map((f) => f.name);
      setAttachedFiles((prev) => [...prev, ...fileNames]);
      toast.success(`${files.length} document(s) uploaded for clinical evaluation.`);
    }
  };

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('Please describe the required service details or patient needs.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(3);
      onSuccess?.({
        serviceName,
        providerName,
        description,
        duration,
        address,
        startDate,
        attachedFiles,
      });
      toast.success('Quote request submitted! The provider will send an itemized estimate within 24 hours.');
    }, 1000);
  };

  const resetForm = () => {
    setStep(1);
    setDescription('');
    setAddress('');
    setAttachedFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Flow B: Custom Request & Quote
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            {step === 3 ? 'Quote Request Confirmed' : `Request an Estimate for ${serviceName}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 3
              ? 'Your request is in provider clinical review. An itemized quote with GST and payment escrow will be issued.'
              : `Share patient requirements and documents with ${providerName}. Advance payment is safely held until service commences.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block">Service Category</span>
                <strong className="text-foreground">{category}</strong>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Provider</span>
                <strong className="text-primary">{providerName}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Describe Patient Condition & Required Care <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="E.g., Elderly post-op patient requiring daily 12-hour nursing support, catheter care, and vitals monitoring..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-2xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Expected Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-xs font-medium"
                >
                  <option value="1 Week">1 Week</option>
                  <option value="15 Days">15 Days</option>
                  <option value="1 Month">1 Month</option>
                  <option value="3 Months">3 Months</option>
                  <option value="Custom / Long-term">Custom / Long-term</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Preferred Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Attach Prescriptions or Discharge Summaries</span>
                <span className="text-[11px] text-muted-foreground">Optional, scans ClamAV protected</span>
              </label>
              <div className="border-2 border-dashed border-border/60 rounded-2xl p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  id="quote-files"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label htmlFor="quote-files" className="cursor-pointer flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">Click to upload medical files</span>
                  <span className="text-[10px] text-muted-foreground">PDF, PNG, JPG up to 10MB</span>
                </label>
              </div>

              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attachedFiles.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-lg border border-border/40"
                    >
                      <FileText className="w-3 h-3 text-primary" />
                      <span className="max-w-[150px] truncate">{file}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!description.trim()}
              className="w-full rounded-2xl h-11 font-bold text-xs mt-2"
            >
              Next: Location & Contact <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Service Delivery Address / Area <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="House/Flat number, Street, Landmark, Area, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Escrow & Trust Protection Note */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" /> FindMedi Escrow Payment Protection
              </div>
              <ul className="text-muted-foreground space-y-1 text-[11px]">
                <li>• No advance payment is charged right now.</li>
                <li>• The provider reviews clinical requirements and shares an itemized quote with GST within 24 hours.</li>
                <li>• Upon your quote approval, advance funds are held in secure escrow until service commences.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl text-xs h-11 flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-2xl text-xs h-11 font-bold flex-[2]"
              >
                {submitting ? 'Submitting Request...' : 'Submit Quote Request'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold">Request #QR-{Math.floor(100000 + Math.random() * 900000)} Placed</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your request has been routed to <strong>{providerName}</strong>. You will receive an SMS and in-app notification as soon as the itemized proposal is ready.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-left text-xs space-y-1.5 max-w-md mx-auto">
              <span className="font-bold text-foreground block">Next Steps:</span>
              <p className="text-muted-foreground text-[11px]">• Provider verifies clinical feasibility & staff availability.</p>
              <p className="text-muted-foreground text-[11px]">• Itemized quote issued with 48-hour validity price lock.</p>
              <p className="text-muted-foreground text-[11px]">• You can accept, negotiate in chat, or decline without charge.</p>
            </div>

            <Button onClick={resetForm} className="rounded-2xl text-xs h-10 px-6 font-bold">
              Done / Return to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
