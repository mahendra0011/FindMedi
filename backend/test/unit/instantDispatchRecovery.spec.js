import { jest } from '@jest/globals';

const ride = { find: jest.fn(), findOneAndUpdate: jest.fn() };
const lawyer = { find: jest.fn(), findOneAndUpdate: jest.fn() };
const assistant = { find: jest.fn(), findOneAndUpdate: jest.fn() };
const emergency = { find: jest.fn(), findOneAndUpdate: jest.fn() };
const dispatch = {
  ride: jest.fn(),
  lawyer: jest.fn(),
  assistant: jest.fn(),
  emergency: jest.fn(),
};

const query = (rows) => ({ select: () => ({ limit: () => ({ lean: async () => rows }) }) });

jest.unstable_mockModule('../../src/models/RideBooking.js', () => ({ default: ride }));
jest.unstable_mockModule('../../src/models/LawyerBooking.js', () => ({ default: lawyer }));
jest.unstable_mockModule('../../src/models/AssistantBooking.js', () => ({ default: assistant }));
jest.unstable_mockModule('../../src/models/EmergencyDoctorRequest.js', () => ({ default: emergency }));
jest.unstable_mockModule('../../src/services/rideService.js', () => ({ dispatchSequentially: dispatch.ride }));
jest.unstable_mockModule('../../src/services/rideDispatchService.js', () => ({ startRideDispatch: dispatch.ride }));
jest.unstable_mockModule('../../src/services/lawyerDispatchService.js', () => ({ startLawyerDispatch: dispatch.lawyer }));
jest.unstable_mockModule('../../src/services/assistantDispatchService.js', () => ({ startAssistantDispatch: dispatch.assistant }));
jest.unstable_mockModule('../../src/services/emergencyDoctorDispatchService.js', () => ({ startEmergencyDoctorDispatch: dispatch.emergency }));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({ getIO: jest.fn() }));
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({ findCandidatesByHex: jest.fn() }));
jest.unstable_mockModule('../../src/lib/geoUtils.js', () => ({ calculateDistanceKm: jest.fn(() => 1) }));
jest.unstable_mockModule('../../src/lib/valhallaRouting.js', () => ({ rankCandidatesByRoadETA: jest.fn(async (_pickup, candidates) => candidates) }));
jest.unstable_mockModule('../../src/lib/redlock.js', () => ({ acquireLock: jest.fn(), releaseLock: jest.fn() }));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({ writeOutboxEvent: jest.fn() }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { recoverInstantDispatchRetries } = await import('../../src/services/instantDispatchService.js');

describe('durable instant-dispatch retry recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ride.find.mockReturnValue(query([]));
    lawyer.find.mockReturnValue(query([]));
    assistant.find.mockReturnValue(query([]));
    emergency.find.mockReturnValue(query([]));
  });

  it('atomically claims due generic retries and resumes with persisted expanded radii', async () => {
    const due = { _id: 'lawyer-1', retryRadii: [8, 15, 30], retryWaveIndex: 1 };
    lawyer.find.mockReturnValueOnce(query([due]));
    lawyer.findOneAndUpdate.mockResolvedValueOnce({ _id: due._id });

    await recoverInstantDispatchRetries(new Date('2026-10-04T00:00:00Z'));

    expect(lawyer.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: due._id, status: 'no_responders_found', retryCount: 1, retryAt: { $lte: new Date('2026-10-04T00:00:00Z') } },
      { $set: { status: 'searching', retryAt: null, windowEndsAt: null, retryWaveIndex: 1 } },
      { new: true },
    );
    expect(dispatch.lawyer).toHaveBeenCalledWith(due._id, due.retryRadii);
  });

  it('does not start a retry if another worker already claimed the due row', async () => {
    const due = { _id: 'assistant-1', retryRadii: [3, 8], retryWaveIndex: 0 };
    assistant.find.mockReturnValueOnce(query([due]));
    assistant.findOneAndUpdate.mockResolvedValueOnce(null);

    await recoverInstantDispatchRetries(new Date());

    expect(dispatch.assistant).not.toHaveBeenCalled();
  });

  it('claims an expired generic wave deadline once and resumes dispatch', async () => {
    const expired = { _id: 'doctor-1' };
    emergency.find.mockReturnValueOnce(query([])).mockReturnValueOnce(query([expired]));
    emergency.findOneAndUpdate.mockResolvedValueOnce({ _id: expired._id });

    await recoverInstantDispatchRetries(new Date());

    expect(emergency.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expired._id, status: 'searching', windowEndsAt: { $lte: expect.any(Date) } },
      { $set: { windowEndsAt: null } },
      { new: true, select: '_id' },
    );
    expect(dispatch.emergency).toHaveBeenCalledWith(expired._id);
  });

  it('keeps legacy ride retry on its sequential recovery path', async () => {
    const due = { _id: 'ride-1', retryRadii: [8, 15] };
    ride.find.mockReturnValueOnce(query([due]));
    ride.findOneAndUpdate.mockResolvedValueOnce({ _id: due._id });

    await recoverInstantDispatchRetries(new Date('2026-10-04T00:00:00Z'));

    expect(dispatch.ride).toHaveBeenCalledWith(due._id, { radii: due.retryRadii, markRetryAttempt: true });
  });

});
