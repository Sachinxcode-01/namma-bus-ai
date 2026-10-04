import { haversineDistance, calculateSpeedKmh, isWithinGeofence } from './geo.util';

describe('geo.util', () => {
  describe('haversineDistance', () => {
    it('should return 0 for identical points', () => {
      const dist = haversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
      expect(dist).toBeCloseTo(0, 4);
    });

    it('should accurately calculate distance between Bangalore MG Road and Majestic (approx 3.5 - 4.5 km)', () => {
      // MG Road: 12.9756, 77.6066
      // Majestic: 12.9767, 77.5713
      const dist = haversineDistance(12.9756, 77.6066, 12.9767, 77.5713);
      expect(dist).toBeGreaterThan(3500);
      expect(dist).toBeLessThan(4500);
    });
  });

  describe('calculateSpeedKmh', () => {
    it('should return 0 when time difference is zero or negative', () => {
      expect(calculateSpeedKmh(12.97, 77.59, 12.98, 77.6, 0)).toBe(0);
      expect(calculateSpeedKmh(12.97, 77.59, 12.98, 77.6, -5)).toBe(0);
    });

    it('should calculate realistic vehicle speed given distance and time', () => {
      // 100 meters in 10 seconds = 10 m/s = 36 km/h
      // ~0.000899 degrees latitude ~ 100 meters
      const lat1 = 12.0;
      const lon1 = 77.0;
      const lat2 = 12.0008993;
      const lon2 = 77.0;
      const speed = calculateSpeedKmh(lat1, lon1, lat2, lon2, 10);
      expect(speed).toBeCloseTo(36, 0);
    });
  });

  describe('isWithinGeofence', () => {
    it('should return true when within geofence radius', () => {
      // Exact same point
      expect(isWithinGeofence(12.9716, 77.5946, 12.9716, 77.5946, 50)).toBe(true);
      // Small shift (~20 meters)
      expect(isWithinGeofence(12.9716, 77.5946, 12.97175, 77.5946, 50)).toBe(true);
    });

    it('should return false when outside geofence radius', () => {
      // Shift ~200 meters away
      expect(isWithinGeofence(12.9716, 77.5946, 12.974, 77.5946, 50)).toBe(false);
    });
  });
});
