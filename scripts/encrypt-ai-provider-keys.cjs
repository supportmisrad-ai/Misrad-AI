#!/usr/bin/env node
/**
 * One-time migration script: encrypts all plain-text api_key values
 * in the ai_provider_keys table.
 *
 * Usage:
 *   node scripts/encrypt-ai-provider-keys.cjs
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY env var must be set in .env.local
 *   - DATABASE_URL / DIRECT_URL env vars must be set in .env.local
 *
 * The script is idempotent: it skips keys that are already encrypted
 * (i.e. valid base64 that decrypts successfully).
 */

// Load .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

// ─── Inline AES-GCM encrypt (mirrors lib/encryption.ts) ────────────────────
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || '';
  if (!key) {
    console.error('[FATAL] ENCRYPTION_KEY env var is required. Aborting.');
    process.exit(1);
  }
  return key;
}

async function deriveKey(keyMaterial) {
  const { subtle } = globalThis.crypto;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  const cryptoKey = await subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = new Uint8Array(SALT_LENGTH).fill(0);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    cryptoKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(value) {
  if (!value) return '';
  const key = await deriveKey(getEncryptionKey());
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await globalThis.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString('base64');
}

async function decrypt(encryptedValue) {
  if (!encryptedValue) return '';
  const key = await deriveKey(getEncryptionKey());
  const combined = Buffer.from(encryptedValue, 'base64');
  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);
  const decrypted = await globalThis.crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

function looksLikeBase64(str) {
  return /^[A-Za-z0-9+/]+=*$/.test(str) && str.length >= 20;
}

async function isAlreadyEncrypted(value) {
  if (!looksLikeBase64(value)) return false;
  try {
    const decrypted = await decrypt(value);
    return Boolean(decrypted);
  } catch {
    return false;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ai_provider_keys.findMany({
      select: { id: true, provider: true, api_key: true, organization_id: true },
    });

    console.log(`Found ${rows.length} ai_provider_keys row(s).`);

    let encrypted = 0;
    let skipped = 0;

    for (const row of rows) {
      const raw = String(row.api_key || '');
      if (!raw) {
        console.log(`  [SKIP] id=${row.id} provider=${row.provider} — empty key`);
        skipped++;
        continue;
      }

      const alreadyEnc = await isAlreadyEncrypted(raw);
      if (alreadyEnc) {
        console.log(`  [SKIP] id=${row.id} provider=${row.provider} — already encrypted`);
        skipped++;
        continue;
      }

      const encryptedValue = await encrypt(raw);

      await prisma.ai_provider_keys.update({
        where: { id: row.id },
        data: { api_key: encryptedValue, updated_at: new Date() },
      });

      console.log(`  [ENCRYPTED] id=${row.id} provider=${row.provider} org=${row.organization_id || 'global'}`);
      encrypted++;
    }

    console.log(`\nDone. Encrypted: ${encrypted}, Skipped: ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
