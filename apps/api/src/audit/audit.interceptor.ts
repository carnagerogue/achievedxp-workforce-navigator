import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

import { AuditLogService } from './audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { AuthenticatedUser } from '../auth/types';

/**
 * Global interceptor that records audit entries for handlers decorated
 * with `@AuditAction(...)`. Registered via APP_INTERCEPTOR in
 * AuditModule, so any module can apply the decorator without explicit
 * `@UseInterceptors`.
 *
 * Entry semantics:
 *   - viewerId: req.user.id (the authenticated caller).
 *   - targetUserId: req.params.userId when present, else viewerId. POST
 *     /profile, for example, has no :userId but always operates on the
 *     caller's own row, so logging viewerId == targetUserId is correct.
 *   - route: req.route.path (e.g. "/profile/:userId") — keep the
 *     parameterized form so we can group by endpoint shape, not by
 *     specific UUIDs in the URL.
 *   - Fired AFTER a successful response (rxjs `tap`), so 4xx / 5xx
 *     don't generate noise. Failures inside the audit write itself
 *     are swallowed by the service.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<
        Request & {
          user?: AuthenticatedUser;
          route?: { path?: string };
        }
      >();
    const viewer = req.user;
    if (!viewer) return next.handle(); // unauthenticated routes shouldn't carry @AuditAction

    const paramUserId =
      typeof req.params?.userId === 'string' ? req.params.userId : null;
    const targetUserId = paramUserId ?? viewer.id;

    const route = req.route?.path ?? req.url ?? '';
    const ipAddress = req.ip ?? null;
    const userAgent = req.header('user-agent') ?? null;

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget — don't block the response on the audit write.
        void this.audit.record({
          viewerId: viewer.id,
          targetUserId,
          action,
          route,
          ipAddress,
          userAgent,
        });
      }),
    );
  }
}
