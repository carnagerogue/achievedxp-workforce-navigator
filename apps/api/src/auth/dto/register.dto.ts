import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * New-account registration. Returns a session cookie on success.
 *
 * Password rules:
 *   - Min 12 characters: aligns with NIST SP 800-63B's "long passphrase
 *     allowed, no composition rules" guidance. We don't enforce mixed-case
 *     / symbols — those rules push users toward predictable patterns
 *     ("Password1!") and offer little real protection.
 *   - Max 128 characters: argon2id is fine with any length, but the limit
 *     keeps a tag-spam attacker from sending a 1MB password to slow the
 *     server down.
 */
export class RegisterDto {
  @IsEmail()
  @MaxLength(254) // RFC 5321 envelope limit
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
