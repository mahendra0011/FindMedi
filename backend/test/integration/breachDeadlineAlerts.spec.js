import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { query } from '../helpers/appHarness.js';

const breach = {
  _id: '660000000000000000000011', createdBy: '660000000000000000000012',
  title: 'Incident', deadlineAt: new Date(Date.now() + 60 * 60_000),
  status: 'Assessing', alertAttempts: 0, alertSentAt: null,
};
const auditLogRequired = jest.fn().mockResolvedValue(undefined);
const auditLog = jest.fn().mockResolvedValue(undefined);
const sendEmail = jest.fn().mockResolvedValue({ success: true });
const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const findOneAndUpdate = jest.fn().mockResolvedValue(breach);
const find = jest.fn(() => query([breach]));
const userFind = jest.fn(() => query([
  { _id: '660000000000000000000013', email: 'dpo@example.test' },
]));

jest.unstable_mockModule('../../src/models/Breach.js', () => ({ default: { find, findOneAndUpdate, updateOne } }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: { find: userFind } }));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
 auditLogRequired, auditLog,
}));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({ sendEmail }));

const { breachDeadlineSweep } = await import('../../src/routes/breach.js');

beforeEach(() => {
  auditLogRequired.mockClear().mockResolvedValue(undefined);
  sendEmail.mockClear().mockResolvedValue({ success: true });
  updateOne.mockClear();
  findOneAndUpdate.mockClear().mockResolvedValue(breach);
});

describe('breach deadline alert escalation', () => {
  it('emails active privacy/security recipients and records a required audit trail', async () => {
    const result = await breachDeadlineSweep();
    expect(result).toEqual({ atRisk: 1, alertsSent: 1 });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'dpo@example.test', subject: expect.stringContaining('deadline'),
    }));
    expect(auditLogRequired).toHaveBeenCalledWith('breach_deadline_alert_sent', breach.createdBy, expect.any(Object));
    expect(updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: breach._id }), expect.objectContaining({ $set: expect.objectContaining({ alertSentAt: expect.any(Date) }) }));
  });

  it('records failed delivery and schedules a bounded retry', async () => {
    sendEmail.mockResolvedValue({ success: false, error: 'provider unavailable' });
    await breachDeadlineSweep();
    expect(updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: breach._id, alertSentAt: null }), expect.objectContaining({ $set: expect.objectContaining({
      alertAttempts: 1, alertNextAt: expect.any(Date), alertLeaseUntil: null,
    }) }));
  });
});
