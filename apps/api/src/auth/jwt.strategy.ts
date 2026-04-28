import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload, SESSION_COOKIE } from './types';

/**
 * JWT strategy that reads the token from our HttpOnly session cookie
 * (NOT from an Authorization header). This is the right choice for a
 * cookie-based session: the token never sits in JS-readable storage,
 * which kills XSS-driven token theft.
 */
function cookieExtractor(req: Request): string | null {
  // `cookie-parser` populates `req.cookies` on the global middleware chain.
  const raw = (req as Request & { cookies?: Record<string, string> }).cookies;
  return raw?.[SESSION_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret === 'change_me_in_prod') {
      // Fail fast at boot rather than later with a confusing 401. The default
      // value from .env.example must never reach a real environment.
      throw new Error(
        'JWT_SECRET is missing or still set to the placeholder. Set a strong secret before starting the API.',
      );
    }
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called once the token signature + expiry have already been verified.
   * Hydrate the user from the DB so route handlers always see a fresh
   * email + displayName, and so a deleted user can't keep using a stale
   * cookie until expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
