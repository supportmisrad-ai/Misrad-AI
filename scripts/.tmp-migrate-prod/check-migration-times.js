const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '..', '..', '.env.prod_backup');
const lines = fs.readFileSync(envFile, 'utf8').split('\n');

let directUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DIRECT_URL=')) {
    directUrl = trimmed.substring('DIRECT_URL='.length).replace(/^"|"$/g, '').trim();
  }
}

process.env.DATABASE_URL = directUrl;
process.env.DIRECT_URL = directUrl;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

async function main() {
  // Get all migrations with timestamps
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, started_at, finished_at, rolled_back_at
    FROM public._prisma_migrations 
    ORDER BY started_at ASC
  `);
  
  console.log('=== All migrations in production DB ===');
  console.log('Total:', rows.length);
  console.log('');
  
  rows.forEach(function(r, i) {
    const status = r.rolled_back_at ? '🔙 ROLLED BACK' : (r.finished_at ? '✅' : '⏳ RUNNING');
    const time = r.finished_at ? new Date(r.finished_at).toISOString() : '---';
    console.log((i + 1) + '. ' + status + ' ' + r.migration_name);
    console.log('   Applied: ' + time);
  });

  // Check specifically the rename migration
  console.log('\n=== Key: Rename migration ===');
  const rename = rows.find(function(r) { return r.migration_name.includes('rename_social_tables'); });
  if (rename) {
    console.log('Migration:', rename.migration_name);
    console.log('Started:', new Date(rename.started_at).toISOString());
    console.log('Finished:', rename.finished_at ? new Date(rename.finished_at).toISOString() : 'NOT FINISHED');
    console.log('Rolled back:', rename.rolled_back_at ? new Date(rename.rolled_back_at).toISOString() : 'No');
  } else {
    console.log('❌ Rename migration NOT FOUND in DB!');
  }

  await prisma.$disconnect();
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
