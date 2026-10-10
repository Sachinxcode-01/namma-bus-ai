import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * SseExceptionFilter
 * Catches exceptions in SSE endpoints and serializes clean responses.
 * If headers were already committed, emits an SSE error event frame.
 * If headers were not yet committed, returns structured JSON.
 */
@Catch()
export class SseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        code = (resObj.errorCode as string) || (resObj.error as string) || exception.name;
        message = (resObj.errorMessage as string) || (resObj.message as string) || exception.message;
      } else {
        message = String(res);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.warn(`SSE Exception on ${request.method} ${request.url} [${status}]: ${message}`);

    // If HTTP headers have already been sent for the SSE stream, write an SSE error frame
    if (response.headersSent) {
      try {
        const errorFrame = `event: error\ndata: ${JSON.stringify({
          code,
          message,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        response.write(errorFrame);
        response.end();
      } catch (err: unknown) {
        this.logger.error('Failed to write SSE error frame to client socket', err);
      }
      return;
    }

    // Standard JSON response before streaming starts
    response.status(status).json({
      statusCode: status,
      errorCode: code,
      errorMessage: message,
      timestamp: new Date().toISOString(),
    });
  }
}
