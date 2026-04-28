import { SetMetadata } from '@nestjs/common';

/**
 * Reflector key used by AuditInterceptor to find handlers that should
 * record an entry in profile_read_log.
 */
export const AUDIT_ACTION_KEY = 'audit:action';

/**
 * Mark a route handler as audit-loggable.
 *
 *   @AuditAction('profile_read')
 *   @UseGuards(JwtAuthGuard, OwnerGuard)
 *   @Get(':userId')
 *   getByUser(...) { ... }
 *
 * The interceptor fires AFTER a successful response, so failed requests
 * (4xx/5xx) don't pollute the log. The action string is the verb the log
 * row records — keep it stable so historical queries don't break.
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
