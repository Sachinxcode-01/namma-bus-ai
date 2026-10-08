import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CoordinatePoint,
  IRoutingProvider,
  RoutingSegmentResult,
} from '../interfaces/routing-provider.interface';
import { LocalGeometryRoutingProvider } from './local-geometry-routing.provider';
import { ETA_CONFIG } from '../constants/eta.constants';

/**
 * OsrmRoutingProvider
 * Connects to an external or self-hosted OpenStreetMap/OSRM instance for road-network distances.
 * Implements strict timeouts, defensive error recovery, and seamless fallback to
 * LocalGeometryRoutingProvider to ensure high availability without external hard dependencies.
 */
@Injectable()
export class OsrmRoutingProvider implements IRoutingProvider {
  private readonly logger = new Logger(OsrmRoutingProvider.name);
  private readonly osrmBaseUrl: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly localFallback: LocalGeometryRoutingProvider,
  ) {
    this.osrmBaseUrl = this.configService.get<string>('OSRM_BASE_URL') || null;
    if (this.osrmBaseUrl) {
      this.logger.log(`OSRM routing provider configured with endpoint: ${this.osrmBaseUrl}`);
    } else {
      this.logger.log(
        'OSRM_BASE_URL not set; using deterministic LocalGeometryRoutingProvider as primary.',
      );
    }
  }

  async getSegmentDistance(
    origin: CoordinatePoint,
    destination: CoordinatePoint,
  ): Promise<RoutingSegmentResult> {
    if (!this.osrmBaseUrl) {
      return this.localFallback.getSegmentDistance(origin, destination);
    }

    try {
      // OSRM coordinates format: {lon},{lat};{lon},{lat}
      const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const url = `${this.osrmBaseUrl}/route/v1/driving/${coords}?overview=false`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        ETA_CONFIG.ROUTING_PROVIDER_TIMEOUT_MS,
      );

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM HTTP status ${response.status}`);
      }

      const data = (await response.json()) as {
        routes?: Array<{ distance: number; duration: number }>;
      };
      if (data.routes && data.routes.length > 0) {
        return {
          distanceMeters: data.routes[0].distance,
          durationSeconds: data.routes[0].duration,
        };
      }

      return this.localFallback.getSegmentDistance(origin, destination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `OSRM routing request failed (${message}). Falling back to local spherical geometry.`,
      );
      return this.localFallback.getSegmentDistance(origin, destination);
    }
  }

  async getRouteDistance(points: CoordinatePoint[]): Promise<RoutingSegmentResult> {
    if (!this.osrmBaseUrl || points.length < 2) {
      return this.localFallback.getRouteDistance(points);
    }

    try {
      const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
      const url = `${this.osrmBaseUrl}/route/v1/driving/${coords}?overview=false`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        ETA_CONFIG.ROUTING_PROVIDER_TIMEOUT_MS,
      );

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM HTTP status ${response.status}`);
      }

      const data = (await response.json()) as {
        routes?: Array<{ distance: number; duration: number }>;
      };
      if (data.routes && data.routes.length > 0) {
        return {
          distanceMeters: data.routes[0].distance,
          durationSeconds: data.routes[0].duration,
        };
      }

      return this.localFallback.getRouteDistance(points);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `OSRM polyline request failed (${message}). Falling back to local spherical geometry.`,
      );
      return this.localFallback.getRouteDistance(points);
    }
  }
}
