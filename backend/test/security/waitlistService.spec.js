/**
 * APPT-M-01 - waitlist / slot-cancellation backfill (service contracts).
 *
 * The product could cancel, reschedule or fail to renew an appointment and the
 * freed seat simply evaporated. The service pins the design's load-bearing
 * rules, each of which is a way the feature could silently do harm:
 *
 *   - OFFER = Pending hold appointment with checkoutExpiresAt = now + 15 min,
 *     deliberately shaped like a normal checkout hold so the EXISTING billing /
 *     transactions sweeps are the backstop and the appointment count blocks
 *     other patients for the whole window. Never a second expiry mechanism.
 *   - CAPACITY uses the same gate as the patient checkout path (live
 *     appointment count vs maxBookingsPerSlot). A seat taken between the free
 *     event and the claim must hand the entry back to the queue, not double
 *     book (the 'aborted' outcome).
 *   - CLAIM is atomic (findOneAndUpdate waiting -> offered, oldest first), so
 *     two concurrent free events can never offer the same seat twice.
 *   - LEAVE / EXPIRE only release the hold when it is still Pending, and only
 *     the releaser cascades to the next waiter - the branch table in
 *     expireDueOffers is what stops one freed seat from being offered twice
 *     (billing sweep cancels => its own onSlotFreed already ran).
 *   - ACCEPT is payment-backed: a completed Payment row against the hold is
 *     required; the actual money moves through the existing checkout
 *     (POST /api/transactions/pay with referenceId = hold).
 *   - onSlotFreed is a fire-and-forget follow-up to a cancellation: it must
 *     never add latency or throw (readyState gate, coordinate guard).
 *
 * Models are module-mocked here; route/validation/audit behaviour lives in
 * waitlist.spec.js.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ---- doubles (registered before any src import - ESM mock contract) ----

const wlStub = {
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule('../../src/models/WaitlistEntry.js', () => ({ default: wlStub }));

const apptStub = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
};
jest.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: apptStub }));

const doctorStub = { findById: jest.fn() };
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: doctorStub }));

const userStub = { findById: jest.fn() };
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: userStub }));

const paymentStub = { findOne: jest.fn() };
jest.unstable_mockModule('../../src/models/Payment.js', () => ({ default: paymentStub }));

const priceMock = jest.fn();
jest.unstable_mockModule('../../src/services/pricingService.js', () => ({
  resolveAuthoritativeAmount: priceMock,
  assertAmountMatches: jest.fn(),
}));

const notifMock = jest.fn();
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  createNotification: notifMock,
}));

const emitMock = jest.fn();
const notifyMock = jest.fn();
jest.unstable_mockModule('../../src/services/socketService.js', () => ({
  emitAppointmentUpdate: emitMock,
  notifyUser: notifyMock,
}));

const svc = await import('../../src/services/waitlistService.js');

/** mongoose-like chainable thenable: any method returns itself, await resolves. */
const q = (value) => {
  const chain = {
    select: () => chain, populate: () => chain, sort: () => chain,
    limit: () => chain, skip: () => chain, lean: () => chain, exec: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
};

const DOCTOR = {
  _id: '64b0000000000000000000d1',
  name: 'Dr Asha',
  department: 'Cardiology',
  hospitalId: '64b0000000000000000000a1',
  maxBookingsPerSlot: 1,
};
const SLOT = { doctorId: DOCTOR._id, date: '2026-10-05', time: '10:00' };
const PATIENT = { _id: '64b0000000000000000000p1', name: 'Ravi', uhid: 'UH1' };
const ENTRY = {
  _id: '64b0000000000000000000e1',
  ...SLOT,
  patientId: PATIENT._id,
  patientName: 'Ravi',
  status: 'waiting',
  offerAppointmentId: null,
  offerExpiresAt: null,
};

const feeOk = (amount = 500) => ({ ok: true, amount, source: 'doctor.consultation_fees' });
const noPrice = { ok: false, reason: 'no-price', message: 'This service has no price configured. Please contact support.' };

beforeEach(() => {
  // resetAllMocks, not clearAllMocks: implementations set by one scenario
  // (mockReturnValue/Once queues) must not leak into the next.
  jest.resetAllMocks();
  delete wlStub.db; // readyState absent => proceed (the production path)
  priceMock.mockResolvedValue(feeOk());
  notifMock.mockResolvedValue({ notification: { _id: 'n1' } });
  emitMock.mockResolvedValue(undefined);
  notifyMock.mockReturnValue(undefined);
});

describe('joinWaitlist', () => {
  const JOIN = { patientId: PATIENT._id, patientName: 'Ravi', ...SLOT };

  it('404s when the doctor does not exist', async () => {
    doctorStub.findById.mockReturnValue(q(null));
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 404, code: 'DOCTOR_NOT_FOUND' });
    expect(wlStub.create).not.toHaveBeenCalled();
  });

  it('409s when the patient already has an active entry for the slot', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q({ _id: 'e9', status: 'waiting' }));
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 409, code: 'ALREADY_WAITING' });
    expect(priceMock).not.toHaveBeenCalled();
  });

  it('422s when the doctor has no configured fee (an unpayable offer)', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q(null));
    priceMock.mockResolvedValue(noPrice);
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 422, code: 'NO_PRICE' });
  });

  it('409s when the patient already holds a seat at the slot', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q(null));
    apptStub.findOne.mockReturnValue(q({ _id: 'a1' }));
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 409, code: 'ALREADY_BOOKED' });
  });

  it('409s while the slot is still open - queueing for a free seat is a UI bug', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q(null));
    apptStub.findOne.mockReturnValue(q(null));
    apptStub.countDocuments.mockResolvedValue(0); // capacity 1
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 409, code: 'SLOT_AVAILABLE' });
    expect(wlStub.create).not.toHaveBeenCalled();
  });

  it('creates a waiting entry when the slot is genuinely full', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q(null));
    apptStub.findOne.mockReturnValue(q(null));
    apptStub.countDocuments.mockResolvedValue(1); // >= capacity
    wlStub.create.mockResolvedValue({ ...ENTRY, status: 'waiting' });

    const entry = await svc.joinWaitlist(JOIN);
    expect(entry.status).toBe('waiting');
    expect(wlStub.create).toHaveBeenCalledWith(expect.objectContaining({
      patientId: PATIENT._id, doctorId: DOCTOR._id, date: SLOT.date, time: SLOT.time, status: 'waiting',
    }));
  });

  it('maps a duplicate-key race to 409 ALREADY_WAITING', async () => {
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    wlStub.findOne.mockReturnValue(q(null));
    apptStub.findOne.mockReturnValue(q(null));
    apptStub.countDocuments.mockResolvedValue(1);
    const dup = new Error('E11000');
    dup.code = 11000;
    wlStub.create.mockRejectedValue(dup);
    await expect(svc.joinWaitlist(JOIN)).rejects.toMatchObject({ status: 409, code: 'ALREADY_WAITING' });
  });
});

