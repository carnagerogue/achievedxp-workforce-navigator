import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { MatchesModule } from './matches/matches.module';
import { ClassificationModule } from './classification/classifier.module';
import { LocationModule } from './location/location.module';
import { AssessmentModule } from './assessment/assessment.module';
import { CareerOneStopModule } from './careeronestop/careeronestop.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    // Global rate limit: 120 req/minute/IP is generous for the dashboard +
    // /jobs pagination while still blocking scrapers. Tune per-route by
    // applying @Throttle() in individual controllers when needed.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    LocationModule,
    UsersModule,
    ProfilesModule,
    JobsModule,
    ClassificationModule,
    IngestionModule,
    MatchesModule,
    AssessmentModule,
    CareerOneStopModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
