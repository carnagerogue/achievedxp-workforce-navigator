import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConvictionInputDto } from './conviction.dto';

export class UpsertProfileDto {
  @IsUUID()
  userId!: string;

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
  @IsOptional() @IsArray() @IsString({ each: true }) offenseCategories?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(70)   yearsSinceRelease?: number;
  @IsOptional() @IsBoolean()                onParoleOrProbation?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) restrictedIndustries?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) certifications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) desiredIndustries?: string[];

  // Full structured conviction list. When provided, replaces the entire
  // existing set (not merged) — this makes the UI's edit-and-save flow
  // predictable. Omit the field entirely to leave convictions untouched.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvictionInputDto)
  convictions?: ConvictionInputDto[];
}
