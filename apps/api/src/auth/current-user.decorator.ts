import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from './types';

/**
 * Convenience for pulling the authenticated user off `req.user` in a
 * route handler. Always use this rather than reaching into the request
 * object directly — the type is enforced and the call site is greppable.
 *
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedUser) {
 *     return user;
 *   }
 */
export const CurrentUser = createParamDecorator<unknown, ExecutionContext, AuthenticatedUser>(
  (_data, ctx) => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new Error(
        'CurrentUser used on a route without JwtAuthGuard — req.user is undefined.',
      );
    }
    return req.user;
  },
);
