#!/usr/bin/env node
/**
 * Add email and phone fields to partners table - PRODUCTION
 */
require('dotenv').config({ path: '.env.prod_backup' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding email and phone fields to partners table (PRODUCTION)...');
  
  try {
    // Add email column
    await prisma.$executeRawUnsafe(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS email TEXT;`);
    console.log('✅ Added email column');
  } catch (err) {
    if (err.code === '42701') {
      console.log('⏭️  email column already exists');
    } else {
      throw err;
    }
  }
  
  try {
    // Add phone column
    await prisma.$executeRawUnsafe(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone TEXT;`);
    console.log('✅ Added phone column');
  } catch (err) {
    if (err.code === '42701') {
      console.log('⏭️  phone column already exists');
    } else {
      throw err;
    }
  }
  
  try {
    // Create index
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS partners_email_idx ON partners(email);`);
    console.log('✅ Created email index');
  } catch (err) {
    console.log('⏭️  Index already exists or skipped');
  }
  
  console.log('\n✅ Migration completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
