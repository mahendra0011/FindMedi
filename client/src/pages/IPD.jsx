import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Bed, Plus, Clock, CheckCircle, AlertCircle, X, User, Building2, Activity, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const ipdApi = {
  getBeds: (p = {}) => api.dispatch(() => Promise.resolve({ beds: [] }), '/ipd/beds?' + new URLSearchParams(p)),
  createBed: (b) => api.dispatch(() => Promise.resolve({}), '/ipd/beds', { method: 'POST', body: JSON.stringify(b) }),
  updateBed: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/beds/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  getAdmissions: (p = {}) => api.dispatch(() => Promise.resolve({ admissions: [] }), '/ipd/admissions?' + new URLSearchParams(p)),
  createAdmission: (b) => api.dispatch(() => Promise.resolve({}), '/ipd/admissions', { method: 'POST', body: JSON.stringify(b) }),
  discharge: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/discharge`, { method: 'PUT', body: JSON.stringify(b) }),
  addVitals: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/vitals`, { method: 'POST', body: JSON.stringify(b) }),
  addMar: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/mar`, { method: 'POST', body: JSON.stringify(b) }),
  addIO: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/io`, { method: 'POST', body: JSON.stringify(b) }),
  addNursingNote: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/nursing-notes`, { method: 'POST', body: JSON.stringify(b) }),
  addDoctorNote: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/doctor-notes`, { method: 'POST', body: JSON.stringify(b) }),
  addWoundCare: (id, b) => api.dispatch(() => Promise.resolve({}), `/ipd/admissions/${id}/wound-care`, { method: 'POST', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ totalBeds: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, totalAdmissions: 0, activePatients: 0 }), '/ipd/stats'),
};

