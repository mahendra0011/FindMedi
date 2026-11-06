import { jest as jestApi, describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const ticket = {
  _id: '650000000000000000000001', ticketId: 'TKT-12345678',
  raisedBy: { _id: 'patient-1', name: 'Priya Patient', email: 'priya@example.com' },
  raisedByName: 'Priya Patient', subject: 'Please help with my diagnosis',
  description: 'My report says a sensitive diagnosis and medication.',
  category: 'Records/Privacy', priority: 'High', status: 'Open',
  assignedTo: 'support-1', assignedToName: 'Support Agent',
  messages: [{ senderName: 'Priya Patient', message: 'Sensitive clinical details in the message' }],
};
const audit = jestApi.fn().mockResolvedValue(undefined);
const assistFind = jestApi.fn(() => query(null));
const findTickets = jestApi.fn(() => query([ticket]));

jestApi.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: {
    find: (...args) => findTickets(...args),
    findById: () => query(ticket),
    countDocuments: jestApi.fn().mockResolvedValue(1),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLogRequired: (...args) => audit(...args),
}));
jestApi.unstable_mockModule('../../src/models/SupportAssistSession.js', () => ({
  default: { findOne: (...args) => assistFind(...args), updateMany: jestApi.fn().mockResolvedValue({ modifiedCount: 0 }) },
}));

const { as } = await mountApp('supportTickets', {}, { enforceAuthorize: true });
const operator = { _id: 'support-1', id: 'support-1', role: 'support_l1' };

describe('support ticket privacy', () => {
  it('returns only masked ticket summaries to a support operator', async () => {
    const res = await as(operator).get('/');
    expect(res.status).toBe(200);
    const row = res.body.tickets[0];
    expect(row.ticketId).toBe('TKT-12345678');
    expect(row.raisedByName).toBe('Customer');
    expect(row.subject).toBe('Support request');
    expect(row.description).not.toContain('diagnosis');
    expect(row.messages).toEqual([]);
    expect(JSON.stringify(row)).not.toContain('priya@example.com');
    expect(JSON.stringify(row)).not.toContain('Sensitive clinical details');
    expect(audit).toHaveBeenCalledWith('support_ticket_queue_viewed', 'support-1', expect.any(Object));
  });

  it('requires a ticket to be assigned before L1 opens its case view', async () => {
    ticket.assignedTo = 'another-operator';
    const res = await as(operator).get(`/${ticket._id}`);
    expect(res.status).toBe(403);
  });

  it('does not show ticket details to L2 until a live patient assist consent exists', async () => {
    ticket.assignedTo = 'support-1';
    assistFind.mockReturnValue(query(null));
    const res = await as({ ...operator, role: 'support_l2' }).get(`/${ticket._id}`);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('diagnosis');
  });

  it('does not allow platform Owner to open full ticket details', async () => {
    ticket.assignedTo = 'support-1';
    const res = await as({ _id: 'owner-1', role: 'superadmin' }).get(`/${ticket._id}`);
    expect(res.status).toBe(403);
  });

  it('limits platform queue searches and results to assigned cases', async () => {
    ticket.assignedTo = 'support-1';
    await as(operator).get('/?search=diagnosis');
    const filter = findTickets.mock.calls.at(-1)?.[0];
    expect(filter).toEqual(expect.objectContaining({ assignedTo: 'support-1', ticketId: expect.any(RegExp) }));
    expect(filter.$or).toBeUndefined();
  });
});
