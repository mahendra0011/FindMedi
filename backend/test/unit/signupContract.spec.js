/**
 * Patient signup contract (doc 02/04): the clinical + emergency fields the
 * signup form collects must survive validation and reach the user document,
 * and a phone that already has an outpatient patient row must not abort the
 * whole registration with a duplicate-key 500.
 */
/* eslint-disable no-redeclare -- @jest/globals names shadow the configured test globals */
import { jest } from '@jest/globals';

const state = {
  existingOutpatient: null,
  createdPatients: [],
  createdUsers: [],
  duplicateOnCreate: false,
};

jest.unstable_mockModule('../../src/models/Patient.js', () => ({
  default: {
    findOne: () => ({
      select: () => ({ lean: async () => state.existingOutpatient }),
    }),
    create: async (doc) => {
      if (state.duplicateOnCreate) {
        const err = new Error('E11000 duplicate key error collection: medicore.patients index: hospitalId_1_phone_1');
        err.code = 11000;
        throw err;
      }
      state.createdPatients.push(doc);
      return doc;
    },
  },
}));

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findOne: () => ({ lean: async () => null }),
    create: async (doc) => {
      state.createdUsers.push(doc);
      return { ...doc, _id: 'u1' };
    },
  },
}));

const { registerSchema } = await import('../../src/utils/validate.js');

describe('register schema: clinical + emergency fields', () => {
  it('keeps the blood group and the emergency contact instead of dropping them', () => {
    const parsed = registerSchema.parse({
      name: 'Asha Patient',
      email: 'asha@example.test',
      password: 'E2eStrongPass!23',
      role: 'patient',
      phone: '9876543210',
      gender: 'Female',
      dateOfBirth: '1995-04-12',
      bloodGroup: 'B+',
      emergencyContactName: 'Ravi Patient',
      emergencyContactPhone: '9876543211',
    });

    expect(parsed.bloodGroup).toBe('B+');
    expect(parsed.emergencyContactName).toBe('Ravi Patient');
    expect(parsed.emergencyContactPhone).toBe('9876543211');
  });

  it('defaults the blood group to empty so an older client still validates', () => {
    const parsed = registerSchema.parse({
      name: 'Asha Patient',
      email: 'asha@example.test',
      password: 'E2eStrongPass!23',
    });
    expect(parsed.bloodGroup).toBe('');
  });

  it('rejects a blood group outside the AB/O vocabulary', () => {
    const result = registerSchema.safeParse({
      name: 'Asha Patient',
      email: 'asha@example.test',
      password: 'E2eStrongPass!23',
      bloodGroup: 'C+',
    });
    expect(result.success).toBe(false);
  });

  it('keeps the emergency contact optional (an account may be created without one)', () => {
    const result = registerSchema.safeParse({
      name: 'Asha Patient',
      email: 'asha@example.test',
      password: 'E2eStrongPass!23',
    });
    expect(result.success).toBe(true);
  });
});
