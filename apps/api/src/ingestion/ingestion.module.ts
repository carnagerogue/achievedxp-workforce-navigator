import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UsajobsProvider } from './providers/usajobs.provider';
import { AdzunaProvider } from './providers/adzuna.provider';
import { RemotiveProvider } from './providers/remotive.provider';
import { JoobleProvider } from './providers/jooble.provider';
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
    {
      provide: JOB_PROVIDERS,
      useFactory: (
        usajobs: UsajobsProvider,
        adzuna: AdzunaProvider,
        remotive: RemotiveProvider,
        jooble: JoobleProvider,
      ) => [usajobs, adzuna, remotive, jooble],
      inject: [UsajobsProvider, AdzunaProvider, RemotiveProvider, JoobleProvider],
    },
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
