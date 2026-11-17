import React, { useEffect, useState } from 'react';
import {
  Users, Plus, RefreshCw, ShieldCheck, CheckSquare, Award, Clock,
  MapPin, CheckCircle2, UserCheck, AlertCircle, BookOpen, ClipboardList, Save,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user: { _id: string; name: string; email: string; role: string };
  roleTemplate: string;
  city?: string;
  manager?: { name: string; email: string };
  status: 'active' | 'on_leave' | 'exited';
  joinDate?: string;
  onboardingChecklist?: Array<{ label: string; done: boolean }>;
  trainingRecords?: Array<{ module: string; completedAt?: string }>;
  goals?: string[];
  oneToOnes?: Array<{ date: string; note: string; followUp?: string; by?: string }>;
  scorecards?: Array<{ period: string; rating: number; wins?: string; focus?: string; by?: string }>;
}

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    userId: '',
    roleTemplate: 'field_exec',
    city: 'Bhopal',
  });
  const [coachingId, setCoachingId] = useState<string | null>(null);
  const coachingMember = members.find((m) => m.id === coachingId) ?? null;
  const [scorecard, setScorecard] = useState({ period: '2026-Q3', rating: '3', wins: '', focus: '' });
  const [oneToOne, setOneToOne] = useState({ date: new Date().toISOString().slice(0, 10), note: '', followUp: '' });
  const [saving, setSaving] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/crm/team');
      setMembers(res.data.members || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch team roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.userId.trim()) {
      toast.error('User ID is required');
      return;
    }
    try {
      await apiClient.post('/crm/team', {
        userId: newMember.userId.trim(),
        roleTemplate: newMember.roleTemplate,
        city: newMember.city,
      });
      toast.success('Team member enrolled into platform roster');
      setIsAddOpen(false);
      setNewMember({
        userId: '',
        roleTemplate: 'field_exec',
        city: 'Bhopal',
      });
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add team member');
    }
  };

  const toggleChecklistItem = async (member: TeamMember, index: number) => {
    try {
      const updated = [...(member.onboardingChecklist || [])];
      updated[index].done = !updated[index].done;
      await apiClient.patch(`/crm/team/${member.id}`, {
        onboardingChecklist: updated,
      });
      toast.success('Onboarding checklist updated');
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update checklist');
    }
  };

  const saveScorecard = async () => {
    if (!coachingMember) return;
    if (!/^\d{4}-Q[1-4]$/.test(scorecard.period.trim())) {
      toast.error('Period must look like 2026-Q3');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/crm/team/${coachingMember.id}/scorecards`, {
        period: scorecard.period.trim(),
        rating: Number(scorecard.rating),
        wins: scorecard.wins,
        focus: scorecard.focus,
      });
      toast.success('Scorecard saved');
      setScorecard({ ...scorecard, wins: '', focus: '' });
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save scorecard');
    } finally {
      setSaving(false);
    }
  };

  const saveOneToOne = async () => {
    if (!coachingMember) return;
    if (oneToOne.note.trim().length < 5) {
      toast.error('Note must be at least 5 characters');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/crm/team/${coachingMember.id}/one-to-ones`, {
        date: oneToOne.date,
        note: oneToOne.note,
        followUp: oneToOne.followUp,
      });
      toast.success('1:1 note saved');
      setOneToOne({ date: new Date().toISOString().slice(0, 10), note: '', followUp: '' });
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save 1:1 note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border-indigo-200">
              Platform Team Management (Separate from Tenant Staff)
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Users className="h-6 w-6 text-primary" />
            Operations & Field Team Roster
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage platform field executives, KYC reviewers, city managers, onboarding checklists, and privacy compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchTeam} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-9 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Enroll Team Member
          </Button>
        </div>
      </div>

      {/* Team Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map((member) => {
          const checklist = member.onboardingChecklist || [];
          const doneCount = checklist.filter((c) => c.done).length;
          const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

          return (
            <Card key={member.id} className="shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{member.user?.name || 'Platform Member'}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">{member.user?.email}</CardDescription>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">
                    {member.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="capitalize bg-muted/60">
                    Role: {member.roleTemplate.replace(/_/g, ' ')}
                  </Badge>
                  {member.city && (
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <MapPin className="h-3 w-3" />
                      {member.city}
                    </span>
                  )}
                </div>

                {/* Onboarding Checklist Progress */}
                <div className="space-y-2 border-t border-border/50 pt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Onboarding Induction</span>
                    <span className="text-muted-foreground">{doneCount} / {checklist.length} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />

                  <div className="space-y-1.5 pt-1">
                    {checklist.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleChecklistItem(member, idx)}
                        className="flex items-center gap-2 text-left w-full hover:bg-muted/40 p-1 rounded text-xs transition-colors"
                      >
                        <CheckSquare className={`h-3.5 w-3.5 shrink-0 ${item.done ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <span className={item.done ? 'line-through text-muted-foreground' : 'text-foreground'}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Scorecards & 1:1s (manager-of-record only) */}
                {member.scorecards !== undefined && (
                  <div className="flex items-center justify-between border-t border-border/50 pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      {member.scorecards?.length ?? 0} scorecard{(member.scorecards?.length ?? 0) === 1 ? '' : 's'} · {member.oneToOnes?.length ?? 0} 1:1{(member.oneToOnes?.length ?? 0) === 1 ? '' : 's'} · {member.goals?.length ?? 0} goal{(member.goals?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCoachingId(member.id)}>
                      <BookOpen className="h-3.5 w-3.5" />
                      Scorecards & 1:1s
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {members.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            No platform team members enrolled yet. Click "Enroll Team Member" to get started.
          </div>
        )}
      </div>

      {/* Coaching Dialog: scorecards + 1:1 notes (manager-of-record) */}
      <Dialog open={!!coachingId} onOpenChange={(open) => { if (!open) setCoachingId(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{coachingMember?.user?.name || 'Member'} — Scorecards & 1:1s</DialogTitle>
            <DialogDescription>Manager-of-record coaching material. Visible only to this member's manager and platform admins.</DialogDescription>
          </DialogHeader>

          {/* Scorecards */}
          <div className="space-y-3 border-b border-border/60 pb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Quarterly scorecard</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Period</Label>
                <Input value={scorecard.period} onChange={(e) => setScorecard({ ...scorecard, period: e.target.value })} placeholder="2026-Q3" className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Rating (1–5)</Label>
                <Select value={scorecard.rating} onValueChange={(v) => setScorecard({ ...scorecard, rating: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4', '5'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button size="sm" className="w-full gap-1.5 h-9" onClick={saveScorecard} disabled={saving}>
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Input placeholder="Wins this period" value={scorecard.wins} onChange={(e) => setScorecard({ ...scorecard, wins: e.target.value })} className="text-xs" />
            <Input placeholder="Focus for next period" value={scorecard.focus} onChange={(e) => setScorecard({ ...scorecard, focus: e.target.value })} className="text-xs" />
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(coachingMember?.scorecards || []).map((s, i) => (
                <div key={i} className="text-xs border rounded p-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold">{s.period}</span> · rating {s.rating}/5
                    {s.wins && <p className="text-muted-foreground pt-0.5">Wins: {s.wins}</p>}
                    {s.focus && <p className="text-muted-foreground pt-0.5">Focus: {s.focus}</p>}
                  </div>
                </div>
              ))}
              {(coachingMember?.scorecards || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No scorecards yet — save the first one above.</p>
              )}
            </div>
          </div>

          {/* 1:1 notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> 1:1 notes</h3>
            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs font-semibold">Date</Label>
                <Input type="date" value={oneToOne.date} onChange={(e) => setOneToOne({ ...oneToOne, date: e.target.value })} className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Follow-up (optional)</Label>
                <Input value={oneToOne.followUp} onChange={(e) => setOneToOne({ ...oneToOne, followUp: e.target.value })} placeholder="e.g. revisit payout SLA" className="mt-1 text-xs" />
              </div>
              <Button size="sm" className="gap-1.5 h-9" onClick={saveOneToOne} disabled={saving}>
                <Save className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <Input value={oneToOne.note} onChange={(e) => setOneToOne({ ...oneToOne, note: e.target.value })} placeholder="Note from this 1:1…" className="text-xs" />
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(coachingMember?.oneToOnes || []).map((n, i) => (
                <div key={i} className="text-xs border rounded p-2">
                  <span className="font-semibold">{new Date(n.date).toLocaleDateString()}</span> — {n.note}
                  {n.followUp && <p className="text-muted-foreground pt-0.5">Follow-up: {n.followUp}</p>}
                </div>
              ))}
              {(coachingMember?.oneToOnes || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No 1:1 notes yet — add the first one above.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Platform Team Member</DialogTitle>
            <DialogDescription>
              Assign a platform user into the operations team roster with onboarding tracking.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">User ID (MongoDB ObjectId) *</Label>
              <Input
                placeholder="Paste 24-character hex ID of existing User"
                value={newMember.userId}
                onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                required
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Role Template</Label>
                <Select value={newMember.roleTemplate} onValueChange={(v) => setNewMember({ ...newMember, roleTemplate: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="field_exec">Field Executive</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="city_manager">City Manager</SelectItem>
                    <SelectItem value="kyc_reviewer">KYC Reviewer</SelectItem>
                    <SelectItem value="provider_success">Provider Success</SelectItem>
                    <SelectItem value="support">Support Agent</SelectItem>
                    <SelectItem value="finance">Finance Ops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Assigned City</Label>
                <Input
                  value={newMember.city}
                  onChange={(e) => setNewMember({ ...newMember, city: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Enroll Member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
