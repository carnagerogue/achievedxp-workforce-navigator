import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConvictionCategory, OffenseType } from '@prisma/client';

// Reasonable year bounds — no conviction data earlier than 1900, and
// no future convictions. Prevents typos like 2205 from polluting the DB.
const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear();

export class ConvictionInputDto {
  @IsEnum(ConvictionCategory)
  category!: ConvictionCategory;

  @IsEnum(OffenseType)
  offenseType!: OffenseType;

  @IsOptional() @IsInt() @Min(MIN_YEAR) @Max(MAX_YEAR) convictionYear?: number;
  @IsOptional() @IsInt() @Min(MIN_YEAR) @Max(MAX_YEAR) releaseYear?: number;

  @IsOptional() @IsBoolean() currentlyIncarcerated?: boolean;
  @IsOptional() @IsBoolean() onParole?: boolean;
  @IsOptional() @IsBoolean() onProbation?: boolean;
  @IsOptional() @IsDateString() supervisionEndDate?: string;
  /** Whether the conviction triggered a state registry. Renamed for
   *  neutral terminology; legacy `sexOffenderRegistry` field still
   *  accepted on input for backward compatibility. */
  @IsOptional() @IsBoolean() registryStatus?: boolean;
  /** @deprecated use registryStatus */
  @IsOptional() @IsBoolean() sexOffenderRegistry?: boolean;

  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ConvictionsArrayWrapper {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConvictionInputDto)
  convictions?: ConvictionInputDto[];
}
