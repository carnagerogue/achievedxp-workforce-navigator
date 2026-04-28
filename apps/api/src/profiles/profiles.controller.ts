import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/types';
import { AuditAction } from '../audit/audit.decorator';

@Controller('profile')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /**
   * Upsert the authenticated user's profile. The user identity comes from
   * the JWT — the request body cannot specify a `userId`. This means a
   * leaked or guessed UUID can never be used to overwrite someone else's
   * profile.
   */
  @UseGuards(JwtAuthGuard)
  @AuditAction('profile_write')
  @Post()
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @AuditAction('profile_read')
  @Get(':userId')
  getByUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.profiles.findByUser(userId);
  }
}