describe('onSlotFreed', () => {
  it('is a no-op without slot coordinates', async () => {
    expect(await svc.onSlotFreed({})).toBeNull();
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('skips without a live connection instead of buffering 10s into a cancel request', async () => {
    wlStub.db = { readyState: 0 };
    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('claims the oldest waiting entry and materialises a 15-minute Pending hold', async () => {
    const offered = { ...ENTRY, status: 'offered', offerExpiresAt: new Date(Date.now() + 15 * 60 * 1000) };
    const hold = { _id: 'h1', status: 'Pending', ...SLOT };
    const claimed = { ...offered, offerAppointmentId: 'h1', offerFee: 500 };

    wlStub.findOneAndUpdate
      .mockReturnValueOnce(q(offered)) // claim
      .mockReturnValueOnce(q(claimed)); // re-verify after hold write
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.findOne.mockReturnValue(q(null)); // patient does not already hold a seat
    apptStub.countDocuments.mockResolvedValue(0); // seat is free (capacity 1)
    userStub.findById.mockReturnValue(q(PATIENT));
    apptStub.create.mockResolvedValue(hold);

    const res = await svc.onSlotFreed(SLOT);
    expect(res).toBe(offered);

    // atomic claim: waiting -> offered, oldest first
    const [claimFilter, claimUpdate, claimOpts] = wlStub.findOneAndUpdate.mock.calls[0];
    expect(claimFilter).toMatchObject({ ...SLOT, status: 'waiting' });
    expect(claimOpts).toMatchObject({ sort: { createdAt: 1 }, new: true });
    expect(claimUpdate.$set.status).toBe('offered');
    const ttl = new Date(claimUpdate.$set.offerExpiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000);

    expect(apptStub.create).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Pending',
      fees: 500,
      patientId: PATIENT._id,
      doctorId: DOCTOR._id,
      date: SLOT.date,
      time: SLOT.time,
      checkoutExpiresAt: expect.any(Date),
    }));
    expect(notifMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: PATIENT._id,
      type: 'appointment',
      priority: 'critical', // quiet hours must never eat a 15-minute deadline
      dedupKey: `waitlist-offer:${offered._id}`,
    }));
    expect(notifyMock).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith(hold);
  });

  it('hands the entry back to the queue when the seat was refilled before the claim', async () => {
    wlStub.findOneAndUpdate.mockReturnValueOnce(q({ ...ENTRY, status: 'offered' }));
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.findOne.mockReturnValue(q(null));
    apptStub.countDocuments.mockResolvedValue(1); // someone else got it
    apptStub.create.mockResolvedValue({ _id: 'never' });

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(apptStub.create).not.toHaveBeenCalled();
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offered', offerAppointmentId: null }),
      expect.objectContaining({ $set: { status: 'waiting' } })
    );
  });

  it('terminates an unofferable entry (no fee) and tries the next waiter', async () => {
    wlStub.findOneAndUpdate
      .mockReturnValueOnce(q({ ...ENTRY, status: 'offered' }))
      .mockReturnValueOnce(q(null)); // no further waiters
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    priceMock.mockResolvedValue(noPrice);

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: ['waiting', 'offered'] } }),
      expect.objectContaining({ $set: { status: 'expired', note: 'no price configured' } })
    );
    expect(apptStub.create).not.toHaveBeenCalled();
  });

  it('terminates an entry whose patient already holds the slot', async () => {
    wlStub.findOneAndUpdate
      .mockReturnValueOnce(q({ ...ENTRY, status: 'offered' }))
      .mockReturnValueOnce(q(null));
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.findOne.mockReturnValue(q({ _id: 'a1' }));

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ $set: { status: 'expired', note: 'patient already holds this slot' } })
    );
  });

  it('releases the hold when the patient left while it was being written', async () => {
    wlStub.findOneAndUpdate
      .mockReturnValueOnce(q({ ...ENTRY, status: 'offered' }))
      .mockReturnValueOnce(q(null)); // re-verify: claim is gone
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    apptStub.findOne.mockReturnValue(q(null));
    apptStub.countDocuments.mockResolvedValue(0);
    userStub.findById.mockReturnValue(q(PATIENT));
    apptStub.create.mockResolvedValue({ _id: 'h2', status: 'Pending' });

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(apptStub.updateOne).toHaveBeenCalledWith(
      { _id: 'h2', status: 'Pending' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'Cancelled', cancellationReason: 'waitlist_offer_withdrawn' }) })
    );
  });

  it('releases the claim when the hold write fails, so the next free event retries', async () => {
    wlStub.findOneAndUpdate
      .mockReturnValueOnce(q({ ...ENTRY, status: 'offered' }));
    // Chain-shaped rejection: the service calls findById().select().lean(), and
    // mockRejectedValue would return a bare Promise whose .select access throws
    // synchronously, orphaning an unhandled rejection.
    doctorStub.findById.mockImplementation(() => ({
      select: () => ({ lean: () => Promise.reject(new Error('mongo down')) }),
    }));

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offered', offerAppointmentId: null }),
      expect.objectContaining({ $set: { status: 'waiting' } })
    );
  });

  it('stops after a run of unofferable entries instead of looping forever', async () => {
    const claimed = { ...ENTRY, _id: '64b0000000000000000000e2', status: 'offered' };
    wlStub.findOneAndUpdate.mockReturnValue(q(claimed)); // always claims
    doctorStub.findById.mockReturnValue(q(DOCTOR));
    priceMock.mockResolvedValue(noPrice); // always terminates
    apptStub.create.mockResolvedValue({ _id: 'never' });

    expect(await svc.onSlotFreed(SLOT)).toBeNull();
    expect(wlStub.findOneAndUpdate).toHaveBeenCalledTimes(5); // bounded, not infinite
  });
});

