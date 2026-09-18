/**
 * ScheduleFieldHighlight — Highlighter-style badge shown next to a schedule
 * field on the doctor's page after a change request has been reviewed by admin.
 *
 * Ported from client/src/components/ScheduleFieldHighlight.jsx.
 * Migration changes:
 *   - TypeScript prop types
 *   - No animation library needed (pure presentational)
 */
'use client';

import { CheckCircle, XCircle } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Convert a field's raw value into a short human-readable string.
 * Used by both the inline highlight and the review modal.
 *
 * @param fieldKey - e.g. 'bookingWindow', 'slotDuration', 'workingHours'
 * @param value    - the raw stored value
 */
export function formatFieldValue(fieldKey: string, value: unknown): string {
  if (value == null) return '—';
  switch (fieldKey) {
    case 'slotDuration':
      return `${value} min`;
    case 'bufferPerHour': {
      const v = value as number;
      return `${v} slot${v !== 1 ? 's' : ''}/hr`;
    }
    case 'workingHours': {
      const wh = value as { start?: string; end?: string };
      return wh && (wh.start || wh.end) ? `${wh.start || '—'} – ${wh.end || '—'}` : '—';
    }
    case 'breakTime': {
      if (!value) return 'None';
      const bt = value as { start?: string; end?: string };
      const has = bt.start && bt.end;
      return has ? `${bt.start} – ${bt.end}` : 'None';
    }
    case 'bookingWindow': {
      const bw = value as { value?: number; unit?: string };
      return bw && bw.value != null ? `${bw.value} ${bw.unit || 'weeks'}` : '—';
    }
    case 'weekly_schedule': {
      if (!value || typeof value !== 'object') return 'None set';
      const ws = value as Record<string, boolean>;
      const on = DAYS.filter(d => ws[d]);
      return on.length > 0 ? on.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') : 'None set';
    }
    case 'leaves':
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None';
    case 'dateDisabledSlots': {
      if (!value || typeof value !== 'object') return 'None';
      const entries = Object.entries(value as Record<string, unknown[]>)
        .filter(([, s]) => Array.isArray(s) && s.length > 0);
      if (entries.length === 0) return 'None';
      return entries.map(([d, s]) => `${d} (${s.length})`).join(', ');
    }
    default:
      return String(value);
  }
}

export type ScheduleChangeStatus = 'approved' | 'rejected';

interface ScheduleFieldHighlightProps {
  status: ScheduleChangeStatus;
  label?: string;
  oldText: string;
  newText: string;
}

/**
 * - approved → blue highlighter, "Current Setting" label, `old → new`
 * - rejected → red highlighter, `old → new (not applied)`
 */
export default function ScheduleFieldHighlight({ status, label, oldText, newText }: ScheduleFieldHighlightProps) {
  if (!status || (status !== 'approved' && status !== 'rejected')) return null;
  const isApproved = status === 'approved';

  return (
    <div className="mt-1.5">
      {isApproved && (
        <p className="text-[11px] font-bold text-black leading-tight mb-0.5">Current Setting</p>
      )}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold text-black ${
          isApproved
            ? 'bg-blue-200/60 border-blue-400'
            : 'bg-red-200/60 border-red-400'
        }`}
      >
        {isApproved
          ? <CheckCircle className="w-3 h-3 text-blue-700 shrink-0" />
          : <XCircle className="w-3 h-3 text-red-700 shrink-0" />
        }
        <span>{oldText} → {newText}{!isApproved && ' (not applied)'}</span>
        {label && <span className="text-black/60 font-normal">· {label}</span>}
      </div>
    </div>
  );
}
