import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Lightweight pre-shared-key guard for admin/operator endpoints.
 *
 * Behavior:
 *   - If `ADMIN_API_KEY` env var is unset, the guard ALLOWS the request.
 *     This preserves the current dev-time behavior of `/ingestion/run`
 *     being open and lets local pnpm-up workflows keep working.
 *   - If `ADMIN_API_KEY` IS set, the request must carry it via either:
 *       x-admin-api-key: <key>
 *       Authorization: Bearer <key>
 *     Anything else returns 401.
 *
 * The guard intentionally avoids logging the expected key on mismatch.
 * Constant-time string comparison prevents leaking the key length /
 * common-prefix info via timing.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_API_KEY');
    if (!expected) return true; // dev mode — open

    const req = ctx.switchToHttp().getRequest<Request>();
    const headerKey = req.header('x-admin-api-key') ?? extractBearer(req.header('authorization'));

    if (!headerKey || !timingSafeEqual(headerKey, expected)) {
      throw new UnauthorizedException(
        'Admin authentication required. Pass `x-admin-api-key` or `Authorization: Bearer <key>`.',
      );
    }
    return true;
  }
}

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Constant-time string compare. Returns false on length mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
