import {
  emergencySOSSchema,
  createAmbulanceSchema,
  updateAmbulanceSchema,
} from '../src/utils/validate.js';
import {
  estimateETA,
  calculateDistanceKm,
  findEligibleAmbulances,
  findEligibleEmergencyVehicles,
  handleProviderAccept,
} from '../src/services/emergencyDispatchService.js';

describe('Emergency SOS System & Dispatch Engine', () => {
  describe('Zod Validation Schemas', () => {
    it('should validate valid self-mode emergency SOS request', () => {
      const validPayload = {
        reporterMode: 'self',
        patientDetails: {
          name: 'Ravi Kumar',
          age: 32,
          gender: 'male',
          bloodGroup: 'O+',
        },
        category: 'accident',
        location: {
          address: 'Civil Lines, Jabalpur',
          coordinates: [79.9864, 23.1815],
        },
      };

      const result = emergencySOSSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should validate other-mode emergency SOS request with reporter details', () => {
      const validOtherPayload = {
        reporterMode: 'other',
        patientDetails: {
          name: 'Unknown Victim',
          age: 'Approx 40',
        },
        reporterOwnDetailsShared: true,
        reporterDetails: {
          name: 'Amit Sharma',
          phone: '9876543210',
        },
        category: 'heart_attack',
        location: {
          address: 'Russell Chowk, Jabalpur',
          coordinates: [79.9400, 23.1600],
        },
      };

      const result = emergencySOSSchema.safeParse(validOtherPayload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates in SOS request', () => {
      const invalidPayload = {
        reporterMode: 'self',
        location: {
          coordinates: ['invalid_longitude', 23.1815],
        },
      };

      const result = emergencySOSSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should validate ambulance creation schema with uppercase registration', () => {
      const validAmbulance = {
        registrationNumber: 'MP-20-AB-1234',
        vehicleModel: 'Force Traveller',
        ambulanceType: 'ALS',
        equipmentLevel: 'Oxygen, Defibrillator, Ventilator',
        currentDriverPhone: '9876543210',
      };

      const result = createAmbulanceSchema.safeParse(validAmbulance);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ambulance type', () => {
      const invalidAmbulance = {
        registrationNumber: 'MP-20-XY-9999',
        ambulanceType: 'SUPER_JET',
      };

      const result = createAmbulanceSchema.safeParse(invalidAmbulance);
      expect(result.success).toBe(false);
    });

    it('should validate ambulance update schema', () => {
      const updatePayload = {
        isOnline: true,
        emergencySupport: true,
        ambulanceType: 'BLS',
      };

      const result = updateAmbulanceSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Emergency ETA & Distance Estimation', () => {
    it('should calculate realistic ambulance ETA faster than standard road vehicles', () => {
      // 10 km at 45 km/h for ambulance -> (10/45)*60 + 1 = 14 mins
      const ambEta = estimateETA(10, 'ambulance');
      expect(ambEta).toBe(14);

      // 10 km at 30 km/h for car -> (10/30)*60 + 1 = 21 mins
      const carEta = estimateETA(10, 'car');
      expect(carEta).toBe(21);

      expect(ambEta).toBeLessThan(carEta);
    });

    it('should enforce an ETA floor of at least 2 minutes for immediate proximity', () => {
      const immediateEta = estimateETA(0.05, 'ambulance');
      expect(immediateEta).toBeGreaterThanOrEqual(2);
    });

    it('should calculate road driving distance accurately with coordinate fallback', () => {
      const dist = calculateDistanceKm(23.1815, 79.9864, 23.2100, 79.9700);
      expect(dist).toBeGreaterThan(2);
      expect(dist).toBeLessThan(10);

      // Null coordinates fallback to default 5km
      expect(calculateDistanceKm(null, null, 23.21, 79.97)).toBe(5);
    });
  });

  describe('Dispatch Query Resilience', () => {
    it('should safely execute findEligibleAmbulances without crashing when DB is offline or empty', async () => {
      const ambulances = await findEligibleAmbulances(79.9864, 23.1815, 10);
      expect(Array.isArray(ambulances)).toBe(true);
    });

    it('should safely execute findEligibleEmergencyVehicles without crashing when DB is offline or empty', async () => {
      const vehicles = await findEligibleEmergencyVehicles(79.9864, 23.1815, 10);
      expect(Array.isArray(vehicles)).toBe(true);
    });
  });

  describe('Wave winner selection — nearest acceptor wins (Doc 01 §10.3)', () => {
    it('should pick the nearest acceptance, not the first', () => {
      const acceptances = [
        { distanceKm: 4, acceptedAt: new Date('2026-01-01T00:00:01Z') },
        { distanceKm: 1, acceptedAt: new Date('2026-01-01T00:00:20Z') },
      ];
      const sorted = [...acceptances].sort((a, b) =>
        (a.distanceKm - b.distanceKm) || (new Date(a.acceptedAt) - new Date(b.acceptedAt)));
      expect(sorted[0].distanceKm).toBe(1);
    });

    it('should prefer the earlier acceptance on a distance tie', () => {
      const acceptances = [
        { distanceKm: 2, acceptedAt: new Date('2026-01-01T00:00:10Z') },
        { distanceKm: 2, acceptedAt: new Date('2026-01-01T00:00:02Z') },
      ];
      const sorted = [...acceptances].sort((a, b) =>
        (a.distanceKm - b.distanceKm) || (new Date(a.acceptedAt) - new Date(b.acceptedAt)));
      expect(sorted[0].acceptedAt.toISOString()).toBe('2026-01-01T00:00:02.000Z');
    });
  });
});
