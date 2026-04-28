import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ClaimDto } from './dto/claim.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser, SESSION_COOKIE } from './types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie that carries the session JWT. HttpOnly so JS can't read it
 * (kills XSS-driven theft), Secure in production so it's only sent over
 * TLS, SameSite=Lax so cross-site POSTs from another origin can't
 * silently use it (CSRF-grade protection without a separate token).
 */
function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.register(dto);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(dto);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return user;
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claim(
    @Body() dto: ClaimDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.claim(dto);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
