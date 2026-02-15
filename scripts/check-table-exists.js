#!/usr/bin/env node
/**
 * Check if a table exists in the database
 * Usage: node scripts/check-table-exists.js <table_name>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTableExists(tableName) {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, tableName);
    
    const exists = result[0]?.exists || false;
    console.log(`Table "${tableName}": ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (!exists) {
      console.log(`\n⚠️  Table "${tableName}" does not exist in the database.`);
      console.log('Run migrations to create it: npm run prisma:migrate:deploy');
    }
    
    await prisma.$disconnect();
    process.exit(exists ? 0 : 1);
  } catch (error) {
    console.error('Error checking table:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: node scripts/check-table-exists.js <table_name>');
  process.exit(1);
}

checkTableExists(tableName);
