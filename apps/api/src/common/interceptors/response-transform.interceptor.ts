import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../types';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | T
> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T> | T> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();

    // Skip wrapping for Swagger docs and raw redirects/buffers
    if (req.url && (req.url.startsWith('/docs') || req.url.startsWith('/favicon.ico'))) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already an envelope with success flag, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          typeof (data as Record<string, unknown>).success === 'boolean'
        ) {
          return data;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
