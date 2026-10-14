import { jest } from '@jest/globals';

const mockApprovalCreate = jest.fn();
const mockApprovalFindById = jest.fn();

jest.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({ _id: 'notif_1' }),
  },
}));

jest.unstable_mockModule('../../src/models/User.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      select: () => ({
        limit: () => ({
          lean: () => Promise.resolve([{ _id: 'admin_1' }]),
        }),
      }),
    }),
  },
}));

const { default: TwoPersonApproval } = await import('../../src/models/TwoPersonApproval.js');
const { declareBreakGlass, verifyBreakGlassSession } = await import('../../src/services/breakGlassService.js');

describe('Four-Eyes Approval & Generic Break-Glass System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TwoPersonApproval Model', () => {
    it('requests an action requiring two distinct approvals', async () => {
      TwoPersonApproval.create = mockApprovalCreate.mockImplementation((data) => Promise.resolve({ _id: 'appr_1', ...data }));

      const res = await TwoPersonApproval.requestAction({
        actionType: 'sensitive_kyc_approval',
        targetModel: 'ProviderApplication',
        targetId: 'app_123',
        requestedBy: '507f1f77bcf86cd799439011',
        requestedByName: 'KYC Analyst',
        payload: { category: 'deaddiction' },
        requiredApprovalsCount: 2,
      });

      expect(mockApprovalCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'sensitive_kyc_approval',
          targetModel: 'ProviderApplication',
          targetId: 'app_123',
          requiredApprovalsCount: 2,
          status: 'pending',
          approvals: [],
        })
      );
      expect(res.status).toBe('pending');
    });

    it('enforces that the same administrator cannot approve twice', async () => {
      const mockRecord = {
        _id: 'appr_1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 100000),
        approvals: [
          { adminId: '507f1f77bcf86cd799439099', adminName: 'Admin Alpha', at: new Date() },
        ],
        requiredApprovalsCount: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      TwoPersonApproval.findById = mockApprovalFindById.mockResolvedValue(mockRecord);

      await expect(
        TwoPersonApproval.recordApproval({
          approvalId: 'appr_1',
          adminId: '507f1f77bcf86cd799439099',
          adminName: 'Admin Alpha',
        })
      ).rejects.toThrow(/four-eyes policy requires distinct reviewers/);
    });

    it('transitions to approved when two distinct admins have approved', async () => {
      const mockRecord = {
        _id: 'appr_2',
        status: 'pending',
        expiresAt: new Date(Date.now() + 100000),
        approvals: [
          { adminId: '507f1f77bcf86cd799439099', adminName: 'Admin Alpha', at: new Date() },
        ],
        requiredApprovalsCount: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      TwoPersonApproval.findById = mockApprovalFindById.mockResolvedValue(mockRecord);

      const updated = await TwoPersonApproval.recordApproval({
        approvalId: 'appr_2',
        adminId: '507f1f77bcf86cd799439088',
        adminName: 'Admin Beta',
      });

      expect(updated.status).toBe('approved');
      expect(updated.resolvedAt).toBeDefined();
      expect(mockRecord.save).toHaveBeenCalled();
    });

    it('allows an administrator to reject the action', async () => {
      const mockRecord = {
        _id: 'appr_3',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      TwoPersonApproval.findById = mockApprovalFindById.mockResolvedValue(mockRecord);

      const rejected = await TwoPersonApproval.rejectAction({
        approvalId: 'appr_3',
        adminId: '507f1f77bcf86cd799439099',
        reason: 'Compliance discrepancy in background check',
      });

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Compliance discrepancy in background check');
      expect(mockRecord.save).toHaveBeenCalled();
    });
  });

  describe('Break-Glass Emergency Access', () => {
    it('declares break-glass emergency session with mandatory audit and two-person review', async () => {
      TwoPersonApproval.requestAction = jest.fn().mockResolvedValue({ _id: 'bg_appr_1' });

      const bg = await declareBreakGlass({
        userId: '507f1f77bcf86cd799439077',
        userName: 'Dr. Emergency Surgeon',
        role: 'doctor',
        targetPatientId: 'pat_999',
        emergencyReason: 'Acute cardiac arrest in ER, immediate records required for medication allergy check',
        durationMinutes: 30,
      });

      expect(bg.token).toBeDefined();
      expect(bg.sessionId).toMatch(/^bg_/);
      expect(bg.approvalId).toBe('bg_appr_1');

      // Verify session can be checked
      const verification = verifyBreakGlassSession({ token: bg.token, targetPatientId: 'pat_999' });
      expect(verification.valid).toBe(true);
      expect(verification.session.userName).toBe('Dr. Emergency Surgeon');

      // Verify token rejected for different patient
      const wrongPatient = verifyBreakGlassSession({ token: bg.token, targetPatientId: 'pat_other' });
      expect(wrongPatient.valid).toBe(false);
      expect(wrongPatient.reason).toMatch(/not authorized for this patient ID/);
    });

    it('rejects break-glass declaration when reason is too brief or missing', async () => {
      await expect(
        declareBreakGlass({
          userId: '507f1f77bcf86cd799439077',
          emergencyReason: 'urgent',
        })
      ).rejects.toThrow(/mandatory for break-glass/);
    });
  });
});
