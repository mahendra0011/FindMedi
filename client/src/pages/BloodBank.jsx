import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Droplets, CheckCircle, AlertTriangle, Heart, Activity, User, FileText, FlaskConical, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const bbApi = {
  getUnits: (p) => api.getBloodUnits(p),
  addUnit: (b) => api.addBloodUnit(b),
  getRequests: (p) => api.getBloodRequests(p),
  createRequest: (b) => api.createBloodRequest(b),
  crossMatch: (id, b) => api.crossMatchBlood(id, b),
  issueUnits: (id, b) => api.issueBloodUnits(id, b),
  startTransfusion: (id, b) => api.startTransfusion(id, b),
  completeTransfusion: (id, b) => api.completeTransfusion(id, b),
  reportReaction: (id, b) => api.reportReaction(id, b),
  getStats: () => api.getBloodBankStats(),
};

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const compatibleDonors = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export default function BloodBank() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCrossMatch, setShowCrossMatch] = useState(null);
  const [crossMatchData, setCrossMatchData] = useState({ patientGroup: '', donorUnitId: '', compatibility: 'Compatible', crossMatchResult: 'Compatible', technician: '' });
  const [showTransfusion, setShowTransfusion] = useState(null);
  const [transfusionData, setTransfusionData] = useState({ preBp: '', prePulse: '', preTemp: '', startTime: '', nurseName: '' });
  const [showReaction, setShowReaction] = useState(null);
  const [reactionData, setReactionData] = useState({ reactionType: 'Fever', severity: 'Mild', symptoms: '', actionTaken: '', stopped: false });
  const [newUnit, setNewUnit] = useState({ bloodGroup: 'O+', donorName: '', donationDate: '', expiryDate: '', volume: 450, components: ['Whole Blood'], hiv: 'Negative', hbsag: 'Negative', hcv: 'Negative', malaria: 'Negative', vdrl: 'Negative' });
  const [newReq, setNewReq] = useState({ patientName: '', patientId: '', bloodGroup: 'O+', unitsRequired: 1, reason: '', priority: 'Routine' });

  const { data: unitsData } = useQuery({ queryKey: ['blood-units', search], queryFn: () => bbApi.getUnits({ search }) });
  const { data: reqsData } = useQuery({ queryKey: ['blood-requests', search], queryFn: () => bbApi.getRequests({ search }) });
  const { data: stats } = useQuery({ queryKey: ['blood-stats'], queryFn: bbApi.getStats });
  const units = unitsData?.units || [];
  const requests = reqsData?.requests || [];

  const addUnitMut = useMutation({ mutationFn: bbApi.addUnit, onSuccess: () => { qc.invalidateQueries(['blood-units']); setShowAdd(false); } });
  const createReqMut = useMutation({ mutationFn: bbApi.createRequest, onSuccess: () => { qc.invalidateQueries(['blood-requests']); setShowAdd(false); } });
  const crossMatchMut = useMutation({ mutationFn: ({ id, ...b }) => bbApi.crossMatch(id, b), onSuccess: () => { qc.invalidateQueries(['blood-requests']); setShowCrossMatch(null); } });
  const issueMut = useMutation({ mutationFn: ({ id, ...b }) => bbApi.issueUnits(id, b), onSuccess: () => qc.invalidateQueries(['blood-requests', 'blood-units']) });
  const startTransMut = useMutation({ mutationFn: ({ id, ...b }) => bbApi.startTransfusion(id, b), onSuccess: () => { qc.invalidateQueries(['blood-requests']); setShowTransfusion(null); } });
  const completeTransMut = useMutation({ mutationFn: ({ id, ...b }) => bbApi.completeTransfusion(id, b), onSuccess: () => qc.invalidateQueries(['blood-requests']) });
  const reactionMut = useMutation({ mutationFn: ({ id, ...b }) => bbApi.reportReaction(id, b), onSuccess: () => { qc.invalidateQueries(['blood-requests']); setShowReaction(null); } });

  const getCompatibleUnits = (bloodGroup) => {
    const compatible = compatibleDonors[bloodGroup] || [];
    return units.filter(u => compatible.includes(u.bloodGroup) && u.status === 'Available');
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Blood Bank</h1>
        <p className="page-subtitle">{stats?.available || 0} units available · {stats?.pending || 0} pending · {stats?.crossMatching || 0} cross-matching</p>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-6">
        {[
          { l: 'Total Units', v: stats?.total || 0, c: 'text-foreground', ic: Droplets },
          { l: 'Available', v: stats?.available || 0, c: 'text-success', ic: CheckCircle },
          { l: 'Cross-Matching', v: stats?.crossMatching || 0, c: 'text-warning', ic: FlaskConical },
          { l: 'Pending Req', v: stats?.pending || 0, c: 'text-warning', ic: AlertTriangle },
          { l: 'Issued', v: stats?.issued || 0, c: 'text-info', ic: FileText },
          { l: 'Expired', v: stats?.expired || 0, c: 'text-destructive', ic: AlertOctagon },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <s.ic className={`w-4 h-4 mx-auto mb-1 ${s.c}`} />
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {['inventory', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'inventory' ? 'Blood Inventory' : 'Requests & Transfusions'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Unit</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(u => (
              <div key={u._id} className={`bg-card rounded-xl border p-4 ${u.status === 'Available' ? 'border-success/30' : u.status === 'Expired' ? 'border-destructive/30' : 'border-warning/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-destructive" /><span className="font-heading font-bold text-lg text-foreground">{u.bloodGroup}</span></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'Available' ? 'bg-success/10 text-success' : u.status === 'Expired' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{u.status}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Unit: {u.unitId} · {u.volume}ml</p>
                  <p>Donor: {u.donorName || 'Unknown'} · Exp: {u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : 'N/A'}</p>
                  <p>Components: {u.components?.join(', ')}</p>
                  <div className="flex gap-1 mt-1">
                    {u.hiv === 'Positive' && <span className="text-[10px] bg-destructive/10 text-destructive px-1 rounded">HIV+</span>}
                    {u.hbsag === 'Positive' && <span className="text-[10px] bg-warning/10 text-warning px-1 rounded">HBsAg+</span>}
                    {u.hcv === 'Positive' && <span className="text-[10px] bg-warning/10 text-warning px-1 rounded">HCV+</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex gap-3 mb-6">
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
          </div>
          {requests.map(r => (
            <div key={r._id} className={`bg-card rounded-xl border p-4 ${r.status === 'Reaction' ? 'border-destructive/50 bg-destructive/5' : r.status === 'Transfusing' ? 'border-primary/50 bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-4 h-4 text-destructive" />
                    <span className="font-semibold text-foreground">{r.requestId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.priority === 'Emergency' ? 'bg-destructive/10 text-destructive' : r.priority === 'Urgent' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{r.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'Pending' ? 'bg-warning/10 text-warning' : r.status === 'Cross-Matching' ? 'bg-purple-500/10 text-purple-600' : r.status === 'Issued' ? 'bg-info/10 text-info' : r.status === 'Transfusing' ? 'bg-primary/10 text-primary' : r.status === 'Completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{r.status}</span>
                  </div>
                  <p className="text-sm font-medium">{r.patientName} · {r.bloodGroup} · {r.unitsRequired} unit(s)</p>
                  <p className="text-xs text-muted-foreground">Dr. {r.doctorName} · {r.reason || 'No reason'}</p>
                </div>
                <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
              </div>

              {/* Cross-Match Result */}
              {r.crossMatchResult && (
                <div className={`text-xs mb-2 p-2 rounded ${r.crossMatchResult === 'Compatible' ? 'bg-success/5 text-success' : 'bg-destructive/5 text-destructive'}`}>
                  <FlaskConical className="w-3 h-3 inline mr-1" />
                  Cross-Match: {r.crossMatchResult} · Patient: {r.patientBloodGroup} → Donor: {r.donorBloodGroup}
                  {r.crossMatchTechnician && ` · By: ${r.crossMatchTechnician}`}
                </div>
              )}

              {/* Transfusion Status */}
              {r.transfusionStartTime && (
                <div className="text-xs text-info mb-2 p-2 bg-info/5 rounded">
                  <Heart className="w-3 h-3 inline mr-1" />
                  Transfusion started: {new Date(r.transfusionStartTime).toLocaleTimeString()} · Nurse: {r.transfusionNurse}
                </div>
              )}
              {r.transfusionCompleteTime && (
                <div className="text-xs text-success mb-2 p-2 bg-success/5 rounded">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Transfusion completed: {new Date(r.transfusionCompleteTime).toLocaleTimeString()}
                </div>
              )}

              {/* Reaction Alert */}
              {r.reactionReported && (
                <div className="text-xs text-destructive mb-2 p-2 bg-destructive/5 rounded flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  <strong>Reaction:</strong> {r.reactionType} ({r.reactionSeverity}) · {r.reactionSymptoms}
                  {r.reactionStopped && ' · Transfusion STOPPED'}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {r.status === 'Pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      setCrossMatchData({ patientGroup: r.bloodGroup, donorUnitId: '', compatibility: 'Compatible', crossMatchResult: 'Compatible', technician: '' });
                      setShowCrossMatch(r);
                    }}>
                      <FlaskConical className="w-3 h-3 mr-1" /> Cross-Match
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const ids = prompt('Unit IDs to issue (comma separated):');
                      if (ids) issueMut.mutate({ id: r._id, unitIds: ids.split(',').map(s => s.trim()) });
                    }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Issue Units
                    </Button>
                  </>
                )}
                {r.status === 'Issued' && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setTransfusionData({ preBp: '', prePulse: '', preTemp: '', startTime: new Date().toISOString().slice(0, 16), nurseName: '' });
                    setShowTransfusion(r);
                  }}>
                    <Heart className="w-3 h-3 mr-1" /> Start Transfusion
                  </Button>
                )}
                {r.status === 'Transfusing' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      const endTime = prompt('Completion time:', new Date().toLocaleTimeString());
                      if (endTime) completeTransMut.mutate({ id: r._id, endTime, vitals: prompt('Post-transfusion vitals:') || '' });
                    }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Complete Transfusion
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      setReactionData({ reactionType: 'Fever', severity: 'Mild', symptoms: '', actionTaken: '', stopped: false });
                      setShowReaction(r);
                    }}>
                      <AlertOctagon className="w-3 h-3 mr-1" /> Report Reaction
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-Match Modal */}
      {showCrossMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCrossMatch(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Cross-Matching</h3>
              <button onClick={() => setShowCrossMatch(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showCrossMatch.patientName} · Required: {showCrossMatch.bloodGroup}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Patient Blood Group</label><Input value={crossMatchData.patientGroup} onChange={e => setCrossMatchData(d => ({ ...d, patientGroup: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Compatible Units Available</label>
                <div className="text-sm text-success mb-2">{getCompatibleUnits(crossMatchData.patientGroup).length} units available</div>
                <select value={crossMatchData.donorUnitId} onChange={e => setCrossMatchData(d => ({ ...d, donorUnitId: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Select donor unit...</option>
                  {getCompatibleUnits(crossMatchData.patientGroup).map(u => (
                    <option key={u._id} value={u._id}>{u.bloodGroup} - {u.unitId} (Exp: {u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : 'N/A'})</option>
                  ))}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Cross-Match Result</label>
                <div className="flex gap-2">
                  {['Compatible', 'Incompatible'].map(r => (
                    <button key={r} onClick={() => setCrossMatchData(d => ({ ...d, crossMatchResult: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${crossMatchData.crossMatchResult === r ? (r === 'Compatible' ? 'bg-success text-white' : 'bg-destructive text-white') : 'bg-muted text-muted-foreground'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Technician Name</label><Input value={crossMatchData.technician} onChange={e => setCrossMatchData(d => ({ ...d, technician: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => crossMatchMut.mutate({ id: showCrossMatch._id, ...crossMatchData })}>
                Save Cross-Match Result
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Start Transfusion Modal */}
      {showTransfusion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransfusion(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Start Transfusion</h3>
              <button onClick={() => setShowTransfusion(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showTransfusion.patientName} · Pre-transfusion vitals</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">BP</label><Input value={transfusionData.preBp} onChange={e => setTransfusionData(d => ({ ...d, preBp: e.target.value }))} placeholder="120/80" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Pulse</label><Input type="number" value={transfusionData.prePulse} onChange={e => setTransfusionData(d => ({ ...d, prePulse: e.target.value }))} placeholder="72" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Temperature (°F)</label><Input type="number" value={transfusionData.preTemp} onChange={e => setTransfusionData(d => ({ ...d, preTemp: e.target.value }))} placeholder="98.6" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Start Time</label><Input type="datetime-local" value={transfusionData.startTime} onChange={e => setTransfusionData(d => ({ ...d, startTime: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Nurse Name</label><Input value={transfusionData.nurseName} onChange={e => setTransfusionData(d => ({ ...d, nurseName: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => startTransMut.mutate({ id: showTransfusion._id, ...transfusionData })}>
                Start Transfusion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction Report Modal */}
      {showReaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReaction(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-destructive">Report Transfusion Reaction</h3>
              <button onClick={() => setShowReaction(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showReaction.patientName}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Reaction Type</label>
                <select value={reactionData.reactionType} onChange={e => setReactionData(d => ({ ...d, reactionType: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>Fever</option><option>Allergic</option><option>Hemolytic</option><option>Bacterial</option><option>Anaphylactic</option><option>Other</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <div className="flex gap-2">
                  {['Mild', 'Moderate', 'Severe'].map(s => (
                    <button key={s} onClick={() => setReactionData(d => ({ ...d, severity: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reactionData.severity === s ? (s === 'Severe' ? 'bg-destructive text-white' : s === 'Moderate' ? 'bg-warning text-white' : 'bg-muted text-foreground') : 'bg-muted text-muted-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Symptoms</label>
                <textarea value={reactionData.symptoms} onChange={e => setReactionData(d => ({ ...d, symptoms: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Fever, chills, rash, dyspnea..." />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Action Taken</label>
                <textarea value={reactionData.actionTaken} onChange={e => setReactionData(d => ({ ...d, actionTaken: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" placeholder="Stopped transfusion, antihistamines, doctor notified..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reactionData.stopped} onChange={e => setReactionData(d => ({ ...d, stopped: e.target.checked }))} className="w-4 h-4" />
                Transfusion Stopped
              </label>
              <Button className="w-full" variant="destructive" onClick={() => reactionMut.mutate({ id: showReaction._id, ...reactionData })}>
                Report Reaction
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAdd && tab === 'inventory' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Add Blood Unit</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Blood Group</label><select value={newUnit.bloodGroup} onChange={e => setNewUnit({ ...newUnit, bloodGroup: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Volume (ml)</label><Input type="number" value={newUnit.volume} onChange={e => setNewUnit({ ...newUnit, volume: parseInt(e.target.value) })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Donor Name</label><Input value={newUnit.donorName} onChange={e => setNewUnit({ ...newUnit, donorName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Donation Date</label><Input type="date" value={newUnit.donationDate} onChange={e => setNewUnit({ ...newUnit, donationDate: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Expiry Date</label><Input type="date" value={newUnit.expiryDate} onChange={e => setNewUnit({ ...newUnit, expiryDate: e.target.value })} /></div>
            </div>
            <Button className="w-full mt-6" onClick={() => addUnitMut.mutate(newUnit)} disabled={addUnitMut.isPending || !newUnit.donationDate || !newUnit.expiryDate}>Add Unit</Button>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showAdd && tab === 'requests' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Blood Request</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input value={newReq.patientName} onChange={e => setNewReq({ ...newReq, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Blood Group</label><select value={newReq.bloodGroup} onChange={e => setNewReq({ ...newReq, bloodGroup: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Units</label><Input type="number" value={newReq.unitsRequired} onChange={e => setNewReq({ ...newReq, unitsRequired: parseInt(e.target.value) })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label><select value={newReq.priority} onChange={e => setNewReq({ ...newReq, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Routine', 'Urgent', 'Emergency'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Reason</label><Input value={newReq.reason} onChange={e => setNewReq({ ...newReq, reason: e.target.value })} /></div>
              <Button className="w-full" onClick={() => createReqMut.mutate(newReq)} disabled={createReqMut.isPending || !newReq.patientName}>Create Request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// 28
