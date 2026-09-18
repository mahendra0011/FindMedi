import { useState, useMemo } from 'react';
import { X, Clock, Calendar, Coffee, Settings2, CheckCircle, XCircle, AlertTriangle, CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Deep equality check for objects/arrays (handles dateDisabledSlots nested structure)
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length || !ak.every((k, i) => k === bk[i])) return false;
    return ak.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}

// Format a dateDisabledSlots object for display: { "2026-07-28": ["09:00 AM", ...] }
function formatDateDisabled(obj) {
  if (!obj || typeof obj !== 'object') return 'None';
  const entries = Object.entries(obj).filter(([, slots]) => Array.isArray(slots) && slots.length > 0);
  if (entries.length === 0) return 'None';
  return entries.map(([date, slots]) => `${date} (${slots.length} slot${slots.length !== 1 ? 's' : ''})`).join(', ');
}

// Format weekly schedule object for display
function formatWeeklySchedule(obj) {
  if (!obj || typeof obj !== 'object') return 'None set';
  const on = days.filter(d => obj[d]);
  return on.length > 0 ? on.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') : 'None set';
}

// Format leaves array for display
function formatLeaves(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 'None';
  return arr.join(', ');
}

/**
 * Modal for admin to review a doctor's schedule change request.
 * Shows ALL requested fields with current vs requested comparison + per-field checkboxes.
 * Admin ticks checkboxes for fields they agree with, then clicks "Confirm".
 */
