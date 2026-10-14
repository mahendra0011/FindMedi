import { jest } from '@jest/globals';

const mockDocFindByIdAndUpdate = jest.fn();
const mockAssignmentCreate = jest.fn();
const mockAssignmentUpdateMany = jest.fn();
const mockAssignmentFindOneAndUpdate = jest.fn();
const mockVerificationCreate = jest.fn();

jest.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: (...args) => mockDocFindByIdAndUpdate(...args),
  },
}));

const { default: DocumentVerification } = await import('../../src/models/DocumentVerification.js');
const { default: ReviewerAssignment } = await import('../../src/models/ReviewerAssignment.js');

describe('KYC Pipeline · DocumentVerification & ReviewerAssignment Models', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReviewerAssignment', () => {
    it('computes SLA deadline and assigns reviewer correctly', async () => {
      ReviewerAssignment.updateMany = mockAssignmentUpdateMany.mockResolvedValue({ modifiedCount: 1 });
      ReviewerAssignment.create = mockAssignmentCreate.mockImplementation((data) => Promise.resolve({ _id: 'asgn_1', ...data }));

      const res = await ReviewerAssignment.assignReviewer({
        applicationId: '507f1f77bcf86cd799439011',
        reviewerId: '507f1f77bcf86cd799439022',
        roleType: 'clinical_compliance_reviewer',
        tier: 'T1',
        slaHours: 48,
        priority: 'high_risk',
      });

      expect(mockAssignmentUpdateMany).toHaveBeenCalledWith(
        {
          applicationId: '507f1f77bcf86cd799439011',
          roleType: 'clinical_compliance_reviewer',
          status: { $in: ['assigned', 'in_progress'] },
        },
        expect.any(Object)
      );

      expect(mockAssignmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: '507f1f77bcf86cd799439011',
          reviewerId: '507f1f77bcf86cd799439022',
          roleType: 'clinical_compliance_reviewer',
          tier: 'T1',
          slaHours: 48,
          priority: 'high_risk',
          status: 'assigned',
          slaDeadline: expect.any(Date),
        })
      );

      expect(res.slaDeadline.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
    });

    it('marks an active assignment completed', async () => {
      ReviewerAssignment.findOneAndUpdate = mockAssignmentFindOneAndUpdate.mockResolvedValue({
        _id: 'asgn_1',
        status: 'completed',
        completedAt: new Date(),
      });

      const res = await ReviewerAssignment.completeAssignment('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022');
      expect(mockAssignmentFindOneAndUpdate).toHaveBeenCalledWith(
        {
          applicationId: '507f1f77bcf86cd799439011',
          reviewerId: '507f1f77bcf86cd799439022',
          status: { $in: ['assigned', 'in_progress'] },
        },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'completed' }) }),
        { new: true }
      );
      expect(res.status).toBe('completed');
    });
  });

  describe('DocumentVerification', () => {
    it('creates verification record and updates ProviderDocument status to verified', async () => {
      DocumentVerification.create = mockVerificationCreate.mockImplementation((data) => Promise.resolve({ _id: 'verif_1', ...data }));
      mockDocFindByIdAndUpdate.mockResolvedValue({ _id: 'doc_1', status: 'verified' });

      const res = await DocumentVerification.recordVerification({
        documentId: '507f1f77bcf86cd799439033',
        applicationId: '507f1f77bcf86cd799439011',
        reviewerId: '507f1f77bcf86cd799439022',
        reviewerName: 'Dr. Compliance Reviewer',
        docType: 'medical_council_reg',
        decision: 'verified',
        verificationMethod: 'manual_portal',
        registrySource: 'NMC',
        registryRegistrationNumber: 'MCI-12345',
        registryCheckResult: { matched: true, registrationValid: true },
        documentHash: 'abc123hash',
      });

      expect(mockVerificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '507f1f77bcf86cd799439033',
          decision: 'verified',
          registrySource: 'NMC',
          documentHash: 'abc123hash',
        })
      );

      expect(mockDocFindByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439033',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'verified',
            verifiedBy: '507f1f77bcf86cd799439022',
          }),
        })
      );
      expect(res.decision).toBe('verified');
    });

    it('records rejection reason when document is rejected', async () => {
      DocumentVerification.create = mockVerificationCreate.mockImplementation((data) => Promise.resolve({ _id: 'verif_2', ...data }));
      mockDocFindByIdAndUpdate.mockResolvedValue({ _id: 'doc_2', status: 'rejected' });

      await DocumentVerification.recordVerification({
        documentId: '507f1f77bcf86cd799439034',
        applicationId: '507f1f77bcf86cd799439011',
        reviewerId: '507f1f77bcf86cd799439022',
        docType: 'clinical_establishment_reg',
        decision: 'rejected',
        rejectionReason: 'Certificate expired and blurred registration number',
      });

      expect(mockDocFindByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439034',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'rejected',
            rejectionReason: 'Certificate expired and blurred registration number',
          }),
        })
      );
    });
  });
});
