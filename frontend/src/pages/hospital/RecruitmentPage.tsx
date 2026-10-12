import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Briefcase, Users, UserCheck, Plus, Search, Calendar, Building2,
  CheckCircle2, AlertTriangle, ArrowRight, FileText, Star,
} from 'lucide-react';

interface JobOpening {
  _id: string;
  title: string;
  department: string;
  designation?: string;
  openings: number;
  status: string;
  postedDate: string;
  employmentType: string;
}

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  jobOpeningId?: { title: string; department: string };
  createdAt: string;
}

interface Stats {
  openJobs: number;
  totalCandidates: number;
  shortlisted: number;
  hired: number;
  pendingOnboarding: number;
}

const STAGE_COLORS: Record<string, string> = {
  Applied: 'bg-blue-100 text-blue-800',
  Screening: 'bg-yellow-100 text-yellow-800',
  Shortlisted: 'bg-purple-100 text-purple-800',
  'Interview Scheduled': 'bg-indigo-100 text-indigo-800',
  Interviewed: 'bg-cyan-100 text-cyan-800',
  'Offer Released': 'bg-orange-100 text-orange-800',
  'Offer Accepted': 'bg-green-100 text-green-800',
  Hired: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

export default function RecruitmentPage() {
  const [tab, setTab] = useState<'jobs' | 'candidates' | 'onboarding'>('jobs');
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', department: '', designation: '', employmentType: 'Full-time', openings: 1 });

  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({ jobOpeningId: '', name: '', email: '', phone: '' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, candRes] = await Promise.all([
        api.get('/recruitment/stats'),
        api.get('/recruitment/jobs'),
        api.get('/recruitment/candidates'),
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data.jobs || []);
      setCandidates(candRes.data.candidates || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    try {
      await api.post('/recruitment/jobs', jobForm);
      toast.success('Job opening created');
      setJobModalOpen(false);
      setJobForm({ title: '', department: '', designation: '', employmentType: 'Full-time', openings: 1 });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create job');
    }
  };

  const createCandidate = async () => {
    try {
      await api.post('/recruitment/candidates', candidateForm);
      toast.success('Candidate added');
      setCandidateModalOpen(false);
      setCandidateForm({ jobOpeningId: '', name: '', email: '', phone: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add candidate');
    }
  };

  const updateStage = async (id: string, stage: string) => {
    try {
      await api.patch(`/recruitment/candidates/${id}/stage`, { stage });
      toast.success(`Stage updated to ${stage}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update stage');
    }
  };

  const filteredCandidates = candidates.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Recruitment & Onboarding
          </h1>
          <p className="text-muted-foreground mt-1">Job openings, applicant tracking, onboarding tasks</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setJobModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Job
          </Button>
          <Button onClick={() => setCandidateModalOpen(true)} size="sm" variant="outline">
            <Users className="w-4 h-4 mr-1" /> Add Candidate
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Open Jobs', value: stats.openJobs, icon: Briefcase, color: 'text-blue-600' },
            { label: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-purple-600' },
            { label: 'Shortlisted', value: stats.shortlisted, icon: Star, color: 'text-yellow-600' },
            { label: 'Hired', value: stats.hired, icon: UserCheck, color: 'text-green-600' },
            { label: 'Pending Onboarding', value: stats.pendingOnboarding, icon: Calendar, color: 'text-orange-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(['jobs', 'candidates', 'onboarding'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'ghost'}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{job.title}</CardTitle>
                <CardDescription>{job.department} · {job.designation || job.employmentType}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={job.status === 'Open' ? 'default' : 'secondary'}>{job.status}</Badge>
                  <span className="text-sm text-muted-foreground">{job.openings} openings</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'candidates' && (
        <div className="space-y-4">
          <Input
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="space-y-2">
            {filteredCandidates.map((c) => (
              <Card key={c._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.email} · {c.phone}</p>
                    {c.jobOpeningId && (
                      <p className="text-xs text-muted-foreground">{c.jobOpeningId.title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STAGE_COLORS[c.stage] || ''}>{c.stage}</Badge>
                    <Select value={c.stage} onValueChange={(v) => updateStage(c._id, v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(STAGE_COLORS).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'onboarding' && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>Onboarding tasks are managed per candidate after hire.</p>
            <p className="text-sm mt-2">Move candidates to "Hired" stage to create onboarding tasks.</p>
          </CardContent>
        </Card>
      )}

      {/* Job Creation Dialog */}
      <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Job Opening</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Job Title" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
            <Input placeholder="Department" value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })} />
            <Input placeholder="Designation" value={jobForm.designation} onChange={(e) => setJobForm({ ...jobForm, designation: e.target.value })} />
            <Select value={jobForm.employmentType} onValueChange={(v) => setJobForm({ ...jobForm, employmentType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Full-time', 'Part-time', 'Contract', 'Intern', 'Visiting'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Openings" value={jobForm.openings} onChange={(e) => setJobForm({ ...jobForm, openings: parseInt(e.target.value) || 1 })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobModalOpen(false)}>Cancel</Button>
            <Button onClick={createJob} disabled={!jobForm.title || !jobForm.department}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Dialog */}
      <Dialog open={candidateModalOpen} onOpenChange={setCandidateModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={candidateForm.jobOpeningId} onValueChange={(v) => setCandidateForm({ ...candidateForm, jobOpeningId: v })}>
              <SelectTrigger><SelectValue placeholder="Select Job" /></SelectTrigger>
              <SelectContent>
                {jobs.filter((j) => j.status === 'Open').map((j) => (
                  <SelectItem key={j._id} value={j._id}>{j.title} - {j.department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Full Name" value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} />
            <Input placeholder="Phone" value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandidateModalOpen(false)}>Cancel</Button>
            <Button onClick={createCandidate} disabled={!candidateForm.name || !candidateForm.email || !candidateForm.phone || !candidateForm.jobOpeningId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
