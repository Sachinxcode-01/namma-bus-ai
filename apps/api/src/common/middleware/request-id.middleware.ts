import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { REQUEST_ID_HEADER } from '../constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existingId = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof existingId === 'string' && existingId.trim().length > 0
        ? existingId.trim()
        : `req_${uuidv4().replace(/-/g, '')}`;

    req.headers[REQUEST_ID_HEADER] = requestId;
    (req as Request & { id: string; requestId: string }).id = requestId;
    (req as Request & { id: string; requestId: string }).requestId = requestId;

    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
