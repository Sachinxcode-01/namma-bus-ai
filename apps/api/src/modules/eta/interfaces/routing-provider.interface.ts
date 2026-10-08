export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

export interface RoutingSegmentResult {
  distanceMeters: number;
  durationSeconds?: number;
}

export interface IRoutingProvider {
  /**
   * Calculates the road/route travel distance and estimated duration between two points.
   */
  getSegmentDistance(
    origin: CoordinatePoint,
    destination: CoordinatePoint,
  ): Promise<RoutingSegmentResult>;

  /**
   * Calculates the road/route travel distance and duration across a multi-point polyline.
   */
  getRouteDistance(points: CoordinatePoint[]): Promise<RoutingSegmentResult>;
}

export const ROUTING_PROVIDER = Symbol('ROUTING_PROVIDER');
