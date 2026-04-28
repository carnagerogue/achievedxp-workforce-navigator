import { Injectable, NotFoundException } from '@nestjs/common';
import type { Conviction, UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ConvictionInputDto } from './dto/conviction.dto';

/**
 * Fields encrypted at rest via EncryptionService.
 *
 * Criteria for inclusion:
 *   - Identifying or sensitive personal info
 *   - NOT used in any WHERE clause or equality comparison
 *
 * Excluded on purpose:
 *   - locationRegion / locationPostalCode — used as filter or equality in
 *     /jobs and rule.scorer respectively. Encrypting them would either
 *     break those queries or force decrypt on every row in a hot path.
 *   - Conviction fields like offenseType, convictionYear, releaseYear —
 *     used as enum filters and in scoring math.
 */
const PROFILE_ENCRYPTED_FIELDS = ['firstName', 'lastName', 'phone', 'locationCity'] as const;
type ProfileEncryptedField = (typeof PROFILE_ENCRYPTED_FIELDS)[number];

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const { convictions, ...profileFields } = dto;
    const encryptedFields = this.encryptProfileFields(profileFields);

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...encryptedFields },
        update: encryptedFields,
      });

      // Convictions are replaced atomically when the caller provides the
      // field. Omitting `convictions` leaves the existing set intact —
      // that's important for partial profile updates.
      if (convictions !== undefined) {
        await tx.conviction.deleteMany({ where: { profileId: profile.id } });
        if (convictions.length > 0) {
          await tx.conviction.createMany({
            data: convictions.map((c) => this.normalizeConviction(profile.id, c)),
          });
        }
      }

      const fresh = await tx.userProfile.findUnique({
        where: { id: profile.id },
        include: { convictions: true },
      });
      return fresh ? this.decryptProfile(fresh) : null;
    });
  }

  async findByUser(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { convictions: true },
    });
    return profile ? this.decryptProfile(profile) : null;
  }

  // ───────────────────────── encryption helpers ─────────────────────────

  /**
   * Encrypt the at-rest-sensitive subset of an UpsertProfile payload.
   * Untouched keys are passed through unchanged so the caller can spread
   * the result into a Prisma create/update without losing fields.
   */
  private encryptProfileFields<T extends Partial<Record<ProfileEncryptedField, string | null | undefined>>>(
    input: T,
  ): T {
    const out = { ...input };
    for (const field of PROFILE_ENCRYPTED_FIELDS) {
      if (field in out) {
        const v = out[field];
        // Only re-encrypt plaintext values. Idempotent if a caller ever
        // passes already-encrypted strings (e.g. during the migration).
        if (v != null && typeof v === 'string' && !this.enc.isEncrypted(v)) {
          (out as Record<string, unknown>)[field] = this.enc.encrypt(v);
        }
      }
    }
    return out;
  }

  private decryptProfile(
    profile: UserProfile & { convictions: Conviction[] },
  ): UserProfile & { convictions: Conviction[] } {
    return {
      ...profile,
      firstName:    this.enc.decrypt(profile.firstName),
      lastName:     this.enc.decrypt(profile.lastName),
      phone:        this.enc.decrypt(profile.phone),
      locationCity: this.enc.decrypt(profile.locationCity),
      convictions: profile.convictions.map((c) => ({
        ...c,
        notes: this.enc.decrypt(c.notes),
      })),
    };
  }

  private normalizeConviction(profileId: string, c: ConvictionInputDto) {
    return {
      profileId,
      category: c.category,
      offenseType: c.offenseType,
      convictionYear: c.convictionYear ?? null,
      releaseYear: c.releaseYear ?? null,
      currentlyIncarcerated: c.currentlyIncarcerated ?? false,
      onParole: c.onParole ?? false,
      onProbation: c.onProbation ?? false,
      supervisionEndDate: c.supervisionEndDate ? new Date(c.supervisionEndDate) : null,
      // Accept either the new `registryStatus` field or the legacy
      // `sexOffenderRegistry` alias for one release cycle.
      registryStatus: c.registryStatus ?? c.sexOffenderRegistry ?? false,
      notes: c.notes ? this.enc.encrypt(c.notes) : null,
    };
  }
}