describe('expireDueOffers', () => {
  const dueEntry = () => ({
    ...ENTRY,
    status: 'offered',
    offerAppointmentId: 'h1',
    offerExpiresAt: new Date(Date.now() - 1000),
  });

  it('marks a paid/confirmed hold as accepted and does NOT cascade (seat consumed)', async () => {
    wlStub.find.mockReturnValue(q([dueEntry()]));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Confirmed' }));
    paymentStub.findOne.mockReturnValue(q({ _id: 'p1' }));

    expect(await svc.expireDueOffers()).toBe(0);
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offered' }),
      { $set: { status: 'accepted' } }
    );
    expect(apptStub.updateOne).not.toHaveBeenCalled();
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled(); // no cascade claim
  });

  it('cancels an unpaid Pending hold, expires the entry, notifies and cascades', async () => {
    const entry = dueEntry();
    wlStub.find.mockReturnValue(q([entry]));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Pending' }));
    paymentStub.findOne.mockReturnValue(q(null));
    apptStub.updateOne.mockResolvedValue({ modifiedCount: 1 });
    wlStub.findOneAndUpdate.mockReturnValue(q(null)); // cascade finds nobody

    expect(await svc.expireDueOffers()).toBe(1);
    expect(apptStub.updateOne).toHaveBeenCalledWith(
      { _id: 'h1', status: 'Pending' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'Cancelled', cancellationReason: 'waitlist_offer_expired' }) })
    );
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: entry._id }),
      expect.objectContaining({ $set: { status: 'expired', note: 'offer expired' } })
    );
    expect(notifMock).toHaveBeenCalledWith(expect.objectContaining({
      dedupKey: expect.stringContaining('waitlist-end:'),
    }));
    expect(wlStub.findOneAndUpdate).toHaveBeenCalled(); // cascade to next waiter
  });

  it('does NOT cascade when another canceller already released the hold (double-offer guard)', async () => {
    wlStub.find.mockReturnValue(q([dueEntry()]));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Cancelled' }));
    paymentStub.findOne.mockReturnValue(q(null));

    expect(await svc.expireDueOffers()).toBe(1);
    expect(apptStub.updateOne).not.toHaveBeenCalled();
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled(); // their onSlotFreed already ran
  });

  it('does NOT cascade when the hold was swept away (deleted) by the checkout sweep', async () => {
    wlStub.find.mockReturnValue(q([dueEntry()]));
    apptStub.findById.mockReturnValue(q(null));
    paymentStub.findOne.mockResolvedValue(null);

    expect(await svc.expireDueOffers()).toBe(1);
    expect(wlStub.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ $set: { status: 'expired', note: 'offer expired' } })
    );
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('treats a completed payment against a still-Pending hold as accepted', async () => {
    wlStub.find.mockReturnValue(q([dueEntry()]));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Pending' }));
    paymentStub.findOne.mockReturnValue(q({ _id: 'p1', amount: 500 }));

    expect(await svc.expireDueOffers()).toBe(0);
    expect(wlStub.updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { status: 'accepted' } });
    expect(apptStub.updateOne).not.toHaveBeenCalled();
  });
});

