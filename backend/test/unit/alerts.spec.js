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
});

describe('escalateAlertsTenant', () => {
  const findRows = (rows) => dashboardFind.mockReset().mockReturnValue({ limit: () => Promise.resolve(rows) });

  test('levels up stale criticals and re-pushes', async () => {
    const row = {
      _id: 'al9', message: 'LAB PANIC', entityRef: {}, escalationLevel: 0,
      save: async function save() { return this; },
    };
    findRows([row]);
    emitDashboardAlert.mockReset().mockReturnValue(true);
    const out = await escalateAlertsTenant('h1', 15);
    expect(out.escalated).toBe(1);
    expect(row.escalationLevel).toBe(1);
    expect(row.escalatedAt).not.toBeNull();
    expect(emitDashboardAlert).toHaveBeenCalledWith('h1', expect.objectContaining({ message: expect.stringMatching(/ESCALATED/) }));
  });

  test('nothing stale means nothing escalated', async () => {
    findRows([]);
    const out = await escalateAlertsTenant('h1', 15);
    expect(out.escalated).toBe(0);
  });
});
