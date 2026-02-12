#!/usr/bin/env node
/**
 * Helper script to run SQL files without psql
 * Usage: node scripts/run-sql.js scripts/create-demo-organizations.sql
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runSqlFile(filePath) {
  try {
    console.log(`📂 Reading SQL file: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    
    // Split by semicolon but handle potential edge cases roughly
    // This is a simple splitter, might need refinement for complex SQLs
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
      
    console.log(`🔄 Found ${commands.length} commands. Executing...`);

    for (let i = 0; i < commands.length; i++) {
      const sql = commands[i];
      // Skip transaction commands that Prisma manages or doesn't support well in raw
      if (sql.toUpperCase() === 'BEGIN' || sql.toUpperCase() === 'COMMIT') {
        continue;
      }
      
      try {
        if (sql.toUpperCase().startsWith('SELECT')) {
           const result = await prisma.$queryRaw(Prisma.sql`${Prisma.raw(sql)}`);
           console.log(`✅ Command ${i+1} (SELECT): Returned ${result.length} rows`);
           if (result.length > 0) console.log(result);
        } else {
           const result = await prisma.$executeRaw(Prisma.sql`${Prisma.raw(sql)}`);
           console.log(`✅ Command ${i+1}: Affected ${result} rows`);
        }
      } catch (err) {
        console.warn(`⚠️  Command ${i+1} failed: ${err.message}`);
        // Don't exit, try next commands
      }
    }
    
    console.log('\n✅ Script finished!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('❌ Usage: node scripts/run-sql.js <path-to-sql-file>');
  process.exit(1);
}

runSqlFile(sqlFile);
