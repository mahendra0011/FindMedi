import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, CheckCircle, AlertTriangle, User, Home, Sparkles, Shield, ClipboardList, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const hkApi = {
  getTasks: (p) => api.getHousekeepingTasks(p),
  createTask: (b) => api.createHousekeepingTask(b),
  completeTask: (id, b) => api.completeHousekeepingTask(id, b),
  verifyTask: (id, b) => api.verifyHousekeepingTask(id, b),
  autoCreateOnDischarge: async (id, b) => { try { return await api.autoCreateHousekeepingOnDischarge({ id, ...b }); } catch { return {}; } },
  getStats: async () => { try { return await api.getHousekeepingStats(); } catch { return { pending: 0, inProgress: 0, completed: 0, total: 0 }; } },
};

const statusColors = {
  Pending: 'bg-warning/10 text-warning',
  'In Progress': 'bg-primary/10 text-primary',
  Completed: 'bg-success/10 text-success',
  Verified: 'bg-purple-500/10 text-purple-600',
};

const cleaningChecklist = [
  { key: 'bedChanged', label: 'Bed linen changed' },
  { key: 'floorMopped', label: 'Floor mopped & disinfected' },
  { key: 'bathroomCleaned', label: 'Bathroom cleaned' },
  { key: 'dustbinEmptied', label: 'Dustbin emptied' },
  { key: 'surfacesDisinfected', label: 'All surfaces disinfected' },
  { key: 'equipmentSanitized', label: 'Equipment sanitized' },
  { key: 'ventilationChecked', label: 'Ventilation checked' },
  { key: 'insectControl', label: 'Insect/pest control done' },
];

