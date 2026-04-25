import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ConvictionInputDto } from './dto/conviction.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: UpsertProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const { userId, convictions, ...profileFields } = dto;

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileFields },
        update: profileFields,
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

      return tx.userProfile.findUnique({
        where: { id: profile.id },
        include: { convictions: true },
      });
    });
  }

  findByUser(userId: string) {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      include: { convictions: true },
    });
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
      notes: c.notes ?? null,
    };
  }
}