export default function ScheduleChangeRequestModal({ request, doctor, onClose, onDecision }) {
  const [checkedFields, setCheckedFields] = useState({});
  const [decision, setDecision] = useState(null); // 'approve' | 'reject'
  const [adminNote, setAdminNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rc = request?.requestedChanges || {};
  // Current values come from the populated doctor object.
  // The pending route populates doctorId with schedule fields; AdminScheduleManage passes the doctor from getDoctors.
  const current = useMemo(() => ({
    slotDuration: doctor?.slotDuration ?? 15,
    workingHours: doctor?.workingHours || { start: '09:00', end: '17:00' },
    breakTime: doctor?.breakTime || { start: '', end: '' },
    bookingWindow: doctor?.bookingWindow || { unit: 'weeks', value: 2 },
    weekly_schedule: doctor?.weekly_schedule || {},
    leaves: doctor?.leaves || [],
    dateDisabledSlots: doctor?.dateDisabledSlots || {},
    bufferPerHour: doctor?.bufferPerHour ?? 1,
  }), [doctor]);

  // Build comparison rows for ALL fields present in the request, marking which changed
  const fields = useMemo(() => {
    const list = [];

    // Slot Duration
    if (rc.slotDuration != null) {
      const changed = rc.slotDuration !== current.slotDuration;
      list.push({
        key: 'slotDuration',
        label: 'Slot Duration',
        icon: Clock,
        current: `${current.slotDuration} min`,
        requested: `${rc.slotDuration} min`,
        changed,
      });
    }

    // Working Hours
    if (rc.workingHours) {
      const changed = rc.workingHours.start !== current.workingHours.start || rc.workingHours.end !== current.workingHours.end;
      list.push({
        key: 'workingHours',
        label: 'Working Hours',
        icon: Clock,
        current: `${current.workingHours.start || '—'} – ${current.workingHours.end || '—'}`,
        requested: `${rc.workingHours.start || '—'} – ${rc.workingHours.end || '—'}`,
        changed,
      });
    }

    // Break Time
    if (rc.breakTime) {
      const changed = (rc.breakTime.start || '') !== (current.breakTime?.start || '') || (rc.breakTime.end || '') !== (current.breakTime?.end || '');
      const fmt = (bt) => (bt?.start && bt?.end) ? `${bt.start} – ${bt.end}` : 'None';
      list.push({
        key: 'breakTime',
        label: 'Break Time',
        icon: Coffee,
        current: fmt(current.breakTime),
        requested: fmt(rc.breakTime),
        changed,
      });
    }

    // Booking Window
    if (rc.bookingWindow) {
      const changed = rc.bookingWindow.unit !== current.bookingWindow.unit || rc.bookingWindow.value !== current.bookingWindow.value;
      list.push({
        key: 'bookingWindow',
        label: 'Booking Window',
        icon: Calendar,
        current: `${current.bookingWindow.value} ${current.bookingWindow.unit}`,
        requested: `${rc.bookingWindow.value} ${rc.bookingWindow.unit}`,
        changed,
      });
    }

    // Buffer Per Hour
    if (rc.bufferPerHour != null) {
      const changed = rc.bufferPerHour !== current.bufferPerHour;
      list.push({
        key: 'bufferPerHour',
        label: 'Buffer Slots Per Hour',
        icon: Clock,
        current: `${current.bufferPerHour} slot${current.bufferPerHour !== 1 ? 's' : ''}/hour`,
        requested: `${rc.bufferPerHour} slot${rc.bufferPerHour !== 1 ? 's' : ''}/hour`,
        changed,
      });
    }

    // Weekly Schedule
    if (rc.weekly_schedule) {
      const changed = !deepEqual(rc.weekly_schedule, current.weekly_schedule);
      list.push({
        key: 'weekly_schedule',
        label: 'Weekly Working Days',
        icon: Calendar,
        current: formatWeeklySchedule(current.weekly_schedule),
        requested: formatWeeklySchedule(rc.weekly_schedule),
        changed,
      });
    }

    // Leaves
    if (rc.leaves != null) {
      const changed = !deepEqual(rc.leaves, current.leaves);
      list.push({
        key: 'leaves',
        label: 'Holidays & Time-off',
        icon: CalendarOff,
        current: formatLeaves(current.leaves),
        requested: formatLeaves(rc.leaves),
        changed,
      });
    }

    // Date Disabled Slots (deep comparison)
    if (rc.dateDisabledSlots) {
      const changed = !deepEqual(rc.dateDisabledSlots, current.dateDisabledSlots);
      list.push({
        key: 'dateDisabledSlots',
        label: 'Per-Date Disabled Slots',
        icon: Settings2,
        current: formatDateDisabled(current.dateDisabledSlots),
        requested: formatDateDisabled(rc.dateDisabledSlots),
        changed,
      });
    }

    return list;
  }, [rc, current]);

  if (!request || !doctor) return null;

  const toggleField = (key) => {
    setCheckedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    const all = {};
    fields.forEach(f => { all[f.key] = true; });
    setCheckedFields(all);
  };

  const deselectAll = () => setCheckedFields({});

  const changedCount = fields.filter(f => f.changed).length;
  const checkedCount = fields.filter(f => checkedFields[f.key]).length;

  const handleSubmit = async () => {
    if (!decision) {
      toast.error('Please select Approve or Reject');
      return;
    }
    setSubmitting(true);
    try {
      const appliedFields = decision === 'approve'
        ? fields.filter(f => checkedFields[f.key]).map(f => f.key)
        : [];
      await api.decideScheduleChangeRequest(request._id, {
        decision,
        appliedFields,
        adminNote,
        rejectionNote: decision === 'reject' ? rejectionNote : '',
      });
      toast.success(decision === 'approve'
        ? `Schedule changes applied for ${request.doctorName || 'doctor'}`
        : `Request rejected for ${request.doctorName || 'doctor'}`);
      onDecision?.(request._id, decision);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to process request');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border border-border/60 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border/40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold text-foreground">Schedule Change Request</h2>
              <p className="text-xs text-muted-foreground truncate">
                {request.doctorName} • {doctor.specialization} • Submitted {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10 shrink-0">
              Pending Review
            </Badge>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Summary + select all */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-foreground">
              {fields.length} field{fields.length !== 1 ? 's' : ''} in request
              {changedCount > 0 && <span className="text-amber-600 ml-1">({changedCount} changed)</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
            </div>
          </div>

          {/* Field comparison rows */}
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-sm">No changes requested</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map(({ key, label, icon: Icon, current: curVal, requested: reqVal, changed }) => (
                <div
                  key={key}
                  className={`rounded-xl border p-4 transition-all ${
                    checkedFields[key]
                      ? 'border-primary/40 bg-primary/5'
                      : changed
                        ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-500/5'
                        : 'border-border/60 bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={!!checkedFields[key]}
                      onChange={() => toggleField(key)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer shrink-0"
                    />
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground flex-1">{label}</span>
                    {changed ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-[10px]">
                        Changed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        Unchanged
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current</p>
                      <p className="text-sm font-medium text-muted-foreground break-words">{curVal}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-primary mb-1">Requested</p>
                      <p className="text-sm font-medium text-primary break-words">{reqVal}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin notes */}
          <div className="border-t border-border/40 pt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Admin Note (optional)</label>
              <Input
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Add a note for the doctor..."
                className="mt-1"
              />
            </div>

            {/* Decision buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant={decision === 'reject' ? 'destructive' : 'outline'}
                onClick={() => setDecision('reject')}
                className="gap-2 flex-1"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button
                variant={decision === 'approve' ? 'default' : 'outline'}
                onClick={() => setDecision('approve')}
                className="gap-2 flex-1"
              >
                <CheckCircle className="w-4 h-4" /> Confirm {checkedCount > 0 ? `(${checkedCount})` : ''}
              </Button>
            </div>

            {/* Rejection reason (only if reject selected) */}
            {decision === 'reject' && (
              <div>
                <label className="text-xs font-medium text-destructive">Rejection Reason (optional)</label>
                <Input
                  value={rejectionNote}
                  onChange={e => setRejectionNote(e.target.value)}
                  placeholder="Why are you rejecting this request?"
                  className="mt-1"
                />
              </div>
            )}

            {/* Warning when approve with 0 checked */}
            {decision === 'approve' && checkedCount === 0 && fields.length > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No fields selected — confirming will reject the request
              </p>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !decision}
              className="w-full gap-2"
            >
              {submitting ? 'Processing...' : decision === 'approve' ? 'Apply Selected Changes' : 'Reject Request'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
