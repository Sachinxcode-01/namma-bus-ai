import { GpsValidatorService } from './gps-validator.service';
import { ValidationException } from '../../../common/errors/app.exception';
import { GpsAccuracyQuality, MovementClassification } from '../constants/gps.constants';

describe('GpsValidatorService', () => {
  let validator: GpsValidatorService;

  beforeEach(() => {
    validator = new GpsValidatorService();
  });

  describe('validateCoordinates', () => {
    it('should accept valid geographic coordinates', () => {
      expect(() => validator.validateCoordinates(12.9716, 77.5946)).not.toThrow();
      expect(() => validator.validateCoordinates(0, 0)).not.toThrow();
      expect(() => validator.validateCoordinates(-90, -180)).not.toThrow();
      expect(() => validator.validateCoordinates(90, 180)).not.toThrow();
    });

    it('should reject latitude out of bounds', () => {
      expect(() => validator.validateCoordinates(90.1, 77.59)).toThrow(ValidationException);
      expect(() => validator.validateCoordinates(-90.1, 77.59)).toThrow(ValidationException);
    });

    it('should reject longitude out of bounds', () => {
      expect(() => validator.validateCoordinates(12.97, 180.5)).toThrow(ValidationException);
      expect(() => validator.validateCoordinates(12.97, -180.5)).toThrow(ValidationException);
    });

    it('should reject NaN or Infinite values', () => {
      expect(() => validator.validateCoordinates(NaN, 77.59)).toThrow(ValidationException);
      expect(() => validator.validateCoordinates(12.97, NaN)).toThrow(ValidationException);
      expect(() => validator.validateCoordinates(Infinity, 77.59)).toThrow(ValidationException);
      expect(() => validator.validateCoordinates(12.97, -Infinity)).toThrow(ValidationException);
    });
  });

  describe('evaluateAccuracy', () => {
    it('should classify accuracy tiers correctly', () => {
      expect(validator.evaluateAccuracy(5.0)).toBe(GpsAccuracyQuality.EXCELLENT);
      expect(validator.evaluateAccuracy(10.0)).toBe(GpsAccuracyQuality.EXCELLENT);
      expect(validator.evaluateAccuracy(25.0)).toBe(GpsAccuracyQuality.ACCEPTABLE);
      expect(validator.evaluateAccuracy(50.0)).toBe(GpsAccuracyQuality.ACCEPTABLE);
      expect(validator.evaluateAccuracy(75.0)).toBe(GpsAccuracyQuality.POOR);
      expect(validator.evaluateAccuracy(undefined)).toBe(GpsAccuracyQuality.UNKNOWN);
      expect(validator.evaluateAccuracy(null)).toBe(GpsAccuracyQuality.UNKNOWN);
    });

    it('should reject negative accuracy', () => {
      expect(() => validator.evaluateAccuracy(-1)).toThrow(ValidationException);
    });

    it('should reject accuracy exceeding 200m rejection threshold', () => {
      expect(() => validator.evaluateAccuracy(201)).toThrow(ValidationException);
    });
  });

  describe('validateSpeed', () => {
    it('should accept valid speeds up to 120 km/h', () => {
      expect(() => validator.validateSpeed(0)).not.toThrow();
      expect(() => validator.validateSpeed(60)).not.toThrow();
      expect(() => validator.validateSpeed(120)).not.toThrow();
      expect(() => validator.validateSpeed(undefined)).not.toThrow();
    });

    it('should reject speeds exceeding 120 km/h', () => {
      expect(() => validator.validateSpeed(121)).toThrow(ValidationException);
    });

    it('should reject negative speed', () => {
      expect(() => validator.validateSpeed(-5)).toThrow(ValidationException);
    });
  });

  describe('validateHeading', () => {
    it('should accept bearings between 0 and 360', () => {
      expect(() => validator.validateHeading(0)).not.toThrow();
      expect(() => validator.validateHeading(180)).not.toThrow();
      expect(() => validator.validateHeading(360)).not.toThrow();
      expect(() => validator.validateHeading(undefined)).not.toThrow();
    });

    it('should reject bearings outside 0 to 360', () => {
      expect(() => validator.validateHeading(-1)).toThrow(ValidationException);
      expect(() => validator.validateHeading(361)).toThrow(ValidationException);
    });
  });

  describe('validateTimestampFreshness', () => {
    it('should accept timestamps within 60s future skew and 10m age', () => {
      const now = Date.now();
      expect(() => validator.validateTimestampFreshness(new Date(now + 15_000), now)).not.toThrow();
      expect(() => validator.validateTimestampFreshness(new Date(now - 60_000), now)).not.toThrow();
    });

    it('should reject future timestamps beyond 60s clock skew', () => {
      const now = Date.now();
      expect(() => validator.validateTimestampFreshness(new Date(now + 65_000), now)).toThrow(
        ValidationException,
      );
    });

    it('should reject stale timestamps older than 10 minutes', () => {
      const now = Date.now();
      expect(() => validator.validateTimestampFreshness(new Date(now - 605_000), now)).toThrow(
        ValidationException,
      );
    });
  });

  describe('evaluateMovement', () => {
    const prevLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      timestamp: new Date('2026-10-08T10:00:00.000Z'),
    };

    it('should classify normal plausible movement as VALID', () => {
      const result = validator.evaluateMovement(
        {
          latitude: 12.972,
          longitude: 77.595,
          timestamp: new Date('2026-10-08T10:00:10.000Z'),
          accuracy: 5,
        },
        prevLocation,
      );

      expect(result.isValid).toBe(true);
      expect(result.classification).toBe(MovementClassification.VALID);
      expect(result.signalQuality).toBe(GpsAccuracyQuality.EXCELLENT);
    });

    it('should reject impossible teleportation jump (> 160 km/h within 120s)', () => {
      // Point 5 km away in 10 seconds = 1800 km/h
      expect(() =>
        validator.evaluateMovement(
          {
            latitude: 13.015,
            longitude: 77.625,
            timestamp: new Date('2026-10-08T10:00:10.000Z'),
          },
          prevLocation,
        ),
      ).toThrow(ValidationException);
    });

    it('should classify rapid velocity (> 95 km/h <= 160 km/h) as SUSPICIOUS', () => {
      // Displacement ~300 meters in 10 seconds = 108 km/h
      const result = validator.evaluateMovement(
        {
          latitude: 12.9743,
          longitude: 77.5946,
          timestamp: new Date('2026-10-08T10:00:10.000Z'),
        },
        prevLocation,
      );

      expect(result.isValid).toBe(true);
      expect(result.classification).toBe(MovementClassification.SUSPICIOUS);
    });

    it('should detect micro-movement under 2m as duplicate / jitter', () => {
      const result = validator.evaluateMovement(
        {
          latitude: 12.971601,
          longitude: 77.594601,
          timestamp: new Date('2026-10-08T10:00:01.000Z'),
        },
        prevLocation,
      );

      expect(result.isDuplicate).toBe(true);
    });
  });
});
