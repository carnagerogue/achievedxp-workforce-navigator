import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OwnerGuard } from './owner.guard';
import { AdminTokenGuard } from './admin-token.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret === 'change_me_in_prod') {
          throw new Error(
            'JWT_SECRET is missing or still set to the placeholder. Set a strong secret before starting the API.',
          );
        }
        // JWT_EXPIRES_IN accepts the same shorthand `jsonwebtoken` does:
        // "1h", "7d", "3600", etc. Default = 7 days, matching cookie TTL.
        // The cast satisfies @types/ms's template-literal `StringValue`
        // type, which can't statically verify a runtime env string.
        const expiresIn = (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`;
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OwnerGuard, AdminTokenGuard],
  exports: [JwtAuthGuard, OwnerGuard, AdminTokenGuard],
})
export class AuthModule {}
