#!/usr/bin/env node
/**
 * Generate a safe migration specifically from PRODUCTION DB state to schema.prisma.
 * This accounts for the fact that Production doesn't have business_clients etc.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env.prod_backup') });

const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!DIRECT_URL) { console.error('❌ No DIRECT_URL'); process.exit(1); }

console.log('Generating migration diff from PRODUCTION DB to schema.prisma...');

try {
  const rawSql = execSync(
    `npx.cmd prisma migrate diff --from-url "${DIRECT_URL}" --to-schema-datamodel prisma/schema.prisma --script`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, cwd: ROOT }
  );

  const lines = rawSql.split('\n').length;
  console.log(`Generated ${lines} lines of SQL\n`);

  // Make idempotent
  const safeSql = makeIdempotent(rawSql);

  // Write to migration folder - replace the existing one
  const migrationName = '20260215010558_sync_full_prod_schema';
  const migrationDir = path.join(ROOT, 'prisma', 'migrations', migrationName);
  fs.mkdirSync(migrationDir, { recursive: true });

  const migrationPath = path.join(migrationDir, 'migration.sql');
  fs.writeFileSync(migrationPath, safeSql);

  console.log(`✅ Written to: prisma/migrations/${migrationName}/migration.sql`);
  console.log(`   Lines: ${safeSql.split('\n').length} (original: ${lines})`);
  console.log(`\nFirst 2000 chars:\n`);
  console.log(safeSql.substring(0, 2000));
  if (safeSql.length > 2000) console.log(`\n... (${safeSql.length - 2000} more chars)`);

} catch (e) {
  console.error('Error:', e.message);
  if (e.stderr) console.error('STDERR:', e.stderr.toString().substring(0, 1000));
  process.exit(1);
}

function makeIdempotent(rawSql) {
  const statements = [];
  let current = [];
  for (const line of rawSql.split('\n')) {
    if (line.startsWith('-- ') && current.length > 0) {
      statements.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) statements.push(current.join('\n').trim());

  const safe = ['-- Safe idempotent migration for PRODUCTION (generated ' + new Date().toISOString() + ')', ''];

  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    // RENAME CONSTRAINT -> DO block
    if (stmt.includes('RENAME CONSTRAINT')) {
      const match = stmt.match(/ALTER TABLE "(\w+)" RENAME CONSTRAINT "(\w+)" TO "(\w+)"/);
      if (match) {
        safe.push(`DO $$ BEGIN`);
        safe.push(`  ALTER TABLE "${match[1]}" RENAME CONSTRAINT "${match[2]}" TO "${match[3]}";`);
        safe.push(`EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;`);
        safe.push(`END $$;`, '');
        continue;
      }
    }

    // DROP CONSTRAINT -> DO block with undefined_table handling
    if (stmt.includes('DROP CONSTRAINT') && !stmt.includes('IF EXISTS')) {
      const match = stmt.match(/ALTER TABLE "(\w+)" DROP CONSTRAINT "(\w+)"/);
      if (match) {
        safe.push(`DO $$ BEGIN`);
        safe.push(`  ALTER TABLE "${match[1]}" DROP CONSTRAINT IF EXISTS "${match[2]}";`);
        safe.push(`EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL;`);
        safe.push(`END $$;`, '');
        continue;
      }
    }

    // RENAME INDEX -> DO block
    if (stmt.includes('ALTER INDEX') && stmt.includes('RENAME TO')) {
      const match = stmt.match(/ALTER INDEX "(\w+)" RENAME TO "(\w+)"/);
      if (match) {
        safe.push(`DO $$ BEGIN`);
        safe.push(`  ALTER INDEX "${match[1]}" RENAME TO "${match[2]}";`);
        safe.push(`EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;`);
        safe.push(`END $$;`, '');
        continue;
      }
    }

    // CREATE INDEX -> IF NOT EXISTS
    if (stmt.includes('CREATE INDEX') && !stmt.includes('IF NOT EXISTS')) {
      safe.push(stmt.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS'), '');
      continue;
    }
    if (stmt.includes('CREATE UNIQUE INDEX') && !stmt.includes('IF NOT EXISTS')) {
      safe.push(stmt.replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS'), '');
      continue;
    }

    // CREATE TABLE -> IF NOT EXISTS
    if (stmt.includes('CREATE TABLE') && !stmt.includes('IF NOT EXISTS')) {
      safe.push(stmt.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS'), '');
      continue;
    }

    // DROP INDEX -> IF EXISTS
    if (stmt.includes('DROP INDEX') && !stmt.includes('IF EXISTS')) {
      safe.push(stmt.replace('DROP INDEX', 'DROP INDEX IF EXISTS'), '');
      continue;
    }

    // DROP COLUMN -> IF EXISTS
    if (stmt.includes('DROP COLUMN') && !stmt.includes('IF EXISTS')) {
      safe.push(stmt.replace(/DROP COLUMN\s+/g, 'DROP COLUMN IF EXISTS '), '');
      continue;
    }

    // ADD COLUMN -> IF NOT EXISTS
    if (stmt.includes('ADD COLUMN') && !stmt.includes('IF NOT EXISTS')) {
      safe.push(stmt.replace(/ADD COLUMN\s+/g, 'ADD COLUMN IF NOT EXISTS '), '');
      continue;
    }

    // ALTER on organizations.subscription_status -> handle triggers
    if (stmt.includes('ALTER TABLE "organizations"') && stmt.includes('subscription_status')) {
      safe.push('DROP TRIGGER IF EXISTS trg_update_trial_end_date ON "organizations";');
      safe.push('DROP TRIGGER IF EXISTS trg_update_organization_revenue ON "organizations";');
      safe.push('');
      safe.push(stmt, '');
      safe.push('DO $$ BEGIN');
      safe.push('  CREATE TRIGGER trg_update_trial_end_date');
      safe.push('    BEFORE INSERT OR UPDATE ON "organizations"');
      safe.push('    FOR EACH ROW EXECUTE FUNCTION update_trial_end_date();');
      safe.push('EXCEPTION WHEN duplicate_object THEN NULL;');
      safe.push('END $$;');
      safe.push('DO $$ BEGIN');
      safe.push('  CREATE TRIGGER trg_update_organization_revenue');
      safe.push('    BEFORE INSERT OR UPDATE ON "organizations"');
      safe.push('    FOR EACH ROW EXECUTE FUNCTION update_organization_revenue();');
      safe.push('EXCEPTION WHEN duplicate_object THEN NULL;');
      safe.push('END $$;', '');
      continue;
    }

    // ADD CONSTRAINT FK -> DO block
    if (stmt.includes('ADD CONSTRAINT') && stmt.includes('FOREIGN KEY')) {
      const match = stmt.match(/ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)"/);
      if (match) {
        const fkPart = stmt.substring(stmt.indexOf('ADD CONSTRAINT')).replace(/;+\s*$/, '');
        safe.push(`DO $$ BEGIN`);
        safe.push(`  ALTER TABLE "${match[1]}" ${fkPart};`);
        safe.push(`EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;`);
        safe.push(`END $$;`, '');
        continue;
      }
    }

    // Default
    safe.push(stmt, '');
  }

  return safe.join('\n');
}