describe('acceptOffer', () => {
  const USER = { _id: PATIENT._id };
  const liveOffer = () => ({
    ...ENTRY,
    status: 'offered',
    offerAppointmentId: 'h1',
    offerExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  it('404s for another patient\'s entry (self-scope, no 403 oracle)', async () => {
    wlStub.findOne.mockReturnValue(q(null));
    await expect(svc.acceptOffer('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 404, code: 'ENTRY_NOT_FOUND' });
  });

  it('is idempotent when the offer was already accepted', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'accepted', offerAppointmentId: 'h1' }));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Confirmed' }));

    const res = await svc.acceptOffer('64b0000000000000000000e1', USER);
    expect(res.alreadyAccepted).toBe(true);
    expect(paymentStub.findOne).not.toHaveBeenCalled();
  });

  it('409s when there is no live offer (waiting / cancelled / declined)', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'waiting' }));
    await expect(svc.acceptOffer('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 409, code: 'NO_ACTIVE_OFFER' });
  });

  it('410s on a late arrival (expired window settles the sweep first)', async () => {
    wlStub.findOne.mockReturnValue(q({ ...liveOffer(), offerExpiresAt: new Date(Date.now() - 1000) }));
    wlStub.find.mockReturnValue(q([])); // sweep has nothing further to do here

    await expect(svc.acceptOffer('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 410, code: 'OFFER_EXPIRED' });
  });

  it('409s when the hold was released (cancelled) underneath the patient', async () => {
    wlStub.findOne.mockReturnValue(q(liveOffer()));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Cancelled' }));
    await expect(svc.acceptOffer('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 410, code: 'OFFER_RELEASED' });
  });

  it('409s without a completed payment - accept never bypasses checkout', async () => {
    wlStub.findOne.mockReturnValue(q(liveOffer()));
    apptStub.findById.mockReturnValue(q({ _id: 'h1', status: 'Pending' }));
    paymentStub.findOne.mockReturnValue(q(null));
    await expect(svc.acceptOffer('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 409, code: 'PAYMENT_REQUIRED' });
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('flips the entry to accepted once the payment is there', async () => {
    const hold = { _id: 'h1', status: 'Confirmed', ...SLOT };
    wlStub.findOne.mockReturnValue(q(liveOffer()));
    apptStub.findById.mockReturnValue(q(hold));
    paymentStub.findOne.mockReturnValue(q({ _id: 'p1', amount: 500 }));
    wlStub.findOneAndUpdate.mockReturnValue(q({ ...liveOffer(), status: 'accepted' }));

    const res = await svc.acceptOffer('64b0000000000000000000e1', USER);
    expect(res.alreadyAccepted).toBe(false);
    expect(res.appointment).toBe(hold);
    expect(wlStub.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offered' }),
      { $set: { status: 'accepted' } },
      { new: true }
    );
  });
});

describe('sendWaitlistError', () => {
  const fakeRes = () => {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    return res;
  };

  it('passes a service status/code straight through', () => {
    const res = fakeRes();
    const err = Object.assign(new Error('slot taken'), { status: 409, code: 'SLOT_AVAILABLE' });
    svc.sendWaitlistError(res, err);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'slot taken', code: 'SLOT_AVAILABLE' });
  });

  it('hides internals behind a generic 500 (mongo driver messages must not leak)', () => {
    const res = fakeRes();
    svc.sendWaitlistError(res, new Error('E11000 duplicate key: mongodb://internal-host'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Request failed' });
  });
});

describe('leaveEntry', () => {
  const USER = { _id: PATIENT._id };

  it('404s for another patient\'s entry', async () => {
    wlStub.findOne.mockReturnValue(q(null));
    await expect(svc.leaveEntry('64b0000000000000000000e1', USER))
      .rejects.toMatchObject({ status: 404, code: 'ENTRY_NOT_FOUND' });
  });

  it('is a no-op on terminal entries (accepted / expired / declined)', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'accepted' }));
    const res = await svc.leaveEntry('64b0000000000000000000e1', USER);
    expect(res.released).toBe(false);
    expect(wlStub.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('cancels a waiting entry without touching any hold', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'waiting' }));
    wlStub.findOneAndUpdate.mockReturnValue(q({ ...ENTRY, status: 'cancelled' }));

    const res = await svc.leaveEntry('64b0000000000000000000e1', USER);
    expect(res.entry.status).toBe('cancelled');
    expect(apptStub.updateOne).not.toHaveBeenCalled();
    expect(wlStub.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: ['waiting', 'offered'] } }),
      { $set: { status: 'cancelled', note: 'left by patient' } },
      { new: true }
    );
  });

  it('declining a live offer releases the Pending hold AND cascades to the next waiter', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'offered', offerAppointmentId: 'h1' }));
    // call 1 = leave flip, call 2 = the cascade claim (nobody waiting)
    wlStub.findOneAndUpdate = jest.fn()
      .mockReturnValueOnce(q({ ...ENTRY, status: 'cancelled' }))
      .mockReturnValueOnce(q(null));
    apptStub.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await svc.leaveEntry('64b0000000000000000000e1', USER);
    expect(res.released).toBe(true);
    expect(apptStub.updateOne).toHaveBeenCalledWith(
      { _id: 'h1', status: 'Pending' },
      expect.objectContaining({ $set: expect.objectContaining({ cancellationReason: 'waitlist_offer_declined' }) })
    );
    expect(wlStub.findOneAndUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'waiting' }),
      expect.anything(),
      expect.anything()
    );
  });

  it('does NOT release or cascade when the hold was already paid/confirmed', async () => {
    wlStub.findOne.mockReturnValue(q({ ...ENTRY, status: 'offered', offerAppointmentId: 'h1' }));
    wlStub.findOneAndUpdate.mockReturnValue(q({ ...ENTRY, status: 'cancelled' }));
    apptStub.updateOne.mockResolvedValue({ modifiedCount: 0 }); // not Pending => already theirs

    const res = await svc.leaveEntry('64b0000000000000000000e1', USER);
    expect(res.released).toBe(false);
    expect(wlStub.findOneAndUpdate).toHaveBeenCalledTimes(1); // no cascade claim
  });
});
