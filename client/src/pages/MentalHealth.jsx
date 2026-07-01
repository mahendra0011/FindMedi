import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Brain, CheckCircle, AlertTriangle, User, FileText, Heart, Lock, Shield, Activity, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const mhApi = {
  getCases: (p) => api.dispatch(() => Promise.resolve({ cases: [] }), '/mentalhealth?' + new URLSearchParams(p)),
  createCase: (b) => api.dispatch(() => Promise.resolve({}), '/mentalhealth', { method: 'POST', body: JSON.stringify(b) }),
  addAssessment: (id, b) => api.dispatch(() => Promise.resolve({}), `/mentalhealth/${id}/assessment`, { method: 'PUT', body: JSON.stringify(b) }),
  addMse: (id, b) => api.dispatch(() => Promise.resolve({}), `/mentalhealth/${id}/mse`, { method: 'PUT', body: JSON.stringify(b) }),
  createPlan: (id, b) => api.dispatch(() => Promise.resolve({}), `/mentalhealth/${id}/plan`, { method: 'PUT', body: JSON.stringify(b) }),
  addSession: (id, b) => api.dispatch(() => Promise.resolve({}), `/mentalhealth/${id}/session`, { method: 'PUT', body: JSON.stringify(b) }),
  updateConfidentiality: (id, b) => api.dispatch(() => Promise.resolve({}), `/mentalhealth/${id}/confidentiality`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ active: 0, critical: 0, followUp: 0, total: 0 }), '/mentalhealth/stats'),
};

const statusColors = {
  Active: 'bg-primary/10 text-primary',
  'Under Treatment': 'bg-warning/10 text-warning',
  'Follow-up': 'bg-info/10 text-info',
  Discharged: 'bg-success/10 text-success',
  Referred: 'bg-purple-500/10 text-purple-600',
};

const riskColors = {
  Low: 'bg-success/10 text-success',
  Medium: 'bg-warning/10 text-warning',
  High: 'bg-destructive/10 text-destructive',
};

const mseCategories = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'speech', label: 'Speech' },
  { key: 'mood', label: 'Mood' },
  { key: 'affect', label: 'Affect' },
  { key: 'thoughtProcess', label: 'Thought Process' },
  { key: 'thoughtContent', label: 'Thought Content' },
  { key: 'perceptions', label: 'Perceptions' },
  { key: 'cognition', label: 'Cognition' },
  { key: 'insight', label: 'Insight' },
  { key: 'judgment', label: 'Judgment' },
];

