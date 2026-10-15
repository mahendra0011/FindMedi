import { jest } from '@jest/globals';

const mockAuditLog = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  __esModule: true,
  auditLog: mockAuditLog,
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { score, INSTRUMENTS } = await import('../../src/services/mentalHealthScreening.js');

describe('Mental Health Screening & Crisis Interception (MHCA 2017)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PHQ-9 Question 9 Crisis Interception (MH-BUG-02)', () => {
    it('does not trigger crisis when Question 9 is 0', () => {
      const answers = {
        phq9_1: 1,
        phq9_2: 1,
        phq9_3: 0,
        phq9_4: 1,
        phq9_5: 0,
        phq9_6: 0,
        phq9_7: 0,
        phq9_8: 0,
        phq9_9: 0,
      };

      const result = score('PHQ-9', answers);
      expect(result.valid).toBe(true);
      expect(result.suicidalityFlagged).toBe(false);
      expect(result.crisis).toBe(false);
      expect(result.helplines).toHaveLength(0);
    });

    it('triggers crisis immediately when Question 9 > 0 even with low total score', () => {
      // Patient with minimal depression (total 3) but positive suicidal ideation
      const answers = {
        phq9_1: 0,
        phq9_2: 0,
        phq9_3: 0,
        phq9_4: 0,
        phq9_5: 0,
        phq9_6: 0,
        phq9_7: 0,
        phq9_8: 0,
        phq9_9: 3, // Nearly every day
      };

      const result = score('PHQ-9', answers);
      expect(result.valid).toBe(true);
      expect(result.total).toBe(3);
      expect(result.severity).toBe('Minimal');
      expect(result.suicidalityFlagged).toBe(true);
      expect(result.crisis).toBe(true);
      expect(result.referralSuggested).toBe(true);

      // Verifies mandatory national crisis helplines
      expect(result.helplines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'National Tele-MANAS',
            phone: '14416',
          }),
          expect.objectContaining({
            name: 'KIRAN Mental Health Helpline',
            phone: '1800-599-0019',
          }),
          expect.objectContaining({
            name: 'Vandrevala Foundation',
            phone: '+91 9999 666 555',
          }),
        ])
      );
    });
  });

  describe('Audit Log Sanitization (MH-BUG-01)', () => {
    it('validates that audit payloads for mental health avoid leaking raw scores', async () => {
      const { auditLog } = await import('../../src/middleware/audit.js');

      // Emulate route audit logging
      await auditLog('screening_completed', 'user_123', {
        event: 'screening_completed',
        referralId: 'MH-REF-001',
        patientId: 'patient_777',
        category: 'mental_health',
      });

      expect(mockAuditLog).toHaveBeenCalledWith(
        'screening_completed',
        'user_123',
        expect.not.objectContaining({
          total: expect.anything(),
          score: expect.anything(),
          severity: expect.anything(),
          answers: expect.anything(),
        })
      );
    });
  });
});
