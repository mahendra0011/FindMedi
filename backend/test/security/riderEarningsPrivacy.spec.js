import { jest } from '@jest/globals';

const profiles = { findOne: jest.fn(), findById: jest.fn() };
const assistantProfiles = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
const lawyerProfiles = { findOne: jest.fn() };
const ledger = { find: jest.fn(), countDocuments: jest.fn(), aggregate: jest.fn() };
const vehicles = { findByIdAndUpdate: jest.fn() };
const users = new Map();

jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: profiles }));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({ default: assistantProfiles }));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({ default: lawyerProfiles }));
jest.unstable_mockModule('../../src/models/TransactionLedger.js', () => ({ default: ledger }));
jest.unstable_mockModule('../../src/models/Vehicle.js', () => ({ default: vehicles }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: {
  findById: (id) => ({ select: () => Promise.resolve(users.get(String(id)) || null) }),
} }));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../src/services/tenantQuotaService.js', () => ({
  tenantQuotaGuard: (_req, _res, next) => next(),
  deleteQuota: jest.fn(), listQuotas: jest.fn(), setQuota: jest.fn(), getQuota: jest.fn(),
  DEFAULT_QUOTA: { windowMs: 60_000, max: 1_000 }, _resetQuotaCache: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('pino-http', () => ({ default: () => (_req, _res, next) => next() }));

const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const { app } = await import('../helpers/app.js');

