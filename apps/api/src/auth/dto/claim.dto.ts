import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * One-shot "claim my account" endpoint. Used by users created during the
 * pre-auth phase whose `passwordHash` is null. Sets a password and issues
 * a session in one call. Returns 409 if the account already has a password
 * (must use /auth/login instead).
 */
export class ClaimDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
