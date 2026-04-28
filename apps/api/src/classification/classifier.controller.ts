import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClassifierService } from './classifier.service';
import { AdminTokenGuard } from '../auth/admin-token.guard';

@Controller('classify')
@UseGuards(AdminTokenGuard)
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
