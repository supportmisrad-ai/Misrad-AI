#!/usr/bin/env node
/**
 * Ensure all required Supabase Storage buckets exist.
 * 
 * Usage:
 *   node scripts/ensure-storage-buckets.js              # uses .env.local (DEV)
 *   node scripts/ensure-storage-buckets.js --prod        # uses .env.prod_backup (PROD)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.prod_backup' : '.env.local';
const envPath = path.resolve(__dirname, '..', envFile);

if (!fs.existsSync(envPath)) {
  console.error(`[ERROR] Missing env file: ${envPath}`);
  process.exit(1);
}

// Parse env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx <= 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  envVars[key] = val;
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in', envFile);
  process.exit(1);
}

console.log(`\n=== Ensure Storage Buckets (${isProd ? 'PROD' : 'DEV'}) ===`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = [
  {
    id: 'media',
    name: 'media',
    public: false,
    fileSizeLimit: 1024 * 1024 * 1024, // 1GB
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
      'application/pdf',
    ],
  },
  {
    id: 'call-recordings',
    name: 'call-recordings',
    public: false,
    fileSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    allowedMimeTypes: [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4',
      'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/webm', 'video/quicktime',
    ],
  },
  {
    id: 'operations-files',
    name: 'operations-files',
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'application/pdf',
    ],
  },
  {
    id: 'attachments',
    name: 'attachments',
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
      'application/pdf',
    ],
  },
  {
    id: 'public-assets',
    name: 'public-assets',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime',
    ],
  },
  {
    id: 'meeting-recordings',
    name: 'meeting-recordings',
    public: false,
    fileSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    allowedMimeTypes: [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4',
      'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/webm', 'video/quicktime',
    ],
  },
];

async function main() {
  // List existing buckets
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('[ERROR] Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existingIds = new Set((existingBuckets || []).map(b => b.id));
  console.log('Existing buckets:', Array.from(existingIds).join(', ') || '(none)');
  console.log('');

  const FREE_PLAN_LIMIT = 50 * 1024 * 1024; // 50MB

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const bucket of BUCKETS) {
    const exists = existingIds.has(bucket.id);
    const opts = {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    };

    const label = (limit) => `${bucket.public ? 'public' : 'private'}, ${(limit / 1024 / 1024).toFixed(0)}MB`;

    if (!exists) {
      let { error } = await supabase.storage.createBucket(bucket.id, opts);

      // Retry with Free plan limit if exceeded
      if (error && String(error.message || '').includes('exceeded')) {
        opts.fileSizeLimit = FREE_PLAN_LIMIT;
        ({ error } = await supabase.storage.createBucket(bucket.id, opts));
        if (!error) {
          console.log(`  [CREATED] ${bucket.id} (${label(FREE_PLAN_LIMIT)}) [free-plan fallback]`);
          created++;
          continue;
        }
      }

      if (error) {
        console.error(`  [FAIL] ${bucket.id}: ${error.message}`);
        failed++;
      } else {
        console.log(`  [CREATED] ${bucket.id} (${label(bucket.fileSizeLimit)})`);
        created++;
      }
    } else {
      let { error } = await supabase.storage.updateBucket(bucket.id, opts);

      // Retry with Free plan limit if exceeded
      if (error && String(error.message || '').includes('exceeded')) {
        opts.fileSizeLimit = FREE_PLAN_LIMIT;
        ({ error } = await supabase.storage.updateBucket(bucket.id, opts));
        if (!error) {
          console.log(`  [UPDATED] ${bucket.id} (${label(FREE_PLAN_LIMIT)}) [free-plan fallback]`);
          updated++;
          continue;
        }
      }

      if (error) {
        console.error(`  [FAIL UPDATE] ${bucket.id}: ${error.message}`);
        failed++;
      } else {
        console.log(`  [UPDATED] ${bucket.id} (${label(bucket.fileSizeLimit)})`);
        updated++;
      }
    }
  }

  console.log('');
  console.log(`Results: ${created} created, ${updated} updated, ${failed} failed`);

  // Final verification
  const { data: finalBuckets } = await supabase.storage.listBuckets();
  const finalIds = new Set((finalBuckets || []).map(b => b.id));
  const missing = BUCKETS.filter(b => !finalIds.has(b.id));

  if (missing.length > 0) {
    console.error(`\n[WARNING] Missing buckets: ${missing.map(b => b.id).join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n[OK] All required buckets exist');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
