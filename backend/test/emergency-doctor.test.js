import request from 'supertest';
import app from '../src/index.js';
import EmergencyDoctorRequest from '../src/models/EmergencyDoctorRequest.js';
import Doctor from '../src/models/Doctor.js';

describe('Emergency Doctor Dispatch Engine & API Suite', () => {
  describe('Security & Authentication Gates', () => {
    it('should reject unauthenticated dispatch requests with 401 or 403', async () => {
      const res = await request(app)
        .post('/api/emergency-doctor/dispatch')
        .set('Origin', 'http://localhost:3000')
        .send({ emergencyCategory: 'Cardiovascular / Chest Pain' });
      expect([401, 403]).toContain(res.status);
    });

    it('should reject unauthenticated duty toggle with 401 or 403', async () => {
      const res = await request(app)
        .put('/api/emergency-doctor/toggle-duty')
        .set('Origin', 'http://localhost:3000')
        .send({ isEmergencyDutyActive: true });
      expect([401, 403]).toContain(res.status);
    });

    it('should reject unauthenticated duty status lookup with 401 or 403', async () => {
      const res = await request(app)
        .get('/api/emergency-doctor/duty-status')
        .set('Origin', 'http://localhost:3000');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('Model Schema & Validation Integrity', () => {
    it('should validate valid EmergencyDoctorRequest structure', () => {
      const reqDoc = new EmergencyDoctorRequest({
        bookingId: 'DOC-TEST-001',
        patientId: '507f191e810c19729de860ea',
        patientName: 'Emergency Test Patient',
        patientPhone: '9876543210',
        pickupLocation: {
          type: 'Point',
          coordinates: [79.9864, 23.1815],
        },
        pickupAddress: 'Civil Lines, Jabalpur',
        emergencyCategory: 'Cardiovascular / Chest Pain',
        severity: 'Critical',
        status: 'searching',
      });

      const err = reqDoc.validateSync();
      expect(err).toBeUndefined();
      expect(reqDoc.status).toBe('searching');
      expect(reqDoc.pricing.baseEmergencyFee).toBe(800);
      expect(reqDoc.pricing.totalAmount).toBe(800);
    });

    it('should enforce required fields in EmergencyDoctorRequest', () => {
      const invalidDoc = new EmergencyDoctorRequest({});
      const err = invalidDoc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.bookingId).toBeDefined();
      expect(err.errors.patientId).toBeDefined();
      expect(err.errors.patientName).toBeDefined();
      expect(err.errors.pickupAddress).toBeDefined();
    });

    it('should support Doctor emergency fields and emergencyEquipmentKit', () => {
      const doc = new Doctor({
        name: 'Dr. Test Responder',
        email: 'doc.responder@test.com',
        specialization: 'General Physician',
        emergencySupport: true,
        isEmergencyDutyActive: true,
        emergencyRadiusKm: 15,
        emergencyDoctorLocation: {
          type: 'Point',
          coordinates: [79.9864, 23.1815],
        },
      });

      expect(doc.emergencySupport).toBe(true);
      expect(doc.isEmergencyDutyActive).toBe(true);
      expect(doc.emergencyRadiusKm).toBe(15);
      expect(doc.emergencyEquipmentKit).toContain('BLS Kit');
      expect(doc.emergencyEquipmentKit).toContain('Pulse Oximeter');
    });
  });

  describe('State Machine & Status Transitions', () => {
    it('should allow valid status values in lifecycle', () => {
      const validStatuses = [
        'searching',
        'assigned',
        'en_route',
        'arrived',
        'in_triage',
        'completed',
        'cancelled_by_user',
        'cancelled_by_doctor',
        'escalated_to_ambulance',
        'expired',
      ];

      validStatuses.forEach((status) => {
        const doc = new EmergencyDoctorRequest({
          bookingId: `DOC-${status}-001`,
          patientId: '507f191e810c19729de860ea',
          patientName: 'Test Patient',
          patientPhone: '9876543210',
          pickupLocation: { type: 'Point', coordinates: [79.98, 23.18] },
          pickupAddress: 'Test Location',
          emergencyCategory: 'General Medical Emergency',
          status,
        });
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      });
    });
  });
});
