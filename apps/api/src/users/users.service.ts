import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { createHash } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // NOTE: Phase 8 will replace this with argon2. A deterministic placeholder
  // keeps the table populated and login flows wirable without pulling a
  // native dep during Phase 1.
  private hashPassword(password: string): string {
    return createHash('sha256').update(`dxp:${password}`).digest('hex');
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    return this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash: dto.password ? this.hashPassword(dto.password) : null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // Don't leak password hash.
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
