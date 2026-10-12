import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, CheckCircle2, XCircle, Edit3, RefreshCw, FileText,
  Search, ShieldCheck, AlertCircle, Clock, Eye, Copy, Check, Filter, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface AiReviewItem {
  _id: string;
  hospitalId?: string;
  feature: 'ocr' | 'claim_check' | 'lab_narrative' | 'discharge_draft' | string;
  sourceId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Edited';
  reviewerId?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  createdAt: string;
}

const FEATURE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  ocr: { label: 'OCR Document Vision', icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  discharge_draft: { label: 'Discharge Summary Draft', icon: FileText, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  lab_narrative: { label: 'Lab Trend Narrative', icon: Sparkles, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  claim_check: { label: 'Insurance Claim Check', icon: ShieldCheck, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  Pending: { label: 'Pending Review', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  Approved: { label: 'Approved', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  Rejected: { label: 'Rejected', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300' },
  Edited: { label: 'Edited & Saved', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
};

export default function AiReviewQueue() {
  const [reviews, setReviews] = useState<AiReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state for the selected item
  const [editableFields, setEditableFields] = useState<Record<string, unknown>>({});
  const [reviewerNote, setReviewerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterFeature !== 'all') params.feature = filterFeature;

      const res = await apiClient.get('/ai/reviews', { params });
      const list = res.data?.reviews || [];
      setReviews(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } catch {
      toast.error('Failed to load AI review queue');
    }
    setLoading(false);
  }, [filterStatus, filterFeature, selectedId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const selectedReview = reviews.find((r) => r._id === selectedId) || null;

  useEffect(() => {
    if (selectedReview) {
      const output = selectedReview.output || {};
      const fields: Record<string, unknown> = {};
      Object.entries(output).forEach(([k, v]) => {
        if (!['provider', 'ms', 'providerFailed', 'providerError', '_unparsed'].includes(k)) {
          fields[k] = v;
        }
      });
      setEditableFields(fields);
      setReviewerNote(selectedReview.reviewerNote || '');
    }
  }, [selectedReview]);

  const handleUpdateStatus = async (newStatus: 'Approved' | 'Rejected' | 'Edited') => {
    if (!selectedReview) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        reviewerNote: reviewerNote.trim(),
        output: editableFields,
      };

      const res = await apiClient.patch(`/ai/reviews/${selectedReview._id}`, payload);
      const updated = res.data?.review || { ...selectedReview, ...payload };

      setReviews((prev) =>
        prev.map((r) => (r._id === selectedReview._id ? { ...r, ...updated } : r))
      );

      toast.success(`Review ${newStatus.toLowerCase()} successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update review item';
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const filteredReviews = reviews.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSource = (r.sourceId || '').toLowerCase().includes(q);
      const matchFeature = (r.feature || '').toLowerCase().includes(q);
      const matchOutput = JSON.stringify(r.output || {}).toLowerCase().includes(q);
      if (!matchSource && !matchFeature && !matchOutput) return false;
    }
    return true;
  });

  const pendingCount = reviews.filter((r) => r.status === 'Pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'Approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </span>
            AI Human Review Queue
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Human-in-the-loop review for OCR extractions, clinical summaries, and AI drafts (File 22 P2-37).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={loadReviews}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{reviews.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total In Queue</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-amber-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending Human Review</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{approvedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-rose-600">{rejectedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Main Workspace Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Review Item Feed */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search by ID, keyword, or field..."
                    className="pl-9 h-9 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Status filter tabs */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {['all', 'Pending', 'Approved', 'Rejected'].map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={filterStatus === st ? 'default' : 'outline'}
                      className="h-7 text-xs px-2.5 rounded-lg"
                      onClick={() => setFilterStatus(st)}
                    >
                      {st === 'all' ? 'All Status' : st}
                    </Button>
                  ))}
                </div>
                {/* Feature filter dropdown/pills */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">
                    Feature:
                  </span>
                  {['all', 'ocr', 'discharge_draft', 'lab_narrative'].map((feat) => (
                    <Button
                      key={feat}
                      size="sm"
                      variant={filterFeature === feat ? 'secondary' : 'ghost'}
                      className="h-6 text-[11px] px-2 rounded-md"
                      onClick={() => setFilterFeature(feat)}
                    >
                      {feat === 'all' ? 'All' : feat.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[680px] overflow-y-auto">
              {loading && reviews.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading review items...
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  No review items matching current filter
                </div>
              ) : (
                filteredReviews.map((item) => {
                  const isSelected = item._id === selectedId;
                  const featMeta = FEATURE_LABELS[item.feature] || {
                    label: item.feature, icon: FileText, color: 'bg-muted text-foreground'
                  };
                  const statusMeta = STATUS_BADGES[item.status] || STATUS_BADGES.Pending;

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedId(item._id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border/70 hover:border-border hover:bg-muted/30 bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${featMeta.color}`}>
                          {featMeta.label}
                        </span>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-foreground font-medium line-clamp-1">
                        Source ID: {item.sourceId || item._id}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {item.input?.rawText
                          ? String(item.input.rawText).slice(0, 120)
                          : item.output
                          ? Object.entries(item.output)
                              .filter(([k]) => !k.startsWith('_'))
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')
                          : 'Clinical input data for verification'}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Selected Item Inspection & Action View */}
        <div className="lg:col-span-7 space-y-4">
          {selectedReview ? (
            <Card className="border-border">
              <CardHeader className="p-5 pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                      Review Inspection: {selectedReview.sourceId || selectedReview._id}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Submitted on {new Date(selectedReview.createdAt).toLocaleString('en-IN')}
                    </CardDescription>
                  </div>
                  <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border w-fit ${
                    STATUS_BADGES[selectedReview.status]?.cls || ''
                  }`}>
                    {STATUS_BADGES[selectedReview.status]?.label || selectedReview.status}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {/* 1. Source Document Input Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Original Input Data / Document Context
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] gap-1 px-2 text-muted-foreground"
                      onClick={() => {
                        const raw = JSON.stringify(selectedReview.input || {}, null, 2);
                        navigator.clipboard.writeText(raw);
                        setCopiedInput(true);
                        setTimeout(() => setCopiedInput(false), 2000);
                      }}
                    >
                      {copiedInput ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Source
                    </Button>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl border text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap text-foreground/80 leading-relaxed">
                    {selectedReview.input?.rawText
                      ? String(selectedReview.input.rawText)
                      : JSON.stringify(selectedReview.input || {}, null, 2)}
                  </div>
                </div>

                {/* 2. Structured Extraction Fields Editor */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Extracted Fields & Confidence Ratings
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Edit any field directly before approving
                    </span>
                  </div>

                  <div className="space-y-3.5 bg-card/60 p-4 rounded-xl border border-border/70">
                    {Object.entries(editableFields).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No structured fields extracted
                      </p>
                    ) : (
                      Object.entries(editableFields).map(([key, val]) => {
                        if (key === 'confidence') return null;
                        const confObj = (selectedReview.output?.confidence as Record<string, number>) || {};
                        const fieldConf = confObj[key];

                        let confBadge = null;
                        if (typeof fieldConf === 'number') {
                          const pct = Math.round(fieldConf * 100);
                          const isHigh = pct >= 90;
                          const isMed = pct >= 70 && pct < 90;
                          confBadge = (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                isHigh
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                  : isMed
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                                  : 'bg-rose-500/10 text-rose-600 border-rose-200'
                              }`}
                            >
                              {pct}% confidence
                            </span>
                          );
                        }

                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold capitalize text-foreground">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              {confBadge}
                            </div>
                            {typeof val === 'string' && val.length > 80 ? (
                              <Textarea
                                className="text-xs font-mono min-h-[60px]"
                                value={val}
                                onChange={(e) =>
                                  setEditableFields((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                              />
                            ) : (
                              <Input
                                className="text-xs font-mono h-8"
                                value={typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                onChange={(e) =>
                                  setEditableFields((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Reviewer Rationale Note */}
                <div className="space-y-1.5">
                  <Label htmlFor="reviewerNote" className="text-xs font-semibold text-foreground">
                    Reviewer Notes / Verdict Rationale
                  </Label>
                  <Textarea
                    id="reviewerNote"
                    placeholder="Enter audit notes or rationale for verification / rejection..."
                    className="text-xs min-h-[70px]"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                  />
                </div>

                {/* 4. Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 text-xs h-9"
                    disabled={submitting}
                    onClick={() => handleUpdateStatus('Rejected')}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject AI Draft
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('Edited')}
                    >
                      <Edit3 className="w-4 h-4" />
                      Save Edits
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('Approved')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Finalize
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed p-12 text-center text-muted-foreground">
              <BrainCircuit className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">Select a review item from the feed to inspect and verify</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