const riderId = '507f1f77bcf86cd799439001';
const strangerId = '507f1f77bcf86cd799439002';
const assistantId = '507f1f77bcf86cd799439003';
const lawyerId = '507f1f77bcf86cd799439004';
const auth = (id, role) => `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
const emptyQuery = { select: () => ({ lean: async () => [] }) };

describe('rider earnings route privacy and owner scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    users.set(riderId, { _id: riderId, role: 'rider', status: 'active', isVerified: true });
    users.set(strangerId, { _id: strangerId, role: 'patient', status: 'active', isVerified: true });
    users.set(assistantId, { _id: assistantId, role: 'assistant', status: 'active', isVerified: true });
    users.set(lawyerId, { _id: lawyerId, role: 'lawyer', status: 'active', isVerified: true });
    profiles.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'rider-profile', walletBalance: 40, rating: { avg: 5, count: 2 },
        bankDetails: { accountNumber: '1234567890', ifsc: 'BANK000123', upiId: 'rider@upi' },
      }),
    });
    const riderDoc = {
      _id: 'rider-profile', userId: riderId, operatingArea: 'Central', operatingCity: 'Jabalpur',
      riderStatus: 'active', isOnline: false, emergencySupport: false, currentLocation: { lat: 23, lng: 79 },
      rating: { avg: 5, count: 2 }, settings: { waitMinutes: 5 }, vehicleId: 'vehicle-1',
      govtIdNumber: 'AADHAAR-SENSITIVE', drivingLicenseNumber: 'DL-SENSITIVE',
      govtIdDocUrl: 'https://files.example/id.pdf', bankDetails: { accountNumber: '1234567890', ifsc: 'BANK000123', upiId: 'rider@upi' },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const profileQuery = {
      select: () => profileQuery,
      populate: () => profileQuery,
      lean: async () => riderDoc,
    };
    profiles.findOne.mockReturnValue(profileQuery);
    assistantProfiles.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ walletBalance: 0, rating: { avg: 5, count: 0 } }) }) });
    profiles.findById.mockReturnValue({
      select: () => ({ populate: () => ({ lean: async () => ({ _id: riderDoc._id, operatingArea: 'Central' }) }) }),
    });
    vehicles.findByIdAndUpdate.mockResolvedValue({});
    ledger.find.mockReturnValue(emptyQuery);
    ledger.countDocuments.mockResolvedValue(0);
    ledger.aggregate.mockResolvedValue([]);
  });

  it('returns only summary fields and never serializes payout account identifiers', async () => {
    profiles.findOne.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: 'rider-profile', walletBalance: 40, rating: { avg: 5, count: 2 } }),
    });
    const res = await request(app).get('/api/rider/earnings').set('Authorization', auth(riderId, 'rider'));
    expect(res.status).toBe(200);
    expect(profiles.findOne).toHaveBeenCalledWith({ userId: riderId });
    expect(profiles.findOne.mock.results[0].value.select).toHaveBeenCalledWith('_id walletBalance rating');
    expect(JSON.stringify(res.body)).not.toMatch(/1234567890|BANK000123|rider@upi|bankDetails/i);
    expect(res.body).toMatchObject({ walletBalance: 40, totalEarnings: 0 });
  });

  it('does not disclose a rider earnings summary to a different account role', async () => {
    const res = await request(app).get('/api/rider/earnings').set('Authorization', auth(strangerId, 'patient'));
    expect(res.status).toBe(403);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it('blocks non-riders from the profile route before querying a rider document', async () => {
    const res = await request(app).get('/api/rider/profile').set('Authorization', auth(strangerId, 'patient'));
    expect(res.status).toBe(403);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it('returns only explicit profile fields without banking/KYC identifiers', async () => {
    const res = await request(app).get('/api/rider/profile').set('Authorization', auth(riderId, 'rider'));
    expect(res.status).toBe(200);
    expect(profiles.findOne).toHaveBeenCalledWith({ userId: riderId });
    expect(JSON.stringify(res.body)).not.toMatch(/SENSITIVE|1234567890|BANK000123|rider@upi|govtIdDocUrl|drivingLicenseDocUrl/i);
  });

  it('does not let profile JSON update vehicle approval or ownership fields', async () => {
    profiles.findOne.mockReturnValueOnce(Object.assign({ save: jest.fn().mockResolvedValue(undefined) }, {
      _id: 'rider-profile', riderStatus: 'active', settings: {}, bankDetails: {},
    }));
    const res = await request(app).put('/api/rider/profile')
      .set('Authorization', auth(riderId, 'rider'))
      .set('Origin', 'http://localhost:3000')
      .set('x-csrf-token', 'test-csrf-token')
      .set('Cookie', 'csrf-token=test-csrf-token')
      .send({ vehicleDetails: { isDocumentVerified: true, riderId: strangerId, rcNumber: 'FAKE' }, riderStatus: 'active' });
    expect(res.status).toBe(200);
    expect(vehicles.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(profiles.findOne.mock.results[0].value.riderStatus).toBe('active');
    expect(JSON.stringify(res.body)).not.toMatch(/AADHAAR-SENSITIVE|DL-SENSITIVE|1234567890|BANK000123|rider@upi/i);
  });

  it('blocks patients from assistant and lawyer earnings endpoints before any profile lookup', async () => {
    const assistantRes = await request(app).get('/api/assistant/earnings').set('Authorization', auth(strangerId, 'patient'));
    const lawyerRes = await request(app).get('/api/lawyer/earnings').set('Authorization', auth(strangerId, 'patient'));
    expect(assistantRes.status).toBe(403);
    expect(lawyerRes.status).toBe(403);
    expect(assistantProfiles.findOne).not.toHaveBeenCalled();
    expect(lawyerProfiles.findOne).not.toHaveBeenCalled();
  });

  it('assistant profile response masks bank values and omits KYC/document secrets', async () => {
    const providerData = {
      _id: 'assistant-profile', userId: { _id: assistantId, name: 'Assistant' },
      govtIdNumber: 'ASSISTANT-ID-SECRET', govtIdDocUrl: 'https://files.example/secret-id.pdf',
      bankDetails: { accountHolder: 'Assistant Name', accountNumber: '9876543210', ifsc: 'IFSC1234', upiId: 'secret@upi' },
      emergencyContact: { name: 'Relative', phone: '9876501234' },
      experienceYears: 3, bio: 'Care support', settings: {},
    };
    const chain = {
      select: () => chain,
      populate: () => chain,
      lean: async () => providerData,
    };
    assistantProfiles.findOne.mockReturnValueOnce(chain);
    const res = await request(app).get('/api/assistant/profile').set('Authorization', auth(assistantId, 'assistant'));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/ASSISTANT-ID-SECRET|secret-id\.pdf|9876543210|IFSC1234|secret@upi|9876501234/);
    expect(res.body.profile.bankDetails.accountNumber).toBe('****3210');
  });

  it('does not serialize a full assistant bank account in demo withdrawal response', async () => {
    assistantProfiles.findOne.mockResolvedValueOnce({ _id: 'assistant-profile', walletBalance: 500, bankDetails: { accountNumber: '9876543210' } });
    assistantProfiles.findOneAndUpdate.mockResolvedValueOnce({ walletBalance: 400 });
    const res = await request(app).post('/api/assistant/withdraw-demo')
      .set('Authorization', auth(assistantId, 'assistant'))
      .set('Origin', 'http://localhost:3000')
      .set('x-csrf-token', 'test-csrf-token')
      .set('Cookie', 'csrf-token=test-csrf-token')
      .send({ amount: 100 });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('9876543210');
    expect(assistantProfiles.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'assistant-profile', walletBalance: { $gte: 100 } },
      { $inc: { walletBalance: -100 } },
      { new: true, select: 'walletBalance' },
    );
  });

  it('calculates assistant earnings from scoped completed ledger credits and returns a minimized summary', async () => {
    const profileQuery = { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ walletBalance: 275, rating: { avg: 4.8, count: 6 } }) }) };
    assistantProfiles.findOne.mockReturnValueOnce(profileQuery);
    ledger.aggregate
      .mockResolvedValueOnce([{ gross: 1200, commission: 120, tax: 12, net: 1068, count: 3 }])
      .mockResolvedValueOnce([{ gross: 500, commission: 50, tax: 5, net: 445, count: 1 }])
      .mockResolvedValueOnce([{ gross: 100, commission: 10, tax: 1, net: 89, count: 1 }]);
    const settlements = [{ amount: 100, commissionAmount: 10, taxAmount: 1, netAmount: 89, createdAt: new Date('2026-10-04T08:00:00Z'), patientName: 'Patient PHI' }];
    ledger.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(settlements) }) }) }),
    });

    const res = await request(app).get('/api/assistant/earnings').set('Authorization', auth(assistantId, 'assistant'));

    expect(res.status).toBe(200);
    expect(profileQuery.select).toHaveBeenCalledWith('walletBalance rating');
    expect(ledger.aggregate).toHaveBeenCalledTimes(3);
    for (const [filter] of ledger.aggregate.mock.calls) {
      expect(filter[0].$match).toMatchObject({ providerId: assistantId, source: 'assistant', entryType: 'CREDIT', status: 'completed' });
    }
    expect(res.body).toMatchObject({ walletBalance: 275, totalGross: 1200, platformCommission: 120, netEarnings: 1068, todayNet: 89, thisMonthNet: 445, totalCompleted: 3 });
    expect(JSON.stringify(res.body)).not.toMatch(/Patient PHI|patientName|providerId|sourceId/);
  });

  it('returns zero assistant earnings when the scoped ledger has no completed credits', async () => {
    assistantProfiles.findOne.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ walletBalance: 0 }) }) });
    ledger.find.mockReturnValue({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) });
    const res = await request(app).get('/api/assistant/earnings').set('Authorization', auth(assistantId, 'assistant'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalGross: 0, platformCommission: 0, netEarnings: 0, todayNet: 0, thisMonthNet: 0, totalCompleted: 0, recentSettlements: [] });
  });

  it('lawyer profile returns masked financial/KYC fields and no verification document URLs', async () => {
    const lawyerDoc = {
      _id: 'lawyer-profile', userId: { _id: lawyerId, name: 'Lawyer' }, govtIdNumber: 'LAWYER-ID-SECRET',
      bankDetails: { accountHolder: 'Lawyer Name', accountNumber: '1234509876', ifsc: 'BANK8765', upiId: 'lawyer@upi', verified: true },
      verificationDocuments: [{ kind: 'id_proof', docUrl: 'https://files.example/lawyer-id.pdf', uploadedAt: new Date() }],
      toObject() { return { ...this, toObject: undefined }; },
    };
    const chain = {
      select: () => chain,
      populate: () => chain,
      then: (resolve, reject) => Promise.resolve(lawyerDoc).then(resolve, reject),
    };
    lawyerProfiles.findOne.mockReturnValueOnce(chain);
    const res = await request(app).get('/api/lawyer/profile').set('Authorization', auth(lawyerId, 'lawyer'));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/LAWYER-ID-SECRET|1234509876|BANK8765|lawyer@upi|lawyer-id\.pdf/);
    expect(res.body.profile.bankDetails.accountNumber).toBe('****9876');
    expect(res.body.profile.verificationDocuments[0]).not.toHaveProperty('docUrl');
  });
});
