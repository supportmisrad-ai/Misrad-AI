#!/usr/bin/env node
/**
 * Generate a safe, idempotent migration from prisma migrate diff output.
 * Wraps constraint renames in DO blocks, adds IF NOT EXISTS to indexes,
 * handles triggers around column type changes.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const directUrl = process.env.DIRECT_URL;
if (!directUrl) { console.error('DIRECT_URL not set'); process.exit(1); }

console.log('Generating migration diff...');
const rawSql = execSync(
  `npx.cmd prisma migrate diff --from-url "${directUrl}" --to-schema-datamodel prisma/schema.prisma --script`,
  { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, cwd: path.join(__dirname, '..') }
);

// Parse into individual statements
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

// Transform statements to be idempotent
const safeStatements = [];

// Add trigger handling header
safeStatements.push(`-- Safe idempotent migration generated ${new Date().toISOString()}`);
safeStatements.push('');

for (const stmt of statements) {
  if (!stmt.trim()) continue;

  // Handle RENAME CONSTRAINT - wrap in DO block
  if (stmt.includes('RENAME CONSTRAINT')) {
    const match = stmt.match(/ALTER TABLE "(\w+)" RENAME CONSTRAINT "(\w+)" TO "(\w+)"/);
    if (match) {
      const [, table, oldName, newName] = match;
      safeStatements.push(`-- Safe rename constraint ${oldName} -> ${newName}`);
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER TABLE "${table}" RENAME CONSTRAINT "${oldName}" TO "${newName}";`);
      safeStatements.push(`EXCEPTION WHEN undefined_object THEN NULL;`);
      safeStatements.push(`  WHEN duplicate_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Handle DROP CONSTRAINT - wrap in DO block
  if (stmt.includes('DROP CONSTRAINT') && !stmt.includes('DROP CONSTRAINT IF EXISTS')) {
    const match = stmt.match(/ALTER TABLE "(\w+)" DROP CONSTRAINT "(\w+)"/);
    if (match) {
      const [, table, name] = match;
      safeStatements.push(`-- Safe drop constraint ${name}`);
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER TABLE "${table}" DROP CONSTRAINT "${name}";`);
      safeStatements.push(`EXCEPTION WHEN undefined_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Handle RENAME INDEX - wrap in DO block
  if (stmt.includes('RENAME TO') && stmt.includes('ALTER INDEX')) {
    const match = stmt.match(/ALTER INDEX "(\w+)" RENAME TO "(\w+)"/);
    if (match) {
      const [, oldName, newName] = match;
      safeStatements.push(`-- Safe rename index ${oldName} -> ${newName}`);
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER INDEX "${oldName}" RENAME TO "${newName}";`);
      safeStatements.push(`EXCEPTION WHEN undefined_object THEN NULL;`);
      safeStatements.push(`  WHEN duplicate_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Handle RENAME CONSTRAINT inside ALTER TABLE (RenameForeignKey)
  if (stmt.includes('RENAME CONSTRAINT')) {
    const match = stmt.match(/ALTER TABLE "(\w+)" RENAME CONSTRAINT "(\w+)" TO "(\w+)"/);
    if (match) {
      const [, table, oldName, newName] = match;
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER TABLE "${table}" RENAME CONSTRAINT "${oldName}" TO "${newName}";`);
      safeStatements.push(`EXCEPTION WHEN undefined_object THEN NULL;`);
      safeStatements.push(`  WHEN duplicate_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Handle CREATE INDEX - add IF NOT EXISTS
  if (stmt.includes('CREATE INDEX') && !stmt.includes('IF NOT EXISTS')) {
    safeStatements.push(stmt.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS'));
    safeStatements.push('');
    continue;
  }

  // Handle CREATE UNIQUE INDEX - add IF NOT EXISTS
  if (stmt.includes('CREATE UNIQUE INDEX') && !stmt.includes('IF NOT EXISTS')) {
    safeStatements.push(stmt.replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS'));
    safeStatements.push('');
    continue;
  }

  // Handle CREATE TABLE - add IF NOT EXISTS
  if (stmt.includes('CREATE TABLE') && !stmt.includes('IF NOT EXISTS')) {
    safeStatements.push(stmt.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS'));
    safeStatements.push('');
    continue;
  }

  // Handle DROP INDEX - add IF EXISTS
  if (stmt.includes('DROP INDEX') && !stmt.includes('IF EXISTS')) {
    safeStatements.push(stmt.replace('DROP INDEX', 'DROP INDEX IF EXISTS'));
    safeStatements.push('');
    continue;
  }

  // Handle DROP COLUMN - make safe
  if (stmt.includes('DROP COLUMN') && !stmt.includes('IF EXISTS')) {
    safeStatements.push(stmt.replace(/DROP COLUMN\s+/g, 'DROP COLUMN IF EXISTS '));
    safeStatements.push('');
    continue;
  }

  // Handle ADD COLUMN - make safe
  if (stmt.includes('ADD COLUMN') && !stmt.includes('IF NOT EXISTS')) {
    safeStatements.push(stmt.replace(/ADD COLUMN\s+/g, 'ADD COLUMN IF NOT EXISTS '));
    safeStatements.push('');
    continue;
  }

  // Handle ALTER TABLE on organizations (subscription_status) - wrap with trigger management
  if (stmt.includes('ALTER TABLE "organizations"') && stmt.includes('subscription_status')) {
    safeStatements.push('-- Drop triggers that depend on subscription_status before altering column type');
    safeStatements.push('DROP TRIGGER IF EXISTS trg_update_trial_end_date ON "organizations";');
    safeStatements.push('DROP TRIGGER IF EXISTS trg_update_organization_revenue ON "organizations";');
    safeStatements.push('');
    safeStatements.push(stmt);
    safeStatements.push('');
    safeStatements.push('-- Recreate triggers');
    safeStatements.push(`CREATE TRIGGER trg_update_trial_end_date`);
    safeStatements.push(`  BEFORE INSERT OR UPDATE ON "organizations"`);
    safeStatements.push(`  FOR EACH ROW EXECUTE FUNCTION update_trial_end_date();`);
    safeStatements.push('');
    safeStatements.push(`CREATE TRIGGER trg_update_organization_revenue`);
    safeStatements.push(`  BEFORE INSERT OR UPDATE ON "organizations"`);
    safeStatements.push(`  FOR EACH ROW EXECUTE FUNCTION update_organization_revenue();`);
    safeStatements.push('');
    continue;
  }

  // Handle ADD CONSTRAINT (FK) - wrap in DO block
  if (stmt.includes('ADD CONSTRAINT') && stmt.includes('FOREIGN KEY')) {
    const match = stmt.match(/ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)"/);
    if (match) {
      const [, table, name] = match;
      // Extract the full constraint definition, strip trailing semicolons
      const fkPart = stmt.substring(stmt.indexOf('ADD CONSTRAINT')).replace(/;+\s*$/, '');
      safeStatements.push(`-- Safe add FK ${name}`);
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER TABLE "${table}" ${fkPart};`);
      safeStatements.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Handle DropForeignKey - wrap in DO block
  if (stmt.includes('DROP CONSTRAINT') && stmt.match(/-- DropForeignKey/)) {
    const match = stmt.match(/ALTER TABLE "(\w+)" DROP CONSTRAINT "(\w+)"/);
    if (match) {
      const [, table, name] = match;
      safeStatements.push(`-- Safe drop FK ${name}`);
      safeStatements.push(`DO $$ BEGIN`);
      safeStatements.push(`  ALTER TABLE "${table}" DROP CONSTRAINT "${name}";`);
      safeStatements.push(`EXCEPTION WHEN undefined_object THEN NULL;`);
      safeStatements.push(`END $$;`);
      safeStatements.push('');
      continue;
    }
  }

  // Default: keep as-is
  safeStatements.push(stmt);
  safeStatements.push('');
}

const safeSql = safeStatements.join('\n');

// Create migration folder
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
const migrationName = `${timestamp}_sync_full_prod_schema`;
const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations', migrationName);
fs.mkdirSync(migrationDir, { recursive: true });

const migrationPath = path.join(migrationDir, 'migration.sql');
fs.writeFileSync(migrationPath, safeSql);

console.log(`\n✅ Safe migration written to: prisma/migrations/${migrationName}/migration.sql`);
console.log(`   Lines: ${safeSql.split('\n').length}`);
console.log(`   Original: ${rawSql.split('\n').length} lines`);
