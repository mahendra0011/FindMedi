import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { ACTIVE_STATUSES, appointmentInstant } from '../../src/jobs/appointmentReminder.job.js';
import { DEFAULT_NOTIFY_TEMPLATES, lintTemplate, renderTemplate } from '../../src/lib/notifyTemplates.js';

const appointments = [];

const { as } = await mountApp('recall', {
  '../../src/models/Appointment.js': () => ({
    default: {
      findOne: (filter) => {
        if (filter.followUpFor) {
          const match = appointments.find((a) => String(a.followUpFor) === String(filter.followUpFor));
          return query(match || null);
        }
        if (filter.timeSlot && filter.doctorId) {
          const match = appointments.find((a) => String(a.timeSlot) === String(filter.timeSlot));
          return query(match || null);
        }
        return query(null);
      },
      findById: async (id) => {
        const match = appointments.find((a) => String(a._id) === String(id));
        if (!match) return null;
        return {
          ...match,
          save: async function () {
            Object.assign(match, this);
            return this;
          },
        };
      },
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860c' + (appointments.length + 1), ...data };
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

  it('handles slot conflict and advances to next free slot', async () => {
    const res = await as(doctor)
      .post('/book')
      .send({
        patientId: '507f191e810c19729de860ea',
        doctorId: '507f191e810c19729de860eb',
        followUpForAppointmentId: '507f191e810c19729de860ab',
        scheduledDate: '2026-10-20',
        slot: '11:00 AM - 11:30 AM', // conflicting slot already taken in previous test
      })
      .expect(201);

    expect(res.body.slotAdjusted).toBe(true);
    expect(res.body.appointment.timeSlot).toBe('10:30 AM - 11:00 AM');
  });

  it('allows clinic to confirm tentative follow-up appointment', async () => {
    const target = appointments[0];
    expect(target).toBeDefined();

    const res = await as(doctor)
      .put(`/book/${target._id}/confirm`)
      .expect(200);

    expect(res.body.appointment.status).toBe('Confirmed');
  });

  it('allows clinic to reject/cancel tentative follow-up appointment', async () => {
    const target = appointments[1];
    expect(target).toBeDefined();

    const res = await as(doctor)
      .put(`/book/${target._id}/reject`)
      .expect(200);

    expect(res.body.appointment.status).toBe('Cancelled');
  });

  it('includes Tentative status in appointment reminder job scope', () => {
    expect(ACTIVE_STATUSES).toContain('Tentative');
    expect(ACTIVE_STATUSES).toContain('Confirmed');
    expect(ACTIVE_STATUSES).toContain('Pending');
  });

  it('converts IST appointment wall-clock to UTC instant correctly', () => {
    // 10:00 AM IST on 2026-10-20 -> 04:30 UTC
    const instant = appointmentInstant('2026-10-20', '10:00');
    expect(instant).toBeInstanceOf(Date);
    expect(instant.toISOString()).toBe('2026-10-20T04:30:00.000Z');

    // Invalid calendar date rejected
    expect(appointmentInstant('2026-02-31', '10:00')).toBeNull();
  });

  it('validates followup_confirm SMS and WhatsApp notification templates', () => {
    const smsTpl = DEFAULT_NOTIFY_TEMPLATES.find((t) => t.key === 'followup_confirm' && t.channel === 'sms');
    expect(smsTpl).toBeDefined();
    const lint = lintTemplate(smsTpl);
    expect(lint.errors).toHaveLength(0);

    const rendered = renderTemplate(
      smsTpl.body,
      {
        patientName: 'Aarav Sharma',
        doctorName: 'Dr. Mehta',
        date: '2026-10-20',
        time: '11:00 AM',
      },
      smsTpl.variables,
    );
    expect(rendered).toContain('Aarav Sharma');
    expect(rendered).toContain('Dr. Mehta');
    expect(rendered).toContain('2026-10-20');
  });
});
