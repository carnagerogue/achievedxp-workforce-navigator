import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

/**
 * Authentication service.
 *
 * Password hashing: SHA-256 with a site-specific prefix — matches the
 * deterministic placeholder in users.service.ts.  Phase 8 will replace
 * both with argon2id; the API surface stays identical.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Hashing (Phase-1 placeholder, replace with argon2 in Phase 8) ───
  private hash(pw: string): string {
    return createHash('sha256').update(`dxp:${pw}`).digest('hex');
  }

  // ─── Register ────────────────────────────────────────────────────────
  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ id: string; email: string; displayName: string | null; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered.');

    const user = await this.prisma.user.create({
      data: { email, passwordHash: this.hash(password), displayName: displayName ?? null },
      select: { id: true, email: true, displayName: true },
    });

    // Auto-create a blank profile so onboarding can upsert immediately.
    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { ...user, token };
  }

  // ─── Login ───────────────────────────────────────────────────────────
  async login(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string; displayName: string | null; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== this.hash(password)) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const { passwordHash: _omit, ...safe } = user;
    const token = this.jwt.sign({ sub: safe.id, email: safe.email });
    return { ...safe, token };
  }

  // ─── Me ──────────────────────────────────────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            locationCity: true,
            locationRegion: true,
            riasecRealistic: true,
            riasecInvestigative: true,
            riasecArtistic: true,
            riasecSocial: true,
            riasecEnterprising: true,
            riasecConventional: true,
            riasecCompletedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }
}
