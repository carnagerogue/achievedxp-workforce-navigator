import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { AuditAction } from '../audit/audit.decorator';

/**
 * The user-creation route used to live here as `POST /users`. It moved to
 * `POST /auth/register` so account creation, password hashing, and
 * session-cookie issuance happen in a single transactional flow that's
 * harder to bypass. Existing clients should use /auth/register instead.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @AuditAction('user_read')
  @Get(':userId')
  findOne(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.users.findById(userId);
  }
}
