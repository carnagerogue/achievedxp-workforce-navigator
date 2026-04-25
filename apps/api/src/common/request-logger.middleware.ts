import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Minimal request/response logger.
 * Emits ONE line per HTTP exchange with: method, path, status, ms, reqId.
 * A request id is assigned on entry and echoed back in `x-request-id` so
 * clients can correlate errors in their own logs with ours.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly log = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const reqId =
      (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
      randomUUID();
    res.setHeader('x-request-id', reqId);
    (req as Request & { requestId: string }).requestId = reqId;

    const started = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - started;
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} · ${ms}ms · ${reqId}`;
      if (res.statusCode >= 500)      this.log.error(line);
      else if (res.statusCode >= 400) this.log.warn(line);
      else                            this.log.log(line);
    });

    next();
  }
}
