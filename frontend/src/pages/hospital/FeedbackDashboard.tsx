import { useEffect, useState } from 'react';
import type { Unmodelled } from '@/lib/apiTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  MessageSquare,
  TrendingUp,
  Smile,
  Frown,
  Meh,
  Star,
  RefreshCw,
  Send,
  Filter,
} from 'lucide-react';

interface FeedbackItem {
  _id: string;
  context?: string;
  department?: string;
  npsScore?: number;
  rating?: number;
  comment?: string;
  status?: string;
  response?: {
    note?: string;
    at?: string;
  };
  createdAt: string;
}

interface FeedbackSummary {
  totalResponses: number;
  nps: number | null;
  promoters: number;
  detractors: number;
  passives: number;
  avgCsat: number | null;
  byDepartment?: Record<string, { count: number; sumRating: number; ratedCount: number }>;
}

export default function FeedbackDashboard() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    totalResponses: 0,
    nps: 0,
    promoters: 0,
    detractors: 0,
    passives: 0,
    avgCsat: 0,
  });
  const [loading, setLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [contextFilter, setContextFilter] = useState('ALL');
  
  // Responding Dialog
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [responseStatus, setResponseStatus] = useState<'in_review' | 'resolved'>('resolved');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, sumRes]: any = await Promise.all([
        (api as Unmodelled).get('/feedback', {
          params: {
            context: contextFilter !== 'ALL' ? contextFilter : undefined,
          },
        }),
        (api as Unmodelled).get('/feedback/summary', {
          params: {
            dept: departmentFilter !== 'ALL' ? departmentFilter : undefined,
          },
        }),
      ]);

      setFeedbackList(listRes.data?.feedback || []);
      setSummary(sumRes.data || {
        totalResponses: 0,
        nps: 0,
        promoters: 0,
        detractors: 0,
        passives: 0,
        avgCsat: 0,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [departmentFilter, contextFilter]);

  const handleRespond = async () => {
    if (!selectedItem || !responseNote.trim()) return;
    try {
      setSubmitting(true);
      await api.put(`/feedback/${selectedItem._id}/respond`, {
        note: responseNote.trim(),
        status: responseStatus,
      });
      toast.success('Response recorded successfully');
      setSelectedItem(null);
      setResponseNote('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Patient Feedback & Net Promoter Score (NPS)
          </h1>
          <p className="text-muted-foreground">
            Monitor real-time patient experience, CSAT satisfaction, and respond directly to detractors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Net Promoter Score (NPS)
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {summary.nps !== null ? `${summary.nps > 0 ? '+' : ''}${summary.nps}` : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              %Promoters ({summary.promoters}) − %Detractors ({summary.detractors})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Average CSAT Rating
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {summary.avgCsat ? `${summary.avgCsat} / 5` : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across all rated hospital encounters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Total Responses
              <Smile className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {summary.totalResponses}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary.passives} Passives (Score 7-8)
            </p>
          </CardContent>
        </Card>

        <Card className={summary.detractors > 0 ? 'border-destructive/40 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Detractors Requiring Follow-up
              <Frown className="w-4 h-4 text-destructive" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-destructive">
              {summary.detractors}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Scores ≤ 6 flagged for management action</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Encounter Context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Contexts</SelectItem>
              <SelectItem value="visit">Outpatient Visit</SelectItem>
              <SelectItem value="admission">Inpatient Stay</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="lab">Laboratory</SelectItem>
              <SelectItem value="teleconsult">Teleconsult</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              <SelectItem value="Cardiology">Cardiology</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="General Medicine">General Medicine</SelectItem>
              <SelectItem value="Paediatrics">Paediatrics</SelectItem>
              <SelectItem value="Orthopaedics">Orthopaedics</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Feedback Feed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Ledger & Responses</CardTitle>
          <CardDescription>
            Audit trail of patient ratings and operational responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No feedback records found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((item) => {
                const isDetractor = item.npsScore !== undefined && item.npsScore <= 6;
                const isPromoter = item.npsScore !== undefined && item.npsScore >= 9;
                return (
                  <div
                    key={item._id}
                    className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        {item.npsScore !== undefined && (
                          <Badge
                            variant={isPromoter ? 'default' : isDetractor ? 'destructive' : 'secondary'}
                          >
                            NPS {item.npsScore}
                          </Badge>
                        )}
                        {item.rating && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {item.rating} / 5
                          </Badge>
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {item.department || 'General'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {item.comment ? `"${item.comment}"` : <span className="italic text-muted-foreground">No written comment provided</span>}
                      </p>
                      {item.response?.note && (
                        <div className="text-xs bg-muted p-2 rounded mt-2 text-muted-foreground border-l-2 border-primary">
                          <strong>Admin Response:</strong> {item.response.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {item.status === 'resolved' ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          Resolved
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant={isDetractor ? 'destructive' : 'outline'}
                          onClick={() => {
                            setSelectedItem(item);
                            setResponseNote(item.response?.note || '');
                          }}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Patient Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                Patient Feedback ({selectedItem?.department})
              </div>
              "{selectedItem?.comment || 'No comment'}"
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Response / Resolution Note</label>
              <Textarea
                placeholder="Explain resolution, follow-up call outcomes, or apology note..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={responseStatus}
                onValueChange={(val: 'in_review' | 'resolved') => setResponseStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleRespond} disabled={submitting || !responseNote.trim()}>
              Save Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
