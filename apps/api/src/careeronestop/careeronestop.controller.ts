import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { CareerOneStopService } from './careeronestop.service';

/**
 * Thin proxy in front of the CareerOneStop API.
 *
 * Two reasons we don't let the browser call CareerOneStop directly:
 *   1. The API token is server-only; if we shipped it to the browser, anyone
 *      could exfiltrate it from the network tab and burn our quota.
 *   2. The CareerOneStop URL shape is awkward (long path-based parameters).
 *      A clean Nest controller gives the frontend nice query-string routes
 *      and a stable response shape we can evolve later.
 */
@Controller('careeronestop')
export class CareerOneStopController {
  constructor(private readonly cos: CareerOneStopService) {}

  @Get('reentry')
  reentry(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(25), ParseIntPipe) radius: number,
  ) {
    return this.cos.reentryPrograms(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('centers')
  centers(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(25), ParseIntPipe) radius: number,
  ) {
    return this.cos.americanJobCenters(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('apprenticeships')
  apprenticeships(
    @Query('keyword') keyword: string,
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.apprenticeships(keyword || '', location || 'US', Math.min(Math.max(radius, 1), 500));
  }

  @Get('wages')
  wages(
    @Query('onet') onetCode: string,
    @Query('location') location?: string,
  ) {
    return this.cos.wages(onetCode, location);
  }

  @Get('licenses')
  licenses(
    @Query('onet') onetCode: string,
    @Query('location') location: string,
  ) {
    return this.cos.licenses(onetCode, location || 'US');
  }

  @Get('certifications')
  certifications(@Query('keyword') keyword: string) {
    return this.cos.certifications(keyword || '');
  }

  @Get('skills-matcher/questions')
  skillsMatcherQuestions() {
    return this.cos.skillsMatcherQuestions();
  }

  @Get('occupation')
  occupation(
    @Query('onet') onetCode: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
  ) {
    return this.cos.occupationProfile(onetCode, location);
  }
}
