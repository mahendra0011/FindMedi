import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const appointments = [];

const { as } = await mountApp('recall', {
  '../../src/models/Appointment.js': () => ({
    default: {
      findOne: (filter) => {
        if (filter.followUpFor) {
          const match = appointments.find((a) => String(a.followUpFor) === String(filter.followUpFor));
          return query(match || null);
        }
        return query(null);
      },
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860c1', ...data };
        appointments.push(item);
        return item;
      },
    },
  }),
  '../../src/models/User.js': () => ({
    default: {
      findById: (id) => ({
        select: () => ({
          lean: async () => ({ name: 'John Doe', phone: '9999999999' }),
        }),
      }),
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

describe('Auto Follow-up Booking Engine (D2)', () => {
  const doctor = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'doctor',
    hospitalId: '507f191e810c19729de860ed',
  };

  it('books tentative follow-up appointment linked to parent consultation with zero fees', async () => {
    const res = await as(doctor)
      .post('/book')
      .send({
        patientId: '507f191e810c19729de860ea',
        doctorId: '507f191e810c19729de860eb',
        followUpForAppointmentId: '507f191e810c19729de860aa',
        scheduledDate: '2026-10-20',
        slot: '11:00 AM - 11:30 AM',
      })
      .expect(201);

    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.status).toBe('Tentative');
    expect(res.body.appointment.fees).toBe(0);
    expect(res.body.appointment.followUpFor).toBe('507f191e810c19729de860aa');
  });

  it('rejects duplicate booking for the same parent consultation (409 Conflict)', async () => {
    await as(doctor)
      .post('/book')
      .send({
        patientId: '507f191e810c19729de860ea',
        doctorId: '507f191e810c19729de860eb',
        followUpForAppointmentId: '507f191e810c19729de860aa', // same parent
      })
      .expect(409);
  });
});
