import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM column-level encryption for sensitive PII fields.
 *
 * Threat model: a database compromise (backup leak, SQL injection
 * elsewhere, infra mistake) shouldn't expose the contents of conviction
 * notes, names, phone, or address-line fields. The application server
 * holds the only copy of the key, in the `ENCRYPTION_KEY` env var.
 *
 * Format on disk:
 *   `v1:<base64-iv>:<base64-ciphertext>:<base64-authTag>`
 *
 * The `v1:` prefix lets us:
 *   1. Detect already-encrypted rows during migration (avoid double-encrypt).
 *   2. Roll forward to a new algorithm later by adding a `v2:` parser
 *      and re-encrypting on next write — old rows keep decrypting via the
 *      old path.
 *   3. Treat anything WITHOUT the prefix as legacy plaintext, so the
 *      service deploys cleanly before the data-migration sweep runs.
 *
 * GCM gives us authenticated encryption — tampered ciphertext throws on
 * decrypt rather than silently returning garbage.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('ENCRYPTION_KEY');
    if (!raw) {
      throw new Error(
        'ENCRYPTION_KEY is required. Generate one with `openssl rand -base64 32` and set it on the API service.',
      );
    }
    const buf = Buffer.from(raw.trim(), 'base64');
    if (buf.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Generate with: openssl rand -base64 32`,
      );
    }
    this.key = buf;
  }

  /**
   * Encrypt a string. `null`/`undefined` pass through so columns can stay
   * nullable without special-casing at every call site.
   */
  encrypt(plain: string | null | undefined): string | null {
    if (plain === null || plain === undefined) return null;
    if (plain === '') return ''; // skip — empty strings round-trip cleanly
    // 96-bit IV is the GCM-recommended size. New random IV per write.
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`;
  }

  /**
   * Decrypt a stored value. Anything without the `v1:` prefix is treated
   * as legacy plaintext and returned as-is, so existing rows in the live
   * DB keep working until the one-shot migration encrypts them.
   *
   * Throws if a value claims to be encrypted (`v1:` prefix) but the
   * authentication tag fails — that means tampering or wrong key, both
   * of which should be loud failures.
   */
  decrypt(stored: string | null | undefined): string | null {
    if (stored === null || stored === undefined) return null;
    if (stored === '') return '';
    if (!stored.startsWith('v1:')) return stored; // legacy plaintext

    const parts = stored.split(':');
    if (parts.length !== 4) {
      throw new Error('Encrypted value is malformed (expected 4 colon-separated parts)');
    }
    const iv = Buffer.from(parts[1], 'base64');
    const ct = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }

  /** True if the value has been encrypted under the current scheme. */
  isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith('v1:');
  }
}
