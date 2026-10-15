import { jest, beforeEach, describe, it, expect } from '@jest/globals';

const mockDocUpdate = jest.fn();
const mockVerificationCreate = jest.fn();
const mockAssignmentCreate = jest.fn();
const mockAssignmentUpdateMany = jest.fn();
const mockAssignmentFindOneAndUpdate = jest.fn();

jest.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: mockDocUpdate,
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

const { default: DocumentVerification } = await import('../../src/models/DocumentVerification.js');
const { default: ReviewerAssignment } = await import('../../src/models/ReviewerAssignment.js');

describe('KYC Pipeline: DocumentVerification & ReviewerAssignment Models', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DocumentVerification Model', () => {
    it('records verification decision and updates ProviderDocument', async () => {
      DocumentVerification.create = mockVerificationCreate.mockImplementation((d) => Promise.resolve({ _id: 'ver_1', ...d }));
      mockDocUpdate.mockResolvedValue({ _id: 'doc_1', status: 'verified' });

      const audit = await DocumentVerification.recordVerification({
        documentId: '507f1f77bcf86cd799439011',
        applicationId: '507f1f77bcf86cd799439022',
        reviewerId: '507f1f77bcf86cd799439033',
        reviewerName: 'KYC Analyst',
        docType: 'medical_degree',
        decision: 'verified',
        verificationMethod: 'api_registry',
        registrySource: 'NMC',
        registryRegistrationNumber: 'MCI-12345',
        registryCheckResult: { matched: true, registrationValid: true },
      });

      expect(mockVerificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          docType: 'medical_degree',
          decision: 'verified',
          registrySource: 'NMC',
          registryRegistrationNumber: 'MCI-12345',
        })
      );
      expect(mockDocUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'verified',
            verifiedBy: '507f1f77bcf86cd799439033',
          }),
        })
      );
      expect(audit._id).toBe('ver_1');
    });

    it('records rejection with mandatory reason and updates document', async () => {
      DocumentVerification.create = mockVerificationCreate.mockImplementation((d) => Promise.resolve({ _id: 'ver_2', ...d }));
      mockDocUpdate.mockResolvedValue({ _id: 'doc_2', status: 'rejected' });

      await DocumentVerification.recordVerification({
        documentId: '507f1f77bcf86cd799439044',
        applicationId: '507f1f77bcf86cd799439022',
        reviewerId: '507f1f77bcf86cd799439033',
        reviewerName: 'KYC Analyst',
        docType: 'state_council_reg',
        decision: 'rejected',
        rejectionReason: 'Council stamp illegible or expired',
      });

      expect(mockDocUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439044',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'rejected',
            rejectionReason: 'Council stamp illegible or expired',
          }),
        })
      );
    });
  });

  describe('ReviewerAssignment Model', () => {
    it('creates reviewer assignment and reassigns prior open assignments', async () => {
      ReviewerAssignment.updateMany = mockAssignmentUpdateMany.mockResolvedValue({ modifiedCount: 1 });
      ReviewerAssignment.create = mockAssignmentCreate.mockImplementation((d) => Promise.resolve({ _id: 'asgn_1', ...d }));

      const asgn = await ReviewerAssignment.assignReviewer({
        applicationId: '507f1f77bcf86cd799439022',
        reviewerId: '507f1f77bcf86cd799439033',
        assignedBy: '507f1f77bcf86cd799439055',
        roleType: 'kyc_reviewer',
        slaHours: 48,
        priority: 'high_risk',
      });

      expect(mockAssignmentUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: '507f1f77bcf86cd799439022',
          roleType: 'kyc_reviewer',
          status: { $in: ['assigned', 'in_progress'] },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'reassigned' }),
        })
      );

      expect(mockAssignmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: '507f1f77bcf86cd799439022',
          reviewerId: '507f1f77bcf86cd799439033',
          slaHours: 48,
          priority: 'high_risk',
          status: 'assigned',
        })
      );
      expect(asgn._id).toBe('asgn_1');
    });

    it('marks active assignment completed', async () => {
      ReviewerAssignment.findOneAndUpdate = mockAssignmentFindOneAndUpdate.mockResolvedValue({
        _id: 'asgn_1',
        status: 'completed',
        completedAt: new Date(),
      });

      const res = await ReviewerAssignment.completeAssignment(
        '507f1f77bcf86cd799439022',
        '507f1f77bcf86cd799439033'
      );

      expect(mockAssignmentFindOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: '507f1f77bcf86cd799439022',
          reviewerId: '507f1f77bcf86cd799439033',
          status: { $in: ['assigned', 'in_progress'] },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'completed' }),
        }),
        { new: true }
      );
      expect(res.status).toBe('completed');
    });
  });
});
