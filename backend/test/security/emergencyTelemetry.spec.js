import { jest } from '@jest/globals';
import mongoose from 'mongoose';

const mockAmbulanceFindById = jest.fn();

jest.unstable_mockModule('../../src/models/Ambulance.js', () => ({
  __esModule: true,
  default: {
    findById: mockAmbulanceFindById,
  },
}));

jest.unstable_mockModule('../../src/models/User.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ _id: 'user_1', hospitalId: 'hosp_123' }),
      }),
    }),
  },
}));

const { assertRoomAccess, KNOWN_ROOMS } = await import('../../src/middleware/chatMembership.js');

describe('Emergency Telemetry & Ride Access Control (EMERG-BUG-01 & 02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KNOWN_ROOMS Room Membership Gate (EMERG-BUG-01)', () => {
    it('registers ambulance as a verified known room', () => {
      expect(KNOWN_ROOMS.has('ambulance')).toBe(true);
      expect(KNOWN_ROOMS.has('ride')).toBe(true);
      expect(KNOWN_ROOMS.has('emergency')).toBe(true);
    });

    it('denies unknown room types by default', async () => {
      const verdict = await assertRoomAccess('507f1f77bcf86cd799439011', 'patient', 'secret_room', '507f1f77bcf86cd799439022');
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toBe('unknown-room');
    });

    it('admits assigned crew member to their ambulance room', async () => {
      const ambulanceId = '507f1f77bcf86cd799439022';
      const driverUserId = '507f1f77bcf86cd799439011';

      mockAmbulanceFindById.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve({
            _id: ambulanceId,
            userId: driverUserId,
            hospitalId: 'hosp_123',
          }),
        }),
      });

      const verdict = await assertRoomAccess(driverUserId, 'ambulance', 'ambulance', ambulanceId);
      expect(verdict.ok).toBe(true);
      expect(verdict.room).toBe(`ambulance:${ambulanceId}`);
    });

    it('rejects unrelated users from eavesdropping on ambulance telemetry', async () => {
      const ambulanceId = '507f1f77bcf86cd799439022';
      const intruderUserId = '507f1f77bcf86cd799439099';

      mockAmbulanceFindById.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve({
            _id: ambulanceId,
            userId: '507f1f77bcf86cd799439011',
            hospitalId: 'hosp_123',
          }),
        }),
      });

      const verdict = await assertRoomAccess(intruderUserId, 'patient', 'ambulance', ambulanceId);
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toBe('not-the-crew');
    });
  });
});
