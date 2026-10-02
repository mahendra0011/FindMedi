/**
 * Tiny fixture builders. Deliberately plain objects (not Mongoose documents)
 * so unit suites never need a database: the code under test mostly reads
 * `.field` / `.toString()` off these and the assertions can stay structural.
 */
export const oid = (suffix = 1) =>
  `507f1f77bcf86cd7994390${String(suffix).padStart(2, '0')}`;

export const userFixture = (overrides = {}) => ({
  _id: oid(1),
  name: 'Asha Patient',
  email: 'asha@example.test',
  role: 'patient',
  status: 'active',
  isVerified: true,
  tokenVersion: 0,
  hospitalId: null,
  facilityId: null,
  approvalStatus: 'not_required',
  settings: {},
  ...overrides,
});

export const doctorUserFixture = (overrides = {}) =>
  userFixture({
    _id: oid(2),
    name: 'Dr. Ravi',
    email: 'ravi@example.test',
    role: 'doctor',
    approvalStatus: 'approved',
    doctorProfileId: oid(9),
    ...overrides,
  });

export const appointmentFixture = (overrides = {}) => ({
  _id: oid(3),
  patientId: oid(1),
  doctorId: oid(9),
  date: '2026-10-01',
  time: '10:30',
  status: 'Pending',
  fees: 500,
  hospitalId: null,
  ...overrides,
});

export const paymentFixture = (overrides = {}) => ({
  _id: oid(4),
  transaction_id: 'TXN-TEST-1',
  patient_id: oid(1),
  patient_name: 'Asha Patient',
  amount: 500,
  method: 'upi',
  status: 'completed',
  refund_amount: 0,
  hospitalId: null,
  ...overrides,
});

export const ledgerFixture = (overrides = {}) => ({
  _id: oid(5),
  source: 'ride',
  sourceId: 'RIDE-1',
  amount: 1000,
  commissionPercent: 10,
  commissionAmount: 100,
  taxAmount: 10,
  netAmount: 890,
  entryType: 'CREDIT',
  status: 'completed',
  ...overrides,
});
