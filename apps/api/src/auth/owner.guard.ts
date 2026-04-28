import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from './types';

/**
 * Enforce that the route's `:userId` path parameter matches the
 * authenticated user. Layer this AFTER `JwtAuthGuard`:
 *
 *   @UseGuards(JwtAuthGuard, OwnerGuard)
 *   @Get(':userId')
 *
 * If the authenticated user is trying to read or modify someone else's
 * data, throw 403. The 403 (vs 404) is intentional: it tells the caller
 * "this exists but isn't yours" only after they've already authenticated,
 * so it's not an enumeration leak — they already proved ownership of an
 * account when they got their JWT.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; params: Record<string, string> }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required.');

    const paramUserId = req.params?.userId;
    if (!paramUserId) {
      // No :userId param means there's nothing to enforce ownership against
      // — the developer applied this guard to the wrong route. Fail closed
      // rather than silently passing.
      throw new ForbiddenException('OwnerGuard requires a :userId route param.');
    }
    if (paramUserId !== user.id) {
      throw new ForbiddenException('You can only access your own account.');
    }
    return true;
  }
}
