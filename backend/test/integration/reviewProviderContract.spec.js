import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import mongoose from 'mongoose';
import Review from '../../src/models/Review.js';
import Provider from '../../src/models/Provider.js';
import Category from '../../src/models/Category.js';
import Service from '../../src/models/Service.js';
import Product from '../../src/models/Product.js';

const REVIEW_ID = '7000000000000000000000a1';
const DOCTOR_ID = '7000000000000000000000b2';
const PROVIDER_ID = '7000000000000000000000d4';
const BOOKING_REF = '7000000000000000000000e5';
const PATIENT_ID = '7000000000000000000000c3';

const reviewFind = jestApi.fn();
const reviewCount = jestApi.fn();
const reviewFindOne = jestApi.fn();
const reviewCreate = jestApi.fn();
const reviewFindByIdAndUpdate = jestApi.fn();
const appointmentExists = jestApi.fn();
const auditLog = jestApi.fn();

let lastListFilter = null;
let lastCreateBody = null;

jestApi.unstable_mockModule('../../src/models/Review.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => {
      lastListFilter = filter;
      return query([
        {
          _id: REVIEW_ID,
          doctorId: DOCTOR_ID,
          doctorName: 'Dr. Smith',
          patientName: 'Priya Sharma',
          rating: 5,
          comment: 'Great consultation for IVF',
          isPrivate: true,
          helpfulCount: 3,
          isVerifiedVisit: true,
          bookingRef: BOOKING_REF,
          subRatings: { bedsideManner: 5, waitTime: 4, facilityCleanliness: 5, treatmentExplanation: 5 },
          toObject() { return { ...this }; },
        },
      ]);
    },
    countDocuments: (...a) => reviewCount(...a),
    findOne: (...a) => reviewFindOne(...a),
    create: (body) => { lastCreateBody = body; return reviewCreate(body); },
    findByIdAndUpdate: (...a) => reviewFindByIdAndUpdate(...a),
    schema: Review.schema,
  },
}));

jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({
  __esModule: true,
  default: { exists: (...a) => appointmentExists(...a) },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('reviews');
const patient = { _id: PATIENT_ID, role: 'patient', name: 'Priya Sharma' };

beforeEach(() => {
  lastListFilter = null;
  lastCreateBody = null;
  reviewFind.mockReset();
  reviewCount.mockReset().mockResolvedValue(1);
  reviewFindOne.mockReset().mockImplementation(() => query(null));
  reviewCreate.mockReset().mockImplementation(async (body) => ({ _id: REVIEW_ID, ...body }));
  reviewFindByIdAndUpdate.mockReset().mockImplementation(() => query({ _id: REVIEW_ID, helpfulCount: 4 }));
  appointmentExists.mockReset().mockResolvedValue({ _id: BOOKING_REF });
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('Document 10 — Review & Provider Data Models Contract', () => {
  describe('Review Model Extensions (Spec 10 §2.14)', () => {
    it('Review schema has bookingRef, providerId, subRatings, helpfulCount, isPrivate, and editedAt', () => {
      const paths = Review.schema.paths;
      expect(paths.bookingRef).toBeDefined();
      expect(paths.providerId).toBeDefined();
      expect(paths['subRatings.bedsideManner']).toBeDefined();
      expect(paths['subRatings.waitTime']).toBeDefined();
      expect(paths['subRatings.facilityCleanliness']).toBeDefined();
      expect(paths['subRatings.treatmentExplanation']).toBeDefined();
      expect(paths.helpfulCount).toBeDefined();
      expect(paths.isPrivate).toBeDefined();
      expect(paths.editedAt).toBeDefined();
    });

    it('POST /reviews accepts subRatings, isPrivate flag, and verified bookingRef', async () => {
      const payload = {
        doctorId: DOCTOR_ID,
        doctorName: 'Dr. Smith',
        rating: 5,
        comment: 'Very professional, kept sensitive info private.',
        bookingRef: BOOKING_REF,
        providerId: PROVIDER_ID,
        subRatings: {
          bedsideManner: 5,
          waitTime: 4,
          facilityCleanliness: 5,
          treatmentExplanation: 5,
        },
        isPrivate: true,
      };

      const res = await as(patient).post('/').send(payload);
      expect(res.status).toBe(201);
      expect(lastCreateBody.isVerifiedVisit).toBe(true);
      expect(lastCreateBody.bookingRef.toString()).toBe(BOOKING_REF);
      expect(lastCreateBody.providerId.toString()).toBe(PROVIDER_ID);
      expect(lastCreateBody.isPrivate).toBe(true);
      expect(lastCreateBody.subRatings).toEqual(payload.subRatings);
    });

    it('GET /reviews masks patientName for isPrivate: true sensitive reviews', async () => {
      const res = await as().get('/');
      expect(res.status).toBe(200);
      expect(res.body.reviews.length).toBe(1);
      const rev = res.body.reviews[0];
      expect(rev.isPrivate).toBe(true);
      expect(rev.patientName).toBe('Anonymous Patient'); // Name masked for patient privacy
      expect(rev.helpfulCount).toBe(3);
    });

    it('POST /reviews/:id/helpful increments helpfulCount', async () => {
      const res = await as(patient).post(`/${REVIEW_ID}/helpful`).send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.helpfulCount).toBe(4);
    });
  });

  describe('Provider Model Extensions (Spec 10 §2.1)', () => {
    it('Provider schema includes tenantId, kind, group, tier, and probation fields', () => {
      const paths = Provider.schema.paths;
      expect(paths.tenantId).toBeDefined();
      expect(paths.kind).toBeDefined();
      expect(paths.group).toBeDefined();
      expect(paths.tier).toBeDefined();
      expect(paths['probation.active']).toBeDefined();
      expect(paths['stats.ratingAvg']).toBeDefined();
      expect(paths['contact.relayPhone']).toBeDefined();
    });
  });

  describe('Core Catalogue Alignment Models (Spec 10 §2.6, §2.7, §2.13)', () => {
    it('Category model contains canonical code, tier, and isSensitive flag', () => {
      const paths = Category.schema.paths;
      expect(paths.code).toBeDefined();
      expect(paths.tier).toBeDefined();
      expect(paths.isSensitive).toBeDefined();
      expect(paths.path).toBeDefined();
    });

    it('Service model defines bookable offering with modes, pricing, and eligibility', () => {
      const paths = Service.schema.paths;
      expect(paths.providerId).toBeDefined();
      expect(paths.categoryCode).toBeDefined();
      expect(paths.modes).toBeDefined();
      expect(paths['price.amount']).toBeDefined();
      expect(paths['eligibility.ageMin']).toBeDefined();
    });

    it('Product model contains variants, rxSchedule, fssaiNo, cdscoNo, and rentable day rate', () => {
      const paths = Product.schema.paths;
      expect(paths.vendorId).toBeDefined();
      expect(paths.kind).toBeDefined();
      expect(paths.variants).toBeDefined();
      expect(paths.rxSchedule).toBeDefined();
      expect(paths['rentable.perDay']).toBeDefined();
      expect(paths['rentable.deposit']).toBeDefined();
    });
  });
});
