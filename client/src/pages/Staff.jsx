import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Users, CheckCircle, AlertTriangle, User, Calendar, FileText, Activity, DollarSign, BookOpen, Award, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const staffApi = {
  getAll: (p) => api.dispatch(() => Promise.resolve({ staff: [] }), '/staff?' + new URLSearchParams(p)),
  create: (b) => api.dispatch(() => Promise.resolve({}), '/staff', { method: 'POST', body: JSON.stringify(b) }),
  update: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  markAttendance: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}/attendance`, { method: 'PUT', body: JSON.stringify(b) }),
  applyLeave: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}/leave`, { method: 'PUT', body: JSON.stringify(b) }),
  approveLeave: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}/leave-approve`, { method: 'PUT', body: JSON.stringify(b) }),
  assignShift: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}/shift`, { method: 'PUT', body: JSON.stringify(b) }),
  addTraining: (id, b) => api.dispatch(() => Promise.resolve({}), `/staff/${id}/training`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ active: 0, onLeave: 0, onDuty: 0, total: 0 }), '/staff/stats'),
};

const roleColors = {
  Doctor: 'bg-info/10 text-info',
  Nurse: 'bg-success/10 text-success',
  Admin: 'bg-primary/10 text-primary',
  Technician: 'bg-warning/10 text-warning',
  Pharmacist: 'bg-purple-500/10 text-purple-600',
  'Lab Staff': 'bg-orange-500/10 text-orange-600',
  Housekeeping: 'bg-muted text-muted-foreground',
  Other: 'bg-muted text-muted-foreground',
};

const shifts = ['Morning (6AM-2PM)', 'Evening (2PM-10PM)', 'Night (10PM-6AM)', 'General (9AM-5PM)'];

