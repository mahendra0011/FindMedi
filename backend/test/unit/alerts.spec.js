/**
 * File 22 P0-10: alert doorway (persist + socket, never one without the
 * other) and escalation ladder. Models + socket mocked.
 */
import { jest } from '@jest/globals';

const dashboardCreate = jest.fn();
const dashboardFind = jest.fn();
const ruleFindOne = jest.fn();
const firingCreate = jest.fn();
const emitDashboardAlert = jest.fn();
const userFind = jest.fn();
const createNotification = jest.fn();

jest.unstable_mockModule('../../src/models/DashboardAlert.js', () => ({
  default: { create: (...a) => dashboardCreate(...a), find: (...a) => dashboardFind(...a) },
}));
jest.unstable_mockModule('../../src/models/Rule.js', () => ({
  default: { findOne: (...a) => ruleFindOne(...a) },
}));
jest.unstable_mockModule('../../src/models/RuleFiring.js', () => ({
  default: { create: (...a) => firingCreate(...a) },
}));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({
  emitDashboardAlert: (...a) => emitDashboardAlert(...a),
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { find: (...a) => userFind(...a) },
}));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  createNotification: (...a) => createNotification(...a),
}));

const { raiseAlert, escalateAlertsTenant } = await import('../../src/lib/alerts.js');

describe('raiseAlert', () => {
  test('persists AND pushes the socket event', async () => {
    dashboardCreate.mockReset().mockResolvedValue({ _id: 'al1' });
    emitDashboardAlert.mockReset().mockReturnValue(true);
    ruleFindOne.mockReset().mockResolvedValue(null);
    const row = await raiseAlert({ hospitalId: 'h1', severity: 'critical', message: 'CODE BLUE', ruleKey: '' });
    expect(row._id).toBe('al1');
    expect(dashboardCreate.mock.calls[0][0]).toMatchObject({ severity: 'critical', status: 'open' });
    expect(emitDashboardAlert).toHaveBeenCalledWith('h1', expect.objectContaining({ severity: 'critical' }));
  });

  test('socket failure still persists the alert', async () => {
    dashboardCreate.mockReset().mockResolvedValue({ _id: 'al2' });
    emitDashboardAlert.mockReset().mockImplementation(() => { throw new Error('socket down'); });
    const row = await raiseAlert({ hospitalId: 'h1', message: 'x' });
    expect(row._id).toBe('al2');
  });

  test('a clinical alert code is persisted AND pushed so it can be acknowledged', async () => {
    dashboardCreate.mockReset().mockResolvedValue({ _id: 'al3' });
    emitDashboardAlert.mockReset().mockReturnValue(true);
    ruleFindOne.mockReset().mockResolvedValue(null);
    await raiseAlert({ hospitalId: 'h1', severity: 'critical', message: 'CODE BLUE', ruleKey: '', code: 'CB-1ABC2' });
    expect(dashboardCreate.mock.calls[0][0]).toMatchObject({ code: 'CB-1ABC2', status: 'open' });
    expect(emitDashboardAlert).toHaveBeenCalledWith('h1', expect.objectContaining({ code: 'CB-1ABC2' }));
  });

  test('alerts raised without a code store an empty code, not undefined', async () => {
    dashboardCreate.mockReset().mockResolvedValue({ _id: 'al4' });
    emitDashboardAlert.mockReset().mockReturnValue(true);
    ruleFindOne.mockReset().mockResolvedValue(null);
    await raiseAlert({ hospitalId: 'h1', message: 'y' });
    expect(dashboardCreate.mock.calls[0][0]).toMatchObject({ code: '' });
  });
});

describe('escalateAlertsTenant', () => {
  const findRows = (rows) => dashboardFind.mockReset().mockReturnValue({ limit: () => Promise.resolve(rows) });

  beforeEach(() => {
    userFind.mockReset().mockReturnValue({ lean: async () => [{ _id: 'u1' }] });
    createNotification.mockReset().mockResolvedValue({ notification: { _id: 'n1' } });
  });

  test('levels up stale criticals and re-pushes', async () => {
    const row = {
      _id: 'al9', message: 'LAB PANIC', entityRef: {}, escalationLevel: 0,
      save: async function save() { return this; },
    };
    findRows([row]);
    emitDashboardAlert.mockReset().mockReturnValue(true);
    const out = await escalateAlertsTenant('h1', 15);
    expect(out.escalated).toBe(1);
    expect(out.notified).toBe(1);
    expect(row.escalationLevel).toBe(1);
    expect(row.escalatedAt).not.toBeNull();
    expect(emitDashboardAlert).toHaveBeenCalledWith('h1', expect.objectContaining({ message: expect.stringMatching(/ESCALATED/) }));
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      priority: 'critical',
      dedupKey: 'alert-escalation:al9:1',
    }));
    expect(userFind).toHaveBeenCalledWith(
      { hospitalId: 'h1', role: { $in: ['hospital_admin', 'superadmin'] } },
      { _id: 1 },
    );
  });

  test('nothing stale means nothing escalated', async () => {
    findRows([]);
    const out = await escalateAlertsTenant('h1', 15);
    expect(out.escalated).toBe(0);
    expect(out.notified).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });
});
