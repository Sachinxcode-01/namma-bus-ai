import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

/**
 * RouteCodeValidationPipe
 * Validates that routeCode parameter matches whitelist regex pattern ^[A-Z0-9-]{2,16}$
 * Prevents injection attacks and malformed input on real-time stream subscriptions.
 */
@Injectable()
export class RouteCodeValidationPipe implements PipeTransform<string, string> {
  private static readonly ROUTE_CODE_REGEX = /^[A-Z0-9-]{2,16}$/;

  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('routeCode parameter is required and must be a string');
    }

    const trimmed = value.trim().toUpperCase();

    if (!RouteCodeValidationPipe.ROUTE_CODE_REGEX.test(trimmed)) {
      throw new BadRequestException(
        `Invalid routeCode: "${value}". Must be 2-16 uppercase alphanumeric characters or hyphens (e.g., ROUTE-A, RTE-01).`,
      );
    }

    return trimmed;
  }
}
