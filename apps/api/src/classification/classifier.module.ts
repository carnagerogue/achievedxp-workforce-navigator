import { Module } from '@nestjs/common';
import { ClassifierService } from './classifier.service';
import { ClassifierController } from './classifier.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClassifierController],
  providers: [ClassifierService],
  exports: [ClassifierService],
})
export class ClassificationModule {}
