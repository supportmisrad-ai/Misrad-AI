#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('DIRECT_URL not set in .env.local');
  process.exit(1);
}

console.log('Generating migration diff from DEV DB to schema.prisma...');

try {
  const sql = execSync(
    `npx.cmd prisma migrate diff --from-url "${directUrl}" --to-schema-datamodel prisma/schema.prisma --script`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, cwd: path.join(__dirname, '..') }
  );

  const lines = sql.split('\n').length;
  console.log(`Generated ${lines} lines of SQL`);

  // Create migration folder
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const migrationName = `${timestamp}_sync_full_prod_schema`;
  const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations', migrationName);
  fs.mkdirSync(migrationDir, { recursive: true });

  const migrationPath = path.join(migrationDir, 'migration.sql');
  fs.writeFileSync(migrationPath, sql);
  console.log(`Written to: prisma/migrations/${migrationName}/migration.sql`);

  // Show first 3000 chars
  console.log('\n--- First 3000 chars of migration ---\n');
  console.log(sql.substring(0, 3000));
  if (sql.length > 3000) console.log(`\n... (${sql.length - 3000} more chars)`);

} catch (e) {
  console.error('Error:', e.message);
  if (e.stderr) console.error('STDERR:', e.stderr.toString().substring(0, 2000));
  process.exit(1);
}
