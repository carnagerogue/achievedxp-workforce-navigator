import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Default authenticated guard. Apply with `@UseGuards(JwtAuthGuard)` on
 * any route that requires a logged-in user; the request handler then
 * receives `req.user` as an `AuthenticatedUser`.
 *
 * Pair with `OwnerGuard` (or a manual `req.user.id === param.userId`
 * check) on routes that operate on a specific user's data.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
