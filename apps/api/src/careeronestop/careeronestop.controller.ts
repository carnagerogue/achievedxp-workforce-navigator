import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CareerOneStopService } from './careeronestop.service';

/**
 * Thin proxy in front of the entire CareerOneStop API surface. Every
 * public DOL endpoint listed at
 *   https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx
 * is exposed here under stable, ergonomic query-string routes.
 *
 * Two reasons we don't let the browser call CareerOneStop directly:
 *   1. The API token is server-only.
 *   2. CareerOneStop's path-shape is awkward; the controller flattens it
 *      into clean ?keyword=&location=&radius= params.
 */
@Controller('careeronestop')
export class CareerOneStopController {
  constructor(private readonly cos: CareerOneStopService) {}

  // ── Local Help ─────────────────────────────────────────────────────

  @Get('reentry')
  reentry(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.reentryPrograms(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('reentry/all')
  allReentry() {
    return this.cos.allReentryPrograms();
  }

  @Get('centers')
  centers(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.americanJobCenters(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('centers/:id')
  ajcDetails(@Query('id') id: string) {
    return this.cos.ajcDetails(id);
  }

  @Get('centers/all')
  allCenters() {
    return this.cos.allAjcs();
  }

  @Get('apprenticeships')
  apprenticeshipOffices(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(100), ParseIntPipe) radius: number,
  ) {
    return this.cos.apprenticeshipOffices(location || 'US', Math.min(Math.max(radius, 1), 500));
  }

  @Get('boards')
  boards(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.boardsByLocation(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('boards/all')
  allBoards() {
    return this.cos.allBoards();
  }

  @Get('youth-programs')
  youthPrograms(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.youthProgramContacts(location, Math.min(Math.max(radius, 1), 200));
  }

  @Get('state-resources')
  stateResources(@Query('state') state: string) {
    return this.cos.stateResources(state || 'US');
  }

  // ── Occupations ────────────────────────────────────────────────────

  @Get('occupation')
  occupation(
    @Query('onet') onetCode: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
  ) {
    return this.cos.occupationProfile(onetCode, location);
  }

  @Get('occupations/search')
  occupationsByKeyword(
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.cos.occupationsByKeyword(keyword, Math.min(Math.max(limit, 1), 50));
  }

  @Get('occupations/report')
  occupationsReport(
    @Query('type', new DefaultValuePipe('fastest')) type: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.cos.occupationsReport(type, location, Math.min(Math.max(limit, 1), 100));
  }

  // ── Wages / LMI ────────────────────────────────────────────────────

  @Get('wages')
  wages(
    @Query('onet') onetCode: string,
    @Query('location') location?: string,
  ) {
    return this.cos.wages(onetCode, location);
  }

  @Get('wages/by-location')
  wagesByLocation(
    @Query('onet') onetCode: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
  ) {
    return this.cos.wagesByLocation(onetCode, location);
  }

  @Get('lmi/occupation')
  lmiByOccupation(
    @Query('onet') onetCode: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
  ) {
    return this.cos.lmiByOccupation(onetCode, location);
  }

  @Get('employment-patterns')
  employmentPatterns(@Query('keyword') keyword: string) {
    return this.cos.employmentPatterns(keyword);
  }

  @Get('unemployment')
  unemployment(
    @Query('location') location: string,
    @Query('type', new DefaultValuePipe('rate')) type: string,
  ) {
    return this.cos.unemploymentRates(location, type);
  }

  @Get('ui-website')
  uiWebsite(@Query('state') state: string) {
    return this.cos.uiWebSites(state);
  }

  // ── Licenses + Certifications ─────────────────────────────────────

  @Get('licenses')
  licenses(
    @Query('keyword') keyword: string,
    @Query('location', new DefaultValuePipe('US')) location: string,
  ) {
    return this.cos.licenses(keyword || '', location);
  }

  @Get('licenses/:id')
  licenseDetails(@Query('id') id: string) {
    return this.cos.licenseDetails(id);
  }

  @Get('certifications')
  certifications(
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit: number,
  ) {
    return this.cos.certifications(keyword || '', Math.min(Math.max(limit, 1), 100));
  }

  @Get('certifications/:id')
  certificationDetails(@Query('id') id: string) {
    return this.cos.certificationDetails(id);
  }

  // ── Training ───────────────────────────────────────────────────────

  @Get('training')
  training(
    @Query('keyword') keyword: string,
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.cos.trainingPrograms(
      keyword || '',
      location || 'US',
      Math.min(Math.max(radius, 1), 500),
      Math.min(Math.max(limit, 1), 100),
    );
  }

  @Get('training/institutions')
  trainingInstitutions(
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
  ) {
    return this.cos.trainingInstitutions(location, Math.min(Math.max(radius, 1), 200));
  }

  // ── Skills ─────────────────────────────────────────────────────────

  @Get('skills-matcher/questions')
  skillsMatcherQuestions() {
    return this.cos.skillsMatcherQuestions();
  }

  @Post('skills-matcher/submit')
  submitSkills(@Body() body: { skills: Array<{ ElementId: string; DataValue: number }> }) {
    return this.cos.submitSkills(body?.skills ?? []);
  }

  @Get('skills-gaps')
  skillsGaps(
    @Query('from') fromOnet: string,
    @Query('to') toOnet: string,
  ) {
    return this.cos.skillsGaps(fromOnet, toOnet);
  }

  @Get('tools/by-occupation')
  toolsByOccupation(@Query('onet') onetCode: string) {
    return this.cos.toolsByOccupation(onetCode);
  }

  @Get('tools/by-keyword')
  toolsByKeyword(
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.cos.toolsByKeyword(keyword, Math.min(Math.max(limit, 1), 100));
  }

  // ── Jobs (CareerOneStop / NLX) + Associations ─────────────────────

  @Get('jobs')
  jobs(
    @Query('keyword') keyword: string,
    @Query('location') location: string,
    @Query('radius', new DefaultValuePipe(50), ParseIntPipe) radius: number,
    @Query('postedDays', new DefaultValuePipe(30), ParseIntPipe) postedDays: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.cos.jobs(
      keyword || '',
      location || 'US',
      Math.min(Math.max(radius, 1), 500),
      Math.min(Math.max(postedDays, 1), 90),
      Math.min(Math.max(limit, 1), 100),
    );
  }

  @Get('jobs/:id')
  jobById(@Query('id') id: string) {
    return this.cos.jobById(id);
  }

  @Get('job-description')
  jobDescription(
    @Query('onet') onetCode: string,
    @Query('state', new DefaultValuePipe('US')) state: string,
    @Query('category', new DefaultValuePipe('Tasks')) category: string,
  ) {
    return this.cos.jobDescription(onetCode, state, category);
  }

  @Get('associations')
  associations(
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.cos.professionalAssociations(keyword || '', Math.min(Math.max(limit, 1), 100));
  }

  // ── Location helper ────────────────────────────────────────────────

  @Get('location/validate')
  validateLocation(@Query('location') location: string) {
    return this.cos.validateLocation(location);
  }
}
