import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: { include: { convictions: true } } },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // Drop the password hash before returning, then decrypt the profile's
    // PII fields so callers see plaintext. Convictions live one level
    // deeper but only `notes` is encrypted there.
    const { passwordHash: _omit, profile, ...safeUser } = user;
    if (!profile) return safeUser;

    return {
      ...safeUser,
      profile: {
        ...profile,
        firstName:    this.enc.decrypt(profile.firstName),
        lastName:     this.enc.decrypt(profile.lastName),
        phone:        this.enc.decrypt(profile.phone),
        locationCity: this.enc.decrypt(profile.locationCity),
        convictions: profile.convictions.map((c) => ({
          ...c,
          notes: this.enc.decrypt(c.notes),
        })),
      },
    };
  }
}
