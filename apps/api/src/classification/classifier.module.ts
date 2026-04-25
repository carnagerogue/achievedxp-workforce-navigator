import { Module } from '@nestjs/common';
import { ClassifierService } from './classifier.service';
import { ClassifierController } from './classifier.controller';

@Module({
  controllers: [ClassifierController],
  providers: [ClassifierService],
  exports: [ClassifierService],
})
export class ClassificationModule {}
