import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string | number) {
    const msg = identifier
      ? `${resource} with identifier '${identifier}' was not found.`
      : `${resource} was not found.`;
    super('NOT_FOUND', msg, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, HttpStatus.CONFLICT, details);
  }
}

export class ValidationException extends AppException {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 'Input validation failed', HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}
