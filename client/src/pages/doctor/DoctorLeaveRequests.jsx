import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Send, Plus, X, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const leaveStatusColors = {
  Pending: 'bg-warning/10 text-warning border-warning/20',
  Approved: 'bg-success/10 text-success border-success/20',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const leaveTypes = [
  'Sick Leave',
  'Casual Leave',
  'Earned Leave',
  'Personal Leave',
  'Maternity/Paternity Leave',
  'Other',
];

export default function DoctorLeaveRequests() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [doctors, leavesRes] = await Promise.all([
        api.getDoctors(),
        api.getLeaveRequests(),
      ]);
      const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
      if (myDoc) setDoctor(myDoc);
      setLeaves(leavesRes?.leaves || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.email, user?.name]);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) return;
    setSubmitting(true);
    try {
      const created = await api.createLeaveRequest({
        leaveType, startDate, endDate, reason,
      });
      setLeaves(prev => [created, ...prev]);
      setShowForm(false);
      setLeaveType('Sick Leave');
      setStartDate('');
      setEndDate('');
      setReason('');
      toast.success('Leave request submitted');
    } catch (e) {
      toast.error('Failed to submit leave request');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Leave / Time-off Requests</h1>
          <p className="text-muted-foreground">Submit leave requests for admin approval</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Leave Balance Info */}
      {doctor && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
          <h3 className="font-heading font-semibold text-foreground mb-3">Leave Balance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-card rounded-lg p-3 text-center border border-border/40">
              <p className="text-lg font-bold text-primary">12</p>
              <p className="text-xs text-muted-foreground">Sick Leave</p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border/40">
              <p className="text-lg font-bold text-primary">15</p>
              <p className="text-xs text-muted-foreground">Casual Leave</p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border/40">
              <p className="text-lg font-bold text-primary">20</p>
              <p className="text-xs text-muted-foreground">Earned Leave</p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border/40">
              <p className="text-lg font-bold text-primary">{leaves.length}</p>
              <p className="text-xs text-muted-foreground">Used Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests List */}
      {leaves.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No leave requests yet</p>
          <p className="text-sm text-muted-foreground/70">Submit a leave request for admin approval</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaves.map((lv, i) => {
            const colors = leaveStatusColors[lv.status] || leaveStatusColors.Pending;
            return (
              <motion.div key={lv._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${colors} flex items-center justify-center bg-opacity-20`}>
                      {lv.status === 'Approved' ? <CheckCircle className="w-6 h-6 text-success" /> :
                       lv.status === 'Rejected' ? <X className="w-6 h-6 text-destructive" /> :
                       <AlertCircle className="w-6 h-6 text-warning" />}
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{lv.leaveType}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {lv.startDate} → {lv.endDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Applied: {lv.createdAt ? new Date(lv.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {lv.reason && <p className="text-sm text-foreground mt-2">{lv.reason}</p>}
                      {lv.adminNotes && (
                        <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
                          <span className="text-muted-foreground">Admin: </span>
                          <span className="text-foreground">{lv.adminNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={`${colors} px-3 py-1`}>{lv.status}</Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Leave Request Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">New Leave Request</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Leave Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {leaveTypes.map(t => (
                    <button key={t} onClick={() => setLeaveType(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${leaveType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Start Date *</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">End Date *</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Please provide a reason for your leave..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24" />
              </div>

              {startDate && endDate && (
                <div className="bg-muted/30 rounded-xl p-3 text-sm">
                  <span className="text-muted-foreground">Total days: </span>
                  <span className="font-medium text-foreground">
                    {Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={!startDate || !endDate || !reason || submitting}>
                <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