export default function Housekeeping() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [checklist, setChecklist] = useState({});
  const [verifyData, setVerifyData] = useState({ rating: 'Good', comments: '', issuesFound: '' });
  const [newTask, setNewTask] = useState({ room: '', bedNumber: '', ward: '', type: 'Routine Cleaning', priority: 'Routine', assignedTo: '', notes: '', isInfectionCase: false });

  const { data } = useQuery({ queryKey: ['hk', search, statusFilter], queryFn: () => hkApi.getTasks({ search, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['hk-stats'], queryFn: hkApi.getStats });
  const tasks = data?.tasks || [];

  const createMut = useMutation({ mutationFn: hkApi.createTask, onSuccess: () => { qc.invalidateQueries(['hk']); setShowCreate(false); } });
  const completeMut = useMutation({ mutationFn: ({ id, ...b }) => hkApi.completeTask(id, b), onSuccess: () => qc.invalidateQueries(['hk']) });
  const [_showVerify, setShowVerify] = useState(null);
  const [_showChecklist, setShowChecklist] = useState(null);
  const verifyMut = useMutation({ mutationFn: ({ id, ...b }) => hkApi.verifyTask(id, b), onSuccess: () => { qc.invalidateQueries(['hk']); setShowVerify(null); } });
  const autoCreateMut = useMutation({ mutationFn: hkApi.autoCreateOnDischarge, onSuccess: () => qc.invalidateQueries(['hk']) });

  const _renderChecklist = (task) => (
    <div className="bg-muted/20 rounded-lg p-3">
      <p className="text-xs font-semibold mb-2">Cleaning Checklist</p>
      {task.isInfectionCase && (
        <div className="bg-destructive/5 text-destructive text-xs p-2 rounded mb-2 flex items-center gap-1">
          <Shield className="w-3 h-3" /> Infection Control Protocol - Terminal Cleaning Required
        </div>
      )}
      <div className="space-y-2">
        {cleaningChecklist.map(item => (
          <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={checklist[item.key] || false}
              onChange={() => setChecklist(c => ({ ...c, [item.key]: !c[item.key] }))}
              className="w-4 h-4" />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {task.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {task.notes}</p>}
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={() => completeMut.mutate({ id: task._id, checklist })}>Complete</Button>
        <Button size="sm" variant="outline" onClick={() => setShowChecklist(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Housekeeping</h1>
        <p className="page-subtitle">{stats?.pending || 0} pending · {stats?.inProgress || 0} in progress · {stats?.completed || 0} completed</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Total Tasks', v: stats?.total || 0, c: 'text-foreground', ic: Home },
          { l: 'Pending', v: stats?.pending || 0, c: 'text-warning', ic: Clock },
          { l: 'In Progress', v: stats?.inProgress || 0, c: 'text-primary', ic: Sparkles },
          { l: 'Completed', v: stats?.completed || 0, c: 'text-success', ic: CheckCircle },
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
          <Input placeholder="Search rooms, wards..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {['Pending', 'In Progress', 'Completed', 'Verified'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Task</Button>
        <Button onClick={() => autoCreateMut.mutate({ patientId: 'demo' })} variant="outline"><Bell className="w-4 h-4 mr-1" /> Simulate Discharge Alert</Button>
      </div>

      <div className="space-y-4">
        {tasks.map(task => {
          const isExpanded = expandedId === task._id;
          const checklistData = task.checklist || {};
          const checklistDone = cleaningChecklist.every(item => checklistData[item.key]);

          return (
            <div key={task._id} className={`bg-card rounded-xl border shadow-sm ${task.isInfectionCase ? 'border-destructive/50 bg-destructive/5' : ''}`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : task._id)}>
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-primary" />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[task.status] || ''}`}>{task.status}</span>
                  {task.isInfectionCase && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{task.room} · Bed {task.bedNumber}</p>
                    <p className="text-xs text-muted-foreground">{task.ward} · {task.type} · {task.assignedTo || 'Unassigned'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium">{task.type}</p></div>
                    <div><span className="text-muted-foreground">Priority</span><p className="font-medium">{task.priority}</p></div>
                    <div><span className="text-muted-foreground">Assigned To</span><p className="font-medium">{task.assignedTo || 'N/A'}</p></div>
                    {task.notes && <div className="col-span-3"><span className="text-muted-foreground">Notes</span><p className="font-medium">{task.notes}</p></div>}
                  </div>

                  {/* Infection Protocol Notice */}
                  {task.isInfectionCase && (
                    <div className="bg-destructive/5 rounded-lg p-3 text-xs text-destructive">
                      <Shield className="w-3 h-3 inline mr-1" />
                      <strong>Infection Protocol:</strong> Terminal cleaning required. Use PPE, fumigation, and specialized disinfectants.
                      {task.verificationNotes && <p className="mt-1">Verified: {task.verificationNotes}</p>}
                    </div>
                  )}

                  {/* Cleaning Checklist */}
                  {task.status === 'In Progress' && !checklistDone && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Cleaning Checklist</p>
                      <div className="grid grid-cols-2 gap-2">
                        {cleaningChecklist.map(item => (
                          <label key={item.key} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={checklist[item.key] || false}
                              onChange={() => setChecklist(c => ({ ...c, [item.key]: !c[item.key] }))}
                              className="w-4 h-4" />
                            <span className="text-sm">{item.label}</span>
                          </label>
                        ))}
                      </div>
                      <Button size="sm" className="mt-3" onClick={() => completeMut.mutate({ id: task._id, checklist })}>
                        Mark Complete
                      </Button>
                    </div>
                  )}

                  {/* Checklist Display */}
                  {task.checklist && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Checklist Progress</p>
                      <div className="grid grid-cols-2 gap-2">
                        {cleaningChecklist.map(item => (
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

                  {/* Supervisor Verification */}
                  {task.status === 'Completed' && !task.verified && (
                    <div className="bg-warning/5 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Supervisor Inspection</p>
                      <div className="space-y-2">
                        <div><label className="text-xs text-muted-foreground mb-1 block">Rating</label>
                          <div className="flex gap-2">
                            {['Excellent', 'Good', 'Fair', 'Poor'].map(r => (
                              <button key={r} onClick={() => setVerifyData(d => ({ ...d, rating: r }))}
                                className={`px-2 py-1 rounded text-xs ${verifyData.rating === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div><label className="text-xs text-muted-foreground mb-1 block">Comments</label>
                          <textarea value={verifyData.comments} onChange={e => setVerifyData(d => ({ ...d, comments: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" />
                        </div>
                        <div><label className="text-xs text-muted-foreground mb-1 block">Issues Found (if any)</label>
                          <textarea value={verifyData.issuesFound} onChange={e => setVerifyData(d => ({ ...d, issuesFound: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-12" />
                        </div>
                        <Button size="sm" onClick={() => verifyMut.mutate({ id: task._id, ...verifyData })}>Verify & Approve</Button>
                      </div>
                    </div>
                  )}

                  {/* Verified Status */}
                  {task.verified && (
                    <div className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified by supervisor · Rating: {task.verificationRating || 'Good'}
                      {task.bedStatusUpdated && ' · Bed marked as Available'}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {task.status === 'Pending' && (
                      <Button size="sm" onClick={() => {
                        setChecklist({});
                        setShowChecklist(task);
                      }}>
                        <ClipboardList className="w-3 h-3 mr-1" /> Start Cleaning
                      </Button>
                    )}
                    {task.status === 'In Progress' && checklistDone && !task.completedAt && (
                      <Button size="sm" onClick={() => completeMut.mutate({ id: task._id, checklist })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Housekeeping Task</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Room *</label><Input value={newTask.room} onChange={e => setNewTask({ ...newTask, room: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Bed Number</label><Input value={newTask.bedNumber} onChange={e => setNewTask({ ...newTask, bedNumber: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Ward</label><Input value={newTask.ward} onChange={e => setNewTask({ ...newTask, ward: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Type</label>
                  <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {['Routine Cleaning', 'Deep Cleaning', 'Discharge Cleaning', 'Terminal Cleaning', 'Fumigation'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option>Routine</option><option>Urgent</option><option>Emergency</option>
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Assigned To</label><Input value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Notes</label><textarea value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newTask.isInfectionCase} onChange={e => setNewTask({ ...newTask, isInfectionCase: e.target.checked })} className="w-4 h-4" />
                Infection Control Case (Terminal Cleaning Required)
              </label>
              <Button className="w-full" onClick={() => createMut.mutate(newTask)} disabled={createMut.isPending || !newTask.room}>Create Task</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// 32
