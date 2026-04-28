import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Stop-gap guard for admin/ops routes (ingestion triggers, classifier
 * backfills, salary cleanups). Requires an `Authorization: Bearer <token>`
 * header that exactly matches the `ADMIN_TOKEN` env var.
 *
 * Failure modes:
 *   - `ADMIN_TOKEN` unset → 503 (route is intentionally disabled).
 *   - Header missing or mismatched → 403.
 *
 * Why a separate guard rather than role-on-user: this set of routes has
 * no per-user identity (it's "ops"), and the ops account isn't a real
 * user that should be browsing the site. A token in env keeps it out of
 * the user table and out of any password-reset surface.
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_TOKEN');
    if (!expected || expected.length < 16) {
      throw new ServiceUnavailableException(
        'Admin endpoints are disabled — ADMIN_TOKEN is not set on the API.',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.header('authorization') ?? '';
    const provided = /^Bearer\s+(.+)$/i.exec(header)?.[1] ?? '';
    if (!provided || !timingSafeEquals(provided, expected)) {
      throw new ForbiddenException('Invalid admin token.');
    }
    return true;
  }
}

/**
 * Constant-time string comparison so the response time of a wrong token
 * doesn't reveal how many leading characters the attacker got right.
 */
function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
