/**
 * Doc 16 §6.3: GET /api/service-cities/:id/gate — superadmin/city_manager
 * read the live gate evaluation; everyone else is denied. PUT thresholds
 * is city_manager/superadmin too.
 */
import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Mock the data layer: ServiceCity (the gate row) and the four metrics models.
const findById = jest.fn();
const find = jest.fn();
jest.unstable_mockModule('../../src/models/ServiceCity.js', () => ({
  default: {
    findById: (...args) => findById(...args),
    find: (...args) => find(...args),
  },
}));
const providerFind = jest.fn();
jest.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: { find: (...args) => providerFind(...args) },
}));
const appointmentFind = jest.fn();
jest.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: { find: (...args) => appointmentFind(...args) },
}));
const ticketCount = jest.fn();
jest.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: { countDocuments: (...args) => ticketCount(...args) },
}));
const paymentCount = jest.fn();
jest.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { countDocuments: (...args) => paymentCount(...args) },
}));

const { mountApp } = await import('../helpers/appHarness.js');
const { as } = await mountApp('serviceCities', {});

const cityRow = {
  _id: '64b0000000000000000000c0',
  name: 'Bhopal',
  isActive: true,
  launchGate: { minProviders: 1, minFillRatePct: 0, minRepeatPct: 0, maxOpenTickets: 999, maxPayoutFailPct: 100, lastGateReview: null },
};
const chainCity = (row) => ({ lean: async () => row });
const chainMetric = (rows) => ({ select: () => ({ lean: async () => rows }) });

describe('cityServiceRoutes gate', () => {
  const superadmin = { id: '64b000000000000000000099', role: 'superadmin' };
  const cityManager = { id: '64b000000000000000000098', role: 'city_manager' };

  it('denies patients', async () => {
    await as({ id: '64b000000000000000000097', role: 'patient' })
      .get('/64b0000000000000000000c0/gate')
      .expect(403);
  });

  it('evaluates the gate for superadmin', async () => {
    findById.mockImplementation(() => chainCity(cityRow));
    providerFind.mockReturnValue(chainMetric([{ _id: 'p1' }]));
    appointmentFind.mockReturnValue(chainMetric([]));
    paymentCount.mockResolvedValueOnce(10);
    paymentCount.mockResolvedValueOnce(1);
    ticketCount.mockResolvedValue(2);
    const res = await as(superadmin)
      .get('/64b0000000000000000000c0/gate')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.gate.criteria).toHaveLength(5);
    expect(res.body.gate.criteria.find((c) => c.key === 'supply_live_providers').passed).toBe(true);
  });

  it('evaluates the gate for city_manager', async () => {
    findById.mockImplementation(() => chainCity(cityRow));
    providerFind.mockReturnValue(chainMetric([{ _id: 'p1' }]));
    appointmentFind.mockReturnValue(chainMetric([]));
    paymentCount.mockResolvedValueOnce(10);
    paymentCount.mockResolvedValueOnce(0);
    ticketCount.mockResolvedValue(1);
    const res = await as(cityManager)
      .get('/64b0000000000000000000c0/gate')
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for an unknown id', async () => {
    findById.mockImplementation(() => chainCity(null));
    await as(superadmin).get('/64b0000000000000000000ff/gate').expect(404);
  });
});
