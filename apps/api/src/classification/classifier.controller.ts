import { Body, Controller, Post } from '@nestjs/common';
import { ClassifierService } from './classifier.service';

@Controller('classify')
export class ClassifierController {
  constructor(private readonly classifier: ClassifierService) {}

  /** Dev/admin: reclassify every job row with current rules. */
  @Post('backfill')
  backfill() {
    return this.classifier.backfillAll();
  }

  /** Dev/admin: test classification for an arbitrary title + description. */
  @Post('test')
  test(@Body() body: { title: string; description: string; industry?: string | null }) {
    return this.classifier.classify(body);
  }
}
