import { jest } from '@jest/globals';

const mocks = {
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  findOne: jest.fn(),
};

jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: mocks }));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({ default: mocks }));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({ default: mocks }));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: mocks }));

const { claimProvider, releaseProviderClaim, handleInstantAccept } = await import('../../src/services/instantDispatchService.js');

describe('durable instant dispatch provider claims', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['rider', 'lawyer', 'assistant'])('atomically claims and releases a %s by user id', async (type) => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({ _id: 'profile-1' });
    mocks.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

    await expect(claimProvider(type, 'user-1', 'request-1')).resolves.toBe(true);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-1', activeDispatchRequestId: null },
      { $set: { activeDispatchRequestId: 'request-1' } },
      { new: true, select: '_id' },
    );
    await expect(releaseProviderClaim(type, 'user-1', 'request-1')).resolves.toBe(true);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { userId: 'user-1', activeDispatchRequestId: 'request-1' },
      { $set: { activeDispatchRequestId: null } },
    );
  });

  it('allows only one of two concurrent dispatch requests to claim the same provider', async () => {
    // Mongo's conditional findOneAndUpdate is the arbitration point. A second
    // request sees the first request's activeDispatchRequestId and gets null.
    mocks.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'profile-1' })
      .mockResolvedValueOnce(null);

    const outcomes = await Promise.all([
      claimProvider('ride', 'user-1', 'request-a'),
      claimProvider('ride', 'user-1', 'request-b'),
    ]);

    expect(outcomes.sort()).toEqual([false, true]);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1', activeDispatchRequestId: null },
      { $set: { activeDispatchRequestId: 'request-a' } },
      { new: true, select: '_id' },
    );
    expect(mocks.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1', activeDispatchRequestId: null },
      { $set: { activeDispatchRequestId: 'request-b' } },
      { new: true, select: '_id' },
    );
  });

  it('claims emergency doctors by linked user id or doctor profile id', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({ _id: 'doctor-profile' });
    await expect(claimProvider('emergency_doctor', 'doctor-user', 'request-1')).resolves.toBe(true);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: 'doctor-user', activeDispatchRequestId: null },
      { $set: { activeDispatchRequestId: 'request-1' } },
      { new: true, select: '_id' },
    );
  });

  it('refuses to vote from a provider with another active assignment', async () => {
    mocks.findOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });
    const result = await handleInstantAccept('request-1', 'user-1', { _id: 'user-1' }, {
      type: 'ride',
      Model: { findById: () => ({ select: async () => ({ status: 'searching', notified: [] }) }) },
    });
    expect(result).toEqual({ success: false, status: 'provider_busy' });
  });

  it('persists the road ETA from the current wave with the acceptance', async () => {
    mocks.findOne.mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: 'profile-1' }) }) });
    const request = {
      status: 'searching',
      notified: [{ providerId: 'user-1', userId: 'user-1', profileId: 'profile-1', roadEtaSeconds: 42 }],
      location: { coordinates: [72, 19] },
    };
    const Model = {
      findById: () => ({ select: async () => request }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const result = await handleInstantAccept('request-1', 'user-1', {
      _id: 'user-1', currentLocation: { coordinates: [72.01, 19.01] },
    }, { type: 'ride', Model });

    expect(result).toMatchObject({ success: true, status: 'accepted_pending' });
    expect(Model.updateOne.mock.calls[0][1].$push.acceptances).toMatchObject({
      providerId: 'user-1', profileId: 'profile-1', roadEtaSeconds: 42,
    });
  });

  it('keeps emergency-doctor profile identity on acceptance for assignedDoctorId', async () => {
    mocks.findOne.mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: 'doctor-profile-1' }) }) });
    const Model = {
      findById: () => ({ select: async () => ({
        status: 'searching',
        notified: [{ providerId: 'doctor-user-1', userId: 'doctor-user-1', profileId: 'doctor-profile-1', roadEtaSeconds: 30 }],
        location: { coordinates: [72, 19] },
      }) }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const result = await handleInstantAccept('request-doctor', 'doctor-user-1', {
      _id: 'doctor-user-1', currentLocation: { coordinates: [72.01, 19.01] },
    }, { type: 'emergency_doctor', Model });

    expect(result).toMatchObject({ success: true, status: 'accepted_pending' });
    expect(Model.updateOne.mock.calls[0][1].$push.acceptances).toMatchObject({
      providerId: 'doctor-user-1', profileId: 'doctor-profile-1', roadEtaSeconds: 30,
    });
  });
});