const wardColors = {
  General: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Semi-Private': 'bg-green-500/10 text-green-600 border-green-500/20',
  Private: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ICU: 'bg-red-500/10 text-red-600 border-red-500/20',
  NICU: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  PICU: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Emergency: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

const statusColors = {
  Available: 'bg-success/10 text-success',
  Occupied: 'bg-destructive/10 text-destructive',
  'Under Cleaning': 'bg-warning/10 text-warning',
  Maintenance: 'bg-muted text-muted-foreground',
};

export default function IPD() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('beds');
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newBed, setNewBed] = useState({ bedNumber: '', ward: 'General', bedType: 'General', dailyRate: '', floor: '', isAC: false });
  const [newAdmission, setNewAdmission] = useState({ patientName: '', patientId: '', bedId: '', primaryDiagnosis: '', source: 'OPD', attendantName: '', attendantPhone: '', estimatedStay: '' });
  const [expandedAdmId, setExpandedAdmId] = useState(null);
  const [admTab, setAdmTab] = useState('nursing');
  const [newVitals, setNewVitals] = useState({ shift: 'Morning', bp: '', pulse: '', temperature: '', spO2: '', bloodSugar: '', weight: '' });
  const [newMar, setNewMar] = useState({ medicineName: '', dose: '', route: 'Oral', frequency: '', status: 'Given' });
  const [newIO, setNewIO] = useState({ inputType: 'Oral', inputAmount: '', outputType: 'Urine', outputAmount: '' });
  const [newNursingNote, setNewNursingNote] = useState({ shift: 'Morning', subjective: '', objective: '', assessment: '', plan: '' });
  const [newDoctorNote, setNewDoctorNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [dischargeForm, setDischargeForm] = useState({ summary: '', medicines: '', followUpDate: '', instructions: '' });

  const { data: bedsData } = useQuery({ queryKey: ['beds', wardFilter], queryFn: () => ipdApi.getBeds({ ward: wardFilter }) });
  const { data: admissionsData } = useQuery({ queryKey: ['admissions', search], queryFn: () => ipdApi.getAdmissions({ search }) });
  const { data: stats } = useQuery({ queryKey: ['ipd-stats'], queryFn: ipdApi.getStats });

  const beds = bedsData?.beds || [];
  const admissions = admissionsData?.admissions || [];

  const createBedMut = useMutation({ mutationFn: ipdApi.createBed, onSuccess: () => { qc.invalidateQueries(['beds']); setShowAdd(false); } });
  const admitMut = useMutation({ mutationFn: ipdApi.createAdmission, onSuccess: () => { qc.invalidateQueries(['admissions', 'beds']); setShowAdd(false); } });
  const dischargeMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.discharge(id, b), onSuccess: () => qc.invalidateQueries(['admissions', 'beds']) });
  const vitalsMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.addVitals(id, b), onSuccess: () => qc.invalidateQueries(['admissions']) });
  const marMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.addMar(id, b), onSuccess: () => qc.invalidateQueries(['admissions']) });
  const ioMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.addIO(id, b), onSuccess: () => qc.invalidateQueries(['admissions']) });
  const nursingNoteMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.addNursingNote(id, b), onSuccess: () => qc.invalidateQueries(['admissions']) });
  const doctorNoteMut = useMutation({ mutationFn: ({ id, ...b }) => ipdApi.addDoctorNote(id, b), onSuccess: () => qc.invalidateQueries(['admissions']) });
  

  const renderAdmissionDetails = (adm) => {
    if (!adm) return null;
    return (
      <div className="px-4 pb-4 border-t pt-3 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Admission ID</span><p className="font-medium">{adm.admissionId}</p></div>
          <div><span className="text-muted-foreground">Patient</span><p className="font-medium">{adm.patientName}</p></div>
          <div><span className="text-muted-foreground">Doctor</span><p className="font-medium">{adm.admittingDoctor}</p></div>
          <div><span className="text-muted-foreground">Bed</span><p className="font-medium">{adm.bedNumber || 'Not assigned'}</p></div>
          <div><span className="text-muted-foreground">Diagnosis</span><p className="font-medium">{adm.primaryDiagnosis || 'N/A'}</p></div>
          <div><span className="text-muted-foreground">Source</span><p className="font-medium">{adm.source}</p></div>
          <div><span className="text-muted-foreground">Attendant</span><p className="font-medium">{adm.attendantName || 'N/A'}</p></div>
          <div><span className="text-muted-foreground">Stay</span><p className="font-medium">{adm.estimatedStay ? `${adm.estimatedStay} days` : 'N/A'}</p></div>
        </div>

        <div className="flex gap-2 border-b pb-2">
          {['nursing', 'doctor', 'discharge'].map(t => (
            <button key={t} onClick={() => setAdmTab(t)} className={`px-3 py-1.5 rounded text-xs font-medium ${admTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{t === 'nursing' ? 'Nursing' : t === 'doctor' ? 'Doctor Rounds' : 'Discharge'}</button>
          ))}
        </div>

        {admTab === 'nursing' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-xs font-semibold mb-2">Vitals Chart</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  {['Morning', 'Evening', 'Night'].map(s => <div key={s} className={`text-xs px-2 py-1 rounded text-center cursor-pointer ${newVitals.shift === s ? 'bg-primary text-primary-foreground' : 'bg-background border'}`} onClick={() => setNewVitals(v => ({ ...v, shift: s }))}>{s}</div>)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input placeholder="BP (120/80)" value={newVitals.bp} onChange={e => setNewVitals(v => ({ ...v, bp: e.target.value }))} />
                <Input placeholder="Pulse" type="number" value={newVitals.pulse} onChange={e => setNewVitals(v => ({ ...v, pulse: e.target.value }))} />
                <Input placeholder="Temp (°F)" type="number" value={newVitals.temperature} onChange={e => setNewVitals(v => ({ ...v, temperature: e.target.value }))} />
                <Input placeholder="SpO2 %" type="number" value={newVitals.spO2} onChange={e => setNewVitals(v => ({ ...v, spO2: e.target.value }))} />
                <Input placeholder="Blood Sugar" type="number" value={newVitals.bloodSugar} onChange={e => setNewVitals(v => ({ ...v, bloodSugar: e.target.value }))} />
                <Input placeholder="Weight (kg)" type="number" value={newVitals.weight} onChange={e => setNewVitals(v => ({ ...v, weight: e.target.value }))} />
              </div>
              <Button size="sm" className="mt-2" onClick={() => { if (!newVitals.bp && !newVitals.pulse) return; vitalsMut.mutate({ id: adm._id, ...newVitals }); setNewVitals({ shift: 'Morning', bp: '', pulse: '', temperature: '', spO2: '', bloodSugar: '', weight: '' }); }}>Save Vitals</Button>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-xs font-semibold mb-2">MAR - Medicine Administration</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input placeholder="Medicine name" value={newMar.medicineName} onChange={e => setNewMar(v => ({ ...v, medicineName: e.target.value }))} />
                <Input placeholder="Dose" value={newMar.dose} onChange={e => setNewMar(v => ({ ...v, dose: e.target.value }))} />
                <select value={newMar.route} onChange={e => setNewMar(v => ({ ...v, route: e.target.value }))} className="h-9 px-2 rounded border text-xs"><option>Oral</option><option>IV</option><option>IM</option><option>SC</option></select>
                <select value={newMar.status} onChange={e => setNewMar(v => ({ ...v, status: e.target.value }))} className="h-9 px-2 rounded border text-xs"><option>Given</option><option>Refused</option><option>Missed</option><option>Held</option></select>
              </div>
              <Button size="sm" className="mt-2" onClick={() => { if (!newMar.medicineName) return; marMut.mutate({ id: adm._id, ...newMar }); setNewMar({ medicineName: '', dose: '', route: 'Oral', frequency: '', status: 'Given' }); }}>Record MAR</Button>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-xs font-semibold mb-2">Input / Output</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={newIO.inputType} onChange={e => setNewIO(v => ({ ...v, inputType: e.target.value }))} className="h-9 px-2 rounded border text-xs"><option>Oral</option><option>IV Fluid</option><option>Blood</option><option>Ryles</option></select>
                <Input placeholder="Input (ml)" type="number" value={newIO.inputAmount} onChange={e => setNewIO(v => ({ ...v, inputAmount: e.target.value }))} />
                <select value={newIO.outputType} onChange={e => setNewIO(v => ({ ...v, outputType: e.target.value }))} className="h-9 px-2 rounded border text-xs"><option>Urine</option><option>Stool</option><option>Vomit</option><option>Drain</option></select>
                <Input placeholder="Output (ml)" type="number" value={newIO.outputAmount} onChange={e => setNewIO(v => ({ ...v, outputAmount: e.target.value }))} />
              </div>
              <Button size="sm" className="mt-2" onClick={() => { if (!newIO.inputAmount && !newIO.outputAmount) return; ioMut.mutate({ id: adm._id, ...newIO }); setNewIO({ inputType: 'Oral', inputAmount: '', outputType: 'Urine', outputAmount: '' }); }}>Save I/O</Button>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-xs font-semibold mb-2">SOAP Note</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input placeholder="Subjective (patient complaints)" value={newNursingNote.subjective} onChange={e => setNewNursingNote(v => ({ ...v, subjective: e.target.value }))} />
                <Input placeholder="Objective (vitals/obs)" value={newNursingNote.objective} onChange={e => setNewNursingNote(v => ({ ...v, objective: e.target.value }))} />
                <Input placeholder="Assessment" value={newNursingNote.assessment} onChange={e => setNewNursingNote(v => ({ ...v, assessment: e.target.value }))} />
                <Input placeholder="Plan (nursing interventions)" value={newNursingNote.plan} onChange={e => setNewNursingNote(v => ({ ...v, plan: e.target.value }))} />
              </div>
              <Button size="sm" className="mt-2" onClick={() => { if (!newNursingNote.subjective) return; nursingNoteMut.mutate({ id: adm._id, ...newNursingNote }); setNewNursingNote({ shift: 'Morning', subjective: '', objective: '', assessment: '', plan: '' }); }}>Save Note</Button>
            </div>
          </div>
        )}

        {admTab === 'doctor' && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold">Doctor Progress Note (SOAP)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="Subjective" value={newDoctorNote.subjective} onChange={e => setNewDoctorNote(v => ({ ...v, subjective: e.target.value }))} />
              <Input placeholder="Objective (vitals, reports)" value={newDoctorNote.objective} onChange={e => setNewDoctorNote(v => ({ ...v, objective: e.target.value }))} />
              <Input placeholder="Assessment (diagnosis)" value={newDoctorNote.assessment} onChange={e => setNewDoctorNote(v => ({ ...v, assessment: e.target.value }))} />
              <Input placeholder="Plan (orders, treatments)" value={newDoctorNote.plan} onChange={e => setNewDoctorNote(v => ({ ...v, plan: e.target.value }))} />
            </div>
            <Button size="sm" onClick={() => { if (!newDoctorNote.subjective) return; doctorNoteMut.mutate({ id: adm._id, ...newDoctorNote }); setNewDoctorNote({ subjective: '', objective: '', assessment: '', plan: '' }); }}>Save Doctor Note</Button>
          </div>
        )}

        {admTab === 'discharge' && adm.status === 'Admitted' && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold">Discharge</h4>
            <textarea placeholder="Discharge summary" value={dischargeForm.summary} onChange={e => setDischargeForm({ ...dischargeForm, summary: e.target.value })} className="w-full min-h-[60px] rounded border px-2 py-1 text-sm" />
            <Input placeholder="Medicines to continue (comma separated)" value={dischargeForm.medicines} onChange={e => setDischargeForm({ ...dischargeForm, medicines: e.target.value })} />
            <Input type="date" placeholder="Follow-up date" value={dischargeForm.followUpDate} onChange={e => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })} />
            <Input placeholder="Follow-up instructions" value={dischargeForm.instructions} onChange={e => setDischargeForm({ ...dischargeForm, instructions: e.target.value })} />
            <Button size="sm" onClick={() => dischargeMut.mutate({ id: adm._id, ...dischargeForm })}>Discharge Patient</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><h1 className="page-title">IPD Management</h1><p className="page-subtitle">{stats?.activePatients || 0} active patients · {stats?.available || 0} beds available</p></div>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-6">
        {[
          { l: 'Total Beds', v: stats?.totalBeds || 0, c: 'text-foreground' },
          { l: 'Available', v: stats?.available || 0, c: 'text-success' },
          { l: 'Occupied', v: stats?.occupied || 0, c: 'text-destructive' },
          { l: 'Cleaning', v: stats?.cleaning || 0, c: 'text-warning' },
          { l: 'Maintenance', v: stats?.maintenance || 0, c: 'text-muted-foreground' },
          { l: 'Admissions', v: stats?.totalAdmissions || 0, c: 'text-info' },
          { l: 'Active', v: stats?.activePatients || 0, c: 'text-primary' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {['beds', 'admissions'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'beds' ? 'Bed Management' : 'Admissions'}
          </button>
        ))}
      </div>

      {tab === 'beds' && (
        <>
          <div className="flex gap-3 mb-6">
            <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
              <option value="All">All Wards</option>
              {['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Bed</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {beds.map(bed => (
              <div key={bed._id} className={`bg-card rounded-xl border p-4 ${bed.status === 'Occupied' ? 'border-destructive/30' : bed.status === 'Available' ? 'border-success/30' : 'border-warning/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-foreground" /><span className="font-heading font-semibold text-foreground">{bed.bedNumber}</span></div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[bed.status] || ''}`}>{bed.status}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ward</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wardColors[bed.ward] || ''}`}>{bed.ward}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">₹{bed.dailyRate}/day</span></div>
                  {bed.currentPatientName && <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{bed.currentPatientName}</span></div>}
                  {bed.occupiedSince && <div className="flex justify-between"><span className="text-muted-foreground">Since</span><span className="font-medium">{new Date(bed.occupiedSince).toLocaleDateString()}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'admissions' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search admissions..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> New Admission</Button>
          </div>
          <div className="space-y-4">
            {admissions.map(adm => (
              <div key={adm._id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-heading font-semibold text-foreground">{adm.admissionId}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${adm.status === 'Admitted' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{adm.status}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wardColors[adm.ward] || ''}`}>{adm.ward || 'N/A'}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{adm.patientName}</p>
                    <p className="text-xs text-muted-foreground">Dr. {adm.admittingDoctor} · {adm.primaryDiagnosis || 'No diagnosis'}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p><Clock className="w-3 h-3 inline mr-1" />{new Date(adm.createdAt).toLocaleDateString()}</p>
                    {adm.bedNumber && <p>Bed: {adm.bedNumber}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpandedAdmId(expandedAdmId === adm._id ? null : adm._id)}>Clinical Charting</Button>
                  {adm.status === 'Admitted' && (
                    <Button size="sm" variant="outline" onClick={() => { const s = prompt('Discharge summary:'); if (s) dischargeMut.mutate({ id: adm._id, dischargeSummary: s }); }}><CheckCircle className="w-3 h-3 mr-1" /> Discharge</Button>
                  )}
                </div>
                {expandedAdmId === adm._id && renderAdmissionDetails(adm)}
              </div>
            ))}
            {admissions.length === 0 && <div className="text-center py-20"><Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No admissions</p></div>}
          </div>
        </>
      )}

      {showAdd && tab === 'beds' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Add Bed</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Bed Number</label><Input value={newBed.bedNumber} onChange={e => setNewBed({ ...newBed, bedNumber: e.target.value })} placeholder="e.g. G-101" /></div>
              <div><label className="text-sm font-medium mb-1 block">Ward</label><select value={newBed.ward} onChange={e => setNewBed({ ...newBed, ward: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'].map(w => <option key={w} value={w}>{w}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Bed Type</label><select value={newBed.bedType} onChange={e => setNewBed({ ...newBed, bedType: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Daily Rate (₹)</label><Input type="number" value={newBed.dailyRate} onChange={e => setNewBed({ ...newBed, dailyRate: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Floor</label><Input value={newBed.floor} onChange={e => setNewBed({ ...newBed, floor: e.target.value })} placeholder="e.g. 1st" /></div>
              <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={newBed.isAC} onChange={e => setNewBed({ ...newBed, isAC: e.target.checked })} className="w-4 h-4" /><label className="text-sm">AC Room</label></div>
            </div>
            <Button className="w-full mt-6" onClick={() => createBedMut.mutate(newBed)} disabled={createBedMut.isPending || !newBed.bedNumber}>Add Bed</Button>
          </div>
        </div>
      )}

      {showAdd && tab === 'admissions' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Admission</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input value={newAdmission.patientName} onChange={e => setNewAdmission({ ...newAdmission, patientName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Source</label><select value={newAdmission.source} onChange={e => setNewAdmission({ ...newAdmission, source: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['OPD', 'Emergency', 'Direct', 'Referral'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Primary Diagnosis</label><Input value={newAdmission.primaryDiagnosis} onChange={e => setNewAdmission({ ...newAdmission, primaryDiagnosis: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Bed (optional)</label><select value={newAdmission.bedId} onChange={e => setNewAdmission({ ...newAdmission, bedId: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option value="">Select bed...</option>{beds.filter(b => b.status === 'Available').map(b => <option key={b._id} value={b._id}>{b.bedNumber} - {b.ward} (₹{b.dailyRate})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Attendant Name</label><Input value={newAdmission.attendantName} onChange={e => setNewAdmission({ ...newAdmission, attendantName: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Attendant Phone</label><Input value={newAdmission.attendantPhone} onChange={e => setNewAdmission({ ...newAdmission, attendantPhone: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Estimated Stay (days)</label><Input type="number" value={newAdmission.estimatedStay} onChange={e => setNewAdmission({ ...newAdmission, estimatedStay: e.target.value })} /></div>
              <Button className="w-full" onClick={() => admitMut.mutate(newAdmission)} disabled={admitMut.isPending || !newAdmission.patientName}>Admit Patient</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// 33
