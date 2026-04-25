import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AssessmentService, AssessmentSubmission } from './assessment.service';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}

  @Get('questions')
  getQuestions() {
    return this.assessment.getQuestions();
  }

  @Post(':userId')
  submit(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: AssessmentSubmission,
  ) {
    return this.assessment.submit(userId, body);
  }

  @Get(':userId')
  fetch(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.assessment.fetch(userId);
  }
}
