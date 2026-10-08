/**
 * 6.md §2.15 / 9.md §3 - the pure discreet-copy swap
 * (services/notificationPreferences.js applyDiscreetCopy).
 *
 * Pinned here because every surface (list, read-ack, live toast) funnels
 * through this one function:
 *  - preference OFF (or an unreadable preference) -> the SAME object comes
 *    back, untouched - no copy churn on the 99% path;
 *  - preference ON -> neutral wording from the model's NEUTRAL_COPY table,
 *    `discreet: true` so the client can badge the row, everything else kept;
 *  - `critical` is NEVER redacted - a neutralised SOS preview is an SOS
 *    nobody reacts to (the same carve-out quiet hours have);
 *  - a Document is converted via toObject() first: mongoose path getters are
 *    not own properties, so spreading one would drop every field;
 *  - an unknown type falls back to the system copy, not to the raw content.
 */
import { describe, it, expect } from '@jest/globals';
import { applyDiscreetCopy, DEFAULT_PREFERENCE } from '../../src/services/notificationPreferences.js';

const ON = { ...DEFAULT_PREFERENCE, discreetMode: true };
const OFF = { ...DEFAULT_PREFERENCE, discreetMode: false };

const row = (over = {}) => ({
  _id: 'n-1',
  userId: 'pat-1',
  type: 'lab',
  title: 'HIV rapid test result: NON-REACTIVE',
  message: 'Dr. Sharma uploaded your report on 7 Oct.',
  priority: 'normal',
  read: false,
  ...over,
});

describe('applyDiscreetCopy', () => {
  it('returns the same reference when discreet mode is off', () => {
    const n = row();
    expect(applyDiscreetCopy(n, OFF)).toBe(n);
  });

  it('returns the same reference when the preference is unreadable (null)', () => {
    const n = row();
    expect(applyDiscreetCopy(n, null)).toBe(n);
    expect(applyDiscreetCopy(n, undefined)).toBe(n);
  });

  it('swaps in neutral wording and marks the row when the preference is on', () => {
    const out = applyDiscreetCopy(row(), ON);
    expect(out.title).toBe('New lab update');
    expect(out.message).toBe('A lab report update is available in FindMedi.');
    expect(out.discreet).toBe(true);
    // Everything the list needs to render the row survives the swap.
    expect(out._id).toBe('n-1');
    expect(out.type).toBe('lab');
    expect(out.read).toBe(false);
    expect(out.priority).toBe('normal');
  });

  it('never redacts a critical row, even with discreet mode on', () => {
    const n = row({ type: 'sos', priority: 'critical', title: 'SOS: Priya collapsed' });
    expect(applyDiscreetCopy(n, ON)).toBe(n);
  });

  it('falls back to the system copy for a type the table does not know', () => {
    const out = applyDiscreetCopy(row({ type: 'brand-new-type' }), ON);
    expect(out.title).toBe('FindMedi');
    expect(out.message).toBe('You have a new notification in FindMedi.');
    expect(out.discreet).toBe(true);
  });

  it('converts a Document through toObject() so no field is lost to the spread', () => {
    const doc = {
      type: 'appointment',
      priority: 'normal',
      title: 'Dr. Nair: psychiatry follow-up',
      toObject: () => ({
        _id: 'n-9',
        type: 'appointment',
        priority: 'normal',
        title: 'Dr. Nair: psychiatry follow-up',
        message: 'Tomorrow 11:00',
        read: false,
      }),
    };
    const out = applyDiscreetCopy(doc, ON);
    expect(out).toEqual({
      _id: 'n-9',
      type: 'appointment',
      priority: 'normal',
      title: 'Appointment update',
      message: 'You have an appointment update in FindMedi.',
      read: false,
      discreet: true,
    });
  });
});
