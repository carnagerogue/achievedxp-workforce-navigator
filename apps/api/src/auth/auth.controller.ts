import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register — create account, returns JWT */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterBody) {
    return this.auth.register(body.email, body.password, body.displayName);
  }

  /** POST /auth/login — exchange credentials for JWT */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginBody) {
    return this.auth.login(body.email, body.password);
  }

  /** GET /auth/me — return current user (requires Bearer token) */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
}
