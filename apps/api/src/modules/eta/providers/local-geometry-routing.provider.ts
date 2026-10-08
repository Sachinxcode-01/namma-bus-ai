import { Injectable } from '@nestjs/common';
import {
  CoordinatePoint,
  IRoutingProvider,
  RoutingSegmentResult,
} from '../interfaces/routing-provider.interface';
import { haversineDistance, computePolylineDistanceMeters } from '../../../common/utils/geo.util';

/**
 * LocalGeometryRoutingProvider
 * Deterministic, offline, zero-dependency routing provider based on high-precision
 * spherical geometry along ordered route segments and polylines.
 */
@Injectable()
export class LocalGeometryRoutingProvider implements IRoutingProvider {
  async getSegmentDistance(
    origin: CoordinatePoint,
    destination: CoordinatePoint,
  ): Promise<RoutingSegmentResult> {
    const distanceMeters = haversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );
    return { distanceMeters };
  }

  async getRouteDistance(points: CoordinatePoint[]): Promise<RoutingSegmentResult> {
    const distanceMeters = computePolylineDistanceMeters(points);
    return { distanceMeters };
  }
}
