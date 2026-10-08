import { GpsDeduplicationService } from './gps-deduplication.service';

describe('GpsDeduplicationService', () => {
  let service: GpsDeduplicationService;

  beforeEach(() => {
    service = new GpsDeduplicationService();
  });

  it('should accept first ping for a trip', () => {
    const result = service.check('trip-1', 12.9716, 77.5946, new Date());
    expect(result.isDuplicate).toBe(false);
    expect(result.isJitterSuppressed).toBe(false);
  });

  it('should suppress exact duplicate ping with identical coordinates and timestamp', () => {
    const timestamp = new Date();
    service.check('trip-1', 12.9716, 77.5946, timestamp);

    const duplicate = service.check('trip-1', 12.9716, 77.5946, timestamp);
    expect(duplicate.isDuplicate).toBe(true);
    expect(duplicate.isJitterSuppressed).toBe(false);
  });

  it('should suppress stationary micro-jitter under 2 meters in under 500ms', () => {
    const t1 = new Date();
    service.check('trip-1', 12.9716, 77.5946, t1);

    // 0.5 meters away 200ms later
    const t2 = new Date(t1.getTime() + 200);
    const result = service.check('trip-1', 12.971602, 77.594602, t2);

    expect(result.isDuplicate).toBe(false);
    expect(result.isJitterSuppressed).toBe(true);
  });

  it('should allow legitimate movement with significant displacement', () => {
    const t1 = new Date();
    service.check('trip-1', 12.9716, 77.5946, t1);

    // 20 meters away 2 seconds later
    const t2 = new Date(t1.getTime() + 2000);
    const result = service.check('trip-1', 12.9718, 77.5948, t2);

    expect(result.isDuplicate).toBe(false);
    expect(result.isJitterSuppressed).toBe(false);
  });

  it('should clear cached pings when trip ends', () => {
    const timestamp = new Date();
    service.check('trip-1', 12.9716, 77.5946, timestamp);
    service.clearTrip('trip-1');

    // Should not be considered duplicate after clearing
    const result = service.check('trip-1', 12.9716, 77.5946, timestamp);
    expect(result.isDuplicate).toBe(false);
  });
});
