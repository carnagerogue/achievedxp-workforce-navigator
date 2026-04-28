import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AssessmentService, AssessmentSubmission } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { AuditAction } from '../audit/audit.decorator';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}

  /** Public — questions are static reference data, no PII. */
  @Get('questions')
  getQuestions() {
    return this.assessment.getQuestions();
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @AuditAction('assessment_submit')
  @Post(':userId')
  submit(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: AssessmentSubmission,
  ) {
    return this.assessment.submit(userId, body);
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @AuditAction('assessment_read')
  @Get(':userId')
  fetch(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.assessment.fetch(userId);
  }
}
