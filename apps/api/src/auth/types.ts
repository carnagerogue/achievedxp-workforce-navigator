/**
 * Shape of the JWT payload we issue.
 * Keep this small — every authenticated request decodes it.
 */
export interface JwtPayload {
  /** Subject — the user UUID. */
  sub: string;
  /** Issued-at, in seconds since epoch. Set by @nestjs/jwt. */
  iat?: number;
  /** Expiry, in seconds since epoch. Set by @nestjs/jwt. */
  exp?: number;
}

/** What `req.user` looks like after JwtAuthGuard succeeds. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
}

/** Cookie name used to carry the JWT. */
export const SESSION_COOKIE = 'dxp_session';
