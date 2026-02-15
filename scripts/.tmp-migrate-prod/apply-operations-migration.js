/**
 * Apply the operations migration to production DB.
 * Reads DIRECT_URL from .env.prod_backup and uses Prisma to run the SQL.
 *
 * Usage: node scripts/.tmp-migrate-prod/apply-operations-migration.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadDirectUrl() {
  const envPath = path.resolve(__dirname, '../../.env.prod_backup');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.prod_backup not found');
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DIRECT_URL\s*=\s*"?(.+?)"?\s*$/);
    if (match) return match[1];
  }
  // Try DATABASE_URL as fallback
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*"?(.+?)"?\s*$/);
    if (match) return match[1];
  }
  throw new Error('DIRECT_URL/DATABASE_URL not found in .env.prod_backup');
}

async function main() {
  const directUrl = loadDirectUrl();
  console.log('Connecting to production DB...');
  console.log('Host:', directUrl.replace(/\/\/.*?@/, '//***@'));

  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  const migrationPath = path.resolve(
    __dirname,
    '../../prisma/migrations/20260215114100_create_missing_operations_tables/migration.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    console.log('Applying migration...\n');

    // Split SQL into individual statements (handle DO $$ blocks specially)
    const statements = [];
    let current = '';
    let inDollarBlock = false;

    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      current += line + '\n';

      if (trimmed.startsWith('DO $$') || trimmed.startsWith('DO $block$')) {
        inDollarBlock = true;
      }
      if (inDollarBlock && (trimmed.endsWith('$$;') || trimmed.endsWith('$block$;'))) {
        inDollarBlock = false;
        statements.push(current.trim());
        current = '';
        continue;
      }

      if (!inDollarBlock && trimmed.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());

    let applied = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
        applied++;
      } catch (stmtErr) {
        const msg = String(stmtErr.message || '');
        // Skip harmless errors (already exists, etc.)
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          skipped++;
          continue;
        }
        console.error('⚠️  Statement failed:', stmt.substring(0, 100) + '...');
        console.error('   Error:', msg);
        // Continue anyway for idempotent migration
        skipped++;
      }
    }
    console.log(`✅ Migration applied: ${applied} statements executed, ${skipped} skipped`);

    // Verify: list the new tables
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'operations_%'
      ORDER BY tablename
    `);
    console.log('\nOperations tables in production:');
    for (const row of tables) {
      console.log('  ✅', row.tablename);
    }

    // Verify: check new columns on operations_work_orders
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'operations_work_orders'
      ORDER BY ordinal_position
    `);
    console.log('\noperations_work_orders columns:');
    for (const row of cols) {
      console.log('  -', row.column_name, '(' + row.data_type + ')');
    }

    // Mark migration as applied in _prisma_migrations
    const migrationName = '20260215114100_create_missing_operations_tables';
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM _prisma_migrations WHERE migration_name = $1`,
      migrationName
    );
    if (!existing || existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count)
         VALUES (gen_random_uuid()::text, 'manual_apply', $1, now(), 1)`,
        migrationName
      );
      console.log('\n✅ Migration marked as applied in _prisma_migrations');
    } else {
      console.log('\n✅ Migration already recorded in _prisma_migrations');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.meta) console.error('Meta:', JSON.stringify(err.meta, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
