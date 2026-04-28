import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from './types';

/**
 * Argon2id parameters.
 *
 * These values follow OWASP's 2024 Password Storage Cheat Sheet for
 * argon2id: 19 MiB memory, 2 iterations, 1 lane. The defaults from
 * `argon2` ship lower memory; we override deliberately so the cost is
 * explicit and reviewable.
 *
 * On a typical container these settings hash in 30–60ms — slow enough to
 * make brute-force expensive, fast enough that a login round-trip stays
 * snappy.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ───────────────────────── public API ─────────────────────────

  async register(dto: { email: string; password: string; displayName?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName ?? null,
        passwordHash,
      },
      select: { id: true, email: true, displayName: true },
    });
    const token = this.signToken(user.id);
    return { user, token };
  }

  /**
   * Verify credentials. Always perform an argon2 verify even when the
   * email isn't found — otherwise the response time leaks whether an
   * email is registered.
   */
  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });

    // Constant-time-ish: always run a verify so we don't leak account existence.
    const fakeHash = await this.dummyHash();
    const targetHash = user?.passwordHash ?? fakeHash;
    let ok = false;
    try {
      ok = await argon2.verify(targetHash, dto.password);
    } catch {
      ok = false;
    }

    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');

    if (user.passwordHash === null) {
      // Shouldn't reach here because argon2 verify against fakeHash would
      // have failed, but be explicit: pre-auth accounts must claim first.
      throw new ConflictException('This account has no password yet — use /auth/claim to set one.');
    }

    const safe: AuthenticatedUser = {
      id: user.id, email: user.email, displayName: user.displayName,
    };
    const token = this.signToken(safe.id);
    return { user: safe, token };
  }

  /**
   * Set a password on an account that was created during the pre-auth
   * phase (passwordHash is null). One-shot — once a hash exists the
   * caller must use /auth/login or a future password-reset flow.
   */
  async claim(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('No account with that email.');
    if (user.passwordHash !== null) {
      throw new ConflictException('This account already has a password — use /auth/login.');
    }
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    const safe: AuthenticatedUser = {
      id: user.id, email: user.email, displayName: user.displayName,
    };
    const token = this.signToken(safe.id);
    return { user: safe, token };
  }

  // ───────────────────────── internals ─────────────────────────

  private signToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwt.sign(payload);
  }

  /**
   * Cached dummy argon2 hash so `login()` can verify against *something*
   * when the email lookup misses. Without this the response time for
   * "unknown email" (skip verify) vs. "known email, wrong password"
   * (full verify) is dramatically different and leaks account existence.
   */
  private dummyHashCache: string | null = null;
  private async dummyHash(): Promise<string> {
    if (!this.dummyHashCache) {
      this.dummyHashCache = await argon2.hash('not-a-real-password-' + Math.random(), ARGON2_OPTIONS);
    }
    return this.dummyHashCache;
  }
}
