/**
 * Doc 16 §6.3: city launch gate. Mocks the four models; the gate's job is to
 * be honest about totals and give a single pass/fail verdict per criterion.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const providerFind = jest.fn();
const appointmentFind = jest.fn();
const ticketCount = jest.fn();
const paymentCount = jest.fn();

jest.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: { find: providerFind },
}));
jest.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: { find: appointmentFind },
}));
jest.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: { countDocuments: ticketCount },
}));
jest.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { countDocuments: paymentCount },
}));

const { evaluateCityLaunchGate } = await import('../../src/lib/cityLaunchGate.js');

const chain = (rows) => ({
  select: () => ({ lean: async () => rows }),
});

// Fixture: 60 confirmed appointments, 20 distinct providers, 15 patients who
// each book twice. Repeat rate = 15/15 = 100% (every patient repeated),
// utilization = 20/20 = 100%.
const fixture60 = [...Array(60)].map((_, i) => ({
  doctorId: `dx${i % 20}`,
  patientId: `pt${i % 15}`,
}));

beforeEach(() => {
  providerFind.mockReset();
  appointmentFind.mockReset();
  ticketCount.mockReset();
  paymentCount.mockReset();
  ticketCount.mockResolvedValue(3);
  paymentCount.mockResolvedValue(0); // payments in 30d, overridden where needed
  appointmentFind.mockReturnValue(chain(fixture60));
});

const cityDoc = (over = {}) => ({
  name: 'Bhopal',
  launchGate: { minProviders: 15, minFillRatePct: 60, minRepeatPct: 20, maxOpenTickets: 10, maxPayoutFailPct: 1 },
  ...over,
});

describe('evaluateCityLaunchGate', () => {
  it('passes when every criterion meets its threshold', async () => {
    providerFind.mockReturnValue(chain([...Array(20)].map((_, i) => ({ _id: `p${i}` }))));
    paymentCount.mockResolvedValueOnce(100); // payments 30d
    paymentCount.mockResolvedValueOnce(1);   // failed 30d -> 1.0%
    const out = await evaluateCityLaunchGate(cityDoc());
    expect(out.ready).toBe(true);
    expect(out.criteria.map((c) => c.passed)).toEqual([true, true, true, true, true]);
    expect(out.metrics.supply.count).toBe(20);
    expect(out.metrics.utilization.pct).toBe(100);
    expect(out.metrics.repeat.pct).toBe(100);
  });

  it('fails supply when the city has fewer live providers than the threshold', async () => {
    providerFind.mockReturnValue(chain([{ _id: 'p1' }, { _id: 'p2' }, { _id: 'p3' }]));
    appointmentFind.mockReturnValue(chain([]));
    const out = await evaluateCityLaunchGate(cityDoc());
    expect(out.ready).toBe(false);
    const supply = out.criteria.find((c) => c.key === 'supply_live_providers');
    expect(supply.passed).toBe(false);
    expect(supply.actual).toBe(3);
  });

  it('fails support load when tickets exceed the ceiling', async () => {
    providerFind.mockReturnValue(chain([...Array(20)].map((_, i) => ({ _id: `p${i}` }))));
    ticketCount.mockResolvedValue(50);
    const out = await evaluateCityLaunchGate(cityDoc());
    expect(out.criteria.find((c) => c.key === 'open_tickets').passed).toBe(false);
  });

  it('fails payout reliability when failed payment share exceeds the ceiling', async () => {
    providerFind.mockReturnValue(chain([...Array(20)].map((_, i) => ({ _id: `p${i}` }))));
    paymentCount.mockResolvedValueOnce(100); // payments 30d
    paymentCount.mockResolvedValueOnce(5);   // failed 30d -> 5%
    const out = await evaluateCityLaunchGate(cityDoc());
    expect(out.criteria.find((c) => c.key === 'payout_fail_pct').passed).toBe(false);
  });

  it('applies custom thresholds from ServiceCity.launchGate', async () => {
    providerFind.mockReturnValue(chain([{ _id: 'p1' }, { _id: 'p2' }, { _id: 'p3' }, { _id: 'p4' }]));
    appointmentFind.mockReturnValue(chain([]));
    const out = await evaluateCityLaunchGate(cityDoc({ launchGate: { minProviders: 2, minFillRatePct: 0, minRepeatPct: 0, maxOpenTickets: 99 } }));
    expect(out.criteria.find((c) => c.key === 'supply_live_providers').passed).toBe(true);
  });

  it('exposes the metrics and five criterion keys in a stable shape', async () => {
    providerFind.mockReturnValue(chain([]));
    appointmentFind.mockReturnValue(chain([]));
    const out = await evaluateCityLaunchGate(cityDoc());
    expect(out.criteria.map((c) => c.key)).toEqual(['supply_live_providers', 'provider_utilization_pct', 'patient_repeat_pct', 'open_tickets', 'payout_fail_pct']);
    expect(out.metrics.supply.count).toBe(0);
    expect(out.evaluatedAt).toBeDefined();
  });
});
