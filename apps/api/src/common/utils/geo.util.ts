/**
 * Geographic and Spatial Utilities
 * Implements high-precision Haversine distance, speed calculation, and geofence evaluation.
 */

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in meters
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates speed in kilometers per hour given two coordinates and elapsed time in seconds.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @param timeDiffSeconds Elapsed time in seconds
 * @returns Speed in km/h
 */
export function calculateSpeedKmh(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  timeDiffSeconds: number,
): number {
  if (timeDiffSeconds <= 0) {
    return 0;
  }
  const distanceMeters = haversineDistance(lat1, lon1, lat2, lon2);
  const speedMps = distanceMeters / timeDiffSeconds;
  return speedMps * 3.6;
}

/**
 * Determines whether a position is within the geofence perimeter of a target point.
 * @param currentLat Current latitude
 * @param currentLon Current longitude
 * @param targetLat Target (e.g. stop) latitude
 * @param targetLon Target (e.g. stop) longitude
 * @param radiusMeters Geofence radius in meters (default 50m)
 */
export function isWithinGeofence(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters = 50.0,
): boolean {
  const distance = haversineDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radiusMeters;
}

export interface SegmentProjectionResult {
  fraction: number;
  projectedLat: number;
  projectedLon: number;
  perpendicularDistanceMeters: number;
  remainingSegmentDistanceMeters: number;
}

/**
 * Projects a geographic point onto a line segment defined by two coordinates.
 * Returns the fractional progress t in [0, 1], projected coordinate, perpendicular distance,
 * and distance remaining from the projected point to the segment end.
 */
export function projectPointOnSegment(
  pointLat: number,
  pointLon: number,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): SegmentProjectionResult {
  const segmentLengthMeters = haversineDistance(startLat, startLon, endLat, endLon);
  if (segmentLengthMeters < 0.1) {
    return {
      fraction: 0,
      projectedLat: startLat,
      projectedLon: startLon,
      perpendicularDistanceMeters: haversineDistance(pointLat, pointLon, startLat, startLon),
      remainingSegmentDistanceMeters: 0,
    };
  }

  const midLatRad = ((startLat + endLat) / 2) * (Math.PI / 180);
  const metersPerLatDeg = (EARTH_RADIUS_METERS * Math.PI) / 180;
  const metersPerLonDeg = metersPerLatDeg * Math.cos(midLatRad);

  const dx = (endLon - startLon) * metersPerLonDeg;
  const dy = (endLat - startLat) * metersPerLatDeg;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    return {
      fraction: 0,
      projectedLat: startLat,
      projectedLon: startLon,
      perpendicularDistanceMeters: haversineDistance(pointLat, pointLon, startLat, startLon),
      remainingSegmentDistanceMeters: 0,
    };
  }

  const pdx = (pointLon - startLon) * metersPerLonDeg;
  const pdy = (pointLat - startLat) * metersPerLatDeg;

  let fraction = (pdx * dx + pdy * dy) / segLenSq;
  fraction = Math.max(0, Math.min(1, fraction));

  const projectedLat = startLat + fraction * (endLat - startLat);
  const projectedLon = startLon + fraction * (endLon - startLon);

  const perpendicularDistanceMeters = haversineDistance(
    pointLat,
    pointLon,
    projectedLat,
    projectedLon,
  );
  const remainingSegmentDistanceMeters = haversineDistance(
    projectedLat,
    projectedLon,
    endLat,
    endLon,
  );

  return {
    fraction,
    projectedLat,
    projectedLon,
    perpendicularDistanceMeters,
    remainingSegmentDistanceMeters,
  };
}

/**
 * Computes the cumulative distance along an ordered sequence of coordinates in meters.
 */
export function computePolylineDistanceMeters(
  points: Array<{ latitude: number; longitude: number }>,
): number {
  if (points.length < 2) {
    return 0;
  }
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += haversineDistance(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude,
    );
  }
  return totalDistance;
}
