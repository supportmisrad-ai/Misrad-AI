const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Read DATABASE_URL from .env.prod_backup
  const envPath = path.join(__dirname, '..', '.env.prod_backup');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  
  if (!dbUrlMatch) {
    console.error('DATABASE_URL not found in .env.prod_backup');
    process.exit(1);
  }
  
  const databaseUrl = dbUrlMatch[1].trim().replace(/['"]/g, '');
  console.log('Using DATABASE_URL:', databaseUrl.substring(0, 50) + '...');
  
  // Set env variable
  process.env.DATABASE_URL = databaseUrl;
  
  const prisma = new PrismaClient();
  
  // Read migration SQL
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260312000000_create_client_cycles', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('Running migration statements individually...');
  
  // Split by semicolons and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    
    try {
      await prisma.$executeRawUnsafe(trimmed);
      console.log('✓', trimmed.substring(0, 70).replace(/\n/g, ' ') + '...');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate')) {
        console.log('⊘ Already exists:', trimmed.substring(0, 50).replace(/\n/g, ' ') + '...');
      } else {
        console.error('✗ Failed:', trimmed.substring(0, 50).replace(/\n/g, ' ') + '...');
        console.error('  Error:', e.message);
      }
    }
  }
  
  await prisma.$disconnect();
  console.log('\nMigration completed!');
}

runMigration();