export default function Staff() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAttendance, setShowAttendance] = useState(null);
  const [showLeave, setShowLeave] = useState(null);
  const [showShift, setShowShift] = useState(null);
  const [showTraining, setShowTraining] = useState(null);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });
  const [shiftData, setShiftData] = useState({ shift: 'Morning (6AM-2PM)', department: '', startDate: '' });
  const [trainingData, setTrainingData] = useState({ course: '', date: '', expiryDate: '', provider: '' });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', role: 'Nurse', department: '', employeeId: '', joiningDate: '', salary: '' });

  const { data } = useQuery({ queryKey: ['staff', search, deptFilter], queryFn: () => staffApi.getAll({ search, department: deptFilter }) });
  const { data: stats } = useQuery({ queryKey: ['staff-stats'], queryFn: staffApi.getStats });
  const staff = data?.staff || [];

  const createMut = useMutation({ mutationFn: staffApi.create, onSuccess: () => { qc.invalidateQueries(['staff']); setShowCreate(false); } });
  const attendanceMut = useMutation({ mutationFn: ({ id, ...b }) => staffApi.markAttendance(id, b), onSuccess: () => setShowAttendance(null) });
  const leaveMut = useMutation({ mutationFn: ({ id, ...b }) => staffApi.applyLeave(id, b), onSuccess: () => { qc.invalidateQueries(['staff']); setShowLeave(null); } });
  const shiftMut = useMutation({ mutationFn: ({ id, ...b }) => staffApi.assignShift(id, b), onSuccess: () => { qc.invalidateQueries(['staff']); setShowShift(null); } });
  const trainingMut = useMutation({ mutationFn: ({ id, ...b }) => staffApi.addTraining(id, b), onSuccess: () => { qc.invalidateQueries(['staff']); setShowTraining(null); } });

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Staff Management</h1>
        <p className="page-subtitle">{stats?.active || 0} active · {stats?.onDuty || 0} on duty · {stats?.onLeave || 0} on leave</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Total Staff', v: stats?.total || 0, c: 'text-foreground', ic: Users },
          { l: 'Active', v: stats?.active || 0, c: 'text-success', ic: CheckCircle },
          { l: 'On Duty', v: stats?.onDuty || 0, c: 'text-primary', ic: Activity },
          { l: 'On Leave', v: stats?.onLeave || 0, c: 'text-warning', ic: Clock },
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
          <Input placeholder="Search staff..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Departments</option>
          {['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency', 'ICU', 'Lab', 'Pharmacy', 'Admin'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>
      </div>

      <div className="space-y-4">
        {staff.map(s => {
          const isExpanded = expandedId === s._id;
          return (
            <div key={s._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s._id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleColors[s.role] || ''}`}>{s.role}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.department} · {s.employeeId || 'No ID'} · {s.shift || 'No shift'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-success/10 text-success' : s.status === 'On Leave' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{s.status}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Email</span><p className="font-medium">{s.email || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{s.phone || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Joining</span><p className="font-medium">{s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Salary</span><p className="font-medium">{s.salary ? `₹${s.salary}` : 'N/A'}</p></div>
                  </div>

                  {/* Attendance History */}
                  {s.attendance?.length > 0 && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Recent Attendance</p>
                      <div className="flex gap-2 flex-wrap">
                        {s.attendance.slice(-7).map((a, i) => (
                          <div key={i} className={`text-[10px] px-2 py-1 rounded ${a.status === 'Present' ? 'bg-success/10 text-success' : a.status === 'Late' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                            {a.date ? new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short' }) : ''}: {a.status}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leave History */}
                  {s.leaves?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Leave History</p>
                      {s.leaves.slice(-2).map((l, i) => (
                        <div key={i} className="text-xs bg-muted/30 rounded p-2">
                          {l.type} · {l.startDate ? new Date(l.startDate).toLocaleDateString() : ''} - {l.endDate ? new Date(l.endDate).toLocaleDateString() : ''}
                          {l.approved ? ' ✅' : ' ⏳'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Training Records */}
                  {s.trainings?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Training/Certifications</p>
                      {s.trainings.map((t, i) => (
                        <div key={i} className="text-xs bg-muted/30 rounded p-2 flex items-center gap-2">
                          <Award className="w-3 h-3 text-primary" />
                          {t.course} · {t.date ? new Date(t.date).toLocaleDateString() : ''}
                          {t.expiryDate && <span className="text-muted-foreground">(Exp: {new Date(t.expiryDate).toLocaleDateString()})</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setShowAttendance(s)}>
                      <Calendar className="w-3 h-3 mr-1" /> Mark Attendance
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setLeaveData({ type: 'Sick', startDate: '', endDate: '', reason: '' }); setShowLeave(s); }}>
                      <Clock className="w-3 h-3 mr-1" /> Apply Leave
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShiftData({ shift: 'Morning (6AM-2PM)', department: s.department, startDate: '' }); setShowShift(s); }}>
                      <Calendar className="w-3 h-3 mr-1" /> Assign Shift
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setTrainingData({ course: '', date: '', expiryDate: '', provider: '' }); setShowTraining(s); }}>
                      <BookOpen className="w-3 h-3 mr-1" /> Add Training
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attendance Modal */}
      {showAttendance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAttendance(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Mark Attendance</h3>
            <p className="text-sm text-muted-foreground mb-4">{showAttendance.name}</p>
            <div className="flex gap-2 mb-4">
              {['Present', 'Late', 'Absent', 'Half Day'].map(status => (
                <button key={status} onClick={() => attendanceMut.mutate({ id: showAttendance._id, status, date: new Date().toISOString().split('T')[0] })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${status === 'Present' ? 'bg-success text-white' : status === 'Late' ? 'bg-warning text-white' : status === 'Absent' ? 'bg-destructive text-white' : 'bg-muted text-foreground'}`}>
                  {status}
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowAttendance(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLeave(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Apply Leave</h3>
            <p className="text-sm text-muted-foreground mb-4">{showLeave.name}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Leave Type</label>
                <select value={leaveData.type} onChange={e => setLeaveData(d => ({ ...d, type: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>Sick</option><option>Casual</option><option>Annual</option><option>Personal</option><option>Maternity</option><option>Paternity</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Start Date</label><Input type="date" value={leaveData.startDate} onChange={e => setLeaveData(d => ({ ...d, startDate: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">End Date</label><Input type="date" value={leaveData.endDate} onChange={e => setLeaveData(d => ({ ...d, endDate: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Reason</label><textarea value={leaveData.reason} onChange={e => setLeaveData(d => ({ ...d, reason: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16" /></div>
              <Button className="w-full" onClick={() => leaveMut.mutate({ id: showLeave._id, ...leaveData })}>Apply Leave</Button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {showShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShift(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Assign Shift</h3>
            <p className="text-sm text-muted-foreground mb-4">{showShift.name}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Shift</label>
                <select value={shiftData.shift} onChange={e => setShiftData(d => ({ ...d, shift: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {shifts.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Department</label><Input value={shiftData.department} onChange={e => setShiftData(d => ({ ...d, department: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Start Date</label><Input type="date" value={shiftData.startDate} onChange={e => setShiftData(d => ({ ...d, startDate: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => shiftMut.mutate({ id: showShift._id, ...shiftData })}>Assign Shift</Button>
            </div>
          </div>
        </div>
      )}

      {/* Training Modal */}
      {showTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTraining(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">Add Training Record</h3>
            <p className="text-sm text-muted-foreground mb-4">{showTraining.name}</p>
            <div className="space-y-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Course/Training</label><Input value={trainingData.course} onChange={e => setTrainingData(d => ({ ...d, course: e.target.value }))} placeholder="e.g. CPR Certification" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><Input type="date" value={trainingData.date} onChange={e => setTrainingData(d => ({ ...d, date: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Expiry Date</label><Input type="date" value={trainingData.expiryDate} onChange={e => setTrainingData(d => ({ ...d, expiryDate: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Provider</label><Input value={trainingData.provider} onChange={e => setTrainingData(d => ({ ...d, provider: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => trainingMut.mutate({ id: showTraining._id, ...trainingData })}>Save Training</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Add Staff Member</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Name *</label><Input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Employee ID</label><Input value={newStaff.employeeId} onChange={e => setNewStaff({ ...newStaff, employeeId: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Email</label><Input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {['Doctor', 'Nurse', 'Admin', 'Technician', 'Pharmacist', 'Lab Staff', 'Housekeeping', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">Department</label><Input value={newStaff.department} onChange={e => setNewStaff({ ...newStaff, department: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Joining Date</label><Input type="date" value={newStaff.joiningDate} onChange={e => setNewStaff({ ...newStaff, joiningDate: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Salary (₹)</label><Input type="number" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={() => createMut.mutate(newStaff)} disabled={createMut.isPending || !newStaff.name}>Add Staff</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}