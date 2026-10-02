import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../errors/app.exception';
import { ApiErrorResponse } from '../types';
import { REQUEST_ID_HEADER } from '../constants';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string; requestId?: string }>();

    const requestId =
      request.id ||
      request.requestId ||
      (request.headers[REQUEST_ID_HEADER] as string) ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: unknown = undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.httpStatusToErrorCode(status);
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        code =
          typeof resObj.error === 'string'
            ? resObj.error.toUpperCase().replace(/\s+/g, '_')
            : this.httpStatusToErrorCode(status);

        // ValidationPipe formatting
        if (Array.isArray(resObj.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Input validation failed.';
          details = resObj.message;
        }
      }
    } else if (this.isPrismaError(exception)) {
      const prismaError = exception as { code: string; meta?: Record<string, unknown> };
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        const target = (prismaError.meta?.target as string[])?.join(', ') || 'resource';
        message = `Unique constraint failed on field(s): ${target}`;
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Requested record was not found.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = 'DATABASE_ERROR';
        message = 'A database operation error occurred.';
      }
    } else if (exception instanceof Error) {
      message =
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected internal server error occurred.'
          : exception.message;
    }

    // Structured logging
    const logPayload = {
      requestId,
      method: request.method,
      path: request.url,
      statusCode: status,
      errorCode: code,
      errorMessage: exception instanceof Error ? exception.message : String(exception),
    };

    if (status >= 500) {
      this.logger.error(
        JSON.stringify(logPayload),
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(JSON.stringify(logPayload));
    }

    const errorBody: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        requestId,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorBody);
  }

  private isPrismaError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const err = error as { code: unknown };
      return typeof err.code === 'string' && err.code.startsWith('P');
    }
    return false;
  }

  private httpStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
