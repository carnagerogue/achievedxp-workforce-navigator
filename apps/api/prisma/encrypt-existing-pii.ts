/**
 * One-shot migration: encrypt all existing plaintext PII rows.
 *
 * Idempotent — values that already have the `v1:` prefix are skipped.
 * Run once after deploying the encryption service:
 *
 *   ENCRYPTION_KEY=<key> pnpm ts-node prisma/encrypt-existing-pii.ts
 *
 * Safe to re-run; safe to interrupt and resume. Wrapped in a single
 * transaction per row so partial writes don't leave a row half-encrypted.
 */
import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY env var is required.');
  }
  const buf = Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}).`);
  }
  return buf;
}

function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.startsWith('v1:');
}

function encrypt(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`;
}

function maybeEncrypt(key: Buffer, v: string | null): string | null {
  if (v === null || v === '') return v;
  if (isEncrypted(v)) return v;
  return encrypt(key, v);
}

async function run() {
  const key = loadKey();
  let profilesUpdated = 0;
  let profilesSkipped = 0;
  let convictionsUpdated = 0;
  let convictionsSkipped = 0;

  // ─── UserProfile fields ───
  const profiles = await prisma.userProfile.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true, locationCity: true },
  });
  for (const p of profiles) {
    const next = {
      firstName:    maybeEncrypt(key, p.firstName),
      lastName:     maybeEncrypt(key, p.lastName),
      phone:        maybeEncrypt(key, p.phone),
      locationCity: maybeEncrypt(key, p.locationCity),
    };
    const changed =
      next.firstName    !== p.firstName ||
      next.lastName     !== p.lastName  ||
      next.phone        !== p.phone     ||
      next.locationCity !== p.locationCity;
    if (changed) {
      await prisma.userProfile.update({ where: { id: p.id }, data: next });
      profilesUpdated++;
    } else {
      profilesSkipped++;
    }
  }

  // ─── Conviction.notes ───
  const convictions = await prisma.conviction.findMany({
    select: { id: true, notes: true },
  });
  for (const c of convictions) {
    const next = maybeEncrypt(key, c.notes);
    if (next !== c.notes) {
      await prisma.conviction.update({ where: { id: c.id }, data: { notes: next } });
      convictionsUpdated++;
    } else {
      convictionsSkipped++;
    }
  }

  console.log(
    `Done. Profiles: ${profilesUpdated} updated, ${profilesSkipped} already encrypted. ` +
    `Convictions: ${convictionsUpdated} updated, ${convictionsSkipped} already encrypted.`,
  );
}

run()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
