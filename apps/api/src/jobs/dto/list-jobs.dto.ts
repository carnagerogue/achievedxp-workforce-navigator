import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JobStatus, OffenseType, RiskTier } from '@prisma/client';

export class ListJobsDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(40)  region?: string;
  @IsOptional() @IsString() @MaxLength(80)  city?: string;
  @IsOptional() @IsString() @MaxLength(60)  industry?: string;
  @IsOptional() @IsEnum(RiskTier)           riskTier?: RiskTier;
  @IsOptional() @IsEnum(JobStatus)          status?: JobStatus;

  // ZIP-code search. Either exact-match (default, radiusMiles omitted) or
  // within a mile radius (radiusMiles=N). When the ZIP isn't in our lookup
  // data the result is an exact string match — degrades gracefully.
  @IsOptional() @IsString() @MaxLength(10)  postalCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) radiusMiles?: number;

  // Browse-by-conviction: when provided, excludes jobs that would be
  // hard-filtered for someone with this offense type (industry bars + title
  // keywords from OFFENSE_FILTER_RULES). The same filter the scorer applies.
  @IsOptional() @IsEnum(OffenseType)        offenseType?: OffenseType;

  // Also hide postings whose employer explicitly excludes felony records.
  // Defaults on when `offenseType` is set — implied by the use case.
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value) === 'true'))
  hideFelonExclusions?: boolean;

  // Minimum salary floor — a job qualifies if its MAX salary (or MIN, if no
  // max is listed) is ≥ this threshold. Letting max drive is intentional:
  // recruiters advertise ranges, the ceiling is what's negotiable.
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000)
  minSalary?: number;

  // Only postings with postedAt within the last N days. 0 or omitted = any.
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(365)
  postedWithinDays?: number;

  // Narrow to apprenticeships only — classifier flag set from the posting text.
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value) === 'true'))
  apprenticeshipsOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value) === 'true'))
  remote?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
