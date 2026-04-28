import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConvictionInputDto } from './conviction.dto';

// Caps on tag-array sizes + per-tag string length. The web onboarding
// picker allows free-text custom entries, so without these caps a malicious
// or buggy client could push tens of thousands of tags into a single profile
// row. The numbers below are roomy for legitimate use (e.g. someone with a
// dense career history might have ~30 skills) but block obvious abuse.
const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 80;
const MAX_CONVICTIONS = 20;

/**
 * Note: `userId` is intentionally NOT on this DTO. The controller pulls
 * it from the authenticated session, so a user can only ever upsert their
 * OWN profile — they cannot impersonate someone else by guessing their
 * UUID and putting it in the request body.
 */
export class UpsertProfileDto {
  @IsOptional() @IsString() @MaxLength(80)  firstName?: string;
  @IsOptional() @IsString() @MaxLength(80)  lastName?: string;
  @IsOptional() @IsString() @MaxLength(40)  phone?: string;
  @IsOptional() @IsString() @MaxLength(80)  locationCity?: string;
  @IsOptional() @IsString() @MaxLength(40)  locationRegion?: string;
  @IsOptional() @IsString() @MaxLength(20)  locationPostalCode?: string;

  @IsOptional() @IsInt() @Min(0) @Max(70)   yearsExperience?: number;
  @IsOptional() @IsBoolean()                hasTransportation?: boolean;
  @IsOptional() @IsBoolean()                willingToRelocate?: boolean;

  @IsOptional() @IsBoolean()                hasFelonyRecord?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_TAGS) @IsString({ each: true }) @MaxLength(MAX_TAG_LENGTH, { each: true })
  offenseCategories?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(70)   yearsSinceRelease?: number;
  @IsOptional() @IsBoolean()                onParoleOrProbation?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_TAGS) @IsString({ each: true }) @MaxLength(MAX_TAG_LENGTH, { each: true })
  restrictedIndustries?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_TAGS) @IsString({ each: true }) @MaxLength(MAX_TAG_LENGTH, { each: true })
  skills?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_TAGS) @IsString({ each: true }) @MaxLength(MAX_TAG_LENGTH, { each: true })
  certifications?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_TAGS) @IsString({ each: true }) @MaxLength(MAX_TAG_LENGTH, { each: true })
  desiredIndustries?: string[];

  // Full structured conviction list. When provided, replaces the entire
  // existing set (not merged) — this makes the UI's edit-and-save flow
  // predictable. Omit the field entirely to leave convictions untouched.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CONVICTIONS)
  @ValidateNested({ each: true })
  @Type(() => ConvictionInputDto)
  convictions?: ConvictionInputDto[];
}
