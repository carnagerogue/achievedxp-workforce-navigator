import { Controller, Get, Post, Query } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
  constructor(private readonly location: LocationService) {}

  /** Dev/admin: populate ZIPs on every job row that doesn't have one. */
  @Post('backfill-job-zips')
  backfill() {
    return this.location.backfillJobZips();
  }

  /** Lookup a single ZIP — returns city/state/lat/lng if known. */
  @Get('zip')
  lookup(@Query('zip') zip: string) {
    return this.location.lookup(zip);
  }

  /** Debug helper: list ZIPs within a radius. */
  @Get('radius')
  radius(@Query('zip') zip: string, @Query('miles') miles: string) {
    const m = Number(miles) || 25;
    return { center: zip, miles: m, zips: this.location.zipsWithinRadius(zip, m) };
  }
}
