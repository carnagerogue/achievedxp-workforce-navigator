import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UsajobsProvider } from './providers/usajobs.provider';
import { AdzunaProvider } from './providers/adzuna.provider';
import { RemotiveProvider } from './providers/remotive.provider';
import { JoobleProvider } from './providers/jooble.provider';
import { SerpApiGoogleJobsProvider } from './providers/serpapi-google-jobs.provider';
import { JOB_PROVIDERS } from './providers/job-provider.interface';
import { ClassificationModule } from '../classification/classifier.module';

// Production posture: ONLY real providers. The mock generator was removed
// to guarantee no synthetic listings ever land in the live catalog.
@Module({
  imports: [ClassificationModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    UsajobsProvider,
    AdzunaProvider,
    RemotiveProvider,
    JoobleProvider,
    SerpApiGoogleJobsProvider,
    {
      provide: JOB_PROVIDERS,
      useFactory: (
        usajobs: UsajobsProvider,
        adzuna: AdzunaProvider,
        remotive: RemotiveProvider,
        jooble: JoobleProvider,
        serpapi: SerpApiGoogleJobsProvider,
      ) => [usajobs, adzuna, remotive, jooble, serpapi],
      inject: [UsajobsProvider, AdzunaProvider, RemotiveProvider, JoobleProvider, SerpApiGoogleJobsProvider],
    },
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
