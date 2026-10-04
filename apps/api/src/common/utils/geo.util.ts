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
