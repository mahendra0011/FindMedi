import {
  estimateETA,
  calculateDistanceKm,
  calculateFare,
  estimateDurationMin,
  findEligibleRiders,
} from '../src/services/rideService.js';

describe('Ride Dispatch & Estimation Engine', () => {
  describe('estimateETA', () => {
    it('should calculate deterministic ETA based on distance and vehicle speed (not random)', () => {
      // 10 km at 35 km/h for bike -> (10/35)*60 + 1 = 17.14 -> 18 mins
      const bikeEta = estimateETA(10, 'bike');
      expect(bikeEta).toBe(18);

      // 10 km at 45 km/h for ambulance -> (10/45)*60 + 1 = 13.33 -> 14 mins
      const ambulanceEta = estimateETA(10, 'ambulance');
      expect(ambulanceEta).toBe(14);

      // 10 km at 30 km/h for car -> (10/30)*60 + 1 = 20 + 1 = 21 mins
      const carEta = estimateETA(10, 'car');
      expect(carEta).toBe(21);
    });

    it('should enforce a minimum ETA floor of 2 minutes', () => {
      const shortEta = estimateETA(0.1, 'bike');
      expect(shortEta).toBeGreaterThanOrEqual(2);
    });

    it('should support legacy pickup lat/lng signature without errors', () => {
      const eta = estimateETA(23.1815, 79.9864, 'ambulance');
      expect(typeof eta).toBe('number');
      expect(eta).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateDistanceKm', () => {
    it('should calculate realistic road driving distance between coordinates', () => {
      // Jabalpur Center (23.1815, 79.9864) to Adhartal (23.2100, 79.9700) ~3.5-5 km road
      const dist = calculateDistanceKm(23.1815, 79.9864, 23.2100, 79.9700);
      expect(dist).toBeGreaterThan(2);
      expect(dist).toBeLessThan(10);
    });

    it('should fallback to 5 km default if coordinates are null', () => {
      expect(calculateDistanceKm(null, null, 23.21, 79.97)).toBe(5);
    });
  });

  describe('calculateFare & estimateDurationMin', () => {
    it('should calculate accurate fare breakdown for bike', () => {
      // Base: 20, perKm: 8, distance: 10km -> 20 + 80 = 100
      const fare = calculateFare('bike', 10, false);
      expect(fare.base).toBe(20);
      expect(fare.distanceCharge).toBe(80);
      expect(fare.surge).toBe(0);
      expect(fare.total).toBe(100);
    });

    it('should include emergency surge for ambulance when isEmergency is true', () => {
      // Base: 150, perKm: 30, surge: 100, distance: 10km -> 150 + 300 + 100 = 550
      const fare = calculateFare('ambulance', 10, true);
      expect(fare.base).toBe(150);
      expect(fare.distanceCharge).toBe(300);
      expect(fare.surge).toBe(100);
      expect(fare.total).toBe(550);
    });

    it('should calculate realistic trip duration based on distance', () => {
      // Ambulance at 45 km/h for 15km -> (15/45)*60 + 3 buffer = 20 + 3 = 23 mins
      const duration = estimateDurationMin(15, 'ambulance');
      expect(duration).toBe(23);
    });
  });

  describe('findEligibleRiders resilience', () => {
    it('should gracefully handle invalid or missing pickup coordinates without crashing', async () => {
      const riders = await findEligibleRiders('car', null, null, false);
      expect(Array.isArray(riders)).toBe(true);
    });
  });
});
