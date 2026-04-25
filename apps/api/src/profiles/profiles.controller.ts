import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Controller('profile')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  // Plan specifies POST /profile — creates-or-updates by userId.
  @Post()
  upsert(@Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(dto);
  }

  @Get(':userId')
  getByUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.profiles.findByUser(userId);
  }
}
