import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Scissors, CheckCircle, AlertTriangle, ClipboardList, Activity, Heart, User, Bed, FileText, Monitor, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const otApi = {
  getSurgeries: (p) => api.dispatch(() => Promise.resolve({ surgeries: [] }), '/ot/surgeries?' + new URLSearchParams(p)),
  createSurgery: (b) => api.dispatch(() => Promise.resolve({}), '/ot/surgeries', { method: 'POST', body: JSON.stringify(b) }),
  startPreOp: (id) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/pre-op`, { method: 'PUT' }),
  startSurgery: (id) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/start`, { method: 'PUT' }),
  completeSurgery: (id, b) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/complete`, { method: 'PUT', body: JSON.stringify(b) }),
  recoveryUpdate: (id, b) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/recovery`, { method: 'PUT', body: JSON.stringify(b) }),
  checklistUpdate: (id, b) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/checklist`, { method: 'PUT', body: JSON.stringify(b) }),
  shiftToWard: (id) => api.dispatch(() => Promise.resolve({}), `/ot/surgeries/${id}/shift-ward`, { method: 'PUT' }),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, scheduled: 0, inProgress: 0, completed: 0, today: 0 }), '/ot/stats'),
};

const statusColors = {
  Scheduled: 'bg-primary/10 text-primary', 'Pre-Op': 'bg-warning/10 text-warning',
  'In Progress': 'bg-destructive/10 text-destructive', Recovery: 'bg-info/10 text-info',
  'Ward Shifted': 'bg-purple-500/10 text-purple-600',
  Completed: 'bg-success/10 text-success', Cancelled: 'bg-muted text-muted-foreground',
};

const preOpChecklistItems = [
  { key: 'consent', label: 'Consent Form Signed' },
  { key: 'bloodGroup', label: 'Blood Group Confirmed' },
  { key: 'anesthesiaFitness', label: 'Anesthesia Fitness Done' },
  { key: 'npoStatus', label: 'NPO Status Confirmed' },
  { key: 'allergies', label: 'Allergies Checked' },
  { key: 'implants', label: 'Implants/Instruments Ready' },
  { key: 'siteMarking', label: 'Site Marking Done' },
  { key: 'identity', label: 'Patient Identity Verified' },
];

export default function OperationTheatre() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistSurgery, setChecklistSurgery] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryData, setRecoveryData] = useState({ bp: '', pulse: '', spO2: '', consciousness: 'Awake', painLevel: '0', notes: '' });
  const [newSurgery, setNewSurgery] = useState({
    patientName: '', patientId: '', surgeryName: '', surgeryType: 'Elective',
    anaesthesiaType: 'General', otNumber: '', scheduledDate: '', surgeonName: '', notes: ''
  });

  const { data } = useQuery({ queryKey: ['ot', search, statusFilter], queryFn: () => otApi.getSurgeries({ search, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['ot-stats'], queryFn: otApi.getStats });
  const surgeries = data?.surgeries || [];

  const createMut = useMutation({ mutationFn: otApi.createSurgery, onSuccess: () => { qc.invalidateQueries(['ot']); setShowCreate(false); } });
  const preOpMut = useMutation({ mutationFn: otApi.startPreOp, onSuccess: () => qc.invalidateQueries(['ot']) });
  const startMut = useMutation({ mutationFn: otApi.startSurgery, onSuccess: () => qc.invalidateQueries(['ot']) });
  const completeMut = useMutation({
    mutationFn: ({ id, ...b }) => otApi.completeSurgery(id, b),
    onSuccess: () => qc.invalidateQueries(['ot']),
  });
  const recoveryMut = useMutation({ mutationFn: ({ id, ...b }) => otApi.recoveryUpdate(id, b), onSuccess: () => qc.invalidateQueries(['ot']) });
  const checklistMut = useMutation({ mutationFn: ({ id, ...b }) => otApi.checklistUpdate(id, b), onSuccess: () => { qc.invalidateQueries(['ot']); setShowChecklist(false); } });
  const wardShiftMut = useMutation({ mutationFn: otApi.shiftToWard, onSuccess: () => qc.invalidateQueries(['ot']) });

  const handleCompleteSurgery = (surgery) => {
    const findings = prompt('Surgery Findings:');
    if (!findings) return;
    const procedure = prompt('Procedure Performed:');
    const instrBefore = prompt('Instruments count BEFORE surgery:', '0');
    const instrAfter = prompt('Instruments count AFTER surgery:', '0');
    const spongeBefore = prompt('Sponges count BEFORE:', '0');
    const spongeAfter = prompt('Sponges count AFTER:', '0');
    completeMut.mutate({
      id: surgery._id,
      findings,
      procedure,
      instrumentsBefore: parseInt(instrBefore) || 0,
      instrumentsAfter: parseInt(instrAfter) || 0,
      spongesBefore: parseInt(spongeBefore) || 0,
      spongesAfter: parseInt(spongeAfter) || 0,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Operation Theatre</h1>
        <p className="page-subtitle">{stats?.today || 0} today · {stats?.inProgress || 0} in progress · {stats?.completed || 0} completed</p>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-6">
        {[
          { l: 'Total', v: stats?.total || 0, c: 'text-foreground', ic: Scissors },
          { l: 'Scheduled', v: stats?.scheduled || 0, c: 'text-primary', ic: Clock },
          { l: 'Pre-Op', v: stats?.inProgress || 0, c: 'text-warning', ic: ClipboardList },
          { l: 'In Progress', v: stats?.inProgress || 0, c: 'text-destructive', ic: Activity },
          { l: 'Completed', v: stats?.completed || 0, c: 'text-success', ic: CheckCircle },
          { l: "Today's OT", v: stats?.today || 0, c: 'text-info', ic: Monitor },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <s.ic className={`w-4 h-4 mx-auto mb-1 ${s.c}`} />
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients or surgery..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {['Scheduled', 'Pre-Op', 'In Progress', 'Recovery', 'Ward Shifted', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Schedule Surgery</Button>
      </div>

      {/* OT Board Summary */}
      <div className="bg-muted/20 rounded-xl border p-4 mb-6">
        <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> OT Board - Today</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {surgeries.filter(s => !s.scheduledDate || new Date(s.scheduledDate).toDateString() === new Date().toDateString()).slice(0, 6).map(s => (
            <div key={s._id} className={`bg-card rounded-lg border p-3 text-sm ${s.status === 'In Progress' ? 'border-destructive/50 ring-1 ring-destructive/20' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[s.status] || ''}`}>{s.status}</span>
                <span className="text-[10px] text-muted-foreground">OT {s.otNumber || 'N/A'}</span>
              </div>
              <p className="font-medium text-foreground truncate">{s.surgeryName}</p>
              <p className="text-xs text-muted-foreground truncate">{s.patientName} · Dr. {s.doctorName || s.surgeonName || 'TBD'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {surgeries.map(s => {
          const isExpanded = expandedId === s._id;
          const instrCount = s.instrumentsCount || {};
          const spongeCount = s.spongeCount || {};
          const checklistData = s.preOpChecklist || {};
          const checklistDone = preOpChecklistItems.every(item => checklistData[item.key]);

          return (
            <div key={s._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s._id)}>
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-primary" />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[s.status] || ''}`}>{s.status}</span>
                  {!checklistDone && s.status === 'Scheduled' && <AlertTriangle className="w-4 h-4 text-warning" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{s.surgeryName}</p>
                    <p className="text-xs text-muted-foreground">{s.patientName} · {s.surgeonName || s.doctorName || 'No surgeon'} · OT {s.otNumber || 'N/A'}</p>
                  </div>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium">{s.surgeryType}</p></div>
                    <div><span className="text-muted-foreground">Anaesthesia</span><p className="font-medium">{s.anaesthesiaType}</p></div>
                    <div><span className="text-muted-foreground">OT #</span><p className="font-medium">{s.otNumber || 'N/A'}</p></div>
                    {s.totalDuration && <div><span className="text-muted-foreground">Duration</span><p className="font-medium">{s.totalDuration} min</p></div>}
                    {s.findings && <div className="col-span-2"><span className="text-muted-foreground">Findings</span><p className="font-medium">{s.findings}</p></div>}
                    {s.postOpInstructions && <div className="col-span-2"><span className="text-muted-foreground">Post-Op</span><p className="font-medium">{s.postOpInstructions}</p></div>}
                  </div>

                  {/* Pre-Op Checklist Status */}
                  {s.status !== 'Scheduled' && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Pre-Op Checklist</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {preOpChecklistItems.map(item => (
                          <div key={item.key} className="flex items-center gap-1 text-xs">
                            {checklistData[item.key] ? (
                              <CheckCircle className="w-3 h-3 text-success" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-warning" />
                            )}
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instrument & Sponge Count */}
                  {s.status === 'In Progress' || s.status === 'Recovery' || s.status === 'Completed' && instrCount.before !== undefined && (
                    <div className="flex gap-4 text-xs bg-card rounded-lg border p-3">
                      <div className={`flex items-center gap-1 ${instrCount.correct !== false ? 'text-success' : 'text-destructive'}`}>
                        <Scissors className="w-3 h-3" />
                        Instruments: {instrCount.before || 0} → {instrCount.after || 0}
                        {instrCount.correct !== false ? ' ✓' : ' ✗ MISMATCH!'}
                      </div>
                      <div className={`flex items-center gap-1 ${spongeCount.correct !== false ? 'text-success' : 'text-destructive'}`}>
                        <ClipboardList className="w-3 h-3" />
                        Sponges: {spongeCount.before || 0} → {spongeCount.after || 0}
                        {spongeCount.correct !== false ? ' ✓' : ' ✗ MISMATCH!'}
                      </div>
                    </div>
                  )}

                  {/* Recovery Vitals */}
                  {s.recoveryVitals && (
                    <div className="bg-info/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Heart className="w-3 h-3 text-info" /> Recovery Vitals</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <span>BP: {s.recoveryVitals.bp}</span>
                        <span>Pulse: {s.recoveryVitals.pulse}</span>
                        <span>SpO2: {s.recoveryVitals.spO2}%</span>
                        <span>Consciousness: {s.recoveryVitals.consciousness}</span>
                        <span>Pain: {s.recoveryVitals.painLevel}/10</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {s.status === 'Scheduled' && (
                      <>
                        <Button size="sm" onClick={() => { setChecklistSurgery(s); setChecklist(checklistData); setShowChecklist(true); }}>
                          <ListChecks className="w-3 h-3 mr-1" /> Pre-Op Checklist
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => preOpMut.mutate(s._id)}>
                          <ClipboardList className="w-3 h-3 mr-1" /> Start Pre-Op
                        </Button>
                      </>
                    )}
                    {s.status === 'Pre-Op' && (
                      <Button size="sm" onClick={() => startMut.mutate(s._id)} disabled={!checklistDone}>
                        <Activity className="w-3 h-3 mr-1" /> Start Surgery
                      </Button>
                    )}
                    {s.status === 'In Progress' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleCompleteSurgery(s)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Complete Surgery
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setRecoveryData({ bp: '', pulse: '', spO2: '', consciousness: 'Awake', painLevel: '0', notes: '' });
                          setShowRecovery(true);
                        }}>
                          <Heart className="w-3 h-3 mr-1" /> Recovery Update
                        </Button>
                      </>
                    )}
                    {s.status === 'Recovery' && (
                      <Button size="sm" variant="outline" onClick={() => wardShiftMut.mutate(s._id)}>
                        <Bed className="w-3 h-3 mr-1" /> Shift to Ward
                      </Button>
                    )}
                    {s.status === 'Ward Shifted' && (
                      <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Shifted to ward</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pre-Op Checklist Modal */}
      {showChecklist && checklistSurgery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChecklist(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Pre-Operative Checklist</h3>
              <button onClick={() => setShowChecklist(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{checklistSurgery.patientName} · {checklistSurgery.surgeryName}</p>
            <div className="space-y-3">
              {preOpChecklistItems.map(item => (
                <label key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                  <input type="checkbox" checked={checklist[item.key] || false}
                    onChange={() => setChecklist(c => ({ ...c, [item.key]: !c[item.key] }))}
                    className="w-4 h-4" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
            <Button className="w-full mt-6" onClick={() => checklistMut.mutate({ id: checklistSurgery._id, checklist })}>
              Save Checklist
            </Button>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRecovery(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Recovery Room Vitals</h3>
              <button onClick={() => setShowRecovery(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">BP</label><Input value={recoveryData.bp} onChange={e => setRecoveryData(d => ({ ...d, bp: e.target.value }))} placeholder="120/80" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Pulse</label><Input type="number" value={recoveryData.pulse} onChange={e => setRecoveryData(d => ({ ...d, pulse: e.target.value }))} placeholder="72" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">SpO2 (%)</label><Input type="number" value={recoveryData.spO2} onChange={e => setRecoveryData(d => ({ ...d, spO2: e.target.value }))} placeholder="98" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Consciousness</label>
                  <select value={recoveryData.consciousness} onChange={e => setRecoveryData(d => ({ ...d, consciousness: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Awake</option><option>Drowsy</option><option>Confused</option><option>Unresponsive</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Pain Level (0-10)</label>
                  <select value={recoveryData.painLevel} onChange={e => setRecoveryData(d => ({ ...d, painLevel: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={recoveryData.notes} onChange={e => setRecoveryData(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Any observations..." />
              </div>
              <Button className="w-full" onClick={() => {
                const expandedId_ = expandedId;
                recoveryMut.mutate({ id: expandedId_, ...recoveryData });
                setShowRecovery(false);
              }}>
                Save Recovery Vitals
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Surgery Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Schedule Surgery</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newSurgery.patientName} onChange={e => setNewSurgery({ ...newSurgery, patientName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Surgery Name *</label><Input value={newSurgery.surgeryName} onChange={e => setNewSurgery({ ...newSurgery, surgeryName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Type</label><select value={newSurgery.surgeryType} onChange={e => setNewSurgery({ ...newSurgery, surgeryType: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Elective', 'Emergency', 'Urgent'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Anaesthesia</label><select value={newSurgery.anaesthesiaType} onChange={e => setNewSurgery({ ...newSurgery, anaesthesiaType: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['General', 'Spinal', 'Epidural', 'Local', 'Sedation'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">OT Number</label><Input value={newSurgery.otNumber} onChange={e => setNewSurgery({ ...newSurgery, otNumber: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Schedule Date</label><Input type="date" value={newSurgery.scheduledDate ? newSurgery.scheduledDate.split('T')[0] : ''} onChange={e => setNewSurgery({ ...newSurgery, scheduledDate: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Surgeon Name</label><Input value={newSurgery.surgeonName} onChange={e => setNewSurgery({ ...newSurgery, surgeonName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Notes</label><textarea value={newSurgery.notes} onChange={e => setNewSurgery({ ...newSurgery, notes: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newSurgery)} disabled={createMut.isPending || !newSurgery.patientName || !newSurgery.surgeryName}>Schedule Surgery</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}