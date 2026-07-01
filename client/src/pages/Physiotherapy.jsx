import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Activity, CheckCircle, AlertTriangle, User, FileText, Heart, Target, TrendingUp, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const physioApi = {
  getReferrals: (p) => api.dispatch(() => Promise.resolve({ referrals: [] }), '/physio/referrals?' + new URLSearchParams(p)),
  createReferral: (b) => api.dispatch(() => Promise.resolve({}), '/physio/referrals', { method: 'POST', body: JSON.stringify(b) }),
  startAssessment: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/assess`, { method: 'PUT', body: JSON.stringify(b) }),
  createPlan: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/plan`, { method: 'PUT', body: JSON.stringify(b) }),
  addSession: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/session`, { method: 'PUT', body: JSON.stringify(b) }),
  midReview: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/mid-review`, { method: 'PUT', body: JSON.stringify(b) }),
  discharge: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/discharge`, { method: 'PUT', body: JSON.stringify(b) }),
  addToBilling: (id, b) => api.dispatch(() => Promise.resolve({}), `/physio/referrals/${id}/billing`, { method: 'POST', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ active: 0, inProgress: 0, completed: 0, total: 0 }), '/physio/stats'),
};

const statusColors = {
  Referred: 'bg-primary/10 text-primary',
  Assessed: 'bg-info/10 text-info',
  'In Progress': 'bg-warning/10 text-warning',
  'Mid Review': 'bg-purple-500/10 text-purple-600',
  Completed: 'bg-success/10 text-success',
  Discharged: 'bg-muted text-muted-foreground',
};

export default function Physiotherapy() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssessment, setShowAssessment] = useState(null);
  const [assessmentData, setAssessmentData] = useState({ painScale: '5', rangeOfMotion: '', strengthTest: '', functionalAssessment: '', objective: '', notes: '' });
  const [showPlan, setShowPlan] = useState(null);
  const [planData, setPlanData] = useState({ therapyType: 'Exercise Therapy', sessionsTotal: '10', frequency: '3x/week', duration: '30', goals: '', precautions: '' });
  const [showSession, setShowSession] = useState(null);
  const [sessionData, setSessionData] = useState({ exercises: '', painBefore: '5', painAfter: '3', progress: '', therapist: '' });
  const [showReview, setShowReview] = useState(null);
  const [reviewData, setReviewData] = useState({ progress: 'Improved', painComparison: 'Decreased', planAdjustment: '', continueSessions: true });
  const [showDischarge, setShowDischarge] = useState(null);
  const [dischargeData, setDischargeData] = useState({ outcome: 'Improved', homeExercisePlan: '', precautions: '', followUpDate: '', summary: '' });
  const [newReferral, setNewReferral] = useState({ patientName: '', patientId: '', diagnosis: '', referringDoctor: '', priority: 'Routine', notes: '' });

  const { data } = useQuery({ queryKey: ['physio', search, statusFilter], queryFn: () => physioApi.getReferrals({ search, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['physio-stats'], queryFn: physioApi.getStats });
  const referrals = data?.referrals || [];

  const createMut = useMutation({ mutationFn: physioApi.createReferral, onSuccess: () => { qc.invalidateQueries(['physio']); setShowCreate(false); } });
  const assessMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.startAssessment(id, b), onSuccess: () => { qc.invalidateQueries(['physio']); setShowAssessment(null); } });
  const planMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.createPlan(id, b), onSuccess: () => { qc.invalidateQueries(['physio']); setShowPlan(null); } });
  const sessionMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.addSession(id, b), onSuccess: () => { qc.invalidateQueries(['physio']); setShowSession(null); } });
  const reviewMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.midReview(id, b), onSuccess: () => { qc.invalidateQueries(['physio']); setShowReview(null); } });
  const dischargeMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.discharge(id, b), onSuccess: () => { qc.invalidateQueries(['physio']); setShowDischarge(null); } });
  const billingMut = useMutation({ mutationFn: ({ id, ...b }) => physioApi.addToBilling(id, b), onSuccess: () => qc.invalidateQueries(['physio']) });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Physiotherapy</h1>
        <p className="page-subtitle">{stats?.active || 0} active · {stats?.inProgress || 0} in progress · {stats?.completed || 0} completed</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Referred', v: stats?.active || 0, c: 'text-primary', ic: FileText },
          { l: 'In Progress', v: stats?.inProgress || 0, c: 'text-warning', ic: Activity },
          { l: 'Completed', v: stats?.completed || 0, c: 'text-success', ic: CheckCircle },
          { l: 'Total', v: stats?.total || 0, c: 'text-foreground', ic: Dumbbell },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <s.ic className={`w-5 h-5 mx-auto mb-1 ${s.c}`} />
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {['Referred', 'Assessed', 'In Progress', 'Mid Review', 'Completed', 'Discharged'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Referral</Button>
      </div>

      <div className="space-y-4">
        {referrals.map(r => {
          const isExpanded = expandedId === r._id;
          const sessions = r.sessions || [];
          const plan = r.treatmentPlan || {};

          return (
            <div key={r._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r._id)}>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[r.status] || ''}`}>{r.status}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{r.patientName}</p>
                    <p className="text-xs text-muted-foreground">{r.diagnosis} · Dr. {r.referringDoctor || r.doctorName || 'N/A'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{sessions.length} sessions</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Diagnosis</span><p className="font-medium">{r.diagnosis}</p></div>
                    <div><span className="text-muted-foreground">Referring Doctor</span><p className="font-medium">{r.referringDoctor || r.doctorName || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Priority</span><p className="font-medium">{r.priority}</p></div>
                    {r.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes</span><p className="font-medium">{r.notes}</p></div>}
                  </div>

                  {/* Assessment Results */}
                  {r.assessment && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Initial Assessment</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <span>Pain: {r.assessment.painScale}/10</span>
                        <span>ROM: {r.assessment.rangeOfMotion || 'N/A'}</span>
                        <span>Strength: {r.assessment.strengthTest || 'N/A'}</span>
                        <span>Functional: {r.assessment.functionalAssessment || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {/* Treatment Plan */}
                  {plan.therapyType && (
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Treatment Plan</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <span>Therapy: {plan.therapyType}</span>
                        <span>Sessions: {plan.sessionsTotal}</span>
                        <span>Frequency: {plan.frequency}</span>
                        <span>Duration: {plan.duration} min</span>
                      </div>
                      {plan.goals && <p className="text-xs text-muted-foreground mt-1">Goals: {plan.goals}</p>}
                      {plan.precautions && <p className="text-xs text-warning mt-1">Precautions: {plan.precautions}</p>}
                    </div>
                  )}

                  {/* Mid Review */}
                  {r.midReview && (
                    <div className={`rounded-lg p-2 text-xs ${r.midReview.progress === 'Improved' ? 'bg-success/5 text-success' : r.midReview.progress === 'No Change' ? 'bg-warning/5 text-warning' : 'bg-destructive/5 text-destructive'}`}>
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      Mid Review: {r.midReview.progress} · Pain: {r.midReview.painComparison}
                      {r.midReview.planAdjustment && ` · Adjustment: ${r.midReview.planAdjustment}`}
                    </div>
                  )}

                  {/* Session History */}
                  {sessions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Session History ({sessions.length})</p>
                      {sessions.slice(-3).map((s, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">Session {sessions.length - i}</span>
                            <span className="text-muted-foreground">Pain: {s.painBefore}→{s.painAfter}</span>
                          </div>
                          <p className="text-muted-foreground">{s.exercises} · {s.therapist}</p>
                          {s.progress && <p className="text-muted-foreground">{s.progress}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Discharge Summary */}
                  {r.dischargeSummary && (
                    <div className="bg-success/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-1">Discharge Summary</p>
                      <p className="text-xs">Outcome: {r.dischargeSummary.outcome}</p>
                      {r.dischargeSummary.homeExercisePlan && <p className="text-xs">Home Plan: {r.dischargeSummary.homeExercisePlan}</p>}
                      {r.dischargeSummary.followUpDate && <p className="text-xs">Follow-up: {new Date(r.dischargeSummary.followUpDate).toLocaleDateString()}</p>}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {r.status === 'Referred' && (
                      <Button size="sm" onClick={() => {
                        setAssessmentData({ painScale: '5', rangeOfMotion: '', strengthTest: '', functionalAssessment: '', objective: '', notes: '' });
                        setShowAssessment(r);
                      }}>
                        <Heart className="w-3 h-3 mr-1" /> Start Assessment
                      </Button>
                    )}
                    {r.status === 'Assessed' && (
                      <Button size="sm" onClick={() => {
                        setPlanData({ therapyType: 'Exercise Therapy', sessionsTotal: '10', frequency: '3x/week', duration: '30', goals: '', precautions: '' });
                        setShowPlan(r);
                      }}>
                        <Target className="w-3 h-3 mr-1" /> Create Treatment Plan
                      </Button>
                    )}
                    {r.status === 'In Progress' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSessionData({ exercises: '', painBefore: '5', painAfter: '3', progress: '', therapist: '' });
                          setShowSession(r);
                        }}>
                          <Activity className="w-3 h-3 mr-1" /> Add Session
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setReviewData({ progress: 'Improved', painComparison: 'Decreased', planAdjustment: '', continueSessions: true });
                          setShowReview(r);
                        }}>
                          <TrendingUp className="w-3 h-3 mr-1" /> Mid Review
                        </Button>
                      </>
                    )}
                    {(r.status === 'In Progress' || r.status === 'Mid Review') && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setDischargeData({ outcome: 'Improved', homeExercisePlan: '', precautions: '', followUpDate: '', summary: '' });
                        setShowDischarge(r);
                      }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Discharge
                      </Button>
                    )}
                    {r.status === 'Completed' && !r.billingAdded && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const amt = prompt('Physio charges per session (Rs):', '500');
                        if (amt) billingMut.mutate({ id: r._id, amount: parseInt(amt) * sessions.length });
                      }}>
                        <FileText className="w-3 h-3 mr-1" /> Add to Billing
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assessment Modal */}
      {showAssessment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssessment(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Initial Assessment</h3>
              <button onClick={() => setShowAssessment(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showAssessment.patientName} · {showAssessment.diagnosis}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Pain Scale (0-10)</label>
                  <select value={assessmentData.painScale} onChange={e => setAssessmentData(d => ({ ...d, painScale: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Range of Motion</label>
                  <select value={assessmentData.rangeOfMotion} onChange={e => setAssessmentData(d => ({ ...d, rangeOfMotion: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">Select...</option><option>Full</option><option>Limited</option><option>Severely Limited</option><option>Painful</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Strength Test</label>
                  <select value={assessmentData.strengthTest} onChange={e => setAssessmentData(d => ({ ...d, strengthTest: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">Select...</option><option>5/5 - Normal</option><option>4/5 - Good</option><option>3/5 - Fair</option><option>2/5 - Poor</option><option>1/5 - Trace</option><option>0/5 - Zero</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Functional Assessment</label>
                  <select value={assessmentData.functionalAssessment} onChange={e => setAssessmentData(d => ({ ...d, functionalAssessment: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">Select...</option><option>Independent</option><option>Minimal Assistance</option><option>Moderate Assistance</option><option>Maximal Assistance</option><option>Dependent</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Objective Findings</label>
                <textarea value={assessmentData.objective} onChange={e => setAssessmentData(d => ({ ...d, objective: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Swelling, tenderness, deformity..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={assessmentData.notes} onChange={e => setAssessmentData(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <Button className="w-full" onClick={() => assessMut.mutate({ id: showAssessment._id, ...assessmentData })}>
                Save Assessment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Plan Modal */}
      {showPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPlan(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Treatment Plan</h3>
              <button onClick={() => setShowPlan(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showPlan.patientName}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Therapy Type</label>
                  <select value={planData.therapyType} onChange={e => setPlanData(d => ({ ...d, therapyType: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Exercise Therapy</option><option>Manual Therapy</option><option>Electrotherapy</option><option>Hydrotherapy</option><option>Heat/Cold Therapy</option><option>Combined</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Total Sessions</label><Input type="number" value={planData.sessionsTotal} onChange={e => setPlanData(d => ({ ...d, sessionsTotal: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
                  <select value={planData.frequency} onChange={e => setPlanData(d => ({ ...d, frequency: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Daily</option><option>5x/week</option><option>3x/week</option><option>2x/week</option><option>Weekly</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label><Input type="number" value={planData.duration} onChange={e => setPlanData(d => ({ ...d, duration: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Treatment Goals</label>
                <textarea value={planData.goals} onChange={e => setPlanData(d => ({ ...d, goals: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Improve ROM, reduce pain, strengthen muscles..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Precautions</label>
                <textarea value={planData.precautions} onChange={e => setPlanData(d => ({ ...d, precautions: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Avoid weight bearing, no stretching..." />
              </div>
              <Button className="w-full" onClick={() => planMut.mutate({ id: showPlan._id, ...planData })}>
                Save Treatment Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSession(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Add Session</h3>
              <button onClick={() => setShowSession(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showSession.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Exercises Performed</label>
                <textarea value={sessionData.exercises} onChange={e => setSessionData(d => ({ ...d, exercises: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="List exercises performed..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Pain Before</label>
                  <select value={sessionData.painBefore} onChange={e => setSessionData(d => ({ ...d, painBefore: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Pain After</label>
                  <select value={sessionData.painAfter} onChange={e => setSessionData(d => ({ ...d, painAfter: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Progress Note</label>
                <textarea value={sessionData.progress} onChange={e => setSessionData(d => ({ ...d, progress: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Patient response, improvements..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Therapist Name</label><Input value={sessionData.therapist} onChange={e => setSessionData(d => ({ ...d, therapist: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => sessionMut.mutate({ id: showSession._id, ...sessionData })}>
                Save Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mid Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReview(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Mid Review</h3>
              <button onClick={() => setShowReview(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showReview.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Progress</label>
                <div className="flex gap-2">
                  {['Improved', 'No Change', 'Worsened'].map(p => (
                    <button key={p} onClick={() => setReviewData(d => ({ ...d, progress: p }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reviewData.progress === p ? (p === 'Improved' ? 'bg-success text-white' : p === 'No Change' ? 'bg-warning text-white' : 'bg-destructive text-white') : 'bg-muted text-muted-foreground'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Pain Comparison</label>
                <div className="flex gap-2">
                  {['Decreased', 'Same', 'Increased'].map(p => (
                    <button key={p} onClick={() => setReviewData(d => ({ ...d, painComparison: p }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reviewData.painComparison === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Plan Adjustment</label>
                <textarea value={reviewData.planAdjustment} onChange={e => setReviewData(d => ({ ...d, planAdjustment: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Any changes to treatment plan..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reviewData.continueSessions} onChange={e => setReviewData(d => ({ ...d, continueSessions: e.target.checked }))} className="w-4 h-4" />
                Continue Sessions
              </label>
              <Button className="w-full" onClick={() => reviewMut.mutate({ id: showReview._id, ...reviewData })}>
                Save Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischarge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDischarge(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Discharge from Physiotherapy</h3>
              <button onClick={() => setShowDischarge(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showDischarge.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
                <div className="flex gap-2">
                  {['Improved', 'Recovered', 'No Change', 'Referred'].map(o => (
                    <button key={o} onClick={() => setDischargeData(d => ({ ...d, outcome: o }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dischargeData.outcome === o ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Home Exercise Plan</label>
                <textarea value={dischargeData.homeExercisePlan} onChange={e => setDischargeData(d => ({ ...d, homeExercisePlan: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Exercises to continue at home..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Precautions</label>
                <textarea value={dischargeData.precautions} onChange={e => setDischargeData(d => ({ ...d, precautions: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Follow-up Date</label><Input type="date" value={dischargeData.followUpDate} onChange={e => setDischargeData(d => ({ ...d, followUpDate: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Summary</label>
                <textarea value={dischargeData.summary} onChange={e => setDischargeData(d => ({ ...d, summary: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <Button className="w-full" onClick={() => dischargeMut.mutate({ id: showDischarge._id, ...dischargeData })}>
                Complete Discharge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Referral Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Physio Referral</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newReferral.patientName} onChange={e => setNewReferral({ ...newReferral, patientName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Diagnosis *</label><Input value={newReferral.diagnosis} onChange={e => setNewReferral({ ...newReferral, diagnosis: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Referring Doctor</label><Input value={newReferral.referringDoctor} onChange={e => setNewReferral({ ...newReferral, referringDoctor: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label><select value={newReferral.priority} onChange={e => setNewReferral({ ...newReferral, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Routine', 'Urgent', 'Emergency'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Notes</label><textarea value={newReferral.notes} onChange={e => setNewReferral({ ...newReferral, notes: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newReferral)} disabled={createMut.isPending || !newReferral.patientName || !newReferral.diagnosis}>Create Referral</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}