export default function MentalHealth() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssessment, setShowAssessment] = useState(null);
  const [assessmentData, setAssessmentData] = useState({ presentingComplaint: '', history: '', riskLevel: 'Low', diagnosis: '', icdCode: '' });
  const [showMse, setShowMse] = useState(null);
  const [mseData, setMseData] = useState({});
  const [showPlan, setShowPlan] = useState(null);
  const [planData, setPlanData] = useState({ treatmentType: 'Medication', therapyType: 'CBT', frequency: 'Weekly', duration: '12 weeks', goals: '', medications: '' });
  const [showSession, setShowSession] = useState(null);
  const [sessionData, setSessionData] = useState({ therapyType: 'CBT', notes: '', patientResponse: 'Good', nextSession: '' });
  const [showConfidentiality, setShowConfidentiality] = useState(null);
  const [confData, setConfData] = useState({ consentGiven: false, shareWithFamily: false, shareWithDoctor: true, accessLevel: 'Care Team Only', notes: '' });
  const [newCase, setNewCase] = useState({ patientName: '', source: 'Doctor', diagnosis: '', riskLevel: 'Low', notes: '', isConfidential: false });

  const { data } = useQuery({ queryKey: ['mental', search, statusFilter], queryFn: () => mhApi.getCases({ search, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['mental-stats'], queryFn: mhApi.getStats });
  const cases = data?.cases || [];

  const createMut = useMutation({ mutationFn: mhApi.createCase, onSuccess: () => { qc.invalidateQueries(['mental']); setShowCreate(false); } });
  const assessMut = useMutation({ mutationFn: ({ id, ...b }) => mhApi.addAssessment(id, b), onSuccess: () => { qc.invalidateQueries(['mental']); setShowAssessment(null); } });
  const mseMut = useMutation({ mutationFn: ({ id, ...b }) => mhApi.addMse(id, b), onSuccess: () => { qc.invalidateQueries(['mental']); setShowMse(null); } });
  const planMut = useMutation({ mutationFn: ({ id, ...b }) => mhApi.createPlan(id, b), onSuccess: () => { qc.invalidateQueries(['mental']); setShowPlan(null); } });
  const sessionMut = useMutation({ mutationFn: ({ id, ...b }) => mhApi.addSession(id, b), onSuccess: () => { qc.invalidateQueries(['mental']); setShowSession(null); } });
  const confMut = useMutation({ mutationFn: ({ id, ...b }) => mhApi.updateConfidentiality(id, b), onSuccess: () => { qc.invalidateQueries(['mental']); setShowConfidentiality(null); } });

  const icd10Codes = [
    'F32.0 - Mild Depressive Episode', 'F32.1 - Moderate Depressive Episode', 'F32.2 - Severe Depressive Episode',
    'F41.0 - Panic Disorder', 'F41.1 - Generalized Anxiety Disorder', 'F43.1 - PTSD',
    'F20.0 - Paranoid Schizophrenia', 'F31.0 - Bipolar I Disorder', 'F84.0 - Childhood Autism',
    'F50.0 - Anorexia Nervosa', 'F10.2 - Alcohol Dependence', 'Z03.2 - Observation for suspected mental disorder',
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mental Health</h1>
        <p className="page-subtitle">{stats?.active || 0} active · {stats?.critical || 0} critical · {stats?.followUp || 0} follow-up</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Active Cases', v: stats?.active || 0, c: 'text-primary', ic: Brain },
          { l: 'Critical', v: stats?.critical || 0, c: 'text-destructive', ic: AlertTriangle },
          { l: 'Follow-up', v: stats?.followUp || 0, c: 'text-info', ic: Clock },
          { l: 'Total', v: stats?.total || 0, c: 'text-foreground', ic: FileText },
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
          {['Active', 'Under Treatment', 'Follow-up', 'Discharged', 'Referred'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Case</Button>
      </div>

      <div className="space-y-4">
        {cases.map(c => {
          const isExpanded = expandedId === c._id;

          return (
            <div key={c._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c._id)}>
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-primary" />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[c.status] || ''}`}>{c.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${riskColors[c.riskLevel] || ''}`}>{c.riskLevel}</span>
                  {c.confidentiality?.consentGiven === false && <Lock className="w-3 h-3 text-muted-foreground" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.patientName}</p>
                    <p className="text-xs text-muted-foreground">{c.diagnosis || 'No diagnosis'} · Source: {c.source}</p>
                  </div>
                  {c.sessions?.length > 0 && <span className="text-xs text-muted-foreground">{c.sessions.length} sessions</span>}
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Source</span><p className="font-medium">{c.source}</p></div>
                    <div><span className="text-muted-foreground">Risk Level</span><p className="font-medium">{c.riskLevel}</p></div>
                    {c.assessment?.icdCode && <div className="col-span-2"><span className="text-muted-foreground">ICD-10</span><p className="font-medium">{c.assessment.icdCode}</p></div>}
                    {c.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes</span><p className="font-medium">{c.notes}</p></div>}
                  </div>

                  {/* Assessment */}
                  {c.assessment && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Psychiatric Assessment</p>
                      <div className="text-xs space-y-1">
                        <p><span className="text-muted-foreground">Complaint:</span> {c.assessment.presentingComplaint}</p>
                        {c.assessment.history && <p><span className="text-muted-foreground">History:</span> {c.assessment.history}</p>}
                        {c.assessment.icdCode && <p><span className="text-muted-foreground">ICD-10:</span> {c.assessment.icdCode}</p>}
                        <p><span className="text-muted-foreground">Diagnosis:</span> {c.assessment.diagnosis}</p>
                      </div>
                    </div>
                  )}

                  {/* MSE */}
                  {c.mse && (
                    <div className="bg-purple-500/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Mental Status Examination</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {mseCategories.map(cat => (
                          c.mse[cat.key] && (
                            <div key={cat.key}>
                              <span className="text-muted-foreground">{cat.label}:</span>{' '}
                              <span className="text-foreground">{c.mse[cat.key]}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Treatment Plan */}
                  {c.treatmentPlan && (
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Treatment Plan</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <span>Treatment: {c.treatmentPlan.treatmentType}</span>
                        <span>Therapy: {c.treatmentPlan.therapyType}</span>
                        <span>Frequency: {c.treatmentPlan.frequency}</span>
                        <span>Duration: {c.treatmentPlan.duration}</span>
                      </div>
                      {c.treatmentPlan.goals && <p className="text-xs text-muted-foreground mt-1">Goals: {c.treatmentPlan.goals}</p>}
                      {c.treatmentPlan.medications && <p className="text-xs text-muted-foreground mt-1">Medications: {c.treatmentPlan.medications}</p>}
                    </div>
                  )}

                  {/* Sessions */}
                  {c.sessions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Session Notes ({c.sessions.length})</p>
                      {c.sessions.slice(-3).map((s, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{s.therapyType}</span>
                            <span className={`${s.patientResponse === 'Good' ? 'text-success' : s.patientResponse === 'Mixed' ? 'text-warning' : 'text-destructive'}`}>{s.patientResponse}</span>
                          </div>
                          <p className="text-muted-foreground">{s.notes}</p>
                          {s.nextSession && <p className="text-muted-foreground mt-1">Next: {new Date(s.nextSession).toLocaleDateString()}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confidentiality */}
                  {c.confidentiality && (
                    <div className="bg-amber-500/5 rounded-lg p-2 text-xs flex items-center gap-2">
                      <Shield className="w-3 h-3 text-amber-500" />
                      <span>
                        Access: {c.confidentiality.accessLevel}
                        {c.confidentiality.consentGiven ? ' · Consent on file' : ' · No consent'}
                        {c.confidentiality.shareWithFamily ? ' · Family informed' : ''}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {(!c.assessment || !c.assessment.diagnosis) && (
                      <Button size="sm" onClick={() => {
                        setAssessmentData({ presentingComplaint: '', history: '', riskLevel: c.riskLevel, diagnosis: c.diagnosis || '', icdCode: '' });
                        setShowAssessment(c);
                      }}>
                        <FileText className="w-3 h-3 mr-1" /> Assessment
                      </Button>
                    )}
                    {c.assessment?.diagnosis && !c.mse && (
                      <Button size="sm" variant="outline" onClick={() => { setMseData({}); setShowMse(c); }}>
                        <Brain className="w-3 h-3 mr-1" /> MSE
                      </Button>
                    )}
                    {c.mse && !c.treatmentPlan && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setPlanData({ treatmentType: 'Medication', therapyType: 'CBT', frequency: 'Weekly', duration: '12 weeks', goals: '', medications: '' });
                        setShowPlan(c);
                      }}>
                        <BookOpen className="w-3 h-3 mr-1" /> Treatment Plan
                      </Button>
                    )}
                    {c.treatmentPlan && (c.status === 'Under Treatment' || c.status === 'Active') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSessionData({ therapyType: 'CBT', notes: '', patientResponse: 'Good', nextSession: '' });
                          setShowSession(c);
                        }}>
                          <Activity className="w-3 h-3 mr-1" /> Add Session
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setConfData({
                            consentGiven: c.confidentiality?.consentGiven || false,
                            shareWithFamily: c.confidentiality?.shareWithFamily || false,
                            shareWithDoctor: c.confidentiality?.shareWithDoctor || true,
                            accessLevel: c.confidentiality?.accessLevel || 'Care Team Only',
                            notes: '',
                          });
                          setShowConfidentiality(c);
                        }}>
                          <Shield className="w-3 h-3 mr-1" /> Confidentiality
                        </Button>
                      </>
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
              <h3 className="font-heading text-lg font-bold">Psychiatric Assessment</h3>
              <button onClick={() => setShowAssessment(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showAssessment.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Presenting Complaint *</label>
                <textarea value={assessmentData.presentingComplaint} onChange={e => setAssessmentData(d => ({ ...d, presentingComplaint: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Main reason for consultation..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">History (Personal, Family, Social)</label>
                <textarea value={assessmentData.history} onChange={e => setAssessmentData(d => ({ ...d, history: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-20" placeholder="Relevant history..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">ICD-10 Code</label>
                <select value={assessmentData.icdCode} onChange={e => setAssessmentData(d => ({ ...d, icdCode: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Select ICD-10 code...</option>
                  {icd10Codes.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Diagnosis</label>
                <Input value={assessmentData.diagnosis} onChange={e => setAssessmentData(d => ({ ...d, diagnosis: e.target.value }))} placeholder="Clinical diagnosis..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Risk Assessment</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(r => (
                    <button key={r} onClick={() => setAssessmentData(d => ({ ...d, riskLevel: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${assessmentData.riskLevel === r ? (r === 'High' ? 'bg-destructive text-white' : r === 'Medium' ? 'bg-warning text-white' : 'bg-success text-white') : 'bg-muted text-muted-foreground'}`}>
                      {r} Risk
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => assessMut.mutate({ id: showAssessment._id, ...assessmentData })}>
                Save Assessment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MSE Modal */}
      {showMse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMse(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Mental Status Examination (MSE)</h3>
              <button onClick={() => setShowMse(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showMse.patientName}</p>
            <div className="grid grid-cols-2 gap-4">
              {mseCategories.map(cat => (
                <div key={cat.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{cat.label}</label>
                  <select value={mseData[cat.key] || ''} onChange={e => setMseData(d => ({ ...d, [cat.key]: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">Normal</option>
                    <option value="Abnormal">Abnormal</option>
                    <option value="Not assessed">Not assessed</option>
                    {cat.key === 'appearance' && <><option value="Unkempt">Unkempt</option><option value="Disheveled">Disheveled</option><option value="Well-groomed">Well-groomed</option></>}
                    {cat.key === 'mood' && <><option value="Euthymic">Euthymic</option><option value="Depressed">Depressed</option><option value="Anxious">Anxious</option><option value="Irritable">Irritable</option><option value="Euphoric">Euphoric</option></>}
                    {cat.key === 'affect' && <><option value="Full range">Full range</option><option value="Restricted">Restricted</option><option value="Blunted">Blunted</option><option value="Flat">Flat</option><option value="Labile">Labile</option></>}
                    {cat.key === 'thoughtProcess' && <><option value="Linear">Linear</option><option value="Tangential">Tangential</option><option value="Circumstantial">Circumstantial</option><option value="Loose associations">Loose associations</option></>}
                    {cat.key === 'thoughtContent' && <><option value="Within normal limits">Within normal limits</option><option value="Delusions">Delusions</option><option value="Obsessions">Obsessions</option><option value="Phobias">Phobias</option><option value="Suicidal ideation">Suicidal ideation</option></>}
                    {cat.key === 'insight' && <><option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option><option value="Absent">Absent</option></>}
                    {cat.key === 'judgment' && <><option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option><option value="Impaired">Impaired</option></>}
                  </select>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6" onClick={() => mseMut.mutate({ id: showMse._id, ...mseData })}>
              Save MSE
            </Button>
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
                <div><label className="text-xs text-muted-foreground mb-1 block">Treatment Type</label>
                  <select value={planData.treatmentType} onChange={e => setPlanData(d => ({ ...d, treatmentType: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Medication</option><option>Therapy</option><option>Counseling</option><option>Combined</option><option>Inpatient</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Therapy Type</label>
                  <select value={planData.therapyType} onChange={e => setPlanData(d => ({ ...d, therapyType: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>CBT</option><option>DBT</option><option>Psychodynamic</option><option>Supportive</option><option>Group Therapy</option><option>Family Therapy</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
                  <select value={planData.frequency} onChange={e => setPlanData(d => ({ ...d, frequency: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Daily</option><option>2x/week</option><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Duration</label><Input value={planData.duration} onChange={e => setPlanData(d => ({ ...d, duration: e.target.value }))} placeholder="e.g. 12 weeks" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Treatment Goals</label>
                <textarea value={planData.goals} onChange={e => setPlanData(d => ({ ...d, goals: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Medications</label>
                <textarea value={planData.medications} onChange={e => setPlanData(d => ({ ...d, medications: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Medication name, dosage, frequency..." />
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
              <h3 className="font-heading text-lg font-bold">Session Note</h3>
              <button onClick={() => setShowSession(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showSession.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Therapy Type</label>
                <select value={sessionData.therapyType} onChange={e => setSessionData(d => ({ ...d, therapyType: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>CBT</option><option>DBT</option><option>Psychodynamic</option><option>Supportive</option><option>Group Therapy</option><option>Medication Review</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Session Notes</label>
                <textarea value={sessionData.notes} onChange={e => setSessionData(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-20" placeholder="Content of session, observations..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Patient Response</label>
                <div className="flex gap-2">
                  {['Good', 'Mixed', 'Poor'].map(r => (
                    <button key={r} onClick={() => setSessionData(d => ({ ...d, patientResponse: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sessionData.patientResponse === r ? (r === 'Good' ? 'bg-success text-white' : r === 'Mixed' ? 'bg-warning text-white' : 'bg-destructive text-white') : 'bg-muted text-muted-foreground'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Next Session</label><Input type="date" value={sessionData.nextSession} onChange={e => setSessionData(d => ({ ...d, nextSession: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => sessionMut.mutate({ id: showSession._id, ...sessionData })}>
                Save Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confidentiality Modal */}
      {showConfidentiality && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfidentiality(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Confidentiality Settings</h3>
              <button onClick={() => setShowConfidentiality(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showConfidentiality.patientName}</p>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confData.consentGiven} onChange={e => setConfData(d => ({ ...d, consentGiven: e.target.checked }))} className="w-4 h-4" />
                Patient Consent Obtained
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confData.shareWithFamily} onChange={e => setConfData(d => ({ ...d, shareWithFamily: e.target.checked }))} className="w-4 h-4" />
                Share Information with Family
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confData.shareWithDoctor} onChange={e => setConfData(d => ({ ...d, shareWithDoctor: e.target.checked }))} className="w-4 h-4" />
                Share with Referring Doctor
              </label>
              <div><label className="text-xs text-muted-foreground mb-1 block">Access Level</label>
                <select value={confData.accessLevel} onChange={e => setConfData(d => ({ ...d, accessLevel: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>Care Team Only</option><option>Psychiatry Dept Only</option><option>Hospital Staff</option><option>Full Access</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={confData.notes} onChange={e => setConfData(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
              </div>
              <Button className="w-full" onClick={() => confMut.mutate({ id: showConfidentiality._id, ...confData })}>
                Save Confidentiality Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Mental Health Case</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newCase.patientName} onChange={e => setNewCase({ ...newCase, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Source</label>
                  <select value={newCase.source} onChange={e => setNewCase({ ...newCase, source: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {['Doctor', 'Self', 'Family', 'Emergency', 'Counsellor'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">Risk Level</label>
                  <select value={newCase.riskLevel} onChange={e => setNewCase({ ...newCase, riskLevel: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Initial Diagnosis</label><Input value={newCase.diagnosis} onChange={e => setNewCase({ ...newCase, diagnosis: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Notes</label><textarea value={newCase.notes} onChange={e => setNewCase({ ...newCase, notes: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newCase.isConfidential} onChange={e => setNewCase({ ...newCase, isConfidential: e.target.checked })} className="w-4 h-4" />
                Mark as Confidential
              </label>
              <Button className="w-full" onClick={() => createMut.mutate(newCase)} disabled={createMut.isPending || !newCase.patientName}>Create Case</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// 37
