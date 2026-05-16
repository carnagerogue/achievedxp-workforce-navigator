import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Drop-in guard for any route that requires a valid Bearer JWT. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
